# 五、工程基础设施、国际化与未来路线图

## 1. 国际化（i18n）评估

### 1.1 翻译系统 ✅ 生产级

- **架构**: 类型安全系统（i18n.ts: 512 行），完整 TypeScript 覆盖
- **语言**: 英文(en) + 中文(zh)，350+ 翻译键
- **外部化**: 翻译已提取到 `locales/en.json` 和 `locales/zh.json` ✅
- **辅助函数**: `friendlyErrorMessage()`, `scopeLabel()`, `agentLabel()`, `sourceLabel()`, `healthLabel()` 等
- **错误映射**: 全面覆盖（io, network, not_found, validation, permission_denied 等 9 种）
- **持久化**: `LANGUAGE_STORAGE_KEY` 跨会话保存
- **语言选择器**: Settings 中已有 ✅

### 1.2 待改进项

- **日期/数字格式化**: 未实现（日期显示为 ISO 字符串）。建议集成 `date-fns`
- **复数形式**: 手动处理（如 "显示 X / Y 个技能"），未使用 i18next 复数规则
- **系统语言检测**: 首次启动不检测 `navigator.language`。建议自动匹配系统语言
- **翻译完整性检查**: 无 CI 验证两种语言的 key 是否一致

## 2. 文档评估

### 2.1 README.md ✅ 良好

- 清晰定位："AI agent 技能管理桌面应用"
- 6 个核心功能列表
- 技术栈说明（React 19, Tauri v2, Rust）
- 前置条件、安装、开发命令
- 项目结构图

### 2.2 内部文档 ✅ 优秀战略文档

- `development-priorities.md` (259行): 优先级原则、阶段路线图
- `product-blueprint.md`: 产品定位、论点、核心对象模型
- `skill-manager-prd.md`: 产品需求
- `ui-design-spec.md`: 设计规范

### 2.3 缺失

- 无截图/GIF
- 无用户指南（README 面向开发者）
- 无 CONTRIBUTING.md
- 无 CHANGELOG.md
- 无 Tauri 命令 API 文档
- 无架构图

## 3. 工程基础设施评估

| 组件 | 状态 | 说明 |
|------|------|------|
| TypeScript | ✅ | 5.8.3 + tsc 构建步骤 |
| ESLint | ✅ | 含 react-hooks, typescript-eslint, prettier 集成 |
| Prettier | ✅ | .prettierrc (semi: true, printWidth: 100) |
| Vitest | ⚠️ | 已配置但仅 1 个测试文件 (i18n.test.ts) |
| Rust 测试 | ⚠️ | 仅 2 个 `#[cfg(test)]` 块 |
| CI/CD | ❌ | 无 GitHub Actions |
| Pre-commit hooks | ❌ | 无 |
| 类型自动生成 | ❌ | 手动同步 Rust↔TypeScript |
| 测试覆盖率 | ❌ | 无追踪 |
| 错误追踪 | ❌ | 无 Sentry 等 |

**评价**: 前端工具链完备（lint+format），但测试覆盖率约 1%，无 CI/CD 是最大技术债务风险。

## 4. 上一轮修复状况追踪

| 建议 | 状态 | 说明 |
|------|------|------|
| 添加引导流程 | ✅ 部分 | GuidePage 存在（24行，基础文本） |
| 添加 Error Boundary | ❌ 未修复 | 无 ErrorBoundary 组件 |
| 改善错误信息 | ❌ 未修复 | 仍为 Result<T, String>（但已添加 AppError 枚举） |
| 添加概念 tooltip | ❓ 未确认 | |
| 简化 InstallModal | ❌ 未修复 | 仍显示所有选项 |
| 添加数据缓存 | ❌ 未修复 | 仍每次 mount 重新获取 |
| 添加 Settings 页面 | ✅ 已完成 | |
| i18n 提取到文件 | ✅ 已完成 | locales/en.json + zh.json |
| 语言选择器 | ✅ 已完成 | |
| 组件拆分 | ❌ 更糟 | LibraryDetailsPanel 增长到 1000+ 行 |
| CSS 变量 | ✅ 部分 | 颜色变量存在，间距/排版缺失 |
| Discover 分类 | ❌ 未完成 | 仍为平铺列表 |
| 技能更新机制 | ❌ 未完成 | |
| 启用/禁用技能 | ❌ 未完成 | |
| 后端模块化 | ✅ 已完成 | 6 个模块 + utils |
| 结构化错误 | ✅ 部分 | AppError 枚举已定义，但转换仍靠启发式 |
| 日志 | ✅ 已完成 | tauri-plugin-log |
| 亮色主题 | ✅ 已完成 | useTheme hook |
| 无障碍 (ARIA) | ❌ 未完成 | |
| 共享 UI 组件 | ❌ 未完成 | |
| Lint/Test/CI | ✅ 部分 | ESLint+Prettier 已有，测试和 CI 缺失 |

**得分: ~10/21 已解决 (48%)，其中多数为部分修复。**

## 5. 具体未来路线图

### Phase 0: 地基稳固（1 周）

> 目标：在添加更多功能之前建立工程基础

1. **添加 GitHub Actions CI**
   - 创建 `.github/workflows/test.yml`
   - 前端: `pnpm lint` + `pnpm test` + `tsc --noEmit`
   - 后端: `cargo test`
   - PR 合并前必须通过

2. **添加 React Error Boundary**
   - 创建 `components/ErrorBoundary.tsx`
   - 包裹 App 根和每个 feature 页面
   - 提供优雅降级 UI + "重试" 按钮

3. **修复前端 Critical bugs**
   - useLayoutEffect 状态更新问题 (App.tsx:232-247)
   - useEffect 依赖数组问题 (SettingsPage.tsx:77, TargetsPage.tsx:60)
   - useTheme 三重 effect (useTheme.ts:29-47)

4. **添加基础测试**
   - 关键 hook 的单元测试: useAppBootstrap, useLibraryDetailsState, useSkillPreview
   - 工作量: ~8小时

### Phase 1: 架构修正（2 周）

> 目标：修复会随应用增长而恶化的结构性问题

5. **拆分 LibraryDetailsPanel.tsx** (1000+ 行 → 5-8 组件)
   - SkillDetailHeader.tsx — 名称、图标、状态 badge
   - SkillMetadata.tsx — 来源、作者、版本
   - InstallSection.tsx — 安装状态、操作
   - ActionBar.tsx — 主要操作按钮

6. **拆分 DiscoverPage.tsx** (593 行 → 4 组件)
   - RegistrySection.tsx — 搜索+结果
   - DiscoveryList.tsx — 分组发现列表
   - DiscoveryCandidateRow.tsx — 单条候选
   - ResolutionModal.tsx — 冲突解决

7. **useLibraryDetailsState 改用 useReducer**
   - 将 28 个 useState 合并为单个 reducer
   - 通过 `dispatch({ type: "RESET" })` 批量重置

8. **拆分 App.module.css** (1930 行 → 9 个模块文件)

9. **完善设计 token**: 间距、排版、动画时长、z-index

10. **Rust 后端**: 实现 `From<IndexError> for AppError`，添加响应大小限制，添加错误日志

### Phase 2: 核心 UX 打磨（2 周）

> 目标：打磨体验，让工具真正优于命令行管理

11. **一键智能安装**
    - InstallModal 自动选择最常用目标、Symlink 方法、项目作用域
    - "高级选项"默认折叠
    - 技能卡片上直接添加"快速安装"按钮

12. **合并 Targets 到 Settings，Guide 改为首次运行向导**
    - Settings 分区: 常规、安装位置、关于
    - Guide 仅首次运行显示

13. **修复 WCAG 对比度问题**
    - 亮色模式次级文本: `hsl(220 10% 36%)` → `hsl(220 10% 28%)`
    - 暗色模式边框: `hsl(220 14% 15%)` → `hsl(220 14% 22%)`

14. **Toast 组件迁移到 CSS 变量**

15. **添加加载骨架屏和过渡动画**

### Phase 3: 杀手级功能（3-4 周）

> 目标：构建让应用不可或缺的功能

16. **技能更新系统**
    - 后端: 比较已安装版本 vs 注册表版本
    - 前端: 导航上 "Updates Available" badge，卡片上更新按钮
    - "全部更新" 批量操作

17. **技能启用/禁用开关**
    - 后端: 重命名/移动符号链接到 `.disabled`
    - 前端: 卡片和详情面板上的开关

18. **Discover 分类与精选技能**
    - 索引 schema 添加 `category`, `tags`, `downloads`, `featured` 字段
    - 前端: 分类标签/筛选，"精选"轮播

19. **配置导出/导入**
    - 导出: 已安装技能列表 + 目标配置为 JSON
    - 导入: 从配置文件自动安装
    - 用例: 分享配置、迁移设备

20. **后端持久化模型**
    - 添加 `skill_families` 和 `exact_duplicate_groups` SQLite 表
    - 实现来源追踪（`managed_skill_origins` 表）
    - 采纳前检查 content_hash 防止重复

### Phase 4: 生产就绪（持续）

21. **Tauri 自动更新器**
22. **无障碍**: ARIA, 键盘导航, 屏幕阅读器
23. **SQLite schema 版本迁移机制**
24. **错误追踪** (Sentry)
25. **用户文档站点**
26. **pre-commit hooks**

---

## 6. 战略优先级排序

| 周次 | 阶段 | 重点 |
|------|------|------|
| 1 | Phase 0 | CI + Error Boundary + Critical bug fixes |
| 2-3 | Phase 1 | 组件拆分 + CSS 模块化 + 后端错误处理 |
| 4-5 | Phase 2 | 一键安装 + IA 重组 + WCAG 修复 |
| 6-9 | Phase 3 | 更新系统 + 启用/禁用 + 分类 + 导入/导出 |
| 10+ | Phase 4 | 自动更新 + 无障碍 + 文档 |

**为什么这个顺序**:
- Phase 0-1 修复"核心循环"中的技术债务
- Phase 2 让工具体验优于手动管理
- Phase 3 带来远程生态和差异化功能
- Phase 4 是上线和规模化的基础
