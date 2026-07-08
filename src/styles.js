// Injected into the component's Shadow DOM, so none of this can leak out to
// (or be broken by) the host page's own stylesheet.
export const STYLES = `
  :host {
    display: block;
    width: 100%;
    height: 600px;
    min-height: 300px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --gs-ink: #1c1b19;
    --gs-ink-soft: #55534c;
    --gs-paper: #f6f4ef;
    --gs-panel: #ffffff;
    --gs-line: #e2ded4;
    --gs-accent: #1d6e56;
    --gs-erase: #b4462c;
    box-sizing: border-box;
  }
  *, *::before, *::after { box-sizing: border-box; }

  .gs-app {
    display: flex;
    width: 100%;
    height: 100%;
  }

  .gs-map-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .gs-map {
    position: absolute;
    inset: 0;
    background: #eae7de;
  }

  .gs-canvas {
    position: absolute;
    inset: 0;
    z-index: 450;
    cursor: none;
    touch-action: none;
  }

  .gs-mode-tabs {
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 500;
    background: var(--gs-panel);
    border-bottom: 1px solid var(--gs-line);
  }
  .gs-mode-tabs button {
    flex: 1;
    border: none;
    background: transparent;
    padding: 10px 0;
    font: 500 13px inherit;
    color: var(--gs-ink-soft);
    border-bottom: 3px solid transparent;
    cursor: pointer;
  }
  .gs-mode-tabs button:hover { background: var(--gs-paper); }
  .gs-mode-tabs button.active[data-mode="paint"] { color: var(--gs-accent); border-bottom-color: var(--gs-accent); }
  .gs-mode-tabs button.active[data-mode="erase"] { color: var(--gs-erase); border-bottom-color: var(--gs-erase); }
  .gs-mode-tabs button.active[data-mode="pan"] { color: var(--gs-ink); border-bottom-color: var(--gs-ink-soft); }

  .gs-brush-panel {
    position: absolute;
    bottom: 14px;
    left: 14px;
    z-index: 500;
    background: var(--gs-panel);
    border: 1px solid var(--gs-line);
    border-radius: 10px;
    padding: 8px 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--gs-ink-soft);
  }
  .gs-brush-panel input[type=range] { width: 90px; accent-color: var(--gs-accent); }
  .gs-brush-panel .gs-val { font-family: monospace; color: var(--gs-ink); min-width: 26px; }

  .gs-sidebar {
    width: 260px;
    flex-shrink: 0;
    background: var(--gs-panel);
    border-left: 1px solid var(--gs-line);
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .gs-sidebar.hidden { display: none; }

  .gs-sidebar-header { padding: 14px 16px 10px; border-bottom: 1px solid var(--gs-line); }
  .gs-count { font-size: 26px; font-weight: 600; line-height: 1; }
  .gs-count-label { font-size: 11px; color: var(--gs-ink-soft); font-family: monospace; margin-top: 4px; }

  .gs-actions { display: flex; gap: 6px; padding: 10px 14px; border-bottom: 1px solid var(--gs-line); }
  .gs-btn {
    flex: 1;
    border: 1px solid var(--gs-line);
    background: var(--gs-paper);
    border-radius: 6px;
    padding: 6px 0;
    font-size: 11px;
    font-weight: 500;
    color: var(--gs-ink);
    cursor: pointer;
  }
  .gs-btn:hover { background: #ece9df; }
  .gs-btn:disabled { opacity: 0.4; cursor: default; }

  .gs-expand-panel { padding: 10px 14px; border-bottom: 1px solid var(--gs-line); }
  .gs-expand-panel.hidden { display: none; }
  .gs-expand-panel label { display: block; font-size: 10px; color: var(--gs-ink-soft); font-family: monospace; margin-bottom: 5px; }
  .gs-expand-row { display: flex; gap: 5px; }
  .gs-expand-row input[type=number] {
    width: 56px; border: 1px solid var(--gs-line); background: var(--gs-paper);
    border-radius: 6px; padding: 5px 6px; font-family: monospace; font-size: 12px;
  }
  .gs-expand-unit { align-self: center; font-size: 11px; color: var(--gs-ink-soft); font-family: monospace; }

  .gs-city-list { flex: 1; overflow-y: auto; padding: 4px 0; }
  .gs-city-row {
    display: flex; align-items: baseline;
    padding: 6px 16px; font-size: 12px; border-bottom: 1px solid #f0eee7;
  }
  .gs-city-row .gs-name { font-weight: 500; }
  .gs-city-row .gs-country { color: var(--gs-ink-soft); font-size: 10px; margin-left: 5px; font-family: monospace; }

  .gs-empty-state { padding: 24px 18px; text-align: center; color: var(--gs-ink-soft); font-size: 12px; line-height: 1.5; }

  .leaflet-control-attribution { font-size: 9px !important; }
`;
