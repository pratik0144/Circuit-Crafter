import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENGINE_ROOT = path.join(__dirname, '..');
const METADATA_DIR = path.join(ENGINE_ROOT, 'metadata');

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error('Usage: node bulk-importer.js <path-to-csv>');
  console.error('Example: node scripts/bulk-importer.js ./data/components.csv');
  process.exit(1);
}

// Expand shorthand ranges like A3:A0 or I0-I7
function expandRange(rangeStr) {
  if (!rangeStr) return [];
  const pins = [];
  const parts = rangeStr.split('|');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Match A3:A0 or I0-I7
    const match = trimmed.match(/^([A-Za-z]+)(\d+)([:-])(\d+)$/);
    if (match) {
      const prefix = match[1];
      const start = parseInt(match[2], 10);
      const sep = match[3];
      const end = parseInt(match[4], 10);

      if (start <= end) {
        for (let i = start; i <= end; i++) pins.push(`${prefix}${i}`);
      } else {
        for (let i = start; i >= end; i--) pins.push(`${prefix}${i}`);
      }
    } else {
      pins.push(trimmed);
    }
  }
  return pins;
}

// Remap families and auto-inject VCC/GND
function healComponentData(row) {
  let [id, displayName, category, family, _rawPinCount, leftPins, rightPins, topPins, bottomPins, packageType, keywords] = row;

  // 1. Expand Pins
  let left = expandRange(leftPins);
  let right = expandRange(rightPins);
  let top = expandRange(topPins);
  let bottom = expandRange(bottomPins);

  // 2. Family Remapping
  const originalFamily = family;
  if (['Gate', 'Board', 'Module'].includes(family)) {
    family = 'DipIc';
  } else if (family === 'Power') {
    const total = left.length + right.length + top.length + bottom.length;
    if (total <= 2) family = 'TwoPin';
    else if (total === 3) family = 'ThreePin';
    else family = 'DipIc';
  }

  // Fallback: If it's labeled TwoPin/ThreePin but has too many pins, force DipIc
  const truePinCount = left.length + right.length + top.length + bottom.length;
  if (family !== 'Connector' && truePinCount > 3) {
    family = 'DipIc';
  }

  // 3. VCC / GND Auto-Injection for ICs
  if (family === 'DipIc' && originalFamily !== 'Board' && originalFamily !== 'Module') {
    const allPins = [...left, ...right, ...top, ...bottom].map(p => p.toUpperCase());
    const hasGND = allPins.some(p => p.includes('GND') || p.includes('VSS'));
    const hasVCC = allPins.some(p => p.includes('VCC') || p.includes('VDD') || p.includes('V+'));

    // Try to balance left/right sides if we inject
    if (!hasGND) {
      if (left.length <= right.length) left.push('GND');
      else right.push('GND');
    }
    if (!hasVCC) {
      if (right.length <= left.length) right.push('VCC');
      else left.push('VCC');
    }
    
    // Attempt to make lengths even for a perfect DipIc rectangle if only left/right exist
    if (top.length === 0 && bottom.length === 0) {
        while(left.length < right.length) left.push(`NC_${left.length}`);
        while(right.length < left.length) right.push(`NC_${right.length}`);
    }
  }

  // 4. True Pin Count is calculated earlier

  // Build Metadata JSON
  const pins = [];
  let pinCounter = 1;
  left.forEach(p => pins.push({ name: p, side: 'left', number: pinCounter++ }));
  bottom.forEach(p => pins.push({ name: p, side: 'bottom', number: pinCounter++ }));
  
  const rightLen = right.length;
  right.forEach((p, i) => pins.push({ name: p, side: 'right', number: pinCounter + rightLen - 1 - i }));
  pinCounter += rightLen;
  
  const topLen = top.length;
  top.forEach((p, i) => pins.push({ name: p, side: 'top', number: pinCounter + topLen - 1 - i }));
  pinCounter += topLen;

  const metadata = {
    id: id,
    displayName: displayName,
    category: category,
    family: family,
    pinCount: truePinCount,
    packageType: packageType || 'UNKNOWN',
    pins: pins,
    keywords: keywords ? keywords.replace(/['"]/g, '').split(',').map(k => k.trim()) : []
  };

  return metadata;
}

async function run() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV file not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(CSV_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  if (!fs.existsSync(METADATA_DIR)) {
    fs.mkdirSync(METADATA_DIR, { recursive: true });
  }

  let isFirstLine = true;
  let count = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    // Simple CSV parser respecting quotes
    const row = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);

    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }

    const metadata = healComponentData(row);
    
    // Write JSON file directly
    const jsonPath = path.join(METADATA_DIR, `${metadata.id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2), 'utf-8');
    count++;
  }

  console.log(`\n✅ Bulk Import Complete!`);
  console.log(`Successfully healed and imported ${count} components into the metadata/ folder.`);
  console.log(`You can now run 'npm run generate' to build the geometry.`);
}

run().catch(console.error);
