/**
 * build-editor.js — Bundles and minifies editor JS for production
 * 
 * Usage: node editor/build-editor.js
 * Output: editor/dist/editor.min.js
 * 
 * In production, replace the 9 <script> tags in index.html with a single:
 *   <script src="dist/editor.min.js"></script>
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files in dependency order (must match index.html script order)
const JS_FILES = [
  'js/state.js',
  'js/canvas.js',
  'js/components.js',
  'js/library-loader.js',
  'js/wire.js',
  'js/tools.js',
  'js/export.js',
  'js/ui.js',
  'js/app.js'
];

// Concatenate all files
let combined = '';
combined += '/* CircuitCraft Editor — Bundled Build */\n';
combined += '/* Generated: ' + new Date().toISOString() + ' */\n\n';

for (const file of JS_FILES) {
  const filePath = join(__dirname, file);
  if (!existsSync(filePath)) {
    console.error(`Missing file: ${file}`);
    process.exit(1);
  }
  const content = readFileSync(filePath, 'utf-8');
  combined += `\n/* ── ${file} ── */\n`;
  combined += content;
  combined += '\n';
}

// Write concatenated bundle
const distDir = join(__dirname, 'dist');
mkdirSync(distDir, { recursive: true });

// Unminified bundle (for debugging)
writeFileSync(join(distDir, 'editor.bundle.js'), combined);

// Basic minification: remove comments, collapse whitespace
// For real minification, use: npx esbuild editor/dist/editor.bundle.js --minify --outfile=editor/dist/editor.min.js
let minified = combined;
// Remove block comments (but not inside strings)
minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
// Remove single-line comments (careful not to break URLs)
minified = minified.replace(/(?<![:'"])\/\/[^\n]*/g, '');
// Collapse multiple newlines
minified = minified.replace(/\n{3,}/g, '\n\n');

writeFileSync(join(distDir, 'editor.min.js'), minified);

const originalSize = Buffer.byteLength(combined, 'utf-8');
const minifiedSize = Buffer.byteLength(minified, 'utf-8');
const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

console.log('✓ Editor JS bundled successfully');
console.log(`  Files: ${JS_FILES.length}`);
console.log(`  Original: ${(originalSize / 1024).toFixed(1)} KB`);
console.log(`  Minified: ${(minifiedSize / 1024).toFixed(1)} KB (${savings}% smaller)`);
console.log(`  Output: editor/dist/editor.bundle.js (debug)`);
console.log(`  Output: editor/dist/editor.min.js (production)`);
console.log('');
console.log('For better minification, install esbuild and run:');
console.log('  npx esbuild editor/dist/editor.bundle.js --minify --outfile=editor/dist/editor.min.js');
