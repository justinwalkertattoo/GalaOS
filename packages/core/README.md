# GalaOS Core - Self-Update System

Comprehensive self-update capabilities for GalaOS, enabling the system to upgrade itself from within.

## Features

### 1. Version Management
- Semantic version tracking and comparison
- GitHub release integration
- Version history and changelog tracking
- Pre/post-update health checks

### 2. Code Updates
- Automatic Git pull from remote repository
- Dependency installation (npm/pnpm/yarn auto-detection)
- Database migration execution
- Application build process
- Automatic rollback on failure

### 3. Docker Updates
- Container image update checking
- Individual container updates
- Full docker-compose stack updates
- Container recreation with zero-downtime
- Old image pruning

### 4. Safety Mechanisms
- Automatic backup before updates
- Health checks before and after updates
- Rollback capability
- Multiple backup retention
- Update validation

### 5. Scheduling
- Cron-based automatic updates
- Maintenance window support
- Update notifications
- Manual trigger capability

## Components

### VersionManager

Handles code-level updates and version tracking.

```typescript
import { VersionManager } from '@galaos/core';

const vm = new VersionManager();

// Check for updates
const updates = await vm.checkForUpdates('owner/repo');
console.log(updates.available); // true/false
console.log(updates.latestVersion); // e.g., "1.2.3"

// Perform update
const result = await vm.update({
  branch: 'main',
  skipBackup: false,
  skipMigrations: false,
});

console.log(result.success); // true/false
console.log(result.newVersion); // Updated version

// List backups
const backups = vm.listBackups();

// Rollback if needed
await vm.rollback(backups[0].path);
```

### DockerUpdateManager

Manages Docker container updates.

```typescript
import { DockerUpdateManager } from '@galaos/core';

const dum = new DockerUpdateManager();

// Check for image updates
const updates = await dum.checkForImageUpdates();

// Update specific containers
await dum.updateContainers(['galaos-api', 'galaos-web']);

// Update entire stack
await dum.updateComposeStack('docker/docker-compose.full.yml');

// Prune old images
const pruned = await dum.pruneImages();
console.log(`Reclaimed ${pruned.spaceReclaimed} MB`);
```

### UpdateScheduler

Orchestrates scheduled automatic updates.

```typescript
import { UpdateScheduler } from '@galaos/core';

const scheduler = new UpdateScheduler();
await scheduler.initialize();

// Create custom schedule
await scheduler.createSchedule({
  enabled: true,
  schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
  updateType: 'both', // code + docker
  autoApply: true,
});

// Manual trigger
await scheduler.triggerManualUpdate('both');
```

## API Endpoints

All endpoints require admin authentication.

### Version & Updates

```typescript
// Get current version
await trpc.systemUpdates.getCurrentVersion.query();
// Returns: { version: "0.1.0", major: 0, minor: 1, patch: 0 }

// Check for updates
await trpc.systemUpdates.checkForUpdates.query();
// Returns: { code: {...}, docker: [...] }

// Health check
await trpc.systemUpdates.healthCheck.query();
// Returns: { healthy: true, checks: {...}, errors: [] }
```

### Code Updates

```typescript
// Apply code update
await trpc.systemUpdates.applyCodeUpdate.mutate({
  branch: 'main',
  skipBackup: false,
  skipMigrations: false,
  skipBuild: false,
});
```

### Docker Updates

```typescript
// Update specific containers
await trpc.systemUpdates.applyDockerUpdate.mutate({
  containers: ['galaos-api', 'galaos-web'],
});

// Update entire stack
await trpc.systemUpdates.applyDockerUpdate.mutate({
  composeFile: 'docker/docker-compose.full.yml',
});
```

### Full Update

```typescript
// Update everything
await trpc.systemUpdates.applyFullUpdate.mutate({
  codeOptions: {
    branch: 'main',
    skipBackup: false,
  },
  dockerOptions: {
    composeFile: 'docker/docker-compose.full.yml',
  },
});
```

### Rollback

```typescript
// List backups
const backups = await trpc.systemUpdates.listBackups.query();

// Rollback to specific backup
await trpc.systemUpdates.rollback.mutate({
  backupPath: backups[0].path,
});

// Clean old backups (keep last 5)
await trpc.systemUpdates.cleanBackups.mutate({
  keepCount: 5,
});
```

### Container Management

```typescript
// List GalaOS containers
const containers = await trpc.systemUpdates.listContainers.query();

// Restart all GalaOS containers
await trpc.systemUpdates.restartContainers.mutate();

// Get Docker system info
const info = await trpc.systemUpdates.getDockerInfo.query();

// Prune unused images
await trpc.systemUpdates.pruneImages.mutate();
```

### Scheduling

```typescript
// Create schedule
await trpc.systemUpdates.createSchedule.mutate({
  enabled: true,
  schedule: '0 3 * * 0', // Cron pattern
  updateType: 'both',
  autoApply: true,
});

// List schedules
const schedules = await trpc.systemUpdates.listSchedules.query();

// Remove schedule
await trpc.systemUpdates.removeSchedule.mutate({
  scheduleId: 'schedule-id',
});

// Trigger manual update
await trpc.systemUpdates.triggerUpdate.mutate({
  updateType: 'both',
  options: {},
});

// Get update history
const history = await trpc.systemUpdates.getUpdateHistory.query({
  limit: 20,
});
```

## Default Schedules

GalaOS includes these default automatic update schedules:

1. **Daily Update Check** - 2:00 AM daily
   - Checks for available updates
   - Sends notifications if updates found
   - Does not auto-apply

2. **Weekly Docker Update** - 3:00 AM Sunday
   - Updates all Docker images
   - Recreates containers
   - Prunes old images
   - Auto-applies updates

## Update Process Flow

### Code Update
1. Pre-update health check
2. Create backup (unless skipped)
3. Git pull latest changes
4. Install dependencies
5. Run database migrations (unless skipped)
6. Build application (unless skipped)
7. Post-update health check
8. Rollback on any failure

### Docker Update
1. Pull latest images
2. Stop containers
3. Remove old containers
4. Create new containers with updated images
5. Start new containers
6. Prune old images

### Health Checks
- API endpoint availability
- Database connectivity
- Redis connectivity
- Docker daemon status
- Worker queue status

## Safety Features

### Automatic Backups
- Created before every update
- Stores critical files (package.json, .env, docker-compose, etc.)
- Includes metadata (version, timestamp, node version)
- Automatic cleanup (keeps last 5 by default)

### Rollback on Failure
- Automatic rollback if health check fails
- Manual rollback to any backup
- Restores all backed up files
- Reinstalls dependencies

### Update Validation
- Version comparison (prevents downgrades)
- Breaking change detection (major version bumps)
- Health checks before/after
- Error collection and reporting

## Environment Variables

```bash
# Git repository for updates
GITHUB_REPO=justinwalkertattoo/GalaOS

# Update branch (default: main)
UPDATE_BRANCH=main

# Automatic updates (default: true)
AUTO_UPDATE_ENABLED=true

# Update check frequency (cron pattern)
UPDATE_CHECK_SCHEDULE=0 2 * * *

# Backup retention count (default: 5)
BACKUP_RETENTION_COUNT=5
```

## Security Considerations

1. **Admin Only**: All update endpoints require admin role
2. **Backup Before Update**: Always creates backup unless explicitly skipped
3. **Health Checks**: Validates system health before and after
4. **Rollback Ready**: Can rollback to any previous backup
5. **Audit Trail**: All updates logged to database

## Notifications

Update notifications can be sent via:
- Database logging (always enabled)
- Email (TODO)
- Slack (TODO)
- Webhooks (TODO)

Notification types:
- `update_available`: New version detected
- `update_started`: Update process initiated
- `update_completed`: Update successful
- `update_failed`: Update failed (with error details)

## Best Practices

1. **Always Keep Backups**: Don't skip backups in production
2. **Test in Staging**: Test updates in staging environment first
3. **Maintenance Windows**: Schedule updates during low-traffic periods
4. **Monitor Health**: Check health endpoints after updates
5. **Review Changelogs**: Check breaking changes before updating
6. **Keep Multiple Backups**: Maintain at least 3-5 backups

## Troubleshooting

### Update Failed
```typescript
// Check update history
const history = await trpc.systemUpdates.getUpdateHistory.query();

// View latest update details
console.log(history[0].findings);

// Rollback to previous version
const backups = await trpc.systemUpdates.listBackups.query();
await trpc.systemUpdates.rollback.mutate({
  backupPath: backups[0].path,
});
```

### Health Check Failed
```typescript
// Run health check
const health = await trpc.systemUpdates.healthCheck.query();

// Check specific services
console.log(health.checks.api);       // API status
console.log(health.checks.database);  // Database status
console.log(health.checks.redis);     // Redis status
console.log(health.checks.docker);    // Docker status
console.log(health.errors);           // Error messages
```

### Docker Issues
```typescript
// Check Docker info
const info = await trpc.systemUpdates.getDockerInfo.query();

// List containers
const containers = await trpc.systemUpdates.listContainers.query();

// Restart containers
await trpc.systemUpdates.restartContainers.mutate();
```

## Examples

### Manual Update with Custom Options
```typescript
const result = await trpc.systemUpdates.applyFullUpdate.mutate({
  codeOptions: {
    branch: 'develop',
    skipBackup: false,
    skipMigrations: false,
    skipBuild: false,
  },
  dockerOptions: {
    composeFile: 'docker/docker-compose.full.yml',
  },
});

if (result.code.success && result.docker.success) {
  console.log('Update completed successfully!');
  console.log(`Version: ${result.code.previousVersion} → ${result.code.newVersion}`);
} else {
  console.error('Update failed:', result.code.errors, result.docker.errors);
}
```

### Schedule Nightly Updates
```typescript
await trpc.systemUpdates.createSchedule.mutate({
  enabled: true,
  schedule: '0 2 * * *', // 2 AM daily
  updateType: 'both',
  autoApply: true,
});
```

### Emergency Rollback
```typescript
// Get most recent backup
const backups = await trpc.systemUpdates.listBackups.query();
const latest = backups[0];

// Rollback
await trpc.systemUpdates.rollback.mutate({
  backupPath: latest.path,
});

// Verify health
const health = await trpc.systemUpdates.healthCheck.query();
console.log('System healthy:', health.healthy);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Update Scheduler                         │
│  - Cron-based scheduling                                    │
│  - Job queue management                                     │
│  - Notification dispatch                                    │
└───────────────┬────────────────────────┬────────────────────┘
                │                        │
      ┌─────────▼─────────┐    ┌────────▼───────────┐
      │ Version Manager   │    │ Docker Manager     │
      │ - Git operations  │    │ - Image updates    │
      │ - Dependencies    │    │ - Container mgmt   │
      │ - Migrations      │    │ - Stack updates    │
      │ - Build process   │    │ - Pruning          │
      │ - Backups         │    └────────────────────┘
      │ - Rollback        │
      │ - Health checks   │
      └───────────────────┘
```

## License

Part of GalaOS - See main repository for license details.
