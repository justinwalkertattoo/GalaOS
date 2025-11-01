export * from './types';
export * from './sdks';
export * from './apis';
export * from './licenses';
export * from './suggestions';

import { SDKS } from './sdks';
import { APIS } from './apis';
import { LICENSES } from './licenses';
import { SUGGESTIONS } from './suggestions';
import type { SDKEntry, APIProviderEntry, LicenseEntry } from './types';

export class Catalog {
  get sdks(): SDKEntry[] { return SDKS; }
  get apis(): APIProviderEntry[] { return APIS; }
  get licenses(): LicenseEntry[] { return LICENSES; }
  get suggestions() { return SUGGESTIONS; }

  findSdkById(id: string) { return SDKS.find(s => s.id === id); }
  findApiById(id: string) { return APIS.find(a => a.id === id); }
  getSdksByCategory(category: string) { return SDKS.filter(s => s.category === category); }
  getApisByCategory(category: string) { return APIS.filter(a => a.category === category); }
}

