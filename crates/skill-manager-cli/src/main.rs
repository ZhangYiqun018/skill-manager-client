use std::path::PathBuf;

use anyhow::Result;
use clap::{Parser, Subcommand};
use skill_manager_core::{ScanOptions, ScanSummary, scan_local_skills};

#[derive(Debug, Parser)]
#[command(name = "skill-manager", about = "Manage local AI agent skills")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Scan installed skills from local Codex and Claude Code directories.
    Scan {
        /// Optional project directory to inspect for project-scoped skills.
        #[arg(long)]
        project_root: Option<PathBuf>,
        /// Print the scan result as JSON.
        #[arg(long)]
        json: bool,
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
    }

    Ok(())
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
