# CircuitCraft — Circuit Diagram Editor

A professional, browser-based circuit diagram editor built for EEE teachers and students. Draw circuit schematics with standard symbols, multi-segment wires with jump/crossing visualization, and engineering annotations — then export as high-quality images or PDF for question papers and educational materials.

**No simulation — pure drawing.**

## ✨ Features

### Components & Drawing
- **Massive Component Library:** Access 588+ dynamically generated components, including DIP ICs, Logic Gates, Sensors, Transistors, Switches, and Passives, all cleanly organized into an accordion-style modal.
- **Dynamic Component Generation:** Built-in offline pipeline parses metadata to generate perfectly scaled, editable components with standard US/India schematic symbol conventions.
- **Customizable Schematics:** Double-click components to edit their labels or use toggle switches to cleanly hide component names or pin details.
- **Excalidraw-inspired UI:** Floating toolbars, a left context panel, and a minimal bottom bar keep the canvas uncluttered.
- **Smart Wire Routing:** Point-to-point wiring with 90° ortho routing, manual bends, and automatic junction detection.
- **Professional Export:** Export to PNG, JPG, or PDF. Configurable A4 printing with transparent backgrounds for seamless inclusion in research papers and exams.
- **Interactive Modals:** Insert engineering symbols (Ω, µ, ∠, î) directly from the text tool or inline value editors.
- **Infinite Canvas:** Middle-mouse pan, trackpad gesture support, and scroll-wheel zoom for complex, large-scale schematics.
- **Local Persistence:** Auto-saves your work to `localStorage`, with unlimited Undo/Redo tracking.
- **Keyboard Shortcuts** — Select All (Cmd/Ctrl+A), Delete/Backspace, Undo/Redo (Cmd/Ctrl+Z)
- **Undo/Redo** — Up to 50 history snapshots

### Export & Persistence
- **Export PNG** — 2x resolution with white background
- **Export PNG (Transparent)** — 3x resolution, no background — perfect for documents and question papers
- **Export JPG** — 2x resolution with white background
- **Export A4 (Settings)** — Professional print-quality export with orientation, scale, and margin controls
- **Export PDF** — A4-sized output with auto print dialog
- **Print Preview** — Red dashed A4 boundary overlay on canvas
- **JSON Save/Load** — Full circuit save and restore
- **Auto-Save** — Throttled localStorage persistence, restored on refresh
- **60fps Rendering** — Dirty-flag optimized requestAnimationFrame loop

## 🚀 Getting Started

The project consists of two parts: the **Circuit Editor** (vanilla JS at the repo root) and a **Landing Page** (React/Vite in `landing/`). The Vite dev server serves both.

### Run Locally (macOS)

```bash
# Navigate to the landing page directory
cd "ckt ee/landing"

# Install dependencies
npm install

# Start the dev server
npm run dev
```

This starts the Vite dev server at `http://localhost:5173/`:
- **Landing page** → `http://localhost:5173/`
- **Circuit editor** → `http://localhost:5173/editor/index.html`

You can also open the editor directly without the dev server:
```bash
# Open the editor HTML file directly in your browser
open "ckt ee/index.html"
```

### Run Locally (Windows)

```cmd
:: Navigate to the landing directory
cd "ckt ee\landing"

:: Install dependencies
npm install

:: Start the Vite dev server
npm run dev
```

- **Landing page** → `http://localhost:5173/`
- **Circuit editor** → `http://localhost:5173/editor/index.html`

### Build for Production

```bash
cd "ckt ee/landing"
npm run build
```

The `dist/` folder will contain both the landing page and the editor at `dist/editor/`.

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy the editor
cd "ckt ee"
vercel
```

The project includes a `vercel.json` configuration for static deployment.

## 🎨 UI Overview

| Area | Description |
|------|-------------|
| **Top Center** | Floating pill toolbar → Select, Wire, Eraser, Text + quick component buttons (R, C, L, V, I) |
| **Component Picker** | Grid panel (⊞ button) with all 8 components organized by category |
| **Left Panel** | Context-sensitive property editor → value input, SI chips, rotate, delete |
| **Top Right** | Undo, Redo, Reset, Export dropdown |
| **Bottom Left** | Zoom controls (−/+), Undo/Redo, component/wire count |

## 🛠 Tech Stack

- **HTML5 Canvas** for rendering
- **Vanilla JavaScript** (no frameworks, no dependencies)
- **CSS3** with custom properties
- **Google Fonts** (Inter)
- **localStorage** for persistence

## 📁 Project Structure

```
ckt ee/
├── editor/                 ← Circuit editor (single source of truth)
│   ├── index.html          ← Editor entry point
│   ├── css/
│   │   └── style.css       ← Excalidraw-inspired dark theme
│   ├── js/
│   │   ├── state.js        ← State management, undo/redo, persistence
│   │   ├── canvas.js       ← Canvas rendering, grid, coordinate transforms
│   │   ├── components.js   ← Component renderer for the dynamic 588+ library
│   │   ├── wire.js         ← Multi-segment wires, smart snap, junctions, jump visualization
│   │   ├── tools.js        ← Tool handlers (Select, Wire, Eraser, Text, Place)
│   │   ├── export.js       ← PNG/JPG/PDF/A4/Transparent export, JSON import
│   │   ├── ui.js           ← Floating UI, modals, symbols, context panel, accordion library
│   │   ├── library-loader.js ← Dynamically loads `library_bundle.json`
│   │   └── app.js          ← Bootstrap, event routing, trackpad detection
│   ├── library/            ← Compiled runtime component catalog
│   │   └── library_bundle.json
│   └── assets/
├── ComponentsGenerating-Engine/ ← Offline Component Builder
│   ├── README.md           ← Engine documentation
│   ├── src/                ← Core generation logic (primitives, validation, exporters)
│   ├── scripts/            ← Data import pipelines (bulk-importer, ai-healer)
│   ├── metadata/           ← Source truth JSONs for 588+ components
│   └── generated/          ← Master copies of generated canonical JSONs
├── landing/                ← React/Vite landing page
│   ├── vite.config.js      ← Dev middleware + build plugin (serves /editor/)
│   ├── src/                ← Landing page React components
│   └── public/             ← Static assets (favicon, icons)
├── CircuitCrafter_Component_Library.pdf ← Official component category specification index
├── *.md                    ← Technical documentation, audit reports, and health checks
├── vercel.json             ← Vercel deployment config
├── package.json            ← Root package references
├── CHANGELOG.md
└── README.md
```

> **Single source of truth:** The editor code lives only in `/editor/`. The Vite dev server and build process both reference these canonical files — no duplication.

## 🔧 Controls

### General

| Action | How |
|--------|-----|
| Place component | Click component in toolbar or picker, then click canvas |
| Select | Click on component/wire/text |
| Move | Drag selected component or text |
| Rotate | Click ↻ in context panel |
| Edit value | Double-click component OR use context panel |
| Delete | Select + Delete key, or click 🗑 in context panel |
| Pan | Space + drag, or 2-finger trackpad scroll |
| Zoom | Scroll wheel, or pinch gesture, or ± buttons |
| Undo/Redo | Cmd/Ctrl + Z / Cmd/Ctrl + Shift + Z |

### Wire Drawing

| Action | How |
|--------|-----|
| Start wire | Wire tool → click anywhere (port, wire, or grid) |
| Add bend | Click to add 90° bend point |
| Finish wire | Double-click, press Enter, or click on a port (auto-finish) |
| Free angle | Hold Alt while drawing (releases to 90° on keyup) |
| Undo last point | Backspace while drawing |
| Cancel wire | Escape |
| Edit wire | Select tool → drag a wire point to reshape |
| Insert bend | Select tool → double-click on a wire segment |

### Export

| Format | Description |
|--------|-------------|
| PNG | White background, 2x resolution |
| PNG (Transparent) | No background, 3x resolution — ideal for Word/PDF/question papers |
| JPG | White background, 2x resolution |
| A4 (Settings) | Configurable orientation, scale (fit/100%/custom), margin, format |
| PDF | A4-sized with auto print dialog |
| Print Preview | Toggle A4 boundary overlay on canvas |
| JSON | Save/load full circuit data |

## 📄 License

MIT
