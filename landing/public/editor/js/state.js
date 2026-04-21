/* ========================================
   state.js — Central state management
   ======================================== */

const state = {
  components: [],
  wires: [],
  texts: [],
  selected: null,       // { type: 'component'|'wire'|'text', id }
  tool: 'select',       // 'select' | 'wire' | 'eraser' | 'text' | 'place'
  placingComponent: null,
  zoom: 1,
  offset: { x: 0, y: 0 },
  undoStack: [],
  redoStack: [],
  wireStart: null,           // { pos: {x,y}, connection: {type,componentId?,portIndex?,wireId?} }
  wireDrawingPoints: [],     // in-progress polyline [{x,y}, ...]
  wireOrthoMode: true,       // true = 90° routing, false = free angle (Alt)
  wireSnapTarget: null,      // { pos: {x,y}, type: 'port'|'wire'|'grid' } for snap indicator
  isDragging: false,
  dragStart: null,
  dragWirePoint: null,       // { wireId, pointIndex } for wire point dragging
  isPanning: false,
  panStart: null,
  mouseWorld: { x: 0, y: 0 },
  showPrintPreview: false,
  _dragSnapshotTaken: false,
  _dirty: true               // render dirty flag
};

let _idCounter = 0;

function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + (++_idCounter);
}

function markDirty() {
  state._dirty = true;
}

/* --- Undo / Redo --- */

function getStateSnapshot() {
  return {
    components: JSON.parse(JSON.stringify(state.components)),
    wires: JSON.parse(JSON.stringify(state.wires)),
    texts: JSON.parse(JSON.stringify(state.texts))
  };
}

function saveSnapshot() {
  state.undoStack.push(getStateSnapshot());
  state.redoStack = [];
  if (state.undoStack.length > 50) {
    state.undoStack.shift();
  }
}

function undo() {
  if (state.undoStack.length === 0) return;
  state.redoStack.push(getStateSnapshot());
  const snap = state.undoStack.pop();
  state.components = snap.components;
  state.wires = snap.wires;
  state.texts = snap.texts;
  state.selected = null;
  saveToLocalStorage();
  markDirty();
}

function redo() {
  if (state.redoStack.length === 0) return;
  state.undoStack.push(getStateSnapshot());
  const snap = state.redoStack.pop();
  state.components = snap.components;
  state.wires = snap.wires;
  state.texts = snap.texts;
  state.selected = null;
  saveToLocalStorage();
  markDirty();
}

/* --- Reset --- */

function resetState() {
  state.components = [];
  state.wires = [];
  state.texts = [];
  state.selected = null;
  state.wireStart = null;
  state.wireDrawingPoints = [];
  state.wireOrthoMode = true;
  state.wireSnapTarget = null;
  state.dragWirePoint = null;
  state.showPrintPreview = false;
  state.undoStack = [];
  state.redoStack = [];
  state.zoom = 1;
  state.offset = { x: 0, y: 0 };
  try {
    localStorage.removeItem('circuit-editor-data');
  } catch (e) { /* ignore */ }
  markDirty();
  showSaveIndicator();
}

/* --- LocalStorage with throttle --- */

var _saveTimer = null;

function saveToLocalStorage() {
  // Throttle: batch saves within 300ms
  if (_saveTimer) return;
  _saveTimer = setTimeout(function() {
    _saveTimer = null;
    _doSave();
  }, 300);
}

function _doSave() {
  const data = {
    components: state.components,
    wires: state.wires,
    texts: state.texts,
    zoom: state.zoom,
    offset: state.offset
  };
  try {
    localStorage.setItem('circuit-editor-data', JSON.stringify(data));
    showSaveIndicator();
  } catch (e) {
    /* silently fail */
  }
}

// Force immediate save (used before page unload)
function saveToLocalStorageNow() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  _doSave();
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('circuit-editor-data');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.components) state.components = data.components;
    if (data.wires) state.wires = data.wires;
    if (data.texts) state.texts = data.texts;
    if (typeof data.zoom === 'number') state.zoom = data.zoom;
    if (data.offset) state.offset = data.offset;
    markDirty();
  } catch (e) {
    /* silently fail */
  }
}

function showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.classList.add('visible');
  clearTimeout(showSaveIndicator._timer);
  showSaveIndicator._timer = setTimeout(() => {
    el.classList.remove('visible');
  }, 2000);
}
