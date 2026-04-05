# Findings

## What Exists Now

- Desktop app architecture:
  - Rust core for indexing, adoption, install, repair
  - Tauri command layer
  - React desktop client

- Main top-level pages:
  - `Library`
  - `Discover`
  - `Targets`
  - `Settings`
  - `Guide`

- Core flows currently implemented:
  - full-disk discovery with explicit confirmation
  - local folder import
  - `skills.sh` registry search and adoption
  - managed library with family / variant grouping
  - variant rename
  - promote variant as default
  - file/content/origin/install detail tabs
  - install / remove / repair per skill
  - target inventory sync / repair
  - custom install targets
  - custom install modal from library surfaces

## Current Product Shape

- The app is no longer a simple scanner.
- It is now a combined:
  - discovery tool
  - managed library
  - installer
  - repair console
  - lightweight settings/app shell

## Current Drift / Redundancy

- `Guide` and theme support were added on top of the core manager workflow.
- `Settings` now carries:
  - language
  - theme
  - runtime paths
  - custom target CRUD
- install actions can now be triggered from multiple places, which improves access but increases surface complexity.
- the app has drifted away from the earlier subtractive direction and is again carrying non-essential top-level UI.

## Known Functional Risks

- Registry adoption may still use the wrong repository identifier if the display name is passed where the GitHub source is expected.
- Target sync/repair may fail to restore installs when the whole target root is missing.
- Discovery mutations can lose async failure handling if promises are not returned to the caller.
- Symlink-only install/repair logic is fragile on systems where symlink creation is blocked; copy fallback is required.

## Current High-Value Areas

- Family / variant management
- Install correctness
- Custom target usability
- Repair reliability

## Current Low-Value / Optional Areas

- Guide as a top-level page
- theme polish compared to core install/discovery correctness
- extra shell quick actions if they duplicate page-local actions
