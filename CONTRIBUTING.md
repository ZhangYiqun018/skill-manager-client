# Contributing to Skill Manager Client

Thank you for your interest in contributing! This document covers setup, development workflow, and how to keep the codebase healthy.

## Project Overview

- **Stack**: Tauri 2 (Rust) + React 19 + TypeScript + Vite
- **Package Manager**: pnpm (workspace root) + cargo (Rust workspace)
- **Frontend**: `apps/desktop/`
- **Rust crates**: `crates/skill-manager-core/`, `crates/skill-manager-cli/`, `apps/desktop/src-tauri/`

## Prerequisites

- Node.js 20+ and pnpm 9+
- Rust 1.80+ and cargo
- macOS / Linux / Windows (Tauri desktop targets)

## Quick Start

```bash
# Install frontend dependencies
pnpm install

# Run the desktop app in dev mode
pnpm desktop:dev

# Run CLI scan command
pnpm cli:scan
```

## Development Workflow

### Linting and Formatting

Pre-commit hooks (husky + lint-staged) will run automatically. You can also run them manually:

```bash
# Root workspace scripts
pnpm lint    # ESLint + cargo clippy
pnpm format  # Prettier + cargo fmt
pnpm test    # Vitest + cargo test
```

### Type Safety

- Frontend: `pnpm --dir apps/desktop build` runs `tsc && vite build`
- Rust: `cargo check --workspace`

### Adding Tests

- **Frontend**: Vitest + jsdom + React Testing Library. Place tests next to the source file (`*.test.ts` or `*.test.tsx`).
- **Rust**: Standard `cargo test --workspace`.

When you add new logic to hooks with caches, race conditions, or reducer state, please include integration-level hook tests to guard against regressions.

## Code Style

- **TypeScript**: Use explicit return types on exported functions. Prefer `const` assertions for literal unions.
- **React**: Keep hooks small and composable. If a component has more than ~600 lines, consider extracting sub-components.
- **CSS**: Use CSS Modules. Global tokens live in `apps/desktop/src/index.css`. Component-scoped styles go in `apps/desktop/src/styles/_*.module.css`.
- **Rust**: Use `?` for error propagation. Map external errors to `AppError` with context helpers. Avoid `anyhow` in Tauri commands.

## Pull Request Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `cargo test --workspace` passes
- [ ] `pnpm build` (frontend) and `cargo check --workspace` pass
- [ ] UI changes include screenshots or screen recordings if applicable
- [ ] New logic is covered by unit/integration tests

## Reporting Issues

Please include:

1. Steps to reproduce
2. Expected vs actual behavior
3. Platform (OS version, Tauri version if relevant)
4. Relevant logs from the terminal or Tauri devtools console

## Questions?

Open a discussion or reach out in the issue tracker. We're happy to help!
