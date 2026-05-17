/**
 * exporter.js — Dual Export Pipeline
 * 
 * Writes generated components to TWO locations:
 * 1. Engine Source Format → ComponentsGenerating-Engine/generated/
 *    (canonical, includes generator metadata, for future re-generation)
 * 2. Runtime Editor Format → editor/library/components/
 *    (lean, editor-friendly, for canvas rendering)
 * 
 * Also generates editor/library/catalog.json
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ENGINE_ROOT = join(__dirname, '..');
const EDITOR_ROOT = join(ENGINE_ROOT, '..', 'editor');

// Normalize orphan/shorthand categories to their canonical forms
const CATEGORY_NORMALIZE = {
  'Passives': 'Passive Components',
  'Sensors': 'Sensors & Transducers',
  'ICs': 'Microcontrollers & Processors'
};

function normalizeCategory(cat) {
  return CATEGORY_NORMALIZE[cat] || cat;
}

/**
 * Export a single component to both formats.
 * @param {object} component — Validated component object
 * @param {object} sourceMetadata — Extra metadata for engine source format
 */
export function exportComponent(component, sourceMetadata = {}) {
  // Normalize category at export time to prevent orphans in the bundle
  component.category = normalizeCategory(component.category);
  const category = (component.category || 'uncategorized').toLowerCase().replace(/[^a-z0-9]+/g, '_');

  // ── 1. Engine Source Format (canonical) ──
  const sourceDir = join(ENGINE_ROOT, 'generated', category);
  mkdirSync(sourceDir, { recursive: true });

  const sourceData = {
    ...component,
    _engineMeta: {
      generatedAt: new Date().toISOString(),
      engineVersion: '1.0.0',
      generatorFamily: sourceMetadata.generatorFamily || 'unknown',
      sourceMetadataPath: sourceMetadata.metadataPath || null
    }
  };

  writeFileSync(
    join(sourceDir, `${component.id}.json`),
    JSON.stringify(sourceData, null, 2)
  );

  // ── 2. Runtime Editor Format (lean) ──
  const runtimeDir = join(EDITOR_ROOT, 'library', 'components', category);
  mkdirSync(runtimeDir, { recursive: true });

  // Strip engine metadata for runtime format
  const runtimeData = {
    id: component.id,
    category: component.category,
    displayName: component.displayName,
    dimensions: component.dimensions,
    defaultRotation: component.defaultRotation || 0,
    primitives: component.primitives,
    pins: component.pins
  };

  writeFileSync(
    join(runtimeDir, `${component.id}.json`),
    JSON.stringify(runtimeData, null, 2)
  );
}

/**
 * Generate catalog.json from all exported components.
 * @param {object[]} components — Array of all generated components
 */
export function generateCatalog(components) {
  const catalogDir = join(EDITOR_ROOT, 'library');
  mkdirSync(catalogDir, { recursive: true });

  const catalog = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    componentCount: components.length,
    components: components.map(comp => {
      const category = (comp.category || 'uncategorized').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      return {
        id: comp.id,
        displayName: comp.displayName,
        category: comp.category,
        keywords: generateKeywords(comp),
        path: `components/${category}/${comp.id}.json`,
        icon: comp.displayName.substring(0, 4),
        pinCount: comp.pins ? comp.pins.length : 0
      };
    })
  };

  writeFileSync(
    join(catalogDir, 'catalog.json'),
    JSON.stringify(catalog, null, 2)
  );

  // ── Create the Runtime Bundle ──
  // Contains the full JSON payload for every component, preventing 500+ fetch requests in the browser.
  const bundle = {
    version: '1.0.0',
    generatedAt: catalog.generatedAt,
    components: components // Full primitive data
  };

  writeFileSync(
    join(catalogDir, 'library_bundle.json'),
    JSON.stringify(bundle) // Minified
  );

  return catalog;
}

/**
 * Generate searchable keywords for a component.
 */
function generateKeywords(comp) {
  const keywords = new Set();

  // Add component name words
  if (comp.displayName) {
    comp.displayName.toLowerCase().split(/[\s\-_\/]+/).forEach(w => {
      if (w.length > 1) keywords.add(w);
    });
  }

  // Add category
  if (comp.category) {
    keywords.add(comp.category.toLowerCase());
  }

  // Add ID
  if (comp.id) {
    keywords.add(comp.id.toLowerCase());
  }

  // Add pin names for ICs (useful for searching "UART", "SPI" etc.)
  if (comp.pins) {
    comp.pins.forEach(pin => {
      if (pin.electricalType) keywords.add(pin.electricalType);
    });
  }

  return [...keywords];
}
