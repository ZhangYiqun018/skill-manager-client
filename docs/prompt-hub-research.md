# PromptHub Research

## Scope

This document studies PromptHub's `Skill` subsystem only.

Excluded on purpose:

- Prompt authoring
- AI testing
- WebDAV sync
- general content management outside skills

The goal is to understand how PromptHub actually structures skill discovery, library management, installation, and desktop UX, then decide which patterns should shape this project.

## What PromptHub Actually Is

PromptHub is not a lightweight skill browser. It is a desktop asset manager built as:

- Electron main process for filesystem, SQLite, IPC, and installation logic
- React renderer for the UI
- Zustand stores for client state
- shared type/constants modules across main and renderer
- local CLI and backup/sync tooling around the same local data

At the code level, the relevant structure is:

- `src/main/`
  - database
  - IPC handlers
  - `services/skill-installer.ts`
- `src/preload/`
  - typed bridge into skill/file/settings APIs
- `src/renderer/`
  - layout shell
  - skill manager components
  - Zustand stores
  - skill filter/platform sync services
- `src/shared/`
  - `types/skill.ts`
  - `constants/platforms.ts`

This matters because the product feels "complete" partly due to actual architectural separation, not just UI polish.

## Key Code-Level Findings

## 1. It treats Skill as a first-class library object

PromptHub stores skills in SQLite and gives them a rich object model:

- `id`
- `name`
- `description`
- `content` / `instructions`
- `protocol_type`
- `version`
- `author`
- `tags`
- `source_url`
- `local_repo_path`
- registry/store metadata
- version history metadata

Relevant files:

- `src/shared/types/skill.ts`
- `src/main/database/skill.ts`

This is the right mental model to borrow: a skill is not just `SKILL.md`, but a managed object with source, files, metadata, installability, and history.

## 2. It splits skill work into three workspaces

PromptHub's skill state distinguishes:

- `my-skills`
- `distribution`
- `store`

Relevant files:

- `src/renderer/stores/skill.store.ts`
- `src/renderer/services/skill-filter.ts`

This is an important product choice. It avoids mixing:

- what is already in your library
- what is deployed to platforms
- what can be imported from remote sources

This separation is useful for us and maps well to:

- `Library`
- `Installs`
- `Marketplace` or `Sources`

## 3. Its detail experience is object-centric, not preview-centric

PromptHub has a full-width `SkillFullDetailPage` with tabs:

- `preview`
- `code`
- `files`

and a dedicated platform-install side panel.

Relevant files:

- `src/renderer/components/skill/SkillFullDetailPage.tsx`
- `src/renderer/components/skill/SkillPlatformPanel.tsx`
- `src/renderer/components/skill/SkillFileEditor.tsx`

This is one of its strongest product decisions.

The detail view is where users:

- inspect the skill
- read/edit content
- inspect files
- install/uninstall to platforms
- export
- view version history

This is much stronger than a list-plus-preview UI.

## 4. Installation is treated as a primary workflow

PromptHub keeps installation close to the selected skill.

It supports:

- copy install
- symlink install
- per-platform selection
- install status detection
- uninstall
- batch deploy

Relevant files:

- `src/renderer/components/skill/use-skill-platform.ts`
- `src/renderer/components/skill/SkillPlatformPanel.tsx`
- `src/renderer/services/skill-platform-sync.ts`
- `src/main/ipc/skill/platform-handlers.ts`
- `src/main/services/skill-installer.ts`

This is the most important product lesson for us:

installation should not be a side page only. It should be a core part of the skill object lifecycle.

## 5. It has a canonical local library, then installs outward

PromptHub writes imported or installed skill content into its own local repo directory first, then copies or symlinks outward to tool-specific skill directories.

Relevant files:

- `src/main/services/skill-installer.ts`
  - `saveContentToLocalRepo`
  - `installSkillMd`
  - `installSkillMdSymlink`

This is conceptually very close to our direction:

- managed store first
- install targets second

That part is worth borrowing directly.

## 6. It exposes scan paths and platform path overrides in settings

PromptHub makes these configurable:

- install method: `symlink` or `copy`
- per-platform target path overrides
- extra skill scan paths

Relevant files:

- `src/renderer/components/settings/SkillSettings.tsx`
- `src/renderer/stores/settings.store.ts`
- `src/main/services/skill-installer-utils.ts`

This is good product design because users can adapt the manager to non-default local setups without changing code.

## 7. Its local scan flow is preview-first

PromptHub scans local skills into a preview modal before import.

It:

- scans default platform skill paths plus optional user paths
- parses `SKILL.md`
- shows a preview list
- lets the user selectively import
- allows optional user tags at import time

Relevant files:

- `src/main/services/skill-installer.ts`
  - `scanLocalPreview`
- `src/renderer/components/skill/SkillScanPreview.tsx`
- `src/renderer/stores/skill.store.ts`

This is also worth borrowing:

- scan should not directly mutate the library
- review should sit between discovery and adoption

## Where PromptHub Is Strong

## 1. The product is organized around real workflows

Its maturity comes from real loops:

- discover
- import
- inspect
- install
- uninstall
- export
- restore version

not from isolated screens.

## 2. The shell is stable and high-density

It uses a classic desktop structure:

- left navigation/filter tree
- middle list/grid
- full detail when selected

That keeps context stable and scales better than dashboard-style layouts.

## 3. Installation status is visible early

PromptHub surfaces platform installation signals in list rows and in detail views.

This reduces the gap between "I have a skill" and "this skill is usable in my tools".

## 4. It owns filesystem integration

PromptHub does not treat filesystem behavior as an afterthought.

It has explicit code for:

- target path resolution
- symlink creation
- content export
- local repo copy
- platform detection

That is the correct level for a desktop skill manager.

## Where PromptHub Is Weak for Our Use Case

These are important because they show what we should not copy.

## 1. It is effectively name-unique

PromptHub's database logic checks `getByName()` before create/update and treats duplicate names as collisions.

Relevant file:

- `src/main/database/skill.ts`

This means PromptHub is not a good model for managing:

- same-name skills from different origins
- same-name but different-content variants
- family/version/provenance relationships

For us, this is a core product requirement, so we should not copy this part.

## 2. Its scan dedupe is path-based, not content-family based

`scanLocalPreview()` deduplicates by `skillFolderPath`.

That avoids false same-name collisions across tools, but it still does not produce:

- exact duplicate groups
- families
- variants
- provenance-aware canonical merge candidates

Relevant file:

- `src/main/services/skill-installer.ts`

For our project, this is not enough.

## 3. Installation status is name-driven

Several install/uninstall/status flows use `skill.name` as the key when talking to platform targets.

Relevant files:

- `src/renderer/components/skill/use-skill-platform.ts`
- `src/main/services/skill-installer.ts`

This is pragmatic, but it becomes fragile if:

- two skills share the same name
- variants need to coexist
- slugs differ from titles

We should use stable internal identifiers plus install records, not only names.

## 4. It installs `SKILL.md`, not the whole skill directory model

PromptHub does keep a local repo path and supports multi-file editing, but the install pipeline shown in the skill platform service is still mainly centered around `SKILL.md`.

Relevant files:

- `src/main/services/skill-installer.ts`
- `src/renderer/services/skill-platform-sync.ts`

This is sufficient for many ecosystems, but weaker than our desired model:

- canonical whole skill directory
- symlink whole directory into targets
- preserve scripts/templates/assets

For us, the directory, not only the file, should be the installation unit.

## 5. Detection of installed platforms is heuristic

PromptHub decides whether a platform is installed by checking whether the parent of its skill directory exists.

Relevant file:

- `src/main/services/skill-installer.ts`
  - `detectInstalledPlatforms`

This is simple and user-friendly, but not necessarily authoritative.

For our project, this may be acceptable as a fallback, but not as the only health signal.

## What We Should Borrow

## 1. Product structure

We should move toward:

- `Library`
- `Discover`
- `Installs`
- `Settings`

with `Marketplace` added later if needed.

This is better than treating everything as one scan/results page.

## 2. Object-centric detail page

We should promote `Skill Detail` into a full object page with tabs:

- `Overview`
- `Content`
- `Files`
- `Installs`
- `Origins`

PromptHub demonstrates that this is the right desktop pattern.

## 3. Installation as a first-class action

Installation actions should live inside skill detail, not only in a separate target inventory page.

That means:

- install to global Codex
- install to project Codex
- install to global Claude Code
- install to project Claude Code
- remove / relink / repair

all reachable from the selected skill.

## 4. Settings for target path overrides and install method

We should add:

- default install strategy
  - symlink
  - copy fallback
- per-agent path overrides
- extra scan roots

PromptHub's settings implementation proves these are not niche options.

## 5. Review-first discovery

PromptHub's scan-preview flow validates our current direction:

- scan
- review
- adopt

not:

- scan
- auto-import everything

## What We Should Not Borrow

## 1. Name-based uniqueness

We should not make `name` the library identity.

Instead we need:

- `family_key`
- `variant_key`
- `content_hash`
- `managed_item_id`

This is the core difference between our product and PromptHub.

## 2. File-only install semantics

We should not reduce a skill to `SKILL.md` during installation.

Our installation unit should be the whole skill directory.

## 3. Overly broad product scope

PromptHub carries:

- prompt management
- AI testing
- sync/backup
- multi-resource handling

We should stay narrower and make the skill flow deeper.

## Proposed Product Direction For Our Project

## 1. Core product positioning

PromptHub is a broader local AI asset manager.

We should instead become:

**a focused skill library and install orchestrator**

for:

- discovery
- dedupe/review
- canonical storage
- multi-target installation
- health / repair

## 2. Core data model

The backend should eventually distinguish:

- `DiscoveryOccurrence`
- `ExactDuplicateGroup`
- `SkillFamily`
- `SkillVariant`
- `ManagedSkill`
- `ManagedSkillOrigin`
- `InstallTarget`
- `InstallRecord`

This is the main place where we should intentionally diverge from PromptHub.

## 3. UI structure

The long-term desktop structure should be:

- left: navigation + filters
- center: library/discovery/install list
- right: sticky detail panel on medium views, full detail page on selected-object mode

For richer flows, selected skills should open into a full detail workspace rather than stay trapped in a compact preview panel.

## 4. Discovery workflow

Our ideal discovery flow should be:

- `Scan disk`
- `Import folder`
- `Search skills.sh`
- `Review exact duplicates`
- `Review variants`
- `Adopt selected into store`

Unlike PromptHub, our review layer should be content-aware and provenance-aware.

## 5. Installation workflow

Our install flow should be:

- choose managed skill
- inspect status across targets
- install whole directory into selected targets
- prefer symlink
- fall back to copy only when necessary
- expose repair/relink/remove

This keeps PromptHub's strong install-first mindset while using a stronger directory model.

## Recommended Build Sequence

## Phase 1

- complete `Skill Detail`
- add `Installs` tab inside detail
- implement real `sync / remove / repair`

## Phase 2

- move dedupe/provenance from frontend projection into Rust core
- support families + variants + origins

## Phase 3

- add `Import folder`
- add `skills.sh` remote source
- unify all sources under one candidate review pipeline

## Phase 4

- expand platform support only after Codex + Claude Code are solid

## Final Recommendation

PromptHub is a strong reference for:

- information architecture
- object-centric detail views
- install-first workflow
- settings-driven platform integration
- local library + outward distribution

PromptHub is a weak reference for:

- dedupe semantics
- variant modeling
- provenance tracking
- whole-directory installation identity

So the right strategy is:

- borrow PromptHub's workflow framing and desktop interaction patterns
- do **not** borrow its name-centric identity model
- build a stronger skill-family / variant / provenance system than PromptHub has

## Source Files Reviewed

- `README.md`
- `package.json`
- `src/shared/types/skill.ts`
- `src/shared/constants/platforms.ts`
- `src/main/database/skill.ts`
- `src/main/database/schema.ts`
- `src/main/ipc/skill.ipc.ts`
- `src/main/ipc/skill/crud-handlers.ts`
- `src/main/ipc/skill/platform-handlers.ts`
- `src/main/services/skill-installer.ts`
- `src/main/services/skill-installer-utils.ts`
- `src/renderer/App.tsx`
- `src/renderer/components/layout/MainContent.tsx`
- `src/renderer/components/layout/Sidebar.tsx`
- `src/renderer/components/layout/TopBar.tsx`
- `src/renderer/components/skill/SkillManager.tsx`
- `src/renderer/components/skill/SkillListView.tsx`
- `src/renderer/components/skill/SkillDetailView.tsx`
- `src/renderer/components/skill/SkillFullDetailPage.tsx`
- `src/renderer/components/skill/SkillPlatformPanel.tsx`
- `src/renderer/components/skill/SkillScanPreview.tsx`
- `src/renderer/components/skill/SkillStore.tsx`
- `src/renderer/components/skill/use-skill-platform.ts`
- `src/renderer/services/skill-filter.ts`
- `src/renderer/services/skill-platform-sync.ts`
- `src/renderer/stores/settings.store.ts`
- `src/renderer/stores/skill.store.ts`
