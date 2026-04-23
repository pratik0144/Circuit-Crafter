const fs = require('fs');
let code = fs.readFileSync('js/wire.js', 'utf8');

// Add console.log to shouldJump
code = code.replace(
  'jumps.push(intersect);',
  'jumps.push(intersect); console.log("Jump added!", wireId, otherWire.id, intersect);'
);

// We can also add a global array to catch them from browser console
code = code.replace(
  'var jumps = [];',
  'var jumps = []; window._lastJumps = window._lastJumps || [];'
);
code = code.replace(
  'jumps.push(intersect);',
  'jumps.push(intersect); window._lastJumps.push(intersect);'
);

fs.writeFileSync('js/wire.js', code);
