/* ========================================
   library-loader.js — Dynamic Component Library Loader

   Fetches library_bundle.json at page load to populate
   GENERATED_COMPONENT_DEFS for canvas rendering.
   Library modal UI is built lazily on first open.
   ======================================== */

var GENERATED_COMPONENT_DEFS = {};
var _catalogLoaded = false;
var _libraryBundle = null;
var _libraryModalBuilt = false;

/**
 * Load the generated component library.
 * Called once at page initialization.
 * Component defs are loaded eagerly (needed for canvas rendering).
 * Library modal DOM is built lazily on first open.
 */
function loadGeneratedLibrary() {
  fetch('library/library_bundle.json')
    .then(function(resp) {
      if (!resp.ok) {
        console.warn('[Library] No library_bundle.json found — generated library not available');
        return null;
      }
      return resp.json();
    })
    .then(function(bundle) {
      if (!bundle || !bundle.components) return;
      console.log('[Library] Loading ' + bundle.components.length + ' generated components from bundle...');

      // Register all components in generated defs (needed for canvas rendering)
      bundle.components.forEach(function(compDef) {
        GENERATED_COMPONENT_DEFS[compDef.id] = compDef;
      });

      _catalogLoaded = true;
      _libraryBundle = bundle;
      console.log('[Library] Loaded ' + Object.keys(GENERATED_COMPONENT_DEFS).length + ' components');

      // Re-render canvas so any previously placed generated components appear
      if (typeof markDirty === 'function') markDirty();
    })
    .catch(function(err) {
      console.warn('[Library] Library load failed:', err);
    });
}

/**
 * Build the library modal UI on demand (lazy).
 * Called on first library button click.
 */
function ensureLibraryModalBuilt() {
  if (_libraryModalBuilt) return;
  if (!_libraryBundle) {
    console.warn('[Library] Bundle not loaded yet');
    return;
  }
  if (typeof window.buildLibraryModal === 'function') {
    window.buildLibraryModal(_libraryBundle);
    _libraryModalBuilt = true;
    console.log('[Library] Modal UI built lazily');
  }
}
