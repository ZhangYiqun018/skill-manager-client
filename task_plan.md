# Task Plan

## Goal

Bootstrap a Tauri + Rust based skill manager with:

- shared Rust core
- CLI entry point
- desktop client
- first working feature: scan local Codex and Claude Code skills
- cached full-disk discovery so startup does not require a full rescan
- source-aware candidate review, dedupe, and batch adoption before install-target sync

## Phases

| Phase | Status | Notes |
| --- | --- | --- |
| Planning and scaffold | complete | Rust workspace, root scripts, and Tauri app scaffolded |
| Core scanner | complete | Scans Codex and Claude Code skill roots and parses frontmatter |
| CLI | complete | `scan` command added with readable and JSON output |
| Desktop app | complete | Tauri shell wired to Rust command with bilingual UI |
| Indexed discovery | complete | SQLite-backed cache layer with Spotlight-based full-disk discovery on macOS |
| Frontend IA refactor | complete | Desktop app moved to `library / discover / targets / settings` structure with modularized types and API layer |
| Managed library adoption | complete | First `Discover -> Adopt -> Library` loop wired through the Rust core, Tauri commands, and desktop UI |
| Discovery hardening | complete | Added explicit full-scan confirmation, hidden project-skill discovery, duplicate grouping, and batch adoption presets |
| Variant/version handling | in_progress | Exact duplicate vs variant detection exists; user-defined version labeling is still pending |
| Target sync and repair | pending | Install managed skills into agent targets by symlink and repair broken targets |
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
- Start the spec implementation with information architecture, state shape, and page skeletons before wiring install / adopt / repair commands.
- Make `Library` and `Discover` semantically real by carrying `source_type` in the Rust model instead of hardcoding source labels in the frontend.
- Keep adoption conservative: copy a whole skill directory into the canonical store, do not rewrite the original location yet.
- Full-disk scanning must be manual and guarded by a confirmation step because it can be slow and noisy.
- Candidate review should be name-grouped for usability, but dedupe decisions should be driven by content hashing rather than name alone.
- Exact duplicates should be collapsible into one recommended adoption candidate; same-name variants should be preserved as separate versions within one skill family.
- Batch adoption needs first-class presets, at minimum:
  - all project-scoped candidates
  - all Codex candidates
  - all Claude Code candidates
  - all exact-unique candidates
- Manual scan confirmation should apply to any UI action that triggers a full-disk refresh, not only the Discover page.

## Risks

- Tauri setup can require platform-specific config even for a minimal app.
- `SKILL.md` frontmatter differs slightly across ecosystems, so parsing needs to stay tolerant.
- Spotlight discovery is macOS-specific for now; other platforms currently fall back to known-root scanning only.
- The managed store exists, but install targets still do not sync from it yet, so the product is not at full management closure.
- Duplicate review can become confusing if the product exposes raw scan results without grouping, exact-duplicate suppression, and clear variant labeling.
- Variant families are now detectable, but they still need a proper version-labeling flow before import UX is complete.
