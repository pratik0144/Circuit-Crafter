/* ========================================
   tools.js — Tool handlers
   Select, Wire, Eraser, Text, Place
   ======================================== */

/* --- Tool Router --- */

function toolMouseDown(world, e) {
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
  state.selected = { type: 'component', id: comp.id };
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

function deleteSelected() {
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
  saveToLocalStorage();
  markDirty();
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
  if (state.tool === 'place') {
    setTool('select');
  }
  markDirty();
}
