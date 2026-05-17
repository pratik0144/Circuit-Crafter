# CircuitCraft — Major Updates Roadmap

> Each feature is detailed enough to hand off to an AI agent or developer for implementation.
> Features will be implemented one-by-one in priority order.

---

## Feature -1: Advanced Components Library Tab

### Current State
- The component picker (`index.html:66-135`) is a hardcoded grid of basic passive and active elements.
- No system exists to browse, search, or import advanced components (e.g., Microcontrollers, 555 Timers, Logic Gates, AC Machines).
- All components must be defined in the monolithic `COMPONENT_DEFS` object, which would blow up the bundle size if hundreds of parts are added.

### What To Build

**A. Dedicated Library UI**
- Build a sliding side-panel or full-screen modal accessible via a "Browse Library" button in the toolbar.
- Implement categorized navigation (Microcontrollers, Digital Logic, Power, AC/DC Machines) and a real-time search bar.
- Each component displays a visual preview generated dynamically or from an SVG thumbnail.

**B. Dynamic Component Loading**
- Move advanced component definitions out of `components.js` and into external JSON files hosted on the cloud/CDN.
- When a user selects a component from the library, fetch its definition (ports, bounds, rendering logic) and inject it into the local `COMPONENT_REGISTRY`.

**C. Canvas Integration**
- Allow users to drag-and-drop components directly from the library panel onto the canvas.
- Ensure the dropped component maintains all scaling and port configurations dictated by its JSON definition.

### Files to Modify
| File | Change |
|------|--------|
| `index.html` | Add library modal/panel HTML structure and search input |
| `ui.js` | Implement library open/close, search filtering, and drag-and-drop handlers |
| `components.js` | Add generic rendering fallback for JSON-defined advanced components |
| `library.js` (New) | Handle fetching and caching of external component definitions |

---

## Feature 0: Cloud Workspace & File Management

### Current State
- `state.js:110-160` manages a single circuit state saved to a single `localStorage` key (`circuit-editor-data`).
- No concept of multiple files, folders, or multi-sheet projects.
- No cloud synchronization (building on the database concepts in Feature 3, this establishes the necessary UI/UX architecture).

### What To Build

**A. Dashboard View (Excalidraw Style)**
- Create a workspace dashboard showing a grid of saved projects.
- Each project card should display a thumbnail (auto-generated base64 PNG on save), title, and last modified date.
- Add controls to create new folders, rename projects, and delete items.

**B. Multi-Sheet Projects**
- A single "Project" can contain multiple "Worksheets" (like Excel tabs or Excalidraw canvas tabs).
- Add a bottom or top tab bar to quickly switch between sheets within the active project.
- Modify `state.js` to handle `state.currentProject` and `state.currentSheet`.

**C. Cloud Storage Integration**
- Connect the folder/file hierarchy to the Firestore backend.
- Data schema: `users/{userId}/workspaces/{workspaceId}/projects/{projectId}/sheets/{sheetId}`.
- Implement background syncing to ensure changes are continuously saved to the cloud without freezing the UI.

### Files to Modify
| File | Change |
|------|--------|
| `index.html` | Add workspace dashboard view and worksheet tab bar |
| `ui.js` | Handle dashboard navigation, folder creation, and sheet switching |
| `state.js` | Restructure state to support `projects` and `sheets` arrays |
| `cloud.js` (New) | Firestore API wrappers for fetching/updating workspace hierarchy |

---

## Feature 1: Enhanced Text Formatting System

### Current State
- `drawText()` in `canvas.js:297` uses hardcoded `sans-serif` font
- Text objects store only: `{id, x, y, text, fontSize, bold}`
- Font size change only via scroll wheel on selected text (`app.js:132-142`)
- No font family picker, no color, no UI for size +/-

### What To Build

**A. Text Size Controls in Context Panel**
When a text element is selected, the left context panel (`ui.js:buildTextContext()`) must show:
- A `−` button and `+` button flanking the current font size display
- Clicking `−` decreases fontSize by 2 (min: 8px), `+` increases by 2 (max: 96px)
- Each click calls `saveSnapshot()` before mutation for undo support

**B. Font Family Selector**
- Add a `fontFamily` field to text objects (default: `'Inter'`)
- Add a dropdown in the context panel with these fonts: `Inter, Roboto, Poppins, Fira Code, Georgia, Times New Roman, Courier New`
- Load Google Fonts in `index.html`: Inter, Roboto, Poppins, Fira Code
- In `drawText()` at `canvas.js:299`, change: `ctx.font = fontStyle + textObj.fontSize + 'px ' + (textObj.fontFamily || 'Inter') + ', sans-serif';`
- Export functions must embed the font name in the JSON

**C. Wire Stroke Strength**
- Add a wire style control: a small panel that appears when a wire is selected
- Add `strokeWeight` field to wire objects: `'light'` (1px), `'normal'` (2px), `'heavy'` (3px)
- In `drawWire()` at `wire.js`, read `wire.strokeWeight` and set `ctx.lineWidth` accordingly
- Default remains `2` (normal). The context panel for wires (`buildWireContext()` in `ui.js:342`) gets 3 clickable weight buttons: thin line icon, normal line icon, thick line icon
- Also add a shade toggle: `'dark'` (#000000) vs `'light'` (#666666) — stored as `wire.shade`

### Files to Modify
| File | Change |
|------|--------|
| `canvas.js` L297-303 | Update `drawText()` to use `fontFamily` |
| `ui.js` L291-339 | Add size +/-, font dropdown, wire stroke controls |
| `state.js` | Text objects get `fontFamily` field |
| `wire.js` | `drawWire()` reads `strokeWeight` and `shade` |
| `export.js` | Serialize new fields in JSON export |
| `index.html` | Add Google Fonts link for Roboto, Poppins, Fira Code |

---

## Feature 2: Text Copy/Paste with Cmd+C / Cmd+V

### Current State
- No clipboard support exists anywhere in the codebase
- `handleKeyDown()` in `app.js:186` handles Undo/Redo/Delete but no copy/paste
- `state.selected` holds one item `{type, id}` — text, component, or wire

### What To Build

**A. Copy (Cmd+C)**
Add to `handleKeyDown()` in `app.js`:
```javascript
if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
  e.preventDefault();
  if (state.selected) {
    state.clipboard = getSelectedElements(); // deep copy
  }
}
```
`getSelectedElements()` returns a deep-cloned array of selected items with their full data. For text: `{type:'text', data: {text, fontSize, fontFamily, bold, x, y}}`.

**B. Paste (Cmd+V)**
```javascript
if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
  e.preventDefault();
  if (state.clipboard && state.clipboard.length > 0) {
    saveSnapshot();
    pasteFromClipboard(state.mouseWorld); // paste at cursor with 20px offset
  }
}
```
`pasteFromClipboard()` creates new elements with `generateId()`, offsets position by +20px from original, pushes to state arrays, and selects the pasted items.

**C. Cut (Cmd+X)**
Copy + delete the original. Call `getSelectedElements()` then `deleteSelected()`.

**D. Duplicate (Cmd+D)**
Shortcut for copy + immediate paste at +20,+20 offset. Very useful for repeated components.

### Key Rules
- Pasted items get NEW IDs (never duplicate IDs)
- Wire connections referencing old component IDs must be remapped to new IDs
- Grid snap all pasted coordinates
- If pasting components with attached wires, paste both together
- `state.clipboard` persists until overwritten (can paste multiple times)

### Files to Modify
| File | Change |
|------|--------|
| `app.js` L186-270 | Add Cmd+C/V/X/D handlers |
| `state.js` | Add `clipboard: []` to state |
| `tools.js` | New `getSelectedElements()`, `pasteFromClipboard()` functions |

NOTE- Make sure you include other general shortcut keys.
---

## Feature 3: Cloud Database System

### Current State
- All data saved to `localStorage` only (`state.js:121-134`)
- Single key `'circuit-editor-data'` stores everything
- ~5MB limit, no versioning, no cross-device sync
- No user concept — anonymous single-browser usage

### What To Build

**A. Backend: Firebase Firestore**
- **Why Firebase:** Free tier generous (1GB storage, 50k reads/day), real-time sync built-in, Google ecosystem, easy auth integration
- **Collection structure:**
```
users/{userId}/
  profile: { displayName, email, avatar, createdAt }
  projects/{projectId}/
    metadata: { title, description, thumbnail, createdAt, updatedAt, isPublic }
    data: { version, components[], wires[], texts[], zoom, offset }
    history/{snapshotId}/  // version history
      { data, timestamp, label }
```

**B. Project Management UI**
- New route `/dashboard` — shows all saved projects as cards with thumbnails
- Each card shows: title, last modified date, thumbnail (auto-generated from canvas export)
- Actions: Open, Rename, Duplicate, Delete, Share
- "New Project" button creates empty project
- Auto-save every 30 seconds to Firestore (debounced, only if dirty)
- Manual "Save" button (Cmd+S) forces immediate save
- Save indicator shows "Saving..." → "Saved ✓" with cloud icon

**C. Offline Support**
- Use Firestore offline persistence (`enablePersistence()`)
- If offline, save to IndexedDB automatically
- When back online, sync to cloud
- Show offline indicator in status bar

**D. Version History**
- Auto-save snapshots every 10 minutes to `history/` subcollection
- User can open "Version History" panel, see timeline, restore any version
- Keep last 50 versions per project

### NPM Dependencies
```json
{
  "firebase": "^10.x",
  "firebase-admin": "only if adding server functions"
}
```

### Files to Create/Modify
| File | Change |
|------|--------|
| `js/firebase.js` [NEW] | Firebase init, Firestore CRUD, real-time listeners |
| `js/auth.js` [NEW] | Auth state management (ties into Feature 4) |
| `js/state.js` | Replace localStorage with Firestore save, add projectId |
| `dashboard/` [NEW] | Project listing page (HTML/CSS/JS) |
| `vercel.json` | Add `/dashboard` route |

---

## Feature 4: Google Mail Login

### Current State
- No authentication at all
- No user identity concept

### What To Build

**A. Firebase Auth with Google Provider**
```javascript
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
const auth = getAuth();
const provider = new GoogleAuthProvider();

async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  // user.uid, user.displayName, user.email, user.photoURL
  await createUserProfileIfNew(user);
  redirectToDashboard();
}
```

**B. Auth UI Flow**
1. Landing page shows "Sign in with Google" button (Material-style, Google branding guidelines)
2. On sign-in → redirect to `/dashboard` showing user's projects
3. Editor page shows user avatar + name in top-right corner
4. Dropdown menu: "My Projects", "Settings", "Sign Out"
5. If not signed in, editor still works in "guest mode" (localStorage only) — show banner: "Sign in to save to cloud"

**C. Auth State Persistence**
- Use `browserLocalPersistence` so user stays logged in across sessions
- `onAuthStateChanged()` listener in `app.js` init to restore session
- Protect Firestore rules: users can only read/write their own documents

**D. Firestore Security Rules**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**My Feedback:** Also consider adding GitHub OAuth as a second provider — many engineering students use GitHub. Firebase Auth supports it with minimal extra code.

---

## Feature 5: Threat Scan for Uploaded JSON

### Current State
- `handleImportFile()` in `export.js:307-330` does `JSON.parse()` with zero validation
- Any malformed or malicious JSON loads directly into state
- No size limits, no schema validation, no sanitization

### What To Build

**A. Schema Validation**
```javascript
function validateCircuitJSON(data) {
  const errors = [];
  // 1. Must have required top-level keys
  if (!data.components || !Array.isArray(data.components)) errors.push('Missing components array');
  if (!data.wires || !Array.isArray(data.wires)) errors.push('Missing wires array');
  
  // 2. Validate each component
  data.components.forEach((c, i) => {
    if (!c.id || typeof c.id !== 'string') errors.push(`Component ${i}: invalid id`);
    if (!COMPONENT_DEFS[c.type]) errors.push(`Component ${i}: unknown type "${c.type}"`);
    if (typeof c.x !== 'number' || typeof c.y !== 'number') errors.push(`Component ${i}: invalid coords`);
    if (c.x % 20 !== 0 || c.y % 20 !== 0) errors.push(`Component ${i}: not grid-aligned`);
  });
  
  // 3. Validate each wire
  data.wires.forEach((w, i) => {
    if (!w.id) errors.push(`Wire ${i}: missing id`);
    if (!w.points || w.points.length < 2) errors.push(`Wire ${i}: needs ≥2 points`);
    w.points.forEach((p, j) => {
      if (typeof p.x !== 'number' || typeof p.y !== 'number') errors.push(`Wire ${i} point ${j}: invalid`);
    });
  });
  
  // 4. Check for duplicate IDs
  const allIds = [...data.components.map(c=>c.id), ...data.wires.map(w=>w.id)];
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  if (dupes.length) errors.push(`Duplicate IDs: ${dupes.join(', ')}`);
  
  return { valid: errors.length === 0, errors };
}
```

**B. XSS Prevention**
- Strip any HTML tags from `component.value` and `text.text` fields
- Reject JSON containing `<script>`, `javascript:`, `on[event]` patterns
- Sanitize all string fields: `value.replace(/<[^>]*>/g, '')`

**C. Size Limits**
- Max file size: 5MB (reject larger files immediately)
- Max components: 1000 per file
- Max wires: 5000 per file
- Max text annotations: 500 per file

**D. Prototype Pollution Protection**
- After `JSON.parse()`, check for `__proto__`, `constructor`, `prototype` keys
- Use `Object.create(null)` for parsed data if needed

**E. User Feedback**
- Show a validation report modal: "Import Report — 3 warnings found"
- List each issue with severity (error/warning)
- Allow user to proceed with warnings, block on errors

---

## Feature 6: Overall Security Hardening

### Current State
- No CSP headers, no input sanitization, no rate limiting
- Editor runs entirely client-side with no security boundaries

### What To Build

**A. Content Security Policy (CSP)**
Add to `index.html` and Vercel headers:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com;
```

**B. Subresource Integrity (SRI)**
- Add `integrity` attributes to all external script/style tags
- Pin Google Fonts version

**C. Input Sanitization (everywhere)**
- `openValueEditModal()`: sanitize component value input
- `openTextEditModal()`: sanitize text input
- `handleImportFile()`: sanitize all string fields in imported JSON
- Create a shared `sanitize(str)` function:
```javascript
function sanitize(str) {
  return str.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
}
```

**D. Rate Limiting (for cloud features)**
- Limit save operations: max 1 save per 5 seconds to Firestore
- Limit auth attempts: Firebase handles this automatically
- Limit export operations: debounce rapid exports

**E. localStorage Security**
- Add integrity hash to stored data: `SHA-256(data)` stored alongside
- On load, verify hash — if tampered, warn user
- Encrypt sensitive fields if storing auth tokens

**F. Secure Export**
- PDF export currently opens `window.open()` and writes raw HTML — XSS risk
- Sanitize all text content before injecting into print window
- Use `textContent` instead of `innerHTML` where possible

---

## Feature 7: Massive Component Library Expansion

### Current State
- Only 12 components defined in `COMPONENT_DEFS` (`components.js:8-105`)
- All use same 2-port layout: `{x:-40,y:0}, {x:40,y:0}` (except ground: single port)
- Drawing functions are individual switch cases in `drawComponent()`

### What To Build

**A. Component Registry Architecture**
Replace the flat `COMPONENT_DEFS` object with a category-based registry:

```javascript
const COMPONENT_REGISTRY = {
  categories: {
    passive: { name: 'Passive', components: ['resistor','capacitor','inductor','potentiometer','crystal','fuse'] },
    semiconductor: { name: 'Semiconductor', components: ['diode','zener','led','npn','pnp','nmos','pmos','scr','triac'] },
    sources: { name: 'Sources', components: ['voltage','current','ac_voltage','battery','solar_cell'] },
    ics: { name: 'Integrated Circuits', components: ['opamp','ic_dip8','ic_dip14','ic_dip16','ic_dip28','ic_dip40','555_timer','7805_regulator'] },
    logic: { name: 'Logic Gates', components: ['and_gate','or_gate','not_gate','nand_gate','nor_gate','xor_gate','buffer','flipflop_d','flipflop_jk'] },
    machines: { name: 'AC Machines', components: ['transformer','dc_motor','ac_motor','generator','relay','contactor'] },
    microcontroller: { name: 'Microcontroller', components: ['8051','arduino_uno','esp32','pic16f877','stm32','adc_0804','dac_0808','lcd_16x2','7segment'] },
    connectors: { name: 'Connectors', components: ['terminal','probe','test_point','header_pin','jumper','antenna'] },
    measurement: { name: 'Measurement', components: ['ammeter','voltmeter','wattmeter','oscilloscope_probe'] },
    protection: { name: 'Protection', components: ['fuse','circuit_breaker','varistor','tvs_diode','ptc','ntc'] }
  }
};
```

**B. Multi-Pin Component Support**
The current port system only supports 2 ports. ICs need 8-40 pins. Required changes:

1. **`getComponentPorts()`** must read from `comp.ports` (JSON data), not `COMPONENT_DEFS`
2. **`getComponentBounds()`** must calculate bounds dynamically from port positions
3. **`hitTestPort()`** threshold must scale with component size
4. **Drawing functions** for ICs: rectangular body with labeled pins on sides

```javascript
// Example: 8-pin DIP IC
ic_dip8: {
  name: '8-Pin DIP IC',
  ports: [
    {x:-40, y:-30}, {x:-40, y:-10}, {x:-40, y:10}, {x:-40, y:30},  // left side
    {x:40, y:30}, {x:40, y:10}, {x:40, y:-10}, {x:40, y:-30}       // right side
  ],
  draw: (ctx) => {
    ctx.strokeRect(-30, -40, 60, 80); // IC body
    // Draw pin 1 dot
    ctx.beginPath(); ctx.arc(-25, -35, 3, 0, Math.PI*2); ctx.fill();
    // Draw notch
    ctx.beginPath(); ctx.arc(0, -40, 6, 0, Math.PI); ctx.stroke();
  }
}
```

**C. Component Drawing Functions (priority list)**
| Component | Drawing Style | Ports |
|-----------|--------------|-------|
| Diode | Triangle + line | 2 (anode/cathode) |
| LED | Diode + arrows | 2 |
| NPN Transistor | Circle + arrow emitter | 3 (B/C/E) |
| PNP Transistor | Circle + arrow emitter | 3 (B/C/E) |
| Op-Amp | Triangle | 3 (V+/V-/Vout) or 5 (+Vcc/-Vcc) |
| NMOS/PMOS | Standard MOSFET symbol | 3 (G/D/S) |
| Transformer | Two coupled coils | 4 (P1/P2/S1/S2) |
| DC Motor | Circle + M | 2 |
| 555 Timer | 8-pin DIP | 8 |

**D. Searchable Component Picker (updated)**
- Replace the current grid picker with a searchable panel
- Category accordion on left, component grid on right
- Search bar at top with fuzzy matching
- Show component preview (mini canvas rendering) next to name

**My Feedback:** Start with 30 most-used components, not all 300. Ship fast, iterate based on user demand. Track which components users search for but can't find — that data drives your roadmap.

---

## Feature 8: Smart JSON Import with Auto-Stitch

### Current State
- `handleImportFile()` at `export.js:307-330` loads JSON blindly
- No validation of wire-port alignment
- No detection of missing components or broken references
- `getComponentPorts()` ignores JSON port values (reads COMPONENT_DEFS)

### What To Build

**A. Import Validation Pipeline**
```
JSON file → Parse → Schema Check → Connectivity Check → Auto-Repair → Load
```

**B. Connectivity Validator**
```javascript
function validateConnectivity(data) {
  const issues = [];
  const compMap = new Map(data.components.map(c => [c.id, c]));
  
  data.wires.forEach(wire => {
    ['start','end'].forEach(end => {
      const conn = wire.connections?.[end];
      if (!conn) return;
      
      if (conn.type === 'port') {
        // Check: does the referenced component exist?
        if (!compMap.has(conn.componentId)) {
          issues.push({type:'error', msg:`Wire ${wire.id}: references missing component ${conn.componentId}`});
          return;
        }
        // Check: does wire endpoint match port position?
        const comp = compMap.get(conn.componentId);
        const portWorld = getPortWorldPosition(comp, conn.portIndex);
        const wireEnd = end === 'start' ? wire.points[0] : wire.points[wire.points.length-1];
        const dist = Math.hypot(portWorld.x - wireEnd.x, portWorld.y - wireEnd.y);
        if (dist > 0) {
          issues.push({type:'warning', msg:`Wire ${wire.id} ${end}: ${dist}px off from port`, fix: {wireId:wire.id, end, correct:portWorld}});
        }
      }
      
      if (conn.type === 'wire') {
        // Check: does the referenced wire exist?
        if (!data.wires.find(w => w.id === conn.wireId)) {
          issues.push({type:'error', msg:`Wire ${wire.id}: references missing wire ${conn.wireId}`});
        }
      }
    });
  });
  return issues;
}
```

**C. Auto-Stitch Logic**
- If <30% of connections have issues → auto-fix (snap wire endpoints to nearest port)
- If 30-70% have issues → show warning modal: "X issues found. Auto-repair?"
- If >70% have issues → show error: "This file appears corrupted. Cannot auto-repair." Also display button to continue loading file without auto-fix.
- All auto-fixes logged and shown to user in a report

**D. Grid Snap Pass**
After loading, snap all coordinates to the 20px grid:
```javascript
data.components.forEach(c => { c.x = snapToGrid(c.x); c.y = snapToGrid(c.y); });
data.wires.forEach(w => w.points.forEach(p => { p.x = snapToGrid(p.x); p.y = snapToGrid(p.y); }));
```

**E. Missing Field Defaults**
If imported JSON is from an older version or external tool:
- Missing `rotation` → default to 0
- Missing `value` → default to ''
- Missing `connections` → set to `{start:{type:'free'}, end:{type:'free'}}`
- Missing `version` → treat as v1 and migrate

---

## Feature 9: Recenter / Center View Button

### Current State
- No "center view" or "fit to content" button
- User must manually pan and zoom to find their circuit
- `getContentBounds()` exists in `export.js:338-375` but is only used for export

### What To Build

**A. "Fit to Content" Button**
Add a button in the bottom bar (next to zoom controls) with a crosshair icon ⊕:

```javascript
function fitToContent() {
  const bounds = getContentBounds();
  if (!bounds) return; // empty canvas
  
  const contentW = bounds.maxX - bounds.minX;
  const contentH = bounds.maxY - bounds.minY;
  const padding = 80; // breathing room
  
  // Calculate zoom to fit content in viewport
  const zoomX = canvas.width / (contentW + padding * 2);
  const zoomY = canvas.height / (contentH + padding * 2);
  const newZoom = Math.min(zoomX, zoomY, MAX_ZOOM);
  
  // Center content
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  state.zoom = Math.max(MIN_ZOOM, newZoom);
  state.offset.x = canvas.width / 2 - centerX * state.zoom;
  state.offset.y = canvas.height / 2 - centerY * state.zoom;
  markDirty();
}
```

**B. Smooth Animation**
Instead of instant snap, lerp over 300ms:
```javascript
function animateFitToContent() {
  const target = calculateFitTarget();
  const start = { zoom: state.zoom, ox: state.offset.x, oy: state.offset.y };
  const duration = 300;
  const startTime = performance.now();
  
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // ease-in-out
    state.zoom = start.zoom + (target.zoom - start.zoom) * ease;
    state.offset.x = start.ox + (target.ox - start.ox) * ease;
    state.offset.y = start.oy + (target.oy - start.oy) * ease;
    markDirty();
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

**C. Keyboard Shortcut:** `Cmd+0` or `Ctrl+0` → fit to content

**D. Also Auto-Trigger After Import**
After `handleImportFile()` successfully loads a JSON, call `animateFitToContent()` so the user immediately sees the circuit.

### Files to Modify
| File | Change |
|------|--------|
| `canvas.js` or `tools.js` | New `fitToContent()` and `animateFitToContent()` functions |
| `index.html` | Add recenter button to bottom bar |
| `ui.js` | Bind click handler for recenter button |
| `app.js` | Add Cmd+0 keyboard shortcut |
| `export.js` | Call `animateFitToContent()` after import |

---

## Feature 10: Higher Detail Component Drawings

### Current State
- `drawResistor()` in `components.js` draws a simple zigzag: 6 segments between -40 and +40
- All components use basic geometric shapes — functional but not professional-grade
- No rounded ends, no terminal dots, no subtle curves

### What To Build

**A. Resistor — Add Rounded End Curves**
Currently draws sharp zigzag. Add small curves at the start and end:
```javascript
function drawResistor(ctx) {
  ctx.beginPath();
  // Lead-in line
  ctx.moveTo(-40, 0);
  ctx.lineTo(-28, 0);
  // Smooth entry curve into zigzag
  ctx.quadraticCurveTo(-26, 0, -24, -8);
  // Zigzag body with slight curves at peaks
  ctx.lineTo(-16, 8);
  ctx.lineTo(-8, -8);
  ctx.lineTo(0, 8);
  ctx.lineTo(8, -8);
  ctx.lineTo(16, 8);
  // Smooth exit curve
  ctx.quadraticCurveTo(18, 10, 20, 8);
  ctx.lineTo(24, -8);
  ctx.quadraticCurveTo(26, -10, 28, 0);
  // Lead-out line
  ctx.lineTo(40, 0);
  ctx.stroke();
}
```

**B. Capacitor — Add Slight Plate Curves**
Add subtle convex curve to one plate (polarized style hint):
```javascript
function drawCapacitor(ctx) {
  ctx.beginPath();
  ctx.moveTo(-40, 0); ctx.lineTo(-6, 0); // left lead
  ctx.moveTo(6, 0); ctx.lineTo(40, 0);    // right lead
  // Flat plate
  ctx.moveTo(-6, -16); ctx.lineTo(-6, 16);
  // Curved plate (indicates polarity)
  ctx.moveTo(6, -16);
  ctx.quadraticCurveTo(10, 0, 6, 16);
  ctx.stroke();
}
```

**C. All Components Get Terminal Dots**
Small filled circles (radius 2.5px) at each port endpoint — standard in IEEE schematics. These indicate connection points:
```javascript
// Add to end of every draw function:
function drawTerminalDots(ctx, ports) {
  ctx.fillStyle = '#000000';
  ports.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}
```

**D. Ground Symbol Enhancement**
Current ground is basic. Use IEEE standard with 3 decreasing horizontal lines:
```javascript
function drawGround(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, -20); ctx.lineTo(0, 0);     // vertical lead
  ctx.moveTo(-14, 0); ctx.lineTo(14, 0);     // top line
  ctx.moveTo(-9, 5); ctx.lineTo(9, 5);       // middle line
  ctx.moveTo(-4, 10); ctx.lineTo(4, 10);     // bottom line
  ctx.stroke();
}
```

**E. Inductor — Smooth Arcs Instead of Semicircles**
Use proper bezier curves for coil loops instead of basic arcs.

**My Feedback:** These visual improvements alone will make screenshots look dramatically more professional. This is low-effort, high-impact work. Prioritize this early — it directly affects first impressions when people see CircuitCraft exports.

---

---

## Feature 11: Remove Dots When Components Connect to Wire Ends

### Current State
- There are **TWO separate dot systems** creating visual clutter at component terminals:
  1. **Port dots:** `drawComponent()` in `components.js:207-214` draws small `#333` circles (radius 3px) at every port position for every component — these are ALWAYS visible regardless of wire connections
  2. **Junction dots:** `findJunctionPoints()` in `wire.js:254-287` counts wire points AND component ports together (ports are added at `wire.js:268-276`), so when 1 wire connects to 1 port = count of 2, when 2 wires connect at a port = count of 3+ → junction dot appears ON TOP of the port dot
- Result: at a typical wire-to-component connection, you see BOTH a port dot AND potentially a junction dot stacked — looks messy

### What To Build

**A. Conditional Port Dots — Only Show When Unconnected**
Modify `drawComponent()` at `components.js:207-214` to check if a port is connected before drawing the dot:
```javascript
// components.js — replace the port dots block at lines 207-214
var ports = getComponentPorts(comp);
ports.forEach(function(port, idx) {
  // Check if any wire endpoint lands on this port
  var isConnected = state.wires.some(function(w) {
    if (!w.points || w.points.length < 2) return false;
    var first = w.points[0];
    var last = w.points[w.points.length - 1];
    return (first.x === port.x && first.y === port.y) ||
           (last.x === port.x && last.y === port.y);
  });
  if (!isConnected) {
    // Only draw dot for UNCONNECTED ports (shows user where to connect)
    ctx.fillStyle = '#999';
    ctx.beginPath();
    var def = COMPONENT_DEFS[comp.type];
    ctx.arc(def.ports[idx].x, def.ports[idx].y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
});
```

**B. Filter Junction Dots at Port Locations**
The current `findJunctionPoints()` at `wire.js:254-287` already counts component ports (`wire.js:268-276`). Modify to exclude port-coincident points:
```javascript
function findJunctionPoints() {
  var pointMap = {};
  state.wires.forEach(function(wire) {
    if (!wire.points) return;
    wire.points.forEach(function(p) {
      var key = p.x + ',' + p.y;
      pointMap[key] = (pointMap[key] || 0) + 1;
    });
  });

  // Build set of all port positions — DON'T add ports to pointMap
  var portSet = new Set();
  state.components.forEach(function(comp) {
    getComponentPorts(comp).forEach(function(port) {
      portSet.add(port.x + ',' + port.y);
    });
  });

  var junctions = [];
  for (var key in pointMap) {
    // Only show junction dots where 3+ WIRES meet AND NOT at a port
    if (pointMap[key] >= 3 && !portSet.has(key)) {
      var parts = key.split(',');
      junctions.push({ x: parseFloat(parts[0]), y: parseFloat(parts[1]) });
    }
  }
  return junctions;
}
```

**C. IEEE Standard Behavior**
The final behavior should be:
- **Unconnected port:** Small gray dot visible (guides user where to connect)
- **1 wire at port:** No dots at all (clean connection, component symbol shows it)
- **2+ wires at port:** No junction dot (port itself implies the connection)
- **3+ wires meeting at free space (T-junction):** Black dot shown (standard IEEE)

### Files to Modify
| File | Change |
|------|--------|
| `components.js` L207-214 | Conditional port dots (only when unconnected) |
| `wire.js` L254-287 | Remove port counting from junction detection, filter by portSet |
| `export.js` L238-245 | Same junction filter in `renderContentToContext()` |

---

## Feature 12: Professional Zoom/Scroll Controls + Smooth Canvas

### Current State
- Zoom buttons `+`/`−` in bottom-left pill (`ui.js:77-78`) call `zoomBy(1.15)` / `zoomBy(0.85)` — instant, no animation
- No scrollbar indicators for the infinite canvas
- No minimap showing position in overall circuit
- Scroll wheel zoom in `app.js:119-176` is instant (no easing)

### What To Build

**A. Smooth Animated Zoom**
Replace instant zoom with lerp animation:
```javascript
var _zoomAnimation = null;
function smoothZoomBy(factor) {
  var cx = canvas.width / 2;
  var cy = canvas.height / 2;
  var worldPos = screenToWorld(cx, cy);
  var targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom * factor));
  var targetOffsetX = cx - worldPos.x * targetZoom;
  var targetOffsetY = cy - worldPos.y * targetZoom;
  
  if (_zoomAnimation) cancelAnimationFrame(_zoomAnimation);
  var startZoom = state.zoom, startOx = state.offset.x, startOy = state.offset.y;
  var startTime = performance.now();
  
  function step(now) {
    var t = Math.min((now - startTime) / 200, 1); // 200ms duration
    var ease = t * (2 - t); // ease-out
    state.zoom = startZoom + (targetZoom - startZoom) * ease;
    state.offset.x = startOx + (targetOffsetX - startOx) * ease;
    state.offset.y = startOy + (targetOffsetY - startOy) * ease;
    markDirty();
    if (t < 1) _zoomAnimation = requestAnimationFrame(step);
  }
  _zoomAnimation = requestAnimationFrame(step);
}
```

**B. Edge Scroll Indicators**
When the canvas has content beyond the viewport edges, show subtle gradient fade indicators on the edges:
- Top/bottom/left/right edge gets a 20px gradient overlay (semi-transparent → transparent)
- Indicates "there's more content in this direction"
- Fade in/out based on content bounds vs viewport

**C. Minimap (Bottom-Right)**
A small 150×100px panel showing the entire circuit as a thumbnail:
- Draw all components/wires at reduced scale
- Show a viewport rectangle indicating current view
- Click on minimap to pan to that area
- Toggle with a button or auto-show when circuit exceeds viewport

**D. Keyboard Zoom Shortcuts**
- `Cmd+=` → zoom in
- `Cmd+-` → zoom out
- `Cmd+0` → fit to content (from Feature 9)

### Files to Modify
| File | Change |
|------|--------|
| `ui.js` L77-78 | Replace `zoomBy()` calls with `smoothZoomBy()` |
| `canvas.js` | Add `smoothZoomBy()`, minimap rendering, edge indicators |
| `app.js` | Add Cmd+/- zoom shortcuts, smooth wheel zoom |
| `index.html` | Add minimap container div |
| `style.css` | Minimap panel styling, edge indicator CSS |

---

## Feature 13: Real-Time Collaboration

### Current State
- Single-user only, localStorage persistence
- No concept of shared projects or concurrent editing

### What To Build

**A. Architecture: Firebase Realtime Database + Firestore**
- Firestore for project metadata and snapshots
- Firebase Realtime Database for live cursor/edit sync (lower latency than Firestore)

**B. Collaboration Data Model**
```
realtime-db/
  sessions/{projectId}/
    cursors/{userId}: { x, y, color, displayName, lastActive }
    operations/{opId}: { type, data, userId, timestamp }
    locks/{elementId}: { userId, timestamp }
```

**C. Operational Transform (OT) or CRDT**
For circuit editing, use a simple lock-based approach (simpler than full OT):
1. When user starts dragging a component → acquire lock on that element
2. Other users see the element highlighted with the editor's cursor color
3. On release → broadcast new position, release lock
4. Wire edits: lock the wire being edited
5. Conflict resolution: last-write-wins for non-locked elements

**D. Live Cursors**
Each collaborator's cursor is visible on the canvas:
```javascript
function drawCollaboratorCursors(ctx) {
  Object.values(session.cursors).forEach(cursor => {
    if (cursor.userId === currentUser.uid) return;
    ctx.save();
    ctx.fillStyle = cursor.color;
    // Draw arrow cursor
    ctx.beginPath();
    ctx.moveTo(cursor.x, cursor.y);
    ctx.lineTo(cursor.x, cursor.y + 18);
    ctx.lineTo(cursor.x + 6, cursor.y + 14);
    ctx.lineTo(cursor.x + 12, cursor.y + 18);
    ctx.closePath();
    ctx.fill();
    // Draw name label
    ctx.font = '11px Inter';
    ctx.fillText(cursor.displayName, cursor.x + 14, cursor.y + 16);
    ctx.restore();
  });
}
```

**E. Share UI**
- "Share" button in top-right → generates shareable link
- Permission levels: View only, Can edit
- Show active collaborators as avatar circles in top bar
- Max 5 concurrent editors per project (free tier)

**My Feedback:** This is complex. Ship it as a Phase 3 feature after core editing is solid. Use Firebase Realtime Database for the live sync layer — it handles presence detection and low-latency updates natively.

---

## Feature 14: Secured Admin Panel

### Current State
- No admin functionality, no analytics, no user management

### What To Build

**A. Admin Dashboard (separate route: `/admin`)**
- Protected by role-based access: only users with `role: 'admin'` in Firestore
- Firebase Auth custom claims for admin role:
```javascript
// Server-side (Firebase Admin SDK / Cloud Function)
admin.auth().setCustomUserClaims(uid, { admin: true });
```

**B. Admin Panel Features**
| Section | What It Shows |
|---------|---------------|
| **User Management** | Total users, active users (7d/30d), user list with search, ban/suspend |
| **Project Analytics** | Total projects, avg components per project, most-used components |
| **Import Monitor** | Recent JSON imports, flagged threats (from Feature 5), rejected files |
| **System Health** | Firestore read/write counts, storage usage, error logs |
| **Feature Flags** | Toggle features on/off for testing (collaboration, new components) |
| **Component Usage** | Which components are used most, which are never used |

**C. Security Layers**
1. Firestore rule: `allow read, write: if request.auth.token.admin == true;`
2. Client-side route guard: check custom claims before rendering admin page
3. Admin actions logged to `audit_log/` collection with timestamp + admin userId
4. Rate limit admin operations
5. 2FA requirement for admin accounts (Firebase supports this)
6. Separate admin subdomain if possible: `admin.circuitcraft.app`

**D. Testing Mode**
- Admin can "impersonate" any user to debug their projects (read-only)
- Admin can push test projects to specific users
- A/B testing framework: randomly assign users to feature variants

---

## Feature 15: Layers Panel

### Current State
- All elements render in fixed order: grid → wires → junctions → components → texts → selection
- No concept of layers, z-ordering, or visibility toggling
- Cannot hide parts of a circuit to focus on specific sections

### What To Build

**A. Layer Data Model**
```javascript
// Add to state:
state.layers = [
  { id: 'default', name: 'Main Circuit', visible: true, locked: false, color: '#8b5cf6', order: 0 },
  { id: 'annotations', name: 'Annotations', visible: true, locked: false, color: '#4ade80', order: 1 },
  { id: 'power', name: 'Power Rails', visible: true, locked: false, color: '#f87171', order: 2 }
];

// Each component/wire/text gets a layerId field:
{ id: 'comp_1', type: 'resistor', layerId: 'default', ... }
```

**B. Layer Panel UI (Bottom-Left Floating)**
- Toggle button (stacked layers icon) in bottom bar opens a small panel
- Panel shows layer list with:
  - Eye icon → toggle visibility
  - Lock icon → toggle locked (prevent editing)
  - Color dot → layer identification color
  - Layer name (editable on double-click)
  - Drag handles for reordering
- "Add Layer" and "Delete Layer" buttons at bottom
- Active layer highlighted — new elements go to active layer

**C. Rendering Changes**
In `render()` at `canvas.js:75`:
```javascript
// Sort layers by order, draw only visible layers
var sortedLayers = state.layers.filter(l => l.visible).sort((a,b) => a.order - b.order);
sortedLayers.forEach(layer => {
  var layerWires = state.wires.filter(w => (w.layerId || 'default') === layer.id);
  var layerComps = state.components.filter(c => (c.layerId || 'default') === layer.id);
  var layerTexts = state.texts.filter(t => (t.layerId || 'default') === layer.id);
  layerWires.forEach(wire => drawWire(ctx, wire));
  layerComps.forEach(comp => { drawComponent(ctx, comp); drawComponentLabel(ctx, comp); });
  layerTexts.forEach(t => drawText(ctx, t));
});
```

**D. Lock Behavior**
When a layer is locked:
- Elements on that layer are visible but not selectable/draggable
- Hit testing skips locked layer elements
- Visual indicator: locked elements render at 70% opacity

---

## Feature 16: Design Your Own Component Workshop

### Current State
- Components are 100% hardcoded in `COMPONENT_DEFS` and individual draw functions
- No way for users to add custom components
- No component editor or JSON import for component definitions

### What To Build

**A. Component Designer Workshop (new route: `/workshop`)**
A mini canvas editor specifically for designing component symbols:
- Grid canvas (smaller, centered on origin)
- Drawing tools: Line, Arc, Circle, Rectangle, Text
- Port placement tool: click to place connection ports (shown as colored dots)
- Origin marker shows component center point

**B. Component JSON Schema**
```json
{
  "type": "custom_lm35",
  "name": "LM35 Temperature Sensor",
  "category": "Sensor",
  "ports": [
    {"x": -40, "y": -20, "label": "Vcc"},
    {"x": -40, "y": 20, "label": "GND"},
    {"x": 40, "y": 0, "label": "Vout"}
  ],
  "bounds": {"w": 80, "h": 60},
  "drawCommands": [
    {"cmd": "rect", "x": -20, "y": -30, "w": 40, "h": 60},
    {"cmd": "text", "text": "LM35", "x": 0, "y": 5, "fontSize": 10, "align": "center"},
    {"cmd": "line", "x1": -40, "y1": -20, "x2": -20, "y2": -20},
    {"cmd": "line", "x1": -40, "y1": 20, "x2": -20, "y2": 20},
    {"cmd": "line", "x1": 20, "y1": 0, "x2": 40, "y2": 0}
  ]
}
```

**C. Draw Command Renderer**
```javascript
function drawCustomComponent(ctx, drawCommands) {
  drawCommands.forEach(cmd => {
    switch(cmd.cmd) {
      case 'line': ctx.beginPath(); ctx.moveTo(cmd.x1,cmd.y1); ctx.lineTo(cmd.x2,cmd.y2); ctx.stroke(); break;
      case 'rect': ctx.strokeRect(cmd.x, cmd.y, cmd.w, cmd.h); break;
      case 'circle': ctx.beginPath(); ctx.arc(cmd.x,cmd.y,cmd.r,0,Math.PI*2); ctx.stroke(); break;
      case 'arc': ctx.beginPath(); ctx.arc(cmd.x,cmd.y,cmd.r,cmd.start,cmd.end); ctx.stroke(); break;
      case 'text': ctx.textAlign=cmd.align||'left'; ctx.font=(cmd.fontSize||10)+'px Inter'; ctx.fillText(cmd.text,cmd.x,cmd.y); break;
    }
  });
}
```

**D. AI-Assisted Component Creation Flow**
1. User uploads a photo of the component symbol they want
2. User sends photo to ChatGPT/Claude with prompt: "Generate CircuitCraft component JSON for this symbol" (we provide the JSON schema in our docs)
3. AI returns JSON matching our schema
4. User pastes JSON into Workshop's "Import JSON" textarea
5. Workshop renders the component preview
6. User can edit ports, adjust lines, rename — all in the visual editor
7. Click "Save to Library" → saved to user's custom component collection in Firestore

**E. Community Library (future)**
- Users can publish custom components as "public"
- Other users can browse and import community components
- Rating/download count system

**My Feedback:** This is a killer feature. No other free circuit editor lets users design custom components visually. Start with the JSON import path (steps 3-7), add the visual drawing tools later.

---

## Feature 17: Rubber-Band Box Selection (Double-Tap Drag)

### Current State
- `state.selected` holds only ONE item (`state.js:9`)
- `selectAll` via Cmd+A uses a boolean flag `selectAllActive`
- No drag-to-select box, no shift-click multi-select

### What To Build

**A. Selection Box Drawing**
In `selectMouseDown()`, if clicking empty space → start selection rectangle:
```javascript
function selectMouseDown(world) {
  // ... existing hit tests ...
  
  // Nothing hit → start selection rectangle
  state.selectionBox = { startX: world.x, startY: world.y, endX: world.x, endY: world.y };
  state.isDragging = true;
}

function selectMouseMove(world) {
  if (state.selectionBox) {
    state.selectionBox.endX = world.x;
    state.selectionBox.endY = world.y;
    markDirty();
    return;
  }
  // ... existing drag logic ...
}

function selectMouseUp() {
  if (state.selectionBox) {
    var box = normalizeBox(state.selectionBox);
    state.selected = []; // change to array
    state.components.forEach(c => {
      if (isInsideBox(getComponentBounds(c), box)) state.selected.push({type:'component',id:c.id});
    });
    state.wires.forEach(w => {
      if (isWireInsideBox(w, box)) state.selected.push({type:'wire',id:w.id});
    });
    state.texts.forEach(t => {
      if (isTextInsideBox(t, box)) state.selected.push({type:'text',id:t.id});
    });
    state.selectionBox = null;
    markDirty();
  }
}
```

**B. Visual Selection Rectangle**
Draw the selection box in `render()` with a dashed purple border and translucent fill:
```javascript
if (state.selectionBox) {
  var b = state.selectionBox;
  ctx.fillStyle = 'rgba(139, 92, 246, 0.08)';
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 1 / state.zoom;
  ctx.setLineDash([4/state.zoom, 4/state.zoom]);
  ctx.fillRect(b.startX, b.startY, b.endX-b.startX, b.endY-b.startY);
  ctx.strokeRect(b.startX, b.startY, b.endX-b.startX, b.endY-b.startY);
  ctx.setLineDash([]);
}
```

**C. Multi-Select State Change**
Change `state.selected` from single object to array. Update ALL code that reads `state.selected`:
- `deleteSelected()` → delete all items in array
- `selectMouseMove()` drag → move all selected items together
- Context panel → show "N items selected" with bulk actions

**D. Shift+Click to Add/Remove from Selection**
If Shift is held during click, toggle the clicked element in/out of the selection array.

---

## Feature 18: Powerful Component Search Bar

### Current State
- Component picker (`#component-picker`) is a static grid with 4 categories
- No search, no filtering, no preview thumbnails
- With 300+ components (Feature 7), this grid becomes unusable

### What To Build

**A. Search Bar at Top of Component Picker**
```html
<div id="component-search-wrapper">
  <input type="text" id="comp-search-input" placeholder="Search components..." autocomplete="off">
  <div id="comp-search-results"></div>
</div>
```

**B. Fuzzy Search Algorithm**
```javascript
function fuzzyMatch(query, text) {
  query = query.toLowerCase();
  text = text.toLowerCase();
  if (text.includes(query)) return 1.0; // exact substring
  // Fuzzy: check if all chars appear in order
  var qi = 0;
  for (var i = 0; i < text.length && qi < query.length; i++) {
    if (text[i] === query[qi]) qi++;
  }
  return qi === query.length ? 0.5 : 0;
}
```
Search across: component name, abbreviation, category, and aliases (e.g., "bjt" matches "NPN Transistor").

**C. Live Preview Thumbnails**
Each search result shows a tiny 40×40 canvas rendering of the component:
```javascript
function renderComponentThumbnail(type) {
  var thumb = document.createElement('canvas');
  thumb.width = 40; thumb.height = 40;
  var tCtx = thumb.getContext('2d');
  tCtx.translate(20, 20); // center
  tCtx.scale(0.4, 0.4);  // scale down
  // Draw using existing draw function
  var drawFn = getDrawFunction(type);
  if (drawFn) drawFn(tCtx);
  return thumb.toDataURL();
}
```

**D. Search Result Item Layout**
```
[thumbnail] [Component Name]     [Category badge]
            [abbreviation]
```
Click to place, Enter to place first result, arrow keys to navigate results.

**E. Recent/Favorites**
- Track last 10 placed components → show as "Recent" section at top
- Star icon to favorite frequently used components

---

## Feature 19: Optimized Text Writing Tools

### Current State
- Text creation requires: click canvas → modal opens → type text → save → text appears
- No inline editing (must open modal every time)
- No multi-line text support
- Font is always `sans-serif` with no rich formatting

### What To Build

**A. Inline Text Editing (No Modal)**
Double-click text (or single-click in text tool) → show a `<textarea>` overlay positioned exactly on the canvas text:
```javascript
function startInlineEdit(textObj) {
  var screenPos = worldToScreen(textObj.x, textObj.y);
  var textarea = document.createElement('textarea');
  textarea.value = textObj.text;
  textarea.style.cssText = `
    position:fixed; left:${screenPos.x}px; top:${screenPos.y - textObj.fontSize}px;
    font-size:${textObj.fontSize * state.zoom}px; font-family:${textObj.fontFamily || 'Inter'};
    font-weight:${textObj.bold ? 'bold' : 'normal'};
    background:transparent; border:2px solid #8b5cf6; color:#000; outline:none;
    min-width:60px; min-height:${textObj.fontSize * state.zoom}px;
    resize:none; overflow:hidden; z-index:100;
  `;
  document.body.appendChild(textarea);
  textarea.focus(); textarea.select();
  
  textarea.addEventListener('blur', function() {
    saveSnapshot();
    textObj.text = textarea.value;
    saveToLocalStorage(); markDirty();
    textarea.remove();
  });
  textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { textarea.remove(); markDirty(); }
    e.stopPropagation(); // prevent tool shortcuts
  });
}
```

**B. Multi-Line Text Support**
- Store text as string with `\n` characters
- `drawText()` splits on `\n` and draws each line offset by `fontSize * 1.3`
- `hitTestText()` calculates bounds for all lines
- Export renders multi-line correctly

**C. Text Formatting Toolbar**
When editing text, show a floating mini-toolbar above:
- **B** (bold), *I* (italic), size +/-, font dropdown, color picker
- Appears on text selection, disappears on blur

**D. Quick Labels**
- When placing a component, auto-show a small inline input for the value label
- Component reference designators: auto-increment (R1, R2, R3... C1, C2...)

**My Feedback:** Inline editing is the single biggest UX improvement for text. The modal interrupts flow. Excalidraw does inline text editing — it's one of the reasons it feels fast.

---

## Feature 20: Simulation Software Export (SPICE Netlist)

### Current State
- Export only: PNG, JPG, PDF, JSON
- No electrical understanding of the circuit — just visual shapes
- No net names, no node numbers, no SPICE compatibility

### What To Build

**A. Net Extraction Algorithm**
Build a connectivity graph using **Union-Find** (critical — a simple map approach fails when two points on the same wire connect to different existing nets, those nets wouldn't merge):
```javascript
// Union-Find for correct net merging
class UnionFind {
  constructor() { this.parent = new Map(); }
  find(x) {
    if (!this.parent.has(x)) this.parent.set(x, x);
    if (this.parent.get(x) !== x) this.parent.set(x, this.find(this.parent.get(x)));
    return this.parent.get(x);
  }
  union(a, b) { this.parent.set(this.find(a), this.find(b)); }
}

function extractNets() {
  var uf = new UnionFind();
  
  // 1. For each wire, union all its points into the same net
  state.wires.forEach(wire => {
    if (!wire.points || wire.points.length < 2) return;
    var firstKey = wire.points[0].x + ',' + wire.points[0].y;
    for (var i = 1; i < wire.points.length; i++) {
      var key = wire.points[i].x + ',' + wire.points[i].y;
      uf.union(firstKey, key);
    }
  });
  
  // 2. Assign numeric net IDs from union-find roots
  var rootToNet = new Map();
  var netId = 0;
  var nodeMap = new Map();
  
  state.wires.forEach(wire => {
    wire.points.forEach(p => {
      var key = p.x + ',' + p.y;
      var root = uf.find(key);
      if (!rootToNet.has(root)) rootToNet.set(root, netId++);
      nodeMap.set(key, rootToNet.get(root));
    });
  });
  
  // 3. Map component ports to net IDs
  var componentNets = {};
  state.components.forEach(comp => {
    var ports = getComponentPorts(comp);
    componentNets[comp.id] = ports.map(p => {
      var key = p.x + ',' + p.y;
      return nodeMap.has(key) ? nodeMap.get(key) : -1;
    });
  });
  
  // 4. Identify ground net (SPICE requires node 0)
  var groundNet = -1;
  state.components.forEach(comp => {
    if (comp.type === 'ground') {
      var ports = getComponentPorts(comp);
      var key = ports[0].x + ',' + ports[0].y;
      if (nodeMap.has(key)) groundNet = nodeMap.get(key);
    }
  });
  
  return { nodeMap, componentNets, netCount: netId, groundNet };
}
```

**B. SPICE Netlist Generator**
```javascript
function generateSPICE() {
  var nets = extractNets();
  var lines = ['* CircuitCraft SPICE Netlist', '* Generated: ' + new Date().toISOString(), ''];
  var counters = {};
  
  state.components.forEach(comp => {
    var type = comp.type;
    var nodes = nets.componentNets[comp.id];
    if (!nodes || nodes.includes(-1)) return; // skip unconnected
    
    counters[type] = (counters[type] || 0) + 1;
    var refDes = getSpicePrefix(type) + counters[type];
    var value = comp.value || getDefaultSpiceValue(type);
    
    switch(type) {
      case 'resistor':  lines.push(`${refDes} ${nodes[0]} ${nodes[1]} ${value}`); break;
      case 'capacitor': lines.push(`${refDes} ${nodes[0]} ${nodes[1]} ${value}`); break;
      case 'inductor':  lines.push(`${refDes} ${nodes[0]} ${nodes[1]} ${value}`); break;
      case 'voltage':   lines.push(`${refDes} ${nodes[0]} ${nodes[1]} DC ${value}`); break;
      case 'current':   lines.push(`${refDes} ${nodes[0]} ${nodes[1]} DC ${value}`); break;
      case 'diode':     lines.push(`${refDes} ${nodes[0]} ${nodes[1]} D1N4148`); break;
    }
  });
  
  lines.push('', '.end');
  return lines.join('\n');
}

function getSpicePrefix(type) {
  var map = {resistor:'R',capacitor:'C',inductor:'L',voltage:'V',current:'I',diode:'D'};
  return map[type] || 'X';
}
```

**C. Export UI**
Add to Export dropdown:
- "Export SPICE Netlist (.cir)" → downloads `.cir` file
- "Export KiCad Netlist (.net)" → KiCad-compatible format
- "Copy Netlist to Clipboard" → for quick paste into LTSpice/ngspice

**D. Validation Before Export**
- Check for floating nodes (ports not connected to any wire)
- Check for missing component values (needed for simulation)
- Check for missing ground reference (SPICE requires node 0)
- Show warnings: "Component R3 has no value — defaulting to 1kΩ"

**E. Supported Simulators**
| Simulator | Format | Notes |
|-----------|--------|-------|
| LTSpice | `.cir` SPICE netlist | Most popular free simulator |
| ngspice | `.cir` SPICE netlist | Open source |
| Falstad | URL-encoded circuit | Can generate Falstad-compatible link |
| Multisim | SPICE subset | Compatible with basic SPICE |

**My Feedback:** SPICE export is the feature that transforms CircuitCraft from a "drawing tool" into an "engineering tool." Students can draw → export → simulate → verify in one workflow. This alone justifies using CircuitCraft over pen-and-paper.

---

## Overall Priority & Phasing

| Phase | Features | Timeline |
|-------|----------|----------|
| **Phase 1 — Core Polish** | 9 (Recenter), 10 (Detail drawings), 11 (Remove dots), 12 (Smooth zoom) | 1 week |
| **Phase 2 — Editing Power** | 1 (Text formatting), 2 (Copy/paste), 17 (Box select), 19 (Inline text) | 2 weeks |
| **Phase 3 — Components** | 7 (Library expansion), 16 (Workshop), 18 (Search bar) | 3 weeks |
| **Phase 4 — Cloud & Auth** | 3 (Database), 4 (Google login), 5 (Threat scan), 6 (Security) | 3 weeks |
| **Phase 5 — Pro Features** | 13 (Collaboration), 14 (Admin panel), 15 (Layers), 20 (SPICE export) | 4+ weeks |
