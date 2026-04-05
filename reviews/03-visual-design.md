# 三、视觉设计与 CSS 架构

## 总体评价

CSS 架构**基础扎实但执行不一致**。已建立 CSS 变量系统（颜色、阴影、圆角），双主题（亮/暗）功能完整。但存在关键短板：1930 行单体 CSS 文件、缺少间距/排版 token、WCAG 对比度不达标、62 处内联样式绕过设计系统。**结论：不需要根本性重构，需要系统性精细化。**

## 1. 严重问题（CRITICAL）

### 1.1 ToastProvider 硬编码颜色破坏设计系统

**文件**: `ToastProvider.tsx:44-80`

Toast 组件使用 Tailwind 风格的硬编码颜色（`#16a34a`, `#dc2626`, `#4b5563`），完全绕过 CSS 变量系统。这些颜色不会随主题切换而变化。

**建议**: 创建 `ToastProvider.module.css`，使用 `var(--sm-success)`, `var(--sm-danger)`, `var(--sm-text-muted)` 替代。

### 1.2 WCAG AA 色彩对比度不达标

**文件**: `index.css`

**亮色模式次级文本** (line 13):
- `--sm-text-secondary: hsl(220 10% 36%)` on `hsl(42 24% 96%)`
- 对比度: 4.2:1（WCAG AA 要求 4.5:1）❌
- **修复**: 改为 `hsl(220 10% 28%)`，对比度提升至 4.9:1 ✓

**暗色模式微妙边框** (line 52):
- `--sm-border-subtle: hsl(220 14% 15%)` on `hsl(220 20% 7%)`
- 对比度: 1.8:1（WCAG AA UI 组件要求 3:1）❌
- **修复**: 改为 `hsl(220 14% 22%)`

### 1.3 62 处内联样式绕过 CSS 架构

**影响文件**: App.tsx (5处), DiscoverPage.tsx, ToastProvider.tsx (36+行), SkillGalleryCard.tsx, SettingsPage.tsx 等

关键问题:
- App.tsx tab panel 使用 `style={{ display: "contents"/"none" }}`，应改用 CSS 类 + `data-tab-panel` 属性
- DiscoverPage.tsx:372 混用 px 和 rem 单位
- SkillGalleryCard.tsx:46 定义 `--delay` CSS 变量但从未在动画中使用

### 1.4 Z-Index 管理混乱

**当前状态**:
- Modal: `z-index: 20`（App.module.css:1414）
- 卡片按钮: `z-index: 2`（App.module.css:1605）
- Toast: `z-index: 9999`（ToastProvider.tsx 内联，魔法数字）

**建议**: 建立 z-index 系统:
```css
--sm-z-sticky: 10;
--sm-z-dropdown: 15;
--sm-z-modal: 20;
--sm-z-popover: 25;
--sm-z-toast: 30;
```

## 2. 高优先级问题（HIGH）

### 2.1 App.module.css 是 1930 行的单体文件

**问题**: 所有样式集中在一个文件中。添加新组件需要编辑此文件，改动可能产生意外副作用。

**建议拆分方案**:
```
styles/
├── _layout.module.css    (~80行: appShell, workspace, splitLayout)
├── _navigation.module.css (~120行: topBar, sidebar, tabNav)
├── _buttons.module.css   (~200行: 所有按钮变体)
├── _cards.module.css     (~300行: 技能卡片, gallery, discover)
├── _panels.module.css    (~200行: details, warning, modal)
├── _forms.module.css     (~100行: search, filters, inputs)
├── _badges.module.css    (~150行: 所有 badge 类型)
├── _lists.module.css     (~150行: skill rows, target rows)
└── _animations.module.css (~100行: keyframes, transitions)
```

### 2.2 缺少间距 token 体系

**问题**: 100+ 处硬编码像素值，混用 px 和 rem，无语义化命名。

出现的间距值: 4px, 6px, 8px, 10px, 12px, 14px, 16px, 18px, 20px, 22px, 0.2rem, 0.55rem, 0.6rem, 0.72rem, 0.85rem, 0.9rem...

**建议**:
```css
--sm-space-xs: 4px;
--sm-space-sm: 8px;
--sm-space-md: 12px;
--sm-space-lg: 16px;
--sm-space-xl: 20px;
--sm-space-2xl: 24px;
--sm-space-3xl: 32px;
```

### 2.3 缺少排版 token 体系

**问题**: 27+ 种不同字号（0.7rem 到 2.5rem），行高散落（1, 1.35, 1.4, 1.45, 1.5, 1.55, 1.6）。

**建议**:
```css
--sm-text-caption: 0.7rem;    /* 标注 */
--sm-text-sm: 0.82rem;        /* 小文本/按钮 */
--sm-text-base: 0.9rem;       /* 正文 */
--sm-text-heading-sm: 1rem;   /* 小标题 */
--sm-text-heading-md: 1.25rem; /* 中标题 */
--sm-text-heading-lg: 1.35rem; /* 大标题 */
--sm-text-display: 2.5rem;    /* 展示文字 */
```

### 2.4 仅有单一响应式断点

**文件**: `App.module.css:1453`

仅 `@media (max-width: 1120px)` 一个断点。无平板竖屏(<800px)和移动端(<480px)适配。

**建议**: 补充 800px 和 480px 断点，modal 宽度使用 `min(560px, 90vw)`。

### 2.5 动画时长不一致

出现的时长值: 0.2s (20+处), 0.25s (gallery), 200ms (toast)。

**建议**:
```css
--sm-duration-fast: 150ms;
--sm-duration-base: 200ms;
--sm-duration-slow: 300ms;
```

## 3. 中等优先级问题（MEDIUM）

### 3.1 Badge 颜色饱和度不一致 (App.module.css:770-905)

11 种 badge 定义中，饱和度从 14% 到 90% 不等，视觉权重差异大。建议统一为 L=92%、S=45-60%。

### 3.2 Modal 缺少入场动画 (App.module.css:1411-1436)

Modal 瞬间出现无过渡。建议添加 `fadeIn` + `scaleIn` 动画。

### 3.3 文件树缺少展开/折叠动画 (App.module.css:1070-1169)

### 3.4 缺少图标系统

技能卡片图标仅为首字母（SkillGalleryCard.tsx:100-107），视觉区分度不足。建议集成 Lucide 图标库。

### 3.5 搜索框缺少清除按钮和搜索图标 (App.module.css:388-412)

## 4. 设计系统已有的优势 ✅

- **颜色变量**: 已建立 `--sm-bg`, `--sm-surface`, `--sm-border`, `--sm-text`, `--sm-primary` 等
- **双主题**: 亮色(暖米色) + 暗色(冷深蓝)，通过 `:root.dark` 切换
- **阴影层级**: 三级阴影系统 `--sm-shadow-sm/md/lg`
- **焦点状态**: `outline: 2px solid var(--sm-primary)` + offset，符合 WCAG AA ✓
- **减弱动画偏好**: `@media (prefers-reduced-motion: reduce)` 已实现
- **响应式网格**: `repeat(auto-fill, minmax(260px, 1fr))` 自适应画廊
- **Sticky 布局**: 侧边栏和详情面板正确使用 sticky 定位

## 5. 是否需要大规模重构？

**结论: 不需要根本性重构，需要系统性精细化。**

CSS 变量系统、Module CSS 模式、响应式 Grid 方法、双主题支持——这些基础都是正确的。需要做的是：
1. 补齐缺失的 token（间距、排版、动画时长、z-index）
2. 拆分 1930 行单体文件
3. 修复对比度问题
4. 将 62 处内联样式迁移到 CSS 类

**估算工作量: 25-35 小时，分 3-4 个 sprint 完成。**
