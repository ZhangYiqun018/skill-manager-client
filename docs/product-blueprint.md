# Skill Manager Product Blueprint

> Version: `0.1`
> Date: `2026-04-04`
> Status: `working blueprint`
> Based on:
> - `docs/skill-manager-prd.md`
> - `docs/ui-design-spec.md`
> - `docs/prompt-hub-research.md`

## 1. Product Positioning

Skill Manager should become a focused desktop-first skill library and install orchestrator.

It should not be a generic AI asset manager. It should not manage prompts, tests, sync systems, or unrelated content types.

It should do four things well:

1. Discover skills from multiple sources
2. Review and adopt them into one canonical managed library
3. Install them into agent targets through symlinks by default
4. Detect and repair broken or drifted installs

The core product loop is:

```text
Discover -> Review -> Adopt -> Install -> Sync -> Repair
```

## 2. Product Thesis

Most existing skill setups are fragmented across:

- Codex global paths
- Claude Code global paths
- project-level skill folders
- arbitrary local folders
- remote registries such as `skills.sh`

The product should unify these scattered sources under one model:

- discovery does not equal import
- import does not equal install
- install does not equal ownership

The manager should own a canonical library first, then project and global tool directories become install targets.

## 3. What To Borrow From PromptHub

PromptHub is a strong reference for product structure and workflow, but not for identity modeling.

We should borrow these ideas:

- a stable desktop shell instead of a dashboard
- object-centric skill detail pages
- installation as a first-class workflow
- settings for install strategy, path overrides, and extra scan roots
- review-first discovery instead of scan-and-auto-import

We should not borrow these ideas:

- name-based uniqueness
- file-only installation semantics
- path-only scan dedupe
- treating platform status as primarily name-driven

This product should deliberately diverge by building stronger identity and provenance support.

## 4. Core Product Principles

- Desktop-first: local filesystem operations are part of the product, not an implementation detail.
- Library-first: managed skills must live in one canonical store.
- Whole-directory ownership: the unit of management and installation is the full skill directory, not only `SKILL.md`.
- Review before mutation: scans and imports produce candidates first.
- Install-first UX: install state and actions should be reachable from the selected skill.
- Fast launch: cached index first, refresh later.
- Explicit heavy operations: full-disk scan must be user-triggered and confirmed.
- Provenance-aware: the product must remember where a managed skill came from.

## 5. Core Object Model

The backend and UI should converge on these first-class concepts.

| Object | Meaning | Notes |
| --- | --- | --- |
| `DiscoveryOccurrence` | One skill discovered at one concrete path or remote entry | Raw discovery unit |
| `ExactDuplicateGroup` | Multiple occurrences with identical content | Auto-collapsible during review |
| `SkillFamily` | Same logical skill name or slug family | Review grouping, not canonical identity |
| `SkillVariant` | Same family, different content | Must coexist safely |
| `ManagedSkill` | Canonical managed item in the library store | Main object users manage |
| `ManagedSkillOrigin` | Provenance record attached to a managed skill | Disk path, import path, remote URL, scan run |
| `InstallTarget` | One install destination for an agent/scope | Global or project-level |
| `InstallRecord` | One managed skill installed into one target | Carries health and sync state |

### 5.1 Identity Rules

- `name` is not a unique key
- `family_key` is for grouping, not final identity
- `content_hash` is the primary signal for exact duplicates
- `managed_skill_id` is the canonical internal identity
- variants within one family must be allowed to coexist

### 5.2 Canonical Store

The managed library should live under an app-owned path, for example:

- `~/.skill-manager/store/`

Each canonical skill should preserve the full directory:

- `SKILL.md`
- scripts
- assets
- templates
- metadata files

## 6. Product Surfaces

Long-term top-level information architecture:

- `Library`
- `Discover`
- `Installs`
- `Settings`
- `Marketplace` later, if `skills.sh` becomes a dedicated surface

### 6.1 Shell Structure

The desktop shell should evolve toward a stable productivity layout:

- left: navigation and durable filters
- center: list or review queue
- right: sticky detail panel on medium layouts
- full detail workspace for deep object editing and install management

The current top-tab design is acceptable for the near term, but the product should be designed so it can grow into a denser three-pane layout without changing the core workflow.

## 7. Page Blueprints

## 7.1 Library

Purpose:

- browse managed skills
- inspect metadata, content, files, installs, and origins
- start install, uninstall, relink, and repair actions

Primary structure:

- search
- filters
- managed skill list
- selected-skill detail

Required sections in `Skill Detail`:

- `Overview`
  - name
  - description
  - family
  - variant label
  - tags
  - compatible agents
  - last adopted / last updated
- `Content`
  - rendered or raw `SKILL.md`
- `Files`
  - file tree for the canonical directory
- `Installs`
  - target-by-target install state
  - install / remove / relink / repair
- `Origins`
  - all provenance records
  - original paths or remote source metadata

Library is the product center of gravity. It should feel like a real managed object library, not a scan result page.

## 7.2 Discover

Purpose:

- bring new skills into the system
- review before mutation
- collapse obvious duplicates
- isolate same-family variants for review

Primary inputs:

- `Scan Disk`
- `Import Folder`
- `Search skills.sh`

Primary review layers:

- scan summary
- exact duplicate queue
- variant review queue
- ready-to-adopt queue

Key rules:

- full-disk scan is always manual
- heavy scan actions require explicit confirmation
- scan results are candidates, not library items
- exact duplicates should collapse automatically to one recommended representative
- same-family variants should remain separate unless the user merges them intentionally

## 7.3 Installs

Purpose:

- show the live health of every install target
- act as the control center for batch sync and repair

Primary structure:

- global targets
- project targets
- status rows
- sync all / repair all

Key states:

- not installed
- symlink healthy
- copied
- broken symlink
- drifted
- target missing

This page complements the skill detail page. High-frequency install actions should also be available from the selected skill.

## 7.4 Settings

Purpose:

- configure how the product behaves
- not to carry mainline discovery or install workflows

Required settings groups:

- language
- install strategy
  - symlink by default
  - copy fallback when symlink is unavailable
- path overrides
  - Codex global
  - Claude Code global
  - future agent targets
- extra scan roots
- cache and index controls

## 8. Core Workflows

## 8.1 Discover -> Adopt

1. User starts a full-disk scan or imports a folder or searches remote
2. System produces `DiscoveryOccurrence` records
3. System groups exact duplicates and same-family variants
4. User reviews grouped candidates
5. User adopts selected candidates into the managed library
6. Adopted items become `ManagedSkill` records and canonical directories
7. Original source remains untouched unless the user later installs or replaces through an explicit target action

## 8.2 Managed Skill -> Install

1. User opens a managed skill
2. User views install status across targets
3. User chooses one or more targets
4. System creates or updates install records
5. Preferred install strategy is symlink
6. Copy is used only as an explicit fallback or compatibility mode

## 8.3 Repair

1. System detects broken or drifted install records
2. Health badge and target views expose the problem
3. User can repair a single install or repair all
4. Repair recreates the expected symlink or re-copies the directory depending on target settings

## 8.4 Variant Management

1. Same-family different-content candidates are treated as variants
2. System generates default variant labels
3. User can later rename variant labels
4. Library preserves multiple variants under one family
5. Install actions always operate on one concrete managed variant

## 9. System Architecture Direction

## 9.1 Rust Core Responsibilities

The shared Rust core should own:

- scan root building
- discovery execution
- candidate fingerprinting
- exact duplicate collapsing
- family / variant modeling
- canonical store management
- install target modeling
- symlink / copy installation
- health validation
- repair logic
- SQLite persistence

## 9.2 Tauri Layer Responsibilities

- secure command surface
- file dialogs
- reveal-in-finder / open path actions
- long-running task orchestration and progress events
- path safety checks

## 9.3 Frontend Responsibilities

- list and detail rendering
- filters and review UX
- multi-select and batch actions
- install target selection UX
- localized copy

Complex product state should migrate toward the Rust core instead of remaining a frontend-only projection.

## 10. Deliberate Architectural Decisions

- The app should not rewrite arbitrary discovered paths during adoption.
- The app should not treat `SKILL.md` alone as the managed object.
- The app should not assume one skill name equals one canonical skill.
- The app should not make full-disk scanning a startup side effect.
- The app should prefer a reusable install record model over ad hoc directory inspection in the UI.

## 11. Success Criteria For The Next Product Milestone

The next milestone should make the product feel like a real manager rather than a scanner.

It should include:

- a complete `Skill Detail` experience
- install actions inside the skill detail view
- real target sync, uninstall, relink, and repair
- backend-owned discovery review data, not only frontend projection
- explicit origin tracking for adopted skills

If these are present, the product will have a strong functional core even before `skills.sh`, advanced variant naming, and expanded platform support are complete.
