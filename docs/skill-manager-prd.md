# Skill Manager PRD

## Document Status

- Version: `0.1`
- Date: `2026-04-03`
- Product stage: `Definition / pre-MVP`
- Intended audience:
  - UI/UX designer
  - product / engineering
  - future contributors

## 1. Product Summary

Skill Manager is a desktop-first and CLI-capable tool for discovering, importing, managing, versioning, and installing AI agent skills across different sources and targets.

The product should support three kinds of skill sources:

1. Full-disk discovery
2. Local manual import
3. Remote download from `skills.sh`

The product should manage skills through a canonical managed library, then install them into Codex / Claude Code global or project targets by symlink.

## 2. Problem Statement

Today, skills are scattered across:

- `~/.codex/skills`
- `~/.claude/skills`
- project-level `.agents/skills`
- project-level `.claude/skills`
- arbitrary folders on disk
- remote registries such as `skills.sh`

This creates several product problems:

- users cannot see all skills in one place
- project-level and global-level skills are hard to distinguish
- remote and local skills are not managed under one model
- the same skill may exist in multiple copies
- there is no unified install, sync, or repair workflow
- full-disk scanning is expensive and should not block app startup

## 3. Product Goals

### 3.1 Primary Goals

- Provide one unified inventory for all discoverable and managed skills.
- Support multiple skill sources under one consistent model.
- Move managed skills into one canonical store controlled by Skill Manager.
- Install skills into agent targets through symlinks by default.
- Support project-level and global-level installation explicitly.
- Make startup fast by reading cached index data first.
- Support both desktop and CLI workflows through shared core logic.

### 3.2 Secondary Goals

- Support bilingual UI: English by default, switchable to Chinese.
- Preserve source provenance and future version history.
- Make conflicts and broken links visible and repairable.

### 3.3 Non-Goals for MVP

- Full browser-only web app
- collaborative multi-user sharing
- cloud sync
- automatic background full-disk rescans on every launch
- managing every arbitrary `SKILL.md` file on disk regardless of install layout

## 4. Product Principles

- Desktop-first: local filesystem control is a core requirement.
- Source-aware: discovery, import, and install are separate actions.
- Canonical ownership: managed skills live in one managed store.
- Link-first: installation uses symlinks by default.
- Fast startup: cached index first, refresh later.
- Explicit destructive actions: no silent rewrites of user directories.

## 5. Target Users

### 5.1 Individual AI power users

- use Codex and/or Claude Code locally
- want one place to inspect and manage all skills
- want project-specific skill setups

### 5.2 Prompt / workflow engineers

- create custom skills
- want repeatable local install and version behavior
- need to compare or pin skill variants

### 5.3 Developers working across many repos

- want project-level skill visibility
- need quick switching and repair of project install targets

## 6. Core Product Model

Skill Manager should treat skills with four distinct concepts:

### 6.1 Candidate

A skill discovered from disk or remote search that is not yet fully managed by Skill Manager.

### 6.2 Managed Library Item

A skill directory copied or downloaded into the canonical Skill Manager store and tracked by metadata.

### 6.3 Install Target

A destination where a skill is installed for an agent.

Examples:

- `~/.codex/skills/<slug>`
- `~/.claude/skills/<slug>`
- `<project>/.agents/skills/<slug>`
- `<project>/.claude/skills/<slug>`

### 6.4 Source

Where the skill originated:

- full-disk discovery
- local import
- `skills.sh`
- future custom git source

## 7. Canonical Store Strategy

Skill Manager should manage whole skill directories, not only `SKILL.md`.

The canonical managed store should live under a dedicated app-controlled path, for example:

- global store: `~/.skill-manager/store/`

Future optional extension:

- project-local managed store when users explicitly request project-owned storage

The canonical store must include the whole skill directory because a skill may include:

- `SKILL.md`
- scripts
- templates
- assets
- license files

## 8. Source Requirements

## 8.1 Full-Disk Discovery

### Intent

Let users discover existing skills already present on disk.

### Requirements

- The app must support a user-triggered full-disk discovery flow.
- Full-disk discovery must not run automatically on every launch.
- First launch may show an onboarding CTA such as `Scan Disk`.
- Discovery results must be stored in a local index.
- The app must load cached discovery results on startup if available.
- The app should refresh stale cache in the background, not block the UI.
- Full-disk discovery should scan only supported skill layouts, not every arbitrary `SKILL.md`.
- Discovery results should preserve:
  - path
  - inferred agent
  - inferred scope
  - project root when applicable
  - source type

### Current design assumption

Supported discovery layouts initially:

- `~/.codex/skills/*`
- `~/.claude/skills/*`
- `**/.agents/skills/*`
- `**/.claude/skills/*`

### UI expectations

- show full-disk discovery as an explicit action
- show scan progress / last scan timestamp / result count
- allow rerun on demand

## 8.2 Local Import

### Intent

Allow users to bring external skills under management even when they are not already in supported locations.

### Requirements

- The app must support importing a local folder as a skill.
- The app should support importing a packaged skill if that package format is later defined.
- The CLI must support importing from a local path.
- The import flow must validate that the selected folder is a skill directory.
- Validation should require at minimum:
  - `SKILL.md` exists
- Validation may later expand to:
  - optional metadata parsing
  - script / asset checks

### Import outcomes

Users should be able to choose:

- import into managed library only
- import and immediately install to one or more targets

### Safety

- Import should copy into the managed store by default.
- The app must not delete the original source folder automatically.
- The original path should be recorded as provenance metadata.

## 8.3 Remote Download from `skills.sh`

### Intent

Allow users to search and download public skills from a remote registry.

### Requirements

- The app must support searching `skills.sh`.
- The app must support viewing search results with metadata needed for selection.
- The app must support downloading a selected skill into the managed store.
- The app must record source metadata:
  - provider
  - repository / identifier
  - version, tag, commit, or content hash when available
- The app should support install-at-download time.

### Non-MVP extension

- update available
- upgrade / rollback
- diff between installed and latest

## 9. Managed Library Requirements

### Intent

Provide one central library view for all managed skills.

### Requirements

- The app must have a managed library section or filter.
- Each managed item must store:
  - stable internal id
  - slug
  - display name
  - description
  - provenance
  - canonical path
  - install targets
  - compatibility info
  - created / imported time
- The library must allow users to:
  - inspect metadata
  - reveal files
  - see source
  - see install targets

### Adopt flow

For a skill found by full-disk discovery, the app should support:

- `Adopt into Library`

This means:

1. copy the skill directory into the canonical store
2. register it as managed
3. optionally replace install targets with symlinks to the canonical copy

### Important rule

The product must not silently rewrite arbitrary discovered folders into symlinks. Adoption must be explicit.

## 10. Install and Linking Requirements

### Intent

Install managed skills into target agent directories in a consistent way.

### Requirements

- Installation should use symlinks by default.
- The app must support installing to:
  - Codex global
  - Claude Code global
  - Codex project
  - Claude Code project
- The app must support multi-target installation for one skill.
- The app must support uninstalling from one target without deleting the library item.
- The app must detect broken symlinks.
- The app must support `Repair Links`.

### Sync behavior

The product should support a `Sync Links` action that ensures target directories match desired state.

Desired state includes:

- which skills should be installed
- where they should be installed
- whether each target currently exists and points to the canonical store

### Fallbacks

- Symlink is default.
- Copy mode may exist later as an explicit fallback for platform-specific constraints.
- The UI must make the install mode visible if fallback is used.

## 11. Version and Provenance Requirements

### MVP

- Record source provider and original identifier.
- Record content hash or equivalent fingerprint.
- Record imported / downloaded time.

### Post-MVP

- pin to tag / commit / release
- update available
- rollback to previous managed revision
- compare versions

## 12. Search, Filter, and Browse Requirements

### Requirements

- Users must be able to search by:
  - skill name
  - description
  - source
- Users must be able to filter by:
  - agent
  - scope
  - source type
  - managed vs candidate
  - installed vs not installed
- Users must be able to inspect:
  - `SKILL.md` preview
  - install path
  - source root
  - project root
  - warnings / health state

## 13. Project-Aware Requirements

Project-level skill management is a core use case.

### Requirements

- The product must clearly distinguish:
  - global skills
  - project skills
- The product should preserve detected project root for project-scoped skills.
- The product should later support a project-oriented view, for example:
  - discovered projects
  - recent projects
  - project install targets

## 14. Settings and Preferences

### MVP requirements

- language switch: English default, Chinese optional
- manual refresh actions
- index / cache visibility

### Post-MVP requirements

- managed store location
- discovery scope settings
- link mode fallback
- default install targets
- default editor / opener

## 15. CLI Requirements

The CLI should share the same core model as the desktop app.

### MVP CLI capabilities

- scan local known roots
- later load / refresh cache
- import local skill
- adopt discovered skill
- install / uninstall / sync links

### CLI design goal

Anything critical in desktop should eventually have a scriptable CLI equivalent.

## 16. Data Model Requirements

At minimum, the product should have persistent records for:

### 16.1 Skill item

- id
- slug
- display name
- description
- canonical path
- source type
- source identifier
- content hash
- compatible agent(s)
- created / updated timestamps

### 16.2 Discovery record

- discovered path
- inferred project root
- inferred scope
- last seen time
- indexed time
- health state

### 16.3 Install target record

- target type
- target path
- install mode
- expected canonical source
- actual link target
- last sync time
- health state

## 17. Non-Functional Requirements

### Performance

- Startup should render from cache without full-disk blocking.
- Full-disk discovery must be explicit and asynchronous.
- Search and local filtering should feel immediate for typical local dataset sizes.

### Reliability

- Broken links and missing paths must be detectable.
- Failed imports and downloads must leave the library in a consistent state.

### Safety

- No silent deletion of user-owned skill directories.
- No silent replacement of arbitrary discovered folders with symlinks.
- Destructive actions require confirmation.

### Portability

- macOS is the first-class target today.
- cross-platform behavior should remain possible through Rust core and Tauri shell.

## 18. Information Architecture for UI Design

The product model implies at least these top-level areas:

### 18.1 Library

- managed skills
- metadata
- install targets
- health

### 18.2 Discover

- full-disk scan
- local import
- `skills.sh` search and download
- candidates list

### 18.3 Install Targets

- global targets
- project targets
- link health
- sync / repair actions

### 18.4 Settings

- language
- cache / scan behavior
- future storage preferences

## 19. Key User Flows

### Flow A: First-time user with existing local skills

1. open app
2. see onboarding CTA to scan disk
3. run full-disk discovery
4. inspect discovered candidates
5. adopt selected skills into managed library
6. sync links to desired targets

### Flow B: User imports a custom skill folder

1. click `Import Folder`
2. select local folder
3. validate folder as skill
4. import to library
5. optionally install to chosen targets

### Flow C: User downloads from `skills.sh`

1. search registry
2. open result details
3. download into library
4. choose install targets
5. sync links

### Flow D: User repairs environment drift

1. open install targets / health view
2. see broken or mismatched links
3. click `Repair Links`
4. app rewrites targets to expected state

## 20. MVP Scope

The next meaningful MVP should include:

1. Full-disk discovery as a manual action
2. Local import from folder
3. `skills.sh` search and download
4. Canonical managed store
5. Adopt-to-library flow
6. Install to Codex / Claude global and project targets
7. Symlink-based sync and repair
8. Basic source and install metadata

## 21. Post-MVP Scope

- version pinning
- update detection
- rollback
- custom git providers
- batch operations
- project-centric dashboard
- packaged skill import/export

## 22. Acceptance Criteria for MVP

### Discovery

- User can trigger full-disk discovery manually.
- App startup does not require a new full-disk scan.
- Discovered results persist across launches.

### Import / Download

- User can import a local skill folder into the managed library.
- User can download a skill from `skills.sh` into the managed library.

### Library

- Managed skills are visible in one unified list.
- Each managed skill shows source, canonical path, and install targets.

### Install / Sync

- User can install one managed skill to at least one target.
- Installation uses symlink by default.
- Broken links can be detected and repaired.

### UX

- UI supports English and Chinese.
- Primary flows do not require terminal use.

## 23. Open Questions

- Should the managed store be global-only in MVP, or allow optional project-local ownership?
- Should local import support zip packages in MVP or only folders?
- What exact metadata from `skills.sh` should be shown before download?
- How should conflicts be resolved when two sources provide the same slug?
- Should install mode fallback to copy automatically, or only with explicit user confirmation?

## 24. Recommendation to UI Designer

Design around these states, not only around static lists:

- empty state
- first-run onboarding
- scanning state
- candidate review state
- managed library state
- install target health state
- broken-link repair state
- import validation failure
- download / install progress

The core mental model for the UI should be:

`Discover -> Adopt -> Install -> Sync -> Repair`
