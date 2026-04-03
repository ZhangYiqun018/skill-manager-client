use std::collections::BTreeMap;
use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use dirs::{data_dir, data_local_dir, home_dir};
use rusqlite::{Connection, OptionalExtension, params};
use thiserror::Error;
use walkdir::{DirEntry, WalkDir};

use crate::models::{
    AgentKind, IndexOptions, IndexStatus, IndexedScanSummary, InstalledSkill, ScanOptions,
    ScanSummary, ScanWarning, SkillDescriptor, SkillMetadata, SkillScope, SkillSourceType,
};
use crate::scan::{
    build_installed_skill, build_scan_roots, classify_discovered_skill_path, scan_local_skills,
    sort_summary,
};

const DEFAULT_STALE_AFTER_SECS: u64 = 6 * 60 * 60;
const LAST_REFRESH_KEY: &str = "last_refresh_unix_ms";

#[derive(Debug, Error)]
pub enum IndexError {
    #[error("failed to read or write the skill index: {0}")]
    Sql(#[from] rusqlite::Error),
    #[error("failed to access the filesystem: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Message(String),
}

pub fn default_index_path() -> PathBuf {
    default_data_root().join("index.sqlite3")
}

pub fn default_store_path() -> PathBuf {
    default_data_root().join("store")
}

pub fn adopt_skill(
    skill_path: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<InstalledSkill, IndexError> {
    let mut adopted = adopt_skills(vec![skill_path], scan_options, index_options)?;
    adopted.pop().ok_or_else(|| {
        IndexError::Message("No disk skill was adopted from the requested path.".to_string())
    })
}

pub fn adopt_skills(
    skill_paths: Vec<PathBuf>,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<Vec<InstalledSkill>, IndexError> {
    let snapshot = load_skill_index(scan_options, index_options)?;
    if !snapshot.index.exists {
        return Err(IndexError::Message(
            "No local index exists yet. Run disk discovery first.".to_string(),
        ));
    }

    let store_root = resolve_store_path(index_options);
    let mut adopted = Vec::new();
    let mut seen_destinations = BTreeMap::new();

    for skill_path in skill_paths {
        let candidate = snapshot
            .summary
            .skills
            .iter()
            .find(|skill| {
                skill.source_type == SkillSourceType::Disk && path_matches_skill(&skill_path, skill)
            })
            .cloned()
            .ok_or_else(|| {
                IndexError::Message(
                    "Could not find one of the selected disk skills in the current index."
                        .to_string(),
                )
            })?;

        let destination = managed_skill_dir(&candidate, &store_root);
        let destination_key = destination.to_string_lossy().into_owned();

        if !seen_destinations.contains_key(&destination_key) {
            if let Some(parent) = destination.parent() {
                fs::create_dir_all(parent)?;
            }

            if !destination.exists() {
                copy_dir_recursive(&candidate.path, &destination)?;
            }

            seen_destinations.insert(destination_key.clone(), true);
            adopted.push(InstalledSkill {
                source_type: SkillSourceType::Import,
                path: destination.clone(),
                skill_md: destination.join("SKILL.md"),
                source_root: store_root.clone(),
                project_root: None,
                ..candidate
            });
        }
    }

    Ok(adopted)
}

fn default_data_root() -> PathBuf {
    let base_dir = data_local_dir()
        .or_else(data_dir)
        .or_else(home_dir)
        .unwrap_or_else(|| PathBuf::from("."));

    base_dir.join("skill-manager")
}

pub fn load_skill_index(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<IndexedScanSummary, IndexError> {
    let index_path = resolve_index_path(index_options);
    let roots = build_scan_roots(scan_options)
        .iter()
        .map(crate::models::ScanRoot::from)
        .collect();

    if !index_path.exists() {
        return Ok(IndexedScanSummary {
            summary: ScanSummary {
                roots,
                ..Default::default()
            },
            index: IndexStatus {
                index_path,
                exists: false,
                stale: true,
                last_refresh_unix_ms: None,
            },
        });
    }

    let connection = Connection::open(&index_path)?;
    init_schema(&connection)?;
    let last_refresh_unix_ms = read_last_refresh_unix_ms(&connection)?;
    let mut summary = read_summary_from_db(&connection, scan_options)?;
    sort_summary(&mut summary);

    Ok(IndexedScanSummary {
        summary,
        index: IndexStatus {
            index_path,
            exists: true,
            stale: is_stale(last_refresh_unix_ms, index_options),
            last_refresh_unix_ms,
        },
    })
}

pub fn refresh_skill_index(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<IndexedScanSummary, IndexError> {
    let index_path = resolve_index_path(index_options);
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut summary = scan_local_skills(scan_options);
    let mut discovered_skills = discover_full_disk_skills(scan_options, index_options);
    let mut managed_skills = scan_managed_store(index_options);

    let mut merged_skills = BTreeMap::new();
    for skill in summary.skills.drain(..) {
        merged_skills.insert(skill.path.clone(), skill);
    }
    for skill in discovered_skills.skills.drain(..) {
        merged_skills.entry(skill.path.clone()).or_insert(skill);
    }
    for skill in managed_skills.skills.drain(..) {
        merged_skills.entry(skill.path.clone()).or_insert(skill);
    }

    summary.skills = merged_skills.into_values().collect();
    summary.warnings.extend(discovered_skills.warnings);
    summary.warnings.extend(managed_skills.warnings);
    sort_summary(&mut summary);

    let mut connection = Connection::open(&index_path)?;
    init_schema(&connection)?;

    let last_refresh_unix_ms = now_unix_ms();
    write_summary_to_db(&mut connection, &summary, last_refresh_unix_ms)?;

    Ok(IndexedScanSummary {
        summary,
        index: IndexStatus {
            index_path,
            exists: true,
            stale: false,
            last_refresh_unix_ms: Some(last_refresh_unix_ms),
        },
    })
}

fn resolve_index_path(index_options: &IndexOptions) -> PathBuf {
    index_options
        .index_path
        .clone()
        .unwrap_or_else(default_index_path)
}

fn resolve_store_path(index_options: &IndexOptions) -> PathBuf {
    index_options
        .store_path
        .clone()
        .unwrap_or_else(default_store_path)
}

fn scan_managed_store(index_options: &IndexOptions) -> ScanSummary {
    let mut summary = ScanSummary::default();
    let store_root = resolve_store_path(index_options);
    if !store_root.exists() {
        return summary;
    }

    let walker = walkdir::WalkDir::new(&store_root)
        .follow_links(true)
        .max_depth(5)
        .into_iter();

    for entry in walker {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                summary.warnings.push(ScanWarning {
                    path: error.path().map(PathBuf::from),
                    message: error.to_string(),
                });
                continue;
            }
        };

        if !entry.file_type().is_file() || entry.file_name() != "SKILL.md" {
            continue;
        }

        let Ok(relative_path) = entry.path().strip_prefix(&store_root) else {
            continue;
        };

        let mut components = relative_path.components();
        let agent = components
            .next()
            .and_then(|value| AgentKind::from_key(&value.as_os_str().to_string_lossy()));
        let scope = components
            .next()
            .and_then(|value| SkillScope::from_key(&value.as_os_str().to_string_lossy()));

        let (Some(agent), Some(scope)) = (agent, scope) else {
            summary.warnings.push(ScanWarning {
                path: Some(entry.path().to_path_buf()),
                message: "Managed store entry is not in a supported agent/scope directory.".to_string(),
            });
            continue;
        };

        let Some(skill_dir) = entry.path().parent() else {
            continue;
        };

        summary.skills.push(build_installed_skill(
            SkillDescriptor {
                source_type: SkillSourceType::Import,
                agent,
                scope,
                skill_dir: skill_dir.to_path_buf(),
                skill_md: entry.path().to_path_buf(),
                source_root: store_root.clone(),
                project_root: None,
            },
            &mut summary.warnings,
        ));
    }

    summary
}

fn discover_full_disk_skills(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> ScanSummary {
    if !index_options.discover_full_disk {
        return ScanSummary::default();
    }

    let mut summary = discover_hidden_project_skills(scan_options, index_options);

    #[cfg(target_os = "macos")]
    {
        merge_discovery_summary(&mut summary, discover_spotlight_skills(scan_options));
    }

    summary
}

#[cfg(target_os = "macos")]
fn discover_spotlight_skills(scan_options: &ScanOptions) -> ScanSummary {
    let mut summary = ScanSummary::default();
    let output = match Command::new("mdfind")
        .arg("kMDItemFSName == 'SKILL.md'")
        .output()
    {
        Ok(output) => output,
        Err(error) => {
            summary.warnings.push(ScanWarning {
                path: None,
                message: format!("Spotlight discovery failed: {error}"),
            });
            return summary;
        }
    };

    if !output.status.success() {
        summary.warnings.push(ScanWarning {
            path: None,
            message: format!("Spotlight discovery exited with status {}", output.status),
        });
        return summary;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut seen_paths = BTreeMap::new();

    for line in stdout.lines() {
        let candidate = line.trim();
        if candidate.is_empty() {
            continue;
        }

        let path = PathBuf::from(candidate);
        if !path.exists() {
            continue;
        }

        let Some(descriptor) = classify_discovered_skill_path(&path, scan_options) else {
            continue;
        };

        seen_paths.entry(path).or_insert(descriptor);
    }

    for descriptor in seen_paths.into_values() {
        summary
            .skills
            .push(build_installed_skill(descriptor, &mut summary.warnings));
    }

    summary
}

fn discover_hidden_project_skills(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> ScanSummary {
    let mut summary = ScanSummary::default();
    let mut seen_paths = BTreeMap::new();
    let store_root = resolve_store_path(index_options);

    for root in hidden_discovery_roots(scan_options) {
        if !root.exists() {
            continue;
        }

        for entry in WalkDir::new(&root)
            .follow_links(false)
            .max_depth(10)
            .into_iter()
            .filter_entry(|entry| should_visit_hidden_entry(entry, &store_root))
        {
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    if should_report_walk_error(&error) {
                        summary.warnings.push(ScanWarning {
                            path: error.path().map(PathBuf::from),
                            message: error.to_string(),
                        });
                    }
                    continue;
                }
            };

            if !entry.file_type().is_file() || entry.file_name() != "SKILL.md" {
                continue;
            }

            let Some(descriptor) = classify_discovered_skill_path(entry.path(), scan_options) else {
                continue;
            };

            if descriptor.scope != SkillScope::Project {
                continue;
            }

            seen_paths
                .entry(entry.path().to_path_buf())
                .or_insert(descriptor);
        }
    }

    for descriptor in seen_paths.into_values() {
        summary
            .skills
            .push(build_installed_skill(descriptor, &mut summary.warnings));
    }

    summary
}

fn merge_discovery_summary(target: &mut ScanSummary, mut source: ScanSummary) {
    let mut merged = BTreeMap::new();
    for skill in target.skills.drain(..) {
        merged.insert(skill.path.clone(), skill);
    }
    for skill in source.skills.drain(..) {
        merged.entry(skill.path.clone()).or_insert(skill);
    }
    target.skills = merged.into_values().collect();
    target.warnings.extend(source.warnings);
}

fn hidden_discovery_roots(scan_options: &ScanOptions) -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Some(home) = scan_options.home_dir.clone().or_else(home_dir) {
        roots.push(home);
    }

    #[cfg(target_os = "macos")]
    {
        let volumes = PathBuf::from("/Volumes");
        if volumes.exists() {
            roots.push(volumes);
        }
    }

    roots
}

fn should_visit_hidden_entry(entry: &DirEntry, store_root: &PathBuf) -> bool {
    let path = entry.path();
    if path.starts_with(store_root) {
        return false;
    }

    if !entry.file_type().is_dir() {
        return true;
    }

    let name = entry.file_name().to_string_lossy();
    if name == ".git"
        || name == "node_modules"
        || name == "target"
        || name == "dist"
        || name == "build"
        || name == ".next"
        || name == ".nuxt"
        || name == ".pnpm-store"
        || name == ".yarn"
        || name == "coverage"
        || name == "Pods"
        || name == "DerivedData"
        || name == ".Trash"
        || name == "Library"
    {
        return false;
    }

    true
}

fn should_report_walk_error(error: &walkdir::Error) -> bool {
    error
        .io_error()
        .map(|io_error| io_error.kind() != ErrorKind::PermissionDenied)
        .unwrap_or(true)
}

fn init_schema(connection: &Connection) -> Result<(), rusqlite::Error> {
    connection.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS skills (
          skill_md TEXT PRIMARY KEY,
          path TEXT NOT NULL,
          source_root TEXT NOT NULL,
          project_root TEXT,
          source_type TEXT NOT NULL DEFAULT 'disk',
          family_key TEXT NOT NULL DEFAULT '',
          content_hash TEXT NOT NULL DEFAULT '',
          agent TEXT NOT NULL,
          scope TEXT NOT NULL,
          slug TEXT NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT,
          metadata_name TEXT,
          metadata_description TEXT,
          metadata_user_invocable INTEGER
        );

        CREATE TABLE IF NOT EXISTS warnings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT,
          message TEXT NOT NULL
        );
        ",
    )?;

    ensure_column_exists(
        connection,
        "skills",
        "source_type",
        "ALTER TABLE skills ADD COLUMN source_type TEXT NOT NULL DEFAULT 'disk'",
    )?;
    ensure_column_exists(
        connection,
        "skills",
        "family_key",
        "ALTER TABLE skills ADD COLUMN family_key TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_column_exists(
        connection,
        "skills",
        "content_hash",
        "ALTER TABLE skills ADD COLUMN content_hash TEXT NOT NULL DEFAULT ''",
    )
}

fn ensure_column_exists(
    connection: &Connection,
    table_name: &str,
    column_name: &str,
    alter_sql: &str,
) -> Result<(), rusqlite::Error> {
    let pragma = format!("PRAGMA table_info({table_name})");
    let mut statement = connection.prepare(&pragma)?;
    let rows = statement.query_map([], |row| row.get::<_, String>(1))?;
    let mut has_column = false;
    for row in rows {
        if row? == column_name {
            has_column = true;
            break;
        }
    }

    if has_column {
        Ok(())
    } else {
        connection.execute_batch(alter_sql)
    }
}

fn read_summary_from_db(
    connection: &Connection,
    scan_options: &ScanOptions,
) -> Result<ScanSummary, rusqlite::Error> {
    let roots = build_scan_roots(scan_options)
        .iter()
        .map(crate::models::ScanRoot::from)
        .collect();
    let skills = read_skills_from_db(connection)?;
    let warnings = read_warnings_from_db(connection)?;

    Ok(ScanSummary {
        roots,
        skills,
        warnings,
    })
}

fn read_skills_from_db(connection: &Connection) -> Result<Vec<InstalledSkill>, rusqlite::Error> {
    let mut statement = connection.prepare(
        "
        SELECT
          skill_md,
          path,
          source_root,
          project_root,
          source_type,
          family_key,
          content_hash,
          agent,
          scope,
          slug,
          display_name,
          description,
          metadata_name,
          metadata_description,
          metadata_user_invocable
        FROM skills
        ORDER BY agent, scope, project_root, display_name, path
        ",
    )?;

    let rows = statement.query_map([], |row| {
        let source_type: String = row.get(4)?;
        let family_key: String = row.get(5)?;
        let content_hash: String = row.get(6)?;
        let agent: String = row.get(7)?;
        let scope: String = row.get(8)?;

        Ok(InstalledSkill {
            skill_md: PathBuf::from(row.get::<_, String>(0)?),
            path: PathBuf::from(row.get::<_, String>(1)?),
            source_root: PathBuf::from(row.get::<_, String>(2)?),
            project_root: row.get::<_, Option<String>>(3)?.map(PathBuf::from),
            source_type: SkillSourceType::from_key(&source_type).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    4,
                    rusqlite::types::Type::Text,
                    format!("unknown skill source type: {source_type}").into(),
                )
            })?,
            family_key,
            content_hash,
            agent: AgentKind::from_key(&agent).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    7,
                    rusqlite::types::Type::Text,
                    format!("unknown agent kind: {agent}").into(),
                )
            })?,
            scope: SkillScope::from_key(&scope).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    8,
                    rusqlite::types::Type::Text,
                    format!("unknown skill scope: {scope}").into(),
                )
            })?,
            slug: row.get(9)?,
            display_name: row.get(10)?,
            description: row.get(11)?,
            metadata: SkillMetadata {
                name: row.get(12)?,
                description: row.get(13)?,
                user_invocable: row.get::<_, Option<i64>>(14)?.map(|value| value != 0),
            },
        })
    })?;

    rows.collect()
}

fn read_warnings_from_db(connection: &Connection) -> Result<Vec<ScanWarning>, rusqlite::Error> {
    let mut statement =
        connection.prepare("SELECT path, message FROM warnings ORDER BY id ASC")?;
    let rows = statement.query_map([], |row| {
        Ok(ScanWarning {
            path: row.get::<_, Option<String>>(0)?.map(PathBuf::from),
            message: row.get(1)?,
        })
    })?;

    rows.collect()
}

fn write_summary_to_db(
    connection: &mut Connection,
    summary: &ScanSummary,
    last_refresh_unix_ms: i64,
) -> Result<(), rusqlite::Error> {
    let transaction = connection.transaction()?;

    transaction.execute("DELETE FROM skills", [])?;
    transaction.execute("DELETE FROM warnings", [])?;

    for skill in &summary.skills {
        transaction.execute(
            "
            INSERT INTO skills (
              skill_md,
              path,
              source_root,
              project_root,
              source_type,
              family_key,
              content_hash,
              agent,
              scope,
              slug,
              display_name,
              description,
              metadata_name,
              metadata_description,
              metadata_user_invocable
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
            ",
            params![
                skill.skill_md.to_string_lossy().into_owned(),
                skill.path.to_string_lossy().into_owned(),
                skill.source_root.to_string_lossy().into_owned(),
                skill.project_root
                    .as_ref()
                    .map(|path| path.to_string_lossy().into_owned()),
                skill.source_type.as_key(),
                skill.family_key.clone(),
                skill.content_hash.clone(),
                skill.agent.as_key(),
                skill.scope.as_key(),
                skill.slug.clone(),
                skill.display_name.clone(),
                skill.description.clone(),
                skill.metadata.name.clone(),
                skill.metadata.description.clone(),
                skill.metadata
                    .user_invocable
                    .map(|value| if value { 1_i64 } else { 0_i64 })
            ],
        )?;
    }

    for warning in &summary.warnings {
        transaction.execute(
            "INSERT INTO warnings (path, message) VALUES (?1, ?2)",
            params![
                warning
                    .path
                    .as_ref()
                    .map(|path| path.to_string_lossy().into_owned()),
                warning.message.clone()
            ],
        )?;
    }

    transaction.execute(
        "
        INSERT INTO metadata (key, value) VALUES (?1, ?2)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        ",
        params![LAST_REFRESH_KEY, last_refresh_unix_ms.to_string()],
    )?;

    transaction.commit()
}

fn read_last_refresh_unix_ms(connection: &Connection) -> Result<Option<i64>, rusqlite::Error> {
    let mut statement = connection.prepare("SELECT value FROM metadata WHERE key = ?1")?;
    let value = statement
        .query_row([LAST_REFRESH_KEY], |row| row.get::<_, String>(0))
        .optional()?;

    Ok(value.and_then(|value| value.parse::<i64>().ok()))
}

fn is_stale(last_refresh_unix_ms: Option<i64>, index_options: &IndexOptions) -> bool {
    let Some(last_refresh_unix_ms) = last_refresh_unix_ms else {
        return true;
    };

    let now = now_unix_ms();
    let stale_after_ms =
        (index_options.stale_after_secs.unwrap_or(DEFAULT_STALE_AFTER_SECS) as i64) * 1000;

    now.saturating_sub(last_refresh_unix_ms) > stale_after_ms
}

fn now_unix_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn path_matches_skill(skill_path: &PathBuf, skill: &InstalledSkill) -> bool {
    path_equals(skill_path, &skill.path) || path_equals(skill_path, &skill.skill_md)
}

fn path_equals(left: &PathBuf, right: &PathBuf) -> bool {
    if left == right {
        return true;
    }

    let left_canonical = fs::canonicalize(left).ok();
    let right_canonical = fs::canonicalize(right).ok();
    left_canonical.zip(right_canonical).is_some_and(|(a, b)| a == b)
}

fn managed_skill_dir(skill: &InstalledSkill, store_root: &PathBuf) -> PathBuf {
    let hashed_suffix = skill.content_hash.chars().take(12).collect::<String>();
    store_root
        .join(skill.agent.as_key())
        .join(skill.scope.as_key())
        .join(format!("{}--{}", skill.family_key, hashed_suffix))
}

fn copy_dir_recursive(source: &PathBuf, destination: &PathBuf) -> Result<(), IndexError> {
    for entry in walkdir::WalkDir::new(source).follow_links(false) {
        let entry = entry.map_err(|error| {
            IndexError::Message(format!("Failed to walk source skill directory: {error}"))
        })?;
        let relative_path = entry
            .path()
            .strip_prefix(source)
            .map_err(|error| IndexError::Message(error.to_string()))?;
        let target_path = destination.join(relative_path);

        if entry.file_type().is_dir() {
            fs::create_dir_all(&target_path)?;
            continue;
        }

        #[cfg(unix)]
        if entry.file_type().is_symlink() {
            let target = fs::read_link(entry.path())?;
            std::os::unix::fs::symlink(target, &target_path)?;
            continue;
        }

        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(entry.path(), &target_path)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{adopt_skill, default_index_path, load_skill_index, refresh_skill_index};
    use crate::{IndexOptions, ScanOptions, SkillScope, SkillSourceType};
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn missing_index_returns_empty_summary() {
        let temp = TempDir::new().expect("temp");
        let snapshot = load_skill_index(
            &ScanOptions::default(),
            &IndexOptions {
                index_path: Some(temp.path().join("missing.sqlite3")),
                discover_full_disk: false,
                ..Default::default()
            },
        )
        .expect("load cache");

        assert!(snapshot.summary.skills.is_empty());
        assert!(!snapshot.index.exists);
        assert!(snapshot.index.stale);
    }

    #[test]
    fn refresh_persists_summary_to_sqlite() {
        let home = TempDir::new().expect("home dir");
        let project = TempDir::new().expect("project dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        write_skill(
            &home.path().join(".codex/skills/doc"),
            "doc",
            "Word and document helpers",
        );
        write_skill(
            &project.path().join(".agents/skills/project-sync"),
            "project-sync",
            "Project scoped sync helper",
        );

        let snapshot = refresh_skill_index(
            &ScanOptions {
                project_root: Some(project.path().to_path_buf()),
                home_dir: Some(home.path().to_path_buf()),
            },
            &IndexOptions {
                index_path: Some(index_dir.path().join("index.sqlite3")),
                store_path: Some(store_dir.path().join("store")),
                discover_full_disk: false,
                ..Default::default()
            },
        )
        .expect("refresh cache");

        assert_eq!(snapshot.summary.skills.len(), 2);
        assert!(snapshot.index.exists);
        assert!(!snapshot.index.stale);

        let loaded = load_skill_index(
            &ScanOptions {
                project_root: Some(project.path().to_path_buf()),
                home_dir: Some(home.path().to_path_buf()),
            },
            &IndexOptions {
                index_path: Some(index_dir.path().join("index.sqlite3")),
                store_path: Some(store_dir.path().join("store")),
                discover_full_disk: false,
                ..Default::default()
            },
        )
        .expect("load cache");

        assert_eq!(loaded.summary.skills.len(), 2);
        assert!(loaded.index.exists);
    }

    #[test]
    fn full_disk_refresh_discovers_hidden_project_skill_without_project_root() {
        let home = TempDir::new().expect("home dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        write_skill(
            &home.path().join("code/demo-project/.agents/skills/local-helper"),
            "local-helper",
            "Hidden project skill",
        );

        let snapshot = refresh_skill_index(
            &ScanOptions {
                project_root: None,
                home_dir: Some(home.path().to_path_buf()),
            },
            &IndexOptions {
                index_path: Some(index_dir.path().join("index.sqlite3")),
                store_path: Some(store_dir.path().join("store")),
                discover_full_disk: true,
                ..Default::default()
            },
        )
        .expect("refresh cache");

        assert!(snapshot.summary.skills.iter().any(|skill| {
            skill.scope == SkillScope::Project
                && skill.path.ends_with("local-helper")
                && skill.source_type == SkillSourceType::Disk
        }));
    }

    #[test]
    fn adopt_copies_disk_skill_into_managed_store() {
        let home = TempDir::new().expect("home dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        let skill_dir = home.path().join(".codex/skills/doc");
        write_skill(&skill_dir, "doc", "Word and document helpers");

        let scan_options = ScanOptions {
            project_root: None,
            home_dir: Some(home.path().to_path_buf()),
        };
        let index_options = IndexOptions {
            index_path: Some(index_dir.path().join("index.sqlite3")),
            store_path: Some(store_dir.path().join("store")),
            discover_full_disk: false,
            ..Default::default()
        };

        refresh_skill_index(&scan_options, &index_options).expect("refresh cache");
        let adopted = adopt_skill(skill_dir.clone(), &scan_options, &index_options)
            .expect("adopt disk skill");
        assert_eq!(adopted.source_type, SkillSourceType::Import);
        assert!(adopted.path.exists());
        assert!(adopted.skill_md.exists());

        let refreshed = refresh_skill_index(&scan_options, &index_options).expect("refresh");
        assert!(refreshed
            .summary
            .skills
            .iter()
            .any(|skill| skill.source_type == SkillSourceType::Import));
    }

    #[test]
    fn default_index_path_uses_app_support_name() {
        let path = default_index_path();
        let path_string = path.to_string_lossy();
        assert!(path_string.contains("skill-manager"));
        assert!(path_string.ends_with("index.sqlite3"));
    }

    fn write_skill(skill_dir: &std::path::Path, name: &str, description: &str) {
        fs::create_dir_all(skill_dir).expect("skill dir");
        fs::write(
            skill_dir.join("SKILL.md"),
            format!(
                "---\nname: {name}\ndescription: {description}\nuser-invocable: true\n---\n\n# {name}\n"
            ),
        )
        .expect("skill file");
    }
}
