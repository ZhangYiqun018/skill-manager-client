# Skill Manager Desktop Frontend Architecture Report

## Executive Summary

The Skill Manager desktop application is a **React 19 + Tauri desktop app** (~4,000 LOC in features) with a well-structured, modular architecture. The frontend implements a **sidebar-driven navigation pattern** with five primary tabs, manages complex state through custom hooks, and communicates with a Rust backend via Tauri's IPC system. The codebase demonstrates strong separation of concerns, comprehensive internationalization (English/Chinese), and a cohesive dark/light theme system with CSS variables.

---

## 1. Project Structure & Technology Stack

### Directory Layout
```
apps/desktop/src/
├── App.tsx                    # Main app shell with tab orchestration
├── main.tsx                   # React 19 entry with ToastProvider wrapper
├── index.css                  # Global design tokens & theme system
├── App.module.css             # Layout & component styles (CSS modules)
├── i18n.ts                    # Bilingual copy (EN/ZH) with 1,000+ keys
├── types/                     # TypeScript definitions
│   ├── core.ts               # Domain models (SkillItem, Installation records, etc.)
│   ├── ui.ts                 # UI state types (tabs, filters, discovery groups)
│   └── api.ts                # API response types
├── api/                       # Tauri IPC layer
│   ├── library.ts            # Skill CRUD, installs, comparisons
│   ├── discover.ts           # Disk scanning, adoption, registry search
│   ├── targets.ts            # Custom install targets
│   └── system.ts             # File operations, settings
├── hooks/                     # Custom React hooks (state & side effects)
│   ├── useAppBootstrap.ts    # Initial load + discovery report fetch
│   ├── useDiscoveryState.ts  # Adoption workflows
│   ├── useTheme.ts           # Dark/light mode persistence
│   ├── useLanguage.ts        # i18n persistence
│   ├── useSkillFilters.ts    # Search + agent/scope filters
│   ├── useSkillPreview.ts    # SKILL.md async loading with cancellation
│   └── useRemoteUpdates.ts   # Git source update checking
├── components/               # Reusable UI components
│   ├── TopBar.tsx            # Sidebar nav + quick actions + stats
│   ├── ToastProvider.tsx     # Toast notifications (context-based)
│   ├── ConfirmModal.tsx      # Confirmation dialog
│   ├── SearchField.tsx       # Input field component
│   ├── FilterPill.tsx        # Filter button component
│   └── HealthBadge.tsx       # Health status indicator
└── features/                 # Page-level components (~4,000 LOC total)
    ├── library/              # Managed skill gallery & details
    ├── discover/             # Disk discovery & adoption UI
    ├── targets/              # Install target health & repair
    ├── settings/             # Language, theme, cache info
    └── guide/                # Onboarding & help documentation
```

### Key Dependencies
- **React 19.1.0** – Component framework
- **Tauri 2.x** – Desktop bridge & IPC (`@tauri-apps/api`, `@tauri-apps/plugin-dialog`)
- **TypeScript 5.8** – Type safety
- **Vite 7.0** – Build & dev server
- **CSS Modules** – Component scoping; **no CSS-in-JS framework**
- **Fontsource** – Self-hosted fonts (Plus Jakarta Sans, IBM Plex Mono)

---

## 2. Routing & Navigation

### Navigation Model
**No traditional router; instead, tab-based single-page navigation:**

```typescript
type AppTab = "library" | "discover" | "targets" | "settings" | "guide";
```

**App.tsx (lines 34-446)** manages tab state:
- `activeTab` state controls which page renders (conditional rendering at lines 352–445)
- `TopBar` component provides navigation buttons
- No route parameters; all page state is managed via React hooks

### Pages
1. **Library** (`features/library/LibraryPage.tsx`) – Browse managed skills, grouped by family
2. **Discover** (`features/discover/DiscoverPage.tsx`) – Disk scan results, adoption UI
3. **Targets** (`features/targets/TargetsPage.tsx`) – Install target health & repair console
4. **Settings** (`features/settings/SettingsPage.tsx`) – Language, theme, cache/index paths
5. **Guide** (`features/guide/GuidePage.tsx`) – Onboarding & conceptual documentation

### Navigation Patterns
- **Quick actions** in sidebar: "Refresh Index" and "Adopt Skill" buttons
- **Health badge** is clickable → jumps to Targets tab
- **Discovery → Library flow**: After adoption, app auto-selects the new skill in Library
- **Tab-aware state**: Search queries, filters, and selections are tied to active tab

---

## 3. Component Architecture

### Hierarchy & Composition

```
App
├── TopBar (sidebar)
│   ├── Brand mark & name
│   ├── Tab navigation (5 buttons)
│   ├── Quick action buttons
│   └── Stats cards (skill count, health, theme toggle)
├── ErrorBanner (conditional)
└── Workspace (tab content)
    ├── LibraryPage
    │   ├── SearchField + FilterPills
    │   ├── SkillGallery (family groups → card rows)
    │   ├── LibraryDetailsPanel (tabs: Overview, Variants, Content, Files, Installs, Origins)
    │   └── InstallModal (skill install dialog)
    ├── DiscoverPage
    │   ├── Discovery summary stats
    │   ├── Group sections (Exact Duplicates, Variants, Unique)
    │   ├── SkillGallery (discovery cards)
    │   ├── SkillPreviewPanel (SKILL.md viewer + comparison UI)
    │   └── ResolutionModal (merge/variant creation)
    ├── TargetsPage
    │   ├── Global vs. Project target sections
    │   └── TargetCards (per target: installs, health, repair button)
    ├── SettingsPage
    │   ├── Language selector
    │   ├── Theme picker
    │   ├── Cache/index status
    │   └── Custom targets manager
    └── GuidePage
        └── Markdown-like sections (Quick Start, Library, Discover, etc.)
```

### Component Responsibilities

| Component | Lines | Purpose |
|-----------|-------|---------|
| `TopBar` | 143 | Sidebar navigation, quick actions, stats |
| `ToastProvider` | 94 | Context-based toast notifications (3s auto-dismiss) |
| `ConfirmModal` | 1,327 | Confirmation dialog wrapper |
| `SearchField` | 554 | Text input with clear button |
| `FilterPill` | 382 | Toggleable filter button |
| `HealthBadge` | 622 | Health state badge (healthy/warning/missing) |
| `LibraryPage` | ~400 | Skill gallery + details panel |
| `LibraryDetailsPanel` | Large | Tabbed details view for selected skill |
| `InstallModal` | Large | Multi-step install flow |
| `DiscoverPage` | Large | Discovery grouping + adoption UI |

### Key Patterns
- **CSS Modules for all pages/components**: No global class names; scoped styles
- **Compound components**: `LibraryDetailsPanel` has multiple tabs managed via state
- **Modal stacking**: `InstallModal` and `ConfirmModal` can appear on top of pages
- **Context providers**: `ToastProvider` at root level for non-blocking notifications
- **Conditional rendering**: Pages rendered only when tab is active (no off-DOM state preservation)

---

## 4. State Management

### Primary Patterns

#### 1. **Local Component State + useState**
Most state is component-scoped:
- `activeTab` in App
- `selectedLibrarySkill` in App
- `searchQuery`, `librarySearchQuery` in App
- Modal `open` states

#### 2. **Custom Hooks (Extraction Pattern)**
Complex logic extracted into reusable hooks:

| Hook | Responsibility |
|------|-----------------|
| `useAppBootstrap` | Initial load, index refresh, error handling |
| `useDiscoveryState` | Adoption workflows, selection management |
| `useTheme` | Theme persistence + system preference listener |
| `useLanguage` | Language persistence |
| `useSkillFilters` | Filtered skill list (search + agent/scope) |
| `useSkillPreview` | Async SKILL.md loading with cancellation |
| `useRemoteUpdates` | Git update checks |

#### 3. **Memoization via useMemo**
Heavy compute lifted to avoid re-renders:
- `indexedSkills` (App.tsx:68) – Adds health state to raw skills
- `librarySkills` (App.tsx:85) – Filters out disk skills
- `filteredSkills` (App.tsx:90) – Applies search + agent/scope filters
- `familyGroups` (LibraryPage.tsx:77) – Groups skills by family_key

#### 4. **Deferred State (useDeferredValue)**
Used in `useSkillFilters` for search debouncing:
```typescript
const deferredQuery = useDeferredValue(searchQuery);
// Prevents excessive re-filters as user types
```

#### 5. **Context API for Global State**
Only used for **ToastProvider** (notifications). No Redux or Zustand.

### State Flow Example: App Bootstrap

```
1. Component mounts → useEffect calls bootstrap()
2. bootstrap() → useAppBootstrap() calls loadLibrarySnapshot()
3. API returns IndexedScanSummary → setState updates summary + indexStatus
4. useEffect triggers reloadDiscoveryReport() → loads discovery report
5. All child components receive updated props (index, summary, discovery)
```

---

## 5. API Layer (Tauri IPC)

### Architecture
All backend communication flows through `api/` folder using Tauri's `invoke()`:

```typescript
export async function loadLibrarySnapshot(): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("load_skill_index");
}
```

### Modules
- **`api/library.ts`** – Skill management (load, refresh, install, compare, promote)
- **`api/discover.ts`** – Disk scan, adoption, registry search
- **`api/targets.ts`** – Custom target CRUD
- **`api/system.ts`** – File picker, path opener, settings

### Error Handling
- All invokes wrapped in try/catch
- Errors propagated as `Error` objects with messages
- App-level error state in `useAppBootstrap` displays banner (App.tsx:345–350)

### Type Safety
- All endpoints typed with generic `invoke<T>(...)`
- Request/response types defined in `types/core.ts`
- Strong coupling to Rust backend command names

---

## 6. Type System

### Core Domain Types (`types/core.ts`)

```typescript
// Skill models
SkillItem                      // Managed skill (extends InstalledSkill)
InstalledSkill                 // Base skill record
DiscoveryRecord                // Disk-discovered skill
ScanRoot, ScanSummary          // Index results
SkillInstallStatus             // Per-target installation state
InstallTargetRecord            // Target directory metadata

// Enums
AgentKind = "agent" | "claude_code" | "codex"
SkillScope = "global" | "project"
SkillSourceType = "disk" | "import" | "remote"
HealthState = "healthy" | "warning" | "missing"
InstallHealthState = "not_installed" | "healthy" | "copied" | "broken" | "conflict" | "missing_target"
```

### UI Types (`types/ui.ts`)

```typescript
AppTab = "library" | "discover" | "targets" | "settings" | "guide"
AgentFilter = "all" | AgentKind
DiscoveryGroupKind = "unique" | "exact_duplicate" | "variant"
DiscoveryPreset = "recommended" | "project" | "agent" | "codex" | "claude_code"
DiscoveryReport                // Discovery result with grouped candidates
```

### Type Quality
✅ **Strong typing throughout**: No `any` types; explicit error handling
✅ **Re-exported from index**: `types/index.ts` exports all types
⚠️ **Deep nesting**: Some types like `InstallTargetInventoryItem` have many optional fields

---

## 7. Styling & Design System

### CSS Architecture
- **CSS Modules** exclusively (no Tailwind, no styled-components)
- **Global design tokens** in `index.css`
- **Component styles** in `App.module.css` and per-feature `.module.css` files

### Design Tokens (Semantic Variables)
```css
:root {
  /* Colors */
  --sm-primary: hsl(205 60% 45%);
  --sm-success: hsl(145 55% 36%);
  --sm-warning: hsl(38 85% 44%);
  --sm-danger: hsl(0 65% 48%);
  --sm-text: hsl(220 18% 16%);
  --sm-border: hsl(42 12% 88%);
  
  /* Spacing & sizing */
  --sm-radius: 14px;
  --sm-radius-sm: 10px;
  
  /* Shadows */
  --sm-shadow: 0 3px 8px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03);
}

:root.dark {
  /* Dark overrides */
  --sm-bg: hsl(220 20% 7%);
  --sm-text: hsl(220 15% 94%);
  /* ... */
}
```

### Theme Implementation
- **System preference detection**: `window.matchMedia("(prefers-color-scheme: dark)")`
- **Persistent storage**: Theme saved to `localStorage` key `skill-manager.theme`
- **Three modes**: "light" | "dark" | "system"
- **Runtime switching**: Applies class to `document.documentElement` (App.tsx doesn't directly apply, done in hook)

### Visual Effects
- **Atmospheric gradient orb** (dark mode only): Animated radial gradient at 24s cycle
- **Film grain noise overlay**: Procedural SVG noise at 0.012–0.03 opacity
- **Smooth animations**: `cardEnter`, `ambientDrift` keyframes

### Responsive Design
- **2-column layout**: Sidebar (280px) + workspace (1fr)
- **Gap-based spacing**: Consistent 18–22px gaps
- **Sticky sidebar**: `position: sticky; top: 22px`
- **No media queries visible** (appears desktop-first; Tauri window is typically resizable but not mobile-optimized)

### Component Class Examples
```css
.appShell { display: grid; grid-template-columns: 280px minmax(0, 1fr); }
.topBar { display: grid; grid-template-rows: auto auto 1fr auto; position: sticky; }
.pageSection { border: 1px solid var(--sm-border); border-radius: var(--sm-radius); }
.tabButton { /* Style for inactive tab */ }
.tabButtonActive { /* Style for active tab */ }
```

---

## 8. Internationalization (i18n)

### Implementation (`i18n.ts`)
- **Two languages**: English (EN) and Chinese (Simplified, ZH)
- **Massive copy object**: ~1,000+ key-value pairs per language (332 lines per language)
- **Semantic keys**: `scanFailedTitle`, `emptyLibraryBody`, etc.

### Usage Pattern
```typescript
const text = copy[language];  // Access entire language copy object
<span>{text.adoptSkill}</span>
```

### Storage
- **Key**: `skill-manager.language` in `localStorage`
- **Default**: English if not set
- **Hook**: `useLanguage()` handles persistence

### Content Scope
- Tab labels, page titles, descriptions
- Button labels, action text
- Empty states, error messages
- Inline helper text (e.g., in TopBar tagline)
- Detailed explanations (Settings, Guide pages)

### Issues & Observations
✅ **Comprehensive coverage**: All user-facing text translated
✅ **Centralized management**: Single `Copy` type enforces keys
⚠️ **Very large file**: 1,000+ lines makes maintenance complex
⚠️ **Copy in features**: Some pages (e.g., `GuidePage.tsx`) may have embedded copy

---

## 9. Error Handling & Loading States

### Error Handling Patterns

#### 1. **App-Level Error Banner**
```typescript
{error ? (
  <section className={styles.errorBanner}>
    <strong>{text.scanFailedTitle}</strong>
    <span>{error}</span>
  </section>
) : null}
```

#### 2. **Hook-Level Error State**
- `useAppBootstrap`: Catches load/refresh errors → `error` state
- `useSkillPreview`: Catches SKILL.md load errors → `previewError` state
- `useRemoteUpdates`: Silently fails or returns empty updates

#### 3. **Try/Catch in Handlers**
```typescript
async function handleUpdateVariantLabel(path: string, variantLabel: string) {
  setError(null);
  try {
    const result = await updateManagedSkillVariantLabel(path, variantLabel);
    await applySnapshotWithDerived(result);
  } catch (updateFailure) {
    setError(updateFailure instanceof Error ? updateFailure.message : text.defaultScanError);
  }
}
```

### Loading States
- **`loading`**: Initial bootstrap
- **`refreshingIndex`**: Background refresh (shows "Refreshing..." in UI)
- **`discoveryLoading`**: Discovery report fetch
- **`previewLoadingPath`**: SKILL.md file loading
- **`updatingPath`**: Skill update in progress

### Empty States
- **No skills in Library**: Detailed empty state message with CTA
- **No discovery results**: Prompts to run disk scan
- **No targets yet**: Explains when targets will appear
- **No matches in filters**: "No skills match the current filters"

### Cancellation Handling
- **`useSkillPreview`** (lines 53–55): Cancellation flag prevents setState after unmount
- **`useAppBootstrap`** (lines 26, 40, 44, 52): Discovery request ID tracking prevents race conditions

---

## 10. Entry Point & App Shell

### `main.tsx`
```typescript
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
);
```
- **StrictMode enabled**: Helps catch issues in dev
- **ToastProvider wraps App**: Makes toast notifications globally available

### `App.tsx` – Main Component
**Responsibilities:**
1. Initialize bootstrap hook
2. Manage tab state + page selection
3. Compute derived state (indexedSkills, targets, agentCounts)
4. Render error banner or active tab
5. Handle global actions (open path, scan, promote variant)

**Key State:**
- `activeTab` – Current page
- `selectedLibrarySkillPath` / `selectedDiscoverySkillPath`
- `searchQuery` variants per tab
- `agentFilter`, `scopeFilter`
- `librarySkills`, `targets`, `healthCount`

**Prop Drilling:**
Passes ~30+ props to each page component. No context; props flow down intentionally.

---

## 11. Key Observations & Patterns

### Strengths ✅

1. **Clear separation of concerns**
   - API layer isolated from components
   - Hooks extract state logic
   - Feature folder structure mirrors UI hierarchy

2. **Strong type safety**
   - Full TypeScript, minimal `any`
   - Domain types well-defined in `core.ts`
   - API endpoints strongly typed

3. **Consistent UX**
   - Unified design tokens across CSS
   - Bilingual throughout
   - Dark/light theme support

4. **Performance optimizations**
   - `useMemo` for computed lists
   - `useDeferredValue` for search debouncing
   - Cancellation flags in async hooks

5. **Accessibility-aware**
   - Semantic HTML (`<nav>`, `<aside>`, `<section>`)
   - `aria-label` attributes
   - Focus-aware component styling

### Areas for Improvement ⚠️

1. **Prop Drilling**
   - 30+ props passed to pages
   - Could benefit from context for discovery state, filters
   - `LibraryDetailsPanel` receives many props

2. **Large Files**
   - `LibraryPage.tsx`, `DiscoverPage.tsx` >600 LOC each
   - Could split into smaller sub-components
   - `InstallModal.tsx` is very complex

3. **i18n File Size**
   - `i18n.ts` is 1,000+ lines
   - Could split by domain (library, discover, settings, etc.)
   - Maintenance burden for translations

4. **Testing**
   - No test files visible in codebase
   - Complex logic (e.g., discovery grouping) untested
   - API error scenarios not validated

5. **Error Boundaries**
   - No React Error Boundary components
   - Individual errors handled in try/catch
   - Unexpected crash scenarios not protected

6. **State Management Scalability**
   - Heavy use of useState at App level
   - If feature set grows, prop drilling becomes harder
   - No clear state normalization strategy

### Code Quality Observations

| Aspect | Status |
|--------|--------|
| **TypeScript usage** | Excellent; strict typing throughout |
| **Component naming** | Clear (e.g., `LibraryDetailsPanel`) |
| **Naming consistency** | Mostly good; some `on*` handlers, some `handle*` |
| **Comments** | Minimal; code is self-documenting |
| **Dependencies** | Minimal; only React, Tauri, fonts |
| **CSS organization** | Clean; CSS Modules prevent conflicts |
| **Hook composition** | Well-structured; single responsibility |

---

## 12. Recent Changes (Git History)

Based on recent commits:

1. **Product-led install UX** – Method toggles, dialog permissions, gallery card actions
2. **Unified InstallModal** – Agent/scope toggles; install from action row & context menu
3. **Custom install targets** – Settings CRUD with symlink installation support
4. **Right-click context menus** on library cards
5. **Copy support** for skill details

**Trend**: Expansion of install flows and target customization.

---

## 13. Architecture Diagrams

### Data Flow: App Bootstrap
```
useAppBootstrap()
  ├─ loadLibrarySnapshot() [Tauri IPC]
  │  └─ Returns IndexedScanSummary
  └─ reloadDiscoveryReport() [Tauri IPC]
     └─ Returns DiscoveryReport

App.tsx
  ├─ useMemo: indexedSkills (health state added)
  ├─ useMemo: librarySkills (filter source_type)
  ├─ useMemo: filteredSkills (search + agent/scope)
  └─ useMemo: targets (construct from skills + roots)

UI Render
  ├─ TopBar (shows skillCount, healthCount)
  ├─ LibraryPage (renders filteredSkills)
  └─ DiscoverPage (renders discoveryReport.all_groups)
```

### Component Hierarchy: Library Page
```
App
└─ LibraryPage
   ├─ SearchField + FilterPills
   ├─ Conditional rendering:
   │  ├─ EmptyState (no skills)
   │  ├─ SkillGallery
   │  │  └─ FamilyGroup[]
   │  │     └─ SkillCard[] (grouped by family)
   │  └─ LibraryDetailsPanel (if selectedSkill)
   │     ├─ OverviewTab
   │     ├─ VariantsTab
   │     ├─ ContentTab
   │     ├─ FilesTab
   │     ├─ InstallsTab
   │     └─ OriginsTab
   └─ InstallModal (conditional on open state)
```

---

## 14. Performance Considerations

### Rendering
- **Tab switching**: Entire old tab unmounts; new tab mounts (no off-DOM preservation)
- **Search debouncing**: `useDeferredValue` defers filter re-computation
- **List memoization**: Filtered skills list memoized to prevent re-renders

### Computations
- `indexedSkills` recalculates when skills or warnings change (reasonable)
- `targets` recalculates when skills change (potentially large list)
- `familyGroups` recalculates when filteredSkills change (sorting + grouping)

### Suggestions
- Consider lazy-loading large feature pages (DiscoverPage could be code-split)
- Profile discovery report rendering with many skills (1000+)
- Consider windowing/virtualization if skill lists grow very large

---

## 15. Summary Table

| Category | Finding |
|----------|---------|
| **Architecture** | Tab-based SPA; Tauri desktop wrapper |
| **State Management** | Local useState + custom hooks; no global state framework |
| **Routing** | Conditional rendering; no react-router |
| **Styling** | CSS Modules + design tokens; dark/light themes |
| **i18n** | Dual language (EN/ZH) via copy object |
| **API** | Tauri `invoke()` IPC layer; strongly typed |
| **Components** | 6 reusable UI components; 5 feature pages |
| **Hooks** | 7 custom hooks covering bootstrap, filters, themes, etc. |
| **Type Safety** | Strong; TypeScript with minimal any types |
| **Error Handling** | Try/catch + error state + error banner |
| **Testing** | Not visible; none in current codebase |
| **Performance** | Good; uses memoization & deferred values |
| **Code Quality** | High; clear naming, self-documenting code |
| **Maintainability** | Good modularity; prop drilling could improve |

---

## 16. Recommendations for Future Work

### Short Term
1. **Add React Error Boundary** around feature pages to catch unexpected crashes
2. **Extract i18n by domain** (library.i18n.ts, discover.i18n.ts) to reduce file size
3. **Create integration tests** for discovery adoption flow and skill comparison
4. **Document prop contracts** for `LibraryPage` and `DiscoverPage` (30+ props each)

### Medium Term
1. **Consider Zustand or Context API** for discovery state to reduce prop drilling
2. **Code split** discovery and settings pages if they become heavier
3. **Instrument analytics** to understand which workflows users engage with
4. **Create Storybook** for component library documentation

### Long Term
1. **Performance profiling** if skill counts exceed 1000+
2. **Keyboard shortcuts** for power users (adopt, refresh, search)
3. **Skill comparison visualization** (side-by-side diffs with syntax highlighting)
4. **Multi-select & batch operations** beyond current adoption workflow

---

## Conclusion

The Skill Manager frontend is a **well-architected, type-safe React application** with strong fundamentals. The Tauri integration is clean, the component hierarchy is logical, and the styling system is cohesive. The main areas for growth are **reducing prop drilling** (via context), **test coverage**, and **managing scale** as the feature set expands. The codebase demonstrates proficiency in React patterns and is positioned well for maintenance and extension.
