# Progress

## 2026-04-03

- Bootstrapped the Rust workspace, CLI, and Tauri desktop app.
- Implemented Codex / Claude Code skill scanning.
- Added bilingual desktop UI.
- Added SQLite-backed index and cached startup.

## 2026-04-04

- Built `Library / Discover / Targets / Settings` structure.
- Added managed adoption flow from discovery into library.
- Added full-disk confirmation, duplicate grouping, and batch review.
- Added family / variant semantics, compare flows, and default-variant promotion.
- Added install / remove / repair actions and target inventory.
- Added local folder import and `skills.sh` search/adoption.
- Researched PromptHub and used it to guide IA and workflow decisions.

## 2026-04-05

- Main branch now includes additional product surface:
  - theme system
  - guide page
  - custom install target CRUD
  - unified install modal
  - more direct install entry points

## Current Status

- Repository is clean on `main`.
- HEAD is `d0bd135`.
- The product is feature-rich enough to use, but needs another pass on:
  - install correctness
  - surface-area control
  - reducing overlap between manager, settings, and shell UI
