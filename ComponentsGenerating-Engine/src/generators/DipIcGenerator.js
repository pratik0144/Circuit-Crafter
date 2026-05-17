/**
 * DipIcGenerator.js — Generator for DIP IC packages
 * 
 * The workhorse generator — handles 90% of ICs.
 * Algorithm per CompEngine.md §4:
 * 1. Parse pin list
 * 2. Calculate dimensions from pin count
 * 3. Assign pin coordinates (left/right sides)
 * 4. Generate rect body + notch + pins as primitives
 * 5. Detect active-low signals
 */

import {
  resetIds, createLine, createRect, createArc,
  createText, createPin, isActiveLow, cleanActiveLowName
} from '../primitives.js';

const PADDING = 20;
const PIN_SPACING = 20;

/**
 * Generate a DIP IC component from metadata.
 * @param {object} meta — Component metadata with pins array
 * @returns {object} — Complete component definition
 */
export function generate(meta) {
  resetIds();

  if (!meta.pins || !Array.isArray(meta.pins) || meta.pins.length === 0) {
    throw new Error(`DipIcGenerator: component "${meta.id}" has no pins defined`);
  }

  // ── Step 1: Partition pins by side ──
  const leftPins = meta.pins.filter(p => p.side === 'left');
  const rightPins = meta.pins.filter(p => p.side === 'right');
  const topPins = meta.pins.filter(p => p.side === 'top');
  const bottomPins = meta.pins.filter(p => p.side === 'bottom');

  // ── Step 2: Calculate dimensions ──
  const maxSidePins = Math.max(leftPins.length, rightPins.length);
  const height = (maxSidePins * PIN_SPACING) + PADDING;

  // Width based on complexity
  let width;
  if (meta.dimensions?.width) {
    width = meta.dimensions.width;  // Allow override
  } else if (maxSidePins > 10) {
    width = 160;
  } else {
    width = 80;
  }

  // Ensure grid alignment (must be multiple of 40 so center is multiple of 20)
  const alignedWidth = Math.ceil(width / 40) * 40;
  const alignedHeight = Math.ceil(height / 40) * 40;

  // ── Step 3: Generate primitives ──
  const primitives = [];

  // Body rectangle
  primitives.push(
    createRect(0, 0, alignedWidth, alignedHeight, { id: 'body' })
  );

  // DIP notch (semicircle at top center)
  primitives.push(
    createArc(alignedWidth / 2, 0, 6, 0, 180, { id: 'notch', strokeWidth: 1.5 })
  );

  // IC label (centered)
  primitives.push(
    createText(alignedWidth / 2, alignedHeight / 2, meta.displayName || meta.id, {
      id: 'label',
      fontSize: meta.displayName && meta.displayName.length > 6 ? 9 : 11
    })
  );

  // ── Step 4: Generate pins ──
  const pins = [];

  // Left pins: x=0, y starts at 20, increments by 20
  leftPins.forEach((pinMeta, index) => {
    const y = (index + 1) * PIN_SPACING;
    const inverted = pinMeta.invert !== undefined ? pinMeta.invert : isActiveLow(pinMeta.name);
    const displayName = inverted ? cleanActiveLowName(pinMeta.name) : pinMeta.name;

    pins.push(
      createPin(displayName, pinMeta.number, 'left', 0, y, {
        electricalType: pinMeta.electricalType || 'bidirectional',
        length: 20,
        invert: inverted
      })
    );

    // Pin label text (inside body, near left edge)
    primitives.push(
      createText(8, y, displayName, {
        id: `pin_label_${pinMeta.number}`,
        fontSize: 8,
        align: 'left',
        baseline: 'middle'
      })
    );
  });

  // Right pins: x=width, y starts at 20, increments by 20
  rightPins.forEach((pinMeta, index) => {
    const y = (index + 1) * PIN_SPACING;
    const inverted = pinMeta.invert !== undefined ? pinMeta.invert : isActiveLow(pinMeta.name);
    const displayName = inverted ? cleanActiveLowName(pinMeta.name) : pinMeta.name;

    pins.push(
      createPin(displayName, pinMeta.number, 'right', alignedWidth, y, {
        electricalType: pinMeta.electricalType || 'bidirectional',
        length: 20,
        invert: inverted
      })
    );

    // Pin label text (inside body, near right edge)
    primitives.push(
      createText(alignedWidth - 8, y, displayName, {
        id: `pin_label_${pinMeta.number}`,
        fontSize: 8,
        align: 'right',
        baseline: 'middle'
      })
    );
  });

  // Top pins (if any)
  topPins.forEach((pinMeta, index) => {
    const x = ((index + 1) * PIN_SPACING);
    const inverted = pinMeta.invert !== undefined ? pinMeta.invert : isActiveLow(pinMeta.name);
    const displayName = inverted ? cleanActiveLowName(pinMeta.name) : pinMeta.name;

    pins.push(
      createPin(displayName, pinMeta.number, 'top', x, 0, {
        electricalType: pinMeta.electricalType || 'bidirectional',
        length: 20,
        invert: inverted
      })
    );
  });

  // Bottom pins (if any)
  bottomPins.forEach((pinMeta, index) => {
    const x = ((index + 1) * PIN_SPACING);
    const inverted = pinMeta.invert !== undefined ? pinMeta.invert : isActiveLow(pinMeta.name);
    const displayName = inverted ? cleanActiveLowName(pinMeta.name) : pinMeta.name;

    pins.push(
      createPin(displayName, pinMeta.number, 'bottom', x, alignedHeight, {
        electricalType: pinMeta.electricalType || 'bidirectional',
        length: 20,
        invert: inverted
      })
    );
  });

  // ── Pin number labels (outside body) ──
  pins.forEach(pin => {
    const numX = pin.side === 'left' ? -8 : (pin.side === 'right' ? alignedWidth + 8 : pin.position.x);
    const numY = (pin.side === 'top' || pin.side === 'bottom') ? (pin.side === 'top' ? -8 : alignedHeight + 8) : pin.position.y;
    primitives.push(
      createText(numX, numY, String(pin.number), {
        id: `pin_num_${pin.number}`,
        fontSize: 7,
        align: pin.side === 'left' ? 'right' : (pin.side === 'right' ? 'left' : 'center'),
        baseline: 'middle',
        fill: '#888'
      })
    );
  });

  return {
    id: meta.id,
    category: meta.category || 'ICs',
    displayName: meta.displayName || meta.id,
    dimensions: { width: alignedWidth, height: alignedHeight },
    defaultRotation: meta.defaultRotation || 0,
    primitives,
    pins
  };
}
