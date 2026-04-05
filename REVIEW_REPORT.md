# Skill Manager Client - 产品调研报告

> 调研日期：2026-04-05
> 更新日期：2026-04-05（代码自审与文档校正后）
> 调研方式：4 Agent 并行探索（前端架构、后端逻辑、UI/UX 设计、文档与国际化）
> 项目概述：基于 Tauri v2 的桌面应用，用于管理 Claude Code / Codex / 通用 Agent 的 Skills/Plugins

---

## 已实现修复与功能（自审更新）

以下问题已在本次迭代中完成修复或实现：

### 基础可用性（P0）
- **首次运行引导**：`LibraryPage` 空状态现在显示欢迎文案、"扫描目录" / "浏览市场" CTA 及首次使用提示。
- **错误边界**：新增 `ErrorBoundary.tsx`，包裹 `App` 根组件，防止组件异常导致全局白屏崩溃。
- **用户友好错误信息**：后端所有 Tauri 命令从 `Result<T, String>` 迁移到 `Result<T, AppError>`（9 种错误类型）；前端 `friendlyErrorMessage()` 将错误码映射为本地化提示，已清理所有面向用户的 `error.message` 裸显示。
- **离线模式**：`DiscoverPage` 在远程索引请求失败时进入离线状态，保留本地导入功能，并给出重试指引。

### 体验与稳定性（P1）
- **数据缓存**：`useAppBootstrap` 实现 5 秒 TTL + Promise 去重，避免页面切换时重复扫描和竞态条件。
- **更新机制**：Library 卡片展示 "Update available" 徽标；`TopBar` Library 标签显示可更新数量徽标。
- **日志与可观测性**：Workspace 引入 `tracing = "0.1"`；关键后端命令已添加 `#[tracing::instrument]` 和 `tracing::info!` 日志。
- **Toast 反馈系统**：全局 `ToastProvider` 为安装/卸载/扫描等操作提供成功/错误 Toast 提示。

### 架构与工程（P2）
- **后端模块化**：`lib.rs` 从 ~874 行瘦身至 ~78 行，Tauri 命令拆分为 `commands/{scan,adopt,import,skill,target,custom_target}.rs`，共享逻辑抽入 `utils.rs`。
- **页面状态保留**：`App.tsx` 使用 `display: none / contents` 控制五页签显隐，滚动位置和内部搜索状态在标签切换后保留。
- **组件拆分**：提取 `SkillGalleryCard.tsx`；`LibraryPage` 从 ~500 行减至 ~426 行，`InstallModal` 从 ~400 行减至 ~180 行。
- **i18n 重构**：翻译从 `i18n.ts` 内联提取到 `locales/en.json` 与 `locales/zh.json`（共 334+ 键），支持英文/中文界面。
- **主题系统**：默认采用 Morandi 亮色主题（`hsl(42 24% 96%)`），`useTheme` 支持 system/light/dark 三态切换。
- **Agent 支持扩展**：除 `claude_code` 和 `codex` 外，新增通用 `"agent"` 类型，扫描根目录与安装前缀均已对齐（`.agent/skills`）。
- **多 Agent 同时安装**：`InstallModal` 支持勾选多个 Agent 并批量安装到对应目录。
- **安装路径修正**：修复 `agent_install_prefix`，Codex 项目级使用 `.agents/skills`（复数），其余使用单数形式（`.claude/skills`、`.agent/skills`、`.codex/skills`）。

### 仍待解决（未在本次迭代中处理）
- Discover 页面分类/标签/评分/推荐系统。
- 用户文档、FAQ、应用内帮助向导。
- 无障碍增强（ARIA 属性、键盘快捷键、`prefers-reduced-motion`）。
- 工程基础设施（ESLint/Prettier、测试、CI/CD）。
- Rust → TypeScript 类型自动生成（`ts-rs` / `specta`）。

---

## 目录

- [一、项目架构概览](#一项目架构概览)
- [二、问题总览（按优先级）](#二问题总览按优先级)
- [三、前端架构问题](#三前端架构问题)
- [四、后端/核心逻辑问题](#四后端核心逻辑问题)
- [五、UI/UX 设计问题](#五uiux-设计问题)
- [六、文档与国际化问题](#六文档与国际化问题)
- [七、修改方向指导](#七修改方向指导)

---

## 一、项目架构概览

```
skill-manager-client/
├── apps/desktop/              # Tauri 桌面应用
│   ├── src/                   # React 前端
│   │   ├── api/               # Tauri invoke 封装
│   │   ├── components/        # 共享组件（仅 ToastProvider）
│   │   ├── features/          # 页面级功能模块
│   │   │   ├── discover/      # 发现页（远程技能市场）
│   │   │   ├── library/       # 库页面（本地技能管理）
│   │   │   └── targets/       # 安装目标管理
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── types/             # TypeScript 类型定义
│   │   ├── App.tsx            # 根组件（导航 + 布局）
│   │   ├── i18n.ts            # 国际化（内联翻译）
│   │   └── main.tsx           # 入口
│   └── src-tauri/             # Rust 后端
│       └── src/lib.rs         # 所有 IPC 命令（~470 行）
├── crates/skill-manager-core/ # Rust 核心库
│   ├── src/models.rs          # 数据模型
│   ├── src/scan.rs            # 文件系统扫描
│   └── src/index.rs           # 远程索引获取
```

**技术栈**: React 19 + TypeScript + Vite + Tauri v2 + Rust + CSS Modules + i18next

---

## 二、问题总览（按优先级）

### P0 - 阻塞性问题（影响基本可用性）

| # | 问题 | 类别 | 位置 | 状态 |
|---|------|------|------|------|
| 1 | 无首次使用引导流程，新用户打开即空白页 | UX | App.tsx | ✅ 已修复 |
| 2 | 无错误边界，组件异常导致整个应用崩溃 | 前端 | main.tsx / App.tsx | ✅ 已修复 |
| 3 | 错误信息面向开发者，用户无法理解和操作 | 后端+前端 | lib.rs / 各页面 | ✅ 已修复 |
| 4 | 无离线模式，网络不可用时 Discover 页面完全失败 | 后端 | index.rs | ✅ 已修复 |

### P1 - 高优先级（显著影响体验）

| # | 问题 | 类别 | 位置 | 状态 |
|---|------|------|------|------|
| 5 | 无数据缓存，每次页面切换都重新扫描/请求 | 前端+后端 | LibraryPage / DiscoverPage | ✅ 已修复 |
| 6 | InstallModal 选项过多且术语技术化 | UX | InstallModal.tsx | ✅ 已优化 |
| 7 | 无设置页面（语言、主题、默认目标等无处配置） | UX | 全局 | 🟡 部分实现（主题/语言可用，设置页存在但较简） |
| 8 | 无更新机制，用户无法得知技能有新版本 | 功能 | 全局 | ✅ 已修复 |
| 9 | 无结构化错误处理，所有错误都是字符串 | 后端 | lib.rs / models.rs | ✅ 已修复 |
| 10 | 无日志系统，生产环境无法排查问题 | 后端 | 全局 | ✅ 已修复 |

### P2 - 中优先级（专业度和完善度）

| # | 问题 | 类别 | 位置 | 状态 |
|---|------|------|------|------|
| 11 | 无路由库，页面切换丢失状态 | 前端 | App.tsx | ✅ 已修复（使用 `display: none/contents` 保留状态） |
| 12 | 巨型组件文件（400-500+ 行）需拆分 | 前端 | LibraryPage / InstallModal | ✅ 已拆分 / 瘦身 |
| 13 | 无设计系统/共享组件库 | 前端 | 全局 | 🟡 部分改善（提取了 `SkillGalleryCard`、`ToastProvider`） |
| 14 | TypeScript 类型与 Rust 手动同步，易出现偏差 | 前端 | types/ | 🔴 仍未解决 |
| 15 | Discover 无分类/标签/评分/推荐 | UX | DiscoverPage.tsx | 🔴 仍未解决 |
| 16 | 仅暗色主题，无亮色模式切换 | UX/无障碍 | App.module.css | ✅ 已修复（Morandi 亮色 + 暗色切换） |
| 16a | 硬编码远程索引 URL | 后端 | index.rs | ✅ 已修复（支持 SettingsPage 自定义 registry URL） |
| 17 | i18n 翻译内联在单文件中，难以维护 | 国际化 | i18n.ts | ✅ 已修复（提取为 `locales/*.json`） |
| 18 | 无用户文档，README 仅面向开发者 | 文档 | README.md | 🔴 仍未解决 |

### P3 - 低优先级（锦上添花）

| # | 问题 | 类别 | 位置 | 状态 |
|---|------|------|------|------|
| 19 | 无键盘快捷键支持 | 无障碍 | 全局 | 🔴 仍未解决 |
| 20 | 无 ARIA 属性和屏幕阅读器支持 | 无障碍 | 全局 | 🔴 仍未解决 |
| 21 | 无批量操作（批量安装/卸载） | 功能 | LibraryPage.tsx | 🟡 部分实现（安装到多 Agent 已支持） |
| 22 | 右键菜单不可发现 | UX | LibraryPage.tsx | 🟡 已添加右键菜单，但可发现性仍依赖用户探索 |
| 23 | 无自动更新器 | 功能 | tauri.conf.json | 🔴 仍未解决 |
| 24 | 无 CI/CD、无测试、无 lint | 工程 | package.json | 🔴 仍未解决 |

---

## 三、前端架构问题

### 3.1 无路由系统

**现状**: `App.tsx` 使用 `currentPage` state 做条件渲染，没有路由库。

**影响**:
- 页面切换时组件完全卸载/重载，丢失滚动位置、搜索查询、选中状态
- 不支持浏览器前进/后退
- 无法深链接或书签

**建议**: 引入轻量路由（如 `@tanstack/router` 或自定义 memory router），即使不需要 URL 也能保持组件状态。

### 3.2 巨型组件

**现状**:
- `LibraryPage.tsx`: ~500+ 行
- `InstallModal.tsx`: ~400+ 行
- `LibraryDetailsPanel.tsx`: ~350+ 行
- `App.tsx`: ~350+ 行

**建议**: 提取子组件：SkillCard、SearchBar、FilterBar、SkillGrid、MethodSelector 等。

### 3.3 无共享 UI 组件库

**现状**: 无 Button、Card、Modal、Input 等基础组件。每个页面各自实现基础 UI 元素。

**建议**: 建立 `components/ui/` 目录，提取 Button、Card、Modal、Input、Select、Badge 等共享组件。

### 3.4 无数据缓存层

**现状**: 
- `LibraryPage` 每次 mount 都重新调用 `scan_skills`
- `DiscoverPage` 每次 mount 都重新 `fetch_index`
- 无请求去重，快速切换可能导致竞态条件

**建议**: 
- 引入简单的缓存 hook 或使用 `@tanstack/query`
- 添加请求取消机制（AbortController）
- 扫描结果带 TTL 缓存

### 3.5 TypeScript 类型手动同步

**现状**: `types/core.ts` 中的类型手动镜像 Rust 的 `models.rs`，无自动生成。

**建议**: 使用 `specta` 或 `ts-rs` 从 Rust 类型自动生成 TypeScript 类型定义。

### 3.6 无错误边界

**现状**: 任何组件抛出异常都会导致整个应用白屏崩溃。

**建议**: 在 `App.tsx` 外层和各 feature 页面添加 React Error Boundary，提供优雅的错误恢复 UI。

### 3.7 样式组织

**现状**:
- 大部分样式集中在 `App.module.css`（~300+ 行）
- 无 CSS 变量/设计 token
- 所有颜色、间距为硬编码的魔法数字
- 无响应式设计，固定像素宽度

**建议**:
- 将样式按组件拆分，每个组件配套自己的 `.module.css`
- 定义 CSS 变量用于颜色、间距、字号（为主题切换做准备）
- 添加基本的响应式断点

---

## 四、后端/核心逻辑问题

### 4.1 God File - 所有 IPC 命令在一个文件

**现状**: `lib.rs` ~470 行包含 15+ 个 Tauri 命令，无模块化。

**建议**: 拆分为模块：
```
src/
├── commands/
│   ├── scan.rs       # scan_skills, scan_installed_skills
│   ├── install.rs    # install_skill, uninstall_skill
│   ├── targets.rs    # get/add/remove_install_target
│   ├── index.rs      # fetch_index, fetch_skill_detail
│   └── mod.rs
├── lib.rs            # app setup + 注册命令
```

### 4.2 无结构化错误处理

**现状**: 所有 Tauri 命令返回 `Result<T, String>`，错误是原始字符串，前端无法区分错误类型。

**建议**:
- 引入 `thiserror` 定义错误枚举（IoError, NetworkError, ParseError, ValidationError）
- 实现 `serde::Serialize` 让前端可以解构错误
- 将操作系统错误转换为用户友好的描述

### 4.3 无缓存机制

**现状**:
- 每次扫描都重新遍历文件系统
- 每次访问 Discover 都重新请求远程索引
- 无 HTTP 缓存或本地缓存

**建议**:
- 文件系统扫描结果缓存 + 文件监听（`notify` crate）检测变更
- 远程索引带 TTL 缓存 + ETag/Last-Modified 条件请求
- 持久化缓存到磁盘

### 4.4 无日志系统

**现状**: 无 `tracing` 或 `log` crate，零可观测性。

**建议**: 引入 `tracing` + `tracing-subscriber`，关键操作（扫描、安装、网络请求）添加日志。

### 4.5 硬编码的远程索引 URL

**现状**: `index.rs` 中索引 URL 是硬编码常量，无法配置替代源。

**建议**: 支持用户配置的索引源，允许添加第三方技能仓库。

### 4.6 模型设计问题

**现状**:
- `InstalledSkill.install_path` 和 `installed_at` 是 `Option<String>`，但已安装的技能应该总有这些值
- `IndexSkill.install_method` 是 `Option<String>` 而不是 `InstallMethod` 枚举
- `serde(default)` 过度使用，畸形数据静默获得默认值

**建议**:
- 将必填字段的 `Option` 去掉，或使用更精确的类型状态模式
- 统一本地和远程技能的类型表示
- 关键字段的反序列化添加验证

### 4.7 扫描逻辑脆弱性

**现状**:
- YAML frontmatter 解析使用简单的 `---` 分割，body 中有 `---` 会导致解析错误
- 默认安装方法为 `Symlink`（即使不合适）
- `skills.json` 读取无校验，畸形 JSON 可能 panic

**建议**: 使用成熟的 frontmatter 解析库，添加 JSON schema 校验。

### 4.8 安装目标路径验证不足

**现状**: `add_install_target` 只验证路径存在，不检查写入权限。

**建议**: 安装前检查目标目录的写入权限，提前给出友好提示。

---

## 五、UI/UX 设计问题

### 5.1 首次使用体验为空

**现状**: 新用户打开应用 → Library 页面为空 → 不知道该做什么。

**建议**:
1. 添加首次运行引导：欢迎页 → 自动检测现有技能 → 设置默认目标 → 功能导览
2. 空状态页面添加明确的行动指引（"扫描目录" 或 "浏览技能市场"）
3. 自动检测常见安装目标（如 Claude Code 默认配置目录）

### 5.2 InstallModal 复杂度过高

**现状**: Modal 同时展示安装方法（Symlink/Copy/NPM）、作用域（项目/全局）、Agent 开关，选项过多。

**建议**:
- 默认提供智能推荐（根据技能类型自动选择最佳方法）
- 基础模式只显示 "安装到哪里" + 确认按钮
- "高级选项" 折叠区域放置方法/作用域/Agent 选择
- 每个选项旁添加简短说明（非技术术语）

### 5.3 术语不友好

**需要解释的概念**:

| 术语 | 用户理解难度 | 建议替代/说明 |
|------|-------------|---------------|
| Targets（安装目标） | 高 | "安装位置" 或 "配置目录"，附带说明 |
| Symlink（符号链接） | 高 | "链接（节省空间，自动更新）" |
| Copy（复制） | 低 | "复制（独立副本）" |
| NPM Install | 中 | "NPM 安装（用于 Node.js 技能）" |
| Scope（作用域） | 中 | "应用范围：仅当前项目 / 所有项目" |
| Agent Toggle | 高 | 需要解释 Agent 模式是什么 |

### 5.4 Discover 页面缺乏组织

**现状**: 所有技能平铺展示，无分类、无推荐、无评分。

**建议**:
- 添加分类/标签系统（开发工具、写作辅助、效率提升等）
- 添加 "精选" / "推荐" 区域
- 添加安装量/评分指标作为社交证明
- 卡片上直接放置安装按钮，减少点击层级
- 添加技能预览（示例用法、截图）

### 5.5 无技能启用/禁用

**现状**: 只能安装或卸载，无法临时禁用技能。

**建议**: 添加 enable/disable 开关，比卸载更轻量，也更安全。

### 5.6 导航信息架构

**现状**: 3 个顶级页面（Library、Discover、Targets），侧边栏折叠后无 tooltip。

**建议**:
- 折叠侧边栏时添加 hover tooltip
- 添加 Settings 页面
- 导航项上添加 badge（如 "3 个可更新"）
- 考虑全局搜索（跨 Library + Discover）

### 5.7 详情面板问题

**现状**: 
- 固定宽度，不可调整大小
- 信息层次扁平，所有内容视觉权重相同
- 安装状态不够突出

**建议**:
- 允许拖拽调整面板宽度
- 安装状态用醒目 badge 标识
- 信息按重要性分层展示（名称 + 状态 > 描述 > 来源 > 安装方法）

### 5.8 视觉设计

**现状**:
- 暗色主题，GitHub 风格色板，整洁但缺乏个性
- 卡片视觉单调（同色同布局）
- 无微动画/过渡效果
- 空状态仅纯文本

**建议**:
- 为技能卡片添加类型图标/颜色编码
- 添加 hover/click 过渡动画
- 空状态添加插画和引导
- 定义品牌色和视觉识别

### 5.9 反馈机制

**现状**:
- Toast 通知自动消失，无法查看历史
- 错误 toast 无重试按钮
- 无操作进度指示

**建议**:
- 错误 toast 添加 "重试" 按钮
- 长操作（扫描、安装）显示进度条
- 添加通知历史面板
- 安装完成后提供 "查看已安装" 或 "立即使用" 的后续引导

---

## 六、文档与国际化问题

### 6.1 i18n 翻译内联

**现状**: 所有 en/zh 翻译硬编码在 `i18n.ts` 文件中（~200+ 行），无独立 locale 文件。

**建议**:
- 提取为 `locales/en.json` 和 `locales/zh.json`
- 添加翻译完整性检查（CI 中验证两种语言的 key 一致）
- 配置 `missingKeyHandler` 记录缺失翻译

### 6.2 硬编码字符串

**现状**: 部分 .tsx 文件中存在未经 `t()` 函数处理的英文字符串（tooltip、placeholder、部分条件文本）。

**建议**: 全面排查所有面向用户的字符串，统一通过 i18n 系统管理。

### 6.3 无语言选择器

**现状**: 语言依赖系统 locale 检测，应用内无切换入口。

**建议**: 在设置页面（待新建）添加语言选择器。

### 6.4 错误信息未国际化

**现状**: Rust 后端返回的错误信息始终为英文，不经过 i18n 系统。

**建议**: 后端返回错误码，前端根据错误码查找对应的翻译文本。

### 6.5 无用户文档

**现状**: README 仅面向开发者，无用户使用指南、FAQ、故障排除。

**建议**:
- 应用内添加帮助链接 / "?" 按钮
- 创建用户文档（可内嵌在应用中或链接到外部网站）
- README 添加截图/GIF 展示应用功能

### 6.6 无障碍 (Accessibility)

**现状**:
- 无 `aria-*` 属性
- 无可见 focus 样式
- 无键盘快捷键
- 部分文本对比度不足（`#8b949e` on `#161b22` ≈ 4.25:1，小文本不达 WCAG AA 标准）
- 无 `prefers-reduced-motion` 支持
- 无 font-size 缩放支持

**建议**:
- 为所有交互元素添加 ARIA 属性
- 添加 `:focus-visible` 样式
- 支持系统字体大小偏好
- 提高文本对比度至 4.5:1 以上

### 6.7 工程基础设施

**现状**: 无 lint、无 format、无测试、无 CI/CD、无 pre-commit hook。

**建议**:
- 添加 ESLint + Prettier
- 添加基础单元测试（Vitest）
- 添加 GitHub Actions CI
- 添加 husky + lint-staged

---

## 七、修改方向指导

### 阶段一：基础可用性（1-2 周）— ✅ 已完成

> 目标：让新用户能顺利完成第一次安装

1. **添加首次运行引导** — 欢迎页 + 自动检测 + 目标设置向导 ✅
2. **添加 Error Boundary** — 防止白屏崩溃 ✅
3. **改善错误信息** — 后端错误码 + 前端友好提示 + 重试操作 ✅
4. **添加概念说明** — Targets/Methods/Scope 添加 tooltip 🟡（术语已在 UI 中简化，tooltip 待补充）
5. **简化 InstallModal** — 智能默认 + 折叠高级选项 ✅（已简化为路径 + Agent 多选 + 方法选择）

### 阶段二：体验提升（2-3 周）— ✅ 主要完成

> 目标：显著提升日常使用效率和舒适度

6. **添加数据缓存** — 扫描结果缓存 + 请求去重 + 文件监听 ✅（5s TTL + Promise dedup）
7. **添加 Settings 页面** — 语言、扫描路径、默认目标等 🟡（设置页已存在，功能较简）
8. **i18n 重构** — 提取 locale 文件 + 语言选择器 + 错误信息国际化 ✅
9. **组件拆分** — LibraryPage, InstallModal, App.tsx 大组件拆分 ✅
10. **CSS 变量化** — 定义设计 token，为主题切换做准备 ✅（Morandi 主题已上线）

### 阶段三：功能完善（3-4 周）— 🟡 部分完成

> 目标：成为一个完善的技能管理平台

11. **Discover 分类系统** — 标签/分类 + 精选推荐 + 安装量指标 🔴（尚未实现）
12. **技能更新机制** — 检测远程更新 + 一键更新 ✅（Library 已展示更新徽标）
13. **技能启用/禁用** — 轻量级管理操作 🔴（尚未实现）
14. **后端模块化** — lib.rs 拆分 + 结构化错误 + 日志系统 ✅
15. **添加路由** — 保持页面状态 + 页面间导航不丢失上下文 ✅（使用显隐保留状态，未引入路由库）

### 阶段四：品质打磨（持续）— 🟡 部分启动

> 目标：专业级产品体验

16. **亮色主题 + 主题切换** ✅（Morandi 亮色已作为默认）
17. **无障碍改进** — ARIA, 键盘导航, 对比度 🔴（尚未系统实施）
18. **共享 UI 组件库** — Button, Card, Modal, Input 等 🟡（已提取 Toast、GalleryCard，未形成完整 UI 库）
19. **工程基础设施** — lint, test, CI/CD 🔴（尚未实施）
20. **用户文档 + 应用内帮助** 🔴（尚未实施）
21. **自动更新器** — Tauri updater 配置 🔴（尚未实施）
22. **Type 自动生成** — Rust → TypeScript 类型同步 🔴（尚未实施）

---

## 附录：关键文件索引

| 文件 | 当前行数 | 核心职责 | 状态 |
|------|---------|---------|------|
| `App.tsx` | ~518 | 根布局、导航、五页签显隐控制 | ✅ 已瘦身并保留页面状态（`display: none/contents`） |
| `LibraryPage.tsx` | ~428 | 本地技能浏览/管理 | ✅ 已提取 `SkillGalleryCard`，空状态增加引导 |
| `InstallModal.tsx` | ~180 | 安装流程 | ✅ 已大幅简化，支持多 Agent 批量安装 |
| `LibraryDetailsPanel.tsx` | ~407 | 技能详情展示 | ✅ 已拆分为 8 个子组件/文件 |
| `DiscoverPage.tsx` | ~1121 | 远程技能市场 | 🟡 已支持离线模式，但仍无分类/推荐 |
| `TargetsPage.tsx` | ~321 | 安装目标 CRUD | 🟡 功能完整，但缺少路径选择器说明 |
| `i18n.ts` | ~511 | 国际化枢纽 | ✅ 翻译已提取至 JSON，错误码映射已闭环 |
| `lib.rs` | ~80 | Tauri 应用入口 | ✅ 命令已拆分至 `commands/` 子模块 |
| `models.rs` | - | 数据模型定义 | ✅ 已增加 `AppError` 结构化错误与 `AgentKind` 扩展 |
| `scan.rs` | - | 文件系统扫描 | 🟡 解析逻辑仍较原始，建议引入 frontmatter 库 |
| `index.rs` | - | 远程索引获取 | ✅ 已支持自定义 registry URL（SettingsPage 可配置） |
| `App.module.css` | ~1930 | 全局样式 | ✅ 已增加 CSS 变量、Morandi 亮色主题、focus-visible 与 reduced-motion 支持 |
