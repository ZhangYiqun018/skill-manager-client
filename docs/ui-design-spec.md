# Skill Manager UI Design Specification

> Version: 0.1 | Date: 2026-04-03 | Status: Approved
> Based on: `docs/skill-manager-prd.md` v0.1
> Source: Multi-agent design review (IA / State / Visual / Frontend)

---

## 1. Design Philosophy

UI is a visualization of functionality. Every visual element must correspond to a product concept defined in the PRD.

Core mental model for the UI:

```
Discover → Adopt → Install → Sync → Repair
```

Four data layers drive four visual states:

| PRD Concept | Visual State | Color |
|---|---|---|
| Candidate | Discovered, pending decision | Amber `#f59e0b` |
| Managed Library Item | Stored in canonical library | Violet `#8b5cf6` |
| Install Target (healthy) | Symlink active and valid | Green `#22c55e` |
| Install Target (broken) | Symlink broken or missing | Red `#ef4444` |

---

## 2. Information Architecture

### 2.1 Navigation: Top Tab Bar

```
+==================================================================+
|  [S] Skill Manager  | Library | Discover | Targets | Settings  | EN | 中文 |
+==================================================================+
```

Why top tabs, not sidebar:

1. Only 4 top-level areas — sidebar adds unnecessary depth
2. Desktop window width is limited (max 1320px) — tabs save horizontal space
3. PRD flow is linear (Discover→Repair) — left-to-right tab order mirrors the flow
4. Consistent with current implementation — lowest migration cost

### 2.2 Tab-to-PRD Mapping

| Tab | PRD Section | Purpose |
|---|---|---|
| **Library** | 18.1 | Unified managed skill inventory — browse, search, inspect, install |
| **Discover** | 18.2 | Find skills — disk scan, local import, skills.sh remote |
| **Targets** | 18.3 | Install target health — symlink status, sync, repair |
| **Settings** | 18.4 | Preferences — language, cache, storage |

### 2.3 Global Elements

| Element | Location | Function |
|---|---|---|
| Global search | TopBar center | Cross-library keyword search |
| Health badge | TopBar right (before language) | Broken link count indicator, click → Targets |
| Language switch | TopBar far right | EN / 中文 toggle |

---

## 3. Page Designs

### 3.1 Library Tab — Master-detail Split Layout

```
+==================================================================+
|  Library                                                          |
|  [搜索 skill...]          [Agent▼] [Scope▼] [Source▼] [+导入]   |
|  Showing 12 managed skills                                       |
+==================================================================+
|  Left: Skill List          |  Right: Detail Panel                 |
|                            |                                      |
|  [managed] skill-a   [OK]  |  skill-a                            |
|  [managed] skill-b   [OK]  |  Description, source, timestamps    |
|  [managed] skill-c   [--]  |                                      |
|                            |  [Install to...] [Sync Links]       |
|                            |                                      |
|                            |  SKILL.md Preview                   |
|                            |  ┌──────────────────────────────┐   |
|                            |  | ---                           |   |
|                            |  | name: skill-a                 |   |
|                            |  | description: ...              |   |
|                            |  | ---                           |   |
|                            |  └──────────────────────────────┘   |
|                            |                                      |
|                            |  [Open in Finder] [Uninstall]       |
+==================================================================+
```

**Functional elements:**

| Element | Function | Interaction |
|---|---|---|
| Search bar | Filter by name/description | Real-time filtering |
| Filter pills | Agent / Scope / Source / Install status | Click to toggle, compose filters |
| Skill list | Browse managed skills only (candidates shown in Discover tab) | Click to select, see detail |
| Left color stripe | State indicator per row | Green=healthy, Red=broken |
| Detail panel | Full metadata + targets + preview | Always visible for selected skill |
| Install targets section | Show symlink health per target | Click target to see status, repair |
| SKILL.md preview | Read-only content view | Scrollable, monospace font |

**Data source:** Managed library index (`~/.skill-manager/store/`) + live symlink checks

**User actions:** Search, filter, select, install, uninstall, sync, open in Finder

---

### 3.2 Discover Tab — Three-entry Discovery

```
+==================================================================+
|  Discover                                                         |
|  +---Scan Disk--------+  +---Import Folder--+  +---Remote Search-+|
|  | [disk icon]        |  | [folder icon]    |  | [Search skills.sh...]|
|  | Scan Disk          |  | Import Folder    |  |                     |
|  | Last scan: 2h ago  |  |                  |  |                     |
|  | [Start Scan]       |  | [Choose Folder]  |  |                     |
|  +--------------------+  +------------------+  +---------------------+|
|                                                                   |
|  Candidate List (shown after scan/import/search)                 |
|  ☐ skill-a  [Codex] [Global]  ~/.codex/skills/skill-a           |
|  ☑ skill-b  [Claude Code] [Global] ~/.claude/skills/...         |
|  ☑ skill-c  [Claude Code] [Project] ~/code/app/.agents/...      |
|  [Select All]  [Adopt Selected (2)]                              |
|                                                                   |
|  Adopt: Skill copied into canonical managed store (~/.skill-manager/store/)               |
|  Original folders remain untouched until user explicitly              |
|  replaces them with symlinks via the Targets tab.                  |+==================================================================+
```

**Functional elements:**

| Element | Function | Interaction |
|---|---|---|
| Scan Disk card | Trigger full-disk discovery | Button → scanning state |
| Import Folder card | Import local skill folder | System file picker → validate → import |
| Remote Search | Search skills.sh registry | Type → instant search results |
| Candidate list | Review discovered/downloaded skills | Checkbox multi-select |
| Adopt options | Choose adoption behavior | Radio/checkbox, explicit destructive action |

**Data source:** Disk scan (Tauri backend), file picker (OS dialog), skills.sh API

**User actions:** Scan, import, search, select, adopt, download

---

### 3.3 Targets Tab — Health Dashboard

```
+==================================================================+
|  Targets                              [Sync All] [Repair All]    |
|  Total: 4 | Healthy: 3 | Broken: 1                              |
+==================================================================+
|  GLOBAL TARGETS                                                   |
|  ┌─ Codex (~/.codex/skills) ─────────────────────────────────┐   |
|  │ frontend-design  → managed  [OK]   3 min ago              |   |
|  │ code-review      → managed  [OK]   3 min ago              |   |
|  └────────────────────────────────────────────────────────────┘   |
|  ┌─ Claude Code (~/.claude/skills) ──────────────────────────┐   |
|  │ skill-optimizer  → managed  [OK]   3 min ago              |   |
|  │ frontend-design  → MISSING  [!!]   ---        [Repair]    |   |
|  └────────────────────────────────────────────────────────────┘   |
|  PROJECT TARGETS                                                  |
|  ┌─ ~/code/app (.agents/skills) ─────────────────────────────┐   |
|  │ code-review      → managed  [OK]   1 hr ago               |   |
|  └────────────────────────────────────────────────────────────┘   |
+==================================================================+
```

**Functional elements:**

| Element | Function | Interaction |
|---|---|---|
| Summary bar | Aggregate health stats | Static display, filter context |
| Target groups | Organize by Global/Project | Collapsible sections |
| Link rows | Individual symlink status | Click broken → repair |
| Sync/Repair All | Batch operations | Confirm dialog → progress |
| Per-row Repair | Fix single broken link | One-click repair |
| Last sync time | Recency indicator | Relative time ("3 min ago") |

**Data source:** Live symlink validation against managed library

**User actions:** Sync all, repair all, repair single, sync single, open directory

---

### 3.4 Settings Tab

```
+==================================================================+
|  Settings                                                         |
|  +---General-----------+  +---Scan & Cache-------------------+  |
|  | Language             |  | Index Status                     |  |
|  | (EN) 中文            |  | Last scan: 2026-04-03 14:32      |  |
|  |                      |  | [Refresh Index] [Clear Cache]    |  |
|  +----------------------+  |                                   |  |
|                            |  Discovery Scope                  |  |
|                            |  [x] ~/.codex/skills/             |  |
|                            |  [x] ~/.claude/skills/            |  |
|                            |  [x] .agents/skills/              |  |
|                            +-----------------------------------+  |
+==================================================================+
```

---

## 4. State Design

### 4.1 State Transition Map

```
                    +------------------+
          +-------->| 1. Empty State   |<---------+
          |         +------------------+          |
          |          |  Scan Disk                    |
          |          |  Import Folder                |
          |          v                               |
          |   +------------------+   skip     +------+------+
          |   | 2. First-run     +---------->| 5. Library  |
          |   |    Onboarding    |           +------+------+
          |   +------------------+                  ^
          |          |  Scan Now                     |
          |          v                               |
          |   +------------------+   adopt           |
          +-- | 3. Scanning      +---------+        |
              +------------------+         |        |
                   |  complete             |        |
                   v                       v        |
              +------------------+   +----+--+      |
              | 4. Candidate     |   | 9.    |      |
              |    Review        |   | Down- +------+
              +------------------+   | load/ |
                   |                 | Install|
                   +--------+------->+Progress|
                            |        +---+---+
                            v            v
                   +------------------+   +------------------+
                   | 6. Install       |   | 7. Broken-link   |
                   |    Target Health +-->|    Repair        |
                   +------------------+   +------------------+
                                                       |
                   +------------------+                |
                   | 8. Import        |<---------------+
                   |    Validation    |
                   |    Failure       |
                   +------------------+
```

### 4.2 State Details

#### State 1: Empty State

**Trigger:** App opens with no cache and no managed skills.

```
     +-----------------------------------------------------------+
     |              [icon: open folder with magnifier]            |
     |                                                           |
     |           No skills found yet                             |
     |                                                           |
     |   Skill Manager scans your disk for existing AI agent     |
     |   skills and helps you manage them in one place.          |
     |                                                           |
     |   [Scan Disk]  [Import Folder]                            |
     |   [Search skills.sh]  [Watch Quick Tour]                  |
     |                                                           |
     |   Supported: Codex skills, Claude Code skills,            |
     |   .agents/skills/*, .claude/skills/*                      |
     +-----------------------------------------------------------+
```

**Transitions:** Scan Disk → State 3 | Import Folder → State 8/4 | Search → Discover tab

---

#### State 2: First-run Onboarding

**Trigger:** First launch, no `onboarding_complete` flag.

3-step wizard: (1) Scan disk → (2) Review results → (3) Set default targets

**Key:** Onboarding hides tab navigation. Only brand + language visible.

**Transitions:** Scan Now → State 3 → Step 2 → Review & Adopt → State 4

---

#### State 3: Scanning State

**Trigger:** Full-disk scan initiated.

```
|  Scanning disk...                                        [Cancel] |
|                                                                   |
|  Phase: Classifying skills...                                  |
|  ┌─────────────────────────────────────────────────────────────┐   |
|  │ █████████████████████░                                 │   |
|  │ Discovering    ██████████    Classifying    ████████    Writing index │   |
|  └─────────────────────────────────────────────────────────────┘   |
|                                                                   |
|  Found: 14 skills                                              |
|  (progress is phased, no precise percentage in MVP)                  |
```

**Key:** Cancel preserves already-discovered results. Progress is phased (Discovering → Classifying → Writing index), with no precise percentage in MVP.

**Transitions:** Complete → State 4 | Cancel → State 4 (with partial results)

---

#### State 4: Candidate Review

**Trigger:** Scan complete with results.

```
|  Scan complete: 14 candidates found                    [Rescan]   |
|  [x] Select All                        [Adopt Selected (3)]       |
|  [x] skill-optimizer   [Claude Code] [Global]   [new]            |
|  [x] commit            [Claude Code] [Global]   [new]            |
|  [ ] frontend-design   [Codex] [Global]                           |
|  ... 11 more                                                       |
|  Adopt: Skill copied into canonical managed store (~/.skill-manager/store/)```

**Transitions:** Adopt → State 9 (progress) → State 5 | Rescan → State 3

---

#### State 5: Managed Library

**Trigger:** Library has managed items. **This is the default main view.**

See Section 3.1 Library Tab for full layout.

**Transitions:** Install → State 9 | Broken link detected → State 7 | Import → Discover

---

#### State 6: Install Target Health

**Trigger:** Targets tab opened. See Section 3.3 Targets Tab.

**Transitions:** Click broken → State 7 | Sync/Repair → State 9

---

#### State 7: Broken-link Repair

**Trigger:** Broken symlink detected.

```
|  Repair broken links                                   [Close]   |
|  [!] 1 broken link detected                                        |
|  [x] frontend-design                                               |
|      Target:  ~/.claude/skills/frontend-design                     |
|      Expected: ~/.skill-manager/store/frontend-design              |
|      Actual:   symlink target missing (file not found)             |
|      [Repair link]  [Uninstall]                                    |
|  [Repair Selected]  [Repair All (1)]                               |
```

**Key:** Shows Expected vs Actual comparison. Repair is idempotent.

**Transitions:** Repair → progress → State 6 | Close → State 6

---

#### State 8: Import Validation Failure

**Trigger:** Selected folder lacks SKILL.md.

```
|  [x] Validation Error                                              |
|  The selected folder does not contain a valid skill:               |
|    /Users/you/Downloads/my-toolkit                                 |
|  Missing: SKILL.md                                                 |
|  A valid skill directory must contain at least:                    |
|    - SKILL.md (required)                                           |
|    - Optional: scripts, templates, assets                          |
|  [Choose Different Folder]  [Create SKILL.md]                      |
```

**Transitions:** Choose Different → file picker | Create SKILL.md → external editor

---

#### State 9: Download / Install Progress

**Trigger:** Any write operation (adopt, install, sync, repair, download).

```
|  Installing "frontend-design"                             [Cancel] |
|                                                                   |
|  Phase: Downloading...                                               |
|  █████████████████████░                                         |
|                                                                   |
|  Phase: Installing to targets...                                    |
|  ███████████░                                                    |
|                                                                   |
|  Results:                                                       |
|  [OK]  ~/.codex/skills/frontend-design                              |
|  [...] ~/.claude/skills/frontend-design                             |
|  [  ]  ~/code/app/.agents/skills/frontend-design                    |
```

**Key:** Single item failure does not block others. Progress is phased (no precise percentage in MVP). Cancel only cancels pending items.

**Transitions:** Complete → State 5 or State 6 | Cancel → State 5 (keep completed)

---

## 5. Visual Design System

### 5.1 Color System

```css
:root {
  /* ─── Brand & Accent ─── */
  --color-accent: #3b82f6;
  --color-accent-hover: #2563eb;
  --color-accent-muted: rgba(59, 130, 246, 0.18);
  --color-accent-border: rgba(59, 130, 246, 0.36);
  --color-accent-glow: rgba(59, 130, 246, 0.25);

  /* ─── State Colors ─── */
  --color-candidate: #f59e0b;
  --color-candidate-muted: rgba(245, 158, 11, 0.15);
  --color-candidate-text: #fcd34d;

  --color-managed: #8b5cf6;
  --color-managed-muted: rgba(139, 92, 246, 0.15);
  --color-managed-text: #c4b5fd;

  --color-installed: #22c55e;
  --color-installed-muted: rgba(34, 197, 94, 0.15);
  --color-installed-text: #86efac;

  --color-error: #ef4444;
  --color-error-muted: rgba(239, 68, 68, 0.15);
  --color-error-text: #fca5a5;

  --color-missing: #6b7280;
  --color-missing-muted: rgba(107, 114, 128, 0.15);
  --color-missing-text: #9ca3af;

  --color-scanning: #38bdf8;
  --color-scanning-muted: rgba(56, 189, 248, 0.15);
  --color-scanning-text: #7dd3fc;

  --color-warning: #f59e0b;
  --color-warning-muted: rgba(245, 158, 11, 0.15);
  --color-warning-text: #fcd34d;

  /* ─── Agent Brand Colors ─── */
  --color-codex: #f97316;
  --color-codex-muted: rgba(251, 146, 60, 0.18);
  --color-codex-text: #fed7aa;

  --color-claude: #3b82f6;
  --color-claude-muted: rgba(59, 130, 246, 0.18);
  --color-claude-text: #bfdbfe;

  /* ─── Background Layers ─── */
  --color-bg-base: #0a0d12;
  --color-bg-base-deep: #06080c;
  --color-bg-panel: rgba(11, 15, 21, 0.92);
  --color-bg-card: rgba(255, 255, 255, 0.03);
  --color-bg-hover: rgba(255, 255, 255, 0.06);
  --color-bg-inactive: rgba(255, 255, 255, 0.04);
  --color-bg-overlay: rgba(0, 0, 0, 0.6);
  --color-bg-code: rgba(5, 8, 12, 0.84);

  /* ─── Borders ─── */
  --color-border-default: rgba(255, 255, 255, 0.08);
  --color-border-subtle: rgba(255, 255, 255, 0.05);
  --color-border-focus: rgba(59, 130, 246, 0.45);

  /* ─── Text ─── */
  --color-text-primary: #f8fafc;
  --color-text-secondary: rgba(226, 232, 240, 0.7);
  --color-text-tertiary: rgba(248, 250, 252, 0.36);
  --color-text-label: #94a3b8;
  --color-text-code: #dbeafe;
  --color-text-error: #fecaca;
  --color-text-badge: #cbd5e1;
  --color-text-accent: #eff6ff;
}
```

**Color rationale:**

| Color | Why |
|---|---|
| Accent Blue | Professional desktop tool feel, high contrast on dark bg |
| Candidate Amber | "Pending attention" — warm contrast to cool blues |
| Managed Violet | "Stored, organized" — neutral between warm and cool |
| Installed Green | Universal health/success semantics |
| Codex Orange | High recognition, contrasts with Claude Blue |
| Claude Blue | Claude brand identity |
| Missing Gray | "Absence" not "error" — neutral, not alarming |

### 5.2 Spacing System

```css
:root {
  --space-1: 4px;    /* icon-text gap, badge padding */
  --space-2: 8px;    /* component inner gap */
  --space-3: 12px;   /* standard component padding */
  --space-4: 14px;   /* section inner gap */
  --space-5: 16px;   /* region gap */
  --space-6: 18px;   /* page horizontal padding */
  --space-7: 24px;   /* large region gap */
  --space-8: 32px;   /* modal padding */
  --space-9: 48px;   /* page-level spacing */
}
```

Base unit: 4px — aligns to pixel grid, matches current codebase patterns.

### 5.3 Border Radius

```css
:root {
  --radius-sm: 6px;     /* badges, small tags */
  --radius-md: 10px;    /* buttons, inputs, rows, pills */
  --radius-lg: 12px;    /* panels, cards */
  --radius-xl: 16px;    /* modals, dialogs */
  --radius-full: 999px; /* pill badges, status dots */
}
```

Principle: deeper/larger containers get larger radius (6 → 10 → 12 → 16).

### 5.4 Typography

```css
:root {
  --font-sans: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
  --font-mono: "IBM Plex Mono", "SFMono-Regular", monospace;

  --text-h1: 1.5rem;       --text-h1-lh: 1.3;   --text-h1-w: 700;
  --text-h2: 1.25rem;      --text-h2-lh: 1.35;  --text-h2-w: 600;
  --text-h3: 1.05rem;      --text-h3-lh: 1.35;  --text-h3-w: 600;
  --text-h4: 0.98rem;      --text-h4-lh: 1.4;   --text-h4-w: 600;
  --text-body: 0.9rem;     --text-body-lh: 1.6; --text-body-w: 400;
  --text-body-sm: 0.88rem; --text-body-sm-lh: 1.4; --text-body-sm-w: 400;
  --text-caption: 0.84rem; --text-caption-lh: 1.55; --text-caption-w: 400;
  --text-label: 0.82rem;   --text-label-lh: 1.55; --text-label-w: 400;
  --text-overline: 0.72rem; --text-overline-lh: 1.3; --text-overline-w: 500;
  --text-overline-spacing: 0.12em;
  --text-badge: 0.76rem;   --text-badge-lh: 1.2; --text-badge-w: 500;
}
```

### 5.5 Shadows & Motion

```css
:root {
  --shadow-panel: 0 14px 36px rgba(0, 0, 0, 0.28);
  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-overlay: 0 24px 48px rgba(0, 0, 0, 0.4);

  --duration-fast: 150ms;    /* hover, tooltip */
  --duration-normal: 200ms;  /* standard transitions */
  --duration-slow: 300ms;    /* panel expand, tab switch */
  --duration-scan: 1500ms;   /* scanning pulse animation */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);

  --z-base: 0;
  --z-panel: 10;
  --z-sticky: 20;
  --z-overlay: 100;
  --z-modal: 200;
  --z-toast: 300;

  --control-height: 40px;
  --control-padding-x: 0.95rem;
  --control-padding-y: 0.7rem;
}
```

### 5.6 Component Variants

#### Buttons

| Variant | Background | Text | Use |
|---|---|---|---|
| **Primary** | `linear-gradient(135deg, #3b82f6, #2563eb)` | `#eff6ff` | Main actions: Scan, Install, Adopt |
| **Secondary** | `rgba(255,255,255,0.04)` + border | `rgba(241,245,249,0.75)` | Open Folder, Clear, Cancel |
| **Danger** | `rgba(239,68,68,0.15)` + red border | `#fca5a5` | Uninstall, Delete |
| **Ghost** | transparent | `rgba(226,232,240,0.7)` | Icon buttons, inline actions |

#### Badges

| Type | Background | Text | Example |
|---|---|---|---|
| Agent: Claude | `rgba(59,130,246,0.18)` | `#bfdbfe` | [Claude Code] |
| Agent: Codex | `rgba(251,146,60,0.18)` | `#fed7aa` | [Codex] |
| Scope: Global | `rgba(139,92,246,0.15)` | `#c4b5fd` | [Global] |
| Scope: Project | `rgba(56,189,248,0.15)` | `#bae6fd` | [Project] |
| Status: Healthy | `rgba(34,197,94,0.15)` | `#86efac` | [OK] |
| Status: Broken | `rgba(239,68,68,0.15)` | `#fca5a5` | [!!] |
| Status: Missing | `rgba(107,114,128,0.15)` | `#9ca3af` | [--] |
| State: Candidate | `rgba(245,158,11,0.15)` | `#fcd34d` | [Candidate] |
| State: Managed | `rgba(139,92,246,0.15)` | `#c4b5fd` | [Managed] |
| Source: Disk | `rgba(255,255,255,0.07)` | `#cbd5e1` | [Disk] |
| Source: Import | `rgba(245,158,11,0.15)` | `#fcd34d` | [Import] |
| Source: Remote | `rgba(99,102,241,0.15)` | `#a5b4fc` | [Remote] |

#### Skill Row States

| State | Left Border | Opacity | Badge |
|---|---|---|---|
| Default (unselected) | none | 1.0 | — |
| Selected | `3px solid rgba(59,130,246,0.36)` + blue bg tint | 1.0 | — |
| Candidate | `3px solid #f59e0b` | 1.0 | [Candidate] amber |
| Broken | `3px solid #ef4444` | 1.0 | [!!] red + Repair button |
| Missing | `3px solid #6b7280` | 0.6 | [--] gray |
| Scanning | `3px solid #38bdf8` + pulse animation | 1.0 | Loader icon |

---

## 6. Frontend Architecture

### 6.1 Component Tree

```
App
├── AppProvider                    // Global Context shell
│   ├── AppShell                   // Layout grid + error banner
│   ├── TopBar                     // Brand + TabNav + LanguageSwitch
│   │   ├── BrandMark
│   │   ├── TabNav
│   │   ├── HealthBadge            // Broken link count indicator
│   │   └── LanguageSwitch
│   │
│   ├── [Library Tab]
│   │   └── LibraryPage
│   │       ├── LibraryToolbar     // Search + filters + Import button
│   │       ├── FilterStrip        // Agent / Scope / Source / Health pills
│   │       ├── InlineSummary      // "Showing X of Y skills"
│   │       └── SplitLayout
│   │           ├── SkillListPanel
│   │           │   ├── EmptyState
│   │           │   └── SkillRow[]
│   │           └── SkillDetailsPanel
│   │               ├── DetailHeader
│   │               ├── DetailDescription
│   │               ├── DetailActions
│   │               ├── MetaGrid
│   │               ├── InstallTargetsSection
│   │               │   └── InstallTargetRow[]
│   │               └── SkillPreview
│   │
│   ├── [Discover Tab]
│   │   └── DiscoverPage
│   │       ├── DiscoverToolbar    // Scan + Import + Remote search
│   │       ├── DiscoverSplitLayout
│   │       │   ├── CandidateListPanel
│   │       │   │   ├── CandidateFilterBar
│   │       │   │   └── CandidateRow[]
│   │       │   └── CandidateDetailsPanel
│   │       │       ├── CandidatePreview
│   │       │       └── CandidateActions  // Adopt / Download / Install
│   │       └── ScanProgressPanel
│   │
│   ├── [Targets Tab]
│   │   └── TargetsPage
│   │       ├── TargetsToolbar     // Sync All + Repair All
│   │       ├── TargetFilterBar
│   │       └── TargetGrid
│   │           └── TargetCard[]
│   │               ├── TargetHeader
│   │               ├── TargetHealthIndicator
│   │               └── TargetActions
│   │
│   └── [Settings Tab]
│       └── SettingsPage
│           ├── ProjectRootCard
│           ├── LanguageCard
│           ├── CacheCard
│           └── StorageCard
```

### 6.2 Directory Structure

```
src/
├── main.tsx
├── index.css                       // Global styles, CSS variables, reset
├── vite-env.d.ts
│
├── App.tsx                         // AppProvider + AppShell + tab routing
├── App.module.css                  // Layout-level styles only
│
├── types/
│   ├── core.ts                     // SkillItem, DiscoveryRecord, InstallTargetRecord
│   ├── api.ts                      // Tauri command request/response types
│   └── ui.ts                       // AppTab, AgentFilter, ScopeFilter, Language
│
├── i18n/
│   ├── index.ts                    // Language type, useTranslation hook, Copy type
│   ├── en.ts                       // English dictionary
│   └── zh.ts                       // Chinese dictionary
│
├── api/
│   ├── index.ts                    // Unified exports
│   ├── library.ts                  // getLibrary, adoptSkill, installSkill, uninstallSkill
│   ├── discover.ts                 // scanDisk, importFolder, searchRemote, downloadSkill
│   ├── targets.ts                  // getTargets, syncLinks, repairLinks
│   └── system.ts                   // readSkillContent, openInFinder
│
├── state/
│   ├── AppContext.tsx               // Root Context + Provider + useReducer
│   ├── library.ts                  // Library state slice
│   ├── candidates.ts               // Candidate state slice
│   ├── targets.ts                  // Target state slice
│   └── settings.ts                 // Settings state slice
│
├── hooks/
│   ├── useLanguage.ts              // Language preference (localStorage)
│   ├── useSkillFilters.ts          // Search + filter composition logic
│   ├── useAsyncAction.ts           // Generic async wrapper (loading/error)
│   └── usePreviewCache.ts          // SKILL.md content cache
│
├── components/                     // Shared UI primitives
│   ├── TopBar/
│   ├── ErrorBanner/
│   ├── FilterPill/
│   ├── SearchField/
│   ├── EmptyState/
│   ├── HealthBadge/
│   └── Badge/
│
└── features/                       // Tab-level page components
    ├── library/
    │   ├── LibraryPage.tsx
    │   ├── SkillListPanel.tsx
    │   ├── SkillRow.tsx
    │   ├── SkillDetailsPanel.tsx
    │   ├── SkillPreview.tsx
    │   └── InstallTargetsSection.tsx
    │
    ├── discover/
    │   ├── DiscoverPage.tsx
    │   ├── CandidateListPanel.tsx
    │   ├── CandidateRow.tsx
    │   ├── CandidateDetailsPanel.tsx
    │   └── ScanProgressPanel.tsx
    │
    ├── targets/
    │   ├── TargetsPage.tsx
    │   ├── TargetCard.tsx
    │   └── TargetHealthIndicator.tsx
    │
    └── settings/
        ├── SettingsPage.tsx
        ├── ProjectRootCard.tsx
        ├── LanguageCard.tsx
        └── CacheCard.tsx
```

### 6.3 State Management

**React Context + useReducer — no external libraries.**

```typescript
interface AppState {
  activeTab: AppTab;
  library: {
    skills: SkillItem[];
    loading: boolean;
    error: string | null;
  };
  candidates: {
    items: DiscoveryRecord[];
    loading: boolean;
    scanInProgress: boolean;
  };
  targets: {
    items: InstallTargetRecord[];
    loading: boolean;
    error: string | null;
  };
  settings: {
    projectRoot: string;
    language: Language;
  };
}
```

**Optimistic updates:**

| Action | Optimistic behavior | Rollback on failure |
|---|---|---|
| adopt_skill | Remove from candidates, add to library | Revert both lists |
| install_skill | Add target row (health=pending) | Remove target row |
| uninstall_skill | Remove target row | Re-add target row |
| repair_links | Update broken → healthy | Revert to broken |

### 6.4 Technical Decisions

| Dimension | Decision | Why |
|---|---|---|
| Routing | Conditional rendering (no react-router) | Single-window desktop, no URL routing needed |
| CSS | CSS Modules | Zero runtime, Vite native, current codebase compatible |
| i18n | Manual dictionary (no i18next) | Two languages only, type-safe, zero deps |
| State | Context + useReducer | Medium complexity, desktop tool, no deep nesting |
| Search/filter | Frontend useMemo | Small dataset (dozens to hundreds), IPC overhead worse |

### 6.5 Accessibility Baseline (WCAG 2.1 AA)

- Semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`
- ARIA labels: `role="status"` on stats, `role="alert"` on errors, `aria-busy` on loading
- Keyboard: Tab focus on all interactive elements, Enter to expand, Esc to close
- Focus management: Scan complete → focus stats, Error → focus error panel
- Contrast: all text ≥ 4.5:1 ratio (fix current 2.8:1 placeholder text)
- Click targets: all buttons ≥ 44×44px

---

## 7. Migration Plan

6 steps, each independently verifiable and mergeable.

| Step | Content | Verification |
|---|---|---|
| **1. Types & API** | Split `types.ts` → `types/core.ts`, `types/api.ts`, `types/ui.ts`. Split `api.ts` → `api/library.ts`, `api/system.ts` | `pnpm build` passes, behavior unchanged |
| **2. Shared Components** | Extract FilterPill, SearchField, EmptyState, Badge from existing code into `components/` | Each renders correctly, SkillsTab unchanged |
| **3. AppContext** | Create `state/AppContext.tsx`, move state from App.tsx into Context + useReducer | All tabs functional, state decoupled |
| **4. CSS Modules** | Split `App.module.css` into per-component `.module.css` files. Extract `styles/variables.css` | Visual regression: identical appearance |
| **5. New Tab Skeletons** | Add Discover and Targets tabs (placeholder content). Extend AppTab type. TopBar updated | 4 tabs switchable, old features intact |
| **6. Feature Implementation** | Fill Discover (scan/import/search) and Targets (health/repair). Extend i18n | End-to-end: scan → adopt → install → repair |

---

## 8. Changes from Current Implementation

### Delete

| Item | Reason |
|---|---|
| Directories Tab | Merged into Targets Tab |
| Hero panel | Replaced by toolbar (search + filters + actions) |
| Standalone stats grid | Stats embedded in filter pills and inline summary |

### Modify

| Item | Current | New |
|---|---|---|
| Tab structure | `skills / directories / settings` | `library / discover / targets / settings` |
| TopBar | 3 tabs + language | 4 tabs + global search + health badge + language |
| Skill list | Card layout, path-heavy | Row layout, path collapsed by default |
| Detail view | Path display only | Full panel: metadata + targets + SKILL.md preview |
| Data model | `InstalledSkill` (read-only scan result) | `SkillItem` + `DiscoveryRecord` + `InstallTargetRecord` |
| API layer | 1 command (`scan_local_skills`) | ~14 commands (scan, adopt, install, sync, repair, etc.) |
| i18n | ~50 keys | ~150-200 keys (discover, targets, states) |

### Add

- Discover tab (scan, import, remote search)
- Targets tab (health dashboard, sync, repair)
- Onboarding flow (first-run wizard)
- 9 key state designs (Section 4)
- Optimistic update patterns
- Accessibility baseline
