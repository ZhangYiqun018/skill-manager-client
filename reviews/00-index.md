# Skill Manager Client — 第二轮深度审阅报告

> 审阅日期：2026-04-05
> 审阅方式：5 Agent 并行深度审阅（前端架构、Rust 后端、视觉设计、UX 产品、基础设施与路线图）
> 项目阶段：初期重构阶段

---

## 报告索引

| # | 报告 | 核心发现 |
|---|------|----------|
| 1 | [前端架构与组件质量](./01-frontend.md) | useLayoutEffect 不安全状态更新、依赖数组反模式（SettingsPage/TargetsPage 无限循环）、useMemo 链式依赖、28 个 setState 应迁移至 useReducer |
| 2 | [Rust 后端与 Tauri 命令](./02-rust-backend.md) | 架构评分 9/10；error_chain 字符串匹配脆弱、search_skills_registry 无响应大小限制、symlink 遍历安全风险、CSP 已禁用 |
| 3 | [视觉设计与 CSS 架构](./03-visual-design.md) | 1930 行单体 CSS 需拆分、缺少间距/排版 token、WCAG 对比度不达标（亮色 4.2:1 / 暗色 1.8:1）、62 处内联样式绕过设计系统 |
| 4 | [用户体验与产品完整性](./04-ux-product.md) | 产品成熟度 v0.9（UX 6.9/10）；新手引导 5/10、错误处理 5/10 是最大短板；InstallModal 流程需简化；Discover 缺少分类/推荐 |
| 5 | [工程基础设施与路线图](./05-infra-roadmap.md) | i18n 翻译系统生产级；零测试/零 lint/零 CI；Round 1 建议完成率 48%；提供 4 阶段具体路线图 |

---

## 跨领域关键发现

### CRITICAL（必须立即修复）

1. **SettingsPage:77 / TargetsPage:60 — useEffect 依赖数组导致无限重渲染**
   - `[language, text.defaultScanError]` 中 `text` 每次渲染重新创建 → 无限循环
2. **App.tsx:232-247 — useLayoutEffect 中 eslint-disable 绕过 hooks 规则**
   - 条件性 setState 在 layout effect 中，违反 React 并发模式安全保证
3. **useSkillPreview.ts:58 — previewCache 在依赖数组中创建反馈循环**
4. **tauri.conf.json:24 — CSP 设置为 null，XSS 防护完全关闭**

### HIGH（本迭代应处理）

5. **App.module.css 1930 行单体文件** → 拆分为 ~9 个模块文件
6. **ToastProvider 硬编码颜色** → 接入 CSS 变量系统
7. **index.css 对比度不达标** → 亮色 `--sm-text-secondary` 需提升至 4.5:1+
8. **useLibraryDetailsState 28 个 setState** → 迁移至 useReducer
9. **search_skills_registry 无响应大小限制** → 添加分页或截断
10. **scan.rs symlink follow_links(true)** → 添加路径边界检查

### 结论

项目架构基础良好，后端模块化重构到位（9/10），前端组件拆分初见成效。**不需要大规模重构**，但需要：
- 立即修复 4 个 CRITICAL 级 React hooks 问题（影响运行时稳定性）
- 系统性补全 CSS token（间距、排版）并拆分单体 CSS
- 建立最小工程基础设施（ESLint + Vitest + 基础 CI）
- 按路线图逐步完善 UX（新手引导、错误恢复、Discover 分类）

详细修复建议和代码示例请参阅各子报告。
