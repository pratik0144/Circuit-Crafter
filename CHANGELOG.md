# Changelog

All notable changes to the Circuit Diagram Editor.

## [2.2.0] - 2026-04-25

### 🏗️ Project Refactor — Single Source of Truth

#### Changed
- **Eliminated duplicate editor codebase** — removed stale copy at `landing/public/editor/` that caused changes to not appear in dev server
- **Vite dev middleware** — `npm run dev` now serves the editor directly from the repo root via a custom middleware plugin, ensuring dev and production always use the same code
- **Vite build plugin** — `npm run build` copies canonical editor files into `dist/editor/` automatically
- **Tool activation consistency** — `activateComponent()` now properly cleans up in-progress wire drawing, drag state, and select-all state (consistent with `setTool()`)
- **State initialization** — added `selectAllActive` flag to initial state declaration to prevent undefined behavior
- **UI polling optimization** — reduced bottom bar update frequency (300ms → 500ms) and context panel polling (200ms → 400ms)

#### Removed
- **Duplicate editor** at `landing/public/editor/` (stale JS/CSS/HTML copy)
- **Debug test files** — `patch-wire.js`, `test-canvas.js`, `test.js`, `test_jump.png`
- **Debug console output** — removed `console.log("Jump added!")` and `window._lastJumps` global from wire jump logic
- **Cache-busting params** — removed `?v=2` query strings from script tags (no longer needed)

---

## [2.1.0] - 2026-04-25

### 🎯 Component Placement UX Improvement

#### Changed
- **Single-placement mode** — placing a component now automatically exits placement mode and returns to the Select tool
- **No auto-selection** — newly placed components are not auto-selected; editor returns to a clean neutral state
- **Toolbar cleanup** — component button highlights and picker highlights clear immediately after placement
- **Consistent tool transitions** — `activateComponent()` cancels in-progress wire drawing to prevent state conflicts

#### Fixed
- Components no longer keep placing repeatedly until ESC is pressed
- Toolbar button highlight no longer stays active after placement
- Dashed selection box no longer appears around newly placed components

---

## [2.0.0] - 2026-04-18

### 🎨 Complete UI Redesign (Excalidraw-Inspired)

#### Added
- **Floating top-center pill toolbar** with SVG icons for tools (Select, Wire, Eraser, Text)
- **Quick component buttons** (R, C, L, V, I) directly in the toolbar
- **Floating component picker** — grid layout with categories (Passive, Sources, Others)
- **Left context panel** — appears on selection with inline value editing, SI unit chips, rotate, delete
- **Excalidraw-style bottom bar** — zoom pill (−/+), undo/redo buttons, status info
- **Zoom in/out buttons** in bottom bar
- **vercel.json** for one-click Vercel deployment
- **README.md** with full documentation
- **CHANGELOG.md** (this file)

#### Changed
- Removed left sidebar — canvas is now full-screen
- Removed all tool keyboard shortcuts (Q/W/E/T/R/B) — tools are screen-only
- Kept functional shortcuts: Undo (⌘Z), Redo (⌘⇧Z), Delete, Escape, Space (pan)
- Redesigned all floating panels with rounded corners, soft shadows, translucent backgrounds
- Updated color scheme to deeper dark theme (#0f1220 base)

#### Removed
- Old sidebar layout
- Old floating context toolbar (replaced by left context panel)
- Tool keyboard shortcut bindings

---

## [1.1.0] - 2026-04-18

### UI/UX Improvements

#### Added
- Custom themed value edit modal (replaces browser `prompt()`)
- SI unit chips with quick example values per component type
- Custom text edit modal
- Reset button with themed confirmation dialog
- Floating context toolbar (rotate/edit/delete) above selected component
- Compact 52px icon-only sidebar with tooltips
- Collapsible component groups (Passive/Sources/Other)
- Trackpad 2-finger gesture detection — auto-switches to Select tool
- Pinch-to-zoom support for trackpads
- Dirty-flag rendering optimization (skip unchanged frames)
- Throttled localStorage save (300ms batching)
- `beforeunload` save to prevent data loss

#### Changed
- Theme colors deepened (#0f1220 base instead of #1a1a2e)
- Bottom bar made slimmer and more minimal
- Sidebar narrowed from 220px to 52px

---

## [1.0.0] - 2026-04-18

### Initial Release

#### Added
- HTML5 Canvas circuit diagram editor
- 8 component types: Resistor, Capacitor, Inductor, Voltage Source, Current Source, Switch, Lamp, Ground
- Wire system with port-to-port connections and dashed preview
- 5 tools: Select, Wire, Eraser, Text, Place
- Component rotation (90° steps)
- Labels always rendered horizontally
- PNG/JPG export (2x resolution, white background, no grid)
- JSON save/load
- Undo/Redo (50 snapshots)
- localStorage auto-save
- Grid snapping (20px)
- Pan (Space + drag, middle mouse)
- Zoom (scroll wheel, 0.25x–4x)
- Dark theme with Inter font
- Bottom status bar (zoom, component count, wire count)
