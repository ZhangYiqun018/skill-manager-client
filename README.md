# Skill Manager

A desktop application for managing AI agent skills across Codex, Claude Code, and generic Agent workspaces. Built with Tauri v2 + React + Rust.

## What it does

Skill Manager helps you organize, install, and update skills (plugins) for your AI coding agents. It bridges the gap between discovering skills and keeping them in sync across multiple projects and agent configurations.

### Key features

- **Library** — Browse all managed skills with health status, variants, and install history
- **Discover** — Scan your disk for existing skills, import local folders, or search the remote registry
- **Targets** — Manage install targets and repair broken symlinks with one click
- **Settings** — Switch language (EN / 中文), toggle themes (system / light / dark), and configure custom install targets
- **Multi-agent support** — Install the same skill to Codex, Claude Code, and Agent simultaneously
- **Offline mode** — Disk scanning and local imports work without an internet connection
- **Keyboard shortcuts** — `Ctrl/Cmd+1~5` to switch tabs, `Ctrl/Cmd+K` to focus search, `Ctrl/Cmd+R` to refresh index

## Tech stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Tauri v2 + Rust
- **Core crates**: `skill-manager-core` (scan, index, install logic), `skill-manager-cli` (command-line interface)
- **Styling**: CSS Modules with Morandi design tokens

## Getting started

### Prerequisites

- [Rust](https://rustup.rs/)
- [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/)

### Install dependencies

```bash
pnpm install
```

### Run the desktop app (development)

```bash
pnpm desktop:dev
```

### Run the CLI

```bash
cargo run -p skill-manager-cli -- scan --json
```

### Build for production

```bash
pnpm desktop:build
cargo build --release -p skill-manager-desktop
```

### Lint and test

```bash
# Frontend
cd apps/desktop
pnpm lint
pnpm test

# Backend
cargo test
```

## Project structure

```
skill-manager-client/
├── apps/desktop/              # Tauri desktop application
│   ├── src/                   # React frontend
│   │   ├── features/          # Page-level features (library, discover, targets, settings, guide)
│   │   ├── components/        # Shared UI components
│   │   ├── hooks/             # Custom React hooks
│   │   └── locales/           # i18n translations (en, zh)
│   └── src-tauri/             # Rust backend (Tauri commands)
├── crates/skill-manager-core/ # Shared core logic (scan, index, SQLite)
├── crates/skill-manager-cli/  # Command-line interface
└── docs/                      # Product requirements and architecture docs
```

## Custom registry

By default, remote skill search uses `https://skills.sh/api/search`. You can change this in **Settings → Registry URL**.

## License

MIT
