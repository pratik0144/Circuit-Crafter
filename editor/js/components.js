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
    case 'vcvs':       drawDependentVoltageSource(ctx); break;
    case 'cccvs':      drawDependentVoltageSource(ctx); break;
    case 'vccs':       drawDependentCurrentSource(ctx); break;
    case 'cccs':       drawDependentCurrentSource(ctx); break;
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

  // Regular components: plain text label
  var label = comp.value || def.abbrev;
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#444';
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(label, labelX, labelY);
}
