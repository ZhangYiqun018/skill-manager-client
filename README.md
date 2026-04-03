# Skill Manager Client

Tauri + Rust workspace for a local skill manager.

## Packages

- `crates/skill-manager-core`: shared scan and metadata logic
- `crates/skill-manager-cli`: command-line interface
- `apps/desktop`: Tauri desktop client

## First Milestone

- scan local Codex skills
- scan local Claude Code skills
- expose results in both CLI and desktop UI
- cache discovered skills in a local SQLite index
- load cached data first in the desktop app, then refresh in the background on macOS

## Commands

```bash
pnpm desktop:install
cargo run -p skill-manager-cli -- scan --json
pnpm desktop:dev
```
