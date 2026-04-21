/* ========================================
   canvas.js — Canvas setup, grid, render
   Optimized with dirty flag for 60fps
   ======================================== */

let canvas, ctx;
const GRID_SIZE = 20;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

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

  ctx.strokeStyle = '#e8e8e8';
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

  // White canvas background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
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

  ctx.restore();
}

/* --- Selection Highlight --- */

function drawSelectionHighlight(ctx) {
  if (!state.selected) return;

  ctx.strokeStyle = '#b5a3f7';
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
    ctx.fillStyle = '#b5a3f7';
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
        ctx.fillStyle = '#b5a3f7';
        ctx.beginPath();
        ctx.arc(port.x, port.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(181, 163, 247, 0.4)';
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

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2 / state.zoom;
  ctx.setLineDash([10 / state.zoom, 6 / state.zoom]);
  ctx.strokeRect(ox, oy, a4w, a4h);
  ctx.setLineDash([]);

  // "A4" label
  ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
  ctx.font = (12 / state.zoom) + 'px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('A4 Portrait (' + a4w + ' × ' + a4h + ')', ox + 6, oy + 4);
}

/* --- Text Drawing --- */

function drawText(ctx, textObj) {
  var fontStyle = textObj.bold ? 'bold ' : '';
  ctx.font = fontStyle + textObj.fontSize + 'px sans-serif';
  ctx.fillStyle = '#000000';
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
