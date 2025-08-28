import ServiceStore from './services/data.js';
import { initServicesUI, renderServicesList } from './services/ui.js';

export function renderServices(names) {
  initServicesUI();
  ServiceStore.setData(names);
  renderServicesList();
}
