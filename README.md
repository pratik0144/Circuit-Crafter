# CircuitCraft — Circuit Diagram Editor

A professional, browser-based circuit diagram editor built for EEE teachers and students. Draw circuit schematics with standard symbols, multi-segment wires with jump/crossing visualization, and engineering annotations — then export as high-quality images or PDF for question papers and educational materials.

**No simulation — pure drawing.**

## ✨ Features

### Components & Drawing
- **12 Standard Components** — Resistor, Capacitor, Inductor, Voltage Source, Current Source, Switch, Lamp, Ground, plus 4 Dependent Sources (VCVS, CCCVS, VCCS, CCCS)
- **Multi-Segment Wires** — Click-to-add-bends polyline routing with 90° orthogonal mode
- **Wire Jump Visualization** — Automatic bridge/arc rendering at wire crossings (no jump at actual junctions)
- **Smart Snap System** — Snaps to ports → wire nodes → grid intersections (priority-based)
- **Free Grid Routing** — Draw wires anywhere on canvas, not limited to component ports
- **Junction Dots** — Auto-drawn at wire connection points (3+ connections)
- **Wire Editing** — Drag bend points, double-click segment to insert bend, Backspace to undo last point
- **Text Annotations** — Labels with adjustable size, bold styling, and engineering symbol support
- **Single-Placement Mode** — Place one component per click, automatically returns to Select tool

### UI & Interaction
- **Excalidraw-Inspired UI** — Floating toolbar, component picker grid, context panel
- **Value Editing** — Custom themed popup with SI unit guidance and quick chip suggestions
- **Symbol Toolbar** — Engineering symbols (°, ∠, →, ±, Ω, µ, Δ, π) and vectors (î, ĵ, k̂) with cursor-aware insertion
- **Quick Templates** — One-click insert for ∠(30°), ∠(45°), r∠θ, 3î + 4ĵ
- **Trackpad Support** — 2-finger pan, pinch-to-zoom, auto-switches to Select mode
- **Component Rotation** — 90° step rotation via context panel
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
├── index.html          ← Circuit editor entry point
├── vercel.json         ← Vercel deployment config
├── css/
│   └── style.css       ← Excalidraw-inspired dark theme
├── js/
│   ├── state.js        ← State management, undo/redo, persistence
│   ├── canvas.js       ← Canvas rendering, grid, coordinate transforms
│   ├── components.js   ← 12 component types, drawing, hit testing
│   ├── wire.js         ← Multi-segment wires, smart snap, junctions, jump visualization
│   ├── tools.js        ← Tool handlers (Select, Wire, Eraser, Text, Place)
│   ├── export.js       ← PNG/JPG/PDF/A4/Transparent export, JSON import
│   ├── ui.js           ← Floating UI, modals, symbols, context panel
│   └── app.js          ← Bootstrap, event routing, trackpad detection
├── landing/            ← React/Vite landing page
│   ├── vite.config.js  ← Dev middleware + build plugin (serves editor from root)
│   ├── src/            ← Landing page React components
│   └── public/         ← Static assets (favicon, icons)
└── assets/
```

> **Single source of truth:** The editor code lives only at the repo root (`js/`, `css/`, `index.html`). The Vite dev server and build process both reference these canonical files — no duplication.

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
