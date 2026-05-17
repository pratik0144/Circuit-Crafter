# Changelog

All notable changes to the Circuit Diagram Editor.

## [2.4.0] - 2026-05-16

### 🚀 Engine Stabilization & Professional Library Integration

#### Added
- **Dynamic Component Toggles:** Added "Hide Pin Details" and "Hide Comp Name" toggle buttons to the component properties modal, allowing users to independently show or hide the component label and pin labels on generated components for cleaner schematics.
- **Accordion Library Modal:** Completely rewrote the component library UI (`ui.js`). It now groups 588 components under 29 collapsible accordion categories matching the official `CircuitCrafter_Component_Library.pdf`.
- **Intelligent Library Search:** Added a global search bar to the library modal that instantly filters components and auto-expands matching family categories.
- **Detailed Component Engine Reports:** Generated comprehensive technical documentation (`reportEngine.md`) and walkthroughs detailing the architecture of the Component Generation Engine.

#### Changed
- **Pin Numbering Algorithm Fix:** The right-side pin array for DIP ICs (e.g., 555 Timer) is now numbered bottom-to-top (counter-clockwise convention) rather than top-to-bottom. This correctly aligns pins like `VCC` (Pin 8) with real-world IC physical packaging.
- **Logic Gate Standardization:** Removed power pins (`VCC`, `GND`) from logic gate definitions (AND, OR, NOT, NAND, NOR, XOR, XNOR, Buffer, Tri-State) in the LLM Knowledge Base to conform to standard US/India schematic symbols.
- **Library Close Button:** Repositioned the close (`✕`) button on the library modal to the top-left corner as requested for better ergonomics.
- **Orphan Category Consolidation:** Merged stray component categories (`Passives`, `Sensors`, `ICs`) into standard PDF-approved groupings (`Passive Components`, `Sensors & Transducers`, `Microcontrollers & Processors`).

#### Fixed
- **Rendering Text Overlap:** Prevented the legacy `drawComponentLabel()` from painting text over dynamically generated primitive labels, eliminating cluttered text overlaps.
- **"Loading" Flash Glitch:** Removed redundant `initCanvas()` and `loadFromLocalStorage()` calls in `ui.js`. Implemented forced `markDirty()` repainting upon `library_bundle.json` fetch completion so existing components render instantly.
- **Generated Component Properties Crash:** Updated the double-click modal logic (`openValueEditModal`) to safely support generated components without throwing reference errors against the legacy `COMPONENT_DEFS`.
- **Duplicate Pin Generation:** Removed duplicate iteration over top pins in `bulk-importer.js` to ensure clean component metadata.

---

## [2.3.0] - 2026-04-25

### 🏗️ Project Restructure + Subscript Labels

#### Changed
- **Moved editor to `/editor/`** — all editor files (`index.html`, `js/`, `css/`, `assets/`) now live under `/editor/` subdirectory for cleaner project organization
- **Updated Vite config** — dev middleware and build plugin now reference `/editor/` directory
- **Dependent source labels** — replaced plain text `v=bv_c` with proper engineering subscript rendering: `v = b · v꜀`
- **Canvas subscript rendering** — new `drawTextWithSubscript()` function renders subscripts at correct size and position on HTML5 Canvas
- **Dependent source defaults** — removed hard-coded `v=bv_c` style default values; proper subscript labels render automatically

#### Added
- `drawTextWithSubscript()` — reusable canvas function for mixed base/subscript text with auto-centering
- `DEPENDENT_LABEL_PARTS` — structured label definitions for VCVS, CCCVS, VCCS, CCCS

---

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
