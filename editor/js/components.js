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
