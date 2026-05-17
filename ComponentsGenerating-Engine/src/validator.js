/**
 * validator.js — Validation Pipeline
 * 
 * Validates generated component scene graphs before export.
 * Checks per CompEngine.md §7:
 * - Unique component IDs
 * - Unique pin IDs within component
 * - Grid compliance (pin Y values multiples of 20)
 * - Bounds checking (pins within dimensions)
 * - Side-geometry match
 * - Primitive validity
 */

const GRID_SIZE = 20;

/**
 * Validate a single generated component.
 * @param {object} component — Generated component object
 * @param {Set} globalIds — Set of all component IDs already seen (for global uniqueness)
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateComponent(component, globalIds = new Set()) {
  const errors = [];
  const warnings = [];

  // ── Required fields ──
  if (!component.id) errors.push('Missing component id');
  if (!component.category) errors.push('Missing category');
  if (!component.displayName) errors.push('Missing displayName');
  if (!component.dimensions) errors.push('Missing dimensions');
  if (!component.pins || !Array.isArray(component.pins)) errors.push('Missing or invalid pins array');
  if (!component.primitives || !Array.isArray(component.primitives)) errors.push('Missing or invalid primitives array');

  if (errors.length > 0) return { valid: false, errors, warnings };

  const { width, height } = component.dimensions;

  // ── Global ID uniqueness ──
  if (globalIds.has(component.id)) {
    errors.push(`Duplicate component id: "${component.id}"`);
  }

  // ── Dimensions grid alignment ──
  if (width % GRID_SIZE !== 0) {
    warnings.push(`Width ${width} is not a multiple of ${GRID_SIZE}`);
  }
  if (height % GRID_SIZE !== 0) {
    warnings.push(`Height ${height} is not a multiple of ${GRID_SIZE}`);
  }

  // ── Pin validation ──
  const pinIds = new Set();
  const pinNumbers = new Set();

  for (const pin of component.pins) {
    // Pin ID uniqueness
    if (pinIds.has(pin.id)) {
      errors.push(`Duplicate pin id: "${pin.id}" in component "${component.id}"`);
    }
    pinIds.add(pin.id);

    // Pin number uniqueness
    if (pinNumbers.has(pin.number)) {
      errors.push(`Duplicate pin number: ${pin.number} in component "${component.id}"`);
    }
    pinNumbers.add(pin.number);

    // Required pin fields
    if (!pin.name) errors.push(`Pin ${pin.id}: missing name`);
    if (!pin.side) errors.push(`Pin ${pin.id}: missing side`);
    if (!pin.position) errors.push(`Pin ${pin.id}: missing position`);

    if (!pin.position) continue;

    const { x, y } = pin.position;

    // Grid compliance for pin Y
    if (pin.side === 'left' || pin.side === 'right') {
      if (y % GRID_SIZE !== 0) {
        errors.push(`Pin "${pin.name}" (${pin.id}): y=${y} is not a multiple of ${GRID_SIZE}`);
      }
    }

    // Grid compliance for pin X (top/bottom pins)
    if (pin.side === 'top' || pin.side === 'bottom') {
      if (x % GRID_SIZE !== 0) {
        errors.push(`Pin "${pin.name}" (${pin.id}): x=${x} is not a multiple of ${GRID_SIZE}`);
      }
    }

    // Bounds checking
    if (x < 0 || x > width) {
      errors.push(`Pin "${pin.name}" (${pin.id}): x=${x} out of bounds [0, ${width}]`);
    }
    if (y < 0 || y > height) {
      errors.push(`Pin "${pin.name}" (${pin.id}): y=${y} out of bounds [0, ${height}]`);
    }

    // Side-geometry match
    if (pin.side === 'left' && x !== 0) {
      errors.push(`Pin "${pin.name}" (${pin.id}): side="left" but x=${x} (must be 0)`);
    }
    if (pin.side === 'right' && x !== width) {
      errors.push(`Pin "${pin.name}" (${pin.id}): side="right" but x=${x} (must be ${width})`);
    }
    if (pin.side === 'top' && y !== 0) {
      errors.push(`Pin "${pin.name}" (${pin.id}): side="top" but y=${y} (must be 0)`);
    }
    if (pin.side === 'bottom' && y !== height) {
      errors.push(`Pin "${pin.name}" (${pin.id}): side="bottom" but y=${y} (must be ${height})`);
    }
  }

  // ── Label overlap detection (same side, same Y) ──
  const sideYMap = {};
  for (const pin of component.pins) {
    if (!pin.position) continue;
    const key = `${pin.side}_${pin.position.y}`;
    if (sideYMap[key]) {
      warnings.push(`Potential label overlap: pins "${sideYMap[key]}" and "${pin.name}" share side="${pin.side}" y=${pin.position.y}`);
    }
    sideYMap[key] = pin.name;
  }

  // ── Primitive validation ──
  for (const prim of component.primitives) {
    if (!prim.id) errors.push('Primitive missing id');
    if (!prim.type) errors.push('Primitive missing type');

    const validTypes = ['line', 'polyline', 'rect', 'arc', 'circle', 'text', 'junction'];
    if (prim.type && !validTypes.includes(prim.type)) {
      errors.push(`Invalid primitive type: "${prim.type}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate an entire batch of components.
 */
export function validateBatch(components) {
  const globalIds = new Set();
  const results = [];

  for (const comp of components) {
    const result = validateComponent(comp, globalIds);
    result.componentId = comp.id;
    results.push(result);
    if (comp.id) globalIds.add(comp.id);
  }

  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  return {
    allValid: totalErrors === 0,
    totalErrors,
    totalWarnings,
    results
  };
}
