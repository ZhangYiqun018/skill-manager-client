use std::collections::BTreeSet;
use std::ffi::OsStr;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use dirs::home_dir;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use walkdir::WalkDir;

use crate::models::{
    AgentKind, InstalledSkill, RootSpec, ScanOptions, ScanRoot, ScanSummary, ScanWarning,
    SkillDescriptor, SkillMetadata, SkillScope, SkillSourceType,
};

const SKILL_FILE_NAME: &str = "SKILL.md";
const MAX_SCAN_DEPTH: usize = 4;

#[derive(Debug, Deserialize)]
struct RawFrontmatter {
    name: Option<String>,
    description: Option<String>,
    #[serde(rename = "user-invocable")]
    user_invocable: Option<bool>,
}

impl From<RawFrontmatter> for SkillMetadata {
    fn from(value: RawFrontmatter) -> Self {
        Self {
            name: value.name,
            description: value.description,
            user_invocable: value.user_invocable,
        }
    }
}

pub fn scan_local_skills(options: &ScanOptions) -> ScanSummary {
    let roots = build_scan_roots(options);
    let mut summary = ScanSummary {
        roots: roots.iter().map(ScanRoot::from).collect(),
        ..Default::default()
    };

    for root in &roots {
        if !root.base_dir.exists() {
            continue;
        }

        scan_root(root, &mut summary);
    }

    sort_summary(&mut summary);
    summary
}

pub(crate) fn build_scan_roots(options: &ScanOptions) -> Vec<RootSpec> {
    let mut roots = Vec::new();

    if let Some(home) = options.home_dir.clone().or_else(home_dir) {
        roots.push(RootSpec {
            agent: AgentKind::Codex,
            scope: SkillScope::Global,
            base_dir: home.join(".codex/skills"),
        });
        roots.push(RootSpec {
            agent: AgentKind::ClaudeCode,
            scope: SkillScope::Global,
            base_dir: home.join(".claude/skills"),
        });
        roots.push(RootSpec {
            agent: AgentKind::Agent,
            scope: SkillScope::Global,
            base_dir: home.join(".agent/skills"),
        });
        roots.push(RootSpec {
            agent: AgentKind::OpenClaw,
            scope: SkillScope::Global,
            base_dir: home.join(".openclaw/workspace/skills"),
        });
    }

    if let Some(project_root) = &options.project_root {
        roots.push(RootSpec {
            agent: AgentKind::Codex,
            scope: SkillScope::Project,
            base_dir: project_root.join(".agents/skills"),
        });
        roots.push(RootSpec {
            agent: AgentKind::Codex,
            scope: SkillScope::Project,
            base_dir: project_root.join(".codex/skills"),
        });
        roots.push(RootSpec {
            agent: AgentKind::ClaudeCode,
            scope: SkillScope::Project,
            base_dir: project_root.join(".claude/skills"),
        });
        roots.push(RootSpec {
            agent: AgentKind::Agent,
            scope: SkillScope::Project,
            base_dir: project_root.join(".agent/skills"),
        });
        roots.push(RootSpec {
            agent: AgentKind::OpenClaw,
            scope: SkillScope::Project,
            base_dir: project_root.join(".openclaw/workspace/skills"),
        });
    }

    roots
}

pub(crate) fn build_installed_skill(
    descriptor: SkillDescriptor,
    warnings: &mut Vec<ScanWarning>,
) -> InstalledSkill {
    let metadata = match read_skill_metadata(&descriptor.skill_md) {
        Ok(metadata) => metadata,
        Err(message) => {
            warnings.push(ScanWarning {
                path: Some(descriptor.skill_md.clone()),
                message,
            });
            SkillMetadata::default()
        }
    };

    let slug = descriptor
        .skill_dir
        .file_name()
        .and_then(|value| value.to_str())
        .map(|value| normalize_slug(value, &descriptor.source_type))
        .unwrap_or_else(|| "unknown-skill".to_string());

    let display_name = metadata.name.clone().unwrap_or_else(|| slug.clone());
    let family_key = normalize_family_key(&display_name, &slug);
    let content_hash = match hash_skill_directory(&descriptor.skill_dir) {
        Ok(hash) => hash,
        Err(message) => {
            warnings.push(ScanWarning {
                path: Some(descriptor.skill_dir.clone()),
                message,
            });
            format!("unhashed-{}", fallback_hash_seed(&descriptor.skill_dir))
        }
    };

    InstalledSkill {
        source_type: descriptor.source_type,
        family_key,
        variant_label: None,
        content_hash,
        agent: descriptor.agent,
        scope: descriptor.scope,
        slug,
        display_name,
        description: metadata.description.clone(),
        path: descriptor.skill_dir,
        skill_md: descriptor.skill_md,
        source_root: descriptor.source_root,
        project_root: descriptor.project_root,
        metadata,
        tags: Vec::new(),
    }
}

fn normalize_slug(value: &str, source_type: &SkillSourceType) -> String {
    if *source_type == SkillSourceType::Import {
        return value
            .rsplit_once("--")
            .map(|(slug, _)| slug.to_string())
            .unwrap_or_else(|| value.to_string());
    }

    value.to_string()
}

fn normalize_family_key(display_name: &str, slug: &str) -> String {
    let raw = if display_name.trim().is_empty() {
        slug
    } else {
        display_name
    };

    let mut normalized = String::with_capacity(raw.len());
    let mut last_was_separator = false;

    for ch in raw.chars() {
        if ch.is_ascii_alphanumeric() {
            normalized.push(ch.to_ascii_lowercase());
            last_was_separator = false;
        } else if !last_was_separator {
            normalized.push('-');
            last_was_separator = true;
        }
    }

    normalized.trim_matches('-').to_string()
}

pub(crate) fn hash_skill_directory(skill_dir: &Path) -> Result<String, String> {
    let mut hasher = Sha256::new();

    for entry in WalkDir::new(skill_dir)
        .follow_links(false)
        .sort_by_file_name()
        .into_iter()
    {
        let entry = entry.map_err(|error| error.to_string())?;
        let relative_path = entry
            .path()
            .strip_prefix(skill_dir)
            .map_err(|error| error.to_string())?;

        hasher.update(relative_path.to_string_lossy().as_bytes());

        if entry.file_type().is_dir() {
            hasher.update(b":dir:");
            continue;
        }

        if entry.file_type().is_symlink() {
            hasher.update(b":symlink:");
            let target = fs::read_link(entry.path()).map_err(|error| error.to_string())?;
            hasher.update(target.to_string_lossy().as_bytes());
            continue;
        }

        hasher.update(b":file:");
        let mut file = fs::File::open(entry.path()).map_err(|error| error.to_string())?;
        let mut buffer = [0_u8; 8192];
        loop {
            let bytes_read = file.read(&mut buffer).map_err(|error| error.to_string())?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }
    }

    Ok(format!("{:x}", hasher.finalize()))
}

fn fallback_hash_seed(path: &Path) -> String {
    use std::hash::{Hash, Hasher};

    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    path.hash(&mut hasher);
    format!("{:08x}", hasher.finish())
}

pub(crate) fn classify_discovered_skill_path(
    path: &Path,
    options: &ScanOptions,
) -> Option<SkillDescriptor> {
    if path.file_name()? != OsStr::new(SKILL_FILE_NAME) {
        return None;
    }

    let skill_dir = path.parent()?.to_path_buf();
    let source_root = skill_dir.parent()?.to_path_buf();
    if source_root.file_name()? != OsStr::new("skills") {
        return None;
    }

    let container_dir = source_root.parent()?.to_path_buf();
    let mut container_name = container_dir.file_name()?.to_str()?;
    let resolved_home = options.home_dir.clone().or_else(home_dir);

    // OpenClaw uses `.openclaw/workspace/skills/{skill}/SKILL.md`
    if container_name == "workspace" {
        if let Some(parent) = container_dir.parent() {
            if parent.file_name()?.to_str()? == ".openclaw" {
                container_name = ".openclaw";
            }
        }
    }

    match container_name {
        ".agents" => Some(SkillDescriptor {
            source_type: SkillSourceType::Disk,
            agent: AgentKind::Codex,
            scope: SkillScope::Project,
            skill_dir,
            skill_md: path.to_path_buf(),
            source_root,
            project_root: container_dir.parent().map(Path::to_path_buf),
        }),
        ".claude" => {
            let is_global = resolved_home
                .as_ref()
                .map(|home| source_root == home.join(".claude/skills"))
                .unwrap_or(false);

            Some(SkillDescriptor {
                source_type: SkillSourceType::Disk,
                agent: AgentKind::ClaudeCode,
                scope: if is_global {
                    SkillScope::Global
                } else {
                    SkillScope::Project
                },
                skill_dir,
                skill_md: path.to_path_buf(),
                source_root,
                project_root: if is_global {
                    None
                } else {
                    container_dir.parent().map(Path::to_path_buf)
                },
            })
        }
        ".codex" => {
            let is_global = resolved_home
                .as_ref()
                .map(|home| source_root == home.join(".codex/skills"))
                .unwrap_or(false);

            Some(SkillDescriptor {
                source_type: SkillSourceType::Disk,
                agent: AgentKind::Codex,
                scope: if is_global {
                    SkillScope::Global
                } else {
                    SkillScope::Project
                },
                skill_dir,
                skill_md: path.to_path_buf(),
                source_root,
                project_root: if is_global {
                    None
                } else {
                    container_dir.parent().map(Path::to_path_buf)
                },
            })
        }
        ".openclaw" => {
            let is_global = resolved_home
                .as_ref()
                .map(|home| source_root == home.join(".openclaw/workspace/skills"))
                .unwrap_or(false);

            Some(SkillDescriptor {
                source_type: SkillSourceType::Disk,
                agent: AgentKind::OpenClaw,
                scope: if is_global {
                    SkillScope::Global
                } else {
                    SkillScope::Project
                },
                skill_dir,
                skill_md: path.to_path_buf(),
                source_root,
                project_root: if is_global {
                    None
                } else {
                    container_dir.parent().map(Path::to_path_buf)
                },
            })
        }
        _ => None,
    }
}

pub(crate) fn sort_summary(summary: &mut ScanSummary) {
    summary.skills.sort_by(|left, right| {
        left.agent
            .cmp(&right.agent)
            .then(left.scope.cmp(&right.scope))
            .then(left.project_root.cmp(&right.project_root))
            .then(left.display_name.cmp(&right.display_name))
            .then(left.path.cmp(&right.path))
    });

    summary.warnings.sort_by(|left, right| {
        left.path
            .cmp(&right.path)
            .then(left.message.cmp(&right.message))
    });
}

fn scan_root(root: &RootSpec, summary: &mut ScanSummary) {
    let mut seen = BTreeSet::new();

    for entry in WalkDir::new(&root.base_dir)
        .follow_links(false)
        .max_depth(MAX_SCAN_DEPTH)
        .into_iter()
    {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                summary.warnings.push(ScanWarning {
                    path: error.path().map(Path::to_path_buf),
                    message: error.to_string(),
                });
                continue;
            }
        };

        if !entry.file_type().is_file() || entry.file_name() != OsStr::new(SKILL_FILE_NAME) {
            continue;
        }

        let Some(skill_dir) = entry.path().parent() else {
            continue;
        };

        if !seen.insert(skill_dir.to_path_buf()) {
            continue;
        }

        let descriptor = SkillDescriptor {
            source_type: SkillSourceType::Disk,
            agent: root.agent.clone(),
            scope: root.scope.clone(),
            skill_dir: skill_dir.to_path_buf(),
            skill_md: entry.path().to_path_buf(),
            source_root: root.base_dir.clone(),
            project_root: root_project_root(root),
        };

        summary
            .skills
            .push(build_installed_skill(descriptor, &mut summary.warnings));
    }
}

fn root_project_root(root: &RootSpec) -> Option<PathBuf> {
    if root.scope != SkillScope::Project {
        return None;
    }

    root.base_dir
        .parent()
        .and_then(Path::parent)
        .map(Path::to_path_buf)
}

fn read_skill_metadata(path: &Path) -> Result<SkillMetadata, String> {
    let contents = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let Some(frontmatter) = extract_frontmatter(&contents) else {
        return Ok(SkillMetadata::default());
    };

    serde_yaml::from_str::<RawFrontmatter>(&frontmatter)
        .map(Into::into)
        .map_err(|error| format!("frontmatter parse failed: {error}"))
}

fn extract_frontmatter(contents: &str) -> Option<String> {
    let mut lines = contents.lines();

    if lines.next()?.trim() != "---" {
        return None;
    }

    let mut yaml_lines = Vec::new();

    for line in lines {
        if line.trim() == "---" {
            return Some(yaml_lines.join("\n"));
        }

        yaml_lines.push(line);
    }

    None
}

#[cfg(test)]
mod tests {
    use super::{
        AgentKind, ScanOptions, SkillScope, classify_discovered_skill_path, scan_local_skills,
    };
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn scans_global_and_project_skill_roots() {
        let home = TempDir::new().expect("home dir");
        let project = TempDir::new().expect("project dir");

        write_skill(
            &home.path().join(".codex/skills/doc"),
            "doc",
            "Word and document helpers",
        );
        write_skill(
            &home.path().join(".claude/skills/reviewer"),
            "reviewer",
            "Review code and surface risks",
        );
        write_skill(
            &project.path().join(".agents/skills/project-sync"),
            "project-sync",
            "Project scoped sync helper",
        );

        let summary = scan_local_skills(&ScanOptions {
            project_root: Some(project.path().to_path_buf()),
            home_dir: Some(home.path().to_path_buf()),
        });

        assert_eq!(summary.skills.len(), 3);
        assert!(summary.warnings.is_empty());
        assert!(summary.roots.iter().any(|root| {
            root.agent == AgentKind::Codex && root.scope == SkillScope::Global && root.exists
        }));
        assert!(summary.roots.iter().any(|root| {
            root.agent == AgentKind::ClaudeCode && root.scope == SkillScope::Global && root.exists
        }));
        assert!(summary.skills.iter().any(|skill| {
            skill.agent == AgentKind::Codex
                && skill.scope == SkillScope::Project
                && skill.slug == "project-sync"
                && skill.project_root.as_deref() == Some(project.path())
        }));
    }

    #[test]
    fn missing_frontmatter_is_tolerated() {
        let home = TempDir::new().expect("home dir");
        let skill_dir = home.path().join(".codex/skills/plain-text");
        fs::create_dir_all(&skill_dir).expect("skill dir");
        fs::write(
            skill_dir.join("SKILL.md"),
            "# Plain\n\nNo metadata block here.",
        )
        .expect("skill");

        let summary = scan_local_skills(&ScanOptions {
            project_root: None,
            home_dir: Some(home.path().to_path_buf()),
        });

        let skill = summary
            .skills
            .iter()
            .find(|skill| skill.slug == "plain-text")
            .expect("skill present");

        assert_eq!(skill.display_name, "plain-text");
        assert!(skill.description.is_none());
    }

    #[test]
    fn classifies_discovered_project_skill_paths() {
        let home = TempDir::new().expect("home dir");
        let project = TempDir::new().expect("project dir");
        let skill_md = project.path().join(".claude/skills/reviewer/SKILL.md");
        write_skill(
            skill_md.parent().expect("skill dir"),
            "reviewer",
            "Project Claude skill",
        );

        let descriptor = classify_discovered_skill_path(
            &skill_md,
            &ScanOptions {
                project_root: None,
                home_dir: Some(home.path().to_path_buf()),
            },
        )
        .expect("descriptor");

        assert_eq!(descriptor.agent, AgentKind::ClaudeCode);
        assert_eq!(descriptor.scope, SkillScope::Project);
        assert_eq!(descriptor.project_root.as_deref(), Some(project.path()));
    }

    #[test]
    fn scans_global_openclaw_skill_root() {
        let home = TempDir::new().expect("home dir");

        write_skill(
            &home
                .path()
                .join(".openclaw/workspace/skills/openclaw-helper"),
            "openclaw-helper",
            "OpenClaw workspace skill",
        );

        let summary = scan_local_skills(&ScanOptions {
            project_root: None,
            home_dir: Some(home.path().to_path_buf()),
        });

        assert_eq!(summary.skills.len(), 1);
        assert!(summary.roots.iter().any(|root| {
            root.agent == AgentKind::OpenClaw && root.scope == SkillScope::Global && root.exists
        }));
        assert!(summary.skills.iter().any(|skill| {
            skill.agent == AgentKind::OpenClaw
                && skill.scope == SkillScope::Global
                && skill.slug == "openclaw-helper"
        }));
    }

    #[test]
    fn classifies_global_openclaw_skill_path() {
        let home = TempDir::new().expect("home dir");
        let skill_md = home
            .path()
            .join(".openclaw/workspace/skills/helper/SKILL.md");
        write_skill(
            skill_md.parent().expect("skill dir"),
            "helper",
            "OpenClaw helper",
        );

        let descriptor = classify_discovered_skill_path(
            &skill_md,
            &ScanOptions {
                project_root: None,
                home_dir: Some(home.path().to_path_buf()),
            },
        )
        .expect("descriptor");

        assert_eq!(descriptor.agent, AgentKind::OpenClaw);
        assert_eq!(descriptor.scope, SkillScope::Global);
        assert!(descriptor.project_root.is_none());
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
