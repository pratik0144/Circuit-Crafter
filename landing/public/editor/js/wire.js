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
  ctx.moveTo(wire.points[0].x, wire.points[0].y);
  for (var i = 1; i < wire.points.length; i++) {
    ctx.lineTo(wire.points[i].x, wire.points[i].y);
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
    ctx.moveTo(committedPoints[0].x, committedPoints[0].y);
    for (var i = 1; i < committedPoints.length; i++) {
      ctx.lineTo(committedPoints[i].x, committedPoints[i].y);
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
    ctx.moveTo(lastCommitted.x, lastCommitted.y);
    for (var k = 0; k < orthoPoints.length; k++) {
      ctx.lineTo(orthoPoints[k].x, orthoPoints[k].y);
    }
    ctx.stroke();
  } else {
    // Free angle
    ctx.beginPath();
    ctx.moveTo(lastCommitted.x, lastCommitted.y);
    ctx.lineTo(currentPos.x, currentPos.y);
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
