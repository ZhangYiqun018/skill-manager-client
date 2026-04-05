<div align="center">

<img src="./docs/assets/banner.png" width="800" alt="Skill Manager Banner" />

# ⚡ Skill Manager

### One app to rule all your AI agent skills.

Discover, install, and sync skills across **Codex · Claude Code · Agent · OpenClaw** — from a single beautiful desktop app.

<br/>

[![Release][release-shield]][release-link]
[![License][license-shield]][license-link]
[![Stars][stars-shield]][stars-link]
[![Issues][issues-shield]][issues-link]

<a href="./README_zh.md"><img alt="简体中文" src="https://img.shields.io/badge/简体中文-d9d9d9?style=flat"></a>
<a href="./README.md"><img alt="English" src="https://img.shields.io/badge/English-007ACC?style=flat&logo=readme&logoColor=white"></a>

<br/>

[🌐 skills.sh](https://skills.sh) · [📖 Guide](#-built-in-guide) · [🚀 Quick Start](#-quick-start) · [📦 Download](https://github.com/ZhangYiqun018/skill-manager-client/releases)

<br/>

<img src="./docs/assets/screenshot-light.png" width="90%" alt="Skill Manager — Marketplace" />

</div>

<br/>

## 🤔 Why Skill Manager?

AI agents are powerful — but managing their skills is a mess.

Skills are scattered across global configs, project directories, and different agent formats. Installing one skill to three agents means editing three config files. Updating means doing it all over again. **There has to be a better way.**

```
                ┌─────────────┐
                │  skills.sh  │  ← Remote Marketplace
                │  Registry   │
                └──────┬──────┘
                       │  search / adopt
                       ▼
              ┌─────────────────┐
              │  Skill Manager  │  ← This App
              │   ┌───────────┐ │
              │   │  Library   │ │  manage, version, diff
              │   │  Discover  │ │  scan, import, resolve
              │   │  Targets   │ │  install, repair, sync
              │   └───────────┘ │
              └────────┬────────┘
                       │  symlink / copy
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Codex   │ │  Claude  │ │  Agent   │
    │  CLI     │ │  Code    │ │  (any)   │
    └──────────┘ └──────────┘ └──────────┘
```

**Skill Manager gives you a single pane of glass** to discover, install, update, and repair skills for every agent you use.

<br/>

## ✨ Features

<table>
<tr>
<td width="50%">

### 🏪 Marketplace

Search and adopt skills from the **[skills.sh](https://skills.sh)** registry. One-click add to your library with agent and scope selection.

</td>
<td width="50%">

### 📚 Library

Browse all managed skills in a gallery view. See health status, variants, install history, and file diffs at a glance.

</td>
</tr>
<tr>
<td>

### 🔍 Discover

Scan your entire disk for existing skills. Import local folders. Resolve duplicates and variant conflicts with a visual diff tool.

</td>
<td>

### 🎯 Multi-Agent Install

Install one skill to **Codex + Claude Code + Agent + OpenClaw** simultaneously. Choose symlink (saves space) or copy (portable).

</td>
</tr>
<tr>
<td>

### 🎨 Glass UI

Morandi color palette with glass-morphism surfaces. Paper-warm light theme ☀️ and ink-blue dark theme 🌙, switchable in one click.

</td>
<td>

### ⌨️ Keyboard First

`Cmd/Ctrl+1~5` switch tabs · `Cmd/Ctrl+K` focus search · `Cmd/Ctrl+R` refresh index. Navigate everything without a mouse.

</td>
</tr>
<tr>
<td>

### 🌍 Bilingual

Full English and 中文 interface. Switch at runtime — no restart needed.

</td>
<td>

### 📡 Offline Ready

Disk scanning and local imports work without internet. Go online only when you want to browse the marketplace.

</td>
</tr>
</table>

<br/>

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                   Desktop App                     │
│  ┌─────────────────────────────────────────────┐ │
│  │           React 19 + TypeScript              │ │
│  │  ┌──────────┬──────────┬──────────┬───────┐ │ │
│  │  │ Library  │ Discover │ Targets  │  ...  │ │ │
│  │  └──────────┴──────────┴──────────┴───────┘ │ │
│  │       CSS Modules · Morandi Design Tokens    │ │
│  └──────────────────┬──────────────────────────┘ │
│                     │ Tauri IPC                    │
│  ┌──────────────────┴──────────────────────────┐ │
│  │              Rust Backend (Tauri v2)          │ │
│  │  ┌────────────────────────────────────────┐ │ │
│  │  │         skill-manager-core             │ │ │
│  │  │   scan · index · install · SQLite      │ │ │
│  │  └────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

| Layer        | Technology                                           |
| :----------- | :--------------------------------------------------- |
| **Frontend** | React 19, TypeScript, Vite 7                         |
| **Backend**  | Tauri v2, Rust 2024 Edition                          |
| **Core**     | `skill-manager-core` — scan, index, install, SQLite  |
| **CLI**      | `skill-manager-cli` — headless operations            |
| **Styling**  | CSS Modules + Morandi design tokens + glass-morphism |

<br/>

## 🚀 Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) 1.80+
- [Node.js](https://nodejs.org/) 20+ & [pnpm](https://pnpm.io/) 9+

### Development

```bash
# 1. Clone
git clone https://github.com/ZhangYiqun018/skill-manager-client.git
cd skill-manager-client

# 2. Install
pnpm install

# 3. Run
pnpm desktop:dev
```

### Production Build

```bash
pnpm desktop:build
```

### CLI

```bash
cargo run -p skill-manager-cli -- scan --json
```

<br/>

## 📁 Project Structure

```
skill-manager-client/
├── apps/desktop/              # 🖥️  Tauri desktop app
│   ├── src/                   #     React frontend
│   │   ├── features/          #     Library, Discover, Targets, Settings, Guide
│   │   ├── components/        #     Shared UI components
│   │   ├── hooks/             #     Custom React hooks
│   │   ├── styles/            #     CSS Modules (Morandi tokens)
│   │   └── locales/           #     i18n (en, zh)
│   └── src-tauri/             #     Rust backend
├── crates/skill-manager-core/ # ⚙️  Core logic (scan, index, SQLite)
├── crates/skill-manager-cli/  # 💻  CLI interface
└── .github/workflows/         # 🔄  CI + Release (macOS/Win/Linux)
```

<br/>

## 📖 Built-in Guide

Skill Manager includes a comprehensive built-in guide with collapsible sections covering every feature — from quick start to keyboard shortcuts to FAQ. Access it from the **Guide** tab inside the app.

<br/>

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, code style guidelines, and the PR checklist.

<br/>

## 📄 License

[MIT](./LICENSE) © Skill Manager Contributors

---

<div align="center">

**If Skill Manager helps you manage your AI agent skills, consider giving it a ⭐**

[⬆ Back to Top](#-skill-manager)

</div>

<!-- Link references -->

[release-shield]: https://img.shields.io/github/v/release/ZhangYiqun018/skill-manager-client?style=flat&color=blue
[release-link]: https://github.com/ZhangYiqun018/skill-manager-client/releases
[license-shield]: https://img.shields.io/github/license/ZhangYiqun018/skill-manager-client?style=flat
[license-link]: ./LICENSE
[stars-shield]: https://img.shields.io/github/stars/ZhangYiqun018/skill-manager-client?style=flat
[stars-link]: https://github.com/ZhangYiqun018/skill-manager-client/stargazers
[issues-shield]: https://img.shields.io/github/issues/ZhangYiqun018/skill-manager-client?style=flat
[issues-link]: https://github.com/ZhangYiqun018/skill-manager-client/issues
