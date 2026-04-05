# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] — 2026-04-05

### Added

- OpenClaw agent support: scan, install, filter, and export skills for OpenClaw across all surfaces.
- Manual tags on skills with tag-based filtering in Library gallery.
- Install status badges on Library gallery cards.
- Redesigned InstallModal with quick-install buttons and viewport-centered portal.
- Quick export to OpenClaw skills directory via tag selection.

### Fixed

- GitHub Actions release workflow: macOS code signing, macOS Intel OpenSSL, and Windows libz-sys build failures.
- Modal rendering: modals now use React portal to escape backdrop-filter stacking context.
- External links (e.g. "Visit skills.sh") now open in system browser via Tauri shell plugin.
- Shell plugin capability (`shell:allow-open`) and URL validation regex corrected.
- IPC storm when switching tag filters; dropdown now closes on tag click.
- Scan no longer infers unrelated disk skill roots as install targets.
- OpenClaw project_root miscalculation: 3-level path (`.openclaw/workspace/skills`) was only traversing 2 parents.
- 4 TypeScript compilation errors: missing AgentKind imports, readonly array assignment, missing i18n key in Copy type.

## [0.1.0] — 2026-04-05

### Added

- Initial desktop application built with Tauri 2 and React 19.
- Library management: browse, inspect, and update managed skills with gallery view.
- Discovery: scan local projects for skill candidates and resolve conflicts.
- Marketplace: search and adopt skills from the skills.sh remote registry.
- Install targets: sync and repair skill installations across agent configurations.
- Multi-agent installs: install a skill to Codex, Claude Code, Agent, and OpenClaw simultaneously.
- Variant management: track, promote, and compare skill variants with diff view.
- Custom install targets: add, remove, and manage targets via Settings.
- Settings: configure theme (system / light / dark), language (EN / 中文), and registry URL.
- Built-in user guide with collapsible accordion sections.
- Keyboard shortcuts: Cmd/Ctrl+1~5 tabs, Cmd/Ctrl+K search, Cmd/Ctrl+R refresh.
- Glass-morphism UI with Morandi color tokens, paper-warm light and ink-blue dark themes.
- Toast notification system with auto-dismiss and stacking.
- Error boundary with user-friendly fallback UI.
- Bilingual README (English and Chinese).
- MIT license.

### Fixed

- Registry adoption error handling: errors are now caught and displayed instead of silently propagated.
- Hard-coded i18n labels in AdoptConfirmDialog and OriginsTab replaced with translation keys.
- Dynamic version display in sidebar (reads from package.json instead of hard-coded string).
- Duplicate className attributes on form inputs in SettingsPage.
- All static inline styles extracted to CSS modules for consistency and maintainability.
- Scrollbar colors use design tokens for proper dark mode support.
- Context menu dismisses on Escape key press.
- ARIA attributes added to modals (role="dialog", aria-modal) and toasts (role="alert").
- TopBar health stats card is keyboard-accessible (role="button", tabIndex, onKeyDown).
