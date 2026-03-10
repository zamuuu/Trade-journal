# Trade Journal - Design System

## Identity

**User**: Day trader reviewing performance after market close. Analytical, wants signal not noise.

**Feel**: Like a cockpit instrument panel. Dense but legible. Cold precision, not friendly warmth. Bloomberg terminal stripped to essentials.

**Signature**: PnL number as primary visual anchor everywhere. Monospace numbers that align perfectly.

---

## Palette

All colors use OKLCH for perceptual uniformity. Navy base (hue 268). Anchored to hex values `#101626` (background) and `#1D2333` (cards/sidebar).

### Surface Hierarchy (3 levels)

| Token | Hex | OKLCH | Usage |
|---|---|---|---|
| `--background` | `#101626` | `oklch(0.203 0.033 268)` | Dark canvas |
| `--card` / `--sidebar` | `#1D2333` | `oklch(0.258 0.032 268)` | Cards, widgets, sidebar |
| `--popover` | -- | `oklch(0.30 0.030 268)` | Dropdowns, tooltips |

### Text

| Token | Value | Usage |
|---|---|---|
| `--foreground` | `oklch(0.93 0.005 268)` | Primary text |
| `--muted-foreground` | `oklch(0.63 0.015 268)` | Labels, secondary text (brightened from 0.55 for contrast) |

### Chrome

| Token | Value | Usage |
|---|---|---|
| `--border` | `oklch(0.32 0.025 268)` | Visible navy border |
| `--input` | `oklch(0.22 0.033 268)` | Input fields (inset feel) |
| `--accent` | `oklch(0.30 0.030 268)` | Hover/active accent |
| `--ring` | `oklch(0.55 0.06 268)` | Focus ring |

### Semantic Trading Colors

| Token | Value | Usage |
|---|---|---|
| `--profit` | `oklch(0.65 0.16 155)` | Emerald green for gains |
| `--loss` | `oklch(0.65 0.19 25)` | Rose red for losses |
| `--flat` | `oklch(0.63 0.015 268)` | Breakeven/neutral (matches muted-foreground) |

### Sidebar Tokens (same surface as card)

| Token | Value |
|---|---|
| `--sidebar` | `oklch(0.258 0.032 268)` (= card) |
| `--sidebar-foreground` | `oklch(0.93 0.005 268)` |
| `--sidebar-border` | `oklch(0.32 0.025 268)` |
| `--sidebar-accent` | `oklch(0.30 0.030 268)` |
| `--sidebar-accent-foreground` | `oklch(0.93 0.005 268)` |
| `--sidebar-primary` | `oklch(0.65 0.06 268)` |
| `--sidebar-ring` | `oklch(0.55 0.06 268)` |

### Semantic Color Utilities (globals.css)

```css
.text-profit { color: var(--profit); }
.text-loss   { color: var(--loss); }
.text-flat   { color: var(--flat); }
.bg-profit   { background-color: var(--profit); }
.bg-loss     { background-color: var(--loss); }
.font-tabular { font-variant-numeric: tabular-nums; }
```

---

## Depth Model

- **Borders-only** separation. Very subtle. No shadows.
- 3-level elevation: background → card → popover (cool blue-gray tint progression)
- Surfaces use `border border-border bg-card rounded-md`

---

## Typography

| Role | Font | Weight | Size | Class |
|---|---|---|---|---|
| UI text | Geist Sans | 400-600 | 14-15px | -- |
| Page heading | Geist Sans | 600 | 18px (`text-lg`) | `text-lg font-semibold` |
| Section title | Geist Sans | 500 | 13px | `text-[13px] font-medium uppercase tracking-wider text-muted-foreground` |
| Table header | Geist Sans | 500 | 12px | `text-[12px] font-medium uppercase tracking-wider text-muted-foreground` |
| Stat label | Geist Sans | 500 | 12px | `text-[12px] font-medium uppercase tracking-wider text-muted-foreground` |
| Stat value | Geist Mono | 600 | 20px (`text-xl`) | `font-mono text-xl font-semibold tabular-nums` |
| Sidebar nav | Geist Sans | 500 | 15px | `text-[15px] font-medium` |
| Sidebar title | Geist Sans | 700 | 18px (`text-lg`) | `text-lg font-bold tracking-wide` |
| All numbers | Geist Mono | 500 | inherit | `font-mono tabular-nums` |
| PnL values | Geist Mono | 600 | varies | `font-mono font-semibold tabular-nums` + semantic color |
| Chart axis | Geist Sans | -- | 12px | Set via Recharts `fontSize` prop |

**Font loading**: `font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif` applied directly on `body` in `@layer base`.

---

## Spacing

- **Base unit**: 4px
- **Between sections**: `space-y-4`
- **Between grid items**: `gap-3` or `gap-4`
- **Card padding**: `p-4` (stat widgets use `px-4 py-3`)
- **Table row padding**: `py-3` cells, `h-10` header rows
- **Tight/dense** throughout - no generous whitespace

---

## Component Patterns

### Stat Cards (Widgets)
- Plain `div` with `border border-border bg-card rounded-md px-4 py-3`
- No Card/CardContent/CardHeader wrappers from shadcn
- No decorative icons
- Label: `text-[12px] font-medium uppercase tracking-wider text-muted-foreground`
- Value: `font-mono text-xl font-semibold tabular-nums` + optional semantic color class

### Avg Win vs Loss Widget
- Combined proportional bar comparison
- Values: `text-[15px] font-mono font-semibold tabular-nums`
- Bars: `h-3` with `bg-profit` / `bg-loss`, proportional width

### Tables
- Wrapped in `bg-card` container
- Header row: `bg-muted/30` tint, height `h-10`
- Headers: `text-[12px] font-medium uppercase tracking-wider text-muted-foreground`
- Row dividers: `border-b border-border/50`
- Hover: `hover:bg-accent/60`
- Cell padding: `py-3` cells, `text-sm` body text
- All numeric cells: `font-mono tabular-nums text-right`
- Clickable rows: `cursor-pointer`
- Filter inputs: `bg-card border-border h-9`

### Side Labels
- Colored text instead of Badge components
- `LONG` in profit green (`text-profit`), `SHORT` in loss red (`text-loss`)
- `text-[11px] font-medium uppercase`

### Charts
- No Card wrapper - use plain div with border
- Section title style for chart labels
- Recharts with theme-matching colors
- Muted grid lines, no heavy borders
- Height: 300px for main PnL chart
- Axis: `fontSize: 12`, stroke colors use hardcoded OKLCH matching hue 268

### Sidebar
- **Floating panel design** — not flush to viewport edge
- Outer wrapper: `p-3 pr-0` (margin on left/top/bottom, flush to content area on right)
- Panel: `rounded-xl bg-sidebar` (no explicit border, no `border-r`)
- **Collapsible**: toggle between expanded (256px) and collapsed (76px)
- Collapse button: `ChevronsLeft` / `ChevronsRight` icons, `h-8 w-8`, `rounded-lg`
- Transition: `transition-all duration-300` on outer wrapper width
- **Expanded state**:
  - Header: `h-16`, title `text-lg font-bold tracking-wide`, collapse button at right
  - Nav items: `gap-3.5 px-3.5 py-3`, icons `h-5 w-5`, text `text-[15px] font-medium`
  - Active: `bg-sidebar-accent text-foreground`
  - Inactive: `text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground`
- **Collapsed state**:
  - Icons only, centered (`justify-center px-0 py-3`)
  - Collapse button centered (`mx-auto`)
  - Tooltip via `title` attribute on each nav link

### Page Layout
- Sidebar + main content area (flex row)
- Page heading: `text-lg font-semibold`
- Subheading/description: `text-[13px] text-muted-foreground`
- Content spacing: `space-y-4`

### Calendar
- Day headers: `text-[12px] font-medium uppercase tracking-wider text-muted-foreground`
- Day numbers: `text-sm`
- PnL text: `text-sm font-mono font-semibold tabular-nums` + semantic color
- Cell min-height: `min-h-[5.5rem]`

### Import Form
- Labels: `text-[13px]`
- Buttons: `h-9`
- Preview table headers: `text-[12px] h-9`

### Recent Trades Widget
- Symbol: `text-[14px]`
- PnL: `text-[14px] font-mono font-semibold tabular-nums`
- Row padding: `py-2`

---

## Do / Don't

| Do | Don't |
|---|---|
| Use monospace for ALL numbers | Use proportional fonts for prices/PnL |
| Color-code PnL (green/red/gray) | Use neutral color for PnL values |
| Keep density high | Add generous padding/margins |
| Use borders for depth | Use drop shadows |
| Use plain divs with border classes | Use Card/CardContent wrappers |
| Show side as colored text | Use Badge components for LONG/SHORT |
| Use 12px uppercase for labels | Use large decorative section headers |
| Use `text-lg` for page headings | Use `text-xl`+ or decorative headings |
| Floating sidebar with rounded-xl | Flush sidebar with border-r |
| Use `oklch()` with hue 268 | Use hex colors or non-matching hues |
