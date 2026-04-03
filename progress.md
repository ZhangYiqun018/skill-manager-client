# Progress

## 2026-04-03

- Confirmed the repository is empty and not yet a git repo.
- Verified local runtime availability for Rust and Node.
- Confirmed local Codex and Claude Code skill directories exist.
- Chose Tauri + Rust workspace layout for shared CLI and desktop logic.
- Added a Rust workspace with `skill-manager-core`, `skill-manager-cli`, and a Tauri desktop client.
- Implemented local skill scanning for global and project-level Codex and Claude Code roots.
- Added a bilingual desktop UI with English default and Chinese toggle.
- Reworked the desktop client from a dashboard layout into a tabbed tool UI with:
  - `Skills` tab for search, filter, list selection, and SKILL.md preview
  - `Directories` tab for scan-root inspection and file-manager actions
  - `Settings` tab for language and project-root control
- Added safe desktop commands to reveal paths in the file manager and preview `SKILL.md`.
- Added a SQLite-backed local index layer in the shared Rust core.
- Added Spotlight-based full-disk discovery on macOS for supported Codex and Claude skill layouts.
- Switched the desktop app startup flow to load cached index data first and refresh in the background when the cache is stale.
- Verified:
  - `cargo test -p skill-manager-core`
  - `cargo run -p skill-manager-cli -- scan`
  - `cargo check --workspace`
  - `pnpm --dir apps/desktop build`
