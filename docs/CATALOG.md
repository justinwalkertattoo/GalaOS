**GalaOS Catalog**
- Package: `packages/catalog`
- Import: `@galaos/catalog`

Purpose
- Central, typed reference for SDKs, APIs/platforms, OSS licenses, and recommended picks.
- Enables quick discovery and consistent decisions during development.

Usage
- Data: `SDKS`, `APIS`, `LICENSES`, `SUGGESTIONS`
- Helper: `Catalog` class for simple queries.

Examples
```ts
import { Catalog } from '@galaos/catalog';
const cat = new Catalog();
const aiSdks = cat.getSdksByCategory('ai');
const slack = cat.findApiById('slack');
const permissive = cat.licenses.filter(l => l.permissive);
```

Contributing
- Keep entries concise with `docsUrl`/`sourceUrl`.
- Use SPDX IDs for `license` and `spdx` fields.
- Prefer neutral descriptions; capture nuance in `notes`.

