# Skill Manager

[中文文档](./README_zh.md)

A desktop application for managing AI agent skills across Codex, Claude Code, and generic Agent workspaces. Built with Tauri v2 + React 19 + Rust.

## What's New in v0.1.0

- **Marketplace** — Search and adopt skills directly from the [skills.sh](https://skills.sh) registry
- **Glass UI** — Morandi color palette with glass-morphism surfaces, paper-warm light theme, and ink-blue dark theme
- **Multi-agent installs** — Install a skill to Codex, Claude Code, and Agent in one step with symlink or copy
- **Variant management** — Track and promote skill variants, compare diffs across versions
- **Bilingual interface** — Full English and Chinese support, switchable at runtime
- **Keyboard driven** — `Cmd/Ctrl+1~5` tabs, `Cmd/Ctrl+K` search, `Cmd/Ctrl+R` refresh

## Key Features

- **Library** — Browse all managed skills with health status, variants, and install history
- **Discover** — Scan your disk for existing skills, import local folders, or search the remote registry
- **Targets** — Manage install targets and repair broken symlinks with one click
- **Settings** — Switch language (EN / 中文), toggle themes (system / light / dark), and configure custom install targets
- **Offline mode** — Disk scanning and local imports work without an internet connection
- **Built-in guide** — Collapsible accordion reference for every feature

## Tech Stack

| Layer    | Technology                                  |
| -------- | ------------------------------------------- |
| Frontend | React 19, TypeScript, Vite                  |
| Backend  | Tauri v2, Rust                              |
| Core     | `skill-manager-core` (scan, index, install) |
| CLI      | `skill-manager-cli`                         |
| Styling  | CSS Modules + Morandi design tokens         |

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/)
- [Node.js](https://nodejs.org/) (20+) + [pnpm](https://pnpm.io/)

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

## Project Structure

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

## Custom Registry

By default, remote skill search uses `https://skills.sh/api/search`. You can change this in **Settings → Registry URL**.

## License

[MIT](./LICENSE)
