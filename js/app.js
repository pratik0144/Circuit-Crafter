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
