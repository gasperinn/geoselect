import { GeoSelect } from './GeoSelect.js';

if (!customElements.get('geo-select')) {
  customElements.define('geo-select', GeoSelect);
}

export { GeoSelect };
export default GeoSelect;
