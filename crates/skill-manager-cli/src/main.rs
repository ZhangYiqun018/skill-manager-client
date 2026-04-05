use std::path::PathBuf;

use anyhow::Result;
use clap::{Parser, Subcommand};
use skill_manager_core::{
    AgentKind, IndexOptions, ScanOptions, ScanSummary, SkillScope, check_managed_skill_updates,
    import_git_skill, scan_local_skills, update_managed_skill_from_git,
};

#[derive(Debug, Parser)]
#[command(name = "skill-manager", about = "Manage local AI agent skills")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Scan installed skills from local Codex, Claude Code, and OpenClaw directories.
    Scan {
        /// Optional project directory to inspect for project-scoped skills.
        #[arg(long)]
        project_root: Option<PathBuf>,
        /// Print the scan result as JSON.
        #[arg(long)]
        json: bool,
    },
    /// Install a skill from a Git URL into the managed library.
    Install {
        /// Git URL to clone (e.g., https://github.com/user/repo.git).
        url: String,
        /// Agent to assign (agent, codex, claude_code, or open_claw).
        #[arg(long, default_value = "codex")]
        agent: String,
        /// Scope to assign (global or project).
        #[arg(long, default_value = "global")]
        scope: String,
        /// Optional branch to checkout.
        #[arg(long)]
        branch: Option<String>,
        /// Optional subpath within the repo to the skill directory.
        #[arg(long)]
        subpath: Option<String>,
    },
    /// Check for updates to Git-tracked skills, or update a specific skill.
    Update {
        /// Optional managed skill path to update. If omitted, checks all Git-tracked skills.
        skill_path: Option<PathBuf>,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command.unwrap_or(Commands::Scan {
        project_root: None,
        json: false,
    }) {
        Commands::Scan { project_root, json } => {
            let summary = scan_local_skills(&ScanOptions {
                project_root,
                ..Default::default()
            });

            if json {
                println!("{}", serde_json::to_string_pretty(&summary)?);
            } else {
                print_summary(&summary);
            }
        }
        Commands::Install {
            url,
            agent,
            scope,
            branch,
            subpath,
        } => {
            let agent = parse_agent(&agent)?;
            let scope = parse_scope(&scope)?;
            let index_options = IndexOptions::default();
            let skill = import_git_skill(url, subpath, None, agent, scope, branch, &index_options)?;
            println!("Installed skill: {}", skill.display_name);
            println!("  Path: {}", skill.path.display());
            println!("  Family: {}", skill.family_key);
            println!(
                "  Variant: {}",
                skill.variant_label.as_deref().unwrap_or("default")
            );
        }
        Commands::Update { skill_path } => {
            let index_options = IndexOptions::default();
            match skill_path {
                Some(path) => {
                    let scan_options = ScanOptions::default();
                    let skill = update_managed_skill_from_git(path, &scan_options, &index_options)?;
                    println!("Updated skill: {}", skill.display_name);
                    println!("  Path: {}", skill.path.display());
                }
                None => {
                    let checks = check_managed_skill_updates(&index_options)?;
                    if checks.is_empty() {
                        println!("No Git-tracked skills found.");
                    } else {
                        let mut has_updates = false;
                        for check in checks {
                            if check.has_update {
                                has_updates = true;
                                println!(
                                    "Update available: {} -> {}",
                                    check.current_commit, check.latest_commit
                                );
                                println!("  Path: {}", check.managed_skill_path.display());
                            }
                        }
                        if !has_updates {
                            println!("All Git-tracked skills are up to date.");
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

fn parse_agent(value: &str) -> Result<AgentKind> {
    match value {
        "agent" => Ok(AgentKind::Agent),
        "codex" => Ok(AgentKind::Codex),
        "claude_code" => Ok(AgentKind::ClaudeCode),
        "open_claw" => Ok(AgentKind::OpenClaw),
        _ => anyhow::bail!("Unsupported agent: {value}"),
    }
}

fn parse_scope(value: &str) -> Result<SkillScope> {
    match value {
        "global" => Ok(SkillScope::Global),
        "project" => Ok(SkillScope::Project),
        _ => anyhow::bail!("Unsupported scope: {value}"),
    }
}

fn print_summary(summary: &ScanSummary) {
    println!("Skill Manager");
    println!(
        "{} skills across {} scan roots",
        summary.skills.len(),
        summary.roots.len()
    );

    for root in &summary.roots {
        let status = if root.exists { "present" } else { "missing" };
        let count = summary
            .skills
            .iter()
            .filter(|skill| skill.agent == root.agent && skill.scope == root.scope)
            .count();

        println!(
            "- {} / {}: {} ({})",
            root.scope.label(),
            root.agent.label(),
            root.base_dir.display(),
            format!("{status}, {count} skills")
        );
    }

    if summary.skills.is_empty() {
        return;
    }

    println!();
    for skill in &summary.skills {
        println!(
            "{} [{} / {}]",
            skill.display_name,
            skill.agent.label(),
            skill.scope.label()
        );

        if let Some(description) = &skill.description {
            println!("  {description}");
        }

        println!("  {}", skill.path.display());
    }

    if !summary.warnings.is_empty() {
        println!();
        println!("Warnings");
        for warning in &summary.warnings {
            match &warning.path {
                Some(path) => println!("- {}: {}", path.display(), warning.message),
                None => println!("- {}", warning.message),
            }
        }
    }
}
