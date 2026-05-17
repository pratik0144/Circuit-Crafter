/* ========================================
   ui.js — Floating toolbars, pickers,
   context panel, modals
   ======================================== */

/* --- HTML Escape Utility (XSS Prevention) --- */
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g, '&#39;');
}

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
  vcvs:        { category: 'Dep. Source', units: [], examples: ['2', '5', '10'], guide: 'Enter coefficient (e.g. 2, 5, 10)' },
  cccvs:       { category: 'Dep. Source', units: [], examples: ['2', '5', '10'], guide: 'Enter coefficient (e.g. 2, 5, 10)' },
  vccs:        { category: 'Dep. Source', units: [], examples: ['0.1', '0.5', '2'], guide: 'Enter coefficient (e.g. 0.1, 0.5, 2)' },
  cccs:        { category: 'Dep. Source', units: [], examples: ['2', '5', '10'], guide: 'Enter coefficient (e.g. 2, 5, 10)' }
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

  document.getElementById('library-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    closeComponentPicker();
    if (typeof ensureLibraryModalBuilt === 'function') ensureLibraryModalBuilt();
    document.getElementById('library-modal').style.display = 'flex';
  });

  document.getElementById('library-close-btn').addEventListener('click', function() {
    document.getElementById('library-modal').style.display = 'none';
  });

  // Component picker items (for legacy + More Components dropdown)
  document.querySelectorAll('.picker-item').forEach(function(item) {
    item.addEventListener('click', function() {
      activateComponent(item.dataset.type);
      closeComponentPicker();
    });
  });

  // Close picker on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#component-picker') && !e.target.closest('#more-comps-btn') && !e.target.closest('#library-btn')) {
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

  // Initial UI render
  updateBottomBar();
  updateContextPanel();
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
  // Clean up any in-progress actions
  cancelWireDrawing();
  state.tool = 'place';
  state.placingComponent = type;
  state.isDragging = false;
  state.dragStart = null;
  state.dragWirePoint = null;
  state.selectAllActive = false;

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
  var genDef = (typeof GENERATED_COMPONENT_DEFS !== 'undefined') ? GENERATED_COMPONENT_DEFS[comp.type] : null;
  var unitInfo = COMPONENT_UNITS[comp.type] || {};

  // Resolve display info from legacy def OR generated def
  var iconText, nameText, categoryText;
  if (def) {
    iconText = def.icon || def.abbrev;
    nameText = def.name;
    categoryText = unitInfo.category || '';
  } else if (genDef) {
    iconText = genDef.displayName ? genDef.displayName.substring(0, 2).toUpperCase() : '⚡';
    nameText = genDef.displayName || comp.type;
    categoryText = (genDef.category || 'Component') + ' • ' + (genDef.pins ? genDef.pins.length : 0) + ' pins';
  } else {
    iconText = '?';
    nameText = comp.type;
    categoryText = 'Unknown';
  }

  var html = '';
  html += '<div class="ctx-comp-header">';
  html += '  <div class="ctx-comp-icon">' + escapeHTML(iconText) + '</div>';
  html += '  <div>';
  html += '    <div class="ctx-comp-name">' + escapeHTML(nameText) + '</div>';
  html += '    <div class="ctx-comp-type">' + escapeHTML(categoryText) + '</div>';
  html += '  </div>';
  html += '</div>';

  // Value section
  html += '<div class="ctx-section">';
  html += '  <div class="ctx-label">Value</div>';
  html += '  <div class="ctx-row">';
  html += '    <input class="ctx-input" id="ctx-value-input" value="' + escapeHTML(comp.value || '') + '" placeholder="e.g. ' + escapeHTML((unitInfo.examples && unitInfo.examples[0]) || (genDef ? 'U1' : '')) + '">';
  html += '  </div>';

  if (unitInfo.examples && unitInfo.examples.length > 0) {
    html += '  <div class="ctx-chips">';
    unitInfo.examples.forEach(function(ex) {
      html += '<button class="ctx-chip" data-val="' + escapeHTML(ex) + '">' + escapeHTML(ex) + '</button>';
    });
    html += '  </div>';
  }
  if (unitInfo.guide) {
    html += '  <div class="ctx-hint">' + escapeHTML(unitInfo.guide) + '</div>';
  } else if (genDef) {
    html += '  <div class="ctx-hint">Enter a custom label for this component</div>';
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
  html += '  <input class="ctx-input" id="ctx-text-input" value="' + escapeHTML(txt.text || '') + '">';
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
  var genDef = typeof GENERATED_COMPONENT_DEFS !== 'undefined' ? GENERATED_COMPONENT_DEFS[comp.type] : null;
  var unitInfo = COMPONENT_UNITS[comp.type] || {};

  var iconEl = document.getElementById('modal-comp-icon');
  var nameEl = document.getElementById('modal-comp-name');
  var typeEl = document.getElementById('modal-comp-type');

  if (def) {
    // Legacy component
    iconEl.textContent = def.icon || def.abbrev;
    nameEl.textContent = def.name;
    typeEl.textContent = unitInfo.category || 'Component';
  } else if (genDef) {
    // Generated component
    iconEl.textContent = genDef.displayName ? genDef.displayName.substring(0, 2).toUpperCase() : '⚡';
    nameEl.textContent = genDef.displayName || comp.type;
    typeEl.textContent = (genDef.category || 'Generated') + ' • ' + (genDef.pins ? genDef.pins.length : 0) + ' pins';
  } else {
    iconEl.textContent = '?';
    nameEl.textContent = comp.type;
    typeEl.textContent = 'Unknown Component';
  }

  var input = document.getElementById('modal-value-input');
  input.value = comp.value || '';

  if (def && unitInfo.examples) {
    input.placeholder = 'e.g. ' + unitInfo.examples[0];
  } else if (genDef) {
    input.placeholder = 'Custom label (e.g. U1, IC2)';
  } else {
    input.placeholder = 'value';
  }

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

  // For generated components: add Show/Hide toggles
  if (genDef) {
    // 1. Pin Labels Toggle
    var pinToggle = document.createElement('button');
    pinToggle.className = 'unit-chip';
    var pinHidden = comp.showPinLabels === false;
    pinToggle.textContent = pinHidden ? '👁 Show Pin Details' : '🚫 Hide Pin Details';
    pinToggle.style.background = pinHidden ? '#2d5a2d' : '#5a2d2d';
    pinToggle.addEventListener('click', function() {
      saveSnapshot();
      comp.showPinLabels = pinHidden ? true : false;
      pinHidden = !pinHidden;
      pinToggle.textContent = pinHidden ? '👁 Show Pin Details' : '🚫 Hide Pin Details';
      pinToggle.style.background = pinHidden ? '#2d5a2d' : '#5a2d2d';
      saveToLocalStorage();
      markDirty();
    });
    chipsContainer.appendChild(pinToggle);

    // 2. Component Name Toggle
    var nameToggle = document.createElement('button');
    nameToggle.className = 'unit-chip';
    var nameHidden = comp.showComponentName === false;
    nameToggle.textContent = nameHidden ? '👁 Show Comp Name' : '🚫 Hide Comp Name';
    nameToggle.style.background = nameHidden ? '#2d5a2d' : '#5a2d2d';
    nameToggle.addEventListener('click', function() {
      saveSnapshot();
      comp.showComponentName = nameHidden ? true : false;
      nameHidden = !nameHidden;
      nameToggle.textContent = nameHidden ? '👁 Show Comp Name' : '🚫 Hide Comp Name';
      nameToggle.style.background = nameHidden ? '#2d5a2d' : '#5a2d2d';
      saveToLocalStorage();
      markDirty();
    });
    chipsContainer.appendChild(nameToggle);
  }

  var guideEl = document.getElementById('modal-si-guide');
  if (unitInfo.guide) {
    guideEl.textContent = unitInfo.guide;
    guideEl.style.display = '';
  } else if (genDef) {
    guideEl.textContent = 'Enter a custom label for this component. Leave blank to use the default name.';
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

/* ========================================
   LIBRARY MODAL LOGIC
   ======================================== */

window.buildLibraryModal = function(bundle) {
  var grid = document.getElementById('library-grid');
  var searchInput = document.getElementById('library-search');
  var categorySelect = document.getElementById('library-category-filter');
  if (!grid || !searchInput || !categorySelect) return;

  var components = bundle.components;

  // PDF-ordered category list (exact order from CircuitCrafter_Component_Library.pdf)
  var PDF_CATEGORY_ORDER = [
    'Passive Components',
    'Diodes & Rectifiers',
    'Bipolar Transistors (BJT)',
    'Field-Effect Transistors (FET)',
    'Thyristors & Power Semiconductors',
    'Op-Amps & Comparators',
    'Logic Gates & Combinational ICs',
    'Sequential Logic & Flip-Flops',
    'Timers & Oscillators',
    'Analog ICs & Regulators',
    'Microcontrollers & Processors',
    'Memory ICs',
    'Interface & Communication ICs',
    'Sensors & Transducers',
    'Displays & Indicators',
    'Actuators & Electromechanical',
    'Switches Relays & Push-buttons',
    'Power Sources & Batteries',
    'Connectors & Terminals',
    'Protection & Conditioning',
    'RF Antenna & Wireless',
    'Filters & Signal Processing',
    'Power Electronics & Drives',
    'Measurement & Test Instruments',
    'Electroacoustic & Audio',
    'Optoelectronics & Photonics',
    'MEMS Emerging & Nanotechnology',
    'High Voltage & Electrical Power',
    'Development Boards'
  ];

  // Merge orphan categories into their parent
  var CATEGORY_MERGE = {
    'Passives': 'Passive Components',
    'Sensors': 'Sensors & Transducers',
    'ICs': 'Microcontrollers & Processors'
  };

  // Normalize component categories
  components.forEach(function(c) {
    if (CATEGORY_MERGE[c.category]) {
      c.category = CATEGORY_MERGE[c.category];
    }
  });

  // Build category map
  var categoryMap = {};
  components.forEach(function(c) {
    var cat = c.category || 'Uncategorized';
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(c);
  });

  // Build ordered category list (PDF order first, then any remaining)
  var orderedCategories = [];
  PDF_CATEGORY_ORDER.forEach(function(cat) {
    if (categoryMap[cat]) orderedCategories.push(cat);
  });
  Object.keys(categoryMap).forEach(function(cat) {
    if (orderedCategories.indexOf(cat) === -1) orderedCategories.push(cat);
  });

  // Populate category dropdown
  categorySelect.innerHTML = '<option value="all">All Categories (' + components.length + ')</option>';
  orderedCategories.forEach(function(cat) {
    var option = document.createElement('option');
    option.value = cat;
    option.textContent = cat + ' (' + categoryMap[cat].length + ')';
    categorySelect.appendChild(option);
  });

  // Category emoji map
  var CATEGORY_ICONS = {
    'Passive Components': '⚡', 'Diodes & Rectifiers': '▷', 'Bipolar Transistors (BJT)': '🔌',
    'Field-Effect Transistors (FET)': '🔌', 'Thyristors & Power Semiconductors': '⚡',
    'Op-Amps & Comparators': '△', 'Logic Gates & Combinational ICs': '🔲',
    'Sequential Logic & Flip-Flops': '🔁', 'Timers & Oscillators': '⏱',
    'Analog ICs & Regulators': '📉', 'Microcontrollers & Processors': '🖥',
    'Memory ICs': '💾', 'Interface & Communication ICs': '📡',
    'Sensors & Transducers': '🌡', 'Displays & Indicators': '📺',
    'Actuators & Electromechanical': '⚙', 'Switches Relays & Push-buttons': '🔘',
    'Power Sources & Batteries': '🔋', 'Connectors & Terminals': '🔗',
    'Protection & Conditioning': '🛡', 'RF Antenna & Wireless': '📶',
    'Filters & Signal Processing': '🎛', 'Power Electronics & Drives': '⚡',
    'Measurement & Test Instruments': '📊', 'Electroacoustic & Audio': '🔊',
    'Optoelectronics & Photonics': '💡', 'MEMS Emerging & Nanotechnology': '🔬',
    'High Voltage & Electrical Power': '🏭', 'Development Boards': '🧩'
  };

  // Track collapsed state
  var collapsedState = {};

  function renderComponents() {
    var filterText = searchInput.value.toLowerCase().trim();
    var filterCat = categorySelect.value;

    grid.innerHTML = '';
    grid.style.display = 'block'; // Switch from grid to block for sections

    var categoriesToShow = filterCat === 'all' ? orderedCategories : [filterCat];

    categoriesToShow.forEach(function(cat) {
      var catComponents = categoryMap[cat] || [];

      // Filter components by search
      var filtered = catComponents.filter(function(comp) {
        if (!filterText) return true;
        var searchable = (comp.id + ' ' + comp.displayName + ' ' + (comp.category || '')).toLowerCase();
        if (comp.keywords) searchable += ' ' + comp.keywords.join(' ');
        return searchable.indexOf(filterText) !== -1;
      });

      if (filtered.length === 0) return;

      // Auto-expand when searching
      if (filterText) collapsedState[cat] = false;

      // Category section header
      var section = document.createElement('div');
      section.style.marginBottom = '16px';

      var header = document.createElement('button');
      header.style.cssText = 'width:100%;display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--toolbar-bg);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-family:inherit;font-size:0.95em;font-weight:600;text-align:left;';
      var isCollapsed = collapsedState[cat] === true;
      var arrow = isCollapsed ? '▶' : '▼';
      var icon = CATEGORY_ICONS[cat] || '📦';
      header.innerHTML = '<span style="font-size:0.8em;transition:transform 0.2s">' + arrow + '</span> ' +
        '<span>' + icon + '</span> ' +
        '<span style="flex:1">' + cat + '</span>' +
        '<span style="color:var(--text-muted);font-weight:400;font-size:0.85em">' + filtered.length + ' component' + (filtered.length !== 1 ? 's' : '') + '</span>';

      header.addEventListener('click', function() {
        collapsedState[cat] = !collapsedState[cat];
        renderComponents();
      });

      section.appendChild(header);

      // Component grid (collapsible)
      if (!isCollapsed) {
        var compGrid = document.createElement('div');
        compGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;padding:8px 0 0 0;';

        filtered.forEach(function(comp) {
          var btn = document.createElement('button');
          btn.className = 'picker-item';
          btn.style.cssText = 'flex-direction:column;align-items:center;justify-content:center;padding:12px 8px;height:80px;';

          var iconSpan = document.createElement('span');
          iconSpan.className = 'picker-item-icon';
          iconSpan.style.cssText = 'font-size:1.3em;margin-bottom:6px;font-weight:bold;';
          iconSpan.textContent = comp.displayName.substring(0, 2).toUpperCase();

          var labelSpan = document.createElement('span');
          labelSpan.className = 'picker-item-label';
          labelSpan.style.cssText = 'text-align:center;white-space:normal;line-height:1.2;font-size:0.8em;overflow:hidden;max-height:2.4em;';
          labelSpan.textContent = comp.displayName;

          btn.appendChild(iconSpan);
          btn.appendChild(labelSpan);

          btn.addEventListener('click', function() {
            activateComponent(comp.id);
            document.getElementById('library-modal').style.display = 'none';
          });

          compGrid.appendChild(btn);
        });

        section.appendChild(compGrid);
      }

      grid.appendChild(section);
    });

    // Empty state
    if (grid.children.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);';
      empty.textContent = 'No components match "' + searchInput.value + '"';
      grid.appendChild(empty);
    }
  }

  // Bind events
  searchInput.addEventListener('input', renderComponents);
  categorySelect.addEventListener('change', renderComponents);

  // Initial render
  renderComponents();
};
