/* CircuitCraft Editor — Bundled Build */
/* Generated: 2026-05-15T22:03:47.627Z */


/* ── js/state.js ── */
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
  selectAllActive: false,    // true when Cmd/Ctrl+A selects all items
  _dragSnapshotTaken: false,
  _dirty: true               // render dirty flag
};

let _idCounter = 0;

function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + (++_idCounter);
}

function markDirty() {
  state._dirty = true;
  if (typeof updateBottomBar === 'function') updateBottomBar();
  if (typeof updateContextPanel === 'function') updateContextPanel();
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
    const jsonStr = JSON.stringify(data);
    localStorage.setItem('circuit-editor-data', jsonStr);
    showSaveIndicator();
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert("WARNING: Circuit is too large to save in browser storage. Your recent changes are NOT saved.\nPlease export the JSON file to keep your work.");
    } else {
      console.error("Failed to save circuit state:", e);
    }
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


/* ── js/canvas.js ── */
/* ========================================
   canvas.js — Canvas setup, grid, render
   Optimized with dirty flag for 60fps
   ======================================== */

let canvas, ctx;
const GRID_SIZE = 20;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

const CANVAS_THEME = {
  background: '#ffffff',
  gridLine: '#e8e8e8',
  selectionGlow: '#b5a3f7',
  portHighlightFill: '#b5a3f7',
  portHighlightStroke: 'rgba(181, 163, 247, 0.4)',
  printOverlayStroke: '#ef4444',
  printOverlayFill: 'rgba(239, 68, 68, 0.6)',
  textDefault: '#000000'
};
function initCanvas() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', function() {
    resizeCanvas();
    markDirty();
  });
}

function resizeCanvas() {
  const area = document.getElementById('canvas-area');
  canvas.width = area.clientWidth;
  canvas.height = area.clientHeight;
}

/* --- Coordinate Transforms --- */

function screenToWorld(sx, sy) {
  return {
    x: (sx - state.offset.x) / state.zoom,
    y: (sy - state.offset.y) / state.zoom
  };
}

function worldToScreen(wx, wy) {
  return {
    x: wx * state.zoom + state.offset.x,
    y: wy * state.zoom + state.offset.y
  };
}

function snapToGrid(val) {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

/* --- Grid Drawing --- */

function drawGrid() {
  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(canvas.width, canvas.height);

  const startX = Math.floor(topLeft.x / GRID_SIZE) * GRID_SIZE;
  const startY = Math.floor(topLeft.y / GRID_SIZE) * GRID_SIZE;
  const endX = Math.ceil(bottomRight.x / GRID_SIZE) * GRID_SIZE;
  const endY = Math.ceil(bottomRight.y / GRID_SIZE) * GRID_SIZE;

  ctx.strokeStyle = CANVAS_THEME.gridLine;
  ctx.lineWidth = 0.5 / state.zoom;

  ctx.beginPath();
  for (let x = startX; x <= endX; x += GRID_SIZE) {
    ctx.moveTo(x, topLeft.y);
    ctx.lineTo(x, bottomRight.y);
  }
  for (let y = startY; y <= endY; y += GRID_SIZE) {
    ctx.moveTo(topLeft.x, y);
    ctx.lineTo(bottomRight.x, y);
  }
  ctx.stroke();
}

/* --- Render Loop (dirty-flag optimized) --- */

function render() {
  requestAnimationFrame(render);

  if (!state._dirty) return;
  state._dirty = false;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Canvas background
  ctx.fillStyle = CANVAS_THEME.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  try {
    ctx.translate(state.offset.x, state.offset.y);
    ctx.scale(state.zoom, state.zoom);

    // 1. Grid
    drawGrid();

    // 2. Print preview overlay (A4 boundary)
    if (state.showPrintPreview) {
      drawPrintPreviewOverlay(ctx);
    }

    // 3. Wires
    state.wires.forEach(function(wire) { drawWire(ctx, wire); });

    // 4. Junction dots
    drawJunctionDots(ctx);

    // 5. Wire preview (in-progress drawing)
    if (state.wireStart && state.wireDrawingPoints.length > 0) {
      var snapPos = state.wireSnapTarget ? state.wireSnapTarget.pos : state.mouseWorld;
      drawWirePreview(ctx, state.wireDrawingPoints, snapPos, state.wireOrthoMode);
    }

    // 6. Snap indicator (while wire tool active)
    if (state.tool === 'wire' && state.wireSnapTarget) {
      drawSnapIndicator(ctx, state.wireSnapTarget);
    }

    // 7. Components + labels
    state.components.forEach(function(comp) {
      drawComponent(ctx, comp);
      drawComponentLabel(ctx, comp);
    });

    // 8. Texts
    state.texts.forEach(function(t) { drawText(ctx, t); });

    // 9. Selection highlight
    drawSelectionHighlight(ctx);

    // 10. Port highlights
    drawPortHighlights(ctx);

    // 11. Placing preview
    if (state.tool === 'place' && state.placingComponent) {
      drawPlacingPreview(ctx);
    }
  } finally {
    ctx.restore();
  }
}

/* --- Selection Highlight --- */

function drawSelectionHighlight(ctx) {
  if (state.selectAllActive) {
    ctx.strokeStyle = CANVAS_THEME.selectionGlow;
    ctx.lineWidth = 2 / state.zoom;
    ctx.setLineDash([6 / state.zoom, 4 / state.zoom]);

    state.components.forEach(function(comp) {
      var b = getComponentBounds(comp);
      ctx.strokeRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10);
    });

    state.texts.forEach(function(txt) {
      var fontStyle = txt.bold ? 'bold ' : '';
      ctx.font = fontStyle + txt.fontSize + 'px sans-serif';
      var metrics = ctx.measureText(txt.text || 'Text');
      ctx.strokeRect(txt.x - 4, txt.y - txt.fontSize, metrics.width + 8, txt.fontSize + 8);
    });

    ctx.lineWidth = 3 / state.zoom;
    state.wires.forEach(function(wire) {
      if (!wire.points || wire.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(wire.points[0].x, wire.points[0].y);
      for (var i = 1; i < wire.points.length; i++) {
        ctx.lineTo(wire.points[i].x, wire.points[i].y);
      }
      ctx.stroke();
    });

    ctx.setLineDash([]);
    return;
  }

  if (!state.selected) return;

  ctx.strokeStyle = CANVAS_THEME.selectionGlow;
  ctx.lineWidth = 2 / state.zoom;
  ctx.setLineDash([6 / state.zoom, 4 / state.zoom]);

  if (state.selected.type === 'component') {
    var comp = state.components.find(function(c) { return c.id === state.selected.id; });
    if (!comp) return;
    var b = getComponentBounds(comp);
    ctx.strokeRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10);

  } else if (state.selected.type === 'wire') {
    var wire = state.wires.find(function(w) { return w.id === state.selected.id; });
    if (!wire || !wire.points || wire.points.length < 2) return;
    ctx.lineWidth = 3 / state.zoom;
    ctx.beginPath();
    ctx.moveTo(wire.points[0].x, wire.points[0].y);
    for (var i = 1; i < wire.points.length; i++) {
      ctx.lineTo(wire.points[i].x, wire.points[i].y);
    }
    ctx.stroke();

    // Draw draggable points
    ctx.setLineDash([]);
    ctx.fillStyle = CANVAS_THEME.selectionGlow;
    for (var j = 0; j < wire.points.length; j++) {
      ctx.beginPath();
      ctx.arc(wire.points[j].x, wire.points[j].y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (state.selected.type === 'text') {
    var txt = state.texts.find(function(t) { return t.id === state.selected.id; });
    if (!txt) return;
    var fontStyle = txt.bold ? 'bold ' : '';
    ctx.font = fontStyle + txt.fontSize + 'px sans-serif';
    var metrics = ctx.measureText(txt.text || 'Text');
    ctx.strokeRect(txt.x - 4, txt.y - txt.fontSize, metrics.width + 8, txt.fontSize + 8);
  }

  ctx.setLineDash([]);
}

/* --- Port Highlights --- */

function drawPortHighlights(ctx) {
  if (state.tool !== 'wire' && state.tool !== 'select') return;

  state.components.forEach(function(comp) {
    var ports = getComponentPorts(comp);
    ports.forEach(function(port) {
      var dx = port.x - state.mouseWorld.x;
      var dy = port.y - state.mouseWorld.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 15) {
        ctx.fillStyle = CANVAS_THEME.portHighlightFill;
        ctx.beginPath();
        ctx.arc(port.x, port.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = CANVAS_THEME.portHighlightStroke;
        ctx.lineWidth = 2 / state.zoom;
        ctx.beginPath();
        ctx.arc(port.x, port.y, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  });
}

/* --- Placing Preview --- */

function drawPlacingPreview(ctx) {
  var x = snapToGrid(state.mouseWorld.x);
  var y = snapToGrid(state.mouseWorld.y);
  var def = COMPONENT_DEFS[state.placingComponent];

  // Check generated components if not legacy
  if (!def && typeof GENERATED_COMPONENT_DEFS !== 'undefined') {
    var genDef = GENERATED_COMPONENT_DEFS[state.placingComponent];
    if (!genDef) return;
    ctx.globalAlpha = 0.45;
    var preview = {
      id: '_preview',
      type: state.placingComponent,
      x: x,
      y: y,
      rotation: genDef.defaultRotation || 0,
      value: '',
      _generated: true
    };
    drawComponent(ctx, preview);
    ctx.globalAlpha = 1.0;
    return;
  }

  if (!def) return;

  ctx.globalAlpha = 0.45;
  var preview = {
    id: '_preview',
    type: state.placingComponent,
    x: x,
    y: y,
    rotation: def.defaultRotation,
    value: ''
  };
  drawComponent(ctx, preview);
  ctx.globalAlpha = 1.0;
}

/* --- Print Preview Overlay (A4 boundary) --- */

function drawPrintPreviewOverlay(ctx) {
  // A4 at 96 DPI: 794 x 1123 (portrait)
  var a4w = 794;
  var a4h = 1123;

  // Center the A4 frame at origin
  var ox = -a4w / 2;
  var oy = -a4h / 2;

  // Semi-transparent overlay outside A4
  // (We just draw the boundary for simplicity)

  ctx.strokeStyle = CANVAS_THEME.printOverlayStroke;
  ctx.lineWidth = 2 / state.zoom;
  ctx.setLineDash([10 / state.zoom, 6 / state.zoom]);
  ctx.strokeRect(ox, oy, a4w, a4h);
  ctx.setLineDash([]);

  // "A4" label
  ctx.fillStyle = CANVAS_THEME.printOverlayFill;
  ctx.font = (12 / state.zoom) + 'px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('A4 Portrait (' + a4w + ' × ' + a4h + ')', ox + 6, oy + 4);
}

/* --- Text Drawing --- */

function drawText(ctx, textObj) {
  var fontStyle = textObj.bold ? 'bold ' : '';
  ctx.font = fontStyle + textObj.fontSize + 'px sans-serif';
  ctx.fillStyle = CANVAS_THEME.textDefault;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText(textObj.text, textObj.x, textObj.y);
}

/* --- Text Hit Test --- */

function hitTestText(textObj, x, y) {
  var fontStyle = textObj.bold ? 'bold ' : '';
  ctx.save();
  ctx.font = fontStyle + textObj.fontSize + 'px sans-serif';
  var w = ctx.measureText(textObj.text || 'Text').width;
  ctx.restore();
  var h = textObj.fontSize;
  return x >= textObj.x && x <= textObj.x + w &&
         y >= textObj.y - h && y <= textObj.y + 4;
}


/* ── js/components.js ── */
/* ========================================
   components.js — Component definitions,
   drawing, ports, hit testing, labels
   ======================================== */

/* --- Component Definitions --- */

var COMPONENT_DEFS = {
  resistor: {
    name: 'Resistor',
    abbrev: 'R',
    icon: 'R',
    ports: [{ x: -40, y: 0 }, { x: 40, y: 0 }],
    defaultRotation: 0,
    defaultValue: ''
  },
  capacitor: {
    name: 'Capacitor',
    abbrev: 'C',
    icon: 'C',
    ports: [{ x: -40, y: 0 }, { x: 40, y: 0 }],
    defaultRotation: 0,
    defaultValue: ''
  },
  inductor: {
    name: 'Inductor',
    abbrev: 'L',
    icon: 'L',
    ports: [{ x: -40, y: 0 }, { x: 40, y: 0 }],
    defaultRotation: 0,
    defaultValue: ''
  },
  voltage: {
    name: 'Voltage Source',
    abbrev: 'V',
    icon: 'V',
    ports: [{ x: -40, y: 0 }, { x: 40, y: 0 }],
    defaultRotation: 90,
    defaultValue: ''
  },
  current: {
    name: 'Current Source',
    abbrev: 'I',
    icon: 'I',
    ports: [{ x: -40, y: 0 }, { x: 40, y: 0 }],
    defaultRotation: 90,
    defaultValue: ''
  },
  switch_comp: {
    name: 'Switch',
    abbrev: 'S',
    icon: 'S',
    ports: [{ x: -40, y: 0 }, { x: 40, y: 0 }],
    defaultRotation: 0,
    defaultValue: ''
  },
  lamp: {
    name: 'Lamp',
    abbrev: 'Lamp',
    icon: '☀',
    ports: [{ x: -40, y: 0 }, { x: 40, y: 0 }],
    defaultRotation: 0,
    defaultValue: ''
  },
  ground: {
    name: 'Ground',
    abbrev: 'GND',
    icon: '⏚',
    ports: [{ x: 0, y: -20 }],
    defaultRotation: 0,
    defaultValue: ''
  },
  vcvs: {
    name: 'Voltage-Controlled Voltage Source',
    abbrev: 'VCVS',
    icon: '◇',
    ports: [{ x: -40, y: 0 }, { x: 40, y: 0 }],
    defaultRotation: 90,
    defaultValue: ''
  },
  cccvs: {
    name: 'Current-Controlled Voltage Source',
    abbrev: 'CCCVS',
    icon: '◇',
    ports: [{ x: -40, y: 0 }, { x: 40, y: 0 }],
    defaultRotation: 90,
    defaultValue: ''
  },
  vccs: {
    name: 'Voltage-Controlled Current Source',
    abbrev: 'VCCS',
    icon: '◇',
    ports: [{ x: -40, y: 0 }, { x: 40, y: 0 }],
    defaultRotation: 90,
    defaultValue: ''
  },
  cccs: {
    name: 'Current-Controlled Current Source',
    abbrev: 'CCCS',
    icon: '◇',
    ports: [{ x: -40, y: 0 }, { x: 40, y: 0 }],
    defaultRotation: 90,
    defaultValue: ''
  }
};

/* --- Create Component --- */

function createComponent(type, x, y) {
  // Try legacy first
  var def = COMPONENT_DEFS[type];
  if (def) {
    return {
      id: generateId(),
      type: type,
      x: x,
      y: y,
      rotation: def.defaultRotation,
      value: def.defaultValue,
      ports: def.ports.map(function(p, i) { return { id: i, x: p.x, y: p.y }; })
    };
  }

  // Try generated component
  var genDef = GENERATED_COMPONENT_DEFS[type];
  if (genDef) {
    return {
      id: generateId(),
      type: type,
      x: x,
      y: y,
      rotation: genDef.defaultRotation || 0,
      value: '',
      _generated: true
    };
  }

  // Fallback
  return { id: generateId(), type: type, x: x, y: y, rotation: 0, value: '' };
}

/* --- Port Positions (World) --- */

function getComponentPorts(comp) {
  var angle = comp.rotation * Math.PI / 180;
  var cosA = Math.cos(angle);
  var sinA = Math.sin(angle);

  // 1. JSON port definition (priority)
  if (comp.ports && comp.ports.length > 0) {
    return comp.ports.map(function(p) {
      return {
        x: comp.x + Math.round(p.x * cosA - p.y * sinA),
        y: comp.y + Math.round(p.x * sinA + p.y * cosA)
      };
    });
  }

  // 2. Legacy Hardcoded fallback
  var def = COMPONENT_DEFS[comp.type];
  if (def) {
    return def.ports.map(function(p) {
      return {
        x: comp.x + Math.round(p.x * cosA - p.y * sinA),
        y: comp.y + Math.round(p.x * sinA + p.y * cosA)
      };
    });
  }

  // 3. Generated component fallback
  var genDef = typeof GENERATED_COMPONENT_DEFS !== 'undefined' ? GENERATED_COMPONENT_DEFS[comp.type] : null;
  if (genDef && genDef.pins) {
    var w = genDef.dimensions.width;
    var h = genDef.dimensions.height;
    return genDef.pins.map(function(pin) {
      // Pin position relative to component center
      var localX = pin.position.x - w / 2;
      var localY = pin.position.y - h / 2;
      // Add pin length outward
      var len = (pin.length !== undefined && pin.length !== null) ? pin.length : 20;
      if (pin.side === 'left')   localX -= len;
      if (pin.side === 'right')  localX += len;
      if (pin.side === 'top')    localY -= len;
      if (pin.side === 'bottom') localY += len;
      return {
        x: comp.x + Math.round(localX * cosA - localY * sinA),
        y: comp.y + Math.round(localX * sinA + localY * cosA)
      };
    });
  }

  return [];
}

/* --- Bounds --- */

function getComponentBounds(comp) {
  // Generated component bounds from dimensions
  var genDef = GENERATED_COMPONENT_DEFS[comp.type];
  if (genDef) {
    var w = genDef.dimensions.width;
    var h = genDef.dimensions.height;
    var pad = 15; // pin length padding
    var isVertical = (comp.rotation === 90 || comp.rotation === 270);
    if (isVertical) {
      return { x: comp.x - h / 2 - pad, y: comp.y - w / 2 - pad, w: h + pad * 2, h: w + pad * 2 };
    }
    return { x: comp.x - w / 2 - pad, y: comp.y - h / 2 - pad, w: w + pad * 2, h: h + pad * 2 };
  }

  // Legacy bounds
  if (comp.type === 'ground') {
    return { x: comp.x - 18, y: comp.y - 22, w: 36, h: 36 };
  }
  var isVertical = (comp.rotation === 90 || comp.rotation === 270);
  if (isVertical) {
    return { x: comp.x - 18, y: comp.y - 42, w: 36, h: 84 };
  }
  return { x: comp.x - 42, y: comp.y - 18, w: 84, h: 36 };
}

/* --- Hit Test --- */

function hitTestComponent(comp, x, y) {
  var b = getComponentBounds(comp);
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

function hitTestPort(components, x, y, threshold) {
  threshold = threshold || 15;
  var closest = null;
  var closestDist = threshold;

  components.forEach(function(comp) {
    var ports = getComponentPorts(comp);
    ports.forEach(function(port, idx) {
      var dx = port.x - x;
      var dy = port.y - y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = { componentId: comp.id, portIndex: idx, pos: { x: port.x, y: port.y } };
      }
    });
  });

  return closest;
}

/* --- Main Draw Dispatcher --- */

function drawComponent(ctx, comp) {
  ctx.save();
  ctx.translate(comp.x, comp.y);
  ctx.rotate(comp.rotation * Math.PI / 180);

  var strokeColor = typeof CANVAS_THEME !== 'undefined' ? CANVAS_THEME.textDefault : '#000000';
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  /* === LEGACY HARDCODED COMPONENTS === */
  // TODO: Migrate to generated system when engine covers all 12 components
  var isLegacy = true;
  switch (comp.type) {
    case 'resistor':   drawResistor(ctx);      break;
    case 'capacitor':  drawCapacitor(ctx);     break;
    case 'inductor':   drawInductor(ctx);      break;
    case 'voltage':    drawVoltageSource(ctx); break;
    case 'current':    drawCurrentSource(ctx); break;
    case 'switch_comp':drawSwitch(ctx);        break;
    case 'lamp':       drawLamp(ctx);          break;
    case 'ground':     drawGround(ctx);        break;
    case 'vcvs':       drawDependentVoltageSource(ctx); break;
    case 'cccvs':      drawDependentVoltageSource(ctx); break;
    case 'vccs':       drawDependentCurrentSource(ctx); break;
    case 'cccs':       drawDependentCurrentSource(ctx); break;
    default:           isLegacy = false;       break;
  }

  if (isLegacy) {
    // Port dots for legacy components
    var def = COMPONENT_DEFS[comp.type];
    if (def) {
      ctx.fillStyle = '#333';
      def.ports.forEach(function(p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  } else {
    /* === GENERATED COMPONENT RENDERER === */
    var genDef = GENERATED_COMPONENT_DEFS[comp.type];
    if (genDef) {
      drawGeneratedComponent(ctx, genDef, comp);
    }
  }

  ctx.restore();
}

/* ========================================
   Individual Component Drawings
   ======================================== */

/* Resistor — Zigzag */
function drawResistor(ctx) {
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-20, 0);
  ctx.lineTo(-16, -8);
  ctx.lineTo(-8, 8);
  ctx.lineTo(0, -8);
  ctx.lineTo(8, 8);
  ctx.lineTo(16, -8);
  ctx.lineTo(20, 0);
  ctx.lineTo(40, 0);
  ctx.stroke();
}

/* Capacitor — Two parallel plates */
function drawCapacitor(ctx) {
  // Leads
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-6, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(40, 0);
  ctx.stroke();

  // Left plate
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.lineTo(-6, 12);
  ctx.stroke();

  // Right plate
  ctx.beginPath();
  ctx.moveTo(6, -12);
  ctx.lineTo(6, 12);
  ctx.stroke();
}

/* Inductor — Coil bumps */
function drawInductor(ctx) {
  // Left lead
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-20, 0);
  ctx.stroke();

  // 4 half-circle bumps
  for (var i = 0; i < 4; i++) {
    var cx = -15 + i * 10;
    ctx.beginPath();
    ctx.arc(cx, 0, 5, Math.PI, 0, false);
    ctx.stroke();
  }

  // Right lead
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(40, 0);
  ctx.stroke();
}

/* Voltage Source — Circle with +/− */
function drawVoltageSource(ctx) {
  // Leads
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-18, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(40, 0);
  ctx.stroke();

  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.stroke();

  // + sign (left/negative-x side)
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-4, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7, -3);
  ctx.lineTo(-7, 3);
  ctx.stroke();

  // − sign (right/positive-x side)
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();
  ctx.lineWidth = 2;
}

/* Current Source — Circle with arrow */
function drawCurrentSource(ctx) {
  // Leads
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-18, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(40, 0);
  ctx.stroke();

  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.stroke();

  // Arrow pointing right
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(5, -4);
  ctx.moveTo(10, 0);
  ctx.lineTo(5, 4);
  ctx.stroke();
}

/* Dependent Voltage Source — Diamond with +/− */
function drawDependentVoltageSource(ctx) {
  // Leads
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-20, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(40, 0);
  ctx.stroke();

  // Diamond
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(20, 0);
  ctx.lineTo(0, 20);
  ctx.lineTo(-20, 0);
  ctx.closePath();
  ctx.stroke();

  // + sign (left/negative-x side)
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-4, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7, -3);
  ctx.lineTo(-7, 3);
  ctx.stroke();

  // − sign (right/positive-x side)
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();
  ctx.lineWidth = 2;
}

/* Dependent Current Source — Diamond with arrow */
function drawDependentCurrentSource(ctx) {
  // Leads
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-20, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(40, 0);
  ctx.stroke();

  // Diamond
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(20, 0);
  ctx.lineTo(0, 20);
  ctx.lineTo(-20, 0);
  ctx.closePath();
  ctx.stroke();

  // Arrow pointing right
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(5, -4);
  ctx.moveTo(10, 0);
  ctx.lineTo(5, 4);
  ctx.stroke();
}

/* Switch — Open switch */
function drawSwitch(ctx) {
  // Left lead
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-15, 0);
  ctx.stroke();

  // Right lead
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(40, 0);
  ctx.stroke();

  // Left contact dot
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-15, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // Right contact dot (open)
  ctx.beginPath();
  ctx.arc(15, 0, 3, 0, Math.PI * 2);
  ctx.stroke();

  // Lever
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(12, -14);
  ctx.stroke();
}

/* Lamp — Circle with X */
function drawLamp(ctx) {
  // Leads
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-15, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(40, 0);
  ctx.stroke();

  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.stroke();

  // X inside
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.lineTo(10, 10);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(10, -10);
  ctx.lineTo(-10, 10);
  ctx.stroke();
}

/* Ground — Three lines */
function drawGround(ctx) {
  // Wire from port down
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // Three horizontal lines (decreasing width)
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.lineTo(15, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.lineTo(10, 6);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.lineTo(5, 12);
  ctx.stroke();
}

/* ========================================
   Subscript Text Rendering
   Draws text with proper subscript on canvas
   ======================================== */

/**
 * Draw text with subscript support on canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} textParts - Array of strings or {base, sub} objects
 *   Example: ["v", " = ", "b", " · ", { base: "v", sub: "c" }]
 * @param {number} x - Center X position
 * @param {number} y - Baseline Y position
 * @param {object} options - { font, subFont, subOffsetY, color }
 */
function drawTextWithSubscript(ctx, textParts, x, y, options) {
  options = options || {};
  var baseFont = options.font || '12px sans-serif';
  var subFont = options.subFont || '9px sans-serif';
  var subOffsetY = options.subOffsetY || 4;
  var color = options.color || '#444';

  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';

  // First pass: measure total width to center the text
  var totalWidth = 0;
  textParts.forEach(function(part) {
    if (typeof part === 'string') {
      ctx.font = baseFont;
      totalWidth += ctx.measureText(part).width;
    } else {
      ctx.font = baseFont;
      var baseWidth = ctx.measureText(part.base).width;
      ctx.font = subFont;
      var subWidth = ctx.measureText(part.sub).width;
      totalWidth += baseWidth + subWidth;
    }
  });

  // Second pass: draw from centered start position
  var cursorX = x - totalWidth / 2;

  textParts.forEach(function(part) {
    if (typeof part === 'string') {
      ctx.font = baseFont;
      ctx.textAlign = 'left';
      ctx.fillText(part, cursorX, y);
      cursorX += ctx.measureText(part).width;
    } else {
      // Base character
      ctx.font = baseFont;
      ctx.textAlign = 'left';
      ctx.fillText(part.base, cursorX, y);
      var baseWidth = ctx.measureText(part.base).width;

      // Subscript character — smaller font, shifted down
      ctx.font = subFont;
      ctx.fillText(part.sub, cursorX + baseWidth, y + subOffsetY);
      var subWidth = ctx.measureText(part.sub).width;

      cursorX += baseWidth + subWidth;
    }
  });
}

/* --- Default label parts for dependent sources --- */

var DEPENDENT_LABEL_PARTS = {
  vcvs:  { result: 'v', coeff: 'b', controlled: { base: 'v', sub: 'c' } },
  cccvs: { result: 'v', coeff: 'r', controlled: { base: 'i', sub: 'c' } },
  vccs:  { result: 'i', coeff: 'g', controlled: { base: 'v', sub: 'c' } },
  cccs:  { result: 'i', coeff: 'd', controlled: { base: 'i', sub: 'c' } }
};

/* ========================================
   Component Label Drawing
   Labels NEVER rotate — always horizontal
   Position based on orientation
   ======================================== */

function drawComponentLabel(ctx, comp) {
  var def = COMPONENT_DEFS[comp.type];
  var depInfo = DEPENDENT_LABEL_PARTS[comp.type];

  var isVertical = (comp.rotation === 90 || comp.rotation === 270);
  var labelX, labelY, align;

  if (comp.type === 'ground') {
    labelX = comp.x + 22;
    labelY = comp.y;
    align = 'left';
  } else if (isVertical) {
    // Vertical → label to the right
    labelX = comp.x + 24;
    labelY = comp.y;
    align = 'left';
  } else {
    // Horizontal → label below center
    labelX = comp.x;
    labelY = comp.y + 24;
    align = 'center';
  }

  // Dependent sources: ALWAYS render full equation with subscript
  if (depInfo) {
    // Use comp.value as coefficient if set, otherwise use default symbol
    var coefficient = comp.value || depInfo.coeff;
    var parts = [
      depInfo.result, ' = ', coefficient, ' · ', depInfo.controlled
    ];

    // For subscript rendering, use 'middle' baseline so offset label Y
    var subY = labelY + 6;

    if (align === 'center') {
      drawTextWithSubscript(ctx, parts, labelX, subY, {
        font: '12px sans-serif',
        subFont: '9px sans-serif',
        subOffsetY: 4,
        color: '#444'
      });
    } else {
      // For left-aligned (vertical orientation): measure total width for centering
      ctx.font = '12px sans-serif';
      var totalW = 0;
      parts.forEach(function(p) {
        if (typeof p === 'string') {
          totalW += ctx.measureText(p).width;
        } else {
          totalW += ctx.measureText(p.base).width;
          ctx.font = '9px sans-serif';
          totalW += ctx.measureText(p.sub).width;
          ctx.font = '12px sans-serif';
        }
      });
      drawTextWithSubscript(ctx, parts, labelX + totalW / 2, subY, {
        font: '12px sans-serif',
        subFont: '9px sans-serif',
        subOffsetY: 4,
        color: '#444'
      });
    }
    return;
  }

  // Generated components have labels baked into their primitives.
  // Only draw an external label if the user set a custom value.
  var genDef = typeof GENERATED_COMPONENT_DEFS !== 'undefined' ? GENERATED_COMPONENT_DEFS[comp.type] : null;
  if (genDef) {
    if (!comp.value) return; // No custom value → skip (primitives already have the name)
    // User set a custom value → draw it below the component
    var bounds = getComponentBounds(comp);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(comp.value, comp.x, bounds.y + bounds.h + 4);
    return;
  }

  // Legacy components: plain text label
  var fallbackLabel = def ? def.abbrev : 'Unknown';
  var label = comp.value || fallbackLabel;
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#444';
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(label, labelX, labelY);
}

/* ========================================
   GENERATED COMPONENT PRIMITIVE RENDERER
   Renders components defined by editable primitives.
   Each primitive is drawn individually.
   ======================================== */

function drawGeneratedComponent(ctx, genDef, comp) {
  var w = genDef.dimensions.width;
  var h = genDef.dimensions.height;
  var hidePinLabels = comp && comp.showPinLabels === false;
  var hideCompName = comp && comp.showComponentName === false;

  // Translate so component center is at origin (matching legacy convention)
  ctx.translate(-w / 2, -h / 2);

  // ── Draw primitives ──
  genDef.primitives.forEach(function(prim) {
    // Skip text if user hid them
    if (prim.type === 'text' && prim.id) {
      if (prim.id === 'label' && hideCompName) return;
      if (prim.id !== 'label' && hidePinLabels) return;
    }
    ctx.save();
    switch (prim.type) {
      case 'line':
        ctx.strokeStyle = prim.stroke === 'currentColor' ? '#000' : prim.stroke;
        ctx.lineWidth = prim.strokeWidth || 2;
        ctx.lineCap = prim.lineCap || 'round';
        ctx.beginPath();
        ctx.moveTo(prim.x1, prim.y1);
        ctx.lineTo(prim.x2, prim.y2);
        ctx.stroke();
        break;

      case 'polyline':
        if (!prim.points || prim.points.length < 2) break;
        ctx.strokeStyle = prim.stroke === 'currentColor' ? '#000' : prim.stroke;
        ctx.lineWidth = prim.strokeWidth || 2;
        ctx.lineCap = prim.lineCap || 'round';
        ctx.lineJoin = prim.lineJoin || 'round';
        ctx.beginPath();
        ctx.moveTo(prim.points[0][0], prim.points[0][1]);
        for (var i = 1; i < prim.points.length; i++) {
          ctx.lineTo(prim.points[i][0], prim.points[i][1]);
        }
        if (prim.fill && prim.fill !== 'none') {
          ctx.fillStyle = prim.fill === 'currentColor' ? '#000' : prim.fill;
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'rect':
        ctx.strokeStyle = prim.stroke === 'currentColor' ? '#000' : prim.stroke;
        ctx.lineWidth = prim.strokeWidth || 2;
        if (prim.fill && prim.fill !== 'none') {
          ctx.fillStyle = prim.fill === 'currentColor' ? '#000' : prim.fill;
          ctx.fillRect(prim.x, prim.y, prim.width, prim.height);
        }
        ctx.strokeRect(prim.x, prim.y, prim.width, prim.height);
        break;

      case 'arc':
        ctx.strokeStyle = prim.stroke === 'currentColor' ? '#000' : prim.stroke;
        ctx.lineWidth = prim.strokeWidth || 1.5;
        ctx.beginPath();
        var startRad = (prim.startAngle || 0) * Math.PI / 180;
        var endRad = (prim.endAngle || 360) * Math.PI / 180;
        ctx.arc(prim.cx, prim.cy, prim.radius, startRad, endRad, prim.anticlockwise || false);
        if (prim.fill && prim.fill !== 'none') {
          ctx.fillStyle = prim.fill === 'currentColor' ? '#000' : prim.fill;
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'circle':
        ctx.strokeStyle = prim.stroke === 'currentColor' ? '#000' : prim.stroke;
        ctx.lineWidth = prim.strokeWidth || 2;
        ctx.beginPath();
        ctx.arc(prim.cx, prim.cy, prim.radius, 0, Math.PI * 2);
        if (prim.fill && prim.fill !== 'none') {
          ctx.fillStyle = prim.fill === 'currentColor' ? '#000' : prim.fill;
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'text':
        ctx.fillStyle = (prim.fill && prim.fill !== 'none') ? (prim.fill === 'currentColor' ? '#000' : prim.fill) : '#000';
        ctx.font = (prim.fontSize || 11) + 'px ' + (prim.fontFamily || 'sans-serif');
        ctx.textAlign = prim.align || 'center';
        ctx.textBaseline = prim.baseline || 'middle';
        ctx.fillText(prim.content || '', prim.x, prim.y);
        break;
    }
    ctx.restore();
  });

  // ── Draw pins ──
  if (genDef.pins) {
    genDef.pins.forEach(function(pin) {
      var px = pin.position.x;
      var py = pin.position.y;
      var len = (pin.length !== undefined && pin.length !== null) ? pin.length : 20;
      if (len === 0) {
        // No pin line needed (passive/path-based components)
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      // Calculate pin endpoint
      var endX = px, endY = py;
      if (pin.side === 'left')   endX = px - len;
      if (pin.side === 'right')  endX = px + len;
      if (pin.side === 'top')    endY = py - len;
      if (pin.side === 'bottom') endY = py + len;

      // Draw pin line
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Inversion bubble
      if (pin.invert) {
        var bx = px, by = py;
        var bubbleR = 3;
        if (pin.side === 'left')   bx -= bubbleR;
        if (pin.side === 'right')  bx += bubbleR;
        if (pin.side === 'top')    by -= bubbleR;
        if (pin.side === 'bottom') by += bubbleR;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, by, bubbleR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Port dot at wire connection point
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(endX, endY, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}


/* ── js/library-loader.js ── */
/* ========================================
   library-loader.js — Dynamic Component Library Loader

   Fetches library_bundle.json at page load to populate
   GENERATED_COMPONENT_DEFS for canvas rendering.
   Library modal UI is built lazily on first open.
   ======================================== */

var GENERATED_COMPONENT_DEFS = {};
var _catalogLoaded = false;
var _libraryBundle = null;
var _libraryModalBuilt = false;

/**
 * Load the generated component library.
 * Called once at page initialization.
 * Component defs are loaded eagerly (needed for canvas rendering).
 * Library modal DOM is built lazily on first open.
 */
function loadGeneratedLibrary() {
  fetch('library/library_bundle.json')
    .then(function(resp) {
      if (!resp.ok) {
        console.warn('[Library] No library_bundle.json found — generated library not available');
        return null;
      }
      return resp.json();
    })
    .then(function(bundle) {
      if (!bundle || !bundle.components) return;
      console.log('[Library] Loading ' + bundle.components.length + ' generated components from bundle...');

      // Register all components in generated defs (needed for canvas rendering)
      bundle.components.forEach(function(compDef) {
        GENERATED_COMPONENT_DEFS[compDef.id] = compDef;
      });

      _catalogLoaded = true;
      _libraryBundle = bundle;
      console.log('[Library] Loaded ' + Object.keys(GENERATED_COMPONENT_DEFS).length + ' components');

      // Re-render canvas so any previously placed generated components appear
      if (typeof markDirty === 'function') markDirty();
    })
    .catch(function(err) {
      console.warn('[Library] Library load failed:', err);
    });
}

/**
 * Build the library modal UI on demand (lazy).
 * Called on first library button click.
 */
function ensureLibraryModalBuilt() {
  if (_libraryModalBuilt) return;
  if (!_libraryBundle) {
    console.warn('[Library] Bundle not loaded yet');
    return;
  }
  if (typeof window.buildLibraryModal === 'function') {
    window.buildLibraryModal(_libraryBundle);
    _libraryModalBuilt = true;
    console.log('[Library] Modal UI built lazily');
  }
}


/* ── js/wire.js ── */
/* ========================================
   wire.js — Wire system
   Multi-segment polyline, grid snapping,
   90° routing, junctions, hit testing
   ======================================== */

/* ========================================
   SMART SNAP SYSTEM
   Priority: Port > Wire Node > Wire Segment > Grid
   ======================================== */

function getSmartSnap(world) {
  var result = { pos: { x: 0, y: 0 }, type: 'grid', connection: { type: 'free' } };

  // 1. Highest priority: component port within 15px
  var port = hitTestPort(state.components, world.x, world.y, 15);
  if (port) {
    return {
      pos: { x: port.pos.x, y: port.pos.y },
      type: 'port',
      connection: { type: 'port', componentId: port.componentId, portIndex: port.portIndex }
    };
  }

  // 2. Existing wire point within 10px
  for (var i = 0; i < state.wires.length; i++) {
    var wire = state.wires[i];
    for (var j = 0; j < wire.points.length; j++) {
      var p = wire.points[j];
      var dx = p.x - world.x;
      var dy = p.y - world.y;
      if (Math.sqrt(dx * dx + dy * dy) < 10) {
        return {
          pos: { x: p.x, y: p.y },
          type: 'wire',
          connection: { type: 'wire', wireId: wire.id, pointIndex: j }
        };
      }
    }
  }

  // 3. Wire segment within 8px — snap to nearest point on segment
  for (var k = 0; k < state.wires.length; k++) {
    var w = state.wires[k];
    for (var s = 0; s < w.points.length - 1; s++) {
      var nearest = nearestPointOnSegment(w.points[s], w.points[s + 1], world);
      if (nearest.dist < 8) {
        var snappedPt = { x: snapToGrid(nearest.x), y: snapToGrid(nearest.y) };
        return {
          pos: snappedPt,
          type: 'wire',
          connection: { type: 'wire', wireId: w.id, segmentIndex: s }
        };
      }
    }
  }

  // 4. Grid fallback
  result.pos.x = snapToGrid(world.x);
  result.pos.y = snapToGrid(world.y);
  return result;
}

/* --- Nearest point on line segment --- */

function nearestPointOnSegment(p1, p2, pt) {
  var dx = p2.x - p1.x;
  var dy = p2.y - p1.y;
  var lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    var d = Math.sqrt((pt.x - p1.x) * (pt.x - p1.x) + (pt.y - p1.y) * (pt.y - p1.y));
    return { x: p1.x, y: p1.y, dist: d };
  }

  var t = Math.max(0, Math.min(1, ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / lenSq));
  var projX = p1.x + t * dx;
  var projY = p1.y + t * dy;
  var dist = Math.sqrt((pt.x - projX) * (pt.x - projX) + (pt.y - projY) * (pt.y - projY));
  return { x: projX, y: projY, dist: dist, t: t };
}

/* ========================================
   90° ORTHOGONAL ROUTING
   ======================================== */

function getOrthoPreviewPoints(startPos, endPos) {
  // If same point, no routing needed
  if (startPos.x === endPos.x && startPos.y === endPos.y) {
    return [startPos];
  }

  // If already aligned horizontally or vertically
  if (startPos.x === endPos.x || startPos.y === endPos.y) {
    return [endPos];
  }

  // Create L-shaped route: default H then V
  var dx = Math.abs(endPos.x - startPos.x);
  var dy = Math.abs(endPos.y - startPos.y);

  if (dx >= dy) {
    // Horizontal first, then vertical
    return [
      { x: endPos.x, y: startPos.y },
      { x: endPos.x, y: endPos.y }
    ];
  } else {
    // Vertical first, then horizontal
    return [
      { x: startPos.x, y: endPos.y },
      { x: endPos.x, y: endPos.y }
    ];
  }
}

/* ========================================
   DRAW WIRE (polyline)
   ======================================== */

function drawWire(ctx, wire) {
  if (!wire.points || wire.points.length < 2) return;

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  for (var i = 0; i < wire.points.length - 1; i++) {
    drawSegmentWithJumps(ctx, wire.points[i], wire.points[i + 1], wire.id, i === 0);
  }
  ctx.stroke();
}

/* ========================================
   DRAW WIRE PREVIEW (multi-segment, dashed)
   ======================================== */

function drawWirePreview(ctx, committedPoints, currentPos, orthoMode) {
  if (!committedPoints || committedPoints.length === 0) return;

  var lastCommitted = committedPoints[committedPoints.length - 1];

  // Draw committed segments (solid accent)
  if (committedPoints.length >= 2) {
    ctx.strokeStyle = '#b5a3f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < committedPoints.length - 1; i++) {
      drawSegmentWithJumps(ctx, committedPoints[i], committedPoints[i + 1], 'preview', i === 0);
    }
    ctx.stroke();

    // Draw dots at committed points
    ctx.fillStyle = '#b5a3f7';
    for (var j = 0; j < committedPoints.length; j++) {
      ctx.beginPath();
      ctx.arc(committedPoints[j].x, committedPoints[j].y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw preview segment (dashed)
  ctx.strokeStyle = '#b5a3f7';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  if (orthoMode) {
    var orthoPoints = getOrthoPreviewPoints(lastCommitted, currentPos);
    ctx.beginPath();
    var p0 = lastCommitted;
    for (var k = 0; k < orthoPoints.length; k++) {
      drawSegmentWithJumps(ctx, p0, orthoPoints[k], 'preview', k === 0);
      p0 = orthoPoints[k];
    }
    ctx.stroke();
  } else {
    // Free angle
    ctx.beginPath();
    drawSegmentWithJumps(ctx, lastCommitted, currentPos, 'preview', true);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

/* ========================================
   DRAW SNAP INDICATOR
   ======================================== */

function drawSnapIndicator(ctx, snapTarget) {
  if (!snapTarget) return;

  var pos = snapTarget.pos;

  if (snapTarget.type === 'port') {
    // Port: filled purple dot + ring
    ctx.fillStyle = '#b5a3f7';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(181, 163, 247, 0.4)';
    ctx.lineWidth = 2 / state.zoom;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
    ctx.stroke();

  } else if (snapTarget.type === 'wire') {
    // Wire: orange dot
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 2 / state.zoom;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
    ctx.stroke();

  } else {
    // Grid: small crosshair
    ctx.strokeStyle = 'rgba(181, 163, 247, 0.5)';
    ctx.lineWidth = 1 / state.zoom;
    var s = 4;
    ctx.beginPath();
    ctx.moveTo(pos.x - s, pos.y);
    ctx.lineTo(pos.x + s, pos.y);
    ctx.moveTo(pos.x, pos.y - s);
    ctx.lineTo(pos.x, pos.y + s);
    ctx.stroke();
  }
}

/* ========================================
   DRAW JUNCTION DOTS
   Wire-wire connection points
   ======================================== */

function drawJunctionDots(ctx) {
  var junctions = findJunctionPoints();
  if (junctions.length === 0) return;

  ctx.fillStyle = '#000000';
  junctions.forEach(function(pt) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function findJunctionPoints() {
  var pointMap = {};
  var junctions = [];

  // Count how many wire endpoints share each grid position
  state.wires.forEach(function(wire) {
    if (!wire.points) return;
    wire.points.forEach(function(p) {
      var key = p.x + ',' + p.y;
      pointMap[key] = (pointMap[key] || 0) + 1;
    });
  });

  // Also count component ports at wire endpoints
  state.components.forEach(function(comp) {
    var ports = getComponentPorts(comp);
    ports.forEach(function(port) {
      var key = port.x + ',' + port.y;
      if (pointMap[key]) {
        pointMap[key]++;
      }
    });
  });

  // Junction = 3+ connections at same point
  for (var key in pointMap) {
    if (pointMap[key] >= 3) {
      var parts = key.split(',');
      junctions.push({ x: parseFloat(parts[0]), y: parseFloat(parts[1]) });
    }
  }

  return junctions;
}

/* ========================================
   HIT TESTING
   ======================================== */

/* --- Hit test entire wire (any segment) --- */

function hitTestWire(wire, x, y) {
  if (!wire.points || wire.points.length < 2) return false;
  var threshold = 6;

  for (var i = 0; i < wire.points.length - 1; i++) {
    var nearest = nearestPointOnSegment(wire.points[i], wire.points[i + 1], { x: x, y: y });
    if (nearest.dist < threshold) return true;
  }
  return false;
}

/* --- Hit test specific wire point (for dragging) --- */

function hitTestWirePoint(wire, x, y, threshold) {
  threshold = threshold || 8;
  for (var i = 0; i < wire.points.length; i++) {
    var dx = wire.points[i].x - x;
    var dy = wire.points[i].y - y;
    if (Math.sqrt(dx * dx + dy * dy) < threshold) {
      return i;
    }
  }
  return -1;
}

/* --- Hit test wire segment (for inserting bend point) --- */

function hitTestWireSegment(wire, x, y, threshold) {
  threshold = threshold || 6;
  for (var i = 0; i < wire.points.length - 1; i++) {
    var nearest = nearestPointOnSegment(wire.points[i], wire.points[i + 1], { x: x, y: y });
    if (nearest.dist < threshold) {
      return { segmentIndex: i, nearestPoint: { x: snapToGrid(nearest.x), y: snapToGrid(nearest.y) } };
    }
  }
  return null;
}

/* ========================================
   UPDATE WIRES WHEN COMPONENT MOVES
   Now handles polyline endpoints
   ======================================== */

function updateWiresForComponent(componentId) {
  var comp = state.components.find(function(c) { return c.id === componentId; });
  if (!comp) return;
  var ports = getComponentPorts(comp);

  state.wires.forEach(function(wire) {
    // Check start connection
    if (wire.connections && wire.connections.start &&
        wire.connections.start.type === 'port' &&
        wire.connections.start.componentId === componentId) {
      var pi = wire.connections.start.portIndex;
      if (ports[pi]) {
        wire.points[0] = { x: ports[pi].x, y: ports[pi].y };
      }
    }

    // Check end connection
    if (wire.connections && wire.connections.end &&
        wire.connections.end.type === 'port' &&
        wire.connections.end.componentId === componentId) {
      var pi2 = wire.connections.end.portIndex;
      if (ports[pi2]) {
        wire.points[wire.points.length - 1] = { x: ports[pi2].x, y: ports[pi2].y };
      }
    }

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
  });
}

/* ========================================
   WIRE JUMP VISUALIZATION LOGIC
   ======================================== */

function testAABB(a_p1, a_p2, b_p1, b_p2) {
  var ax1 = Math.min(a_p1.x, a_p2.x), ax2 = Math.max(a_p1.x, a_p2.x);
  var ay1 = Math.min(a_p1.y, a_p2.y), ay2 = Math.max(a_p1.y, a_p2.y);
  var bx1 = Math.min(b_p1.x, b_p2.x), bx2 = Math.max(b_p1.x, b_p2.x);
  var by1 = Math.min(b_p1.y, b_p2.y), by2 = Math.max(b_p1.y, b_p2.y);
  return (ax1 <= bx2 && ax2 >= bx1 && ay1 <= by2 && ay2 >= by1);
}

function getLineIntersection(p0, p1, p2, p3) {
  var s1_x = p1.x - p0.x, s1_y = p1.y - p0.y;
  var s2_x = p3.x - p2.x, s2_y = p3.y - p2.y;

  var denom = (-s2_x * s1_y + s1_x * s2_y);
  if (Math.abs(denom) < 1e-6) return null;

  var s = (-s1_y * (p0.x - p2.x) + s1_x * (p0.y - p2.y)) / denom;
  var t = ( s2_x * (p0.y - p2.y) - s2_y * (p0.x - p2.x)) / denom;

  if (s >= 0.01 && s <= 0.99 && t >= 0.01 && t <= 0.99) {
    return { x: p0.x + (t * s1_x), y: p0.y + (t * s1_y), t1: t, t2: s };
  }
  return null;
}

function isPointNearConnection(x, y) {
  for(var i=0; i<state.components.length; i++) {
    var ports = getComponentPorts(state.components[i]);
    for(var j=0; j<ports.length; j++) {
      var dx = ports[j].x - x, dy = ports[j].y - y;
      if (dx*dx + dy*dy < 25) return true;
    }
  }
  
  if (typeof findJunctionPoints === 'function') {
    var junctions = findJunctionPoints();
    for(var j=0; j<junctions.length; j++) {
      var dx = junctions[j].x - x, dy = junctions[j].y - y;
      if (dx*dx + dy*dy < 25) return true;
    }
  }
  return false;
}

function shouldJump(p1, p2, op1, op2, idA, idB) {
  var a_vert = Math.abs(p2.y - p1.y) - Math.abs(p2.x - p1.x);
  var b_vert = Math.abs(op2.y - op1.y) - Math.abs(op2.x - op1.x);

  if (Math.abs(a_vert - b_vert) > 1e-3) {
    return a_vert > b_vert; // The more vertical one jumps
  }
  return String(idA) > String(idB);
}

/* ========================================
   SPATIAL INDEX for wire segments (FIX-14)
   Reduces jump detection from O(W²×S²) to ~O(W×S)
   ======================================== */

var _segmentIndex = null;
var _segmentIndexFrame = -1;
var _CELL_SIZE = 80; // grid cell size for spatial hashing

function _segKey(cx, cy) {
  return cx + ',' + cy;
}

function _buildSegmentIndex() {
  var index = {};
  for (var w = 0; w < state.wires.length; w++) {
    var wire = state.wires[w];
    if (!wire.points) continue;
    for (var s = 0; s < wire.points.length - 1; s++) {
      var p1 = wire.points[s];
      var p2 = wire.points[s + 1];
      var minCX = Math.floor(Math.min(p1.x, p2.x) / _CELL_SIZE);
      var maxCX = Math.floor(Math.max(p1.x, p2.x) / _CELL_SIZE);
      var minCY = Math.floor(Math.min(p1.y, p2.y) / _CELL_SIZE);
      var maxCY = Math.floor(Math.max(p1.y, p2.y) / _CELL_SIZE);
      var entry = { p1: p1, p2: p2, wireId: wire.id };
      for (var cx = minCX; cx <= maxCX; cx++) {
        for (var cy = minCY; cy <= maxCY; cy++) {
          var key = _segKey(cx, cy);
          if (!index[key]) index[key] = [];
          index[key].push(entry);
        }
      }
    }
  }
  return index;
}

function getSegmentIndex() {
  // Rebuild once per render frame (dirty flag resets this)
  var frame = typeof _renderFrameCount !== 'undefined' ? _renderFrameCount : 0;
  if (!_segmentIndex || _segmentIndexFrame !== frame) {
    _segmentIndex = _buildSegmentIndex();
    _segmentIndexFrame = frame;
  }
  return _segmentIndex;
}

function invalidateSegmentIndex() {
  _segmentIndex = null;
}

function drawSegmentWithJumps(ctx, p1, p2, wireId, isFirstSegment) {
  var radius = 7;
  var jumps = [];
  
  // Use spatial index: only check segments in overlapping cells
  var idx = getSegmentIndex();
  var minCX = Math.floor(Math.min(p1.x, p2.x) / _CELL_SIZE);
  var maxCX = Math.floor(Math.max(p1.x, p2.x) / _CELL_SIZE);
  var minCY = Math.floor(Math.min(p1.y, p2.y) / _CELL_SIZE);
  var maxCY = Math.floor(Math.max(p1.y, p2.y) / _CELL_SIZE);
  
  var checked = {}; // dedup: segments may appear in multiple cells
  for (var cx = minCX; cx <= maxCX; cx++) {
    for (var cy = minCY; cy <= maxCY; cy++) {
      var bucket = idx[_segKey(cx, cy)];
      if (!bucket) continue;
      for (var b = 0; b < bucket.length; b++) {
        var seg = bucket[b];
        var segId = seg.wireId + '_' + seg.p1.x + ',' + seg.p1.y;
        if (checked[segId]) continue;
        checked[segId] = true;
        
        var op1 = seg.p1, op2 = seg.p2;

      // Skip identical overlapping segments
      if ((p1.x === op1.x && p1.y === op1.y && p2.x === op2.x && p2.y === op2.y) ||
          (p1.x === op2.x && p1.y === op2.y && p2.x === op1.x && p2.y === op1.y)) {
        continue;
      }
      
      if (!testAABB(p1, p2, op1, op2)) continue;
      
      var intersect = getLineIntersection(p1, p2, op1, op2);
      if (intersect) {
        var lenA = Math.sqrt((p2.x - p1.x)*(p2.x - p1.x) + (p2.y - p1.y)*(p2.y - p1.y));
        var lenB = Math.sqrt((op2.x - op1.x)*(op2.x - op1.x) + (op2.y - op1.y)*(op2.y - op1.y));
        
        if (intersect.t1 * lenA < 5 || (1 - intersect.t1) * lenA < 5) continue;
        if (intersect.t2 * lenB < 5 || (1 - intersect.t2) * lenB < 5) continue;
        
        if (isPointNearConnection(intersect.x, intersect.y)) continue;
        
        if (shouldJump(p1, p2, op1, op2, wireId, seg.wireId)) {
          jumps.push(intersect);
        }
      }
      }
    }
  }
  
  jumps.sort(function(a, b) { return a.t1 - b.t1; });
  
  if (isFirstSegment) {
    ctx.moveTo(p1.x, p1.y);
  }
  
  var dx = p2.x - p1.x;
  var dy = p2.y - p1.y;
  var len = Math.sqrt(dx*dx + dy*dy);
  var uX = dx / len;
  var uY = dy / len;
  var angle = Math.atan2(dy, dx);
  
  var currT = 0;
  
  for (var k = 0; k < jumps.length; k++) {
    var jump = jumps[k];
    
    // Merge jumps that overlap
    if (jump.t1 * len < currT * len + radius * 2) continue;
    
    var startArcX = p1.x + uX * (jump.t1 * len - radius);
    var startArcY = p1.y + uY * (jump.t1 * len - radius);
    
    ctx.lineTo(startArcX, startArcY);
    ctx.arc(jump.x, jump.y, radius, angle + Math.PI, angle, false);
    
    currT = jump.t1 + (radius / len);
  }
  
  ctx.lineTo(p2.x, p2.y);
}


/* ── js/tools.js ── */
/* ========================================
   tools.js — Tool handlers
   Select, Wire, Eraser, Text, Place
   ======================================== */

/* --- Tool Router --- */

function toolMouseDown(world, e) {
  if (state.selectAllActive) {
    state.selectAllActive = false;
    markDirty();
  }
  switch (state.tool) {
    case 'select': selectMouseDown(world); break;
    case 'wire':   wireMouseDown(world);   break;
    case 'eraser': eraserMouseDown(world); break;
    case 'text':   textMouseDown(world);   break;
    case 'place':  placeMouseDown(world);  break;
  }
}

function toolMouseMove(world, e) {
  switch (state.tool) {
    case 'select': selectMouseMove(world); break;
    case 'wire':   wireMouseMove(world);   break;
    case 'text':   textMouseMove(world);   break;
  }
}

function toolMouseUp(world, e) {
  switch (state.tool) {
    case 'select': selectMouseUp(); break;
    case 'text':   textMouseUp();   break;
  }
}

function toolDoubleClick(world, e) {
  switch (state.tool) {
    case 'select': selectDoubleClick(world); break;
    case 'wire':   wireDoubleClick(world);   break;
    case 'text':   textDoubleClick(world);   break;
  }
}

/* ========================================
   SELECT TOOL
   ======================================== */

function selectMouseDown(world) {
  // Check wire points first (for dragging bend points)
  for (var w = state.wires.length - 1; w >= 0; w--) {
    var wire = state.wires[w];
    var ptIdx = hitTestWirePoint(wire, world.x, world.y, 8);
    if (ptIdx >= 0) {
      state.selected = { type: 'wire', id: wire.id };
      state.dragWirePoint = { wireId: wire.id, pointIndex: ptIdx };
      state.isDragging = true;
      state._dragSnapshotTaken = false;
      markDirty();
      return;
    }
  }

  // Check components (top-most first)
  for (var i = state.components.length - 1; i >= 0; i--) {
    var comp = state.components[i];
    if (hitTestComponent(comp, world.x, world.y)) {
      state.selected = { type: 'component', id: comp.id };
      state.isDragging = true;
      state.dragStart = { x: world.x - comp.x, y: world.y - comp.y };
      state._dragSnapshotTaken = false;
      markDirty();
      return;
    }
  }

  // Check texts
  for (var j = state.texts.length - 1; j >= 0; j--) {
    var txt = state.texts[j];
    if (hitTestText(txt, world.x, world.y)) {
      state.selected = { type: 'text', id: txt.id };
      state.isDragging = true;
      state.dragStart = { x: world.x - txt.x, y: world.y - txt.y };
      state._dragSnapshotTaken = false;
      markDirty();
      return;
    }
  }

  // Check wires (segment hit)
  for (var k = state.wires.length - 1; k >= 0; k--) {
    var wire2 = state.wires[k];
    if (hitTestWire(wire2, world.x, world.y)) {
      state.selected = { type: 'wire', id: wire2.id };
      markDirty();
      return;
    }
  }

  // Nothing hit → deselect
  state.selected = null;
  markDirty();
}

function selectMouseMove(world) {
  if (!state.isDragging || !state.selected) return;

  // Wire point dragging
  if (state.dragWirePoint) {
    var wire = state.wires.find(function(w) { return w.id === state.dragWirePoint.wireId; });
    if (!wire) return;

    var newX = snapToGrid(world.x);
    var newY = snapToGrid(world.y);
    var pt = wire.points[state.dragWirePoint.pointIndex];

    if (pt.x !== newX || pt.y !== newY) {
      if (!state._dragSnapshotTaken) {
        saveSnapshot();
        state._dragSnapshotTaken = true;
      }
      pt.x = newX;
      pt.y = newY;
      saveToLocalStorage();
      markDirty();
    }
    return;
  }

  if (state.selected.type === 'component') {
    var comp = state.components.find(function(c) { return c.id === state.selected.id; });
    if (!comp) return;

    var newX2 = snapToGrid(world.x - state.dragStart.x);
    var newY2 = snapToGrid(world.y - state.dragStart.y);

    if (comp.x !== newX2 || comp.y !== newY2) {
      if (!state._dragSnapshotTaken) {
        saveSnapshot();
        state._dragSnapshotTaken = true;
      }
      comp.x = newX2;
      comp.y = newY2;
      updateWiresForComponent(comp.id);
      saveToLocalStorage();
      markDirty();
    }
  } else if (state.selected.type === 'text') {
    var txt = state.texts.find(function(t) { return t.id === state.selected.id; });
    if (!txt) return;

    var nx = snapToGrid(world.x - state.dragStart.x);
    var ny = snapToGrid(world.y - state.dragStart.y);

    if (txt.x !== nx || txt.y !== ny) {
      if (!state._dragSnapshotTaken) {
        saveSnapshot();
        state._dragSnapshotTaken = true;
      }
      txt.x = nx;
      txt.y = ny;
      saveToLocalStorage();
      markDirty();
    }
  }
}

function selectMouseUp() {
  state.isDragging = false;
  state.dragStart = null;
  state.dragWirePoint = null;
  state._dragSnapshotTaken = false;
}

function selectDoubleClick(world) {
  // Double-click on wire segment → insert bend point
  for (var w = state.wires.length - 1; w >= 0; w--) {
    var wire = state.wires[w];
    var segHit = hitTestWireSegment(wire, world.x, world.y, 8);
    if (segHit) {
      saveSnapshot();
      wire.points.splice(segHit.segmentIndex + 1, 0, segHit.nearestPoint);
      saveToLocalStorage();
      markDirty();
      return;
    }
  }

  // Double-click component → open value edit modal
  for (var i = state.components.length - 1; i >= 0; i--) {
    var comp = state.components[i];
    if (hitTestComponent(comp, world.x, world.y)) {
      openValueEditModal(comp);
      return;
    }
  }

  // Double-click text → open text edit modal
  for (var j = state.texts.length - 1; j >= 0; j--) {
    var txt = state.texts[j];
    if (hitTestText(txt, world.x, world.y)) {
      openTextEditModal(txt, false);
      return;
    }
  }
}

/* ========================================
   WIRE TOOL (multi-segment, smart snap)
   ======================================== */

function wireMouseDown(world) {
  var snap = getSmartSnap(world);

  if (!state.wireStart) {
    // First click → start wire at snapped position
    state.wireStart = {
      pos: snap.pos,
      connection: snap.connection
    };
    state.wireDrawingPoints = [{ x: snap.pos.x, y: snap.pos.y }];
    markDirty();
  } else {
    // Subsequent click → add bend point(s) based on ortho mode
    var lastPoint = state.wireDrawingPoints[state.wireDrawingPoints.length - 1];

    if (state.wireOrthoMode) {
      var orthoPoints = getOrthoPreviewPoints(lastPoint, snap.pos);
      for (var i = 0; i < orthoPoints.length; i++) {
        state.wireDrawingPoints.push({ x: orthoPoints[i].x, y: orthoPoints[i].y });
      }
    } else {
      state.wireDrawingPoints.push({ x: snap.pos.x, y: snap.pos.y });
    }

    // If snapped to a port, auto-finish the wire
    if (snap.type === 'port') {
      finishWire(snap);
    }

    markDirty();
  }
}

function wireMouseMove(world) {
  // Update snap target for visual indicator
  if (state.tool === 'wire') {
    var snap = getSmartSnap(world);
    state.wireSnapTarget = snap;
    markDirty();
  }
}

function wireDoubleClick(world) {
  // Double-click finishes the wire
  if (state.wireStart && state.wireDrawingPoints.length >= 2) {
    var snap = getSmartSnap(world);
    finishWire(snap);
  }
}

function finishWire(endSnap) {
  if (!state.wireStart || state.wireDrawingPoints.length < 2) {
    cancelWireDrawing();
    return;
  }

  // Don't create zero-length wires
  var firstPt = state.wireDrawingPoints[0];
  var lastPt = state.wireDrawingPoints[state.wireDrawingPoints.length - 1];
  if (firstPt.x === lastPt.x && firstPt.y === lastPt.y && state.wireDrawingPoints.length === 2) {
    cancelWireDrawing();
    return;
  }

  // Clean up redundant collinear points
  var cleanedPoints = simplifyPolyline(state.wireDrawingPoints);

  saveSnapshot();
  var wire = {
    id: generateId(),
    points: cleanedPoints,
    connections: {
      start: state.wireStart.connection,
      end: endSnap ? endSnap.connection : { type: 'free' }
    }
  };
  state.wires.push(wire);
  cancelWireDrawing();
  saveToLocalStorage();
  markDirty();
}

function cancelWireDrawing() {
  state.wireStart = null;
  state.wireDrawingPoints = [];
  state.wireSnapTarget = null;
}

/* --- Simplify polyline: remove redundant collinear points --- */

function simplifyPolyline(points) {
  if (points.length <= 2) return points.slice();

  var result = [points[0]];
  for (var i = 1; i < points.length - 1; i++) {
    var prev = result[result.length - 1];
    var curr = points[i];
    var next = points[i + 1];

    // Check if curr is collinear with prev and next
    var isHorizontal = (prev.y === curr.y && curr.y === next.y);
    var isVertical = (prev.x === curr.x && curr.x === next.x);

    if (!isHorizontal && !isVertical) {
      result.push(curr);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

/* ========================================
   ERASER TOOL
   ======================================== */

function eraserMouseDown(world) {
  // Check components
  for (var i = state.components.length - 1; i >= 0; i--) {
    var comp = state.components[i];
    if (hitTestComponent(comp, world.x, world.y)) {
      saveSnapshot();
      var compId = comp.id;
      state.components.splice(i, 1);
      // Remove wires connected to this component (both legacy and new format)
      state.wires = state.wires.filter(function(w) {
        if (w.startComponentId === compId || w.endComponentId === compId) return false;
        if (w.connections) {
          if (w.connections.start && w.connections.start.componentId === compId) return false;
          if (w.connections.end && w.connections.end.componentId === compId) return false;
        }
        return true;
      });
      if (state.selected && state.selected.id === compId) state.selected = null;
      cleanupOrphanedConnections();
      saveToLocalStorage();
      markDirty();
      return;
    }
  }

  // Check wires
  for (var j = state.wires.length - 1; j >= 0; j--) {
    var wire = state.wires[j];
    if (hitTestWire(wire, world.x, world.y)) {
      saveSnapshot();
      state.wires.splice(j, 1);
      if (state.selected && state.selected.id === wire.id) state.selected = null;
      cleanupOrphanedConnections();
      saveToLocalStorage();
      markDirty();
      return;
    }
  }

  // Check texts
  for (var k = state.texts.length - 1; k >= 0; k--) {
    var txt = state.texts[k];
    if (hitTestText(txt, world.x, world.y)) {
      saveSnapshot();
      state.texts.splice(k, 1);
      if (state.selected && state.selected.id === txt.id) state.selected = null;
      cleanupOrphanedConnections();
      saveToLocalStorage();
      markDirty();
      return;
    }
  }
}

/* ========================================
   TEXT TOOL
   ======================================== */

function textMouseDown(world) {
  for (var i = state.texts.length - 1; i >= 0; i--) {
    var txt = state.texts[i];
    if (hitTestText(txt, world.x, world.y)) {
      state.selected = { type: 'text', id: txt.id };
      state.isDragging = true;
      state.dragStart = { x: world.x - txt.x, y: world.y - txt.y };
      state._dragSnapshotTaken = false;
      markDirty();
      return;
    }
  }

  var snappedX = snapToGrid(world.x);
  var snappedY = snapToGrid(world.y);

  openTextEditModal(null, true, function(text) {
    saveSnapshot();
    var textObj = {
      id: generateId(),
      x: snappedX,
      y: snappedY,
      text: text,
      fontSize: 16,
      bold: false
    };
    state.texts.push(textObj);
    state.selected = { type: 'text', id: textObj.id };
    saveToLocalStorage();
    markDirty();
  });
}

function textMouseMove(world) {
  if (!state.isDragging || !state.selected || state.selected.type !== 'text') return;

  var txt = state.texts.find(function(t) { return t.id === state.selected.id; });
  if (!txt) return;

  var nx = snapToGrid(world.x - state.dragStart.x);
  var ny = snapToGrid(world.y - state.dragStart.y);

  if (txt.x !== nx || txt.y !== ny) {
    if (!state._dragSnapshotTaken) {
      saveSnapshot();
      state._dragSnapshotTaken = true;
    }
    txt.x = nx;
    txt.y = ny;
    saveToLocalStorage();
    markDirty();
  }
}

function textMouseUp() {
  state.isDragging = false;
  state.dragStart = null;
  state._dragSnapshotTaken = false;
}

function textDoubleClick(world) {
  for (var i = state.texts.length - 1; i >= 0; i--) {
    var txt = state.texts[i];
    if (hitTestText(txt, world.x, world.y)) {
      openTextEditModal(txt, false);
      return;
    }
  }
  textMouseDown(world);
}

/* ========================================
   PLACE TOOL
   ======================================== */

function placeMouseDown(world) {
  if (!state.placingComponent) return;

  saveSnapshot();
  var x = snapToGrid(world.x);
  var y = snapToGrid(world.y);
  var comp = createComponent(state.placingComponent, x, y);
  state.components.push(comp);
  state.selected = null;
  
  // Exit placement mode and switch back to select tool
  setTool('select');
  
  saveToLocalStorage();
  markDirty();
}

/* ========================================
   HELPER FUNCTIONS
   ======================================== */

function setTool(tool) {
  // Cancel any in-progress wire drawing
  cancelWireDrawing();
  state.tool = tool;
  state.placingComponent = null;
  state.isDragging = false;
  state.dragStart = null;
  state.dragWirePoint = null;
  state.selectAllActive = false;
  updateToolHighlight(tool);
  markDirty();
}

function rotateSelected() {
  if (!state.selected || state.selected.type !== 'component') return;
  var comp = state.components.find(function(c) { return c.id === state.selected.id; });
  if (!comp) return;
  saveSnapshot();
  comp.rotation = (comp.rotation + 90) % 360;
  updateWiresForComponent(comp.id);
  saveToLocalStorage();
  markDirty();
}

function selectAll() {
  state.selected = null;
  state.selectAllActive = true;
  if (typeof updateContextPanel === 'function') updateContextPanel();
  markDirty();
}

function deleteSelected() {
  if (state.selectAllActive) {
    saveSnapshot();
    state.components = [];
    state.wires = [];
    state.texts = [];
    state.selectAllActive = false;
    saveToLocalStorage();
    markDirty();
    return;
  }

  if (!state.selected) return;
  saveSnapshot();

  if (state.selected.type === 'component') {
    var cid = state.selected.id;
    state.components = state.components.filter(function(c) { return c.id !== cid; });
    state.wires = state.wires.filter(function(w) {
      if (w.startComponentId === cid || w.endComponentId === cid) return false;
      if (w.connections) {
        if (w.connections.start && w.connections.start.componentId === cid) return false;
        if (w.connections.end && w.connections.end.componentId === cid) return false;
      }
      return true;
    });
  } else if (state.selected.type === 'wire') {
    var wid = state.selected.id;
    state.wires = state.wires.filter(function(w) { return w.id !== wid; });
  } else if (state.selected.type === 'text') {
    var tid = state.selected.id;
    state.texts = state.texts.filter(function(t) { return t.id !== tid; });
  }

  state.selected = null;
  cleanupOrphanedConnections();
  saveToLocalStorage();
  markDirty();
}

function cleanupOrphanedConnections() {
  var wireIds = {};
  var compIds = {};
  state.wires.forEach(function(w) { wireIds[w.id] = true; });
  state.components.forEach(function(c) { compIds[c.id] = true; });

  state.wires.forEach(function(w) {
    if (w.connections) {
      if (w.connections.start) {
        if (w.connections.start.type === 'wire' && !wireIds[w.connections.start.wireId]) w.connections.start = { type: 'free' };
        if (w.connections.start.type === 'port' && !compIds[w.connections.start.componentId]) w.connections.start = { type: 'free' };
      }
      if (w.connections.end) {
        if (w.connections.end.type === 'wire' && !wireIds[w.connections.end.wireId]) w.connections.end = { type: 'free' };
        if (w.connections.end.type === 'port' && !compIds[w.connections.end.componentId]) w.connections.end = { type: 'free' };
      }
    }
  });
}

function editSelectedValue() {
  if (!state.selected) return;
  if (state.selected.type === 'component') {
    var comp = state.components.find(function(c) { return c.id === state.selected.id; });
    if (comp) openValueEditModal(comp);
  } else if (state.selected.type === 'text') {
    var txt = state.texts.find(function(t) { return t.id === state.selected.id; });
    if (txt) openTextEditModal(txt, false);
  }
}

function toggleBoldSelected() {
  if (!state.selected || state.selected.type !== 'text') return;
  var txt = state.texts.find(function(t) { return t.id === state.selected.id; });
  if (!txt) return;
  saveSnapshot();
  txt.bold = !txt.bold;
  saveToLocalStorage();
  markDirty();
}

function cancelAction() {
  cancelWireDrawing();
  state.selected = null;
  state.selectAllActive = false;
  if (state.tool === 'place') {
    setTool('select');
  }
  markDirty();
}


/* ── js/export.js ── */
/* ========================================
   export.js — PNG, JPG, PDF, JSON export
   A4 professional scaling
   ======================================== */

/* --- A4 Dimensions at 96 DPI (px) --- */
var A4_PORTRAIT  = { w: 794,  h: 1123 };
var A4_LANDSCAPE = { w: 1123, h: 794  };

/* --- Margin presets (px at 96 DPI) --- */
var MARGIN_PRESETS = {
  none:   0,
  small:  30,
  normal: 60
};

/* ========================================
   STANDARD IMAGE EXPORT (PNG/JPG)
   Tight-fit around content with 2x scaling
   ======================================== */

function exportImage(format) {
  var bounds = getContentBounds();
  if (!bounds) {
    alert('Nothing to export. Place some components first.');
    return;
  }

  var padding = 50;
  var scale = 2;

  var w = (bounds.maxX - bounds.minX + padding * 2) * scale;
  var h = (bounds.maxY - bounds.minY + padding * 2) * scale;

  var offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  var offCtx = offCanvas.getContext('2d');

  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, w, h);

  offCtx.save();
  offCtx.scale(scale, scale);
  offCtx.translate(padding - bounds.minX, padding - bounds.minY);

  renderContentToContext(offCtx);
  offCtx.restore();

  var ext = format === 'jpeg' ? 'jpg' : 'png';
  var link = document.createElement('a');
  link.download = 'circuit.' + ext;
  link.href = offCanvas.toDataURL('image/' + format, 0.95);
  link.click();
}

function exportPNG() { exportImage('png'); }
function exportJPG() { exportImage('jpeg'); }

/* ========================================
   TRANSPARENT PNG EXPORT
   No background, no grid — just content
   3x scale for crisp print quality
   ======================================== */

function exportTransparentPNG() {
  var bounds = getContentBounds();
  if (!bounds) {
    alert('Nothing to export. Place some components first.');
    return;
  }

  var padding = 30;
  var scale = 3; // 3x for ultra-crisp output

  var w = (bounds.maxX - bounds.minX + padding * 2) * scale;
  var h = (bounds.maxY - bounds.minY + padding * 2) * scale;

  var offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  var offCtx = offCanvas.getContext('2d');

  // NO background fill — keep alpha channel transparent
  offCtx.clearRect(0, 0, w, h);

  offCtx.save();
  offCtx.scale(scale, scale);
  offCtx.translate(padding - bounds.minX, padding - bounds.minY);

  renderContentToContext(offCtx);
  offCtx.restore();

  var link = document.createElement('a');
  link.download = 'circuit_transparent.png';
  link.href = offCanvas.toDataURL('image/png');
  link.click();
}

/* ========================================
   A4 EXPORT (professional scaling)
   ======================================== */

function exportA4(format, settings) {
  settings = settings || {};
  var orientation = settings.orientation || 'portrait';
  var scaleMode = settings.scaleMode || 'fit';  // 'fit' | '100' | 'custom'
  var customScale = settings.customScale || 100;
  var marginKey = settings.margin || 'normal';
  var margin = MARGIN_PRESETS[marginKey] || 60;

  var a4 = orientation === 'landscape' ? A4_LANDSCAPE : A4_PORTRAIT;
  var exportScale = 2; // 2x for print quality

  var canvasW = a4.w * exportScale;
  var canvasH = a4.h * exportScale;

  var bounds = getContentBounds();
  if (!bounds) {
    alert('Nothing to export. Place some components first.');
    return;
  }

  // Content dimensions
  var contentW = bounds.maxX - bounds.minX;
  var contentH = bounds.maxY - bounds.minY;

  // Available area (inside margins)
  var availW = a4.w - margin * 2;
  var availH = a4.h - margin * 2;

  // Compute scale
  var drawScale;
  if (scaleMode === 'fit') {
    var scaleX = availW / contentW;
    var scaleY = availH / contentH;
    drawScale = Math.min(scaleX, scaleY, 1.5); // cap at 150%
  } else if (scaleMode === '100') {
    drawScale = 1;
  } else {
    drawScale = customScale / 100;
  }

  // Ensure minimum font readability (10pt ≈ 13px)
  var minFontScale = 0.5;
  if (drawScale < minFontScale) drawScale = minFontScale;

  // Scaled content dimensions
  var scaledW = contentW * drawScale;
  var scaledH = contentH * drawScale;

  // Center content in the page
  var offsetX = (a4.w - scaledW) / 2;
  var offsetY = (a4.h - scaledH) / 2;

  // Create offscreen canvas
  var offCanvas = document.createElement('canvas');
  offCanvas.width = canvasW;
  offCanvas.height = canvasH;
  var offCtx = offCanvas.getContext('2d');

  // White background
  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, canvasW, canvasH);

  // Draw content
  offCtx.save();
  offCtx.scale(exportScale, exportScale);
  offCtx.translate(offsetX, offsetY);
  offCtx.scale(drawScale, drawScale);
  offCtx.translate(-bounds.minX, -bounds.minY);

  renderContentToContext(offCtx);
  offCtx.restore();

  // Output
  if (format === 'pdf') {
    exportCanvasAsPDF(offCanvas, orientation);
  } else {
    var ext = format === 'jpeg' ? 'jpg' : 'png';
    var link = document.createElement('a');
    link.download = 'circuit_a4.' + ext;
    link.href = offCanvas.toDataURL('image/' + format, 0.95);
    link.click();
  }
}

/* ========================================
   PDF EXPORT
   Opens A4-sized image in new tab for print
   ======================================== */

function exportCanvasAsPDF(offCanvas, orientation) {
  // Create a new window with the image sized to A4
  var imgData = offCanvas.toDataURL('image/png');

  var printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to export PDF.');
    return;
  }

  var a4 = orientation === 'landscape' ? A4_LANDSCAPE : A4_PORTRAIT;

  printWin.document.write('<!DOCTYPE html><html><head>');
  printWin.document.write('<title>Circuit Diagram — Print</title>');
  printWin.document.write('<style>');
  printWin.document.write('@page { size: ' + (orientation === 'landscape' ? 'A4 landscape' : 'A4') + '; margin: 0; }');
  printWin.document.write('* { margin: 0; padding: 0; }');
  printWin.document.write('body { display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; background: white; }');
  printWin.document.write('img { max-width: 100%; max-height: 100%; }');
  printWin.document.write('</style>');
  printWin.document.write('</head><body>');
  printWin.document.write('<img src="' + imgData + '" />');
  printWin.document.write('</body></html>');
  printWin.document.close();

  // Auto-trigger print dialog
  printWin.onload = function() {
    setTimeout(function() { printWin.print(); }, 300);
  };
}

function exportPDF() {
  var settings = getExportSettings();
  exportA4('pdf', settings);
}

/* ========================================
   RENDER CONTENT TO CONTEXT
   Shared between export and preview
   ======================================== */

function renderContentToContext(ctx2) {
  // Draw wires
  state.wires.forEach(function(wire) { drawWire(ctx2, wire); });

  // Draw junction dots
  var junctions = findJunctionPoints();
  ctx2.fillStyle = '#000000';
  junctions.forEach(function(pt) {
    ctx2.beginPath();
    ctx2.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx2.fill();
  });

  // Draw components + labels
  state.components.forEach(function(comp) {
    drawComponent(ctx2, comp);
    drawComponentLabel(ctx2, comp);
  });

  // Draw texts
  state.texts.forEach(function(t) { drawText(ctx2, t); });
}

/* ========================================
   EXPORT SETTINGS (from modal UI)
   ======================================== */

function getExportSettings() {
  var orientationEl = document.querySelector('input[name="export-orientation"]:checked');
  var scaleModeEl = document.querySelector('input[name="export-scale"]:checked');
  var marginEl = document.querySelector('input[name="export-margin"]:checked');
  var customScaleEl = document.getElementById('export-custom-scale');

  return {
    orientation: orientationEl ? orientationEl.value : 'portrait',
    scaleMode: scaleModeEl ? scaleModeEl.value : 'fit',
    customScale: customScaleEl ? parseInt(customScaleEl.value) || 100 : 100,
    margin: marginEl ? marginEl.value : 'normal'
  };
}

/* --- Toggle Print Preview --- */

function togglePrintPreview() {
  state.showPrintPreview = !state.showPrintPreview;
  markDirty();
}

/* ========================================
   JSON EXPORT / IMPORT
   ======================================== */

function exportJSON() {
  var data = {
    version: 2,
    components: state.components,
    wires: state.wires,
    texts: state.texts
  };

  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var link = document.createElement('a');
  link.download = 'circuit.json';
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function importJSON() {
  var input = document.getElementById('import-input');
  input.click();
}

function handleImportFile(e) {
  var file = e.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(event) {
    try {
      var data = JSON.parse(event.target.result);
      var validation = validateImportData(data);
      if (validation.valid) {
        saveSnapshot();
        state.components = data.components || [];
        state.wires = data.wires || [];
        state.texts = data.texts || [];
        state.selected = null;
        saveToLocalStorage();
        markDirty();
      } else {
        alert('Invalid circuit file:\n' + validation.errors.join('\n'));
      }
    } catch (err) {
      alert('Failed to parse JSON file: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/**
 * Validate imported JSON data against expected schema.
 * Prevents state corruption from malformed data.
 */
function validateImportData(data) {
  var errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Not a valid JSON object'] };
  }
  if (!Array.isArray(data.components)) {
    errors.push('Missing or invalid "components" array');
  }
  if (!Array.isArray(data.wires)) {
    errors.push('Missing or invalid "wires" array');
  }

  if (errors.length > 0) return { valid: false, errors: errors };

  // Validate components
  for (var i = 0; i < data.components.length; i++) {
    var c = data.components[i];
    if (!c || typeof c !== 'object') {
      errors.push('Component [' + i + ']: not a valid object');
      continue;
    }
    if (!c.id || typeof c.id !== 'string') {
      errors.push('Component [' + i + ']: missing or invalid "id"');
    }
    if (!c.type || typeof c.type !== 'string') {
      errors.push('Component [' + i + ']: missing or invalid "type"');
    }
    if (typeof c.x !== 'number' || typeof c.y !== 'number') {
      errors.push('Component [' + i + ']: missing or invalid x/y coordinates');
    }
    if (errors.length > 10) {
      errors.push('...and more errors (stopped after 10)');
      break;
    }
  }

  // Validate wires
  for (var j = 0; j < data.wires.length; j++) {
    var w = data.wires[j];
    if (!w || typeof w !== 'object') {
      errors.push('Wire [' + j + ']: not a valid object');
      continue;
    }
    if (!w.id || typeof w.id !== 'string') {
      errors.push('Wire [' + j + ']: missing or invalid "id"');
    }
    if (!Array.isArray(w.points) || w.points.length < 2) {
      errors.push('Wire [' + j + ']: missing or invalid "points" (need >= 2)');
    } else {
      for (var k = 0; k < w.points.length; k++) {
        var pt = w.points[k];
        if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') {
          errors.push('Wire [' + j + '] point [' + k + ']: invalid coordinates');
          break;
        }
      }
    }
    if (errors.length > 10) {
      errors.push('...and more errors (stopped after 10)');
      break;
    }
  }

  // Validate texts (optional array)
  if (data.texts && Array.isArray(data.texts)) {
    for (var t = 0; t < data.texts.length; t++) {
      var txt = data.texts[t];
      if (!txt || typeof txt !== 'object') {
        errors.push('Text [' + t + ']: not a valid object');
        continue;
      }
      if (typeof txt.x !== 'number' || typeof txt.y !== 'number') {
        errors.push('Text [' + t + ']: missing or invalid coordinates');
      }
      if (typeof txt.text !== 'string') {
        errors.push('Text [' + t + ']: missing or invalid "text" field');
      }
    }
  }

  return { valid: errors.length === 0, errors: errors };
}

/* ========================================
   CONTENT BOUNDS
   ======================================== */

function getContentBounds() {
  var minX = Infinity, minY = Infinity;
  var maxX = -Infinity, maxY = -Infinity;

  state.components.forEach(function(comp) {
    var b = getComponentBounds(comp);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  });

  state.wires.forEach(function(wire) {
    if (!wire.points) return;
    wire.points.forEach(function(p) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
  });

  state.texts.forEach(function(t) {
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y - t.fontSize);
    maxX = Math.max(maxX, t.x + 120);
    maxY = Math.max(maxY, t.y + 4);
  });

  if (minX === Infinity) return null;

  minX -= 30;
  minY -= 30;
  maxX += 30;
  maxY += 30;

  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
}


/* ── js/ui.js ── */
/* ========================================
   ui.js — Floating toolbars, pickers,
   context panel, modals
   ======================================== */

/* --- HTML Escape Utility (XSS Prevention) --- */
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g, '&#39;');
}

/* --- SI Unit Data per component type --- */

var COMPONENT_UNITS = {
  resistor:    { category: 'Passive', units: ['Ω', 'kΩ', 'MΩ'], examples: ['100Ω', '1kΩ', '10kΩ', '1MΩ'], guide: 'Resistance in Ohms. Common: Ω, kΩ, MΩ' },
  capacitor:   { category: 'Passive', units: ['F', 'mF', 'µF', 'nF', 'pF'], examples: ['10µF', '100nF', '1pF'], guide: 'Capacitance in Farads. Common: µF, nF, pF' },
  inductor:    { category: 'Passive', units: ['H', 'mH', 'µH'], examples: ['10mH', '100µH', '1H'], guide: 'Inductance in Henrys. Common: mH, µH' },
  voltage:     { category: 'Source', units: ['V', 'mV', 'kV'], examples: ['5V', '12V', '220V', '3.3V'], guide: 'Voltage in Volts' },
  current:     { category: 'Source', units: ['A', 'mA', 'µA'], examples: ['1A', '500mA', '10µA'], guide: 'Current in Amperes' },
  switch_comp: { category: 'Switch', units: [], examples: ['S1', 'SW1'], guide: 'No unit — use a label like S1' },
  lamp:        { category: 'Output', units: ['W'], examples: ['60W', '100W', 'Lamp1'], guide: 'Power in Watts (optional)' },
  ground:      { category: 'Reference', units: [], examples: ['GND'], guide: 'No unit' },
  vcvs:        { category: 'Dep. Source', units: [], examples: ['2', '5', '10'], guide: 'Enter coefficient (e.g. 2, 5, 10)' },
  cccvs:       { category: 'Dep. Source', units: [], examples: ['2', '5', '10'], guide: 'Enter coefficient (e.g. 2, 5, 10)' },
  vccs:        { category: 'Dep. Source', units: [], examples: ['0.1', '0.5', '2'], guide: 'Enter coefficient (e.g. 0.1, 0.5, 2)' },
  cccs:        { category: 'Dep. Source', units: [], examples: ['2', '5', '10'], guide: 'Enter coefficient (e.g. 2, 5, 10)' }
};

/* ========================================
   Initialization
   ======================================== */

function initUI() {
  // Top toolbar — tool buttons
  document.querySelectorAll('#top-toolbar .tb-btn[data-tool]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      closeComponentPicker();
      setTool(btn.dataset.tool);
    });
  });

  // Top toolbar — quick component buttons
  document.querySelectorAll('#top-toolbar .tb-btn[data-comp]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      closeComponentPicker();
      activateComponent(btn.dataset.comp);
    });
  });

  // More components button → toggle picker
  document.getElementById('more-comps-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    toggleComponentPicker();
  });

  document.getElementById('library-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    closeComponentPicker();
    if (typeof ensureLibraryModalBuilt === 'function') ensureLibraryModalBuilt();
    document.getElementById('library-modal').style.display = 'flex';
  });

  document.getElementById('library-close-btn').addEventListener('click', function() {
    document.getElementById('library-modal').style.display = 'none';
  });

  // Component picker items (for legacy + More Components dropdown)
  document.querySelectorAll('.picker-item').forEach(function(item) {
    item.addEventListener('click', function() {
      activateComponent(item.dataset.type);
      closeComponentPicker();
    });
  });

  // Close picker on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#component-picker') && !e.target.closest('#more-comps-btn') && !e.target.closest('#library-btn')) {
      closeComponentPicker();
    }
    if (!e.target.closest('#export-wrapper')) {
      document.getElementById('export-dropdown').classList.add('hidden');
    }
  });

  // Undo / Redo (top right)
  document.getElementById('undo-btn').addEventListener('click', undo);
  document.getElementById('redo-btn').addEventListener('click', redo);

  // Undo / Redo (bottom bar)
  document.getElementById('bottom-undo-btn').addEventListener('click', undo);
  document.getElementById('bottom-redo-btn').addEventListener('click', redo);

  // Zoom buttons
  document.getElementById('zoom-in-btn').addEventListener('click', function() { zoomBy(1.15); });
  document.getElementById('zoom-out-btn').addEventListener('click', function() { zoomBy(0.85); });

  // Reset
  document.getElementById('reset-btn').addEventListener('click', openResetModal);

  // Export
  var exportBtn = document.getElementById('export-btn');
  var exportDropdown = document.getElementById('export-dropdown');
  exportBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    exportDropdown.classList.toggle('hidden');
  });
  exportDropdown.querySelectorAll('button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var format = btn.dataset.format;
      switch (format) {
        case 'png':             exportPNG();  break;
        case 'png-transparent': exportTransparentPNG(); break;
        case 'jpg':             exportJPG();  break;
        case 'a4':              openExportModal(); break;
        case 'pdf':             exportPDF();  break;
        case 'preview':         togglePrintPreview(); break;
        case 'json':            exportJSON(); break;
        case 'load':            importJSON(); break;
      }
      exportDropdown.classList.add('hidden');
    });
  });

  // File import
  document.getElementById('import-input').addEventListener('change', handleImportFile);

  // Modal bindings
  initModalBindings();

  // Export modal bindings
  initExportModalBindings();

  // Initial UI render
  updateBottomBar();
  updateContextPanel();
}

/* ========================================
   TOOLBAR HIGHLIGHTS
   ======================================== */

function updateToolHighlight(tool) {
  // Clear all active states in toolbar
  document.querySelectorAll('#top-toolbar .tb-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });

  // Clear all active states in component picker
  document.querySelectorAll('.picker-item').forEach(function(p) {
    p.classList.remove('active');
  });

  // Activate the matching tool button
  var toolBtn = document.querySelector('#top-toolbar .tb-btn[data-tool="' + tool + '"]');
  if (toolBtn) toolBtn.classList.add('active');
}

function activateComponent(type) {
  // Clean up any in-progress actions
  cancelWireDrawing();
  state.tool = 'place';
  state.placingComponent = type;
  state.isDragging = false;
  state.dragStart = null;
  state.dragWirePoint = null;
  state.selectAllActive = false;

  // Highlight in toolbar
  document.querySelectorAll('#top-toolbar .tb-btn').forEach(function(b) { b.classList.remove('active'); });
  var compBtn = document.querySelector('#top-toolbar .tb-btn[data-comp="' + type + '"]');
  if (compBtn) compBtn.classList.add('active');

  // Highlight in picker
  document.querySelectorAll('.picker-item').forEach(function(p) {
    p.classList.toggle('active', p.dataset.type === type);
  });

  markDirty();
}

/* ========================================
   COMPONENT PICKER
   ======================================== */

function toggleComponentPicker() {
  var picker = document.getElementById('component-picker');
  picker.classList.toggle('open');
}

function closeComponentPicker() {
  document.getElementById('component-picker').classList.remove('open');
}

/* ========================================
   CONTEXT PANEL (LEFT FLOATING)
   ======================================== */

var _lastContextId = null;

function updateContextPanel() {
  var panel = document.getElementById('context-panel');

  if (!state.selected) {
    if (panel.classList.contains('open')) {
      panel.classList.remove('open');
      _lastContextId = null;
    }
    return;
  }

  // Don't rebuild if same selection
  if (_lastContextId === state.selected.id) return;
  _lastContextId = state.selected.id;

  if (state.selected.type === 'component') {
    var comp = state.components.find(function(c) { return c.id === state.selected.id; });
    if (!comp) return;
    buildComponentContext(panel, comp);
  } else if (state.selected.type === 'text') {
    var txt = state.texts.find(function(t) { return t.id === state.selected.id; });
    if (!txt) return;
    buildTextContext(panel, txt);
  } else if (state.selected.type === 'wire') {
    buildWireContext(panel);
  }

  panel.classList.add('open');
}

function buildComponentContext(panel, comp) {
  var def = COMPONENT_DEFS[comp.type];
  var genDef = (typeof GENERATED_COMPONENT_DEFS !== 'undefined') ? GENERATED_COMPONENT_DEFS[comp.type] : null;
  var unitInfo = COMPONENT_UNITS[comp.type] || {};

  // Resolve display info from legacy def OR generated def
  var iconText, nameText, categoryText;
  if (def) {
    iconText = def.icon || def.abbrev;
    nameText = def.name;
    categoryText = unitInfo.category || '';
  } else if (genDef) {
    iconText = genDef.displayName ? genDef.displayName.substring(0, 2).toUpperCase() : '⚡';
    nameText = genDef.displayName || comp.type;
    categoryText = (genDef.category || 'Component') + ' • ' + (genDef.pins ? genDef.pins.length : 0) + ' pins';
  } else {
    iconText = '?';
    nameText = comp.type;
    categoryText = 'Unknown';
  }

  var html = '';
  html += '<div class="ctx-comp-header">';
  html += '  <div class="ctx-comp-icon">' + escapeHTML(iconText) + '</div>';
  html += '  <div>';
  html += '    <div class="ctx-comp-name">' + escapeHTML(nameText) + '</div>';
  html += '    <div class="ctx-comp-type">' + escapeHTML(categoryText) + '</div>';
  html += '  </div>';
  html += '</div>';

  // Value section
  html += '<div class="ctx-section">';
  html += '  <div class="ctx-label">Value</div>';
  html += '  <div class="ctx-row">';
  html += '    <input class="ctx-input" id="ctx-value-input" value="' + escapeHTML(comp.value || '') + '" placeholder="e.g. ' + escapeHTML((unitInfo.examples && unitInfo.examples[0]) || (genDef ? 'U1' : '')) + '">';
  html += '  </div>';

  if (unitInfo.examples && unitInfo.examples.length > 0) {
    html += '  <div class="ctx-chips">';
    unitInfo.examples.forEach(function(ex) {
      html += '<button class="ctx-chip" data-val="' + escapeHTML(ex) + '">' + escapeHTML(ex) + '</button>';
    });
    html += '  </div>';
  }
  if (unitInfo.guide) {
    html += '  <div class="ctx-hint">' + escapeHTML(unitInfo.guide) + '</div>';
  } else if (genDef) {
    html += '  <div class="ctx-hint">Enter a custom label for this component</div>';
  }
  html += '</div>';

  // Actions
  html += '<div class="ctx-divider"></div>';
  html += '<div class="ctx-section">';
  html += '  <div class="ctx-label">Actions</div>';
  html += '  <div class="ctx-row">';
  html += '    <button class="ctx-btn" id="ctx-rotate" title="Rotate">↻</button>';
  html += '    <button class="ctx-btn danger" id="ctx-delete" title="Delete">🗑</button>';
  html += '  </div>';
  html += '</div>';

  panel.innerHTML = html;

  // Bind value input
  var valInput = document.getElementById('ctx-value-input');
  valInput.addEventListener('change', function() {
    saveSnapshot();
    comp.value = valInput.value;
    saveToLocalStorage();
    markDirty();
  });
  valInput.addEventListener('keydown', function(e) {
    e.stopPropagation(); // prevent tool shortcuts
    if (e.key === 'Enter') valInput.blur();
  });

  // Bind chips
  panel.querySelectorAll('.ctx-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      valInput.value = chip.dataset.val;
      saveSnapshot();
      comp.value = chip.dataset.val;
      saveToLocalStorage();
      markDirty();
    });
  });

  // Bind actions
  document.getElementById('ctx-rotate').addEventListener('click', function() {
    rotateSelected();
    _lastContextId = null; // force rebuild
  });
  document.getElementById('ctx-delete').addEventListener('click', deleteSelected);
}

function buildTextContext(panel, txt) {
  var html = '';
  html += '<div class="ctx-comp-header">';
  html += '  <div class="ctx-comp-icon">T</div>';
  html += '  <div>';
  html += '    <div class="ctx-comp-name">Text Annotation</div>';
  html += '    <div class="ctx-comp-type">Label</div>';
  html += '  </div>';
  html += '</div>';

  html += '<div class="ctx-section">';
  html += '  <div class="ctx-label">Content</div>';
  html += '  <input class="ctx-input" id="ctx-text-input" value="' + escapeHTML(txt.text || '') + '">';
  html += '</div>';

  html += '<div class="ctx-section">';
  html += '  <div class="ctx-label">Style</div>';
  html += '  <div class="ctx-row">';
  html += '    <button class="ctx-btn' + (txt.bold ? ' active' : '') + '" id="ctx-bold" title="Bold">B</button>';
  html += '    <span style="font-size:11px; color:var(--text-muted); padding:0 4px;">' + txt.fontSize + 'px</span>';
  html += '  </div>';
  html += '</div>';

  html += '<div class="ctx-divider"></div>';
  html += '<div class="ctx-row">';
  html += '  <button class="ctx-btn danger" id="ctx-delete" title="Delete">🗑</button>';
  html += '</div>';

  panel.innerHTML = html;

  var textInput = document.getElementById('ctx-text-input');
  textInput.addEventListener('change', function() {
    if (textInput.value.trim()) {
      saveSnapshot();
      txt.text = textInput.value.trim();
      saveToLocalStorage();
      markDirty();
    }
  });
  textInput.addEventListener('keydown', function(e) {
    e.stopPropagation();
    if (e.key === 'Enter') textInput.blur();
  });

  document.getElementById('ctx-bold').addEventListener('click', function() {
    toggleBoldSelected();
    _lastContextId = null;
  });
  document.getElementById('ctx-delete').addEventListener('click', deleteSelected);
}

function buildWireContext(panel) {
  var wire = state.wires.find(function(w) { return w.id === state.selected.id; });
  var pointCount = wire && wire.points ? wire.points.length : 2;
  var segmentCount = Math.max(1, pointCount - 1);

  var html = '';
  html += '<div class="ctx-comp-header">';
  html += '  <div class="ctx-comp-icon">╱</div>';
  html += '  <div>';
  html += '    <div class="ctx-comp-name">Wire</div>';
  html += '    <div class="ctx-comp-type">' + segmentCount + ' segment' + (segmentCount > 1 ? 's' : '') + ', ' + pointCount + ' points</div>';
  html += '  </div>';
  html += '</div>';

  html += '<div class="ctx-hint" style="margin-bottom:10px;">Double-click a segment to add a bend point. Drag points to reshape.</div>';

  html += '<div class="ctx-row">';
  html += '  <button class="ctx-btn danger" id="ctx-delete" title="Delete">🗑</button>';
  html += '</div>';

  panel.innerHTML = html;
  document.getElementById('ctx-delete').addEventListener('click', deleteSelected);
}

/* ========================================
   ZOOM HELPERS
   ======================================== */

function zoomBy(factor) {
  var cx = canvas.width / 2;
  var cy = canvas.height / 2;
  var worldPos = screenToWorld(cx, cy);
  var newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom * factor));
  state.offset.x = cx - worldPos.x * newZoom;
  state.offset.y = cy - worldPos.y * newZoom;
  state.zoom = newZoom;
  markDirty();
}

/* --- Update Bottom Bar --- */

function updateBottomBar() {
  var zoomEl = document.getElementById('zoom-display');
  var compEl = document.getElementById('component-count');
  var wireEl = document.getElementById('wire-count');

  if (zoomEl) zoomEl.textContent = Math.round(state.zoom * 100) + '%';
  if (compEl) compEl.textContent = state.components.length + ' components';
  if (wireEl) wireEl.textContent = state.wires.length + ' wires';
}

/* ========================================
   MODAL SYSTEM
   ======================================== */

var _modalCallbacks = {};

function initModalBindings() {
  // Value Edit Modal
  document.getElementById('modal-value-save').addEventListener('click', function() {
    var input = document.getElementById('modal-value-input');
    if (_modalCallbacks.valueSave) {
      _modalCallbacks.valueSave(input.value);
    }
    closeModal('modal-value-edit');
  });

  document.getElementById('modal-value-cancel').addEventListener('click', function() {
    closeModal('modal-value-edit');
  });

  document.getElementById('modal-value-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('modal-value-save').click();
    if (e.key === 'Escape') closeModal('modal-value-edit');
  });

  // Text Edit Modal
  document.getElementById('modal-text-save').addEventListener('click', function() {
    var input = document.getElementById('modal-text-input');
    if (_modalCallbacks.textSave) {
      _modalCallbacks.textSave(input.value.trim());
    }
    closeModal('modal-text-edit');
  });

  document.getElementById('modal-text-cancel').addEventListener('click', function() {
    closeModal('modal-text-edit');
  });

  document.getElementById('modal-text-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('modal-text-save').click();
    if (e.key === 'Escape') closeModal('modal-text-edit');
  });

  // Symbol buttons → insert at cursor position
  document.querySelectorAll('.symbol-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var symbol = btn.dataset.symbol;
      insertAtCursor('modal-text-input', symbol);
    });
  });

  // Template buttons → append to input
  document.querySelectorAll('.symbol-template-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var template = btn.dataset.template;
      var input = document.getElementById('modal-text-input');
      if (input.value.length > 0 && !input.value.endsWith(' ')) {
        input.value += ' ';
      }
      input.value += template;
      input.focus();
    });
  });

  // Reset Modal
  document.getElementById('modal-reset-confirm').addEventListener('click', function() {
    resetState();
    closeModal('modal-reset');
  });

  document.getElementById('modal-reset-cancel').addEventListener('click', function() {
    closeModal('modal-reset');
  });

  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function openModal(id) {
  var overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.offsetHeight; // reflow
  overlay.classList.add('active');
}

function closeModal(id) {
  var overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('active');
  setTimeout(function() { overlay.classList.add('hidden'); }, 120);
  _modalCallbacks = {};
}

/* --- Value Edit Modal --- */

function openValueEditModal(comp) {
  var def = COMPONENT_DEFS[comp.type];
  var genDef = typeof GENERATED_COMPONENT_DEFS !== 'undefined' ? GENERATED_COMPONENT_DEFS[comp.type] : null;
  var unitInfo = COMPONENT_UNITS[comp.type] || {};

  var iconEl = document.getElementById('modal-comp-icon');
  var nameEl = document.getElementById('modal-comp-name');
  var typeEl = document.getElementById('modal-comp-type');

  if (def) {
    // Legacy component
    iconEl.textContent = def.icon || def.abbrev;
    nameEl.textContent = def.name;
    typeEl.textContent = unitInfo.category || 'Component';
  } else if (genDef) {
    // Generated component
    iconEl.textContent = genDef.displayName ? genDef.displayName.substring(0, 2).toUpperCase() : '⚡';
    nameEl.textContent = genDef.displayName || comp.type;
    typeEl.textContent = (genDef.category || 'Generated') + ' • ' + (genDef.pins ? genDef.pins.length : 0) + ' pins';
  } else {
    iconEl.textContent = '?';
    nameEl.textContent = comp.type;
    typeEl.textContent = 'Unknown Component';
  }

  var input = document.getElementById('modal-value-input');
  input.value = comp.value || '';

  if (def && unitInfo.examples) {
    input.placeholder = 'e.g. ' + unitInfo.examples[0];
  } else if (genDef) {
    input.placeholder = 'Custom label (e.g. U1, IC2)';
  } else {
    input.placeholder = 'value';
  }

  var chipsContainer = document.getElementById('modal-unit-chips');
  chipsContainer.innerHTML = '';

  if (unitInfo.examples) {
    unitInfo.examples.forEach(function(example) {
      var chip = document.createElement('button');
      chip.className = 'unit-chip';
      chip.textContent = example;
      chip.addEventListener('click', function() {
        input.value = example;
        input.focus();
      });
      chipsContainer.appendChild(chip);
    });
  }

  // For generated components: add Show/Hide toggles
  if (genDef) {
    // 1. Pin Labels Toggle
    var pinToggle = document.createElement('button');
    pinToggle.className = 'unit-chip';
    var pinHidden = comp.showPinLabels === false;
    pinToggle.textContent = pinHidden ? '👁 Show Pin Details' : '🚫 Hide Pin Details';
    pinToggle.style.background = pinHidden ? '#2d5a2d' : '#5a2d2d';
    pinToggle.addEventListener('click', function() {
      saveSnapshot();
      comp.showPinLabels = pinHidden ? true : false;
      pinHidden = !pinHidden;
      pinToggle.textContent = pinHidden ? '👁 Show Pin Details' : '🚫 Hide Pin Details';
      pinToggle.style.background = pinHidden ? '#2d5a2d' : '#5a2d2d';
      saveToLocalStorage();
      markDirty();
    });
    chipsContainer.appendChild(pinToggle);

    // 2. Component Name Toggle
    var nameToggle = document.createElement('button');
    nameToggle.className = 'unit-chip';
    var nameHidden = comp.showComponentName === false;
    nameToggle.textContent = nameHidden ? '👁 Show Comp Name' : '🚫 Hide Comp Name';
    nameToggle.style.background = nameHidden ? '#2d5a2d' : '#5a2d2d';
    nameToggle.addEventListener('click', function() {
      saveSnapshot();
      comp.showComponentName = nameHidden ? true : false;
      nameHidden = !nameHidden;
      nameToggle.textContent = nameHidden ? '👁 Show Comp Name' : '🚫 Hide Comp Name';
      nameToggle.style.background = nameHidden ? '#2d5a2d' : '#5a2d2d';
      saveToLocalStorage();
      markDirty();
    });
    chipsContainer.appendChild(nameToggle);
  }

  var guideEl = document.getElementById('modal-si-guide');
  if (unitInfo.guide) {
    guideEl.textContent = unitInfo.guide;
    guideEl.style.display = '';
  } else if (genDef) {
    guideEl.textContent = 'Enter a custom label for this component. Leave blank to use the default name.';
    guideEl.style.display = '';
  } else {
    guideEl.style.display = 'none';
  }

  _modalCallbacks.valueSave = function(value) {
    saveSnapshot();
    comp.value = value;
    saveToLocalStorage();
    markDirty();
    _lastContextId = null; // force context panel update
  };

  openModal('modal-value-edit');
  setTimeout(function() { input.focus(); input.select(); }, 100);
}

/* --- Text Edit Modal --- */

function openTextEditModal(textObj, isNew, createCallback) {
  var titleEl = document.getElementById('modal-text-title');
  var input = document.getElementById('modal-text-input');

  if (isNew) {
    titleEl.textContent = 'Add Text Annotation';
    input.value = '';
    input.placeholder = 'Enter text...';
    _modalCallbacks.textSave = function(text) {
      if (text && createCallback) createCallback(text);
    };
  } else {
    titleEl.textContent = 'Edit Text';
    input.value = textObj ? textObj.text : '';
    input.placeholder = 'Edit text...';
    _modalCallbacks.textSave = function(text) {
      if (text && textObj) {
        saveSnapshot();
        textObj.text = text;
        saveToLocalStorage();
        markDirty();
        _lastContextId = null;
      }
    };
  }

  openModal('modal-text-edit');
  setTimeout(function() { input.focus(); input.select(); }, 100);
}

/* --- Reset Modal --- */

function openResetModal() {
  openModal('modal-reset');
}

/* ========================================
   EXPORT SETTINGS MODAL
   ======================================== */

function initExportModalBindings() {
  // Cancel
  document.getElementById('modal-export-cancel').addEventListener('click', function() {
    closeModal('modal-export');
  });

  // Confirm → run export
  document.getElementById('modal-export-confirm').addEventListener('click', function() {
    var settings = getExportSettings();
    var formatEl = document.querySelector('input[name="export-a4-format"]:checked');
    var format = formatEl ? formatEl.value : 'png';
    closeModal('modal-export');
    setTimeout(function() {
      exportA4(format, settings);
    }, 150);
  });

  // Scale mode → enable/disable custom slider
  var scaleRadios = document.querySelectorAll('input[name="export-scale"]');
  var slider = document.getElementById('export-custom-scale');
  var sliderLabel = document.getElementById('export-custom-label');

  scaleRadios.forEach(function(radio) {
    radio.addEventListener('change', function() {
      if (radio.value === 'custom') {
        slider.disabled = false;
      } else {
        slider.disabled = true;
      }
    });
  });

  // Slider value label
  if (slider) {
    slider.addEventListener('input', function() {
      if (sliderLabel) sliderLabel.textContent = slider.value + '%';
    });
  }

  // Close on overlay click
  var overlay = document.getElementById('modal-export');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal('modal-export');
    });
  }
}

function openExportModal() {
  openModal('modal-export');
}

/* ========================================
   SYMBOL INSERTION HELPER
   Inserts text at cursor position
   ======================================== */

function insertAtCursor(inputId, text) {
  var input = document.getElementById(inputId);
  if (!input) return;

  var start = input.selectionStart || 0;
  var end = input.selectionEnd || 0;
  var before = input.value.substring(0, start);
  var after = input.value.substring(end);

  input.value = before + text + after;

  // Set cursor position after inserted text
  var newPos = start + text.length;
  input.focus();
  input.setSelectionRange(newPos, newPos);
}

/* ========================================
   LIBRARY MODAL LOGIC
   ======================================== */

window.buildLibraryModal = function(bundle) {
  var grid = document.getElementById('library-grid');
  var searchInput = document.getElementById('library-search');
  var categorySelect = document.getElementById('library-category-filter');
  if (!grid || !searchInput || !categorySelect) return;

  var components = bundle.components;

  // PDF-ordered category list (exact order from CircuitCrafter_Component_Library.pdf)
  var PDF_CATEGORY_ORDER = [
    'Passive Components',
    'Diodes & Rectifiers',
    'Bipolar Transistors (BJT)',
    'Field-Effect Transistors (FET)',
    'Thyristors & Power Semiconductors',
    'Op-Amps & Comparators',
    'Logic Gates & Combinational ICs',
    'Sequential Logic & Flip-Flops',
    'Timers & Oscillators',
    'Analog ICs & Regulators',
    'Microcontrollers & Processors',
    'Memory ICs',
    'Interface & Communication ICs',
    'Sensors & Transducers',
    'Displays & Indicators',
    'Actuators & Electromechanical',
    'Switches Relays & Push-buttons',
    'Power Sources & Batteries',
    'Connectors & Terminals',
    'Protection & Conditioning',
    'RF Antenna & Wireless',
    'Filters & Signal Processing',
    'Power Electronics & Drives',
    'Measurement & Test Instruments',
    'Electroacoustic & Audio',
    'Optoelectronics & Photonics',
    'MEMS Emerging & Nanotechnology',
    'High Voltage & Electrical Power',
    'Development Boards'
  ];

  // Merge orphan categories into their parent
  var CATEGORY_MERGE = {
    'Passives': 'Passive Components',
    'Sensors': 'Sensors & Transducers',
    'ICs': 'Microcontrollers & Processors'
  };

  // Normalize component categories
  components.forEach(function(c) {
    if (CATEGORY_MERGE[c.category]) {
      c.category = CATEGORY_MERGE[c.category];
    }
  });

  // Build category map
  var categoryMap = {};
  components.forEach(function(c) {
    var cat = c.category || 'Uncategorized';
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(c);
  });

  // Build ordered category list (PDF order first, then any remaining)
  var orderedCategories = [];
  PDF_CATEGORY_ORDER.forEach(function(cat) {
    if (categoryMap[cat]) orderedCategories.push(cat);
  });
  Object.keys(categoryMap).forEach(function(cat) {
    if (orderedCategories.indexOf(cat) === -1) orderedCategories.push(cat);
  });

  // Populate category dropdown
  categorySelect.innerHTML = '<option value="all">All Categories (' + components.length + ')</option>';
  orderedCategories.forEach(function(cat) {
    var option = document.createElement('option');
    option.value = cat;
    option.textContent = cat + ' (' + categoryMap[cat].length + ')';
    categorySelect.appendChild(option);
  });

  // Category emoji map
  var CATEGORY_ICONS = {
    'Passive Components': '⚡', 'Diodes & Rectifiers': '▷', 'Bipolar Transistors (BJT)': '🔌',
    'Field-Effect Transistors (FET)': '🔌', 'Thyristors & Power Semiconductors': '⚡',
    'Op-Amps & Comparators': '△', 'Logic Gates & Combinational ICs': '🔲',
    'Sequential Logic & Flip-Flops': '🔁', 'Timers & Oscillators': '⏱',
    'Analog ICs & Regulators': '📉', 'Microcontrollers & Processors': '🖥',
    'Memory ICs': '💾', 'Interface & Communication ICs': '📡',
    'Sensors & Transducers': '🌡', 'Displays & Indicators': '📺',
    'Actuators & Electromechanical': '⚙', 'Switches Relays & Push-buttons': '🔘',
    'Power Sources & Batteries': '🔋', 'Connectors & Terminals': '🔗',
    'Protection & Conditioning': '🛡', 'RF Antenna & Wireless': '📶',
    'Filters & Signal Processing': '🎛', 'Power Electronics & Drives': '⚡',
    'Measurement & Test Instruments': '📊', 'Electroacoustic & Audio': '🔊',
    'Optoelectronics & Photonics': '💡', 'MEMS Emerging & Nanotechnology': '🔬',
    'High Voltage & Electrical Power': '🏭', 'Development Boards': '🧩'
  };

  // Track collapsed state
  var collapsedState = {};

  function renderComponents() {
    var filterText = searchInput.value.toLowerCase().trim();
    var filterCat = categorySelect.value;

    grid.innerHTML = '';
    grid.style.display = 'block'; // Switch from grid to block for sections

    var categoriesToShow = filterCat === 'all' ? orderedCategories : [filterCat];

    categoriesToShow.forEach(function(cat) {
      var catComponents = categoryMap[cat] || [];

      // Filter components by search
      var filtered = catComponents.filter(function(comp) {
        if (!filterText) return true;
        var searchable = (comp.id + ' ' + comp.displayName + ' ' + (comp.category || '')).toLowerCase();
        if (comp.keywords) searchable += ' ' + comp.keywords.join(' ');
        return searchable.indexOf(filterText) !== -1;
      });

      if (filtered.length === 0) return;

      // Auto-expand when searching
      if (filterText) collapsedState[cat] = false;

      // Category section header
      var section = document.createElement('div');
      section.style.marginBottom = '16px';

      var header = document.createElement('button');
      header.style.cssText = 'width:100%;display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--toolbar-bg);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-family:inherit;font-size:0.95em;font-weight:600;text-align:left;';
      var isCollapsed = collapsedState[cat] === true;
      var arrow = isCollapsed ? '▶' : '▼';
      var icon = CATEGORY_ICONS[cat] || '📦';
      header.innerHTML = '<span style="font-size:0.8em;transition:transform 0.2s">' + arrow + '</span> ' +
        '<span>' + icon + '</span> ' +
        '<span style="flex:1">' + cat + '</span>' +
        '<span style="color:var(--text-muted);font-weight:400;font-size:0.85em">' + filtered.length + ' component' + (filtered.length !== 1 ? 's' : '') + '</span>';

      header.addEventListener('click', function() {
        collapsedState[cat] = !collapsedState[cat];
        renderComponents();
      });

      section.appendChild(header);

      // Component grid (collapsible)
      if (!isCollapsed) {
        var compGrid = document.createElement('div');
        compGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;padding:8px 0 0 0;';

        filtered.forEach(function(comp) {
          var btn = document.createElement('button');
          btn.className = 'picker-item';
          btn.style.cssText = 'flex-direction:column;align-items:center;justify-content:center;padding:12px 8px;height:80px;';

          var iconSpan = document.createElement('span');
          iconSpan.className = 'picker-item-icon';
          iconSpan.style.cssText = 'font-size:1.3em;margin-bottom:6px;font-weight:bold;';
          iconSpan.textContent = comp.displayName.substring(0, 2).toUpperCase();

          var labelSpan = document.createElement('span');
          labelSpan.className = 'picker-item-label';
          labelSpan.style.cssText = 'text-align:center;white-space:normal;line-height:1.2;font-size:0.8em;overflow:hidden;max-height:2.4em;';
          labelSpan.textContent = comp.displayName;

          btn.appendChild(iconSpan);
          btn.appendChild(labelSpan);

          btn.addEventListener('click', function() {
            activateComponent(comp.id);
            document.getElementById('library-modal').style.display = 'none';
          });

          compGrid.appendChild(btn);
        });

        section.appendChild(compGrid);
      }

      grid.appendChild(section);
    });

    // Empty state
    if (grid.children.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);';
      empty.textContent = 'No components match "' + searchInput.value + '"';
      grid.appendChild(empty);
    }
  }

  // Bind events
  searchInput.addEventListener('input', renderComponents);
  categorySelect.addEventListener('change', renderComponents);

  // Initial render
  renderComponents();
};


/* ── js/app.js ── */
/* ========================================
   app.js — Bootstrap & event routing
   No tool keyboard shortcuts — screen only
   ======================================== */

var spacePressed = false;
var altPressed = false;

function init() {
  initCanvas();
  loadFromLocalStorage();
  initUI();

  // Load generated component library
  if (typeof loadGeneratedLibrary === 'function') {
    loadGeneratedLibrary();
  }

  // Canvas events
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('dblclick', handleDoubleClick);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  // Keyboard
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  // Save before unload
  window.addEventListener('beforeunload', function() {
    saveToLocalStorageNow();
  });

  // Start render
  markDirty();
  render();
}

/* ========================================
   Mouse Event Handlers
   ======================================== */

function handleMouseDown(e) {
  if (isModalOpen()) return;

  var rect = canvas.getBoundingClientRect();
  var sx = e.clientX - rect.left;
  var sy = e.clientY - rect.top;
  var world = screenToWorld(sx, sy);
  state.mouseWorld = world;

  // Pan: middle mouse or space + left
  if (e.button === 1 || (e.button === 0 && spacePressed)) {
    e.preventDefault();
    state.isPanning = true;
    state.panStart = { x: e.clientX, y: e.clientY, ox: state.offset.x, oy: state.offset.y };
    canvas.style.cursor = 'grabbing';
    return;
  }

  if (e.button !== 0) return;
  toolMouseDown(world, e);
}

function handleMouseMove(e) {
  var rect = canvas.getBoundingClientRect();
  var sx = e.clientX - rect.left;
  var sy = e.clientY - rect.top;
  var world = screenToWorld(sx, sy);
  state.mouseWorld = world;

  if (state.isPanning && state.panStart) {
    state.offset.x = state.panStart.ox + (e.clientX - state.panStart.x);
    state.offset.y = state.panStart.oy + (e.clientY - state.panStart.y);
    markDirty();
    return;
  }

  toolMouseMove(world, e);
  updateCursor(world);
  markDirty();
}

function handleMouseUp(e) {
  if (state.isPanning) {
    state.isPanning = false;
    state.panStart = null;
    updateCursor(state.mouseWorld);
    return;
  }

  var rect = canvas.getBoundingClientRect();
  var sx = e.clientX - rect.left;
  var sy = e.clientY - rect.top;
  var world = screenToWorld(sx, sy);
  toolMouseUp(world, e);
}

function handleDoubleClick(e) {
  if (isModalOpen()) return;

  var rect = canvas.getBoundingClientRect();
  var sx = e.clientX - rect.left;
  var sy = e.clientY - rect.top;
  var world = screenToWorld(sx, sy);
  toolDoubleClick(world, e);
}

/* ========================================
   Zoom / Trackpad
   ======================================== */

var _lastTrackpadTime = 0;

function isTrackpadEvent(e) {
  if (e.ctrlKey) return true;
  if (e.deltaMode === 0 && (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) % 1 !== 0)) return true;
  if (Math.abs(e.deltaX) > 2 && Math.abs(e.deltaY) > 2) return true;
  return false;
}

function handleWheel(e) {
  e.preventDefault();

  // Trackpad → auto switch to select
  if (isTrackpadEvent(e)) {
    var now = Date.now();
    if (state.tool !== 'select' && state.tool !== 'place' && (now - _lastTrackpadTime > 500)) {
      setTool('select');
    }
    _lastTrackpadTime = now;
  }

  // Text font resize
  if (state.tool === 'text' && state.selected && state.selected.type === 'text') {
    var txt = state.texts.find(function(t) { return t.id === state.selected.id; });
    if (txt) {
      saveSnapshot();
      var delta = e.deltaY > 0 ? -1 : 1;
      txt.fontSize = Math.max(10, Math.min(72, txt.fontSize + delta));
      saveToLocalStorage();
      markDirty();
      return;
    }
  }

  var rect = canvas.getBoundingClientRect();
  var mx = e.clientX - rect.left;
  var my = e.clientY - rect.top;

  // Pinch zoom (trackpad)
  if (e.ctrlKey) {
    var worldPos = screenToWorld(mx, my);
    var pinchFactor = 1 - e.deltaY * 0.01;
    var newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom * pinchFactor));
    state.offset.x = mx - worldPos.x * newZoom;
    state.offset.y = my - worldPos.y * newZoom;
    state.zoom = newZoom;
    markDirty();
    return;
  }

  // 2-finger pan (trackpad)
  if (isTrackpadEvent(e) && !e.ctrlKey) {
    state.offset.x -= e.deltaX;
    state.offset.y -= e.deltaY;
    markDirty();
    return;
  }

  // Mouse scroll = zoom
  var worldPos2 = screenToWorld(mx, my);
  var factor = e.deltaY > 0 ? 0.92 : 1.08;
  var nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom * factor));
  state.offset.x = mx - worldPos2.x * nz;
  state.offset.y = my - worldPos2.y * nz;
  state.zoom = nz;
  markDirty();
}

/* ========================================
   Keyboard — Functional only
   Enter: finish wire
   Alt: free angle mode
   Backspace/Delete: delete selected or wire point
   Escape, Undo, Redo, Space
   ======================================== */

function handleKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (isModalOpen()) {
    if (e.key === 'Escape') closeAllModals();
    return;
  }

  // Alt key → free angle mode for wire drawing
  if (e.key === 'Alt') {
    e.preventDefault();
    altPressed = true;
    state.wireOrthoMode = false;
    markDirty();
    return;
  }

  // Space for pan
  if (e.code === 'Space') {
    e.preventDefault();
    spacePressed = true;
    canvas.style.cursor = 'grab';
    return;
  }

  // Enter → finish wire
  if (e.key === 'Enter') {
    if (state.tool === 'wire' && state.wireStart && state.wireDrawingPoints.length >= 2) {
      e.preventDefault();
      var snap = getSmartSnap(state.mouseWorld);
      // Add final ortho points before finishing
      var lastPt = state.wireDrawingPoints[state.wireDrawingPoints.length - 1];
      if (state.wireOrthoMode) {
        var orthoPoints = getOrthoPreviewPoints(lastPt, snap.pos);
        for (var i = 0; i < orthoPoints.length; i++) {
          state.wireDrawingPoints.push({ x: orthoPoints[i].x, y: orthoPoints[i].y });
        }
      } else {
        state.wireDrawingPoints.push({ x: snap.pos.x, y: snap.pos.y });
      }
      finishWire(snap);
      return;
    }
  }

  // Undo: Ctrl/Cmd + Z
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
    return;
  }

  // Select All: Ctrl/Cmd + A
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    if (typeof selectAll === 'function') selectAll();
    return;
  }

  // Redo: Ctrl/Cmd + Shift + Z or Ctrl + Y
  if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || e.key === 'y')) {
    e.preventDefault();
    redo();
    return;
  }

  switch (e.key) {
    case 'Escape':
      cancelAction();
      break;
    case 'Delete':
    case 'Backspace':
      e.preventDefault();
      // If drawing wire, remove last point
      if (state.tool === 'wire' && state.wireDrawingPoints.length > 1) {
        state.wireDrawingPoints.pop();
        if (state.wireDrawingPoints.length === 0) {
          cancelWireDrawing();
        }
        markDirty();
      } else {
        deleteSelected();
      }
      break;
  }
}

function handleKeyUp(e) {
  if (e.code === 'Space') {
    spacePressed = false;
    updateCursor(state.mouseWorld);
  }

  if (e.key === 'Alt') {
    altPressed = false;
    state.wireOrthoMode = true;
    markDirty();
  }
}

/* ========================================
   Cursor Management
   ======================================== */

function updateCursor(world) {
  if (spacePressed) {
    canvas.style.cursor = 'grab';
    return;
  }

  switch (state.tool) {
    case 'select':
      var hovering = false;
      // Check wire points first
      for (var w = 0; w < state.wires.length; w++) {
        if (hitTestWirePoint(state.wires[w], world.x, world.y, 8) >= 0) {
          hovering = true;
          break;
        }
      }
      if (!hovering) {
        for (var i = 0; i < state.components.length; i++) {
          if (hitTestComponent(state.components[i], world.x, world.y)) {
            hovering = true;
            break;
          }
        }
      }
      if (!hovering) {
        for (var j = 0; j < state.texts.length; j++) {
          if (hitTestText(state.texts[j], world.x, world.y)) {
            hovering = true;
            break;
          }
        }
      }
      canvas.style.cursor = hovering ? 'move' : 'default';
      break;
    case 'wire':
      canvas.style.cursor = 'crosshair';
      break;
    case 'eraser':
      canvas.style.cursor = 'pointer';
      break;
    case 'text':
      canvas.style.cursor = 'text';
      break;
    case 'place':
      canvas.style.cursor = 'crosshair';
      break;
    default:
      canvas.style.cursor = 'default';
  }
}

/* ========================================
   Modal Helpers
   ======================================== */

function isModalOpen() {
  var modals = document.querySelectorAll('.modal-overlay');
  for (var i = 0; i < modals.length; i++) {
    if (!modals[i].classList.contains('hidden')) return true;
  }
  return false;
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(function(m) {
    m.classList.remove('active');
    setTimeout(function() { m.classList.add('hidden'); }, 120);
  });
}

/* --- Start --- */
document.addEventListener('DOMContentLoaded', init);

