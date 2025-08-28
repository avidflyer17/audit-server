import { setServicesData } from './services/data.js';
import { initServicesUI, renderServicesList } from './services/ui.js';

export function renderServices(names) {
  initServicesUI();
  setServicesData(names);
  renderServicesList();
}
