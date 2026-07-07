# Theme Toggle Design

**Date:** 2026-07-07

## Goal
Add a compact button in the dashboard header that switches the UI between the existing dark and light themes.

## Context
The project already has theme support:

- `src/store/uiStore.ts` defines `theme: 'dark' | 'light'` and `toggleTheme()`.
- `src/App.tsx` applies class `light` to the app root when `theme === 'light'`.
- `src/index.css` defines default dark CSS variables and `.light` overrides.
- `tailwind.config.ts` maps Tailwind color names to the CSS variables.

## Scope
In scope:

- Add one theme toggle button to `src/components/layout/AppHeader.tsx`.
- Use existing `useUIStore` state and `toggleTheme()` action.
- Use `Sun` and `Moon` icons from `lucide-react`, already installed.
- Keep dark as default and do not add persistence yet.

Out of scope:

- localStorage persistence.
- System theme detection.
- New Tailwind config changes.
- Reworking light theme color tokens.

## UI Design
Place the button on the header right side, between connection chips and clock. It should be compact, round, and use existing design tokens:

- Base: `inline-flex h-8 w-8 items-center justify-center rounded-pill border border-b-card bg-bg-elevated text-t-secondary`
- Interaction: `transition-all duration-200 hover:text-c-blue hover:border-c-blue hover:bg-c-blue-dim`
- Accessibility: `type="button"`, `aria-label`, `title`

Icon behavior:

- Dark mode shows `Sun`, indicating click switches to light.
- Light mode shows `Moon`, indicating click switches to dark.

## Data Flow
`AppHeader` reads `theme` and `toggleTheme` from `useUIStore`.

On click:

1. Button calls `toggleTheme()`.
2. Store changes `theme` between `dark` and `light`.
3. `App` re-renders with or without `.light` class.
4. CSS variables update colors across app.

## Error Handling
No runtime error path expected. If store action fails, React click handler stops naturally. No extra toast or modal needed.

## Testing
Run TypeScript check and production build:

- `npm run type-check`
- `npm run build`

Manual verification:

1. Open app.
2. Header shows theme button near clock.
3. Click once: app switches to light theme.
4. Click again: app switches to dark theme.
5. MO button, scale panels, RM queue, clock, and connection chips remain readable.

## Approval
Approved by user on 2026-07-07.