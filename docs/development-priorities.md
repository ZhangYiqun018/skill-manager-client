# Skill Manager Development Priorities

> Version: `0.1`
> Date: `2026-04-04`
> Status: `working priority list`
> Companion doc:
> - `docs/product-blueprint.md`

## 1. Prioritization Principles

Development order should follow product closure, not visual polish.

Priority should go to work that:

- completes the management loop
- reduces model debt
- improves install reliability
- turns temporary frontend projections into backend-owned product state

Work should be deprioritized when it:

- adds breadth without deepening the skill workflow
- assumes weak identity rules
- creates UI chrome before real actions exist

## 2. Current Assessment

Current strengths:

- desktop shell and bilingual UI exist
- local scanning and indexed cache exist
- managed store adoption exists
- discovery review is materially better than raw scan output

Current gaps:

- install sync and repair are not yet the mainline workflow
- skill detail is still too shallow
- dedupe, provenance, and variant modeling are still mostly frontend projections
- local import and `skills.sh` are not yet integrated into the same review pipeline

## 3. Priority Roadmap

## Phase 1 — Complete The Core Management Loop

Status: `highest priority`

Goal:

Turn the current product from a discovery-and-adoption tool into a real skill manager.

### 3.1 Skill Detail Upgrade

Build a full managed-skill detail surface with:

- `Overview`
- `Content`
- `Files`
- `Installs`
- `Origins`

Why now:

- this is the fastest path from "list of things" to "managed object"
- PromptHub validates this pattern strongly
- install actions need a natural home

### 3.2 Install Target Actions

Implement real actions for:

- install to global Codex
- install to project Codex
- install to global Claude Code
- install to project Claude Code
- remove install
- relink
- repair

Why now:

- this closes the core product promise
- without this, the managed library is still passive

### 3.3 Installs Health Model

Add backend-owned install state and health validation:

- healthy symlink
- copied install
- broken symlink
- drifted install
- missing target

Why now:

- the `Targets` page only matters if the health model is real

## Phase 2 — Move Identity And Review Logic Into Rust Core

Status: `next after Phase 1 starts landing`

Goal:

Replace shallow frontend grouping with durable backend product state.

### 3.4 Discovery Model Refactor

Introduce persisted support for:

- `DiscoveryOccurrence`
- `ExactDuplicateGroup`
- `SkillFamily`
- `SkillVariant`
- `ManagedSkillOrigin`

Why now:

- current review UX is already richer than the backend model
- this is the biggest correctness debt in the system

### 3.5 Provenance-Aware Adoption

Adoption should support:

- exact duplicate merge into existing managed item
- new variant creation under an existing family
- provenance retention for every adopted source

Why now:

- otherwise the library will accumulate ambiguous duplicates

### 3.6 Variant Labeling

Add:

- generated default labels
- later rename support
- family-level browsing

Why now:

- variant handling is already implied by the product and UI

## Phase 3 — Bring All Sources Into One Pipeline

Status: `after core management and identity are stable`

Goal:

Make all major sources flow through the same candidate review model.

### 3.7 Import Folder

Implement local folder import with:

- folder validation
- review preview
- adopt only
- adopt and install

### 3.8 `skills.sh` Provider

Implement:

- search
- result preview
- download into candidate staging
- adopt into managed library

Why this phase comes later:

- remote/source breadth should sit on top of a solid library and install model

## Phase 4 — Improve Operability And Advanced Workflows

Status: `later`

Goal:

Make the manager reliable for larger libraries and more complex local setups.

### 3.9 Settings Expansion

Add:

- install strategy selector
- per-target path overrides
- extra scan roots
- cache controls

### 3.10 Bulk Operations

Add:

- bulk install
- bulk relink
- bulk repair
- family-level bulk actions

### 3.11 Deep Variant Tooling

Add:

- variant diff
- compare content/files
- variant rename and notes

## Phase 5 — Platform And Distribution Expansion

Status: `after the Codex/Claude workflow is strong`

Goal:

Expand breadth only after the main model is solid.

Possible additions:

- more agent targets
- a dedicated `Marketplace` surface
- export/import bundles
- history and rollback

## 4. Immediate Next Build Order

If work starts now, the recommended implementation order is:

1. Build `Skill Detail` into a full managed-object page
2. Add install actions and live target state to the detail view
3. Implement backend install records plus sync/remove/repair
4. Move dedupe and provenance from frontend projection into Rust core
5. Add variant-aware adoption semantics
6. Add `Import Folder`
7. Add `skills.sh` search and download

## 5. Deferred On Purpose

Do not prioritize these yet:

- prompt management
- sync/backup systems
- multi-user collaboration
- browser-only web app
- expansion to many additional platforms before Codex/Claude is stable
- cosmetic redesigns that are not tied to a workflow improvement

## 6. Definition Of A Strong Next Release

The next meaningful product release should satisfy all of these:

- a user can review discovered skills and adopt them into the library
- a user can open one managed skill and see content, files, origins, and install state
- a user can install that skill into one or more targets
- the app can detect and repair broken installs
- the product model preserves exact duplicates, variants, and origins correctly

If those conditions are met, the product will have crossed from "promising prototype" into "credible manager."
