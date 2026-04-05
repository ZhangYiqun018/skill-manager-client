# Task Plan

## Goal

Keep the project focused on being a usable desktop skill manager for Codex and Claude Code:

- discover skills from disk and registry
- adopt them into a managed library
- manage family / variant relationships
- install and repair them across targets

## Current Product State

- `Library` is the main workspace for managed skills.
- `Discover` is the intake/review workspace for scan, import, and registry adoption.
- `Targets` is intended to be a repair/health console.
- `Settings` now also contains theme and custom install target management.
- `Guide` exists as a separate top-level page.

## Immediate Priorities

1. Fix correctness issues in the current install/discovery flows.
   - registry adoption must use the repo source, not the display name
   - target sync/repair must recreate missing target roots
   - discovery mutations must preserve async errors back to the UI
   - install/repair should fall back to copy when symlink creation is unavailable

2. Re-tighten product scope after the recent feature additions.
   - keep `Library` as the primary object workspace
   - keep `Discover` as intake + review, not a second dashboard
   - keep `Targets` as repair-oriented, not a second install reader
   - keep `Settings` lightweight even with custom target management

3. Reconcile new install features with earlier UX simplification.
   - custom install targets are useful
   - Guide and theme are optional polish, not core product value
   - quick actions and duplicated install entry points should stay restrained

## Decisions

- Preserve the Rust core + Tauri desktop architecture.
- Preserve the managed store + outward install model.
- Preserve family / variant semantics.
- Prefer reducing duplicated UI surfaces over adding more top-level controls.

## Risks

- The app now has enough surface area that UX drift can outpace real product value.
- Install features are the highest-risk area because they combine filesystem mutations, target bookkeeping, and platform-specific symlink behavior.
- The planning files themselves must stay short and current; they should not become historical archives again.
