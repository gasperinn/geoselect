import L from 'leaflet';
import leafletCss from 'leaflet/dist/leaflet.css';
import { STYLES } from './styles.js';
import { getTranslation } from './i18n.js';
import { DEFAULT_CITIES } from './default-cities.js';

const GRID_CELL_DEG = 0.15;
const MILES_PER_METER = 1 / 1609.344;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function metersPerPixel(lat, zoom) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

/**
 * <geo-select> — a framework-agnostic city-picker map.
 *
 * Attributes:
 *   default-center-city="London"   city name to center on at load
 *   default-zoom="5"
 *   allowed-countries="FR,DE,IT"   comma-separated ISO codes; omit/empty = all
 *   units="metric" | "imperial"
 *   default-brush-size="26"        screen pixels
 *   language="en" | "es" | "fr" | "de" | "it" | "zh" | "ar"
 *   show-expand-radius="true"      "false" to hide the radius-setting panel
 *   show-results="true"            "false" to hide the built-in results list
 *                                   (still fires "change" events either way)
 *
 * Properties:
 *   .cities = [{ name, country, lat, lng, population }, ...]   override the dataset
 *   .selectedCities  → array of currently selected city objects (read-only)
 *
 * Methods:
 *   .clear()   .undo()
 *
 * Events:
 *   "change"  → detail: { cities: [...], count: N }
 */
export class GeoSelect extends HTMLElement {
  static get observedAttributes() {
    return [
      'default-center-city', 'default-zoom', 'allowed-countries',
      'units', 'default-brush-size', 'language',
      'show-expand-radius', 'show-results'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rawCities = DEFAULT_CITIES;
    this._activeCities = DEFAULT_CITIES;
    this._grid = null;
    this._selectedIndices = new Set();
    this._strokes = [];
    this._strokeGroups = [];
    this._currentGroup = [];
    this._connected = false;
  }

  // ---------------------------------------------------------------
  // Public property API
  // ---------------------------------------------------------------
  set cities(list) {
    this._rawCities = Array.isArray(list) && list.length ? list : DEFAULT_CITIES;
    this._applyCountryFilter();
    if (this._connected) {
      this._buildGrid();
      this._selectedIndices.clear();
      this._strokes = [];
      this._strokeGroups = [];
      this._redraw();
      this._renderList();
      this._emitChange();
    }
  }
  get cities() {
    return this._rawCities;
  }

  get selectedCities() {
    return Array.from(this._selectedIndices, i => this._activeCities[i]);
  }

  clear() {
    this._strokes = [];
    this._strokeGroups = [];
    this._selectedIndices.clear();
    this._redraw();
    this._renderList();
    this._emitChange();
  }

  undo() {
    const lastGroup = this._strokeGroups.pop();
    if (!lastGroup) return;
    this._strokes = this._strokes.slice(0, this._strokes.length - lastGroup.length);
    this._rebuildSelectionFromStrokes();
    this._redraw();
    this._renderList();
    this._emitChange();
  }

  // ---------------------------------------------------------------
  // Attribute handling
  // ---------------------------------------------------------------
  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    switch (name) {
      case 'allowed-countries':
        this._applyCountryFilter();
        if (this._connected) { this._buildGrid(); this.clear(); }
        break;
      case 'default-brush-size':
        this._brushPixelRadius = parseInt(newVal, 10) || 26;
        if (this._connected) this._syncBrushUi();
        break;
      case 'language':
        if (this._connected) this._applyLanguage();
        break;
      case 'show-expand-radius':
        if (this._connected) this._syncPanelVisibility();
        break;
      case 'show-results':
        if (this._connected) this._syncPanelVisibility();
        break;
      // default-center-city / default-zoom / units only take effect on
      // (re)connect — recentering live on attribute change would be
      // surprising if a consumer is mid-selection.
    }
  }

  _applyCountryFilter() {
    const raw = (this.getAttribute('allowed-countries') || '').trim();
    if (!raw) {
      this._activeCities = this._rawCities;
      return;
    }
    const allowed = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    this._activeCities = this._rawCities.filter(c => allowed.includes(c.country));
  }

  get _units() {
    return this.getAttribute('units') === 'imperial' ? 'imperial' : 'metric';
  }
  _metersFromDisplayUnit(v) {
    return this._units === 'imperial' ? v / MILES_PER_METER : v * 1000;
  }
  get _unitLabel() {
    return this._units === 'imperial' ? 'mi' : 'km';
  }
  get _language() {
    const lang = this.getAttribute('language');
    return getTranslation(lang) ? lang : 'en';
  }

  // ---------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------
  connectedCallback() {
    this._applyCountryFilter();
    this._brushPixelRadius = parseInt(this.getAttribute('default-brush-size'), 10) || 26;
    this._renderShadow();
    this._initMap();
    this._buildGrid();
    this._wireControls();
    this._wirePointerEvents();
    this._applyLanguage();
    this._syncPanelVisibility();
    this._syncBrushUi();
    this._renderList();
    this._connected = true;
    requestAnimationFrame(() => this._map.invalidateSize());
  }

  disconnectedCallback() {
    if (this._map) this._map.remove();
    this._connected = false;
  }

  _renderShadow() {
    this.shadowRoot.innerHTML = `
      <style>${leafletCss}</style>
      <style>${STYLES}</style>
      <div class="gs-app">
        <div class="gs-map-wrap">
          <div class="gs-map"></div>
          <canvas class="gs-canvas"></canvas>
          <div class="gs-mode-tabs">
            <button class="active" data-mode="paint" data-i18n="tabPaint">Paint</button>
            <button data-mode="erase" data-i18n="tabErase">Erase</button>
            <button data-mode="pan" data-i18n="tabPan">Pan</button>
          </div>
          <div class="gs-brush-panel">
            <span data-i18n="brush">Brush</span>
            <input type="range" class="gs-brush-slider" min="10" max="60" value="26">
            <span class="gs-val gs-brush-val">26px</span>
          </div>
        </div>
        <div class="gs-sidebar">
          <div class="gs-sidebar-header">
            <div class="gs-count">0</div>
            <div class="gs-count-label"></div>
          </div>
          <div class="gs-actions">
            <button class="gs-btn gs-undo" data-i18n="undo">Undo stroke</button>
            <button class="gs-btn gs-clear" data-i18n="clear">Clear all</button>
          </div>
          <div class="gs-expand-panel">
            <label data-i18n="expandLabel">Set every stroke's radius to</label>
            <div class="gs-expand-row">
              <input type="number" class="gs-expand-km" min="1" step="1" placeholder="e.g. 50" />
              <span class="gs-expand-unit">km</span>
              <button class="gs-btn gs-expand-apply" data-i18n="apply">Apply</button>
            </div>
          </div>
          <div class="gs-city-list"></div>
        </div>
      </div>
    `;
  }

  _initMap() {
    const mapEl = this.shadowRoot.querySelector('.gs-map');
    const centerCityName = this.getAttribute('default-center-city');
    const zoom = parseInt(this.getAttribute('default-zoom'), 10) || 2;

    let center = [20, 10];
    let initialZoom = 2;
    if (centerCityName) {
      const match = this._rawCities.find(c => c.name.toLowerCase() === centerCityName.toLowerCase());
      if (match) {
        center = [match.lat, match.lng];
        initialZoom = zoom;
      } else {
        console.warn(`<geo-select>: default-center-city "${centerCityName}" not found in dataset — using a world view.`);
      }
    }

    this._map = L.map(mapEl, {
      zoomControl: false,
      worldCopyJump: true,
      minZoom: 2,
      maxBounds: [[-90, -220], [90, 220]],
      maxBoundsViscosity: 0.6,
      renderer: L.canvas({ padding: 0.5 })
    }).setView(center, initialZoom);

    L.control.zoom({ position: 'bottomright' }).addTo(this._map);
    this._map.attributionControl.setPrefix('');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(this._map);

    this._canvas = this.shadowRoot.querySelector('.gs-canvas');
    this._mapWrap = this.shadowRoot.querySelector('.gs-map-wrap');
    this._ctx = this._canvas.getContext('2d');
    this._maskCanvas = document.createElement('canvas');
    this._maskCtx = this._maskCanvas.getContext('2d');

    this._resizeCanvas();
    new ResizeObserver(() => this._resizeCanvas()).observe(this._mapWrap);
    this._map.on('move zoom', () => this._redraw());
    this._map.dragging.disable();
    this._map.touchZoom.disable();

    this._canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = this._canvas.getBoundingClientRect();
      const point = L.point(e.clientX - rect.left, e.clientY - rect.top);
      const delta = e.deltaY < 0 ? 1 : -1;
      const newZoom = Math.max(this._map.getMinZoom(), Math.min(this._map.getMaxZoom(), this._map.getZoom() + delta));
      this._map.setZoomAround(point, newZoom);
    }, { passive: false });
  }

  _resizeCanvas() {
    const rect = this._mapWrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this._canvasCssWidth = rect.width;
    this._canvasCssHeight = rect.height;
    for (const [canvas, ctx] of [[this._canvas, this._ctx], [this._maskCanvas, this._maskCtx]]) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      if (canvas === this._canvas) {
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (this._map) this._map.invalidateSize();
    this._redraw();
  }

  // ---------------------------------------------------------------
  // Spatial grid + selection — this is what keeps stroke matching fast
  // regardless of dataset size: only cities in the handful of grid cells
  // a stroke actually overlaps get checked, never the full list.
  // ---------------------------------------------------------------
  _buildGrid() {
    this._grid = new Map();
    for (let i = 0; i < this._activeCities.length; i++) {
      const c = this._activeCities[i];
      const key = Math.floor(c.lat / GRID_CELL_DEG) + ',' + Math.floor(c.lng / GRID_CELL_DEG);
      let bucket = this._grid.get(key);
      if (!bucket) { bucket = []; this._grid.set(key, bucket); }
      bucket.push(i);
    }
  }

  _candidatesNear(lat, lng, radiusMeters) {
    const dLat = radiusMeters / 111320;
    const dLng = radiusMeters / (111320 * Math.max(0.15, Math.cos((lat * Math.PI) / 180)));
    const latMin = Math.floor((lat - dLat) / GRID_CELL_DEG);
    const latMax = Math.floor((lat + dLat) / GRID_CELL_DEG);
    const lngMin = Math.floor((lng - dLng) / GRID_CELL_DEG);
    const lngMax = Math.floor((lng + dLng) / GRID_CELL_DEG);
    const out = [];
    for (let la = latMin; la <= latMax; la++) {
      for (let lo = lngMin; lo <= lngMax; lo++) {
        const bucket = this._grid.get(la + ',' + lo);
        if (bucket) out.push(...bucket);
      }
    }
    return out;
  }

  _applyStrokeToSelection(stroke) {
    for (const idx of this._candidatesNear(stroke.lat, stroke.lng, stroke.radiusMeters)) {
      const c = this._activeCities[idx];
      if (haversineMeters(c.lat, c.lng, stroke.lat, stroke.lng) <= stroke.radiusMeters) {
        if (stroke.type === 'paint') this._selectedIndices.add(idx);
        else this._selectedIndices.delete(idx);
      }
    }
  }

  _rebuildSelectionFromStrokes() {
    this._selectedIndices.clear();
    for (const s of this._strokes) this._applyStrokeToSelection(s);
  }

  _addStrokePoint(mode, clientX, clientY) {
    const rect = this._canvas.getBoundingClientRect();
    const latlng = this._map.containerPointToLatLng([clientX - rect.left, clientY - rect.top]);
    const radiusMeters = this._brushPixelRadius * metersPerPixel(latlng.lat, this._map.getZoom());
    const stroke = { type: mode, lat: latlng.lat, lng: latlng.lng, radiusMeters };
    this._strokes.push(stroke);
    this._currentGroup.push(stroke);
    this._applyStrokeToSelection(stroke);
  }

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------
  _redraw() {
    if (!this._ctx || this._canvasCssWidth === 0 || this._canvasCssHeight === 0) return;
    this._ctx.clearRect(0, 0, this._canvasCssWidth, this._canvasCssHeight);
    this._maskCtx.clearRect(0, 0, this._canvasCssWidth, this._canvasCssHeight);

    const zoom = this._map.getZoom();
    this._strokes.forEach(s => {
      const pt = this._map.latLngToContainerPoint([s.lat, s.lng]);
      const r = s.radiusMeters / metersPerPixel(s.lat, zoom);
      this._maskCtx.globalCompositeOperation = s.type === 'paint' ? 'source-over' : 'destination-out';
      this._maskCtx.beginPath();
      this._maskCtx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      this._maskCtx.fillStyle = 'rgba(0,0,0,1)';
      this._maskCtx.fill();
    });
    this._maskCtx.globalCompositeOperation = 'source-over';

    this._ctx.save();
    this._ctx.drawImage(this._maskCanvas, 0, 0, this._canvasCssWidth, this._canvasCssHeight);
    this._ctx.globalCompositeOperation = 'source-in';
    this._ctx.fillStyle = 'rgba(29, 110, 86, 0.6)';
    this._ctx.fillRect(0, 0, this._canvasCssWidth, this._canvasCssHeight);
    this._ctx.restore();

    if (this._hoverPoint) {
      let color = 'rgba(85, 83, 76, 0.7)';
      if (this._activeButton === 2 || (this._activeButton === 0 && this._activeMode === 'erase')) color = 'rgba(180, 70, 44, 0.85)';
      else if (this._activeButton === 0 && this._activeMode !== 'pan') color = 'rgba(29, 110, 86, 0.85)';
      else if (this._activeButton == null && this._activeMode === 'erase') color = 'rgba(180, 70, 44, 0.85)';
      else if (this._activeButton == null && this._activeMode === 'paint') color = 'rgba(29, 110, 86, 0.85)';
      this._ctx.beginPath();
      this._ctx.arc(this._hoverPoint.x, this._hoverPoint.y, this._brushPixelRadius, 0, Math.PI * 2);
      this._ctx.setLineDash([4, 3]);
      this._ctx.lineWidth = 1.3;
      this._ctx.strokeStyle = color;
      this._ctx.stroke();
      this._ctx.setLineDash([]);
    }
  }

  _renderList() {
    const t = getTranslation(this._language);
    const total = this._selectedIndices.size;
    const root = this.shadowRoot;
    root.querySelector('.gs-count').textContent = total;
    root.querySelector('.gs-count-label').textContent = total === 1 ? t.citySelectedOne : t.citySelectedMany;
    root.querySelector('.gs-undo').disabled = this._strokeGroups.length === 0;
    root.querySelector('.gs-clear').disabled = this._strokes.length === 0;
    root.querySelector('.gs-expand-apply').disabled = this._strokes.length === 0;

    const listEl = root.querySelector('.gs-city-list');
    const MAX_LISTED = 500;
    if (total === 0) {
      listEl.innerHTML = `<div class="gs-empty-state">${t.emptyState}</div>`;
      return;
    }
    const selected = this.selectedCities.sort((a, b) => b.population - a.population);
    const shown = selected.slice(0, MAX_LISTED);
    let html = shown.map(c =>
      `<div class="gs-city-row"><span><span class="gs-name">${c.name}</span><span class="gs-country">${c.country}</span></span></div>`
    ).join('');
    if (total > MAX_LISTED) html += `<div class="gs-empty-state">${t.showingTop(MAX_LISTED, total)}</div>`;
    listEl.innerHTML = html;
  }

  _applyLanguage() {
    const t = getTranslation(this._language);
    this.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (t[key] !== undefined) el.textContent = t[key];
    });
    this.shadowRoot.querySelector('.gs-expand-unit').textContent = this._unitLabel;
    this._renderList();
  }

  _syncPanelVisibility() {
    const showExpand = this.getAttribute('show-expand-radius') !== 'false';
    const showResults = this.getAttribute('show-results') !== 'false';
    this.shadowRoot.querySelector('.gs-expand-panel').classList.toggle('hidden', !showExpand);
    this.shadowRoot.querySelector('.gs-sidebar').classList.toggle('hidden', !showResults);
  }

  _syncBrushUi() {
    const slider = this.shadowRoot.querySelector('.gs-brush-slider');
    const val = this.shadowRoot.querySelector('.gs-brush-val');
    slider.value = this._brushPixelRadius;
    val.textContent = this._brushPixelRadius + 'px';
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: { cities: this.selectedCities, count: this._selectedIndices.size },
      bubbles: true,
      composed: true
    }));
  }

  // ---------------------------------------------------------------
  // Controls (tabs, slider, buttons)
  // ---------------------------------------------------------------
  _wireControls() {
    const root = this.shadowRoot;
    this._activeMode = 'paint';

    root.querySelectorAll('.gs-mode-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.gs-mode-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._activeMode = btn.dataset.mode;
      });
    });

    const slider = root.querySelector('.gs-brush-slider');
    slider.addEventListener('input', () => {
      this._brushPixelRadius = parseInt(slider.value, 10);
      root.querySelector('.gs-brush-val').textContent = this._brushPixelRadius + 'px';
      this._redraw();
    });

    root.querySelector('.gs-undo').addEventListener('click', () => this.undo());
    root.querySelector('.gs-clear').addEventListener('click', () => this.clear());

    root.querySelector('.gs-expand-apply').addEventListener('click', () => {
      const value = parseFloat(root.querySelector('.gs-expand-km').value);
      if (!value || value <= 0 || this._strokes.length === 0) return;
      const radiusMeters = this._metersFromDisplayUnit(value);
      for (const s of this._strokes) s.radiusMeters = radiusMeters;
      this._rebuildSelectionFromStrokes();
      this._redraw();
      this._renderList();
      this._emitChange();
    });
  }

  // ---------------------------------------------------------------
  // Pointer + touch handling
  // Mouse:  left-click follows the active tab. Right-click always erases
  //         and middle-click always pans, as optional shortcuts.
  // Touch:  one finger always follows the active tab.
  // ---------------------------------------------------------------
  _wirePointerEvents() {
    const canvas = this._canvas;
    this._painting = false;
    this._activeButton = null;
    this._panLast = null;
    this._touchPanLast = null;

    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      this._activeButton = e.button;

      if (e.button === 2) {
        this._painting = true;
        this._currentGroup = [];
        this._addStrokePoint('erase', e.clientX, e.clientY);
      } else if (e.button === 1) {
        this._panLast = { x: e.clientX, y: e.clientY };
      } else if (e.button === 0) {
        if (this._activeMode === 'pan') {
          this._panLast = { x: e.clientX, y: e.clientY };
        } else {
          this._painting = true;
          this._currentGroup = [];
          this._addStrokePoint(this._activeMode === 'erase' ? 'erase' : 'paint', e.clientX, e.clientY);
        }
      }
      this._redraw();
    });

    canvas.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      this._hoverPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (this._painting && this._activeButton === 2) {
        this._addStrokePoint('erase', e.clientX, e.clientY);
      } else if (this._painting && this._activeButton === 0) {
        this._addStrokePoint(this._activeMode === 'erase' ? 'erase' : 'paint', e.clientX, e.clientY);
      } else if (this._panLast && (this._activeButton === 1 || this._activeButton === 0)) {
        const dx = e.clientX - this._panLast.x;
        const dy = e.clientY - this._panLast.y;
        this._map.panBy([-dx, -dy], { animate: false });
        this._panLast = { x: e.clientX, y: e.clientY };
      }
      this._redraw();
    });

    const endGesture = e => {
      if (e.pointerType === 'touch') return;
      if (this._painting && this._currentGroup.length) this._strokeGroups.push(this._currentGroup);
      if (this._painting) { this._renderList(); this._emitChange(); }
      this._painting = false;
      this._panLast = null;
      this._activeButton = null;
      this._redraw();
    };
    canvas.addEventListener('pointerup', endGesture);
    canvas.addEventListener('pointercancel', endGesture);

    canvas.addEventListener('pointerleave', e => {
      if (e.pointerType === 'touch') return;
      if (this._activeButton === null) {
        this._hoverPoint = null;
        this._redraw();
      }
    });

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      if (this._activeMode === 'pan') {
        this._touchPanLast = { x: t.clientX, y: t.clientY };
      } else {
        this._painting = true;
        this._currentGroup = [];
        this._addStrokePoint(this._activeMode === 'erase' ? 'erase' : 'paint', t.clientX, t.clientY);
      }
      this._redraw();
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      if (this._activeMode === 'pan' && this._touchPanLast) {
        const dx = t.clientX - this._touchPanLast.x;
        const dy = t.clientY - this._touchPanLast.y;
        this._map.panBy([-dx, -dy], { animate: false });
        this._touchPanLast = { x: t.clientX, y: t.clientY };
      } else if (this._painting) {
        this._addStrokePoint(this._activeMode === 'erase' ? 'erase' : 'paint', t.clientX, t.clientY);
      }
      this._redraw();
    }, { passive: false });

    const endTouch = e => {
      e.preventDefault();
      if (e.touches.length > 0) return;
      if (this._painting && this._currentGroup.length) this._strokeGroups.push(this._currentGroup);
      if (this._painting) { this._renderList(); this._emitChange(); }
      this._painting = false;
      this._touchPanLast = null;
      this._redraw();
    };
    canvas.addEventListener('touchend', endTouch, { passive: false });
    canvas.addEventListener('touchcancel', endTouch, { passive: false });
  }
}
