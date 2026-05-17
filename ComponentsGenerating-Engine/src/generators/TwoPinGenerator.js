/**
 * TwoPinGenerator.js — Generator for 2-pin passive components
 * 
 * Generates: Resistor, Capacitor, Inductor, Diode, LED, Fuse, etc.
 * Each component type has a unique set of editable primitives.
 * NO SVG pathData strings — everything is primitives.
 */

import {
  resetIds, createLine, createPolyline, createRect,
  createArc, createCircle, createText, createPin
} from '../primitives.js';

const SYMBOL_STYLES = {
  /**
   * Resistor — Zigzag pattern
   * Total width: 80, height: 40, signal line at y=20 (grid-aligned)
   * Pin1 at (0,20), Pin2 at (80,20)
   */
  zigzag: (meta) => {
    resetIds();
    const w = 80, h = 40, cy = 20;
    return {
      dimensions: { width: w, height: h },
      primitives: [
        createLine(0, cy, 15, cy, { id: 'lead_left' }),
        createPolyline([
          [15, cy], [20, cy - 10], [30, cy + 10], [40, cy - 10], [50, cy + 10], [60, cy - 10], [65, cy]
        ], { id: 'body_zigzag' }),
        createLine(65, cy, w, cy, { id: 'lead_right' }),
        createText(w / 2, cy - 16, meta.displayName || 'R', { id: 'label', fontSize: 10 })
      ],
      pins: [
        createPin(meta.pinNames?.[0] || '1', 1, 'left', 0, cy, { electricalType: 'passive', length: 0 }),
        createPin(meta.pinNames?.[1] || '2', 2, 'right', w, cy, { electricalType: 'passive', length: 0 })
      ]
    };
  },

  /**
   * Capacitor — Two parallel plates
   * Total width: 80, height: 40, signal line at y=20
   */
  capacitor: (meta) => {
    resetIds();
    const w = 80, h = 40, cy = 20;
    return {
      dimensions: { width: w, height: h },
      primitives: [
        createLine(0, cy, 34, cy, { id: 'lead_left' }),
        createLine(34, cy - 12, 34, cy + 12, { id: 'plate_left' }),
        createLine(46, cy - 12, 46, cy + 12, { id: 'plate_right' }),
        createLine(46, cy, w, cy, { id: 'lead_right' }),
        createText(w / 2, cy - 18, meta.displayName || 'C', { id: 'label', fontSize: 10 })
      ],
      pins: [
        createPin(meta.pinNames?.[0] || '1', 1, 'left', 0, cy, { electricalType: 'passive', length: 0 }),
        createPin(meta.pinNames?.[1] || '2', 2, 'right', w, cy, { electricalType: 'passive', length: 0 })
      ]
    };
  },

  /**
   * Inductor — 3 half-circle bumps
   * Total width: 80, height: 40, signal line at y=20
   */
  inductor: (meta) => {
    resetIds();
    const w = 80, h = 40, cy = 20;
    return {
      dimensions: { width: w, height: h },
      primitives: [
        createLine(0, cy, 20, cy, { id: 'lead_left' }),
        createArc(27, cy, 7, 180, 0, { id: 'coil_1' }),
        createArc(41, cy, 7, 180, 0, { id: 'coil_2' }),
        createArc(55, cy, 7, 180, 0, { id: 'coil_3' }),
        createLine(62, cy, w, cy, { id: 'lead_right' }),
        createText(w / 2, cy - 16, meta.displayName || 'L', { id: 'label', fontSize: 10 })
      ],
      pins: [
        createPin(meta.pinNames?.[0] || '1', 1, 'left', 0, cy, { electricalType: 'passive', length: 0 }),
        createPin(meta.pinNames?.[1] || '2', 2, 'right', w, cy, { electricalType: 'passive', length: 0 })
      ]
    };
  },

  /**
   * Diode — Triangle + Line
   * Total width: 80, height: 40, signal line at y=20
   */
  diode: (meta) => {
    resetIds();
    const w = 80, h = 40, cy = 20;
    return {
      dimensions: { width: w, height: h },
      primitives: [
        createLine(0, cy, 28, cy, { id: 'lead_left' }),
        createPolyline([[28, cy - 10], [28, cy + 10], [52, cy], [28, cy - 10]], { id: 'body_triangle', fill: 'none' }),
        createLine(52, cy - 10, 52, cy + 10, { id: 'cathode_bar' }),
        createLine(52, cy, w, cy, { id: 'lead_right' }),
        createText(w / 2, cy - 18, meta.displayName || 'D', { id: 'label', fontSize: 10 })
      ],
      pins: [
        createPin('A', 1, 'left', 0, cy, { electricalType: 'passive', length: 0 }),
        createPin('K', 2, 'right', w, cy, { electricalType: 'passive', length: 0 })
      ]
    };
  },

  /**
   * LED — Triangle + Line + Arrows
   * Total width: 80, height: 40, signal line at y=20
   */
  led: (meta) => {
    resetIds();
    const w = 80, h = 40, cy = 20;
    return {
      dimensions: { width: w, height: h },
      primitives: [
        createLine(0, cy, 28, cy, { id: 'lead_left' }),
        createPolyline([[28, cy - 10], [28, cy + 10], [52, cy], [28, cy - 10]], { id: 'body_triangle', fill: 'none' }),
        createLine(52, cy - 10, 52, cy + 10, { id: 'cathode_bar' }),
        createLine(52, cy, w, cy, { id: 'lead_right' }),
        createLine(46, cy - 8, 52, cy - 14, { id: 'arrow_1', strokeWidth: 1 }),
        createLine(42, cy - 10, 48, cy - 16, { id: 'arrow_2', strokeWidth: 1 }),
        createText(w / 2, cy - 20, meta.displayName || 'LED', { id: 'label', fontSize: 10 })
      ],
      pins: [
        createPin('A', 1, 'left', 0, cy, { electricalType: 'passive', length: 0 }),
        createPin('K', 2, 'right', w, cy, { electricalType: 'passive', length: 0 })
      ]
    };
  },

  /**
   * Fuse — S-curve in box
   * Total width: 80, height: 40, signal line at y=20
   */
  fuse: (meta) => {
    resetIds();
    const w = 80, h = 40, cy = 20;
    return {
      dimensions: { width: w, height: h },
      primitives: [
        createLine(0, cy, 25, cy, { id: 'lead_left' }),
        createRect(25, cy - 8, 30, 16, { id: 'body', strokeWidth: 1.5 }),
        createPolyline([[28, cy], [35, cy - 6], [45, cy + 6], [52, cy]], { id: 'fuse_wire', strokeWidth: 1.5 }),
        createLine(55, cy, w, cy, { id: 'lead_right' }),
        createText(w / 2, cy - 16, meta.displayName || 'F', { id: 'label', fontSize: 10 })
      ],
      pins: [
        createPin(meta.pinNames?.[0] || '1', 1, 'left', 0, cy, { electricalType: 'passive', length: 0 }),
        createPin(meta.pinNames?.[1] || '2', 2, 'right', w, cy, { electricalType: 'passive', length: 0 })
      ]
    };
  }
};

/**
 * Generate a 2-pin component from metadata.
 * @param {object} meta — Component metadata
 * @returns {object} — Complete component definition with primitives + pins
 */
export function generate(meta) {
  const style = meta.symbolStyle || 'zigzag';
  const generator = SYMBOL_STYLES[style];

  if (!generator) {
    throw new Error(`TwoPinGenerator: unknown symbolStyle "${style}". Available: ${Object.keys(SYMBOL_STYLES).join(', ')}`);
  }

  const result = generator(meta);

  return {
    id: meta.id,
    category: meta.category || 'Passives',
    displayName: meta.displayName || meta.id,
    dimensions: result.dimensions,
    defaultRotation: meta.defaultRotation || 0,
    primitives: result.primitives,
    pins: result.pins
  };
}
