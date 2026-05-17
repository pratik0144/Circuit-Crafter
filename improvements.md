# CircuitCraft — Production Readiness Audit & Improvements

Deep analysis of every file in the codebase. Organized by severity and category.

---

## 🔴 Critical — Must Fix Before Launch (Desktop Focus)

### 2. Hardcoded Component Sizes — Not Extensible (✅ RESOLVED)
**File:** [components.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/components.js#L8-L105)

**Resolution:** This issue was completely resolved by the **Component Generation Engine**. Components are no longer hardcoded in `components.js`; they are generated offline from metadata, producing a library of 588+ components. `components.js` now dynamically renders these based on their primitive definitions (lines, rects, pins) loaded from `library_bundle.json`.

Every component's port positions are hardcoded to `{x: -40, y: 0}, {x: 40, y: 0}`. Drawing functions like `drawResistor()` have magic numbers (`-40`, `20`, `-16`, `8`, etc.) baked directly into the canvas draw calls.

**Problems:**
- Adding a new component (e.g., transistor, op-amp, diode, LED, IC) requires writing a brand new hardcoded draw function
- Can't change component sizes without touching multiple files
- Port spacing is locked at 80px — no multi-pin ICs possible
- The JSON port values in the file are **completely ignored** — `getComponentPorts()` at line 124 reads from `COMPONENT_DEFS`, not from the component's JSON ports

**Fix:** Create a component registry system:
```javascript
const COMPONENT_REGISTRY = {
  resistor: {
    ports: [{x: -40, y: 0}, {x: 40, y: 0}],
    bounds: {w: 84, h: 36},
    draw: (ctx) => { /* zigzag path */ },
    label: {offset: {x: 0, y: 24}, align: 'center'}
  }
};
```
Make `getComponentPorts()` read from the component's own ports array (the JSON data), not from the hardcoded defs. This allows custom components with arbitrary port layouts.

---

### 2b. JSON Port Data is Dead — Silent Data Integrity Bug
**Files:** [components.js L124-136](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/components.js#L124-L136), [export.js L307-330](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/export.js#L307-L330)

This is the exact issue you hit when trying to optimize your circuit JSON. Three interconnected problems:

**Problem A: `getComponentPorts()` ignores JSON ports entirely**
```javascript
// components.js line 124-136
function getComponentPorts(comp) {
  var def = COMPONENT_DEFS[comp.type]; // ← reads from HARDCODED defs
  // comp.ports from JSON is NEVER used
  return def.ports.map(function(p) {
    return {
      x: comp.x + Math.round(p.x * cosA - p.y * sinA),
      y: comp.y + Math.round(p.x * sinA + p.y * cosA)
    };
  });
}
```
The `ports` array in every component's JSON (`"ports": [{"id": 0, "x": -40, "y": 0}]`) is **dead data**. The renderer never reads it. This means:
- Changing port offsets in JSON does nothing
- Any JSON transform that scales port offsets breaks the visual (component draws at hardcoded positions, wire connects at JSON positions)
- Custom components with non-standard port layouts are impossible

**Problem B: Import has zero validation**
```javascript
// export.js line 307-330
function handleImportFile(e) {
  var data = JSON.parse(event.target.result);
  if (data.components && data.wires) {
    state.components = data.components; // ← no validation at all
    state.wires = data.wires;           // ← no port alignment check
    state.texts = data.texts;
  }
}
```
No checks for:
- Do wire endpoints actually land on component ports?
- Do component types exist in `COMPONENT_DEFS`?
- Are coordinates on the 20px grid?
- Are wire connection references (wireId, pointIndex) valid?
- Do port offsets in JSON match what the renderer expects?

This means corrupted or manually-edited JSON loads silently with broken connections.

**Problem C: Junction detection is purely coordinate-based — fragile**
```javascript
// wire.js line 254-287
function findJunctionPoints() {
  var pointMap = {};
  state.wires.forEach(function(wire) {
    wire.points.forEach(function(p) {
      var key = p.x + ',' + p.y;       // ← string key from coordinates
      pointMap[key] = (pointMap[key] || 0) + 1;
    });
  });
  // Junction = 3+ connections at same point
}
```
Junctions are detected by **exact coordinate matching only** — there's no topology-aware connectivity. If two wires are at `(100, 200)` and `(100.001, 200)` (e.g., from a floating point rounding error in a transform), the junction disappears. This makes any programmatic circuit manipulation (layout optimization, auto-routing, format conversion) extremely dangerous.

**Combined Impact:** These three issues together mean:
1. You **cannot safely transform** circuit JSON coordinates without deep knowledge of the renderer internals
2. A "generic IC" component (like your 8051 with 40 pins) is impossible to implement — the port system only supports the hardcoded set
3. Importing circuits from other tools (KiCad, LTSpice, Falstad) will always require perfect coordinate alignment or the topology breaks

**Fix (unified):**
1. Make `getComponentPorts()` read from `comp.ports` (the JSON data), falling back to `COMPONENT_DEFS` if missing
2. Add import validation that snaps wire endpoints to nearest port if within tolerance
3. Use connection references (wireId/componentId) as primary connectivity — use coordinates only for rendering, not for topology
4. Add a `validateCircuit()` function that runs on import and reports mismatches

---

### 3. Data Loss — localStorage Only
**Files:** [state.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/state.js#L110-L134)

Circuits are stored **only** in `localStorage`. If the user clears browser data, switches browsers, or the storage quota is exceeded, **all work is permanently lost** with no warning.

**Problems:**
- `localStorage` has a ~5MB limit — complex circuits with hundreds of wires will silently fail to save
- No error handling in `_doSave()` — the `catch(e)` block silently swallows errors
- No cloud sync, no account system, no file versioning
- The "Saved ✓" indicator shows even if the save failed

**Fix (immediate):**
1. Add proper error handling — detect `QuotaExceededError` and warn the user
2. Add a "Save to file" auto-prompt when localStorage is near capacity
3. Show the file size in the status bar

**Fix (for launch):**
- Implement cloud storage (Firebase/Supabase) with user accounts
- Add auto-save with versioning (like Google Docs)
- IndexedDB fallback for larger circuits

---

### 4. No Multi-Select / Group Operations
**Files:** [tools.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/tools.js#L49-L103), [state.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/state.js#L9)

`state.selected` can only hold **one item** (`{type, id}`). Ctrl+A selects all via a boolean flag `selectAllActive`, but there's no way to:
- Drag-select a box of items
- Shift-click to add to selection
- Move a group of selected items together
- Copy/paste a selection

**Impact:** This is the #1 UX complaint for any drawing tool. Excalidraw, Figma, etc. all support rubber-band selection. Without it, rearranging even a small part of a circuit is extremely tedious.

**Fix:** Change `state.selected` from a single object to an array:
```javascript
state.selected = []; // array of {type, id}
```
Add a rectangle selection tool (drag on empty space = draw selection box).

---

### 5. No Copy/Paste
**Files:** All tool files

There is zero implementation of copy, cut, or paste. No clipboard support at all.

**Impact:** Users can't duplicate subcircuits, can't move parts between files, can't use standard Ctrl+C/V workflows they expect from every application.

**Fix:** Implement clipboard operations:
- `Ctrl+C` → serialize selected items to a clipboard buffer
- `Ctrl+V` → deserialize and place at cursor with offset
- `Ctrl+D` → duplicate selected items in-place
- Support system clipboard for cross-tab paste

---

## 🟠 High Priority — Should Fix Before Launch

### 5b. Excalidraw-Level Rendering Architecture
**Files:** [canvas.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/canvas.js), [wire.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/wire.js), [components.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/components.js)

Excalidraw uses the **same HTML5 Canvas 2D** as CircuitCraft, but feels significantly smoother due to three architectural patterns we should adopt — while keeping our **clean, professional engineering aesthetic** (no sketchy/hand-drawn look).

**A. Scene Graph (replace flat arrays)**

Currently, all elements are stored in flat arrays (`state.components[]`, `state.wires[]`, `state.texts[]`). Every operation does linear scans. Excalidraw uses a structured scene graph.

```javascript
// Current (flat, slow):
state.components.find(c => c.id === id); // O(n) every time

// Scene graph approach:
class Scene {
  elements = new Map();     // id → element (O(1) lookup)
  zOrder = [];              // rendering order
  spatialIndex = null;      // grid-based spatial hash for hit testing
  
  getElementById(id) { return this.elements.get(id); }
  getElementsInBounds(rect) { return this.spatialIndex.query(rect); }
}
```

**Impact:** O(1) element lookup, O(log n) spatial queries instead of O(n) linear scans. Enables grouping, layers, and z-ordering.

---

**B. Viewport Culling (only draw what's visible)**

Currently, `render()` draws ALL wires, ALL components, ALL texts — even those far off-screen. With 150+ wires this wastes significant GPU/CPU time.

```javascript
// Current (draws everything):
state.wires.forEach(function(wire) { drawWire(ctx, wire); });

// With viewport culling:
const viewport = getVisibleBounds(); // screen rect in world coords
const visibleWires = scene.getElementsInBounds(viewport);
visibleWires.forEach(wire => drawWire(ctx, wire));
```

**Impact:** At 25% zoom on a large circuit, only ~30% of elements are visible. Culling gives a **3x rendering speedup** for free.

---

**C. Smooth Micro-Animations**

Excalidraw feels alive because of subtle animations. We should add (while staying professional):

| Animation | Where | Implementation |
|-----------|-------|----------------|
| **Smooth zoom** | Scroll wheel | Lerp zoom level over 3-4 frames instead of instant jump |
| **Snap feedback** | Wire endpoint snaps to port | Brief scale pulse on the port dot (1.0 → 1.3 → 1.0 over 150ms) |
| **Selection glow** | Select a component | Soft fade-in of selection highlight (0 → 1 opacity over 100ms) |
| **Delete fade** | Eraser tool | Element fades out over 120ms instead of instant disappear |
| **Drag shadow** | Moving component | Subtle drop shadow appears while dragging |
| **Wire drawing** | Drawing new wire | Committed segments fade from accent to black as they're finalized |

```javascript
// Smooth zoom example:
let targetZoom = state.zoom;
function animateZoom() {
  if (Math.abs(state.zoom - targetZoom) > 0.001) {
    state.zoom += (targetZoom - state.zoom) * 0.25; // lerp
    markDirty();
    requestAnimationFrame(animateZoom);
  } else {
    state.zoom = targetZoom;
    markDirty();
  }
}
```

**Impact:** These micro-interactions make the tool feel premium and responsive — the "too good" feel the user experiences in Excalidraw — without compromising the professional, clean schematic aesthetic.

---

**D. Double-Buffered Rendering**

Use an offscreen canvas for rendering, then copy to the visible canvas in one operation. Prevents flickering during complex redraws.

```javascript
const offscreen = document.createElement('canvas');
const offCtx = offscreen.getContext('2d');

function render() {
  // Draw everything to offscreen
  offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
  drawGrid(offCtx);
  drawWires(offCtx);
  drawComponents(offCtx);
  
  // Single copy to visible canvas
  ctx.drawImage(offscreen, 0, 0);
}
```

> **Note:** We intentionally do NOT adopt Rough.js (Excalidraw's hand-drawn style). Circuit schematics must remain clean, precise, and print-ready. The improvements above are architectural — they make the editor **feel** as good as Excalidraw while keeping the **look** professional.

---

### 6. Component Library is Extremely Limited
**File:** [components.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/components.js#L8-L105)

Only 12 components: R, C, L, V, I, Switch, Lamp, Ground, VCVS, CCCVS, VCCS, CCCS.

**Missing essential components:**
- **Semiconductor:** Diode, Zener, LED, NPN/PNP Transistor, MOSFET, Op-Amp
- **Digital:** AND/OR/NOT/NAND/NOR/XOR gates, Flip-flops
- **Connectors:** Terminal block, Connector, Probe, Test point
- **Passive:** Potentiometer, Transformer, Crystal, Fuse
- **ICs:** Generic IC/DIP package with configurable pins (like your 8051/ADC)

**Impact:** Users who need transistors, op-amps, or logic gates — the majority of electronics students — can't use your tool at all. They'll go to Falstad, EasyEDA, or TinkerCAD.

**Fix:** Priority order for new components:
1. Diode + LED (huge demand)
2. NPN/PNP Transistor
3. Op-Amp (triangle symbol)
4. Generic IC block (configurable pin count)
5. Logic gates

---

### 7. Wire System Has Orphaned Reference Bugs
**File:** [wire.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/wire.js#L254-L287)

Wire connections use `wireId` + `pointIndex` references. When a wire is deleted, **no cleanup of references** from other wires pointing to it:

```javascript
// tools.js line 537 — deletion just removes the wire
state.wires = state.wires.filter(function(w) { return w.id !== wid; });
// But other wires that reference this wire's points are NOT updated!
```

**Impact:** Deleted wires leave dangling `wireId` references in other wires' connections. This doesn't crash (the reference just doesn't match anything), but:
- Junction dots disappear at connected points
- Re-imported JSON has broken topology
- Future features (netlist export, simulation) will produce wrong results

**Fix:** When deleting a wire, iterate all remaining wires and clear any connections referencing the deleted wire's ID.

---

### 8. Junction Detection is O(n²) — Will Lag on Complex Circuits
**File:** [wire.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/wire.js#L254-L287)

`findJunctionPoints()` iterates every point of every wire on every frame. Wire jump detection in `drawSegmentWithJumps()` tests every segment against every other segment — O(n²).

With 150+ wires (like your 8051 circuit), this means ~22,500 intersection tests **per frame** at 60fps. Performance will degrade sharply with larger circuits.

**Fix:**
- Cache junction points — only recalculate when wires change (use a dirty flag)
- Use spatial indexing (grid hash) for wire intersection tests
- Implement frustum culling — only test wires visible on screen

---

### 9. Undo Stack Stores Full Deep Copies — Memory Bomb
**File:** [state.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/state.js#L44-L57)

Every `saveSnapshot()` does `JSON.parse(JSON.stringify(state.components/wires/texts))` — a complete deep copy of the entire circuit. With 50 undo levels and a complex circuit (your 8051 JSON is 75KB), that's **3.75MB** of JSON being parsed and stored per undo stack.

**Impact:** On complex circuits with frequent edits, this will cause GC pauses and jank.

**Fix:** Switch to a command pattern (store diffs/operations, not full snapshots):
```javascript
// Instead of: undoStack.push(fullCopy)
// Do: undoStack.push({action: 'move', id: 'comp1', from: {x:100,y:200}, to: {x:120,y:220}})
```

---

### 10. No Keyboard Shortcuts for Tools
**File:** [app.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/app.js) — Comment at line 3: "No tool keyboard shortcuts"

The CHANGELOG says shortcuts were intentionally removed in v2.0. But for a production tool, power users absolutely need:
- `V` → Select, `W` → Wire, `E` → Eraser, `T` → Text
- `R` → Resistor, `C` → Capacitor, etc.
- `Ctrl+S` → Save JSON (currently does nothing — browser tries to save the HTML page!)

**Impact:** Excalidraw has full keyboard shortcuts. Any serious user will find clicking toolbar buttons for every action extremely slow.

**Fix:** Add an optional shortcut system with a `?` help overlay showing all bindings.

---

## 🟡 Medium Priority — Important for Product Quality

### 11. Canvas Renders Black Components on White — No Theme Support
**File:** [components.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/components.js#L186-L188)

The canvas always draws with `ctx.strokeStyle = '#000000'` (black). The UI chrome is dark theme, but the canvas background is white with black components. This is intentional for print, but:
- There's no option for a dark canvas mode
- Component colors are not configurable
- Wire colors are hardcoded black
- No color-coding for signal types (power, ground, data, etc.)

**Fix:** Add a canvas theme system with configurable colors:
```javascript
const CANVAS_THEME = {
  background: '#ffffff',
  componentStroke: '#000000',
  wireStroke: '#000000',
  gridLine: '#e8e8e8',
  junctionDot: '#000000',
  portDot: '#333333'
};
```

---

### 12. `setInterval` Polling for UI Updates — Bad Pattern
**File:** [ui.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/ui.js#L117-L121)

```javascript
setInterval(updateBottomBar, 500);
setInterval(updateContextPanel, 400);
```

Polling at 500ms and 400ms to check if the UI needs updating. This is wasteful and causes visible lag — when you zoom, the zoom percentage doesn't update for up to 500ms.

**Fix:** Call `updateBottomBar()` and `updateContextPanel()` directly inside `markDirty()` or after state changes. Event-driven updates, not polling.

---

### 13. No Net/Node Naming — Can't Generate Netlists
**Files:** [wire.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/wire.js), [export.js](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/js/export.js)

Wires have no concept of "nets" (electrically connected groups). There's no way to:
- Name a net (e.g., "VCC", "GND", "CLK")
- Export a SPICE netlist
- Check for unconnected pins
- Validate circuit connectivity

**Impact:** For a circuit tool to be useful beyond drawing, it needs netlist export. Students need SPICE netlists for simulation. Professionals need KiCad/LTSpice compatibility.

**Fix:** Implement net extraction:
1. Build connectivity graph from wire connections + component ports
2. Assign net names (auto-generated or user-labeled)
3. Export to SPICE `.cir` format
4. Add ERC (Electrical Rules Check) — detect floating pins, shorted nets

---

### 14. Global Variables Everywhere — No Module System
**Files:** All JS files

Every function and variable is in the global scope. `COMPONENT_DEFS`, `state`, `canvas`, `ctx`, `spacePressed`, `altPressed`, `_modalCallbacks`, `_lastContextId` — all globals.

```html
<!-- HTML loads 8 scripts in dependency order -->
<script src="js/state.js"></script>
<script src="js/canvas.js"></script>
<!-- ... 6 more -->
```

**Problems:**
- Any script can accidentally overwrite any variable
- Load order matters — wrong order = crash with no useful error
- Can't tree-shake unused code
- Can't lazy-load components
- No minification/bundling in production (editor loads 8 separate JS files over 8 HTTP requests)

**Fix:** Migrate to ES modules:
```javascript
// state.js
export const state = { ... };
export function saveSnapshot() { ... }

// app.js
import { state, saveSnapshot } from './state.js';
```

Use a bundler (Vite/esbuild) for the editor too — you already use Vite for the landing page.

---

### 15. `canvas` Dependency in Root Package
**File:** [package.json](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/package.json)

```json
{ "dependencies": { "canvas": "^3.2.3" } }
```

The root `package.json` depends on `canvas` (a Node.js native module for server-side canvas rendering). But the editor is entirely client-side browser code. This dependency:
- Downloads native binaries on `npm install` (slow, platform-specific)
- Isn't used anywhere in the editor code
- Causes install failures on some platforms

**Fix:** Remove this dependency. If it was for the image import feature, handle that separately.

---

### 16. No Accessibility (a11y)
**Files:** [index.html](file:///Users/pratikpotadar/Developer/ckt%20crafter%20testing/Circuit-Crafter-main/editor/index.html), all UI

- Canvas element has no ARIA labels
- Toolbar buttons have no `aria-label` (only `data-tip` which isn't accessible)
- Modals don't trap focus
- No skip-navigation links
- Color contrast in dark theme may not meet WCAG standards
- No screen reader support at all

**Impact:** Legally required in many markets (EU, US Section 508). Educational institutions (your target) often mandate a11y compliance.

**Fix:** Add `aria-label` to all buttons, implement focus trapping in modals, add a "Skip to canvas" link.

---

## 🔵 Nice to Have — Competitive Advantages

### 17. No Real-Time Collaboration
Unlike Excalidraw (which has live collaboration via WebSocket), CircuitCraft is single-user only. For classroom/team use, real-time co-editing would be a massive differentiator.

### 18. No Component Search
With 12+ components, the grid picker works. With 50+ (after adding transistors, gates, ICs), you need a search bar with fuzzy matching.

### 19. No Wire Color / Style Options
Can't color-code wires (red for power, blue for ground, green for signal). Can't change wire thickness. Professional schematics use color coding extensively.

### 20. No SVG Export
PNG/JPG/PDF are raster. SVG would give infinite-resolution vector output that works perfectly in technical documents, LaTeX papers, and wikis. The canvas drawing commands can be replayed to an SVG context using a library like `canvas2svg`.

### 21. No Auto-Layout / Auto-Router
As we discovered trying to optimize your JSON, there's no programmatic way to clean up a circuit layout. An auto-arrange feature (even simple spring-based force layout) would be extremely valuable.

### 22. No Component Rotation Labels
When a component is rotated, the label stays horizontal (good), but the label position doesn't adapt well for all orientations. At 180°, labels may overlap with wires.

### 23. No Snap-to-Wire for Components
When placing a component, it only snaps to the grid. It should also snap to nearby wire endpoints, automatically connecting to existing wires.

### 24. No Circuit Templates / Examples
New users see an empty canvas. Providing starter templates (voltage divider, RC filter, common emitter amplifier) would dramatically improve onboarding and showcase the tool's capabilities.

---

## 📊 Summary Priority Matrix

| Priority | Count | Items |
|----------|-------|-------|
| 🔴 Critical | 4 | Extensible components, data persistence, multi-select, copy/paste |
| 🟠 High | 6 | Rendering architecture (scene graph, viewport culling, micro-animations), component library, orphaned refs, performance, undo memory, keyboard shortcuts |
| 🟡 Medium | 6 | Canvas theme, polling UI, netlists, modules, unused dep, accessibility |
| 🔵 Nice to have | 9 | Touch/mobile, collaboration, search, wire colors, SVG, auto-layout, rotation labels, snap-to-wire, templates |

---

## 🎯 Recommended Launch Roadmap

### Phase 1 — MVP Polish (1-2 weeks)
- [ ] Add keyboard shortcuts
- [ ] Fix orphaned wire references on delete
- [ ] Remove unused `canvas` dependency
- [ ] Add `Ctrl+S` to save JSON
- [ ] Add `aria-label` to all buttons
- [ ] Replace `setInterval` polling with event-driven updates
- [ ] Add localStorage error handling + size warning

### Phase 2 — Core Features (2-4 weeks)
- [ ] Implement multi-select with rubber-band selection
- [ ] Implement copy/paste/duplicate
- [ ] Add 5 new components: Diode, LED, NPN Transistor, Op-Amp, Generic IC
- [ ] Scene graph architecture (Map-based element store, spatial index)
- [ ] Viewport culling (only render visible elements)
- [ ] Smooth micro-animations (zoom lerp, snap pulse, selection glow, delete fade)
- [ ] Double-buffered canvas rendering
- [ ] Add SVG export
- [ ] Add circuit templates gallery
- [ ] Migrate to ES modules + Vite bundler for editor

### Phase 3 — Product Differentiation (4-8 weeks)
- [ ] Touch/mobile support (pointer events)
- [ ] Cloud storage with user accounts
- [ ] SPICE netlist export
- [ ] ERC (Electrical Rules Check)
- [ ] Real-time collaboration
- [ ] Component search
- [ ] Wire color coding
- [ ] Auto-layout / arrange
