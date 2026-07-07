# Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact header button that toggles the existing dashboard theme between dark and light.

**Architecture:** Use the existing Zustand UI store as the single source of truth. `AppHeader` reads `theme` and `toggleTheme()` from `useUIStore`; `App` already applies the `.light` class when needed, so no theme plumbing outside the header is required.

**Tech Stack:** React 18.3.1, TypeScript 5.4.5, Vite 5.3.1, Tailwind CSS 3.4.4, Zustand 4.5.2, lucide-react 0.395.0.

## Global Constraints

- Keep dark as default.
- Do not add localStorage persistence.
- Do not add system theme detection.
- Do not change `tailwind.config.ts`.
- Do not rework light theme tokens in `src/index.css`.
- Use existing `useUIStore` fields: `theme: Theme` and `toggleTheme: () => void`.
- Place the button in the header right side, between connection chips and clock.

---

## File Structure

- Modify `src/components/layout/AppHeader.tsx`: render the theme switch button and wire it to `useUIStore`.
- No new files.
- No store changes.
- No CSS or Tailwind config changes.

### Task 1: Header Theme Toggle Button

**Files:**
- Modify: `src/components/layout/AppHeader.tsx:1-75`

**Interfaces:**
- Consumes: `useUIStore((s) => s.theme)` returning `'dark' | 'light'`.
- Consumes: `useUIStore((s) => s.toggleTheme)` returning `() => void`.
- Produces: Header button with `onClick={toggleTheme}`, `aria-label`, `title`, and theme-dependent icon.

- [ ] **Step 1: Update lucide imports**

Replace current import:

```tsx
import { Scale } from 'lucide-react';
```

With:

```tsx
import { Moon, Scale, Sun } from 'lucide-react';
```

- [ ] **Step 2: Read theme state and action**

Inside `AppHeader`, after existing store reads:

```tsx
  const openModal  = useUIStore((s) => s.openModal);
  const theme      = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
```

- [ ] **Step 3: Add derived label**

After `handleMOClick`, before `return`:

```tsx
  const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
```

- [ ] **Step 4: Render button between chips and clock**

In the right header block, change:

```tsx
        <div className="flex gap-2">
          <ConnectionChip label="S1" connected={small.connected} />
          <ConnectionChip label="S2" connected={large.connected} />
        </div>
        <span className="font-mono text-sm font-semibold text-t-secondary tracking-[1.5px] min-w-[68px] text-right">
          {clock}
        </span>
```

To:

```tsx
        <div className="flex gap-2">
          <ConnectionChip label="S1" connected={small.connected} />
          <ConnectionChip label="S2" connected={large.connected} />
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={themeLabel}
          title={themeLabel}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-pill border border-b-card',
            'bg-bg-elevated text-t-secondary transition-all duration-200',
            'hover:border-c-blue hover:bg-c-blue-dim hover:text-c-blue',
          )}
        >
          {theme === 'dark' ? <Sun size={16} strokeWidth={2.4} /> : <Moon size={16} strokeWidth={2.4} />}
        </button>

        <span className="font-mono text-sm font-semibold text-t-secondary tracking-[1.5px] min-w-[68px] text-right">
          {clock}
        </span>
```

- [ ] **Step 5: Run type check**

Run:

```bash
npm run type-check
```

Expected: command exits 0 with no TypeScript errors.

- [ ] **Step 6: Run production build**

Run:

```bash
npm run build
```

Expected: command exits 0 and Vite reports built output in `dist/`.

- [ ] **Step 7: Manual verification**

Run dev server:

```bash
npm run dev
```

Open app in browser. Verify:

1. Theme button appears on right side between connection chips and clock.
2. In dark mode, button shows sun icon.
3. Click button: app switches to light theme.
4. In light mode, button shows moon icon.
5. Click button again: app switches back to dark theme.
6. Header, scale panels, RM queue, MO button, connection chips, and clock remain readable.

- [ ] **Step 8: Commit if user requested**

If user explicitly requested a commit, run:

```bash
git add src/components/layout/AppHeader.tsx docs/superpowers/specs/2026-07-07-theme-toggle-design.md docs/superpowers/plans/2026-07-07-theme-toggle.md
git commit -m "feat: add theme toggle button"
```

Do not commit without explicit user request.

## Self-Review

Spec coverage:

- Header placement covered in Task 1 Step 4.
- Existing store usage covered in Task 1 Step 2.
- Theme-dependent icon covered in Task 1 Step 4.
- No persistence covered in Global Constraints.
- No Tailwind/CSS config changes covered in File Structure.
- Verification covered in Task 1 Steps 5-7.

Placeholder scan:

- No TBD, TODO, or incomplete implementation steps.
- No vague edge-case instructions.

Type consistency:

- `theme`, `toggleTheme`, and `Theme` usage matches existing `useUIStore` interface.
- `Sun`, `Moon`, `Scale` import names match lucide-react exports.