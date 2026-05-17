# CircuitCraft — Codebase Health Check

> **Note (May 2026):** Many of the issues listed below (such as hardcoded values, text bounds guessing, and duplicate renders) have been resolved in version 2.4.0 with the introduction of the Component Generation Engine and strict dynamic rendering rules. This document remains for historical auditing purposes.
> Every item includes exact file, line number, and impact assessment.

---

## Part A: Hardcoded Values (Not Covered in improvements.md)

---

### HC-1: Hardcoded Text Width Guess in Export Bounds
**File:** `export.js:363`
```javascript
maxX = Math.max(maxX, t.x + 120);  // ← hardcoded 120px width for ALL text
```
**Problem:** `getContentBounds()` assumes every text annotation is 120px wide. A text like "R1" is ~15px, while "Voltage Controlled Current Source" is ~250px. This causes:
- Short text: Export has excess padding to the right
- Long text: Text gets clipped in PNG/PDF exports — the bounding box is too small

**Fix:** Measure actual text width using `ctx.measureText()`:
```javascript
ctx.font = (t.bold ? 'bold ' : '') + t.fontSize + 'px sans-serif';
var textWidth = ctx.measureText(t.text || 'Text').width;
maxX = Math.max(maxX, t.x + textWidth);
```

**Severity:** 🟠 High — directly causes broken exports for long annotations.

---

### HC-2: Hardcoded Component Bounds — Ignores Actual Drawing Size
**File:** `components.js:140-149`
```javascript
function getComponentBounds(comp) {
  if (comp.type === 'ground') {
    return { x: comp.x - 18, y: comp.y - 22, w: 36, h: 36 };  // ← hardcoded
  }
  var isVertical = (comp.rotation === 90 || comp.rotation === 270);
  if (isVertical) {
    return { x: comp.x - 18, y: comp.y - 42, w: 36, h: 84 };  // ← hardcoded
  }
  return { x: comp.x - 42, y: comp.y - 18, w: 84, h: 36 };    // ← hardcoded
}
```
**Problem:** Every component (resistor, capacitor, inductor, voltage source, lamp, switch, dependent sources) gets the SAME 84×36 bounding box. But:
- Lamp (`drawLamp()`) draws a 30px-diameter circle — its actual bounds are ~70×30, not 84×36
- Dependent sources draw a 40×40 diamond — their height extends to ±20 from center, but bounds say 36 height
- Ground is 30px wide (lines from -15 to +15) but bounds say 36px
- Component label is drawn OUTSIDE the bounds (24px below center for horizontal, 24px right for vertical)

**Impact:**
- Selection highlight box doesn't match visual shape — looks buggy
- Hit testing area doesn't match what users see — clicks near edges may miss
- Export `getContentBounds()` uses these values — exports can clip labels

**Fix:** Calculate bounds dynamically from port positions and draw dimensions, OR store bounds in COMPONENT_DEFS per type.

**Severity:** 🟠 High — selection/export accuracy issue.

---

### HC-3: Hardcoded `lineWidth` Reset in Voltage/Dependent Source Drawing
**File:** `components.js:306, 321, 379, 394`
```javascript
// Inside drawVoltageSource()
ctx.lineWidth = 1.5;    // ← set for + sign drawing
// ... draw + and − signs
ctx.lineWidth = 2;       // ← reset to 2, but what if caller used a different width?

// Same pattern in drawDependentVoltageSource() at L379, L394
```
**Problem:** These functions mutate `ctx.lineWidth` internally and hardcode the reset value to `2`. If the caller ever changes the default line width (e.g., for high-DPI export at 3x scale, or for wire stroke weight feature), these functions will silently reset it to 2.

**Fix:** Save and restore lineWidth:
```javascript
var origLineWidth = ctx.lineWidth;
ctx.lineWidth = 1.5;
// ... draw signs
ctx.lineWidth = origLineWidth;
```
Or better: use `ctx.save()` / `ctx.restore()` around the sign drawing.

**Severity:** 🟡 Medium — will bite when implementing wire stroke weight (MajorUpdates Feature 1).

---

### HC-4: Hardcoded Label Font and Color — Can't Theme
**File:** `components.js:636-639, 667-668`
```javascript
// Dependent source labels
drawTextWithSubscript(ctx, parts, labelX, subY, {
  font: '12px sans-serif',       // ← hardcoded font size and family
  subFont: '9px sans-serif',     // ← hardcoded
  subOffsetY: 4,                 // ← hardcoded
  color: '#444'                  // ← hardcoded color
});

// Regular component labels
ctx.font = '12px sans-serif';    // ← hardcoded
ctx.fillStyle = '#444';          // ← hardcoded
```
**Problem:** Component labels are always 12px sans-serif in #444 color. When implementing:
- Dark mode → labels become invisible against dark components
- Custom themes → can't match brand colors
- High-DPI export → 12px is too small at 3x scale
- Accessibility → users with vision issues can't increase label size

**Fix:** Read label style from a config object or CSS variables.

**Severity:** 🟡 Medium — blocks dark mode and theming.

---

### HC-5: Hardcoded Grid Color
**File:** `canvas.js:58`
```javascript
ctx.strokeStyle = '#e8e8e8';   // ← light gray, only works on white background
```
**Problem:** Grid color is hardcoded light gray. On a dark-themed canvas, this grid would be invisible. The entire canvas background is also hardcoded white at `canvas.js:84`:
```javascript
ctx.fillStyle = '#ffffff';     // ← hardcoded white background
```

**Fix:** Use CSS variables or a theme config:
```javascript
ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-color') || '#e8e8e8';
```

**Severity:** 🟡 Medium — blocks dark mode canvas.

---

### HC-6: Hardcoded Selection/Accent Color Across Multiple Files
**Files:** `canvas.js:143, 176, 199, 231`, `wire.js:147, 156, 165, 199, 204, 225`
```javascript
// canvas.js — selection highlight
ctx.strokeStyle = '#b5a3f7';

// wire.js — wire preview
ctx.strokeStyle = '#b5a3f7';
ctx.fillStyle = '#b5a3f7';

// wire.js — snap indicators
ctx.fillStyle = '#b5a3f7';     // port snap
ctx.fillStyle = '#f59e0b';     // wire snap (orange)
```
**Problem:** The accent color `#b5a3f7` is used in 12+ places across 2 files. Changing the brand accent means finding and replacing in all locations. This is fragile and error-prone.

**Note:** The CSS already has `--accent: #8b5cf6` defined — but the canvas JS doesn't read it. The canvas uses a DIFFERENT shade (`#b5a3f7`) than what CSS uses (`#8b5cf6`). This is a brand inconsistency.

**Fix:** Create a shared theme object:
```javascript
const CANVAS_THEME = {
  accent: '#b5a3f7',
  accentFade: 'rgba(181, 163, 247, 0.4)',
  wireSnap: '#f59e0b',
  text: '#000000',
  label: '#444',
  grid: '#e8e8e8',
  background: '#ffffff'
};
```

**Severity:** 🟡 Medium — brand inconsistency + blocks theming.

---

### HC-7: Hardcoded Export Filename
**File:** `export.js:52, 95, 182, 296`
```javascript
link.download = 'circuit.' + ext;           // L52 — standard export
link.download = 'circuit_transparent.png';   // L95 — transparent export
link.download = 'circuit_a4.' + ext;         // L182 — A4 export
link.download = 'circuit.json';              // L296 — JSON save
```
**Problem:** Every export uses the generic name "circuit". Users saving multiple circuits get `circuit.png`, `circuit (1).png`, `circuit (2).png` — impossible to tell apart.

**Fix:** When cloud storage is added (MajorUpdates Feature 3), use the project title. For now, add a timestamp:
```javascript
var timestamp = new Date().toISOString().slice(0,16).replace(/[T:]/g, '-');
link.download = 'circuit_' + timestamp + '.' + ext;
```

**Severity:** 🟢 Low — UX annoyance, easy fix.

---

### HC-8: Hardcoded Print Preview A4 Only
**File:** `canvas.js:270-272`
```javascript
var a4w = 794;
var a4h = 1123;
```
**Problem:** Print preview only supports A4. US users expect Letter (8.5" × 11" = 816 × 1056 at 96 DPI). No way to change paper size.

**Fix:** Add paper size selection to the export modal:
```javascript
var PAPER_SIZES = {
  a4: { w: 794, h: 1123, label: 'A4' },
  letter: { w: 816, h: 1056, label: 'US Letter' },
  a3: { w: 1123, h: 1587, label: 'A3' },
  legal: { w: 816, h: 1344, label: 'US Legal' }
};
```

**Severity:** 🟡 Medium — blocks US market adoption.

---

### HC-9: Hardcoded `font-family` in `drawText()` and `hitTestText()`
**File:** `canvas.js:299, 311`, `canvas.js:154, 210`
```javascript
// drawText
ctx.font = fontStyle + textObj.fontSize + 'px sans-serif';  // L299

// hitTestText
ctx.font = fontStyle + textObj.fontSize + 'px sans-serif';  // L311

// drawSelectionHighlight (text measurement)
ctx.font = fontStyle + txt.fontSize + 'px sans-serif';      // L154, L210
```
**Problem:** Text is always `sans-serif`. Users expect to choose fonts for labels. Worse: `sans-serif` renders differently across browsers/OS (Helvetica on Mac, Arial on Windows) — exported circuits look different on different systems.

**Fix:** Already covered in MajorUpdates Feature 1, but listing here because FOUR separate locations need updating, not just `drawText()`.

**Severity:** 🟡 Medium — visual inconsistency across platforms.

---

### HC-10: Hardcoded Junction Dot Radius Mismatch
**File:** `wire.js:249` vs `export.js:243`
```javascript
// wire.js — on-screen rendering
ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);   // radius = 4

// export.js — export rendering
ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);   // radius = 4 (matches)
```
**But port dots in components.js:**
```javascript
// components.js:212
ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);     // radius = 3
```
**Problem:** Junction dots (4px) and port dots (3px) are different sizes. They overlap when a junction forms at a port. Also, wire snap indicator is 6px (`wire.js:201`), wire point draggable handle is 4px (`canvas.js:202`). These are all slightly different sizes with no design consistency.

**Fix:** Define dot sizes in a constants object:
```javascript
const DOT_SIZES = {
  port: 3,
  junction: 4,
  snapIndicator: 6,
  wirePoint: 4,
  snapRing: 10
};
```

**Severity:** 🟢 Low — visual inconsistency.

---

### HC-11: Hardcoded Undo Stack Limit
**File:** `state.js:55-57`
```javascript
if (state.undoStack.length > 50) {
  state.undoStack.shift();
}
```
**Problem:** Maximum 50 undo steps. No corresponding limit on `redoStack`. A user doing 100 redos after 100 undos would have an unbounded redo stack while undo is capped. Memory leak potential.

**Fix:** Cap both stacks and make the limit configurable:
```javascript
const MAX_HISTORY = 50;
if (state.undoStack.length > MAX_HISTORY) state.undoStack.shift();
if (state.redoStack.length > MAX_HISTORY) state.redoStack.shift();
```

**Severity:** 🟢 Low — memory leak on edge case.

---

### HC-12: Hardcoded Save Throttle Duration
**File:** `state.js:114-118`
```javascript
_saveTimer = setTimeout(function() {
  _saveTimer = null;
  _doSave();
}, 300);  // ← 300ms throttle, hardcoded
```
**Problem:** 300ms throttle means rapid actions (like dragging a component) can trigger saves faster than necessary, or miss saves if the tab closes within the window.

**Severity:** 🟢 Low — works fine for now.

---

### HC-13: Hardcoded Modal Transition Duration
**File:** `ui.js:489`
```javascript
setTimeout(function() { overlay.classList.add('hidden'); }, 120);  // ← 120ms
```
And `app.js:356`:
```javascript
setTimeout(function() { m.classList.add('hidden'); }, 120);        // ← 120ms
```
**Problem:** Modal close animation duration is hardcoded in JS (120ms) and must match the CSS transition duration. If they drift, you get flicker.

**Fix:** Read from CSS or define once:
```javascript
const MODAL_TRANSITION_MS = 120;
```

**Severity:** 🟢 Low.

---

## Part B: Dead Code / Unused Code

---

### DEAD-1: `comp.ports` Array Created But Never Read
**File:** `components.js:118`
```javascript
function createComponent(type, x, y) {
  return {
    id: generateId(),
    type: type,
    x: x, y: y,
    rotation: def.defaultRotation,
    value: def.defaultValue,
    ports: def.ports.map(function(p, i) { return { id: i, x: p.x, y: p.y }; })
    // ↑ This ports array is CREATED for every component
    // but getComponentPorts() at L124 reads from COMPONENT_DEFS, NOT from comp.ports
  };
}
```
**Impact:** Every component object carries a `ports` array that is:
- ✅ Written to localStorage (wastes storage)
- ✅ Exported to JSON (wastes file size)
- ❌ Never read by the renderer
- ❌ Never used for hit testing
- ❌ Never used for wire connections

This is ~40 bytes of dead data per component. On a 200-component circuit, that's ~8KB of useless JSON.

**Fix:** Either remove the `ports` field from `createComponent()`, OR refactor `getComponentPorts()` to read from `comp.ports` first.

**Severity:** 🟠 High — this is the root cause of the "JSON ports are dead" issue.

---

### DEAD-2: Legacy Wire Connection Fields Never Cleaned Up
**File:** `wire.js:364-374`
```javascript
// Legacy format support
if (wire.startComponentId === componentId) {
  if (ports[wire.startPortIndex]) {
    wire.points[0] = { x: ports[wire.startPortIndex].x, y: ports[wire.startPortIndex].y };
  }
}
if (wire.endComponentId === componentId) {
  if (ports[wire.endPortIndex]) {
    wire.points[wire.points.length - 1] = { x: ports[wire.endPortIndex].x, y: ports[wire.endPortIndex].y };
  }
}
```
And `tools.js:527-528`:
```javascript
if (w.startComponentId === cid || w.endComponentId === cid) return false;
```

**Problem:** These `startComponentId`, `endComponentId`, `startPortIndex`, `endPortIndex` fields are from an OLD wire format. The current format uses `wire.connections.start` and `wire.connections.end`. But both paths are checked everywhere — **doubling the code**.

No migration exists — old-format wires are never converted to new-format. So both code paths must coexist forever, unless you add a migration on load.

**Fix:** Add a migration function in `loadFromLocalStorage()`:
```javascript
function migrateWire(wire) {
  if (wire.startComponentId && !wire.connections) {
    wire.connections = {
      start: { type: 'port', componentId: wire.startComponentId, portIndex: wire.startPortIndex },
      end: wire.endComponentId ? { type: 'port', componentId: wire.endComponentId, portIndex: wire.endPortIndex } : { type: 'free' }
    };
    delete wire.startComponentId;
    delete wire.startPortIndex;
    delete wire.endComponentId;
    delete wire.endPortIndex;
  }
}
```
Then remove the legacy code paths.

**Severity:** 🟠 High — code duplication and confusion.

---

### DEAD-3: `defaultValue: ''` in Every COMPONENT_DEFS Entry
**File:** `components.js:15, 23, 31, 39, 47, 55, 63, 71, 79, 87, 95, 103`

All 12 components have `defaultValue: ''`. This field is never anything but an empty string. `createComponent()` copies it as `value: def.defaultValue`, which is always `''`.

**Impact:** 12 unnecessary lines. But more importantly, it could be useful if properly populated:
```javascript
resistor:  { defaultValue: '1kΩ' },
capacitor: { defaultValue: '10µF' },
voltage:   { defaultValue: '5V' },
```
This would give new components a meaningful default label instead of showing the abbreviation.

**Fix:** Either remove the field entirely (and default to `''` in `createComponent()`), OR actually populate it with useful defaults.

**Severity:** 🟢 Low — wasted opportunity, not a bug.

---

### DEAD-4: `COMPONENT_UNITS` Referenced But Defined Nowhere in Scanned Files
**File:** `ui.js:497`
```javascript
var unitInfo = COMPONENT_UNITS[comp.type] || {};
```
This object is used in `openValueEditModal()` but I can't find where it's defined. It's likely in the HTML or a separate unscanned file. But if it's missing, it silently falls through to `{}` and the unit chips, example values, and SI guide all show nothing.

**Fix:** Verify `COMPONENT_UNITS` exists. If it's in the HTML as inline script, move it to `components.js`.

**Severity:** 🟡 Medium — potential silent failure.

---

### DEAD-5: `drawPlacingPreview()` Always Creates `_preview` ID Object
**File:** `canvas.js:254-263`
```javascript
var preview = {
  id: '_preview',
  type: state.placingComponent,
  x: x, y: y,
  rotation: def.defaultRotation,
  value: ''
};
drawComponent(ctx, preview);
```
**Problem:** A fake component object is created EVERY render frame while placement mode is active. At 60fps, that's 60 object allocations per second — all immediately garbage collected.

**Fix:** Create the preview object once when entering place mode, update x/y on mouse move:
```javascript
// In setTool or when entering place mode:
state._placingPreview = { id: '_preview', type: compType, x: 0, y: 0, rotation: def.defaultRotation, value: '' };

// In drawPlacingPreview:
state._placingPreview.x = snapToGrid(state.mouseWorld.x);
state._placingPreview.y = snapToGrid(state.mouseWorld.y);
drawComponent(ctx, state._placingPreview);
```

**Severity:** 🟢 Low — micro-optimization, no visible impact.

---

### DEAD-6: `updateContextPanel` Called via `setInterval` Even When Nothing Changes
**File:** `ui.js:120`
```javascript
setInterval(updateContextPanel, 400);  // ← runs every 400ms forever
```
And `ui.js:117`:
```javascript
setInterval(updateBottomBar, 500);     // ← runs every 500ms forever
```

**Problem:** These poll functions run continuously even when nothing has changed. `updateContextPanel()` does DOM manipulation (innerHTML, addEventListener) on every call if the selected item changed. But even when nothing changes, it still runs the check and comparison logic.

**Fix:** Use event-driven updates — call `updateContextPanel()` only when `state.selected` changes:
```javascript
// In selectMouseDown, deleteSelected, etc:
state.selected = { type: 'component', id: comp.id };
updateContextPanel();  // explicit call
```
Remove the `setInterval`.

**Severity:** 🟡 Medium — unnecessary CPU usage, potential DOM thrashing.

---

### DEAD-7: `altPressed` Variable Declared But Not Imported in tools.js
**File:** `app.js:4`
```javascript
var spacePressed = false;
var altPressed = false;
```

`altPressed` is set in `handleKeyDown` and `handleKeyUp` in `app.js`, but it's never read anywhere in tools.js or any other file. The wire ortho mode toggle uses `state.wireOrthoMode` directly:
```javascript
// handleKeyDown (app.js:196-200)
altPressed = true;
state.wireOrthoMode = false;  // ← this is what actually controls behavior

// handleKeyUp (app.js:279-282)
altPressed = false;
state.wireOrthoMode = true;
```

The `altPressed` boolean is set but never checked. `state.wireOrthoMode` is the real flag.

**Fix:** Remove `altPressed` — it's dead.

**Severity:** 🟢 Low — dead variable, no impact.

---

### DEAD-8: Double `---` Separator Above Feature 11
**File:** `MajorUpdates.md:641-643` (fixed during analysis)
```markdown
---

---

## Feature 11:
```
Two consecutive `---` separators. Cosmetic issue.

**Severity:** 🟢 Low — formatting only.

---

### DEAD-9: `module.exports` in package.json — Empty Project
**File:** `package.json`
```json
{"dependencies": {"opencv.js": "^1.2.1"}}
```
**Problem:** The root `package.json` only has opencv.js as a dependency — leftover from the photo-to-circuit import experiment. The editor doesn't use it. The `node_modules` folder contains opencv.js (~30MB) doing nothing.

The landing page has its OWN `package.json` with Vite, React dependencies. These are separate projects with no shared build system.

**Fix:** Remove opencv.js from root package.json (or delete root package.json entirely since the editor is vanilla JS). Clean up node_modules.

**Severity:** 🟡 Medium — 30MB of unused dependency, clutters deploy.

---

### DEAD-10: Print Preview Title Text Recalculates Every Frame
**File:** `canvas.js:289-292`
```javascript
ctx.font = (12 / state.zoom) + 'px Inter, sans-serif';
ctx.fillText('A4 Portrait (' + a4w + ' × ' + a4h + ')', ox + 6, oy + 4);
```
**Problem:** String concatenation and font calculation every frame while print preview is active. Minor, but the label text never changes.

**Severity:** 🟢 Low.

---

## Summary Table

| ID | Category | File | Severity | Effort |
|----|----------|------|----------|--------|
| HC-1 | Hardcoded | export.js:363 | 🟠 High | 5 min |
| HC-2 | Hardcoded | components.js:140-149 | 🟠 High | 30 min |
| HC-3 | Hardcoded | components.js:306,321,379,394 | 🟡 Medium | 10 min |
| HC-4 | Hardcoded | components.js:636-668 | 🟡 Medium | 20 min |
| HC-5 | Hardcoded | canvas.js:58,84 | 🟡 Medium | 10 min |
| HC-6 | Hardcoded | canvas.js + wire.js (12 places) | 🟡 Medium | 20 min |
| HC-7 | Hardcoded | export.js:52,95,182,296 | 🟢 Low | 5 min |
| HC-8 | Hardcoded | canvas.js:270-272 | 🟡 Medium | 30 min |
| HC-9 | Hardcoded | canvas.js:299,311,154,210 | 🟡 Medium | 15 min |
| HC-10 | Hardcoded | wire.js:249 vs components.js:212 | 🟢 Low | 5 min |
| HC-11 | Hardcoded | state.js:55-57 | 🟢 Low | 2 min |
| HC-12 | Hardcoded | state.js:114-118 | 🟢 Low | 2 min |
| HC-13 | Hardcoded | ui.js:489, app.js:356 | 🟢 Low | 5 min |
| DEAD-1 | Dead code | components.js:118 | 🟠 High | 10 min |
| DEAD-2 | Dead code | wire.js:364-374, tools.js:527 | 🟠 High | 30 min |
| DEAD-3 | Dead code | components.js (12 entries) | 🟢 Low | 5 min |
| DEAD-4 | Dead code | ui.js:497 | 🟡 Medium | 10 min |
| DEAD-5 | Dead code | canvas.js:254-263 | 🟢 Low | 5 min |
| DEAD-6 | Dead code | ui.js:117,120 | 🟡 Medium | 15 min |
| DEAD-7 | Dead code | app.js:4 | 🟢 Low | 1 min |
| DEAD-8 | Dead code | MajorUpdates.md:641-643 | 🟢 Low | 1 min |
| DEAD-9 | Dead code | package.json | 🟡 Medium | 5 min |
| DEAD-10 | Dead code | canvas.js:289-292 | 🟢 Low | 5 min |

### Quick Wins (fix in under 10 minutes each)
1. **HC-1** — Fix text width in export bounds (5 min, high impact)
2. **HC-7** — Add timestamp to filenames (5 min)
3. **HC-11** — Cap redo stack (2 min)
4. **DEAD-7** — Remove `altPressed` (1 min)
5. **DEAD-9** — Remove opencv.js from root package.json (5 min)
6. **DEAD-3** — Populate `defaultValue` with real defaults (5 min)
