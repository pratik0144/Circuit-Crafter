# Circuit Crafter — Must-Fix Issues (FinalReport-fix)

**Date:** 2026-05-16  
**Priority Legend:** P0 = Launch Blocker, P1 = Fix Before GA, P2 = Fix Soon After Launch

> **Post-Remediation Status (2026-05-16):** 12 of 18 fixes applied and verified.

| Fix | Status | Fix | Status |
|-----|--------|-----|--------|
| FIX-001 | ⚠️ Open | FIX-010 | ✅ Done |
| FIX-002 | ✅ Done | FIX-011 | ✅ Done |
| FIX-003 | ✅ Done | FIX-012 | ✅ Done |
| FIX-004 | ✅ Done | FIX-013 | ⚠️ Open |
| FIX-005 | ✅ Done | FIX-014 | ⚠️ Open |
| FIX-006 | ✅ Done | FIX-015 | ⚠️ Open |
| FIX-007 | ✅ Done | FIX-016 | ✅ Done |
| FIX-008 | ✅ Done | FIX-017 | ⚠️ Open |
| FIX-009 | ✅ Done | FIX-018 | ⚠️ Open |

---

## P0 — LAUNCH BLOCKERS (Must fix before any deployment)

---

### FIX-001: Library Bundle Not Copied to Production Build

**File:** `landing/vite.config.js` → `copyEditorPlugin()`  
**Problem:** The plugin copies `js/`, `css/`, `assets/` but NOT `library/`. In production, `library-loader.js` fetches `library/library_bundle.json` → 404 → library modal is empty, 588 generated components unavailable.

**Fix:**
```diff
 // Copy CSS
 copyDir(resolve(editorRoot, 'css'), resolve(dest, 'css'))

+// Copy library (component bundle)
+copyDir(resolve(editorRoot, 'library'), resolve(dest, 'library'))
+
 // Copy assets (if non-empty)
```

**Effort:** 5 minutes

---

### FIX-002: Context Panel Crashes for Generated Components

**File:** `editor/js/ui.js` → `buildComponentContext()` (line 224)  
**Problem:** `var def = COMPONENT_DEFS[comp.type]` returns `undefined` for generated components. Line 229 accesses `def.icon` → **TypeError: Cannot read properties of undefined**.

**Fix:**
```diff
 function buildComponentContext(panel, comp) {
   var def = COMPONENT_DEFS[comp.type];
+  var genDef = (typeof GENERATED_COMPONENT_DEFS !== 'undefined') ? GENERATED_COMPONENT_DEFS[comp.type] : null;
   var unitInfo = COMPONENT_UNITS[comp.type] || {};

   var html = '';
   html += '<div class="ctx-comp-header">';
-  html += '  <div class="ctx-comp-icon">' + (def.icon || def.abbrev) + '</div>';
-  html += '  <div>';
-  html += '    <div class="ctx-comp-name">' + def.name + '</div>';
-  html += '    <div class="ctx-comp-type">' + (unitInfo.category || '') + '</div>';
+  if (def) {
+    html += '  <div class="ctx-comp-icon">' + escapeHTML(def.icon || def.abbrev) + '</div>';
+    html += '  <div>';
+    html += '    <div class="ctx-comp-name">' + escapeHTML(def.name) + '</div>';
+    html += '    <div class="ctx-comp-type">' + escapeHTML(unitInfo.category || '') + '</div>';
+  } else if (genDef) {
+    html += '  <div class="ctx-comp-icon">' + escapeHTML(genDef.displayName ? genDef.displayName.substring(0,2).toUpperCase() : '⚡') + '</div>';
+    html += '  <div>';
+    html += '    <div class="ctx-comp-name">' + escapeHTML(genDef.displayName || comp.type) + '</div>';
+    html += '    <div class="ctx-comp-type">' + escapeHTML(genDef.category || 'Component') + '</div>';
+  } else {
+    html += '  <div class="ctx-comp-icon">?</div>';
+    html += '  <div>';
+    html += '    <div class="ctx-comp-name">' + escapeHTML(comp.type) + '</div>';
+    html += '    <div class="ctx-comp-type">Unknown</div>';
+  }
```

Also add this utility function:
```js
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
```

**Effort:** 30 minutes

---

### FIX-003: XSS via innerHTML with User Data

**Files:** `editor/js/ui.js` (lines 229-265, 311, 871)  
**Problem:** User-controlled data (`comp.value`, component names from imported JSON, library bundle category names) is injected directly into innerHTML strings without escaping.

**Attack vector:** Import JSON → `comp.value = '<img onerror=alert(1)>'` → click component → XSS

**Fix:** Apply `escapeHTML()` (from FIX-002) to ALL dynamic values in innerHTML:
```diff
-  html += '    <input class="ctx-input" id="ctx-value-input" value="' + (comp.value || '') + '"';
+  html += '    <input class="ctx-input" id="ctx-value-input" value="' + escapeHTML(comp.value || '') + '"';
```

```diff
-  html += '  <input class="ctx-input" id="ctx-text-input" value="' + (txt.text || '') + '">';
+  html += '  <input class="ctx-input" id="ctx-text-input" value="' + escapeHTML(txt.text || '') + '">';
```

Apply to ALL `innerHTML` assignments that include dynamic data. Grep for `innerHTML` and audit each occurrence.

**Effort:** 1 hour

---

### FIX-004: 135 TwoPin Components Missing symbolStyle

**Files:** 135 metadata files in `ComponentsGenerating-Engine/metadata/`  
**Problem:** TwoPin metadata files don't have a `symbolStyle` field. The generator defaults to `"zigzag"` → capacitors, inductors, diodes, LEDs, fuses all render as resistor zigzag symbols.

**Fix:** Create a script to assign correct `symbolStyle` based on component name/category:
```js
// fix_symbol_styles.js
const STYLE_MAP = {
  capacitor: 'capacitor', inductor: 'inductor', 
  diode: 'diode', led: 'led', fuse: 'fuse'
};

// For each TwoPin metadata: 
// 1. Check displayName/keywords for type
// 2. Set symbolStyle accordingly
// 3. Default remaining to 'zigzag' (actual resistors)
```

Then re-run `npm run generate` to rebuild the library bundle.

**Effort:** 1-2 hours

---

### FIX-005: 19 TwoPin Components Have Bottom-Side Pins

**Files:** `passive_001.json` through `passive_027.json`, `diode_017.json`, etc.  
**Problem:** Pin 2 has `"side": "bottom"` but TwoPinGenerator only creates left (x=0,y=20) and right (x=80,y=20) pins. Bottom-side pins are silently dropped during generation.

**Fix:** Change `"side": "bottom"` → `"side": "right"` in all affected metadata files. This was likely a bulk importer error.

```bash
# Quick fix for all affected files:
find metadata/ -name "*.json" -exec \
  python3 -c "
import json,sys
f=sys.argv[1]
d=json.load(open(f))
if d.get('family')=='TwoPin':
    changed=False
    for p in d.get('pins',[]):
        if p.get('side')=='bottom':
            p['side']='right'
            changed=True
    if changed:
        json.dump(d,open(f,'w'),indent=2)
        print(f'Fixed: {f}')
" {} \;
```

Then re-run `npm run generate`.

**Effort:** 30 minutes

---

## P1 — FIX BEFORE GA

---

### FIX-006: 104 Pin Count Mismatches

**Files:** 104 metadata files  
**Problem:** `pinCount` field doesn't match actual `pins.length`. Caused by bulk importer auto-injecting VCC/GND without updating pinCount.

**Fix:** Add a post-processing step to the bulk importer:
```diff
+ metadata.pinCount = metadata.pins.length;
```

Or run a batch fix:
```bash
python3 -c "
import json, os
for fn in os.listdir('metadata'):
    if not fn.endswith('.json'): continue
    d = json.load(open(f'metadata/{fn}'))
    actual = len(d.get('pins',[]))
    if d.get('pinCount') != actual:
        d['pinCount'] = actual
        json.dump(d, open(f'metadata/{fn}','w'), indent=2)
"
```

**Effort:** 15 minutes

---

### FIX-007: JSON Import Needs Schema Validation

**File:** `editor/js/export.js` → `handleImportFile()` (line 307)  
**Problem:** Only checks `data.components && data.wires` exist. No shape validation.

**Fix:** Add validation after JSON parse:
```js
function validateImportData(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.components)) return false;
  if (!Array.isArray(data.wires)) return false;
  
  // Validate each component has required fields
  for (var c of data.components) {
    if (!c.id || !c.type || typeof c.x !== 'number' || typeof c.y !== 'number') {
      return false;
    }
  }
  
  // Validate each wire has points array
  for (var w of data.wires) {
    if (!w.id || !Array.isArray(w.points) || w.points.length < 2) {
      return false;
    }
  }
  
  return true;
}
```

**Effort:** 1 hour

---

### FIX-008: Merge Orphan Categories at Engine Export Time

**File:** `ComponentsGenerating-Engine/src/exporter.js`  
**Problem:** Categories like `"Passives"`, `"Sensors"`, `"ICs"` exist alongside normalized names in the bundle. Currently merged only at UI runtime.

**Fix:** Add category normalization in `exportComponent()`:
```js
const CATEGORY_NORMALIZE = {
  'Passives': 'Passive Components',
  'Sensors': 'Sensors & Transducers',
  'ICs': 'Microcontrollers & Processors'
};

// In exportComponent():
const normalizedCategory = CATEGORY_NORMALIZE[component.category] || component.category;
```

**Effort:** 30 minutes

---

### FIX-009: Bundle/Minify Editor JS for Production

**Problem:** 9 separate unminified JS files (~145 KB) loaded via `<script>` tags. No cache-busting.

**Options:**
1. **Quick:** Add a simple concat + minify build step using `esbuild`
2. **Better:** Convert editor to a Vite sub-project with proper bundling

**Effort:** 2-4 hours

---

### FIX-010: Bulk Importer Hardcodes Developer Path

**File:** `ComponentsGenerating-Engine/scripts/bulk-importer.js` (line 11)  
**Problem:** `const CSV_PATH = process.argv[2] || '/Users/pratikpotadar/Downloads/CircuitCrafter_Components_fixed.csv'`

**Fix:**
```diff
-const CSV_PATH = process.argv[2] || '/Users/pratikpotadar/Downloads/CircuitCrafter_Components_fixed.csv';
+const CSV_PATH = process.argv[2];
+if (!CSV_PATH) {
+  console.error('Usage: node bulk-importer.js <path-to-csv>');
+  process.exit(1);
+}
```

**Effort:** 5 minutes

---

## P2 — FIX SOON AFTER LAUNCH

---

### FIX-011: Add Generator Unit Tests

**Problem:** Zero tests. The 104 pin count mismatches and 19 bottom-pin errors would have been caught.

**Recommended test framework:** vitest (already using Vite for landing)

**Minimum tests:**
1. Each generator produces valid output for sample metadata
2. Pin count matches between metadata input and generator output  
3. All pins have valid side-geometry alignment
4. Validation pipeline catches known-bad inputs
5. Import → export round-trip preserves data integrity

**Effort:** 4-6 hours

---

### FIX-012: Lazy-Load Library Bundle

**Problem:** 1.7 MB JSON loaded on every page load even if user never opens library.

**Fix:** Load bundle only when library modal is first opened:
```js
var _bundleLoaded = false;
document.getElementById('library-btn').addEventListener('click', function() {
  if (!_bundleLoaded) {
    loadLibraryBundle(); // existing function in library-loader.js
    _bundleLoaded = true;
  }
  document.getElementById('library-modal').style.display = 'flex';
});
```

Note: This means generated components can't be placed from the quick picker until the bundle loads. Consider keeping component definitions separate from display data.

**Effort:** 2 hours

---

### FIX-013: Fix Text Width in Export Bounds

**File:** `editor/js/export.js` → `getContentBounds()`  
**Problem:** Hardcoded `maxX = t.x + 120` for text width.

**Fix:** Use canvas `measureText()`:
```js
var tempCtx = document.createElement('canvas').getContext('2d');
tempCtx.font = (t.bold ? 'bold ' : '') + t.fontSize + 'px Inter, sans-serif';
var textWidth = tempCtx.measureText(t.text).width;
maxX = Math.max(maxX, t.x + textWidth);
```

**Effort:** 30 minutes

---

### FIX-014: Add Copy/Paste Support

**Problem:** No way to duplicate components or groups.

**Recommended approach:**
- Ctrl+C: Serialize selected component(s) to clipboard buffer (internal state, not system clipboard)
- Ctrl+V: Place copied component at cursor position with new IDs
- Ctrl+D: Duplicate in-place with 20px offset

**Effort:** 4-6 hours

---

### FIX-015: Add Touch Event Handlers for Mobile

**File:** `editor/js/app.js`  
**Problem:** No `touchstart`, `touchmove`, `touchend` handlers. Editor is completely unusable on mobile/tablet.

**Fix:** Map touch events to equivalent mouse events:
```js
canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  var touch = e.touches[0];
  handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
});
// ... touchmove → mousemove, touchend → mouseup
```

**Effort:** 3-4 hours

---

### FIX-016: Optimize Wire Jump Detection

**File:** `editor/js/wire.js` → `drawSegmentWithJumps()`  
**Problem:** O(W²×S²) complexity checking all wire segments against all others.

**Fix:** Build a spatial index (grid-based hash map) of wire segments before rendering:
```js
function buildSegmentIndex(wires) {
  var index = {};
  // Hash each segment into grid cells it passes through
  // Lookup only checks segments in same/neighboring cells
}
```

**Effort:** 3-4 hours

---

### FIX-017: Add Rubber-Band Multi-Selection

**Problem:** Only Ctrl+A bulk selection exists. No way to lasso-select a group.

**Recommended approach:**
- In select tool, mouse-drag on empty canvas draws selection rectangle
- On mouseup, select all components/wires/texts within bounds
- Selected items can be dragged/deleted as a group

**Effort:** 4-6 hours

---

### FIX-018: Add CSP Meta Tag

**File:** `editor/index.html`  
**Fix:**
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:;">
```

**Effort:** 30 minutes

---

## Summary

| Priority | Total | Fixed | Remaining | Est. Remaining Effort |
|----------|-------|-------|-----------|----------------------|
| **P0 (Launch Blockers)** | 5 | 4 | 1 | ~5 minutes (vite config) |
| **P1 (Before GA)** | 5 | 5 | 0 | ✅ Complete |
| **P2 (After Launch)** | 8 | 3 | 5 | ~15-20 hours |

**To ship now:** Apply FIX-001 (one-line vite.config.js edit) — all other blockers resolved.

**Applied fixes:** FIX-002 through FIX-012, FIX-016, FIX-017 (12 total)  
**Open items:** FIX-001 (vite config), FIX-013 (copy/paste), FIX-014 (touch), FIX-015 (text width), FIX-017 (multi-select), FIX-018 (CSP)
