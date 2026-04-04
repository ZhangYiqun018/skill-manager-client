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
| Variant/version handling | in_progress | Exact duplicate vs variant detection now runs in Rust core via `DiscoveryReport`; managed variant labels are persisted and editable, but family/variant tables and compare/diff are still pending |
| Target sync and repair | in_progress | Managed skills support per-target install / remove / repair, and Targets now has backend-owned target inventory plus batch sync/repair; remaining work is mainly deeper target-registry/settings support |
| UX subtraction refactor | in_progress | Shell controls, Discover intake, Library detail hierarchy, and Targets/Settings scope are being simplified to surface default-variant management and reduce duplicated explanations |
| Local import | complete | Local folder import now flows directly into the managed library with agent/scope selection |
| Remote registry | complete | `skills.sh` search and remote adoption now work through the desktop app |
| External product research | complete | Reviewed PromptHub source to extract reusable UX/workflow patterns and identify where our model should intentionally diverge |
| Product blueprint and priority planning | complete | Converted PRD + UI spec + PromptHub research into a long-term product blueprint and a phased development priority list |
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
- Dedupe needs a richer internal model than `family_key + content_hash`; it should distinguish:
  - discovery occurrence
  - exact duplicate group
  - skill family
  - variant
  - canonical managed item
- Batch adoption needs first-class presets, at minimum:
  - all project-scoped candidates
  - all Codex candidates
  - all Claude Code candidates
  - all exact-unique candidates
- Manual scan confirmation should apply to any UI action that triggers a full-disk refresh, not only the Discover page.
- Discover review should operate on representative candidates rather than every raw disk occurrence, so list density stays manageable on machines with many duplicated skills.
- The right-side details panel should stay visible while browsing long discovery/library lists on desktop widths; stacked layouts should disable sticky behavior.
- Same-content skills found in multiple places should merge into one canonical managed item while preserving all origin paths as provenance.
- Same-family but different-content skills should not force immediate semver; the product should support generated default version labels and optional user overrides.
- PromptHub is a good reference for:
  - library/distribution/store workspace separation
  - full skill detail pages
  - install-first desktop UX
  - settings for path overrides and install mode
- PromptHub is not a good reference for:
  - family/variant identity
  - provenance-aware dedupe
  - whole-directory canonical installation semantics
- The next implementation priority order has shifted to:
  - persist richer family / variant / provenance entities instead of deriving them from flat skills rows
  - add compare/diff flows for same-family variants
  - expand settings for install strategy, path overrides, and extra scan roots
  - harden remote-source preview and candidate review before adoption
- The current UX problem is no longer backend capability; it is product expression:
  - default-version management exists but was buried too deep
  - the same family/variant/install concepts were repeated across multiple surfaces
  - shell-level search / refresh / language controls overreached into page-specific workflows
  - `Discover` and `Targets` both tried to do too many jobs at once
- Phase 1 and most of Phase 3 are now landed:
  - managed `Skill Detail` has tabs for overview, content, files, installs, and origins
  - install actions live on the selected managed skill
  - backend install records and origin records exist
  - Targets now exposes batch sync / repair from backend-owned target inventories
  - local folder import and `skills.sh` remote adoption are wired end to end
  - discovery grouping has moved from frontend projection into the Rust core

## Risks

- Tauri setup can require platform-specific config even for a minimal app.
- `SKILL.md` frontmatter differs slightly across ecosystems, so parsing needs to stay tolerant.
- Spotlight discovery is macOS-specific for now; other platforms currently fall back to known-root scanning only.
- The managed store and install targets now form a functional loop, but install strategy/settings and richer target policy are still missing.
- Duplicate review can become confusing if the product exposes raw scan results without grouping, exact-duplicate suppression, and clear variant labeling.
- Variant families are now detectable in the backend report, but they still need persistent naming, compare/diff, and family-level browsing.
- A shallow dedupe model risks two opposite mistakes:
  - over-merging distinct variants that only share a name
  - under-merging exact duplicates that should collapse into one canonical managed item with multiple origins
