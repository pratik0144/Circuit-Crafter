/* ========================================
   ui.js — Floating toolbars, pickers,
   context panel, modals
   ======================================== */

/* --- SI Unit Data per component type --- */

var COMPONENT_UNITS = {
  resistor:    { category: 'Passive', units: ['Ω', 'kΩ', 'MΩ'], examples: ['100Ω', '1kΩ', '10kΩ', '1MΩ'], guide: 'Resistance in Ohms. Common: Ω, kΩ, MΩ' },
  capacitor:   { category: 'Passive', units: ['F', 'mF', 'µF', 'nF', 'pF'], examples: ['10µF', '100nF', '1pF'], guide: 'Capacitance in Farads. Common: µF, nF, pF' },
  inductor:    { category: 'Passive', units: ['H', 'mH', 'µH'], examples: ['10mH', '100µH', '1H'], guide: 'Inductance in Henrys. Common: mH, µH' },
  voltage:     { category: 'Source', units: ['V', 'mV', 'kV'], examples: ['5V', '12V', '220V', '3.3V'], guide: 'Voltage in Volts' },
  current:     { category: 'Source', units: ['A', 'mA', 'µA'], examples: ['1A', '500mA', '10µA'], guide: 'Current in Amperes' },
  switch_comp: { category: 'Switch', units: [], examples: ['S1', 'SW1'], guide: 'No unit — use a label like S1' },
  lamp:        { category: 'Output', units: ['W'], examples: ['60W', '100W', 'Lamp1'], guide: 'Power in Watts (optional)' },
  ground:      { category: 'Reference', units: [], examples: ['GND'], guide: 'No unit' },
  vcvs:        { category: 'Dep. Source', units: [], examples: ['v=bv_c', '2v_x'], guide: 'Voltage-controlled voltage source' },
  cccvs:       { category: 'Dep. Source', units: [], examples: ['v=ri_c', '5i_x'], guide: 'Current-controlled voltage source' },
  vccs:        { category: 'Dep. Source', units: [], examples: ['i=gv_c', '0.1v_x'], guide: 'Voltage-controlled current source' },
  cccs:        { category: 'Dep. Source', units: [], examples: ['i=di_c', '3i_x'], guide: 'Current-controlled current source' }
};

/* ========================================
   Initialization
   ======================================== */

function initUI() {
  // Top toolbar — tool buttons
  document.querySelectorAll('#top-toolbar .tb-btn[data-tool]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      closeComponentPicker();
      setTool(btn.dataset.tool);
    });
  });

  // Top toolbar — quick component buttons
  document.querySelectorAll('#top-toolbar .tb-btn[data-comp]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      closeComponentPicker();
      activateComponent(btn.dataset.comp);
    });
  });

  // More components button → toggle picker
  document.getElementById('more-comps-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    toggleComponentPicker();
  });

  // Component picker items
  document.querySelectorAll('.picker-item').forEach(function(item) {
    item.addEventListener('click', function() {
      activateComponent(item.dataset.type);
      closeComponentPicker();
    });
  });

  // Close picker on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#component-picker') && !e.target.closest('#more-comps-btn')) {
      closeComponentPicker();
    }
    if (!e.target.closest('#export-wrapper')) {
      document.getElementById('export-dropdown').classList.add('hidden');
    }
  });

  // Undo / Redo (top right)
  document.getElementById('undo-btn').addEventListener('click', undo);
  document.getElementById('redo-btn').addEventListener('click', redo);

  // Undo / Redo (bottom bar)
  document.getElementById('bottom-undo-btn').addEventListener('click', undo);
  document.getElementById('bottom-redo-btn').addEventListener('click', redo);

  // Zoom buttons
  document.getElementById('zoom-in-btn').addEventListener('click', function() { zoomBy(1.15); });
  document.getElementById('zoom-out-btn').addEventListener('click', function() { zoomBy(0.85); });

  // Reset
  document.getElementById('reset-btn').addEventListener('click', openResetModal);

  // Export
  var exportBtn = document.getElementById('export-btn');
  var exportDropdown = document.getElementById('export-dropdown');
  exportBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    exportDropdown.classList.toggle('hidden');
  });
  exportDropdown.querySelectorAll('button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var format = btn.dataset.format;
      switch (format) {
        case 'png':             exportPNG();  break;
        case 'png-transparent': exportTransparentPNG(); break;
        case 'jpg':             exportJPG();  break;
        case 'a4':              openExportModal(); break;
        case 'pdf':             exportPDF();  break;
        case 'preview':         togglePrintPreview(); break;
        case 'json':            exportJSON(); break;
        case 'load':            importJSON(); break;
      }
      exportDropdown.classList.add('hidden');
    });
  });

  // File import
  document.getElementById('import-input').addEventListener('change', handleImportFile);

  // Modal bindings
  initModalBindings();

  // Export modal bindings
  initExportModalBindings();

  // Bottom bar update
  setInterval(updateBottomBar, 300);

  // Watch selection for context panel
  setInterval(updateContextPanel, 200);
}

/* ========================================
   TOOLBAR HIGHLIGHTS
   ======================================== */

function updateToolHighlight(tool) {
  // Clear all active states in toolbar
  document.querySelectorAll('#top-toolbar .tb-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });

  // Clear all active states in component picker
  document.querySelectorAll('.picker-item').forEach(function(p) {
    p.classList.remove('active');
  });

  // Activate the matching tool button
  var toolBtn = document.querySelector('#top-toolbar .tb-btn[data-tool="' + tool + '"]');
  if (toolBtn) toolBtn.classList.add('active');
}

function activateComponent(type) {
  state.tool = 'place';
  state.placingComponent = type;
  state.wireStart = null;

  // Highlight in toolbar
  document.querySelectorAll('#top-toolbar .tb-btn').forEach(function(b) { b.classList.remove('active'); });
  var compBtn = document.querySelector('#top-toolbar .tb-btn[data-comp="' + type + '"]');
  if (compBtn) compBtn.classList.add('active');

  // Highlight in picker
  document.querySelectorAll('.picker-item').forEach(function(p) {
    p.classList.toggle('active', p.dataset.type === type);
  });

  markDirty();
}

/* ========================================
   COMPONENT PICKER
   ======================================== */

function toggleComponentPicker() {
  var picker = document.getElementById('component-picker');
  picker.classList.toggle('open');
}

function closeComponentPicker() {
  document.getElementById('component-picker').classList.remove('open');
}

/* ========================================
   CONTEXT PANEL (LEFT FLOATING)
   ======================================== */

var _lastContextId = null;

function updateContextPanel() {
  var panel = document.getElementById('context-panel');

  if (!state.selected) {
    if (panel.classList.contains('open')) {
      panel.classList.remove('open');
      _lastContextId = null;
    }
    return;
  }

  // Don't rebuild if same selection
  if (_lastContextId === state.selected.id) return;
  _lastContextId = state.selected.id;

  if (state.selected.type === 'component') {
    var comp = state.components.find(function(c) { return c.id === state.selected.id; });
    if (!comp) return;
    buildComponentContext(panel, comp);
  } else if (state.selected.type === 'text') {
    var txt = state.texts.find(function(t) { return t.id === state.selected.id; });
    if (!txt) return;
    buildTextContext(panel, txt);
  } else if (state.selected.type === 'wire') {
    buildWireContext(panel);
  }

  panel.classList.add('open');
}

function buildComponentContext(panel, comp) {
  var def = COMPONENT_DEFS[comp.type];
  var unitInfo = COMPONENT_UNITS[comp.type] || {};

  var html = '';
  html += '<div class="ctx-comp-header">';
  html += '  <div class="ctx-comp-icon">' + (def.icon || def.abbrev) + '</div>';
  html += '  <div>';
  html += '    <div class="ctx-comp-name">' + def.name + '</div>';
  html += '    <div class="ctx-comp-type">' + (unitInfo.category || '') + '</div>';
  html += '  </div>';
  html += '</div>';

  // Value section
  html += '<div class="ctx-section">';
  html += '  <div class="ctx-label">Value</div>';
  html += '  <div class="ctx-row">';
  html += '    <input class="ctx-input" id="ctx-value-input" value="' + (comp.value || '') + '" placeholder="e.g. ' + ((unitInfo.examples && unitInfo.examples[0]) || '') + '">';
  html += '  </div>';

  if (unitInfo.examples && unitInfo.examples.length > 0) {
    html += '  <div class="ctx-chips">';
    unitInfo.examples.forEach(function(ex) {
      html += '<button class="ctx-chip" data-val="' + ex + '">' + ex + '</button>';
    });
    html += '  </div>';
  }
  if (unitInfo.guide) {
    html += '  <div class="ctx-hint">' + unitInfo.guide + '</div>';
  }
  html += '</div>';

  // Actions
  html += '<div class="ctx-divider"></div>';
  html += '<div class="ctx-section">';
  html += '  <div class="ctx-label">Actions</div>';
  html += '  <div class="ctx-row">';
  html += '    <button class="ctx-btn" id="ctx-rotate" title="Rotate">↻</button>';
  html += '    <button class="ctx-btn danger" id="ctx-delete" title="Delete">🗑</button>';
  html += '  </div>';
  html += '</div>';

  panel.innerHTML = html;

  // Bind value input
  var valInput = document.getElementById('ctx-value-input');
  valInput.addEventListener('change', function() {
    saveSnapshot();
    comp.value = valInput.value;
    saveToLocalStorage();
    markDirty();
  });
  valInput.addEventListener('keydown', function(e) {
    e.stopPropagation(); // prevent tool shortcuts
    if (e.key === 'Enter') valInput.blur();
  });

  // Bind chips
  panel.querySelectorAll('.ctx-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      valInput.value = chip.dataset.val;
      saveSnapshot();
      comp.value = chip.dataset.val;
      saveToLocalStorage();
      markDirty();
    });
  });

  // Bind actions
  document.getElementById('ctx-rotate').addEventListener('click', function() {
    rotateSelected();
    _lastContextId = null; // force rebuild
  });
  document.getElementById('ctx-delete').addEventListener('click', deleteSelected);
}

function buildTextContext(panel, txt) {
  var html = '';
  html += '<div class="ctx-comp-header">';
  html += '  <div class="ctx-comp-icon">T</div>';
  html += '  <div>';
  html += '    <div class="ctx-comp-name">Text Annotation</div>';
  html += '    <div class="ctx-comp-type">Label</div>';
  html += '  </div>';
  html += '</div>';

  html += '<div class="ctx-section">';
  html += '  <div class="ctx-label">Content</div>';
  html += '  <input class="ctx-input" id="ctx-text-input" value="' + (txt.text || '') + '">';
  html += '</div>';

  html += '<div class="ctx-section">';
  html += '  <div class="ctx-label">Style</div>';
  html += '  <div class="ctx-row">';
  html += '    <button class="ctx-btn' + (txt.bold ? ' active' : '') + '" id="ctx-bold" title="Bold">B</button>';
  html += '    <span style="font-size:11px; color:var(--text-muted); padding:0 4px;">' + txt.fontSize + 'px</span>';
  html += '  </div>';
  html += '</div>';

  html += '<div class="ctx-divider"></div>';
  html += '<div class="ctx-row">';
  html += '  <button class="ctx-btn danger" id="ctx-delete" title="Delete">🗑</button>';
  html += '</div>';

  panel.innerHTML = html;

  var textInput = document.getElementById('ctx-text-input');
  textInput.addEventListener('change', function() {
    if (textInput.value.trim()) {
      saveSnapshot();
      txt.text = textInput.value.trim();
      saveToLocalStorage();
      markDirty();
    }
  });
  textInput.addEventListener('keydown', function(e) {
    e.stopPropagation();
    if (e.key === 'Enter') textInput.blur();
  });

  document.getElementById('ctx-bold').addEventListener('click', function() {
    toggleBoldSelected();
    _lastContextId = null;
  });
  document.getElementById('ctx-delete').addEventListener('click', deleteSelected);
}

function buildWireContext(panel) {
  var wire = state.wires.find(function(w) { return w.id === state.selected.id; });
  var pointCount = wire && wire.points ? wire.points.length : 2;
  var segmentCount = Math.max(1, pointCount - 1);

  var html = '';
  html += '<div class="ctx-comp-header">';
  html += '  <div class="ctx-comp-icon">╱</div>';
  html += '  <div>';
  html += '    <div class="ctx-comp-name">Wire</div>';
  html += '    <div class="ctx-comp-type">' + segmentCount + ' segment' + (segmentCount > 1 ? 's' : '') + ', ' + pointCount + ' points</div>';
  html += '  </div>';
  html += '</div>';

  html += '<div class="ctx-hint" style="margin-bottom:10px;">Double-click a segment to add a bend point. Drag points to reshape.</div>';

  html += '<div class="ctx-row">';
  html += '  <button class="ctx-btn danger" id="ctx-delete" title="Delete">🗑</button>';
  html += '</div>';

  panel.innerHTML = html;
  document.getElementById('ctx-delete').addEventListener('click', deleteSelected);
}

/* ========================================
   ZOOM HELPERS
   ======================================== */

function zoomBy(factor) {
  var cx = canvas.width / 2;
  var cy = canvas.height / 2;
  var worldPos = screenToWorld(cx, cy);
  var newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom * factor));
  state.offset.x = cx - worldPos.x * newZoom;
  state.offset.y = cy - worldPos.y * newZoom;
  state.zoom = newZoom;
  markDirty();
}

/* --- Update Bottom Bar --- */

function updateBottomBar() {
  var zoomEl = document.getElementById('zoom-display');
  var compEl = document.getElementById('component-count');
  var wireEl = document.getElementById('wire-count');

  if (zoomEl) zoomEl.textContent = Math.round(state.zoom * 100) + '%';
  if (compEl) compEl.textContent = state.components.length + ' components';
  if (wireEl) wireEl.textContent = state.wires.length + ' wires';
}

/* ========================================
   MODAL SYSTEM
   ======================================== */

var _modalCallbacks = {};

function initModalBindings() {
  // Value Edit Modal
  document.getElementById('modal-value-save').addEventListener('click', function() {
    var input = document.getElementById('modal-value-input');
    if (_modalCallbacks.valueSave) {
      _modalCallbacks.valueSave(input.value);
    }
    closeModal('modal-value-edit');
  });

  document.getElementById('modal-value-cancel').addEventListener('click', function() {
    closeModal('modal-value-edit');
  });

  document.getElementById('modal-value-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('modal-value-save').click();
    if (e.key === 'Escape') closeModal('modal-value-edit');
  });

  // Text Edit Modal
  document.getElementById('modal-text-save').addEventListener('click', function() {
    var input = document.getElementById('modal-text-input');
    if (_modalCallbacks.textSave) {
      _modalCallbacks.textSave(input.value.trim());
    }
    closeModal('modal-text-edit');
  });

  document.getElementById('modal-text-cancel').addEventListener('click', function() {
    closeModal('modal-text-edit');
  });

  document.getElementById('modal-text-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('modal-text-save').click();
    if (e.key === 'Escape') closeModal('modal-text-edit');
  });

  // Symbol buttons → insert at cursor position
  document.querySelectorAll('.symbol-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var symbol = btn.dataset.symbol;
      insertAtCursor('modal-text-input', symbol);
    });
  });

  // Template buttons → append to input
  document.querySelectorAll('.symbol-template-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var template = btn.dataset.template;
      var input = document.getElementById('modal-text-input');
      if (input.value.length > 0 && !input.value.endsWith(' ')) {
        input.value += ' ';
      }
      input.value += template;
      input.focus();
    });
  });

  // Reset Modal
  document.getElementById('modal-reset-confirm').addEventListener('click', function() {
    resetState();
    closeModal('modal-reset');
  });

  document.getElementById('modal-reset-cancel').addEventListener('click', function() {
    closeModal('modal-reset');
  });

  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function openModal(id) {
  var overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.offsetHeight; // reflow
  overlay.classList.add('active');
}

function closeModal(id) {
  var overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('active');
  setTimeout(function() { overlay.classList.add('hidden'); }, 120);
  _modalCallbacks = {};
}

/* --- Value Edit Modal --- */

function openValueEditModal(comp) {
  var def = COMPONENT_DEFS[comp.type];
  var unitInfo = COMPONENT_UNITS[comp.type] || {};

  document.getElementById('modal-comp-icon').textContent = def.icon || def.abbrev;
  document.getElementById('modal-comp-name').textContent = def.name;
  document.getElementById('modal-comp-type').textContent = unitInfo.category || 'Component';

  var input = document.getElementById('modal-value-input');
  input.value = comp.value || '';
  input.placeholder = 'e.g. ' + ((unitInfo.examples && unitInfo.examples[0]) || 'value');

  var chipsContainer = document.getElementById('modal-unit-chips');
  chipsContainer.innerHTML = '';
  if (unitInfo.examples) {
    unitInfo.examples.forEach(function(example) {
      var chip = document.createElement('button');
      chip.className = 'unit-chip';
      chip.textContent = example;
      chip.addEventListener('click', function() {
        input.value = example;
        input.focus();
      });
      chipsContainer.appendChild(chip);
    });
  }

  var guideEl = document.getElementById('modal-si-guide');
  if (unitInfo.guide) {
    guideEl.textContent = unitInfo.guide;
    guideEl.style.display = '';
  } else {
    guideEl.style.display = 'none';
  }

  _modalCallbacks.valueSave = function(value) {
    saveSnapshot();
    comp.value = value;
    saveToLocalStorage();
    markDirty();
    _lastContextId = null; // force context panel update
  };

  openModal('modal-value-edit');
  setTimeout(function() { input.focus(); input.select(); }, 100);
}

/* --- Text Edit Modal --- */

function openTextEditModal(textObj, isNew, createCallback) {
  var titleEl = document.getElementById('modal-text-title');
  var input = document.getElementById('modal-text-input');

  if (isNew) {
    titleEl.textContent = 'Add Text Annotation';
    input.value = '';
    input.placeholder = 'Enter text...';
    _modalCallbacks.textSave = function(text) {
      if (text && createCallback) createCallback(text);
    };
  } else {
    titleEl.textContent = 'Edit Text';
    input.value = textObj ? textObj.text : '';
    input.placeholder = 'Edit text...';
    _modalCallbacks.textSave = function(text) {
      if (text && textObj) {
        saveSnapshot();
        textObj.text = text;
        saveToLocalStorage();
        markDirty();
        _lastContextId = null;
      }
    };
  }

  openModal('modal-text-edit');
  setTimeout(function() { input.focus(); input.select(); }, 100);
}

/* --- Reset Modal --- */

function openResetModal() {
  openModal('modal-reset');
}

/* ========================================
   EXPORT SETTINGS MODAL
   ======================================== */

function initExportModalBindings() {
  // Cancel
  document.getElementById('modal-export-cancel').addEventListener('click', function() {
    closeModal('modal-export');
  });

  // Confirm → run export
  document.getElementById('modal-export-confirm').addEventListener('click', function() {
    var settings = getExportSettings();
    var formatEl = document.querySelector('input[name="export-a4-format"]:checked');
    var format = formatEl ? formatEl.value : 'png';
    closeModal('modal-export');
    setTimeout(function() {
      exportA4(format, settings);
    }, 150);
  });

  // Scale mode → enable/disable custom slider
  var scaleRadios = document.querySelectorAll('input[name="export-scale"]');
  var slider = document.getElementById('export-custom-scale');
  var sliderLabel = document.getElementById('export-custom-label');

  scaleRadios.forEach(function(radio) {
    radio.addEventListener('change', function() {
      if (radio.value === 'custom') {
        slider.disabled = false;
      } else {
        slider.disabled = true;
      }
    });
  });

  // Slider value label
  if (slider) {
    slider.addEventListener('input', function() {
      if (sliderLabel) sliderLabel.textContent = slider.value + '%';
    });
  }

  // Close on overlay click
  var overlay = document.getElementById('modal-export');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal('modal-export');
    });
  }
}

function openExportModal() {
  openModal('modal-export');
}

/* ========================================
   SYMBOL INSERTION HELPER
   Inserts text at cursor position
   ======================================== */

function insertAtCursor(inputId, text) {
  var input = document.getElementById(inputId);
  if (!input) return;

  var start = input.selectionStart || 0;
  var end = input.selectionEnd || 0;
  var before = input.value.substring(0, start);
  var after = input.value.substring(end);

  input.value = before + text + after;

  // Set cursor position after inserted text
  var newPos = start + text.length;
  input.focus();
  input.setSelectionRange(newPos, newPos);
}
