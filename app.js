(() => {
  'use strict';

  const PAPER_SIZES = {
    a4: { label: 'A4', mmW: 210, mmH: 297 },
    a5: { label: 'A5', mmW: 148, mmH: 210 },
    a3: { label: 'A3', mmW: 297, mmH: 420 },
    letter: { label: 'US Letter', mmW: 215.9, mmH: 279.4 },
    legal: { label: 'US Legal', mmW: 215.9, mmH: 355.6 },
    'photo-4x6': { label: '4×6" Photo', mmW: 101.6, mmH: 152.4 },
    'photo-5x7': { label: '5×7" Photo', mmW: 127, mmH: 177.8 },
  };

  const CANVAS_PRESETS = {
    '4:3': { width: 1600, height: 1200 },
    '3:4': { width: 1200, height: 1600 },
    '1:1': { width: 1200, height: 1200 },
    '16:9': { width: 1920, height: 1080 },
  };

  const ASPECT_RATIOS = {
    free: null,
    '3:4': 3 / 4,
    '4:3': 4 / 3,
    '1:1': 1,
    '2:3': 2 / 3,
    '3:2': 3 / 2,
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    'id-card': 85.6 / 54,
  };

  const MAX_CANVAS_EDGE = 8192;
  const CORNER_LABELS = ['TL', 'TR', 'BR', 'BL'];
  let nextLayerId = 1;

  const createLayer = (defaultLabel) => ({
    id: `layer-${nextLayerId++}`,
    label: defaultLabel,
    img: null,
    objectUrl: null,
    originalImg: null,
    originalObjectUrl: null,
    originalWidth: 0,
    originalHeight: 0,
    naturalWidth: 0,
    naturalHeight: 0,
    fileName: '',
    rotation: 0,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    placed: false,
    lockAspect: true,
    opacity: 100,
    cropRotation: 0,
    cropMode: 'perspective',
    cropRatioKey: 'free',
    cropRect: null,
    cropQuad: null,
    cropResizeMode: 'none',
    cropResizeScale: 100,
  });

  const state = {
    layers: [createLayer('Front'), createLayer('Back')],
    selectedLayerId: null,
    canvasPreset: '4:3',
    paperOrientation: 'portrait',
    paperDpi: 300,
    canvasWidth: 1600,
    canvasHeight: 1200,
    autoMargin: 32,
    radius: 12,
    bgMode: 'white',
    bgColor: '#f1f5f9',
    snapGuides: true,
    showLabels: false,
    exportScale: 100,
    exportFormat: 'image/png',
    exportQuality: 92,
    theme: 'auto',
    canvasScrollMode: false,
  };

  const renderMeta = {
    originX: 0,
    originY: 0,
    baseW: 1600,
    baseH: 1200,
    outW: 1600,
    outH: 1200,
    viewScale: 1,
    dragFreezeBounds: null,
    activeGuides: { x: [], y: [] },
  };

  const camera = {
    targetLayerId: null,
    stream: null,
    facingMode: 'environment',
    hasCapturedFrame: false,
  };

  const layerUiMap = new Map();

  const el = {
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeLabel: document.getElementById('theme-label'),
    resetAllBtn: document.getElementById('reset-all-btn'),
    addLayerBtn: document.getElementById('add-layer-btn'),
    layersList: document.getElementById('layers-list'),

    canvasPreset: document.getElementById('canvas-preset'),
    paperOptionsWrap: document.getElementById('paper-options-wrap'),
    paperDpi: document.getElementById('paper-dpi'),
    paperPhysicalInfo: document.getElementById('paper-physical-info'),
    canvasCustomDims: document.getElementById('canvas-custom-dims'),
    canvasWidth: document.getElementById('canvas-width'),
    canvasHeight: document.getElementById('canvas-height'),
    autoMarginWrap: document.getElementById('auto-margin-wrap'),
    autoMarginRange: document.getElementById('auto-margin-range'),
    autoMarginOut: document.getElementById('auto-margin-out'),

    helperTrimBtn: document.getElementById('helper-trim-btn'),
    helperCenterBtn: document.getElementById('helper-center-btn'),
    helperMatchBtn: document.getElementById('helper-match-btn'),
    helperIdSizeBtn: document.getElementById('helper-id-size-btn'),
    helperSideBtn: document.getElementById('helper-side-btn'),
    helperStackBtn: document.getElementById('helper-stack-btn'),

    radiusRange: document.getElementById('radius-range'),
    radiusOut: document.getElementById('radius-out'),
    bgColorPicker: document.getElementById('bg-color-picker'),
    snapGuides: document.getElementById('snap-guides'),
    showLabels: document.getElementById('show-labels'),

    exportScaleRange: document.getElementById('export-scale-range'),
    exportScaleOut: document.getElementById('export-scale-out'),
    exportFormat: document.getElementById('export-format'),
    qualityWrap: document.getElementById('quality-wrap'),
    exportQuality: document.getElementById('export-quality'),
    qualityOut: document.getElementById('quality-out'),
    downloadBtn: document.getElementById('download-btn'),
    copyBtn: document.getElementById('copy-btn'),
    printBtn: document.getElementById('print-btn'),

    mobileScrollToggle: document.getElementById('mobile-scroll-toggle'),
    quickFrontBtn: document.getElementById('quick-front-btn'),
    quickBackBtn: document.getElementById('quick-back-btn'),
    canvasStage: document.getElementById('canvas-stage'),
    emptyStage: document.getElementById('empty-stage'),
    previewCanvas: document.getElementById('preview-canvas'),
    outputDimsBadge: document.getElementById('output-dims-badge'),
    statusLive: document.getElementById('status-live'),
    heroUpload0: document.getElementById('hero-upload-0'),
    heroUpload1: document.getElementById('hero-upload-1'),

    cameraDialog: document.getElementById('camera-dialog'),
    cameraTargetLabel: document.getElementById('camera-target-label'),
    cameraVideo: document.getElementById('camera-video'),
    cameraSnapshot: document.getElementById('camera-snapshot'),
    cameraError: document.getElementById('camera-error'),
    cameraFlipBtn: document.getElementById('camera-flip-btn'),
    cameraSnapBtn: document.getElementById('camera-snap-btn'),
    cameraRetakeBtn: document.getElementById('camera-retake-btn'),
    cameraUseBtn: document.getElementById('camera-use-btn'),

    cropDialog: document.getElementById('crop-dialog'),
    cropTargetLabel: document.getElementById('crop-target-label'),
    cropModeHint: document.getElementById('crop-mode-hint'),
    cropCanvas: document.getElementById('crop-canvas'),
    cropFlipRatioBtn: document.getElementById('crop-flip-ratio-btn'),
    cropRotLeftBtn: document.getElementById('crop-rot-left-btn'),
    cropRotRightBtn: document.getElementById('crop-rot-right-btn'),
    cropSelectionDims: document.getElementById('crop-selection-dims'),
    cropResultDims: document.getElementById('crop-result-dims'),
    cropResizeDetails: document.getElementById('crop-resize-details'),
    cropResizeMode: document.getElementById('crop-resize-mode'),
    cropScaleWrap: document.getElementById('crop-scale-wrap'),
    cropResizeScale: document.getElementById('crop-resize-scale'),
    cropResizeScaleOut: document.getElementById('crop-resize-scale-out'),
    cropDimsWrap: document.getElementById('crop-dims-wrap'),
    cropTargetWidth: document.getElementById('crop-target-width'),
    cropTargetHeight: document.getElementById('crop-target-height'),
    cropLockAspect: document.getElementById('crop-lock-aspect'),
    cropResetBtn: document.getElementById('crop-reset-btn'),
    cropApplyBtn: document.getElementById('crop-apply-btn'),
  };

  function announce(message) {
    el.statusLive.textContent = message;
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function syncRangeSlider(input) {
    if (!input) return;
    input.style.setProperty('--attr-min', input.min || '0');
    input.style.setProperty('--attr-max', input.max || '100');
    input.style.setProperty('--control-value', input.value);
  }

  function syncAllSliders() {
    document.querySelectorAll('input[type="range"]').forEach(syncRangeSlider);
  }

  function getLayerById(id) {
    return state.layers.find((l) => l.id === id) || null;
  }

  function getSelectedLayer() {
    return getLayerById(state.selectedLayerId);
  }

  function getEffectiveDims(layer) {
    if (!layer.img) return { w: 0, h: 0 };
    const rotated = layer.rotation % 180 !== 0;
    return {
      w: rotated ? layer.naturalHeight : layer.naturalWidth,
      h: rotated ? layer.naturalWidth : layer.naturalHeight,
    };
  }

  function revokeLayerUrls(layer) {
    if (layer.objectUrl && layer.objectUrl !== layer.originalObjectUrl) {
      URL.revokeObjectURL(layer.objectUrl);
    }
    if (layer.originalObjectUrl) {
      URL.revokeObjectURL(layer.originalObjectUrl);
    }
  }

  function getPaperSpec() {
    const paper = PAPER_SIZES[state.canvasPreset];
    if (!paper) return null;
    const isLandscape = state.paperOrientation === 'landscape';
    const mmW = isLandscape ? Math.max(paper.mmW, paper.mmH) : Math.min(paper.mmW, paper.mmH);
    const mmH = isLandscape ? Math.min(paper.mmW, paper.mmH) : Math.max(paper.mmW, paper.mmH);
    const dpi = Number(state.paperDpi) || 300;
    return {
      label: paper.label,
      mmW,
      mmH,
      dpi,
      w: Math.round((mmW / 25.4) * dpi),
      h: Math.round((mmH / 25.4) * dpi),
    };
  }

  function getActiveCanvasBaseDims() {
    const paper = getPaperSpec();
    if (paper) {
      return { w: paper.w, h: paper.h };
    }
    if (state.canvasPreset === 'custom') {
      return {
        w: clamp(Number(state.canvasWidth) || 1600, 100, MAX_CANVAS_EDGE),
        h: clamp(Number(state.canvasHeight) || 1200, 100, MAX_CANVAS_EDGE),
      };
    }
    if (CANVAS_PRESETS[state.canvasPreset]) {
      const preset = CANVAS_PRESETS[state.canvasPreset];
      return { w: preset.width, h: preset.height };
    }
    return {
      w: clamp(Number(state.canvasWidth) || 1600, 100, MAX_CANVAS_EDGE),
      h: clamp(Number(state.canvasHeight) || 1200, 100, MAX_CANVAS_EDGE),
    };
  }

  function placeLayerInitially(layer) {
    const eff = getEffectiveDims(layer);
    if (!eff.w || !eff.h) return;

    const sheet = getActiveCanvasBaseDims();
    const maxW = sheet.w * 0.44;
    const maxH = sheet.h * 0.52;
    const fit = Math.min(1, maxW / eff.w, maxH / eff.h);

    layer.w = Math.max(40, Math.round(eff.w * fit));
    layer.h = Math.max(40, Math.round(eff.h * fit));

    // Stagger initial placement neatly on the canvas so layers don't completely hide one another
    const loadedOthers = state.layers.filter((l) => l.id !== layer.id && l.img && l.placed);
    const idx = loadedOthers.length;
    if (idx === 0) {
      layer.x = Math.round(sheet.w * 0.06);
      layer.y = Math.round((sheet.h - layer.h) / 2);
    } else if (idx === 1) {
      layer.x = Math.round(sheet.w - layer.w - sheet.w * 0.06);
      layer.y = Math.round((sheet.h - layer.h) / 2);
    } else {
      const offset = (idx % 5) * 48;
      layer.x = Math.round(clamp((sheet.w - layer.w) / 2 + offset, 0, Math.max(0, sheet.w - layer.w)));
      layer.y = Math.round(clamp((sheet.h - layer.h) / 2 + offset, 0, Math.max(0, sheet.h - layer.h)));
    }
    layer.placed = true;
  }

  function loadImageFromFile(layerId, file, sourceLabel) {
    const layer = getLayerById(layerId);
    if (!layer) return;

    const hasImageMime = file && file.type && file.type.startsWith('image/');
    const hasImageExt = file && /\.(png|jpe?g|webp|gif|bmp|svg|avif|heic|heif)$/i.test(file.name || '');
    if (!file || (!hasImageMime && !hasImageExt)) {
      announce('Please choose a valid image file.');
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      revokeLayerUrls(layer);
      layer.img = img;
      layer.objectUrl = nextUrl;
      layer.originalImg = img;
      layer.originalObjectUrl = nextUrl;
      layer.originalWidth = img.naturalWidth;
      layer.originalHeight = img.naturalHeight;
      layer.fileName = file.name || `${sourceLabel || 'capture'}.png`;
      layer.naturalWidth = img.naturalWidth;
      layer.naturalHeight = img.naturalHeight;
      layer.rotation = 0;
      layer.opacity = 100;
      layer.cropRotation = 0;
      layer.cropMode = 'perspective';
      layer.cropRatioKey = 'free';
      layer.cropRect = null;
      layer.cropQuad = null;
      layer.cropResizeMode = 'none';
      layer.cropResizeScale = 100;

      placeLayerInitially(layer);
      state.selectedLayerId = layer.id;

      updateAllUI();
      announce(`Loaded ${layer.label} (${img.naturalWidth} by ${img.naturalHeight} pixels).`);
    };

    img.onerror = () => {
      URL.revokeObjectURL(nextUrl);
      announce('Could not decode the selected image.');
    };

    img.src = nextUrl;
  }

  function clearOrRemoveLayer(layerId) {
    const idx = state.layers.findIndex((l) => l.id === layerId);
    if (idx === -1) return;
    const layer = state.layers[idx];

    if (state.layers.length > 2 || (layer.img && state.layers.length <= 2)) {
      if (state.layers.length > 2 && !layer.img) {
        state.layers.splice(idx, 1);
        if (state.selectedLayerId === layerId) state.selectedLayerId = null;
        rebuildLayerList();
        updateAllUI();
        return;
      }
      if (state.layers.length > 2 && layer.img) {
        revokeLayerUrls(layer);
        state.layers.splice(idx, 1);
        if (state.selectedLayerId === layerId) {
          state.selectedLayerId = state.layers[Math.max(0, idx - 1)]?.id || null;
        }
        rebuildLayerList();
        updateAllUI();
        announce(`Removed ${layer.label}.`);
        return;
      }
    }

    revokeLayerUrls(layer);
    const label = layer.label;
    const replacement = createLayer(label);
    replacement.id = layer.id;
    state.layers[idx] = replacement;
    if (state.selectedLayerId === layerId) {
      state.selectedLayerId = state.layers.find((l) => l.img)?.id || null;
    }
    rebuildLayerList();
    updateAllUI();
    announce(`Cleared ${label}.`);
  }

  function moveLayerOrder(layerId, delta) {
    const idx = state.layers.findIndex((l) => l.id === layerId);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= state.layers.length) return;
    const [item] = state.layers.splice(idx, 1);
    state.layers.splice(nextIdx, 0, item);
    rebuildLayerList();
    updateAllUI();
  }

  function rotateLayer(layerId, delta) {
    const layer = getLayerById(layerId);
    if (!layer || !layer.img) return;
    layer.rotation = (layer.rotation + delta) % 360;
    const cx = layer.x + layer.w / 2;
    const cy = layer.y + layer.h / 2;
    const oldW = layer.w;
    layer.w = layer.h;
    layer.h = oldW;
    layer.x = Math.round(cx - layer.w / 2);
    layer.y = Math.round(cy - layer.h / 2);
    updateAllUI();
  }

  function createLayerCardElement(layer, index) {
    const card = document.createElement('article');
    card.className = 'slot-card';
    card.dataset.layerId = layer.id;

    card.innerHTML = `
      <header class="slot-header">
        <div class="slot-title-group">
          <span class="slot-position-badge" data-role="layer-badge">Layer ${index + 1}</span>
          <input type="text" class="slot-label-input" data-role="label-input" maxlength="24" aria-label="Image label">
        </div>
        <div class="slot-header-actions">
          <button type="button" class="icon-btn" data-action="bring-up" aria-label="Bring forward" title="Bring forward">↑</button>
          <button type="button" class="icon-btn" data-action="send-down" aria-label="Send backward" title="Send backward">↓</button>
          <button type="button" class="icon-btn" data-action="rotate-left" aria-label="Rotate left 90 degrees" title="Rotate left">↺</button>
          <button type="button" class="icon-btn" data-action="rotate-right" aria-label="Rotate right 90 degrees" title="Rotate right">↻</button>
          <button type="button" class="icon-btn danger" data-action="clear" aria-label="Remove image" title="Remove image">✕</button>
        </div>
      </header>

      <div class="dropzone" data-role="dropzone" tabindex="0" role="region" aria-label="Image upload dropzone">
        <img class="slot-thumb" data-role="thumb" alt="" hidden>
        <div class="dropzone-empty" data-role="empty">
          <span class="dropzone-title">Drop image here</span>
          <span class="dropzone-meta" data-role="meta">No image loaded</span>
        </div>
      </div>

      <div class="slot-input-actions">
        <label class="btn btn-small btn-primary file-btn">
          Upload
          <input type="file" accept="image/*" class="visually-hidden" data-role="file-input">
        </label>
        <button type="button" class="btn btn-small btn-secondary" data-action="camera">📷 Camera</button>
        <label class="btn btn-small btn-ghost file-btn native-cam-btn" title="Use device native camera">
          Device Cam
          <input type="file" accept="image/*" capture="environment" class="visually-hidden" data-role="native-cam-input">
        </label>
        <button type="button" class="btn btn-small btn-secondary" data-action="crop" disabled>✂ Crop / Straighten</button>
      </div>

      <details class="slot-adjustments" data-role="adjustments">
        <summary>Position, Size &amp; Opacity</summary>
        <div class="adjust-grid">
          <div class="layer-pos-grid">
            <label class="field-inline">
              <span>X (px)</span>
              <input type="number" class="number-input" data-prop="x" step="1">
            </label>
            <label class="field-inline">
              <span>Y (px)</span>
              <input type="number" class="number-input" data-prop="y" step="1">
            </label>
            <label class="field-inline">
              <span>Width (px)</span>
              <input type="number" class="number-input" data-prop="w" min="16" max="8000" step="1">
            </label>
            <label class="field-inline">
              <span>Height (px)</span>
              <input type="number" class="number-input" data-prop="h" min="16" max="8000" step="1">
            </label>
          </div>

          <div class="control-row">
            <div class="control-label-row">
              <label for="${layer.id}-opacity">Opacity</label>
              <output id="${layer.id}-opacity-out" data-role="opacity-out">100%</output>
            </div>
            <input type="range" id="${layer.id}-opacity" data-prop="opacity" min="10" max="100" value="100" step="2">
          </div>

          <div class="control-row-inline">
            <label class="checkbox-row">
              <input type="checkbox" data-prop="lockAspect" checked>
              <span>Lock aspect</span>
            </label>
            <button type="button" class="btn btn-small btn-ghost" data-action="reset-size">Reset Size</button>
            <span class="dim-badge" data-role="dims">—</span>
          </div>
        </div>
      </details>
    `;

    const refs = {
      card,
      badge: card.querySelector('[data-role="layer-badge"]'),
      labelInput: card.querySelector('[data-role="label-input"]'),
      dropzone: card.querySelector('[data-role="dropzone"]'),
      thumb: card.querySelector('[data-role="thumb"]'),
      empty: card.querySelector('[data-role="empty"]'),
      meta: card.querySelector('[data-role="meta"]'),
      dims: card.querySelector('[data-role="dims"]'),
      fileInput: card.querySelector('[data-role="file-input"]'),
      nativeCamInput: card.querySelector('[data-role="native-cam-input"]'),
      cropBtn: card.querySelector('[data-action="crop"]'),
      xInput: card.querySelector('[data-prop="x"]'),
      yInput: card.querySelector('[data-prop="y"]'),
      wInput: card.querySelector('[data-prop="w"]'),
      hInput: card.querySelector('[data-prop="h"]'),
      opacityInput: card.querySelector('[data-prop="opacity"]'),
      opacityOut: card.querySelector('[data-role="opacity-out"]'),
      lockAspectInput: card.querySelector('[data-prop="lockAspect"]'),
    };

    refs.labelInput.value = layer.label;

    card.addEventListener('pointerdown', () => {
      if (state.selectedLayerId !== layer.id) {
        state.selectedLayerId = layer.id;
        updateSelectionUI();
        renderPreview();
      }
    });

    refs.labelInput.addEventListener('input', () => {
      layer.label = refs.labelInput.value;
      if (state.showLabels) renderPreview();
    });

    const handleFiles = (files) => {
      if (files?.[0]) loadImageFromFile(layer.id, files[0], 'upload');
    };

    refs.fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = '';
    });

    refs.nativeCamInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = '';
    });

    refs.dropzone.addEventListener('click', () => refs.fileInput.click());
    refs.dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        refs.fileInput.click();
      }
    });

    refs.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      refs.dropzone.classList.add('is-dragover');
    });
    refs.dropzone.addEventListener('dragleave', () => {
      refs.dropzone.classList.remove('is-dragover');
    });
    refs.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      refs.dropzone.classList.remove('is-dragover');
      handleFiles(e.dataTransfer?.files);
    });

    card.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'camera') openCameraForLayer(layer.id);
        else if (action === 'crop') openCropForLayer(layer.id);
        else if (action === 'bring-up') moveLayerOrder(layer.id, 1);
        else if (action === 'send-down') moveLayerOrder(layer.id, -1);
        else if (action === 'rotate-left') rotateLayer(layer.id, 270);
        else if (action === 'rotate-right') rotateLayer(layer.id, 90);
        else if (action === 'clear') clearOrRemoveLayer(layer.id);
        else if (action === 'reset-size') {
          if (!layer.img) return;
          const eff = getEffectiveDims(layer);
          layer.w = eff.w;
          layer.h = eff.h;
          updateLayerCardUI(layer);
          renderPreview();
        }
      });
    });

    refs.xInput.addEventListener('input', () => {
      layer.x = Number(refs.xInput.value) || 0;
      renderPreview();
    });
    refs.yInput.addEventListener('input', () => {
      layer.y = Number(refs.yInput.value) || 0;
      renderPreview();
    });

    refs.wInput.addEventListener('input', () => {
      const nextW = clamp(Number(refs.wInput.value) || 16, 16, MAX_CANVAS_EDGE);
      if (layer.lockAspect && layer.img) {
        const eff = getEffectiveDims(layer);
        const ratio = eff.w / Math.max(1, eff.h);
        layer.h = Math.max(16, Math.round(nextW / ratio));
        refs.hInput.value = String(layer.h);
      }
      layer.w = nextW;
      renderPreview();
    });

    refs.hInput.addEventListener('input', () => {
      const nextH = clamp(Number(refs.hInput.value) || 16, 16, MAX_CANVAS_EDGE);
      if (layer.lockAspect && layer.img) {
        const eff = getEffectiveDims(layer);
        const ratio = eff.w / Math.max(1, eff.h);
        layer.w = Math.max(16, Math.round(nextH * ratio));
        refs.wInput.value = String(layer.w);
      }
      layer.h = nextH;
      renderPreview();
    });

    refs.opacityInput.addEventListener('input', () => {
      layer.opacity = Number(refs.opacityInput.value);
      refs.opacityOut.textContent = `${layer.opacity}%`;
      syncRangeSlider(refs.opacityInput);
      renderPreview();
    });

    refs.lockAspectInput.addEventListener('change', () => {
      layer.lockAspect = refs.lockAspectInput.checked;
    });

    layerUiMap.set(layer.id, refs);
    return card;
  }

  function rebuildLayerList() {
    layerUiMap.clear();
    el.layersList.innerHTML = '';
    state.layers.forEach((layer, idx) => {
      el.layersList.appendChild(createLayerCardElement(layer, idx));
      updateLayerCardUI(layer, idx);
    });
  }

  function updateLayerCardUI(layer, indexOverride) {
    const refs = layerUiMap.get(layer.id);
    if (!refs) return;
    const idx = indexOverride ?? state.layers.indexOf(layer);
    refs.badge.textContent = idx === state.layers.length - 1 ? `Top (#${idx + 1})` : `Layer ${idx + 1}`;
    refs.card.classList.toggle('is-selected', state.selectedLayerId === layer.id);
    refs.cropBtn.disabled = !layer.img;

    if (layer.img) {
      refs.thumb.src = layer.objectUrl;
      refs.thumb.hidden = false;
      refs.empty.hidden = true;
      const eff = getEffectiveDims(layer);
      refs.dims.textContent = `Src: ${eff.w}×${eff.h}`;
      refs.meta.textContent = `${eff.w} × ${eff.h}`;
    } else {
      refs.thumb.removeAttribute('src');
      refs.thumb.hidden = true;
      refs.empty.hidden = false;
      refs.dims.textContent = '—';
      refs.meta.textContent = 'No image loaded';
    }

    if (document.activeElement !== refs.xInput) refs.xInput.value = String(Math.round(layer.x));
    if (document.activeElement !== refs.yInput) refs.yInput.value = String(Math.round(layer.y));
    if (document.activeElement !== refs.wInput) refs.wInput.value = String(Math.round(layer.w));
    if (document.activeElement !== refs.hInput) refs.hInput.value = String(Math.round(layer.h));

    refs.opacityInput.value = String(layer.opacity);
    refs.opacityOut.textContent = `${layer.opacity}%`;
    refs.lockAspectInput.checked = layer.lockAspect;
    syncRangeSlider(refs.opacityInput);
  }

  function updateSelectionUI() {
    state.layers.forEach((l, i) => updateLayerCardUI(l, i));
    const hasSel = Boolean(getSelectedLayer()?.img);
    el.quickFrontBtn.disabled = !hasSel;
    el.quickBackBtn.disabled = !hasSel;
    el.helperCenterBtn.disabled = !hasSel;
  }

  function updateCanvasControlsUI() {
    const paper = getPaperSpec();
    el.paperOptionsWrap.hidden = !paper;
    if (paper) {
      el.paperPhysicalInfo.textContent = `${paper.mmW} × ${paper.mmH} mm · ${paper.w} × ${paper.h} px (${paper.dpi} DPI)`;
    }
    el.canvasCustomDims.hidden = state.canvasPreset !== 'custom';
    el.autoMarginWrap.hidden = state.canvasPreset !== 'auto';
    el.bgColorPicker.hidden = state.bgMode !== 'custom';
    el.canvasStage.classList.toggle('has-checkerboard', state.bgMode === 'transparent');
    el.qualityWrap.hidden = !(state.exportFormat === 'image/jpeg' || state.exportFormat === 'image/webp');
  }

  function updateAllUI() {
    state.layers.forEach((l, idx) => updateLayerCardUI(l, idx));
    updateSelectionUI();
    updateCanvasControlsUI();

    const hasAnyImage = state.layers.some((l) => Boolean(l.img));
    el.downloadBtn.disabled = !hasAnyImage;
    el.copyBtn.disabled = !hasAnyImage;
    el.printBtn.disabled = !hasAnyImage;
    el.helperTrimBtn.disabled = !hasAnyImage;
    el.helperMatchBtn.disabled = !hasAnyImage;
    el.helperIdSizeBtn.disabled = !hasAnyImage;
    el.helperSideBtn.disabled = !hasAnyImage;
    el.helperStackBtn.disabled = !hasAnyImage;
    el.emptyStage.hidden = hasAnyImage;
    el.previewCanvas.hidden = !hasAnyImage;

    renderPreview();
  }

  function computeCanvasMetrics() {
    const loaded = state.layers.filter((l) => l.img);
    if (loaded.length === 0) return null;

    let originX = 0;
    let originY = 0;
    let baseW;
    let baseH;

    if (state.canvasPreset === 'auto') {
      if (renderMeta.dragFreezeBounds) {
        ({ originX, originY, baseW, baseH } = renderMeta.dragFreezeBounds);
      } else {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const l of loaded) {
          minX = Math.min(minX, l.x);
          minY = Math.min(minY, l.y);
          maxX = Math.max(maxX, l.x + l.w);
          maxY = Math.max(maxY, l.y + l.h);
        }
        const m = state.autoMargin;
        originX = minX - m;
        originY = minY - m;
        baseW = Math.max(64, Math.round(maxX - minX + m * 2));
        baseH = Math.max(64, Math.round(maxY - minY + m * 2));
      }
    } else {
      const dims = getActiveCanvasBaseDims();
      baseW = dims.w;
      baseH = dims.h;
    }

    const scaleFactor = state.exportScale / 100;
    let outW = Math.max(1, Math.round(baseW * scaleFactor));
    let outH = Math.max(1, Math.round(baseH * scaleFactor));

    if (outW > MAX_CANVAS_EDGE || outH > MAX_CANVAS_EDGE) {
      const cap = Math.min(MAX_CANVAS_EDGE / outW, MAX_CANVAS_EDGE / outH);
      outW = Math.round(outW * cap);
      outH = Math.round(outH * cap);
    }

    return { originX, originY, baseW, baseH, outW, outH, loaded };
  }

  function getResolvedBackground() {
    if (state.bgMode === 'transparent') {
      return state.exportFormat === 'image/jpeg' ? '#ffffff' : null;
    }
    if (state.bgMode === 'dark') return '#0f172a';
    if (state.bgMode === 'custom') return state.bgColor;
    return '#ffffff';
  }

  function drawRoundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
  }

  function getSelectionHandles(layer) {
    const { x, y, w, h } = layer;
    const mx = x + w / 2;
    const my = y + h / 2;
    return [
      { id: 'nw', x, y, cursor: 'nwse-resize' },
      { id: 'n', x: mx, y, cursor: 'ns-resize' },
      { id: 'ne', x: x + w, y, cursor: 'nesw-resize' },
      { id: 'e', x: x + w, y: my, cursor: 'ew-resize' },
      { id: 'se', x: x + w, y: y + h, cursor: 'nwse-resize' },
      { id: 's', x: mx, y: y + h, cursor: 'ns-resize' },
      { id: 'sw', x, y: y + h, cursor: 'nesw-resize' },
      { id: 'w', x, y: my, cursor: 'ew-resize' },
    ];
  }

  function renderToCanvas(canvas, { isPreview = false, scaleMultiplier = 1 } = {}) {
    const metrics = computeCanvasMetrics();
    if (!metrics) {
      renderMeta.outW = 0;
      renderMeta.outH = 0;
      return null;
    }

    const { originX, originY, baseW, baseH, outW, outH } = metrics;
    const targetW = Math.max(1, Math.round(outW * scaleMultiplier));
    const targetH = Math.max(1, Math.round(outH * scaleMultiplier));

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, targetW, targetH);

    const bg = getResolvedBackground();
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, targetW, targetH);
    }

    const worldToCanvas = targetW / baseW;
    if (isPreview) {
      renderMeta.originX = originX;
      renderMeta.originY = originY;
      renderMeta.baseW = baseW;
      renderMeta.baseH = baseH;
      renderMeta.outW = outW;
      renderMeta.outH = outH;
      renderMeta.viewScale = worldToCanvas;
    }

    ctx.save();
    ctx.scale(worldToCanvas, worldToCanvas);
    ctx.translate(-originX, -originY);

    for (const layer of state.layers) {
      if (!layer.img) continue;

      ctx.save();
      ctx.globalAlpha = clamp(layer.opacity, 0, 100) / 100;
      drawRoundedRectPath(ctx, layer.x, layer.y, layer.w, layer.h, state.radius);
      ctx.clip();

      const cx = layer.x + layer.w / 2;
      const cy = layer.y + layer.h / 2;
      const rotated = layer.rotation % 180 !== 0;
      const rawW = rotated ? layer.h : layer.w;
      const rawH = rotated ? layer.w : layer.h;

      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.drawImage(layer.img, -rawW / 2, -rawH / 2, rawW, rawH);
      ctx.restore();

      if (state.showLabels && layer.label.trim()) {
        ctx.save();
        const fontSize = Math.max(14, Math.round(Math.min(layer.w, layer.h) * 0.065));
        ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = bg === '#0f172a' ? '#e2e8f0' : '#1e293b';
        ctx.fillText(layer.label.trim(), layer.x + layer.w / 2, layer.y + layer.h + 8);
        ctx.restore();
      }
    }

    // Preview-only overlays: snap guides + active selection box & corner resize handles
    if (isPreview) {
      const inv = 1 / Math.max(0.15, worldToCanvas);

      // Snap guides
      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5 * inv;
      ctx.setLineDash([6 * inv, 4 * inv]);
      for (const gx of renderMeta.activeGuides.x) {
        ctx.beginPath();
        ctx.moveTo(gx, originY);
        ctx.lineTo(gx, originY + baseH);
        ctx.stroke();
      }
      for (const gy of renderMeta.activeGuides.y) {
        ctx.beginPath();
        ctx.moveTo(originX, gy);
        ctx.lineTo(originX + baseW, gy);
        ctx.stroke();
      }
      ctx.restore();

      // Selected layer outline & 8 resize handles
      const sel = getSelectedLayer();
      if (sel && sel.img) {
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2 * inv;
        ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);

        const handles = getSelectionHandles(sel);
        const r = 6 * inv;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2 * inv;
        for (const h of handles) {
          ctx.beginPath();
          ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    ctx.restore();
    return metrics;
  }

  function renderPreview() {
    const metrics = computeCanvasMetrics();
    if (!metrics) {
      el.outputDimsBadge.textContent = '0 × 0 px';
      return;
    }

    const maxPreviewEdge = 1600;
    const longest = Math.max(metrics.outW, metrics.outH);
    const previewMultiplier = longest > maxPreviewEdge ? maxPreviewEdge / longest : 1;

    renderToCanvas(el.previewCanvas, { isPreview: true, scaleMultiplier: previewMultiplier });
    const paper = getPaperSpec();
    el.outputDimsBadge.textContent = paper
      ? `${paper.label} · ${metrics.outW} × ${metrics.outH} px`
      : `${metrics.outW} × ${metrics.outH} px`;
  }

  function renderExportCanvas() {
    const exportCanvas = document.createElement('canvas');
    const metrics = renderToCanvas(exportCanvas, { isPreview: false, scaleMultiplier: 1 });
    if (!metrics) return null;
    return { canvas: exportCanvas, metrics };
  }

  function getExportExtension() {
    if (state.exportFormat === 'image/jpeg') return 'jpg';
    if (state.exportFormat === 'image/webp') return 'webp';
    return 'png';
  }

  function downloadCombinedImage() {
    const res = renderExportCanvas();
    if (!res) return;

    const quality = state.exportQuality / 100;
    const ext = getExportExtension();
    const fileName = `cards-freeform-${res.metrics.outW}x${res.metrics.outH}.${ext}`;

    res.canvas.toBlob(
      (blob) => {
        if (!blob) {
          announce('Export failed.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        announce(`Downloaded ${fileName}.`);
      },
      state.exportFormat,
      quality
    );
  }

  async function copyCombinedImage() {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      announce('Clipboard image copy is not supported in this browser. Use Download instead.');
      return;
    }
    const res = renderExportCanvas();
    if (!res) return;

    res.canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        const originalText = el.copyBtn.textContent;
        el.copyBtn.textContent = '✓ Copied';
        announce('Image copied to clipboard.');
        setTimeout(() => {
          el.copyBtn.textContent = originalText;
        }, 1800);
      } catch {
        announce('Could not copy to clipboard. Use Download instead.');
      }
    }, 'image/png');
  }

  function updateDynamicPrintStyle() {
    let styleEl = document.getElementById('dynamic-print-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-print-style';
      document.head.appendChild(styleEl);
    }
    const paper = getPaperSpec();
    if (paper) {
      styleEl.textContent = `@media print { @page { size: ${paper.mmW}mm ${paper.mmH}mm; margin: 0; } }`;
    } else {
      styleEl.textContent = '@media print { @page { margin: 10mm; } }';
    }
  }

  function printCombinedImage() {
    const metrics = computeCanvasMetrics();
    if (!metrics) return;
    updateDynamicPrintStyle();
    renderToCanvas(el.previewCanvas, { isPreview: false, scaleMultiplier: 1 });
    window.print();
    setTimeout(renderPreview, 250);
  }

  // Optional Quick Arrange / Trim Helpers
  function trimCanvasToImages() {
    const loaded = state.layers.filter((l) => l.img);
    if (!loaded.length) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const l of loaded) {
      minX = Math.min(minX, l.x);
      minY = Math.min(minY, l.y);
      maxX = Math.max(maxX, l.x + l.w);
      maxY = Math.max(maxY, l.y + l.h);
    }
    const margin = 32;
    for (const l of loaded) {
      l.x = Math.round(l.x - minX + margin);
      l.y = Math.round(l.y - minY + margin);
    }
    state.canvasPreset = 'custom';
    state.canvasWidth = clamp(Math.round(maxX - minX + margin * 2), 100, MAX_CANVAS_EDGE);
    state.canvasHeight = clamp(Math.round(maxY - minY + margin * 2), 100, MAX_CANVAS_EDGE);
    el.canvasPreset.value = 'custom';
    el.canvasWidth.value = String(state.canvasWidth);
    el.canvasHeight.value = String(state.canvasHeight);
    updateAllUI();
    announce(`Trimmed canvas to ${state.canvasWidth} by ${state.canvasHeight} pixels.`);
  }

  function centerSelectedLayer() {
    const sel = getSelectedLayer();
    if (!sel || !sel.img) return;
    const dims = getActiveCanvasBaseDims();
    sel.x = Math.round(renderMeta.originX + (dims.w - sel.w) / 2);
    sel.y = Math.round(renderMeta.originY + (dims.h - sel.h) / 2);
    updateAllUI();
  }

  function matchLayerSizes() {
    const loaded = state.layers.filter((l) => l.img);
    if (loaded.length < 2) return;
    const ref = getSelectedLayer()?.img ? getSelectedLayer() : loaded[0];
    const targetH = ref.h;
    for (const l of loaded) {
      const eff = getEffectiveDims(l);
      const ratio = eff.w / Math.max(1, eff.h);
      l.h = targetH;
      l.w = Math.max(16, Math.round(targetH * ratio));
    }
    updateAllUI();
    announce('Matched all image heights.');
  }

  function fitToRealIdCardSize() {
    const loaded = state.layers.filter((l) => l.img);
    if (!loaded.length) return;
    const dpi = getPaperSpec()?.dpi || state.paperDpi || 300;
    // Standard ISO/IEC 7810 ID-1 card: 85.60 × 53.98 mm
    const longEdgePx = Math.round((85.6 / 25.4) * dpi);
    const shortEdgePx = Math.round((53.98 / 25.4) * dpi);

    const sel = getSelectedLayer();
    const targets = sel?.img ? [sel] : loaded;

    for (const l of targets) {
      const eff = getEffectiveDims(l);
      const ratio = eff.w / Math.max(1, eff.h);
      const cx = l.x + l.w / 2;
      const cy = l.y + l.h / 2;
      if (ratio >= 1) {
        l.w = longEdgePx;
        l.h = Math.max(24, Math.round(longEdgePx / ratio));
      } else {
        l.h = longEdgePx;
        l.w = Math.max(24, Math.round(longEdgePx * ratio));
      }
      // If card aspect matches 85.6/54 closely, shortEdgePx ~ l.h
      if (Math.abs(l.h - shortEdgePx) <= 6) l.h = shortEdgePx;
      l.x = Math.round(cx - l.w / 2);
      l.y = Math.round(cy - l.h / 2);
    }
    updateAllUI();
    announce(`Sized ${targets.length === 1 ? targets[0].label : 'images'} to real ID card size (85.6 × 54 mm at ${dpi} DPI).`);
  }

  function quickArrange(direction) {
    const loaded = state.layers.filter((l) => l.img);
    if (!loaded.length) return;
    const dims = getActiveCanvasBaseDims();
    const gap = 32;

    if (direction === 'horizontal') {
      const totalW = loaded.reduce((acc, l) => acc + l.w, 0) + gap * (loaded.length - 1);
      let cursorX = Math.round((dims.w - totalW) / 2);
      for (const l of loaded) {
        l.x = cursorX;
        l.y = Math.round((dims.h - l.h) / 2);
        cursorX += l.w + gap;
      }
    } else {
      const totalH = loaded.reduce((acc, l) => acc + l.h, 0) + gap * (loaded.length - 1);
      let cursorY = Math.round((dims.h - totalH) / 2);
      for (const l of loaded) {
        l.x = Math.round((dims.w - l.w) / 2);
        l.y = cursorY;
        cursorY += l.h + gap;
      }
    }
    updateAllUI();
  }

  // Freeform Canvas Pointer Interaction (Move anywhere + 8-handle Resize + Smart Snap Guides)
  function setupCanvasDragging() {
    let interaction = null;

    const toWorldPt = (event) => {
      const rect = el.previewCanvas.getBoundingClientRect();
      const canvasX = ((event.clientX - rect.left) * el.previewCanvas.width) / Math.max(1, rect.width);
      const canvasY = ((event.clientY - rect.top) * el.previewCanvas.height) / Math.max(1, rect.height);
      return {
        x: renderMeta.originX + canvasX / Math.max(0.01, renderMeta.viewScale),
        y: renderMeta.originY + canvasY / Math.max(0.01, renderMeta.viewScale),
      };
    };

    const hitTestCanvas = (worldPt) => {
      const handleRadius = 14 / Math.max(0.15, renderMeta.viewScale);
      const sel = getSelectedLayer();
      if (sel && sel.img) {
        for (const h of getSelectionHandles(sel)) {
          if (Math.hypot(worldPt.x - h.x, worldPt.y - h.y) <= handleRadius) {
            return { type: 'resize', handle: h.id, layer: sel, cursor: h.cursor };
          }
        }
      }

      for (let i = state.layers.length - 1; i >= 0; i--) {
        const l = state.layers[i];
        if (!l.img) continue;
        if (worldPt.x >= l.x && worldPt.x <= l.x + l.w && worldPt.y >= l.y && worldPt.y <= l.y + l.h) {
          return { type: 'move', layer: l, cursor: 'grab' };
        }
      }
      return { type: 'none', cursor: 'default' };
    };

    const computeSnappedPosition = (layer, rawX, rawY) => {
      renderMeta.activeGuides = { x: [], y: [] };
      if (!state.snapGuides) return { x: rawX, y: rawY };

      const thresh = 12 / Math.max(0.2, renderMeta.viewScale);
      const xTargets = [
        renderMeta.originX + renderMeta.baseW / 2,
        renderMeta.originX,
        renderMeta.originX + renderMeta.baseW,
      ];
      const yTargets = [
        renderMeta.originY + renderMeta.baseH / 2,
        renderMeta.originY,
        renderMeta.originY + renderMeta.baseH,
      ];

      for (const other of state.layers) {
        if (!other.img || other.id === layer.id) continue;
        xTargets.push(other.x, other.x + other.w / 2, other.x + other.w);
        yTargets.push(other.y, other.y + other.h / 2, other.y + other.h);
      }

      let bestDx = Infinity;
      let snapX = rawX;
      let guideX = null;
      const layerXs = [
        { val: rawX, offset: 0 },
        { val: rawX + layer.w / 2, offset: -layer.w / 2 },
        { val: rawX + layer.w, offset: -layer.w },
      ];
      for (const lx of layerXs) {
        for (const tx of xTargets) {
          const d = Math.abs(lx.val - tx);
          if (d < thresh && d < bestDx) {
            bestDx = d;
            snapX = tx + lx.offset;
            guideX = tx;
          }
        }
      }

      let bestDy = Infinity;
      let snapY = rawY;
      let guideY = null;
      const layerYs = [
        { val: rawY, offset: 0 },
        { val: rawY + layer.h / 2, offset: -layer.h / 2 },
        { val: rawY + layer.h, offset: -layer.h },
      ];
      for (const ly of layerYs) {
        for (const ty of yTargets) {
          const d = Math.abs(ly.val - ty);
          if (d < thresh && d < bestDy) {
            bestDy = d;
            snapY = ty + ly.offset;
            guideY = ty;
          }
        }
      }

      if (guideX !== null) renderMeta.activeGuides.x.push(guideX);
      if (guideY !== null) renderMeta.activeGuides.y.push(guideY);
      return { x: snapX, y: snapY };
    };

    el.previewCanvas.addEventListener('pointerdown', (e) => {
      if (state.canvasScrollMode) return;
      const worldPt = toWorldPt(e);
      const hit = hitTestCanvas(worldPt);

      if (hit.type === 'none') {
        if (state.selectedLayerId !== null) {
          state.selectedLayerId = null;
          updateSelectionUI();
          renderPreview();
        }
        return;
      }

      const layer = hit.layer;
      if (state.selectedLayerId !== layer.id) {
        state.selectedLayerId = layer.id;
        updateSelectionUI();
      }

      if (state.canvasPreset === 'auto') {
        renderMeta.dragFreezeBounds = {
          originX: renderMeta.originX,
          originY: renderMeta.originY,
          baseW: renderMeta.baseW,
          baseH: renderMeta.baseH,
        };
      }

      interaction = {
        type: hit.type,
        handle: hit.handle,
        layer,
        startWorldX: worldPt.x,
        startWorldY: worldPt.y,
        origBox: { x: layer.x, y: layer.y, w: layer.w, h: layer.h },
      };

      el.previewCanvas.setPointerCapture(e.pointerId);
      el.previewCanvas.classList.add('is-dragging');
      renderPreview();
    });

    el.previewCanvas.addEventListener('pointermove', (e) => {
      const worldPt = toWorldPt(e);
      if (!interaction) {
        el.previewCanvas.style.cursor = hitTestCanvas(worldPt).cursor;
        return;
      }

      const { layer, origBox } = interaction;
      const dx = worldPt.x - interaction.startWorldX;
      const dy = worldPt.y - interaction.startWorldY;

      if (interaction.type === 'move') {
        const snapped = computeSnappedPosition(layer, origBox.x + dx, origBox.y + dy);
        layer.x = Math.round(snapped.x);
        layer.y = Math.round(snapped.y);
      } else if (interaction.type === 'resize') {
        renderMeta.activeGuides = { x: [], y: [] };
        const m = interaction.handle;
        const minSize = 24;
        const keepAspect = layer.lockAspect && !e.shiftKey;
        const aspect = origBox.w / Math.max(1, origBox.h);

        let left = origBox.x;
        let top = origBox.y;
        let right = origBox.x + origBox.w;
        let bottom = origBox.y + origBox.h;

        if (m.includes('w')) left = Math.min(origBox.x + dx, right - minSize);
        if (m.includes('e')) right = Math.max(origBox.x + origBox.w + dx, left + minSize);
        if (m.includes('n')) top = Math.min(origBox.y + dy, bottom - minSize);
        if (m.includes('s')) bottom = Math.max(origBox.y + origBox.h + dy, top + minSize);

        let newW = right - left;
        let newH = bottom - top;

        if (keepAspect) {
          if (m === 'n' || m === 's') {
            newW = Math.max(minSize, newH * aspect);
            left = origBox.x + (origBox.w - newW) / 2;
          } else if (m === 'e' || m === 'w') {
            newH = Math.max(minSize, newW / aspect);
            top = origBox.y + (origBox.h - newH) / 2;
          } else {
            if (newW / newH > aspect) newH = newW / aspect;
            else newW = newH * aspect;
            if (m.includes('w')) left = right - newW;
            if (m.includes('n')) top = bottom - newH;
          }
        }

        layer.x = Math.round(left);
        layer.y = Math.round(top);
        layer.w = Math.round(newW);
        layer.h = Math.round(newH);
      }

      updateLayerCardUI(layer);
      renderPreview();
    });

    const endDrag = (e) => {
      if (!interaction) return;
      if (el.previewCanvas.hasPointerCapture(e.pointerId)) {
        el.previewCanvas.releasePointerCapture(e.pointerId);
      }
      interaction = null;
      renderMeta.dragFreezeBounds = null;
      renderMeta.activeGuides = { x: [], y: [] };
      el.previewCanvas.classList.remove('is-dragging');
      renderPreview();
    };

    el.previewCanvas.addEventListener('pointerup', endDrag);
    el.previewCanvas.addEventListener('pointercancel', endDrag);
  }

  // Camera Capture Modal
  async function startCameraStream() {
    stopCameraStream();
    el.cameraError.hidden = true;
    el.cameraVideo.hidden = false;
    el.cameraSnapshot.hidden = true;
    el.cameraSnapBtn.hidden = false;
    el.cameraRetakeBtn.hidden = true;
    el.cameraUseBtn.hidden = true;
    camera.hasCapturedFrame = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCameraError('Live camera access requires HTTPS (like GitHub Pages) or localhost. Use "Device Cam" or "Upload" instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: camera.facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      camera.stream = stream;
      el.cameraVideo.srcObject = stream;
      await el.cameraVideo.play();
    } catch (err) {
      showCameraError(`Camera unavailable (${err.name || 'permission denied'}). You can still use "Device Cam" or "Upload".`);
    }
  }

  function showCameraError(msg) {
    el.cameraVideo.hidden = true;
    el.cameraSnapshot.hidden = true;
    el.cameraError.textContent = msg;
    el.cameraError.hidden = false;
    el.cameraSnapBtn.hidden = true;
  }

  function stopCameraStream() {
    if (camera.stream) {
      camera.stream.getTracks().forEach((track) => track.stop());
      camera.stream = null;
    }
    el.cameraVideo.srcObject = null;
  }

  function openCameraForLayer(layerId) {
    const layer = getLayerById(layerId);
    if (!layer) return;
    camera.targetLayerId = layerId;
    el.cameraTargetLabel.textContent = `Target: ${layer.label || 'Image'}`;
    el.cameraDialog.showModal();
    startCameraStream();
  }

  function takeCameraSnapshot() {
    if (!camera.stream || el.cameraVideo.videoWidth === 0) return;
    const vw = el.cameraVideo.videoWidth;
    const vh = el.cameraVideo.videoHeight;
    el.cameraSnapshot.width = vw;
    el.cameraSnapshot.height = vh;
    const ctx = el.cameraSnapshot.getContext('2d');
    ctx.drawImage(el.cameraVideo, 0, 0, vw, vh);

    camera.hasCapturedFrame = true;
    el.cameraVideo.hidden = true;
    el.cameraSnapshot.hidden = false;
    el.cameraSnapBtn.hidden = true;
    el.cameraRetakeBtn.hidden = false;
    el.cameraUseBtn.hidden = false;
  }

  function useCameraSnapshot() {
    if (!camera.hasCapturedFrame) return;
    el.cameraSnapshot.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'camera-capture.png', { type: 'image/png' });
      loadImageFromFile(camera.targetLayerId, file, 'camera');
      el.cameraDialog.close('captured');
    }, 'image/png');
  }

  function setupDialogLightDismiss(dialog) {
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (event) => {
        const r = dialog.getBoundingClientRect();
        return (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = outside(e);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && outside(e)) dialog.close();
      });
    }
  }

  // Interactive Crop, 4-Corner Straighten & Resize Editor
  const cropState = {
    layerId: null,
    mode: 'perspective',
    rotation: 0,
    sourceCanvas: document.createElement('canvas'),
    sourceW: 0,
    sourceH: 0,
    rect: { x: 0, y: 0, w: 100, h: 100 },
    quad: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
    ratioKey: 'free',
    customRatio: null,
    resizeMode: 'none',
    resizeScale: 100,
    targetW: 800,
    targetH: 600,
    lockAspect: true,
    viewScale: 1,
    activeDragPoint: null,
  };

  function getActiveCropRatio() {
    if (cropState.ratioKey === 'custom-flip') return cropState.customRatio;
    return ASPECT_RATIOS[cropState.ratioKey] ?? null;
  }

  function makeDefaultQuad(sw, sh) {
    const padX = Math.round(sw * 0.04);
    const padY = Math.round(sh * 0.04);
    return [
      { x: padX, y: padY },
      { x: sw - padX, y: padY },
      { x: sw - padX, y: sh - padY },
      { x: padX, y: sh - padY },
    ];
  }

  function rectToQuad(r) {
    return [
      { x: r.x, y: r.y },
      { x: r.x + r.w, y: r.y },
      { x: r.x + r.w, y: r.y + r.h },
      { x: r.x, y: r.y + r.h },
    ];
  }

  function quadToBoundingRect(q) {
    const minX = Math.min(q[0].x, q[1].x, q[2].x, q[3].x);
    const maxX = Math.max(q[0].x, q[1].x, q[2].x, q[3].x);
    const minY = Math.min(q[0].y, q[1].y, q[2].y, q[3].y);
    const maxY = Math.max(q[0].y, q[1].y, q[2].y, q[3].y);
    return {
      x: minX,
      y: minY,
      w: Math.max(20, maxX - minX),
      h: Math.max(20, maxY - minY),
    };
  }

  function buildCropSource() {
    const layer = getLayerById(cropState.layerId);
    const orig = layer?.originalImg || layer?.img;
    if (!orig) return;

    const rot = ((cropState.rotation % 360) + 360) % 360;
    const swapped = rot === 90 || rot === 270;
    const sw = swapped ? orig.naturalHeight : orig.naturalWidth;
    const sh = swapped ? orig.naturalWidth : orig.naturalHeight;

    cropState.sourceW = sw;
    cropState.sourceH = sh;
    cropState.sourceCanvas.width = sw;
    cropState.sourceCanvas.height = sh;

    const sctx = cropState.sourceCanvas.getContext('2d');
    sctx.clearRect(0, 0, sw, sh);
    sctx.save();
    sctx.translate(sw / 2, sh / 2);
    sctx.rotate((rot * Math.PI) / 180);
    sctx.drawImage(orig, -orig.naturalWidth / 2, -orig.naturalHeight / 2);
    sctx.restore();

    const stage = el.cropCanvas.parentElement;
    const stageRect = stage ? stage.getBoundingClientRect() : { width: 0, height: 0 };
    const isCompactMobile = window.innerWidth <= 680;
    const maxPreviewW = stageRect.width > 80 ? Math.min(820, Math.floor(stageRect.width - 16)) : 800;
    const maxPreviewH = isCompactMobile && stageRect.height > 80
      ? Math.floor(stageRect.height - 16)
      : Math.min(440, Math.round(window.innerHeight * 0.48));
    cropState.viewScale = Math.min(1, maxPreviewW / sw, maxPreviewH / sh);
    el.cropCanvas.width = Math.max(1, Math.round(sw * cropState.viewScale));
    el.cropCanvas.height = Math.max(1, Math.round(sh * cropState.viewScale));
  }

  function fitRectToRatio(ratio) {
    const sw = cropState.sourceW;
    const sh = cropState.sourceH;
    if (!ratio) return;

    const r = cropState.rect;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;

    let newW = r.w;
    let newH = newW / ratio;
    if (newH > sh) {
      newH = sh;
      newW = newH * ratio;
    }
    if (newW > sw) {
      newW = sw;
      newH = newW / ratio;
    }

    const minSize = Math.max(24, Math.min(sw, sh) * 0.1);
    if (newW < minSize) {
      newW = minSize;
      newH = newW / ratio;
    }

    const x = clamp(cx - newW / 2, 0, sw - newW);
    const y = clamp(cy - newH / 2, 0, sh - newH);
    cropState.rect = { x, y, w: newW, h: newH };
  }

  function updateCropRatioButtons() {
    document.querySelectorAll('#crop-dialog .ratio-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.ratio === cropState.ratioKey);
    });
  }

  function updateCropModeUI() {
    const radio = document.querySelector(`input[name="cropMode"][value="${cropState.mode}"]`);
    if (radio) radio.checked = true;
    el.cropModeHint.textContent =
      cropState.mode === 'perspective'
        ? 'Drag any corner (TL, TR, BR, BL) or edge point independently to fit skewed/tilted edges.'
        : 'Drag corners or edges to adjust a straight rectangular crop. Pick Free for independent edges.';
  }

  function getSelectionNaturalDims() {
    if (cropState.mode === 'rect') {
      return {
        selW: Math.max(1, Math.round(cropState.rect.w)),
        selH: Math.max(1, Math.round(cropState.rect.h)),
      };
    }

    const q = cropState.quad;
    const topW = Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y);
    const botW = Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y);
    const leftH = Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y);
    const rightH = Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y);

    let selW = Math.max(16, Math.round(Math.max(topW, botW)));
    let selH = Math.max(16, Math.round(Math.max(leftH, rightH)));

    const ratio = getActiveCropRatio();
    if (ratio) {
      if (ratio >= 1) selH = Math.max(16, Math.round(selW / ratio));
      else selW = Math.max(16, Math.round(selH * ratio));
    }

    return { selW, selH };
  }

  function getCropOutputDims() {
    const { selW, selH } = getSelectionNaturalDims();
    let outW = selW;
    let outH = selH;

    if (cropState.resizeMode === 'scale') {
      const f = cropState.resizeScale / 100;
      outW = Math.max(1, Math.round(selW * f));
      outH = Math.max(1, Math.round(selH * f));
    } else if (cropState.resizeMode === 'custom') {
      outW = clamp(Number(cropState.targetW) || selW, 16, MAX_CANVAS_EDGE);
      outH = clamp(Number(cropState.targetH) || selH, 16, MAX_CANVAS_EDGE);
    }

    return { selW, selH, outW, outH };
  }

  function syncCropResizeUI(updateInputsFromSelection = false) {
    el.cropScaleWrap.hidden = cropState.resizeMode !== 'scale';
    el.cropDimsWrap.hidden = cropState.resizeMode !== 'custom';

    const { selW, selH, outW, outH } = getCropOutputDims();
    if (updateInputsFromSelection) {
      cropState.targetW = selW;
      cropState.targetH = selH;
      el.cropTargetWidth.value = String(selW);
      el.cropTargetHeight.value = String(selH);
    }

    el.cropSelectionDims.textContent = `Selection: ${selW} × ${selH} px`;
    el.cropResultDims.textContent = `Result: ${outW} × ${outH} px`;
  }

  function getRectHandlePoints(rx, ry, rw, rh) {
    const mx = rx + rw / 2;
    const my = ry + rh / 2;
    return [
      { id: 'nw', x: rx, y: ry, cursor: 'nwse-resize' },
      { id: 'n', x: mx, y: ry, cursor: 'ns-resize' },
      { id: 'ne', x: rx + rw, y: ry, cursor: 'nesw-resize' },
      { id: 'e', x: rx + rw, y: my, cursor: 'ew-resize' },
      { id: 'se', x: rx + rw, y: ry + rh, cursor: 'nwse-resize' },
      { id: 's', x: mx, y: ry + rh, cursor: 'ns-resize' },
      { id: 'sw', x: rx, y: ry + rh, cursor: 'nesw-resize' },
      { id: 'w', x: rx, y: my, cursor: 'ew-resize' },
    ];
  }

  function getQuadHandles(vs) {
    const pts = cropState.quad.map((p) => ({ x: p.x * vs, y: p.y * vs }));
    const corners = pts.map((p, i) => ({
      id: `c${i}`,
      cornerIndex: i,
      x: p.x,
      y: p.y,
      label: CORNER_LABELS[i],
      cursor: 'grab',
    }));
    const edges = [
      { id: 'e0', cA: 0, cB: 1, x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2, cursor: 'ns-resize' },
      { id: 'e1', cA: 1, cB: 2, x: (pts[1].x + pts[2].x) / 2, y: (pts[1].y + pts[2].y) / 2, cursor: 'ew-resize' },
      { id: 'e2', cA: 2, cB: 3, x: (pts[2].x + pts[3].x) / 2, y: (pts[2].y + pts[3].y) / 2, cursor: 'ns-resize' },
      { id: 'e3', cA: 3, cB: 0, x: (pts[3].x + pts[0].x) / 2, y: (pts[3].y + pts[0].y) / 2, cursor: 'ew-resize' },
    ];
    return { pts, corners, edges };
  }

  function drawLoupe(ctx, cw, ch, srcPt, label) {
    const size = 96;
    const margin = 12;
    const vs = cropState.viewScale;
    const dispX = srcPt.x * vs;
    const lx = dispX < cw / 2 ? cw - size - margin : margin;
    const ly = margin;
    const zoom = 2.5;
    const sampleRadius = size / 2 / (zoom * Math.max(0.2, vs));

    ctx.save();
    ctx.beginPath();
    ctx.arc(lx + size / 2, ly + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#020617';
    ctx.fill();
    ctx.clip();

    ctx.drawImage(
      cropState.sourceCanvas,
      srcPt.x - sampleRadius,
      srcPt.y - sampleRadius,
      sampleRadius * 2,
      sampleRadius * 2,
      lx,
      ly,
      size,
      size
    );

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx + size / 2, ly);
    ctx.lineTo(lx + size / 2, ly + size);
    ctx.moveTo(lx, ly + size / 2);
    ctx.lineTo(lx + size, ly + size / 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(lx + size / 2, ly + size / 2, size / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (label) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(lx + size / 2 - 18, ly + size - 18, 36, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + size / 2, ly + size - 10);
    }
    ctx.restore();
  }

  function drawCropEditor() {
    const canvas = el.cropCanvas;
    const ctx = canvas.getContext('2d');
    const vs = cropState.viewScale;
    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(cropState.sourceCanvas, 0, 0, cw, ch);

    if (cropState.mode === 'rect') {
      const rx = cropState.rect.x * vs;
      const ry = cropState.rect.y * vs;
      const rw = cropState.rect.w * vs;
      const rh = cropState.rect.h * vs;

      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.58)';
      ctx.beginPath();
      ctx.rect(0, 0, cw, ch);
      ctx.rect(rx, ry, rw, rh);
      ctx.fill('evenodd');

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx + rw / 3, ry);
      ctx.lineTo(rx + rw / 3, ry + rh);
      ctx.moveTo(rx + (rw * 2) / 3, ry);
      ctx.lineTo(rx + (rw * 2) / 3, ry + rh);
      ctx.moveTo(rx, ry + rh / 3);
      ctx.lineTo(rx + rw, ry + rh / 3);
      ctx.moveTo(rx, ry + (rh * 2) / 3);
      ctx.lineTo(rx + rw, ry + (rh * 2) / 3);
      ctx.stroke();

      const handles = getRectHandlePoints(rx, ry, rw, rh);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      for (const h of handles) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    } else {
      const { pts, corners, edges } = getQuadHandles(vs);

      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.58)';
      ctx.beginPath();
      ctx.rect(0, 0, cw, ch);
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.closePath();
      ctx.fill('evenodd');

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const t of [1 / 3, 2 / 3]) {
        ctx.moveTo(pts[0].x + (pts[1].x - pts[0].x) * t, pts[0].y + (pts[1].y - pts[0].y) * t);
        ctx.lineTo(pts[3].x + (pts[2].x - pts[3].x) * t, pts[3].y + (pts[2].y - pts[3].y) * t);
        ctx.moveTo(pts[0].x + (pts[3].x - pts[0].x) * t, pts[0].y + (pts[3].y - pts[0].y) * t);
        ctx.lineTo(pts[1].x + (pts[2].x - pts[1].x) * t, pts[1].y + (pts[2].y - pts[1].y) * t);
      }
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.25;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = '#e0f2fe';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.75;
      for (const edge of edges) {
        ctx.beginPath();
        ctx.arc(edge.x, edge.y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      for (const c of corners) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#1e3a8a';
        ctx.font = '700 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.label, c.x, c.y + 0.5);
      }
      ctx.restore();
    }

    if (cropState.activeDragPoint) {
      drawLoupe(ctx, cw, ch, cropState.activeDragPoint, cropState.activeDragPoint.label);
    }

    syncCropResizeUI(cropState.resizeMode === 'custom' && cropState.lockAspect);
  }

  function computeUnitToQuadHomography(quad) {
    const [p0, p1, p2, p3] = quad;
    const dx1 = p1.x - p2.x;
    const dx2 = p3.x - p2.x;
    const dx3 = p0.x - p1.x + p2.x - p3.x;
    const dy1 = p1.y - p2.y;
    const dy2 = p3.y - p2.y;
    const dy3 = p0.y - p1.y + p2.y - p3.y;

    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) < 1e-8) return null;

    const g = (dx3 * dy2 - dx2 * dy3) / det;
    const h = (dx1 * dy3 - dx3 * dy1) / det;
    return {
      a: p1.x - p0.x + g * p1.x,
      b: p3.x - p0.x + h * p3.x,
      c: p0.x,
      d: p1.y - p0.y + g * p1.y,
      e: p3.y - p0.y + h * p3.y,
      f: p0.y,
      g,
      h,
    };
  }

  function warpQuadToCanvas(srcCanvas, quad, outW, outH) {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const outCtx = outCanvas.getContext('2d');

    const H = computeUnitToQuadHomography(quad);
    if (!H) {
      const r = quadToBoundingRect(quad);
      outCtx.drawImage(srcCanvas, r.x, r.y, r.w, r.h, 0, 0, outW, outH);
      return outCanvas;
    }

    const sw = srcCanvas.width;
    const sh = srcCanvas.height;
    const srcData = srcCanvas.getContext('2d').getImageData(0, 0, sw, sh).data;
    const dstImgData = outCtx.createImageData(outW, outH);
    const dst = dstImgData.data;

    const { a, b, c, d, e, f, g, h } = H;
    const maxSx = sw - 1;
    const maxSy = sh - 1;

    for (let y = 0; y < outH; y++) {
      const v = (y + 0.5) / outH;
      const bv_c = b * v + c;
      const ev_f = e * v + f;
      const hv_1 = h * v + 1;
      const rowOffset = y * outW * 4;

      for (let x = 0; x < outW; x++) {
        const u = (x + 0.5) / outW;
        const denom = g * u + hv_1;
        const sx = (a * u + bv_c) / denom;
        const sy = (d * u + ev_f) / denom;

        const outIdx = rowOffset + x * 4;
        if (sx < 0 || sx > maxSx || sy < 0 || sy > maxSy) {
          dst[outIdx] = 255;
          dst[outIdx + 1] = 255;
          dst[outIdx + 2] = 255;
          dst[outIdx + 3] = 0;
          continue;
        }

        const x0 = sx | 0;
        const y0 = sy | 0;
        const x1 = x0 < maxSx ? x0 + 1 : x0;
        const y1 = y0 < maxSy ? y0 + 1 : y0;
        const fx = sx - x0;
        const fy = sy - y0;
        const ifx = 1 - fx;
        const ify = 1 - fy;

        const w00 = ifx * ify;
        const w10 = fx * ify;
        const w01 = ifx * fy;
        const w11 = fx * fy;

        const i00 = (y0 * sw + x0) * 4;
        const i10 = (y0 * sw + x1) * 4;
        const i01 = (y1 * sw + x0) * 4;
        const i11 = (y1 * sw + x1) * 4;

        dst[outIdx] = (srcData[i00] * w00 + srcData[i10] * w10 + srcData[i01] * w01 + srcData[i11] * w11) | 0;
        dst[outIdx + 1] = (srcData[i00 + 1] * w00 + srcData[i10 + 1] * w10 + srcData[i01 + 1] * w01 + srcData[i11 + 1] * w11) | 0;
        dst[outIdx + 2] = (srcData[i00 + 2] * w00 + srcData[i10 + 2] * w10 + srcData[i01 + 2] * w01 + srcData[i11 + 2] * w11) | 0;
        dst[outIdx + 3] = (srcData[i00 + 3] * w00 + srcData[i10 + 3] * w10 + srcData[i01 + 3] * w01 + srcData[i11 + 3] * w11) | 0;
      }
    }

    outCtx.putImageData(dstImgData, 0, 0);
    return outCanvas;
  }

  function pointInPolygon(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const yi = poly[i].y;
      const xj = poly[j].x;
      const yj = poly[j].y;
      const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function openCropForLayer(layerId) {
    const layer = getLayerById(layerId);
    if (!layer || !layer.img) return;

    cropState.layerId = layerId;
    cropState.mode = layer.cropMode || 'perspective';
    cropState.rotation = (layer.cropRotation + layer.rotation) % 360;
    cropState.ratioKey = layer.cropRatioKey || 'free';
    cropState.resizeMode = layer.cropResizeMode || 'none';
    cropState.resizeScale = layer.cropResizeScale || 100;
    cropState.lockAspect = true;
    cropState.activeDragPoint = null;

    el.cropResizeDetails.open = window.innerWidth > 680;
    el.cropDialog.showModal();
    buildCropSource();

    if (layer.cropRect && layer.cropRotation === cropState.rotation) {
      cropState.rect = {
        x: clamp(layer.cropRect.x, 0, cropState.sourceW - 16),
        y: clamp(layer.cropRect.y, 0, cropState.sourceH - 16),
        w: clamp(layer.cropRect.w, 16, cropState.sourceW),
        h: clamp(layer.cropRect.h, 16, cropState.sourceH),
      };
    } else {
      cropState.rect = { x: 0, y: 0, w: cropState.sourceW, h: cropState.sourceH };
      const ratio = getActiveCropRatio();
      if (cropState.mode === 'rect' && ratio) fitRectToRatio(ratio);
    }

    if (layer.cropQuad && layer.cropRotation === cropState.rotation) {
      cropState.quad = layer.cropQuad.map((p) => ({
        x: clamp(p.x, 0, cropState.sourceW),
        y: clamp(p.y, 0, cropState.sourceH),
      }));
    } else {
      cropState.quad = makeDefaultQuad(cropState.sourceW, cropState.sourceH);
    }

    el.cropTargetLabel.textContent = `${layer.label || 'Image'} — Original: ${cropState.sourceW} × ${cropState.sourceH} px`;

    el.cropResizeMode.value = cropState.resizeMode;
    el.cropResizeScale.value = String(cropState.resizeScale);
    el.cropResizeScaleOut.textContent = `${cropState.resizeScale}%`;
    el.cropLockAspect.checked = true;
    syncRangeSlider(el.cropResizeScale);
    updateCropModeUI();
    updateCropRatioButtons();
    syncCropResizeUI(true);

    drawCropEditor();
  }

  function applyCropToLayer() {
    const layer = getLayerById(cropState.layerId);
    if (!layer) return;

    const { selW, selH, outW, outH } = getCropOutputDims();
    let outCanvas;

    if (cropState.mode === 'perspective') {
      outCanvas = warpQuadToCanvas(cropState.sourceCanvas, cropState.quad, outW, outH);
    } else {
      outCanvas = document.createElement('canvas');
      outCanvas.width = outW;
      outCanvas.height = outH;
      const ctx = outCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        cropState.sourceCanvas,
        Math.round(cropState.rect.x),
        Math.round(cropState.rect.y),
        selW,
        selH,
        0,
        0,
        outW,
        outH
      );
    }

    outCanvas.toBlob((blob) => {
      if (!blob) return;
      const nextUrl = URL.createObjectURL(blob);
      const croppedImg = new Image();
      croppedImg.onload = () => {
        if (layer.objectUrl && layer.objectUrl !== layer.originalObjectUrl) {
          URL.revokeObjectURL(layer.objectUrl);
        }
        const cx = layer.x + layer.w / 2;
        const cy = layer.y + layer.h / 2;
        const prevMaxEdge = Math.max(layer.w, layer.h);

        layer.img = croppedImg;
        layer.objectUrl = nextUrl;
        layer.naturalWidth = croppedImg.naturalWidth;
        layer.naturalHeight = croppedImg.naturalHeight;
        layer.rotation = 0;

        // Keep proportional visual size on the freeform canvas around the layer's center
        const newRatio = outW / Math.max(1, outH);
        if (prevMaxEdge > 0) {
          if (newRatio >= 1) {
            layer.w = Math.round(prevMaxEdge);
            layer.h = Math.max(24, Math.round(prevMaxEdge / newRatio));
          } else {
            layer.h = Math.round(prevMaxEdge);
            layer.w = Math.max(24, Math.round(prevMaxEdge * newRatio));
          }
          layer.x = Math.round(cx - layer.w / 2);
          layer.y = Math.round(cy - layer.h / 2);
        }

        layer.cropRotation = cropState.rotation;
        layer.cropMode = cropState.mode;
        layer.cropRatioKey = cropState.ratioKey;
        layer.cropRect = { ...cropState.rect };
        layer.cropQuad = cropState.quad.map((p) => ({ ...p }));
        layer.cropResizeMode = cropState.resizeMode;
        layer.cropResizeScale = cropState.resizeScale;

        el.cropDialog.close('applied');
        updateAllUI();
        announce(`Applied crop to ${layer.label} (${outW} by ${outH} pixels).`);
      };
      croppedImg.src = nextUrl;
    }, 'image/png');
  }

  function resetLayerToOriginal() {
    const layer = getLayerById(cropState.layerId);
    if (!layer || !layer.originalImg) return;

    if (layer.objectUrl && layer.objectUrl !== layer.originalObjectUrl) {
      URL.revokeObjectURL(layer.objectUrl);
    }
    const cx = layer.x + layer.w / 2;
    const cy = layer.y + layer.h / 2;
    const prevMaxEdge = Math.max(layer.w, layer.h);

    layer.img = layer.originalImg;
    layer.objectUrl = layer.originalObjectUrl;
    layer.naturalWidth = layer.originalWidth;
    layer.naturalHeight = layer.originalHeight;
    layer.rotation = 0;

    const origRatio = layer.originalWidth / Math.max(1, layer.originalHeight);
    if (prevMaxEdge > 0) {
      if (origRatio >= 1) {
        layer.w = Math.round(prevMaxEdge);
        layer.h = Math.max(24, Math.round(prevMaxEdge / origRatio));
      } else {
        layer.h = Math.round(prevMaxEdge);
        layer.w = Math.max(24, Math.round(prevMaxEdge * origRatio));
      }
      layer.x = Math.round(cx - layer.w / 2);
      layer.y = Math.round(cy - layer.h / 2);
    }

    layer.cropRotation = 0;
    layer.cropMode = 'perspective';
    layer.cropRatioKey = 'free';
    layer.cropRect = null;
    layer.cropQuad = null;
    layer.cropResizeMode = 'none';
    layer.cropResizeScale = 100;

    el.cropDialog.close('reset');
    updateAllUI();
    announce(`Restored ${layer.label} to original uncropped image.`);
  }

  function setupCropEditor() {
    setupDialogLightDismiss(el.cropDialog);
    el.cropDialog.addEventListener('close', () => {
      el.cropDialog.returnValue = '';
      cropState.activeDragPoint = null;
    });

    document.querySelectorAll('input[name="cropMode"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const nextMode = radio.value;
        if (nextMode === cropState.mode) return;
        if (nextMode === 'rect') {
          cropState.rect = quadToBoundingRect(cropState.quad);
          const ratio = getActiveCropRatio();
          if (ratio) fitRectToRatio(ratio);
        } else {
          cropState.quad = rectToQuad(cropState.rect);
        }
        cropState.mode = nextMode;
        updateCropModeUI();
        drawCropEditor();
      });
    });

    document.querySelectorAll('#crop-dialog .ratio-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        cropState.ratioKey = btn.dataset.ratio;
        cropState.customRatio = null;
        updateCropRatioButtons();
        const ratio = getActiveCropRatio();
        if (cropState.mode === 'rect' && ratio) fitRectToRatio(ratio);
        drawCropEditor();
      });
    });

    el.cropFlipRatioBtn.addEventListener('click', () => {
      const flipPairs = {
        '3:4': '4:3',
        '4:3': '3:4',
        '2:3': '3:2',
        '3:2': '2:3',
        '16:9': '9:16',
        '9:16': '16:9',
      };
      if (flipPairs[cropState.ratioKey]) {
        cropState.ratioKey = flipPairs[cropState.ratioKey];
        updateCropRatioButtons();
        if (cropState.mode === 'rect') fitRectToRatio(getActiveCropRatio());
      } else {
        const { selW, selH } = getSelectionNaturalDims();
        const cur = getActiveCropRatio() || selW / Math.max(1, selH);
        cropState.ratioKey = 'custom-flip';
        cropState.customRatio = 1 / cur;
        updateCropRatioButtons();
        if (cropState.mode === 'rect') fitRectToRatio(cropState.customRatio);
      }
      drawCropEditor();
    });

    const rotateCropSource = (delta) => {
      cropState.rotation = (cropState.rotation + delta) % 360;
      buildCropSource();
      cropState.rect = { x: 0, y: 0, w: cropState.sourceW, h: cropState.sourceH };
      cropState.quad = makeDefaultQuad(cropState.sourceW, cropState.sourceH);
      const ratio = getActiveCropRatio();
      if (cropState.mode === 'rect' && ratio) fitRectToRatio(ratio);
      drawCropEditor();
    };

    el.cropRotLeftBtn.addEventListener('click', () => rotateCropSource(270));
    el.cropRotRightBtn.addEventListener('click', () => rotateCropSource(90));

    el.cropResizeMode.addEventListener('change', () => {
      cropState.resizeMode = el.cropResizeMode.value;
      syncCropResizeUI(cropState.resizeMode === 'custom');
    });

    el.cropResizeScale.addEventListener('input', () => {
      cropState.resizeScale = Number(el.cropResizeScale.value);
      el.cropResizeScaleOut.textContent = `${cropState.resizeScale}%`;
      syncRangeSlider(el.cropResizeScale);
      syncCropResizeUI(false);
    });

    el.cropTargetWidth.addEventListener('input', () => {
      const w = clamp(Number(el.cropTargetWidth.value) || 16, 16, MAX_CANVAS_EDGE);
      cropState.targetW = w;
      if (cropState.lockAspect) {
        const { selW, selH } = getSelectionNaturalDims();
        const aspect = selW / Math.max(1, selH);
        cropState.targetH = Math.max(16, Math.round(w / aspect));
        el.cropTargetHeight.value = String(cropState.targetH);
      }
      syncCropResizeUI(false);
    });

    el.cropTargetHeight.addEventListener('input', () => {
      const h = clamp(Number(el.cropTargetHeight.value) || 16, 16, MAX_CANVAS_EDGE);
      cropState.targetH = h;
      if (cropState.lockAspect) {
        const { selW, selH } = getSelectionNaturalDims();
        const aspect = selW / Math.max(1, selH);
        cropState.targetW = Math.max(16, Math.round(h * aspect));
        el.cropTargetWidth.value = String(cropState.targetW);
      }
      syncCropResizeUI(false);
    });

    el.cropLockAspect.addEventListener('change', () => {
      cropState.lockAspect = el.cropLockAspect.checked;
      if (cropState.lockAspect) {
        const { selW, selH } = getSelectionNaturalDims();
        const aspect = selW / Math.max(1, selH);
        cropState.targetH = Math.max(16, Math.round(cropState.targetW / aspect));
        el.cropTargetHeight.value = String(cropState.targetH);
        syncCropResizeUI(false);
      }
    });

    el.cropApplyBtn.addEventListener('click', applyCropToLayer);
    el.cropResetBtn.addEventListener('click', resetLayerToOriginal);

    let interaction = null;

    const toCanvasDisplayPt = (event) => {
      const r = el.cropCanvas.getBoundingClientRect();
      return {
        x: ((event.clientX - r.left) * el.cropCanvas.width) / Math.max(1, r.width),
        y: ((event.clientY - r.top) * el.cropCanvas.height) / Math.max(1, r.height),
      };
    };

    const hitTest = (dispPt) => {
      const vs = cropState.viewScale;
      if (cropState.mode === 'rect') {
        const rx = cropState.rect.x * vs;
        const ry = cropState.rect.y * vs;
        const rw = cropState.rect.w * vs;
        const rh = cropState.rect.h * vs;
        for (const h of getRectHandlePoints(rx, ry, rw, rh)) {
          if (Math.hypot(dispPt.x - h.x, dispPt.y - h.y) <= 15) return { mode: h.id, cursor: h.cursor };
        }
        if (dispPt.x >= rx && dispPt.x <= rx + rw && dispPt.y >= ry && dispPt.y <= ry + rh) {
          return { mode: 'move', cursor: 'move' };
        }
        return { mode: 'new', cursor: 'crosshair' };
      }

      const { pts, corners, edges } = getQuadHandles(vs);
      for (const c of corners) {
        if (Math.hypot(dispPt.x - c.x, dispPt.y - c.y) <= 18) {
          return { mode: c.id, cornerIndex: c.cornerIndex, label: c.label, cursor: 'grabbing' };
        }
      }
      for (const edge of edges) {
        if (Math.hypot(dispPt.x - edge.x, dispPt.y - edge.y) <= 15) {
          return { mode: edge.id, cA: edge.cA, cB: edge.cB, cursor: edge.cursor };
        }
      }
      if (pointInPolygon(dispPt, pts)) return { mode: 'move-quad', cursor: 'move' };
      return { mode: 'nearest-corner', cursor: 'crosshair' };
    };

    el.cropCanvas.addEventListener('pointerdown', (e) => {
      const dispPt = toCanvasDisplayPt(e);
      let hit = hitTest(dispPt);
      const vs = cropState.viewScale;
      const srcX = clamp(dispPt.x / vs, 0, cropState.sourceW);
      const srcY = clamp(dispPt.y / vs, 0, cropState.sourceH);

      if (hit.mode === 'nearest-corner') {
        let bestIdx = 0;
        let bestDist = Infinity;
        cropState.quad.forEach((p, idx) => {
          const d = Math.hypot(srcX - p.x, srcY - p.y);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = idx;
          }
        });
        cropState.quad[bestIdx] = { x: srcX, y: srcY };
        hit = { mode: `c${bestIdx}`, cornerIndex: bestIdx, label: CORNER_LABELS[bestIdx], cursor: 'grabbing' };
      }

      interaction = {
        ...hit,
        startSrcX: srcX,
        startSrcY: srcY,
        origRect: { ...cropState.rect },
        origQuad: cropState.quad.map((p) => ({ ...p })),
      };
      if (hit.cornerIndex !== undefined) {
        cropState.activeDragPoint = { ...cropState.quad[hit.cornerIndex], label: hit.label };
      }
      el.cropCanvas.setPointerCapture(e.pointerId);
      drawCropEditor();
    });

    el.cropCanvas.addEventListener('pointermove', (e) => {
      const dispPt = toCanvasDisplayPt(e);
      if (!interaction) {
        el.cropCanvas.style.cursor = hitTest(dispPt).cursor;
        return;
      }

      const vs = cropState.viewScale;
      const sw = cropState.sourceW;
      const sh = cropState.sourceH;
      const minSize = Math.max(20, Math.min(sw, sh) * 0.04);
      const curX = clamp(dispPt.x / vs, 0, sw);
      const curY = clamp(dispPt.y / vs, 0, sh);

      if (cropState.mode === 'perspective') {
        if (interaction.cornerIndex !== undefined) {
          const idx = interaction.cornerIndex;
          cropState.quad[idx] = { x: curX, y: curY };
          cropState.activeDragPoint = { x: curX, y: curY, label: CORNER_LABELS[idx] };
        } else if (interaction.cA !== undefined) {
          const dx = curX - interaction.startSrcX;
          const dy = curY - interaction.startSrcY;
          const pA = interaction.origQuad[interaction.cA];
          const pB = interaction.origQuad[interaction.cB];
          const minDx = Math.max(-pA.x, -pB.x);
          const maxDx = Math.min(sw - pA.x, sw - pB.x);
          const minDy = Math.max(-pA.y, -pB.y);
          const maxDy = Math.min(sh - pA.y, sh - pB.y);
          const cdx = clamp(dx, minDx, maxDx);
          const cdy = clamp(dy, minDy, maxDy);
          cropState.quad[interaction.cA] = { x: pA.x + cdx, y: pA.y + cdy };
          cropState.quad[interaction.cB] = { x: pB.x + cdx, y: pB.y + cdy };
          cropState.activeDragPoint = {
            x: (cropState.quad[interaction.cA].x + cropState.quad[interaction.cB].x) / 2,
            y: (cropState.quad[interaction.cA].y + cropState.quad[interaction.cB].y) / 2,
            label: 'EDGE',
          };
        } else if (interaction.mode === 'move-quad') {
          const dx = curX - interaction.startSrcX;
          const dy = curY - interaction.startSrcY;
          const xs = interaction.origQuad.map((p) => p.x);
          const ys = interaction.origQuad.map((p) => p.y);
          const cdx = clamp(dx, -Math.min(...xs), sw - Math.max(...xs));
          const cdy = clamp(dy, -Math.min(...ys), sh - Math.max(...ys));
          cropState.quad = interaction.origQuad.map((p) => ({ x: p.x + cdx, y: p.y + cdy }));
          cropState.activeDragPoint = null;
        }
        drawCropEditor();
        return;
      }

      const ratio = getActiveCropRatio();
      const o = interaction.origRect;

      if (interaction.mode === 'move') {
        cropState.rect = {
          x: clamp(o.x + (curX - interaction.startSrcX), 0, sw - o.w),
          y: clamp(o.y + (curY - interaction.startSrcY), 0, sh - o.h),
          w: o.w,
          h: o.h,
        };
      } else if (interaction.mode === 'new') {
        const x1 = interaction.startSrcX;
        const y1 = interaction.startSrcY;
        const dx = curX - x1;
        const dy = curY - y1;
        let w = Math.max(minSize, Math.abs(dx));
        let h = Math.max(minSize, Math.abs(dy));
        if (ratio) {
          h = w / ratio;
          if (h > sh) {
            h = sh;
            w = h * ratio;
          }
        }
        const x = dx >= 0 ? clamp(x1, 0, sw - w) : clamp(x1 - w, 0, sw - w);
        const y = dy >= 0 ? clamp(y1, 0, sh - h) : clamp(y1 - h, 0, sh - h);
        cropState.rect = { x, y, w: Math.min(w, sw - x), h: Math.min(h, sh - y) };
      } else {
        const m = interaction.mode;
        let left = o.x;
        let top = o.y;
        let right = o.x + o.w;
        let bottom = o.y + o.h;

        if (m.includes('w')) left = Math.min(curX, right - minSize);
        if (m.includes('e')) right = Math.max(curX, left + minSize);
        if (m.includes('n')) top = Math.min(curY, bottom - minSize);
        if (m.includes('s')) bottom = Math.max(curY, top + minSize);

        if (!ratio) {
          cropState.rect = { x: left, y: top, w: right - left, h: bottom - top };
        } else {
          let w = right - left;
          let h = bottom - top;
          if (m === 'n' || m === 's') {
            w = h * ratio;
            left = clamp((o.x + o.x + o.w) / 2 - w / 2, 0, sw - w);
            if (w > sw) {
              w = sw;
              h = w / ratio;
              left = 0;
            }
            if (m === 'n') top = bottom - h;
            else bottom = top + h;
          } else if (m === 'e' || m === 'w') {
            h = w / ratio;
            top = clamp((o.y + o.y + o.h) / 2 - h / 2, 0, sh - h);
            if (h > sh) {
              h = sh;
              w = h * ratio;
              top = 0;
            }
            if (m === 'w') left = right - w;
            else right = left + w;
          } else {
            const anchorX = m.includes('w') ? o.x + o.w : o.x;
            const anchorY = m.includes('n') ? o.y + o.h : o.y;
            const maxAvailW = m.includes('w') ? anchorX : sw - anchorX;
            const maxAvailH = m.includes('n') ? anchorY : sh - anchorY;
            if (w / h > ratio) h = w / ratio;
            else w = h * ratio;
            if (w > maxAvailW) {
              w = maxAvailW;
              h = w / ratio;
            }
            if (h > maxAvailH) {
              h = maxAvailH;
              w = h * ratio;
            }
            left = m.includes('w') ? anchorX - w : anchorX;
            top = m.includes('n') ? anchorY - h : anchorY;
          }

          cropState.rect = {
            x: clamp(left, 0, sw - minSize),
            y: clamp(top, 0, sh - minSize),
            w: clamp(w, minSize, sw),
            h: clamp(h, minSize, sh),
          };
        }
      }

      drawCropEditor();
    });

    const endCropDrag = (e) => {
      if (!interaction) return;
      if (el.cropCanvas.hasPointerCapture(e.pointerId)) {
        el.cropCanvas.releasePointerCapture(e.pointerId);
      }
      interaction = null;
      cropState.activeDragPoint = null;
      drawCropEditor();
    };

    el.cropCanvas.addEventListener('pointerup', endCropDrag);
    el.cropCanvas.addEventListener('pointercancel', endCropDrag);
  }

  function cycleTheme() {
    const order = ['auto', 'light', 'dark'];
    const next = order[(order.indexOf(state.theme) + 1) % order.length];
    state.theme = next;
    if (next === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', next);
    el.themeLabel.textContent = `Theme: ${next.charAt(0).toUpperCase() + next.slice(1)}`;
  }

  function resetAll() {
    state.layers.forEach(revokeLayerUrls);
    state.layers = [createLayer('Front'), createLayer('Back')];
    state.selectedLayerId = null;
    state.canvasPreset = '4:3';
    state.paperOrientation = 'portrait';
    state.paperDpi = 300;
    state.canvasWidth = 1600;
    state.canvasHeight = 1200;
    state.autoMargin = 32;
    state.radius = 12;
    state.bgMode = 'white';
    state.bgColor = '#f1f5f9';
    state.snapGuides = true;
    state.showLabels = false;
    state.exportScale = 100;
    state.exportFormat = 'image/png';
    state.exportQuality = 92;

    el.canvasPreset.value = '4:3';
    document.querySelector('input[name="paperOrientation"][value="portrait"]').checked = true;
    el.paperDpi.value = '300';
    el.canvasWidth.value = '1600';
    el.canvasHeight.value = '1200';
    el.autoMarginRange.value = '32';
    el.autoMarginOut.textContent = '32 px';
    el.radiusRange.value = '12';
    el.radiusOut.textContent = '12 px';
    document.querySelector('input[name="bgMode"][value="white"]').checked = true;
    el.bgColorPicker.value = '#f1f5f9';
    el.snapGuides.checked = true;
    el.showLabels.checked = false;
    el.exportScaleRange.value = '100';
    el.exportScaleOut.textContent = '100%';
    el.exportFormat.value = 'image/png';
    el.exportQuality.value = '92';
    el.qualityOut.textContent = '92%';

    rebuildLayerList();
    syncAllSliders();
    updateAllUI();
    announce('Reset canvas and all images.');
  }

  function bindGlobalEvents() {
    el.themeToggleBtn.addEventListener('click', cycleTheme);
    el.resetAllBtn.addEventListener('click', resetAll);

    el.addLayerBtn.addEventListener('click', () => {
      const layer = createLayer(`Image ${state.layers.length + 1}`);
      state.layers.push(layer);
      rebuildLayerList();
      updateAllUI();
      announce(`Added ${layer.label} slot.`);
    });

    el.heroUpload0.addEventListener('change', (e) => {
      if (e.target.files?.[0] && state.layers[0]) loadImageFromFile(state.layers[0].id, e.target.files[0], 'upload');
      e.target.value = '';
    });
    el.heroUpload1.addEventListener('change', (e) => {
      if (e.target.files?.[0] && state.layers[1]) loadImageFromFile(state.layers[1].id, e.target.files[0], 'upload');
      e.target.value = '';
    });

    document.addEventListener('paste', (e) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' && document.activeElement.type === 'text') return;

      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            let target = state.layers.find((l) => !l.img);
            if (!target) {
              target = getSelectedLayer() || createLayer(`Image ${state.layers.length + 1}`);
              if (!state.layers.includes(target)) {
                state.layers.push(target);
                rebuildLayerList();
              }
            }
            loadImageFromFile(target.id, file, 'paste');
            break;
          }
        }
      }
    });

    el.canvasPreset.addEventListener('change', () => {
      state.canvasPreset = el.canvasPreset.value;
      const paper = getPaperSpec();
      if (paper) {
        state.canvasWidth = paper.w;
        state.canvasHeight = paper.h;
      } else if (CANVAS_PRESETS[state.canvasPreset]) {
        state.canvasWidth = CANVAS_PRESETS[state.canvasPreset].width;
        state.canvasHeight = CANVAS_PRESETS[state.canvasPreset].height;
        el.canvasWidth.value = String(state.canvasWidth);
        el.canvasHeight.value = String(state.canvasHeight);
      }
      updateCanvasControlsUI();
      renderPreview();
    });

    document.querySelectorAll('input[name="paperOrientation"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        state.paperOrientation = radio.value;
        updateCanvasControlsUI();
        renderPreview();
      });
    });

    el.paperDpi.addEventListener('change', () => {
      state.paperDpi = Number(el.paperDpi.value) || 300;
      updateCanvasControlsUI();
      renderPreview();
    });

    el.canvasWidth.addEventListener('input', () => {
      state.canvasWidth = Number(el.canvasWidth.value) || 1600;
      renderPreview();
    });
    el.canvasHeight.addEventListener('input', () => {
      state.canvasHeight = Number(el.canvasHeight.value) || 1200;
      renderPreview();
    });
    el.autoMarginRange.addEventListener('input', () => {
      state.autoMargin = Number(el.autoMarginRange.value);
      el.autoMarginOut.textContent = `${state.autoMargin} px`;
      syncRangeSlider(el.autoMarginRange);
      renderPreview();
    });

    el.helperTrimBtn.addEventListener('click', trimCanvasToImages);
    el.helperCenterBtn.addEventListener('click', centerSelectedLayer);
    el.helperMatchBtn.addEventListener('click', matchLayerSizes);
    el.helperIdSizeBtn.addEventListener('click', fitToRealIdCardSize);
    el.helperSideBtn.addEventListener('click', () => quickArrange('horizontal'));
    el.helperStackBtn.addEventListener('click', () => quickArrange('vertical'));

    el.mobileScrollToggle.addEventListener('click', () => {
      state.canvasScrollMode = !state.canvasScrollMode;
      el.previewCanvas.classList.toggle('is-scroll-mode', state.canvasScrollMode);
      el.mobileScrollToggle.setAttribute('aria-pressed', String(state.canvasScrollMode));
      el.mobileScrollToggle.textContent = state.canvasScrollMode ? '📜 Scroll Page' : '✋ Drag Images';
    });

    el.quickFrontBtn.addEventListener('click', () => {
      if (state.selectedLayerId) moveLayerOrder(state.selectedLayerId, 1);
    });
    el.quickBackBtn.addEventListener('click', () => {
      if (state.selectedLayerId) moveLayerOrder(state.selectedLayerId, -1);
    });

    el.radiusRange.addEventListener('input', () => {
      state.radius = Number(el.radiusRange.value);
      el.radiusOut.textContent = `${state.radius} px`;
      syncRangeSlider(el.radiusRange);
      renderPreview();
    });

    document.querySelectorAll('input[name="bgMode"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        state.bgMode = radio.value;
        updateCanvasControlsUI();
        renderPreview();
      });
    });

    el.bgColorPicker.addEventListener('input', () => {
      state.bgColor = el.bgColorPicker.value;
      renderPreview();
    });

    el.snapGuides.addEventListener('change', () => {
      state.snapGuides = el.snapGuides.checked;
    });

    el.showLabels.addEventListener('change', () => {
      state.showLabels = el.showLabels.checked;
      renderPreview();
    });

    el.exportScaleRange.addEventListener('input', () => {
      state.exportScale = Number(el.exportScaleRange.value);
      el.exportScaleOut.textContent = `${state.exportScale}%`;
      syncRangeSlider(el.exportScaleRange);
      renderPreview();
    });

    el.exportFormat.addEventListener('change', () => {
      state.exportFormat = el.exportFormat.value;
      updateCanvasControlsUI();
      renderPreview();
    });

    el.exportQuality.addEventListener('input', () => {
      state.exportQuality = Number(el.exportQuality.value);
      el.qualityOut.textContent = `${state.exportQuality}%`;
      syncRangeSlider(el.exportQuality);
    });

    el.downloadBtn.addEventListener('click', downloadCombinedImage);
    el.copyBtn.addEventListener('click', copyCombinedImage);
    el.printBtn.addEventListener('click', printCombinedImage);

    // Camera dialog controls
    setupDialogLightDismiss(el.cameraDialog);
    el.cameraDialog.addEventListener('close', () => {
      el.cameraDialog.returnValue = '';
      stopCameraStream();
    });

    el.cameraFlipBtn.addEventListener('click', () => {
      camera.facingMode = camera.facingMode === 'environment' ? 'user' : 'environment';
      startCameraStream();
    });
    el.cameraSnapBtn.addEventListener('click', takeCameraSnapshot);
    el.cameraRetakeBtn.addEventListener('click', () => {
      el.cameraVideo.hidden = false;
      el.cameraSnapshot.hidden = true;
      el.cameraSnapBtn.hidden = false;
      el.cameraRetakeBtn.hidden = true;
      el.cameraUseBtn.hidden = true;
      camera.hasCapturedFrame = false;
    });
    el.cameraUseBtn.addEventListener('click', useCameraSnapshot);

    setupCropEditor();
    setupCanvasDragging();
  }

  // Initialize
  rebuildLayerList();
  syncAllSliders();
  bindGlobalEvents();
  updateAllUI();
})();
