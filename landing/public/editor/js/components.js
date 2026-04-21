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
  }
};

/* --- Create Component --- */

function createComponent(type, x, y) {
  var def = COMPONENT_DEFS[type];
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

/* --- Port Positions (World) --- */

function getComponentPorts(comp) {
  var def = COMPONENT_DEFS[comp.type];
  var angle = comp.rotation * Math.PI / 180;
  var cosA = Math.cos(angle);
  var sinA = Math.sin(angle);

  return def.ports.map(function(p) {
    return {
      x: comp.x + Math.round(p.x * cosA - p.y * sinA),
      y: comp.y + Math.round(p.x * sinA + p.y * cosA)
    };
  });
}

/* --- Bounds --- */

function getComponentBounds(comp) {
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

  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (comp.type) {
    case 'resistor':   drawResistor(ctx);      break;
    case 'capacitor':  drawCapacitor(ctx);     break;
    case 'inductor':   drawInductor(ctx);      break;
    case 'voltage':    drawVoltageSource(ctx); break;
    case 'current':    drawCurrentSource(ctx); break;
    case 'switch_comp':drawSwitch(ctx);        break;
    case 'lamp':       drawLamp(ctx);          break;
    case 'ground':     drawGround(ctx);        break;
  }

  // Port dots (small circles at endpoints)
  var def = COMPONENT_DEFS[comp.type];
  ctx.fillStyle = '#333';
  def.ports.forEach(function(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

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
   Component Label Drawing
   Labels NEVER rotate — always horizontal
   Position based on orientation
   ======================================== */

function drawComponentLabel(ctx, comp) {
  var def = COMPONENT_DEFS[comp.type];
  var label = comp.value ? comp.value : def.abbrev;

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

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#444';
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(label, labelX, labelY);
}
