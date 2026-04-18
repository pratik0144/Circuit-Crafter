# Circuit Diagram Editor

A professional, browser-based circuit diagram editor built for EEE teachers and students. Draw circuit schematics with standard symbols, multi-segment wires, and engineering annotations — then export as high-quality images or PDF for question papers and educational materials.

**No simulation — pure drawing.**

## ✨ Features

### Components & Drawing
- **8 Standard Components** — Resistor, Capacitor, Inductor, Voltage Source, Current Source, Switch, Lamp, Ground
- **Multi-Segment Wires** — Click-to-add-bends polyline routing with 90° orthogonal mode
- **Smart Snap System** — Snaps to ports → wire nodes → grid intersections (priority-based)
- **Free Grid Routing** — Draw wires anywhere on canvas, not limited to component ports
- **Junction Dots** — Auto-drawn at wire connection points (3+ connections)
- **Wire Editing** — Drag bend points, double-click segment to insert bend, Backspace to undo last point
- **Text Annotations** — Labels with adjustable size, bold styling, and engineering symbol support

### UI & Interaction
- **Excalidraw-Inspired UI** — Floating toolbar, component picker grid, context panel
- **Value Editing** — Custom themed popup with SI unit guidance and quick chip suggestions
- **Symbol Toolbar** — Engineering symbols (°, ∠, →, ±, Ω, µ, Δ, π) and vectors (î, ĵ, k̂) with cursor-aware insertion
- **Quick Templates** — One-click insert for ∠(30°), ∠(45°), r∠θ, 3î + 4ĵ
- **Trackpad Support** — 2-finger pan, pinch-to-zoom, auto-switches to Select mode
- **Component Rotation** — 90° step rotation via context panel
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

### Run Locally

```bash
# No build step required — pure HTML/JS/CSS
cd "ckt ee"
python3 -m http.server 8080
# Open http://localhost:8080
```

Or use any static file server (Live Server, serve, etc.)

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
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
├── index.html          ← Entry point
├── vercel.json         ← Vercel deployment config
├── css/
│   └── style.css       ← Excalidraw-inspired dark theme
├── js/
│   ├── state.js        ← State management, undo/redo, persistence
│   ├── canvas.js       ← Canvas rendering, grid, coordinate transforms
│   ├── components.js   ← 8 component types, drawing, hit testing
│   ├── wire.js         ← Multi-segment wires, smart snap, junctions
│   ├── tools.js        ← Tool handlers (Select, Wire, Eraser, Text, Place)
│   ├── export.js       ← PNG/JPG/PDF/A4/Transparent export, JSON import
│   ├── ui.js           ← Floating UI, modals, symbols, context panel
│   └── app.js          ← Bootstrap, event routing, trackpad detection
└── assets/
```

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
