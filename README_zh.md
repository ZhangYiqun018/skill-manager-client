# Skill Manager

[English](./README.md)

一款用于管理 AI 智能体技能的桌面应用，支持 Codex、Claude Code 和通用 Agent 工作区。基于 Tauri v2 + React 19 + Rust 构建。

## v0.1.0 更新亮点

- **技能市场** — 直接从 [skills.sh](https://skills.sh) 注册中心搜索并采纳技能
- **玻璃拟态 UI** — 莫兰迪色系，暖纸色浅色主题和墨蓝色深色主题
- **多智能体安装** — 一键将技能安装到 Codex、Claude Code 和 Agent，支持符号链接或复制
- **变体管理** — 跟踪和推广技能变体，跨版本比较差异
- **双语界面** — 完整的中英文支持，运行时切换
- **键盘驱动** — `Cmd/Ctrl+1~5` 切换页面，`Cmd/Ctrl+K` 聚焦搜索，`Cmd/Ctrl+R` 刷新索引

## 核心功能

- **技能库** — 浏览所有托管技能，查看健康状态、变体和安装历史
- **发现** — 扫描磁盘中已有的技能，导入本地文件夹，或搜索远程注册中心
- **安装目标** — 管理安装目标，一键修复损坏的符号链接
- **设置** — 切换语言（EN / 中文）、主题（跟随系统 / 浅色 / 深色）和自定义安装目标
- **离线模式** — 磁盘扫描和本地导入无需联网
- **内置指南** — 可折叠的手风琴式功能参考

## 技术栈

| 层级 | 技术                                     |
| ---- | ---------------------------------------- |
| 前端 | React 19、TypeScript、Vite               |
| 后端 | Tauri v2、Rust                           |
| 核心 | `skill-manager-core`（扫描、索引、安装） |
| CLI  | `skill-manager-cli`                      |
| 样式 | CSS Modules + 莫兰迪设计令牌             |

## 快速开始

### 前置条件

- [Rust](https://rustup.rs/)
- [Node.js](https://nodejs.org/)（20+）+ [pnpm](https://pnpm.io/)

### 安装依赖

```bash
pnpm install
```

### 开发模式运行桌面应用

```bash
pnpm desktop:dev
```

### 运行 CLI

```bash
cargo run -p skill-manager-cli -- scan --json
```

### 生产构建

```bash
pnpm desktop:build
cargo build --release -p skill-manager-desktop
```

### 代码检查与测试

```bash
# 前端
cd apps/desktop
pnpm lint
pnpm test

# 后端
cargo test
```

## 项目结构

```
skill-manager-client/
├── apps/desktop/              # Tauri 桌面应用
│   ├── src/                   # React 前端
│   │   ├── features/          # 页面级功能（技能库、发现、目标、设置、指南）
│   │   ├── components/        # 共享 UI 组件
│   │   ├── hooks/             # 自定义 React Hooks
│   │   └── locales/           # 国际化翻译（en、zh）
│   └── src-tauri/             # Rust 后端（Tauri 命令）
├── crates/skill-manager-core/ # 共享核心逻辑（扫描、索引、SQLite）
├── crates/skill-manager-cli/  # 命令行界面
└── docs/                      # 产品需求和架构文档
```

## 自定义注册中心

默认情况下，远程技能搜索使用 `https://skills.sh/api/search`。你可以在**设置 → 注册中心 URL** 中修改。

## 许可证

[MIT](./LICENSE)
