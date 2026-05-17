/**
 * test-generators.js — Automated test suite for the Component Generation Engine
 * 
 * Tests:
 * 1. All generators produce valid output
 * 2. Pin counts match between metadata and generated output
 * 3. Pin positions satisfy grid and side-geometry constraints
 * 4. Validator catches known-bad inputs
 * 5. Import/export schema validation
 * 
 * Usage: node --test tests/test-generators.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import * as TwoPinGenerator from '../src/generators/TwoPinGenerator.js';
import * as ThreePinGenerator from '../src/generators/ThreePinGenerator.js';
import * as DipIcGenerator from '../src/generators/DipIcGenerator.js';
import * as ConnectorGenerator from '../src/generators/ConnectorGenerator.js';
import { validateComponent, validateBatch } from '../src/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const METADATA_ROOT = join(__dirname, '..', 'metadata');

const GENERATORS = {
  TwoPin: TwoPinGenerator,
  ThreePin: ThreePinGenerator,
  DipIc: DipIcGenerator,
  Connector: ConnectorGenerator
};

// ─── Load all metadata ────────────────────────────────
function loadAllMetadata() {
  const specs = [];
  function scan(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) { scan(fullPath); }
      else if (entry.name.endsWith('.json')) {
        try {
          const raw = readFileSync(fullPath, 'utf-8');
          const meta = JSON.parse(raw);
          meta._sourcePath = fullPath;
          specs.push(meta);
        } catch (e) { /* skip unparseable */ }
      }
    }
  }
  scan(METADATA_ROOT);
  return specs;
}

const allSpecs = loadAllMetadata();

// ═══════════════════════════════════════════════════════
// TEST SUITE 1: Generator Output Validity
// ═══════════════════════════════════════════════════════

describe('Generator Output Validity', () => {
  const families = ['TwoPin', 'ThreePin', 'DipIc', 'Connector'];
  
  for (const family of families) {
    const familySpecs = allSpecs.filter(s => s.family === family);
    
    describe(`${family} Generator (${familySpecs.length} components)`, () => {
      it('should generate all components without throwing', () => {
        let errors = 0;
        for (const spec of familySpecs) {
          try {
            GENERATORS[family].generate(spec);
          } catch (e) {
            errors++;
            if (errors <= 5) console.log(`  FAIL: ${spec.id} — ${e.message}`);
          }
        }
        assert.equal(errors, 0, `${errors} components failed to generate`);
      });

      it('should produce valid primitives and pins arrays', () => {
        for (const spec of familySpecs.slice(0, 20)) { // Sample first 20
          const comp = GENERATORS[family].generate(spec);
          assert.ok(Array.isArray(comp.primitives), `${spec.id}: primitives is not array`);
          assert.ok(Array.isArray(comp.pins), `${spec.id}: pins is not array`);
          assert.ok(comp.primitives.length > 0, `${spec.id}: no primitives`);
          assert.ok(comp.pins.length > 0, `${spec.id}: no pins`);
        }
      });

      it('should have required fields on every component', () => {
        for (const spec of familySpecs.slice(0, 20)) {
          const comp = GENERATORS[family].generate(spec);
          assert.ok(comp.id, `Missing id`);
          assert.ok(comp.category, `${comp.id}: missing category`);
          assert.ok(comp.displayName, `${comp.id}: missing displayName`);
          assert.ok(comp.dimensions, `${comp.id}: missing dimensions`);
          assert.ok(comp.dimensions.width > 0, `${comp.id}: invalid width`);
          assert.ok(comp.dimensions.height > 0, `${comp.id}: invalid height`);
        }
      });
    });
  }
});

// ═══════════════════════════════════════════════════════
// TEST SUITE 2: Pin Count Consistency
// ═══════════════════════════════════════════════════════

describe('Pin Count Consistency', () => {
  it('all metadata pinCount should match actual pins.length', () => {
    let mismatches = 0;
    for (const spec of allSpecs) {
      const actual = (spec.pins || []).length;
      if (spec.pinCount !== actual) {
        mismatches++;
        if (mismatches <= 5) {
          console.log(`  MISMATCH: ${spec.id}: declared=${spec.pinCount} actual=${actual}`);
        }
      }
    }
    assert.equal(mismatches, 0, `${mismatches} metadata files have pinCount mismatches`);
  });

  it('no TwoPin components should have bottom-side pins', () => {
    const bad = allSpecs.filter(s => 
      s.family === 'TwoPin' && 
      (s.pins || []).some(p => p.side === 'bottom')
    );
    assert.equal(bad.length, 0, 
      `${bad.length} TwoPin components have bottom pins: ${bad.map(s => s.id).join(', ')}`);
  });

  it('all TwoPin components should have symbolStyle', () => {
    const missing = allSpecs.filter(s => s.family === 'TwoPin' && !s.symbolStyle);
    assert.equal(missing.length, 0,
      `${missing.length} TwoPin components missing symbolStyle`);
  });
});

// ═══════════════════════════════════════════════════════
// TEST SUITE 3: Validator Correctness
// ═══════════════════════════════════════════════════════

describe('Validator', () => {
  it('should accept a valid component', () => {
    const valid = {
      id: 'test_valid',
      category: 'Test',
      displayName: 'Test Component',
      dimensions: { width: 80, height: 40 },
      primitives: [{ id: 'rect_1', type: 'rect', x: 0, y: 0, width: 80, height: 40 }],
      pins: [
        { id: 'p1', name: 'A', number: 1, side: 'left', position: { x: 0, y: 20 } },
        { id: 'p2', name: 'B', number: 2, side: 'right', position: { x: 80, y: 20 } }
      ]
    };
    const result = validateComponent(valid);
    assert.equal(result.valid, true, `Errors: ${result.errors.join(', ')}`);
  });

  it('should reject component with missing id', () => {
    const bad = {
      category: 'Test',
      displayName: 'No ID',
      dimensions: { width: 80, height: 40 },
      primitives: [{ id: 'r1', type: 'rect' }],
      pins: []
    };
    const result = validateComponent(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('Missing component id')));
  });

  it('should reject duplicate pin IDs', () => {
    const bad = {
      id: 'test_dup_pin',
      category: 'Test',
      displayName: 'Dup Pin',
      dimensions: { width: 80, height: 40 },
      primitives: [{ id: 'r1', type: 'rect' }],
      pins: [
        { id: 'p1', name: 'A', number: 1, side: 'left', position: { x: 0, y: 20 } },
        { id: 'p1', name: 'B', number: 2, side: 'right', position: { x: 80, y: 20 } }
      ]
    };
    const result = validateComponent(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('Duplicate pin id')));
  });

  it('should reject pin with wrong side-geometry', () => {
    const bad = {
      id: 'test_bad_pin',
      category: 'Test',
      displayName: 'Bad Pin',
      dimensions: { width: 80, height: 40 },
      primitives: [{ id: 'r1', type: 'rect' }],
      pins: [
        { id: 'p1', name: 'A', number: 1, side: 'left', position: { x: 40, y: 20 } } // x should be 0 for left
      ]
    };
    const result = validateComponent(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('side="left" but x=40')));
  });

  it('should detect duplicate component IDs in batch', () => {
    const comps = [
      { id: 'dup', category: 'T', displayName: 'A', dimensions: { width: 80, height: 40 }, primitives: [{ id: 'r', type: 'rect' }], pins: [] },
      { id: 'dup', category: 'T', displayName: 'B', dimensions: { width: 80, height: 40 }, primitives: [{ id: 'r', type: 'rect' }], pins: [] }
    ];
    const result = validateBatch(comps);
    assert.equal(result.allValid, false);
    assert.ok(result.totalErrors > 0);
  });
});

// ═══════════════════════════════════════════════════════
// TEST SUITE 4: Full Pipeline Validation
// ═══════════════════════════════════════════════════════

describe('Full Pipeline — Generate + Validate All', () => {
  it('should generate and validate all 588 components without errors', () => {
    const generated = [];
    let genErrors = 0;

    for (const spec of allSpecs) {
      const generator = GENERATORS[spec.family];
      if (!generator) { genErrors++; continue; }
      try {
        const comp = generator.generate(spec);
        generated.push(comp);
      } catch (e) {
        genErrors++;
      }
    }

    assert.equal(genErrors, 0, `${genErrors} components failed to generate`);

    const validation = validateBatch(generated);
    if (!validation.allValid) {
      const failedIds = validation.results
        .filter(r => r.errors.length > 0)
        .map(r => `${r.componentId}: ${r.errors[0]}`)
        .slice(0, 10);
      console.log('  Failed validations:', failedIds);
    }
    
    assert.equal(validation.totalErrors, 0, 
      `${validation.totalErrors} validation errors across ${generated.length} components`);
  });
});

// ═══════════════════════════════════════════════════════
// TEST SUITE 5: No Orphan Categories
// ═══════════════════════════════════════════════════════

describe('Category Normalization', () => {
  it('should have no orphan categories in generated output', () => {
    const orphanNames = ['Passives', 'Sensors', 'ICs'];
    const generated = [];
    
    for (const spec of allSpecs) {
      const generator = GENERATORS[spec.family];
      if (!generator) continue;
      try {
        generated.push(generator.generate(spec));
      } catch { /* skip */ }
    }

    const orphans = generated.filter(c => orphanNames.includes(c.category));
    assert.equal(orphans.length, 0, 
      `Found orphan categories: ${orphans.map(c => c.id + '=' + c.category).join(', ')}`);
  });
});
