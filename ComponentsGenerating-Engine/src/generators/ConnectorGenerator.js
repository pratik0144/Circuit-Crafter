/**
 * ConnectorGenerator.js — Generator for connectors, headers, terminals
 * 
 * Generates: pin headers, terminal blocks, connectors.
 * Single or dual sided pin layout.
 */

import {
  resetIds, createRect, createText, createPin
} from '../primitives.js';

const PIN_SPACING = 20;

/**
 * Generate a connector component from metadata.
 */
export function generate(meta) {
  resetIds();

  const pinCount = meta.pinCount || (meta.pins ? meta.pins.length : 2);
  const dualSided = meta.dualSided || false;

  let pins = [];
  let width, height;

  if (dualSided && meta.pins) {
    // Dual-sided (like 2-row headers)
    const leftPins = meta.pins.filter(p => p.side === 'left');
    const rightPins = meta.pins.filter(p => p.side === 'right');
    const maxPins = Math.max(leftPins.length, rightPins.length);
    height = (maxPins + 1) * PIN_SPACING;
    width = 60;

    leftPins.forEach((p, i) => {
      pins.push(createPin(p.name, p.number, 'left', 0, (i + 1) * PIN_SPACING, {
        electricalType: p.electricalType || 'passive'
      }));
    });

    rightPins.forEach((p, i) => {
      pins.push(createPin(p.name, p.number, 'right', width, (i + 1) * PIN_SPACING, {
        electricalType: p.electricalType || 'passive'
      }));
    });
  } else {
    // Single-sided (all pins on left)
    height = (pinCount + 1) * PIN_SPACING;
    width = 40;

    if (meta.pins) {
      meta.pins.forEach((p, i) => {
        pins.push(createPin(p.name, p.number, 'left', 0, (i + 1) * PIN_SPACING, {
          electricalType: p.electricalType || 'passive'
        }));
      });
    } else {
      for (let i = 0; i < pinCount; i++) {
        pins.push(createPin(`P${i + 1}`, i + 1, 'left', 0, (i + 1) * PIN_SPACING, {
          electricalType: 'passive'
        }));
      }
    }
  }

  // Grid-align dimensions
  width = Math.ceil(width / 20) * 20;
  height = Math.ceil(height / 20) * 20;

  const primitives = [
    createRect(0, 0, width, height, { id: 'body' }),
    createText(width / 2, height / 2, meta.displayName || 'CONN', { id: 'label', fontSize: 9 })
  ];

  return {
    id: meta.id,
    category: meta.category || 'Connectors',
    displayName: meta.displayName || meta.id,
    dimensions: { width, height },
    defaultRotation: meta.defaultRotation || 0,
    primitives,
    pins
  };
}
