# @galaos/catalog

Curated, versionable reference library for:

- SDKs (by category, language, license, maturity)
- Open-source licenses (SPDX, compatibility notes)
- Platforms/Services with public APIs (auth, docs, rate-limits, SDKs)
- Suggested additions relevant to GalaOS (recommended picks)

Exported as TypeScript constants plus lightweight query helpers. No runtime deps.

## Usage

```ts
import { SDKS, APIS, LICENSES, SUGGESTIONS, Catalog } from '@galaos/catalog';

// Raw data
console.log(SDKS.length, APIS.length, LICENSES.length);

// Helpers
const cat = new Catalog();
const aiSdks = cat.getSdksByCategory('ai');
const slack = cat.findApiById('slack');
const permissive = LICENSES.filter(l => l.permissive);
```

## Structure

- `src/types.ts` — shared types
- `src/sdks.ts` — curated SDK entries
- `src/apis.ts` — platforms/services with public APIs
- `src/licenses.ts` — common OSS licenses
- `src/suggestions.ts` — recommended stacks/picks for GalaOS
- `src/index.ts` — exports and helper class

## Contributing

- Keep entries small, factual, and cite `docsUrl`/`sourceUrl` where applicable.
- Prefer SPDX IDs for licenses.
- Avoid subjective language; use `maturity` and `notes` fields.

