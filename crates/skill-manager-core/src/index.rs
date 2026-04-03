use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use dirs::{data_dir, data_local_dir, home_dir};
use rusqlite::{Connection, OptionalExtension, params};
use thiserror::Error;

use crate::models::{
    AgentKind, IndexOptions, IndexStatus, IndexedScanSummary, InstalledSkill, ScanOptions,
    ScanSummary, ScanWarning, SkillMetadata, SkillScope,
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
}

pub fn default_index_path() -> PathBuf {
    let base_dir = data_local_dir()
        .or_else(data_dir)
        .or_else(home_dir)
        .unwrap_or_else(|| PathBuf::from("."));

    base_dir.join("skill-manager/index.sqlite3")
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

    let mut merged_skills = BTreeMap::new();
    for skill in summary.skills.drain(..) {
        merged_skills.insert(skill.path.clone(), skill);
    }
    for skill in discovered_skills.skills.drain(..) {
        merged_skills.entry(skill.path.clone()).or_insert(skill);
    }

    summary.skills = merged_skills.into_values().collect();
    summary.warnings.extend(discovered_skills.warnings);
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

fn discover_full_disk_skills(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> ScanSummary {
    if !index_options.discover_full_disk {
        return ScanSummary::default();
    }

    #[cfg(target_os = "macos")]
    {
        discover_spotlight_skills(scan_options)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let mut summary = ScanSummary::default();
        summary.warnings.push(ScanWarning {
            path: None,
            message: "Full-disk discovery is only implemented on macOS right now.".to_string(),
        });
        summary
    }
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
    )
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
        let agent: String = row.get(4)?;
        let scope: String = row.get(5)?;

        Ok(InstalledSkill {
            skill_md: PathBuf::from(row.get::<_, String>(0)?),
            path: PathBuf::from(row.get::<_, String>(1)?),
            source_root: PathBuf::from(row.get::<_, String>(2)?),
            project_root: row.get::<_, Option<String>>(3)?.map(PathBuf::from),
            agent: AgentKind::from_key(&agent).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    4,
                    rusqlite::types::Type::Text,
                    format!("unknown agent kind: {agent}").into(),
                )
            })?,
            scope: SkillScope::from_key(&scope).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    5,
                    rusqlite::types::Type::Text,
                    format!("unknown skill scope: {scope}").into(),
                )
            })?,
            slug: row.get(6)?,
            display_name: row.get(7)?,
            description: row.get(8)?,
            metadata: SkillMetadata {
                name: row.get(9)?,
                description: row.get(10)?,
                user_invocable: row.get::<_, Option<i64>>(11)?.map(|value| value != 0),
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
              agent,
              scope,
              slug,
              display_name,
              description,
              metadata_name,
              metadata_description,
              metadata_user_invocable
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
            ",
            params![
                skill.skill_md.to_string_lossy().into_owned(),
                skill.path.to_string_lossy().into_owned(),
                skill.source_root.to_string_lossy().into_owned(),
                skill.project_root
                    .as_ref()
                    .map(|path| path.to_string_lossy().into_owned()),
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

#[cfg(test)]
mod tests {
    use super::{default_index_path, load_skill_index, refresh_skill_index};
    use crate::{IndexOptions, ScanOptions};
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
                discover_full_disk: false,
                ..Default::default()
            },
        )
        .expect("load cache");

        assert_eq!(loaded.summary.skills.len(), 2);
        assert!(loaded.index.exists);
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
