# GalaOS Plugin Architecture

## Overview

GalaOS uses a **plugin-based architecture** that allows business modules to be installed as "applications" on top of the core platform. This design follows the analogy:

- **GalaOS** = Operating System (like Windows)
- **Gala** = AI Copilot (like Cortana)
- **Business Modules** = Installed Applications (like node modules)

Each business module is a self-contained package that can:
- Define its own routes and UI components
- Create custom databases with specific schemas
- Provide pre-built workflow templates
- Require specific integrations (Instagram, Slack, etc.)
- Run lifecycle hooks (install, uninstall, activate, deactivate)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      GalaOS Core                        │
│  (Platform + AI + Workflows + Integrations)             │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │
         ┌────────────────┴────────────────┐
         │     Plugin Manager              │
         │  - Module Registry              │
         │  - Lifecycle Management         │
         │  - Route Management             │
         └────────────────┬────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                  │
    ┌────▼────┐                      ┌────▼────┐
    │ Tattoo  │                      │ Future  │
    │ Guild   │                      │ Module  │
    └─────────┘                      └─────────┘
```

## Directory Structure

```
GalaOS/
├── packages/
│   ├── core/              # Core utilities + Plugin Manager
│   ├── db/                # Database schemas (including BusinessModule)
│   ├── tattoo-guild/      # First business module
│   │   ├── src/
│   │   │   ├── types.ts        # TypeScript types
│   │   │   ├── module.ts       # Module definition
│   │   │   └── index.ts        # Package exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── ...
├── apps/
│   ├── api/               # tRPC API (registers modules)
│   └── web/               # Next.js web UI
└── ...
```

## Database Schema

### BusinessModule
Stores installed modules per workspace:
- `moduleType`: Unique identifier (e.g., "tattoo-guild")
- `config`: Module-specific configuration
- `isActive`: Whether module is currently active
- `isInstalled`: Installation status

### ModuleRoute
Routes that modules register:
- `path`: URL path (e.g., "/tattoo-guild/clients")
- `component`: React component to render
- `requiredRole`: Access control

### ModuleWorkflow
Pre-built workflow templates:
- `template`: Workflow definition (nodes, edges)
- `trigger`: When to auto-run the workflow
- `category`: Workflow category

### ModuleDatabase
Database schemas to create:
- `schema`: Database property definitions
- `templateData`: Optional seed data

## Creating a Business Module

### 1. Package Structure

Create a new package in `packages/your-module/`:

```typescript
// packages/your-module/src/module.ts
import type { BusinessModuleDefinition } from '@galaos/core';

export const YourModule: BusinessModuleDefinition = {
  id: 'your-module',
  name: 'Your Module',
  description: 'Module description',
  version: '1.0.0',
  icon: '🚀',
  author: 'Your Name',

  defaultConfig: {
    // Module-specific configuration
  },

  routes: [
    {
      path: '/your-module',
      name: 'Dashboard',
      component: 'your-module/Dashboard',
      icon: '📊',
      order: 0,
    },
  ],

  workflows: [
    {
      name: 'Example Workflow',
      description: 'Automated workflow',
      category: 'automation',
      template: {
        nodes: [...],
        edges: [...],
      },
    },
  ],

  databases: [
    {
      name: 'Your Database',
      icon: '📋',
      schema: [
        { name: 'Title', type: 'text', required: true },
        { name: 'Status', type: 'select', options: ['Active', 'Completed'] },
      ],
    },
  ],

  requiredIntegrations: ['instagram', 'slack'],

  async onInstall(workspaceId, config) {
    // Run when module is installed
  },

  async onUninstall(workspaceId) {
    // Run when module is uninstalled
  },

  async onActivate(workspaceId) {
    // Run when module is activated
  },

  async onDeactivate(workspaceId) {
    // Run when module is deactivated
  },
};
```

### 2. Register Module

In `apps/api/src/index.ts`:

```typescript
import { getPluginManager } from '@galaos/core';
import { YourModule } from '@galaos/your-module';

const pluginManager = getPluginManager(prisma);
pluginManager.register(YourModule);
```

### 3. Add Package Dependency

In `apps/api/package.json`:

```json
{
  "dependencies": {
    "@galaos/your-module": "*"
  }
}
```

## API Endpoints

### List Available Modules
```typescript
trpc.modules.listAvailable.query()
```

### Install Module
```typescript
trpc.modules.install.mutate({
  workspaceId: 'workspace-id',
  moduleId: 'tattoo-guild',
  config: { ... }
})
```

### Activate/Deactivate Module
```typescript
trpc.modules.activate.mutate({
  workspaceId: 'workspace-id',
  moduleId: 'tattoo-guild'
})

trpc.modules.deactivate.mutate({
  workspaceId: 'workspace-id',
  moduleId: 'tattoo-guild'
})
```

### Get Active Routes
```typescript
trpc.modules.getRoutes.query({
  workspaceId: 'workspace-id'
})
```

## Tattoo Guild Module

The first business module for GalaOS is **Tattoo Guild**, designed for tattoo artists and studios.

### Features

1. **Client Management**
   - Client database with contact info, preferences, visit history
   - Photo consent tracking
   - Tags and notes

2. **Design Portfolio**
   - Design gallery with styles, placement options
   - Flash vs custom vs commission categorization
   - Pricing and estimated time

3. **Appointment Scheduling**
   - Calendar view of appointments
   - Status tracking (scheduled, confirmed, completed, etc.)
   - Deposit and payment tracking

4. **Flash Management**
   - Flash designs with sale prices
   - Instagram integration for auto-posting
   - View and inquiry tracking

5. **Instagram Automation**
   - Auto-post flash designs
   - AI-generated captions
   - Watermark support
   - Hashtag management

6. **Revenue Tracking**
   - Session, deposit, flash, merchandise revenue
   - Payment method tracking
   - Monthly and yearly reports

### Pre-built Workflows

1. **Client Onboarding**
   - Send welcome email
   - Create client folder
   - Set up initial tasks

2. **Appointment Reminder**
   - Daily check for appointments 24 hours away
   - Send SMS reminders
   - Mark reminder sent

3. **Instagram Flash Post**
   - Triggered when flash is created
   - AI generates caption
   - Add watermark
   - Post to Instagram

4. **Monthly Revenue Report**
   - Run on 1st of month
   - Query last month's revenue
   - AI analyzes trends
   - Email report

### Installation

```typescript
// Install Tattoo Guild in a workspace
await trpc.modules.install.mutate({
  workspaceId: 'justin-walker-tattoo',
  moduleId: 'tattoo-guild',
  config: {
    studioName: 'Justin Walker Tattoo',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    defaultSessionDuration: 180,
    depositPercentage: 50,
    instagramAutoPost: true,
    workDays: [1, 2, 3, 4, 5], // Mon-Fri
    workHours: { start: '10:00', end: '18:00' },
  }
})
```

## Multi-Brand Strategy

The plugin architecture allows you to:

1. **Use GalaOS for multiple businesses**
   - Each workspace can have different modules installed
   - Justin Walker Tattoo workspace has Tattoo Guild
   - Future tech brand workspace could have different modules

2. **Module isolation**
   - Each module's data is isolated per workspace
   - Routes are only visible when module is active
   - Workflows only run for active modules

3. **Easy brand creation**
   - Create new workspace
   - Install relevant modules
   - Configure module settings
   - Start operating

## Lifecycle Hooks

### onInstall
- Create initial databases with seed data
- Set up default workflows
- Configure integrations
- Initialize module-specific resources

### onUninstall
- Clean up databases
- Remove workflows
- Disconnect integrations
- Archive module data

### onActivate
- Enable workflows
- Sync integrations
- Make routes visible
- Resume background jobs

### onDeactivate
- Pause workflows
- Disconnect integrations
- Hide routes
- Stop background jobs

## Best Practices

1. **Version your modules** - Use semantic versioning
2. **Provide defaults** - Always have sensible `defaultConfig`
3. **Document configuration** - Make it clear what each config option does
4. **Test lifecycle hooks** - Ensure install/uninstall is clean
5. **Handle errors gracefully** - Don't crash on missing integrations
6. **Respect workspace isolation** - Never mix data between workspaces
7. **Make routes optional** - Allow users to customize visibility
8. **Provide templates** - Give users starting workflows they can customize

## Future Modules

Ideas for future business modules:

- **Photography Studio** - Client bookings, photo galleries, contract management
- **Consulting Business** - Time tracking, invoicing, client portal
- **E-commerce Store** - Inventory, orders, shipping, customer service
- **Content Creation** - Publishing calendar, sponsor management, analytics
- **Event Planning** - Venue booking, vendor management, guest lists
- **Music Studio** - Session booking, project management, royalty tracking

Each module would follow the same pattern:
1. Define module in `packages/module-name/`
2. Register in API startup
3. Install per workspace
4. Configure for specific business needs

## Development

### Run migrations after schema changes
```bash
npx prisma generate
npx prisma migrate dev
```

### Build all packages
```bash
npm run build
```

### Test module registration
```bash
npm run dev --workspace=@galaos/api
```

Check logs for:
```
Registered business modules
Registered module: Tattoo Guild (tattoo-guild)
```

## Summary

GalaOS's plugin architecture enables:
- **Modularity** - Each business module is self-contained
- **Reusability** - Modules can be installed across workspaces
- **Scalability** - Easy to add new modules for different industries
- **Flexibility** - Users control which modules are active
- **Isolation** - Data and functionality are workspace-specific

This design allows GalaOS to function as a true "operating system" where business applications can be installed, configured, and managed independently.
