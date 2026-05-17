/**
 * index.js — Main Pipeline Orchestrator
 * 
 * Pipeline: metadata → generator → primitive scene graph → validation → export
 * 
 * Usage:
 *   node src/index.js           # Generate all components
 *   node src/index.js --validate-only  # Only validate, don't export
 */

import { readdirSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

import * as TwoPinGenerator from './generators/TwoPinGenerator.js';
import * as ThreePinGenerator from './generators/ThreePinGenerator.js';
import * as DipIcGenerator from './generators/DipIcGenerator.js';
import * as ConnectorGenerator from './generators/ConnectorGenerator.js';
import { validateBatch } from './validator.js';
import { exportComponent, generateCatalog } from './exporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const METADATA_ROOT = join(__dirname, '..', 'metadata');

// ─── Generator Family Registry ─────────────────────────────────
const GENERATORS = {
  TwoPin: TwoPinGenerator,
  ThreePin: ThreePinGenerator,
  DipIc: DipIcGenerator,
  Connector: ConnectorGenerator
};

// ─── Scan metadata directory recursively ────────────────────────
function scanMetadata(dir) {
  const specs = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    console.error(`  ⚠ Cannot read directory: ${dir}`);
    return specs;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      specs.push(...scanMetadata(fullPath));
    } else if (entry.name.endsWith('.json')) {
      try {
        const raw = readFileSync(fullPath, 'utf-8');
        const meta = JSON.parse(raw);
        meta._sourcePath = fullPath;
        specs.push(meta);
      } catch (e) {
        console.error(`  ✗ Failed to parse: ${fullPath} — ${e.message}`);
      }
    }
  }
  return specs;
}

// ─── Main Pipeline ──────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes('--validate-only');

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Circuit Crafter — Component Generation Engine  ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();

  // ── Step 1: Scan metadata ──
  console.log('▶ Scanning metadata...');
  const specs = scanMetadata(METADATA_ROOT);
  console.log(`  Found ${specs.length} component spec(s)`);
  console.log();

  if (specs.length === 0) {
    console.error('✗ No metadata files found. Exiting.');
    process.exit(1);
  }

  // ── Step 2: Generate components ──
  console.log('▶ Generating components...');
  const generated = [];
  const errors = [];

  for (const spec of specs) {
    const family = spec.family;
    const generator = GENERATORS[family];

    if (!generator) {
      const msg = `  ✗ ${spec.id}: Unknown generator family "${family}"`;
      console.error(msg);
      errors.push(msg);
      continue;
    }

    try {
      const component = generator.generate(spec);
      generated.push({ component, spec });
      console.log(`  ✓ ${spec.id} (${family}) → ${component.primitives.length} primitives, ${component.pins.length} pins`);
    } catch (e) {
      const msg = `  ✗ ${spec.id}: ${e.message}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log();
  console.log(`  Generated: ${generated.length}/${specs.length}`);
  if (errors.length > 0) {
    console.log(`  Errors: ${errors.length}`);
  }
  console.log();

  // ── Step 3: Validate ──
  console.log('▶ Validating...');
  const components = generated.map(g => g.component);
  const validation = validateBatch(components);

  for (const result of validation.results) {
    if (result.errors.length > 0) {
      console.error(`  ✗ ${result.componentId}:`);
      result.errors.forEach(e => console.error(`      ERROR: ${e}`));
    }
    if (result.warnings.length > 0) {
      console.warn(`  ⚠ ${result.componentId}:`);
      result.warnings.forEach(w => console.warn(`      WARN: ${w}`));
    }
    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log(`  ✓ ${result.componentId} — valid`);
    }
  }

  console.log();
  console.log(`  Total errors: ${validation.totalErrors}`);
  console.log(`  Total warnings: ${validation.totalWarnings}`);
  console.log();

  if (!validation.allValid) {
    console.error('✗ Validation failed. Fix errors above before exporting.');
    process.exit(1);
  }

  if (validateOnly) {
    console.log('✓ Validation passed. (--validate-only mode, no export)');
    process.exit(0);
  }

  // ── Step 4: Export ──
  console.log('▶ Exporting...');
  for (const { component, spec } of generated) {
    exportComponent(component, {
      generatorFamily: spec.family,
      metadataPath: spec._sourcePath
    });
    console.log(`  ✓ ${component.id} → exported to both source and runtime formats`);
  }

  console.log();

  // ── Step 5: Generate catalog ──
  console.log('▶ Generating catalog.json...');
  const catalog = generateCatalog(components);
  console.log(`  ✓ catalog.json — ${catalog.componentCount} components indexed`);
  console.log();

  // ── Done ──
  console.log('═══════════════════════════════════════════════');
  console.log(`✓ Pipeline complete. ${generated.length} components generated.`);
  console.log('  Source format: ComponentsGenerating-Engine/generated/');
  console.log('  Runtime format: editor/library/components/');
  console.log('  Catalog: editor/library/catalog.json');
  console.log('═══════════════════════════════════════════════');
}

main();
