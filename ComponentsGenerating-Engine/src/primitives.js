/**
 * primitives.js — Primitive Factory
 * 
 * Creates editable primitive objects for component scene graphs.
 * Every primitive has a unique ID and stays individually addressable.
 * These are the canonical source of truth — NOT SVG paths.
 * 
 * Primitive types: line, polyline, rect, arc, circle, text, pin, junction
 */

let _primIdCounter = 0;

function nextId(prefix) {
  return `${prefix}_${++_primIdCounter}`;
}

/** Reset ID counter (call before each component generation) */
export function resetIds() {
  _primIdCounter = 0;
}

// ─── Line ───────────────────────────────────────────────────────
export function createLine(x1, y1, x2, y2, opts = {}) {
  return {
    id: opts.id || nextId('line'),
    type: 'line',
    x1, y1, x2, y2,
    stroke: opts.stroke || 'currentColor',
    strokeWidth: opts.strokeWidth || 2,
    lineCap: opts.lineCap || 'round'
  };
}

// ─── Polyline ───────────────────────────────────────────────────
export function createPolyline(points, opts = {}) {
  return {
    id: opts.id || nextId('polyline'),
    type: 'polyline',
    points: points.map(p => [...p]),  // deep copy [[x,y], ...]
    stroke: opts.stroke || 'currentColor',
    strokeWidth: opts.strokeWidth || 2,
    fill: opts.fill || 'none',
    lineCap: opts.lineCap || 'round',
    lineJoin: opts.lineJoin || 'round'
  };
}

// ─── Rect ───────────────────────────────────────────────────────
export function createRect(x, y, width, height, opts = {}) {
  return {
    id: opts.id || nextId('rect'),
    type: 'rect',
    x, y, width, height,
    stroke: opts.stroke || 'currentColor',
    fill: opts.fill || 'none',
    strokeWidth: opts.strokeWidth || 2
  };
}

// ─── Arc ────────────────────────────────────────────────────────
export function createArc(cx, cy, radius, startAngle, endAngle, opts = {}) {
  return {
    id: opts.id || nextId('arc'),
    type: 'arc',
    cx, cy, radius,
    startAngle,    // degrees
    endAngle,      // degrees
    stroke: opts.stroke || 'currentColor',
    fill: opts.fill || 'none',
    strokeWidth: opts.strokeWidth || 1.5,
    anticlockwise: opts.anticlockwise || false
  };
}

// ─── Circle ─────────────────────────────────────────────────────
export function createCircle(cx, cy, radius, opts = {}) {
  return {
    id: opts.id || nextId('circle'),
    type: 'circle',
    cx, cy, radius,
    stroke: opts.stroke || 'currentColor',
    fill: opts.fill || 'none',
    strokeWidth: opts.strokeWidth || 2
  };
}

// ─── Text ───────────────────────────────────────────────────────
export function createText(x, y, content, opts = {}) {
  return {
    id: opts.id || nextId('text'),
    type: 'text',
    x, y,
    content: String(content),
    fontSize: opts.fontSize || 11,
    fontFamily: opts.fontFamily || 'sans-serif',
    align: opts.align || 'center',
    baseline: opts.baseline || 'middle',
    fill: opts.fill || 'currentColor'
  };
}

// ─── Pin ────────────────────────────────────────────────────────
export function createPin(name, number, side, posX, posY, opts = {}) {
  return {
    id: opts.id || `p${number}`,
    type: 'pin',
    name: String(name),
    number,
    side,               // 'left' | 'right' | 'top' | 'bottom'
    position: { x: posX, y: posY },
    electricalType: opts.electricalType || 'passive',
    length: opts.length !== undefined ? opts.length : 15,
    invert: opts.invert || false
  };
}

// ─── Junction ───────────────────────────────────────────────────
export function createJunction(x, y, opts = {}) {
  return {
    id: opts.id || nextId('junc'),
    type: 'junction',
    x, y,
    radius: opts.radius || 3
  };
}

/**
 * Detect active-low signal names.
 * Returns true if name contains /, _N, *, or leading /
 * e.g. "CS/", "/RESET", "WR_N", "OE*"
 */
export function isActiveLow(name) {
  if (!name) return false;
  const n = name.trim();
  if (n.startsWith('/') || n.endsWith('/')) return true;
  if (n.endsWith('_N') || n.endsWith('_n')) return true;
  if (n.endsWith('*')) return true;
  if (n.startsWith('~')) return true;
  // Check for overbar notation (common in datasheets)
  if (/^\\overline\{/.test(n)) return true;
  return false;
}

/**
 * Clean an active-low name for display.
 * Removes the active-low markers.
 */
export function cleanActiveLowName(name) {
  if (!name) return name;
  let n = name.trim();
  n = n.replace(/^\//, '').replace(/\/$/, '');
  n = n.replace(/_N$/i, '');
  n = n.replace(/\*$/, '');
  n = n.replace(/^~/, '');
  return n;
}
