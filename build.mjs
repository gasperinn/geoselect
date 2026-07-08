import * as esbuild from 'esbuild';

const shared = {
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  loader: { '.css': 'text' }, // Leaflet's CSS is inlined as a string and injected
                               // into the component's Shadow DOM at runtime —
                               // no separate <link> tag needed by consumers.
};

// ESM build — for `import GeoSelect from 'geoselect'` with any bundler,
// or directly via <script type="module">.
await esbuild.build({
  ...shared,
  format: 'esm',
  outfile: 'dist/geoselect.esm.js',
});

// IIFE build — for plain `<script src="geoselect.global.js">` with no
// bundler at all. Exposes `window.GeoSelect` and self-registers the
// <geo-select> tag on load either way.
await esbuild.build({
  ...shared,
  format: 'iife',
  globalName: 'GeoSelect',
  outfile: 'dist/geoselect.global.js',
});

console.log('Build complete: dist/geoselect.esm.js, dist/geoselect.global.js');
