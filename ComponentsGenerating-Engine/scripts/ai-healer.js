/**
 * ai-healer.js — LLM Knowledge Injection Pipeline
 * 
 * Scans metadata/ for stub components and patches them with
 * verified pinouts from the llm-knowledge-base.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KNOWLEDGE_BASE } from './llm-knowledge-base.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METADATA_DIR = path.join(__dirname, '..', 'metadata');

function isStub(meta) {
  const names = (meta.pins || []).map(p => p.name);
  return names.every(n => /^(VCC|GND|NC_\d+)$/.test(n)) || names.length <= 2;
}

function findMatch(meta) {
  // Try exact id match first
  if (KNOWLEDGE_BASE[meta.id]) return KNOWLEDGE_BASE[meta.id];
  // Try displayName match
  for (const [key, val] of Object.entries(KNOWLEDGE_BASE)) {
    if (meta.displayName && meta.displayName.toLowerCase() === key.toLowerCase()) return val;
  }
  return null;
}

function healMeta(meta, patch) {
  const pins = [];
  let n = 1;

  if (patch.left) {
    for (let i = 0; i < patch.left.length; i++) {
      pins.push({ name: patch.left[i], side: 'left', number: n++ });
    }
  }
  if (patch.bottom) {
    for (let i = 0; i < patch.bottom.length; i++) {
      pins.push({ name: patch.bottom[i], side: 'bottom', number: n++ });
    }
  }
  if (patch.right) {
    const rightLen = patch.right.length;
    for (let i = 0; i < rightLen; i++) {
      // Right side is listed top-to-bottom, so pin number should decrease
      pins.push({ name: patch.right[i], side: 'right', number: n + rightLen - 1 - i });
    }
    n += rightLen;
  }
  if (patch.top) {
    const topLen = patch.top.length;
    for (let i = 0; i < topLen; i++) {
      pins.push({ name: patch.top[i], side: 'top', number: n + topLen - 1 - i });
    }
    n += topLen;
  }
  meta.pins = pins;
  meta.pinCount = pins.length;
  if (patch.family) meta.family = patch.family;
  if (patch.packageType) meta.packageType = patch.packageType;
  return meta;
}

function run() {
  const files = fs.readdirSync(METADATA_DIR).filter(f => f.endsWith('.json'));
  let patched = 0, verified = 0, skipped = 0;

  for (const f of files) {
    const fp = path.join(METADATA_DIR, f);
    const meta = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const patch = findMatch(meta);

    if (!patch) { skipped++; continue; }

    if (isStub(meta)) {
      healMeta(meta, patch);
      fs.writeFileSync(fp, JSON.stringify(meta, null, 2), 'utf8');
      console.log(`  🩹 PATCHED ${meta.id} (${meta.displayName}) → ${meta.pinCount} pins`);
      patched++;
    } else {
      // Verify existing: overwrite with verified data
      healMeta(meta, patch);
      fs.writeFileSync(fp, JSON.stringify(meta, null, 2), 'utf8');
      console.log(`  ✅ VERIFIED ${meta.id} (${meta.displayName}) → ${meta.pinCount} pins`);
      verified++;
    }
  }

  console.log(`\n═══ AI Healer Complete ═══`);
  console.log(`  Patched:  ${patched}`);
  console.log(`  Verified: ${verified}`);
  console.log(`  Skipped:  ${skipped} (no knowledge entry)`);
}

run();
