# Task Plan

## Goal

Bootstrap a Tauri + Rust based skill manager with:

- shared Rust core
- CLI entry point
- desktop client
- first working feature: scan local Codex and Claude Code skills
- cached full-disk discovery so startup does not require a full rescan

## Phases

| Phase | Status | Notes |
| --- | --- | --- |
| Planning and scaffold | complete | Rust workspace, root scripts, and Tauri app scaffolded |
| Core scanner | complete | Scans Codex and Claude Code skill roots and parses frontmatter |
| CLI | complete | `scan` command added with readable and JSON output |
| Desktop app | complete | Tauri shell wired to Rust command with bilingual UI |
| Indexed discovery | complete | SQLite-backed cache layer with Spotlight-based full-disk discovery on macOS |
| Verification | complete | Rust checks, core tests, CLI smoke test, and frontend build passed |

## Decisions

- Use a Rust workspace so the CLI and desktop app share the same core crate.
- Use Tauri 2 for desktop packaging.
- Keep the first milestone focused on local scanning before remote installs and symlink management.
- Keep internationalization lightweight for now with a local front-end dictionary and persisted language toggle.
- Replace the original hero layout with a compact, tabbed information architecture before adding more management actions.
- Avoid fake enable/disable controls until the underlying capability exists.
- Treat "scan the whole disk" as "discover Codex/Claude skill layouts anywhere on disk", not "index every SKILL.md in every repository".
- Use a local SQLite index so the desktop app can render cached results first and refresh in the background when the cache is stale.

## Risks

- Tauri setup can require platform-specific config even for a minimal app.
- `SKILL.md` frontmatter differs slightly across ecosystems, so parsing needs to stay tolerant.
- Spotlight discovery is macOS-specific for now; other platforms currently fall back to known-root scanning only.
