# 一、前端架构与组件质量

## 1. 严重问题（CRITICAL）

### 1.1 App.tsx:232-247 — useLayoutEffect 中不安全的状态更新

**严重性**: CRITICAL

`useLayoutEffect` 中通过 `eslint-disable` 绕过了 React hooks 规则，在 effect 中根据 prop 比较来 setState。依赖数组同时包含源（`selectedLibrarySkill`）和派生状态（`selectedLibrarySkillPath`），存在无限循环风险。

**建议**: 改用 `useEffect`，依赖数组简化为 `[selectedLibrarySkill?.path, selectedDiscoverySkill?.path]`。

### 1.2 SettingsPage.tsx:77 — useEffect 依赖数组中包含非原始值

**严重性**: CRITICAL

`[language, text.defaultScanError]` 中 `text.defaultScanError` 在每次渲染时都是新引用（因为 `text` 由 `copy[language]` 创建），导致 effect 在每次渲染时都执行，造成不必要的 API 调用。

**建议**: 依赖数组改为 `[language]`。

### 1.3 TargetsPage.tsx:60 — 同样的依赖数组反模式

**严重性**: CRITICAL

与 SettingsPage 相同的问题，从 SettingsPage 复制粘贴而来。

**建议**: 依赖数组改为 `[language]`。

### 1.4 useTheme.ts:29-47 — 三重 useEffect 重复调用 applyTheme

**严重性**: HIGH

`applyTheme()` 在 `themeMode` 变化时被三个独立的 useEffect 各调用一次。Effect 1 保存并应用主题，Effect 2 监听系统主题变化，Effect 3 又重复应用一次。造成不必要的 DOM 操作和可能的视觉闪烁。

**建议**: 合并为两个 effect：一个处理持久化+应用，一个处理系统主题监听。删除 Effect 3。

---

## 2. 高优先级问题（HIGH）

### 2.1 App.tsx:278-309 — DOM 查询无空值保护

**严重性**: HIGH

键盘处理函数中 `document.querySelectorAll("[role='tab']")` 在组件挂载前可能返回空列表。虽然使用了可选链 `?.focus()`，但假设了特定的 DOM 结构。且 `activeTab` 在依赖数组中导致每次切换 tab 都重新绑定事件监听。

**建议**: 使用 `Array.from()` 包装查询结果，添加 `if (nextButton)` 防御性检查。

### 2.2 LibraryDetailsPanel.tsx — 407 行巨型组件

**严重性**: HIGH

该组件接收 23 个 props，使用 `useLibraryDetailsState` hook 管理 40+ 个状态变量。同时处理 tab 切换、variant 管理、文件浏览、安装追踪、来源/历史查看等多重职责。

**建议**: 提取为"Details Shell"组件 + 各 tab 独立容器组件（VariantsTabContainer, InstallsTabContainer 等）。

### 2.3 useLibraryDetailsState.ts:63-92 — 28 个连续 setState 调用

**严重性**: HIGH

技能切换时在单个 useEffect 中执行 28 个独立的 `setState` 调用。虽然 React 会批量更新，但仍然低效且难以维护。

**建议**: 改用 `useReducer`，通过单个 `dispatch({ type: "RESET", payload: ... })` 完成状态重置。

### 2.4 DiscoverPage.tsx — 593 行单体组件

**严重性**: HIGH

593 行的页面组件内部嵌套定义了 4 个子组件（SourceConfig, DiscoverySection, DiscoveryCandidateRow, ResolutionModal），包含 15 个状态变量和 6 个异步处理函数。

**建议**: 拆分为独立文件：RegistrySection.tsx, DiscoveryList.tsx, DiscoveryGroup.tsx, ResolutionModal.tsx，以及 useDiscoveryResolution.ts hook。

---

## 3. 中等优先级问题（MEDIUM）

### 3.1 App.tsx:66-81 — 低效的警告数计算

O(n*m) 复杂度，为每个 skill 遍历所有 warnings。应使用 Map 预计算 warning 查找表。

### 3.2 InstallModal.tsx:27-35 — 静默吞掉所有错误

`catch {}` 中的注释说"某些环境阻止弹窗，忽略"，但过于宽泛，合法错误也被吞掉。

### 3.3 LibraryPage.tsx:126-151 — 全局事件监听使用捕获阶段

上下文菜单使用 `window.addEventListener("click", handler, { capture: true })`，可能干扰其他代码。滚动监听缺少 `passive` 标志。

### 3.4 ToastProvider.tsx:29 — 弱 ID 生成

`Date.now()-Math.random()` 在同一毫秒内创建两个 toast 时可能碰撞。建议使用 `crypto.randomUUID()` 或计数器。

### 3.5 App.tsx:259-314 — 硬编码键盘快捷键

Tab 数组在 267 行和 296 行重复定义。快捷键散落在组件内部，无法集中管理或文档化。

### 3.6 App.tsx:316-334 — 类型守卫不够严格

`skill is SkillItem` 类型守卫仅检查 `source_type`，但 SkillItem 还要求 `health_state` 和 `warning_count` 属性。

### 3.7 DiscoverPage.tsx:517-524 — 类型强制转换

用展开运算符添加 `health_state` 和 `warning_count` 绕过了 TypeScript 类型检查。应创建工厂函数。

### 3.8 App.tsx:66-214 — 过度 memoization

8 个 `useMemo` 形成链式依赖，增加复杂度但未必带来性能收益。建议先 profiling 再决定是否保留。

### 3.9 SettingsPage.tsx:215-234 — 注册表 URL 保存存在竞态条件

onChange 立即更新状态，onBlur 保存。快速输入可能导致保存旧值。无防抖、无验证、无加载状态。

### 3.10 useSkillPreview.ts:58 — 依赖数组包含自身修改的状态

`[activePreviewSkill, previewCache]` 中 `previewCache` 在 effect 内部被更新，形成反馈循环。应改为 `[activePreviewSkill?.skill_md]`。

---

## 4. 低优先级问题（LOW）

### 4.1 TargetsPage.tsx:189-196 — 每次渲染重复计算 attentionItems

### 4.2 LibraryPage.tsx:82-109 — language 变化触发不必要的全量重排序

---

## 5. 总结

| 类别 | 数量 |
|------|------|
| Critical | 3 |
| High | 4 |
| Medium | 10 |
| Low | 2 |

**最需要立即修复**: useLayoutEffect 状态更新、useEffect 依赖数组问题、useTheme 重复调用。
**架构层面需要重构**: LibraryDetailsPanel (407行) 和 DiscoverPage (593行) 的组件拆分、useLibraryDetailsState 改用 useReducer。
