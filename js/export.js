/* ========================================
   export.js — PNG, JPG, PDF, JSON export
   A4 professional scaling
   ======================================== */

/* --- A4 Dimensions at 96 DPI (px) --- */
var A4_PORTRAIT  = { w: 794,  h: 1123 };
var A4_LANDSCAPE = { w: 1123, h: 794  };

/* --- Margin presets (px at 96 DPI) --- */
var MARGIN_PRESETS = {
  none:   0,
  small:  30,
  normal: 60
};

/* ========================================
   STANDARD IMAGE EXPORT (PNG/JPG)
   Tight-fit around content with 2x scaling
   ======================================== */

function exportImage(format) {
  var bounds = getContentBounds();
  if (!bounds) {
    alert('Nothing to export. Place some components first.');
    return;
  }

  var padding = 50;
  var scale = 2;

  var w = (bounds.maxX - bounds.minX + padding * 2) * scale;
  var h = (bounds.maxY - bounds.minY + padding * 2) * scale;

  var offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  var offCtx = offCanvas.getContext('2d');

  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, w, h);

  offCtx.save();
  offCtx.scale(scale, scale);
  offCtx.translate(padding - bounds.minX, padding - bounds.minY);

  renderContentToContext(offCtx);
  offCtx.restore();

  var ext = format === 'jpeg' ? 'jpg' : 'png';
  var link = document.createElement('a');
  link.download = 'circuit.' + ext;
  link.href = offCanvas.toDataURL('image/' + format, 0.95);
  link.click();
}

function exportPNG() { exportImage('png'); }
function exportJPG() { exportImage('jpeg'); }

/* ========================================
   TRANSPARENT PNG EXPORT
   No background, no grid — just content
   3x scale for crisp print quality
   ======================================== */

function exportTransparentPNG() {
  var bounds = getContentBounds();
  if (!bounds) {
    alert('Nothing to export. Place some components first.');
    return;
  }

  var padding = 30;
  var scale = 3; // 3x for ultra-crisp output

  var w = (bounds.maxX - bounds.minX + padding * 2) * scale;
  var h = (bounds.maxY - bounds.minY + padding * 2) * scale;

  var offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  var offCtx = offCanvas.getContext('2d');

  // NO background fill — keep alpha channel transparent
  offCtx.clearRect(0, 0, w, h);

  offCtx.save();
  offCtx.scale(scale, scale);
  offCtx.translate(padding - bounds.minX, padding - bounds.minY);

  renderContentToContext(offCtx);
  offCtx.restore();

  var link = document.createElement('a');
  link.download = 'circuit_transparent.png';
  link.href = offCanvas.toDataURL('image/png');
  link.click();
}

/* ========================================
   A4 EXPORT (professional scaling)
   ======================================== */

function exportA4(format, settings) {
  settings = settings || {};
  var orientation = settings.orientation || 'portrait';
  var scaleMode = settings.scaleMode || 'fit';  // 'fit' | '100' | 'custom'
  var customScale = settings.customScale || 100;
  var marginKey = settings.margin || 'normal';
  var margin = MARGIN_PRESETS[marginKey] || 60;

  var a4 = orientation === 'landscape' ? A4_LANDSCAPE : A4_PORTRAIT;
  var exportScale = 2; // 2x for print quality

  var canvasW = a4.w * exportScale;
  var canvasH = a4.h * exportScale;

  var bounds = getContentBounds();
  if (!bounds) {
    alert('Nothing to export. Place some components first.');
    return;
  }

  // Content dimensions
  var contentW = bounds.maxX - bounds.minX;
  var contentH = bounds.maxY - bounds.minY;

  // Available area (inside margins)
  var availW = a4.w - margin * 2;
  var availH = a4.h - margin * 2;

  // Compute scale
  var drawScale;
  if (scaleMode === 'fit') {
    var scaleX = availW / contentW;
    var scaleY = availH / contentH;
    drawScale = Math.min(scaleX, scaleY, 1.5); // cap at 150%
  } else if (scaleMode === '100') {
    drawScale = 1;
  } else {
    drawScale = customScale / 100;
  }

  // Ensure minimum font readability (10pt ≈ 13px)
  var minFontScale = 0.5;
  if (drawScale < minFontScale) drawScale = minFontScale;

  // Scaled content dimensions
  var scaledW = contentW * drawScale;
  var scaledH = contentH * drawScale;

  // Center content in the page
  var offsetX = (a4.w - scaledW) / 2;
  var offsetY = (a4.h - scaledH) / 2;

  // Create offscreen canvas
  var offCanvas = document.createElement('canvas');
  offCanvas.width = canvasW;
  offCanvas.height = canvasH;
  var offCtx = offCanvas.getContext('2d');

  // White background
  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, canvasW, canvasH);

  // Draw content
  offCtx.save();
  offCtx.scale(exportScale, exportScale);
  offCtx.translate(offsetX, offsetY);
  offCtx.scale(drawScale, drawScale);
  offCtx.translate(-bounds.minX, -bounds.minY);

  renderContentToContext(offCtx);
  offCtx.restore();

  // Output
  if (format === 'pdf') {
    exportCanvasAsPDF(offCanvas, orientation);
  } else {
    var ext = format === 'jpeg' ? 'jpg' : 'png';
    var link = document.createElement('a');
    link.download = 'circuit_a4.' + ext;
    link.href = offCanvas.toDataURL('image/' + format, 0.95);
    link.click();
  }
}

/* ========================================
   PDF EXPORT
   Opens A4-sized image in new tab for print
   ======================================== */

function exportCanvasAsPDF(offCanvas, orientation) {
  // Create a new window with the image sized to A4
  var imgData = offCanvas.toDataURL('image/png');

  var printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to export PDF.');
    return;
  }

  var a4 = orientation === 'landscape' ? A4_LANDSCAPE : A4_PORTRAIT;

  printWin.document.write('<!DOCTYPE html><html><head>');
  printWin.document.write('<title>Circuit Diagram — Print</title>');
  printWin.document.write('<style>');
  printWin.document.write('@page { size: ' + (orientation === 'landscape' ? 'A4 landscape' : 'A4') + '; margin: 0; }');
  printWin.document.write('* { margin: 0; padding: 0; }');
  printWin.document.write('body { display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; background: white; }');
  printWin.document.write('img { max-width: 100%; max-height: 100%; }');
  printWin.document.write('</style>');
  printWin.document.write('</head><body>');
  printWin.document.write('<img src="' + imgData + '" />');
  printWin.document.write('</body></html>');
  printWin.document.close();

  // Auto-trigger print dialog
  printWin.onload = function() {
    setTimeout(function() { printWin.print(); }, 300);
  };
}

function exportPDF() {
  var settings = getExportSettings();
  exportA4('pdf', settings);
}

/* ========================================
   RENDER CONTENT TO CONTEXT
   Shared between export and preview
   ======================================== */

function renderContentToContext(ctx2) {
  // Draw wires
  state.wires.forEach(function(wire) { drawWire(ctx2, wire); });

  // Draw junction dots
  var junctions = findJunctionPoints();
  ctx2.fillStyle = '#000000';
  junctions.forEach(function(pt) {
    ctx2.beginPath();
    ctx2.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx2.fill();
  });

  // Draw components + labels
  state.components.forEach(function(comp) {
    drawComponent(ctx2, comp);
    drawComponentLabel(ctx2, comp);
  });

  // Draw texts
  state.texts.forEach(function(t) { drawText(ctx2, t); });
}

/* ========================================
   EXPORT SETTINGS (from modal UI)
   ======================================== */

function getExportSettings() {
  var orientationEl = document.querySelector('input[name="export-orientation"]:checked');
  var scaleModeEl = document.querySelector('input[name="export-scale"]:checked');
  var marginEl = document.querySelector('input[name="export-margin"]:checked');
  var customScaleEl = document.getElementById('export-custom-scale');

  return {
    orientation: orientationEl ? orientationEl.value : 'portrait',
    scaleMode: scaleModeEl ? scaleModeEl.value : 'fit',
    customScale: customScaleEl ? parseInt(customScaleEl.value) || 100 : 100,
    margin: marginEl ? marginEl.value : 'normal'
  };
}

/* --- Toggle Print Preview --- */

function togglePrintPreview() {
  state.showPrintPreview = !state.showPrintPreview;
  markDirty();
}

/* ========================================
   JSON EXPORT / IMPORT
   ======================================== */

function exportJSON() {
  var data = {
    version: 2,
    components: state.components,
    wires: state.wires,
    texts: state.texts
  };

  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var link = document.createElement('a');
  link.download = 'circuit.json';
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function importJSON() {
  var input = document.getElementById('import-input');
  input.click();
}

function handleImportFile(e) {
  var file = e.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(event) {
    try {
      var data = JSON.parse(event.target.result);
      if (data.components && data.wires) {
        saveSnapshot();
        state.components = data.components || [];
        state.wires = data.wires || [];
        state.texts = data.texts || [];
        state.selected = null;
        saveToLocalStorage();
        markDirty();
      } else {
        alert('Invalid circuit file format.');
      }
    } catch (err) {
      alert('Failed to parse JSON file.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ========================================
   CONTENT BOUNDS
   ======================================== */

function getContentBounds() {
  var minX = Infinity, minY = Infinity;
  var maxX = -Infinity, maxY = -Infinity;

  state.components.forEach(function(comp) {
    var b = getComponentBounds(comp);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  });

  state.wires.forEach(function(wire) {
    if (!wire.points) return;
    wire.points.forEach(function(p) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
  });

  state.texts.forEach(function(t) {
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y - t.fontSize);
    maxX = Math.max(maxX, t.x + 120);
    maxY = Math.max(maxY, t.y + 4);
  });

  if (minX === Infinity) return null;

  minX -= 30;
  minY -= 30;
  maxX += 30;
  maxY += 30;

  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
}
