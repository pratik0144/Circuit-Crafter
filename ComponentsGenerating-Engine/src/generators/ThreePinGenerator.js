/**
 * ThreePinGenerator.js — Generator for 3-pin components
 * 
 * Generates: LM35 (temp sensor), transistors (BJT/FET),
 * voltage regulators (78xx/79xx), etc.
 * All geometry is editable primitives.
 */

import {
  resetIds, createLine, createPolyline, createRect,
  createArc, createCircle, createText, createPin
} from '../primitives.js';

const SYMBOL_STYLES = {
  /**
   * Sensor — Rectangular body with 3 pins
   * Used for: LM35, LM335, DS18B20, etc.
   * Layout: left side VCC + GND, right side VOUT
   */
  sensor_rect: (meta) => {
    resetIds();
    const w = 80, h = 80;
    const pins = meta.pins || [
      { number: 1, name: 'VCC', side: 'left', electricalType: 'power' },
      { number: 2, name: 'VOUT', side: 'right', electricalType: 'output' },
      { number: 3, name: 'GND', side: 'left', electricalType: 'ground' }
    ];

    const leftPins = pins.filter(p => p.side === 'left');
    const rightPins = pins.filter(p => p.side === 'right');

    const generatedPins = [];
    let leftY = 20;
    for (const p of leftPins) {
      generatedPins.push(
        createPin(p.name, p.number, 'left', 0, leftY, { electricalType: p.electricalType })
      );
      leftY += 40;
    }

    let rightY = 40;
    for (const p of rightPins) {
      generatedPins.push(
        createPin(p.name, p.number, 'right', w, rightY, { electricalType: p.electricalType })
      );
      rightY += 40;
    }

    return {
      dimensions: { width: w, height: h },
      primitives: [
        createRect(0, 0, w, h, { id: 'body' }),
        createText(w / 2, h / 2, meta.displayName || 'Sensor', { id: 'label', fontSize: 10 })
      ],
      pins: generatedPins
    };
  },

  /**
   * NPN BJT transistor symbol
   * 3 pins: Base (left), Collector (top-right), Emitter (bottom-right)
   */
  npn_bjt: (meta) => {
    resetIds();
    const w = 80, h = 80;
    return {
      dimensions: { width: w, height: h },
      primitives: [
        // Base line (vertical)
        createLine(20, 20, 20, 60, { id: 'base_line', strokeWidth: 3 }),
        // Base lead
        createLine(0, 40, 20, 40, { id: 'base_lead' }),
        // Collector line
        createLine(20, 30, w, 0, { id: 'collector_line' }),
        // Emitter line
        createLine(20, 50, w, h, { id: 'emitter_line' }),
        // Emitter arrow
        createPolyline([[w - 8, h - 2], [w, h], [w - 4, h - 10]], { id: 'emitter_arrow', fill: 'currentColor' }),
        createText(40, 40, meta.displayName || 'NPN', { id: 'label', fontSize: 9 })
      ],
      pins: [
        createPin('B', 1, 'left', 0, 40, { electricalType: 'input', length: 0 }),
        createPin('C', 2, 'right', w, 0, { electricalType: 'output', length: 0 }),
        createPin('E', 3, 'right', w, h, { electricalType: 'output', length: 0 })
      ]
    };
  },

  /**
   * Voltage regulator — Rectangular body (78xx/79xx style)
   * 3 pins: IN (left), OUT (right), GND (bottom)
   */
  regulator: (meta) => {
    resetIds();
    const w = 80, h = 40;
    const pins = meta.pins || [
      { number: 1, name: 'IN', side: 'left', electricalType: 'power' },
      { number: 2, name: 'GND', side: 'bottom', electricalType: 'ground' },
      { number: 3, name: 'OUT', side: 'right', electricalType: 'output' }
    ];

    const generatedPins = [];
    for (const p of pins) {
      let x, y;
      if (p.side === 'left') { x = 0; y = 20; }
      else if (p.side === 'right') { x = w; y = 20; }
      else if (p.side === 'bottom') { x = w / 2; y = h; }
      else { x = w / 2; y = 0; }

      // Snap to grid
      x = Math.round(x / 20) * 20;
      y = Math.round(y / 20) * 20;

      generatedPins.push(
        createPin(p.name, p.number, p.side, x, y, { electricalType: p.electricalType })
      );
    }

    return {
      dimensions: { width: w, height: h },
      primitives: [
        createRect(0, 0, w, h, { id: 'body' }),
        createText(w / 2, h / 2, meta.displayName || 'REG', { id: 'label', fontSize: 10 })
      ],
      pins: generatedPins
    };
  }
};

/**
 * Generate a 3-pin component from metadata.
 */
export function generate(meta) {
  const style = meta.symbolStyle || 'sensor_rect';
  const generator = SYMBOL_STYLES[style];

  if (!generator) {
    throw new Error(`ThreePinGenerator: unknown symbolStyle "${style}". Available: ${Object.keys(SYMBOL_STYLES).join(', ')}`);
  }

  const result = generator(meta);

  return {
    id: meta.id,
    category: meta.category || 'Sensors',
    displayName: meta.displayName || meta.id,
    dimensions: result.dimensions,
    defaultRotation: meta.defaultRotation || 0,
    primitives: result.primitives,
    pins: result.pins
  };
}
