import { router } from '../trpc';
import { authRouter } from './auth';
import { workspaceRouter } from './workspace';
import { workflowRouter } from './workflow';
import { aiRouter } from './ai';
import { integrationRouter } from './integration';
import { orchestrationRouter } from './orchestration';
import { inboxRouter } from './inbox';
import { settingsRouter } from './settings';
import { agentsRouter } from './agents';
import { modelsRouter } from './models';

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  workflow: workflowRouter,
  ai: aiRouter,
  integration: integrationRouter,
  orchestration: orchestrationRouter,
  inbox: inboxRouter,
  settings: settingsRouter,
  agents: agentsRouter,
  models: modelsRouter,
});

export type AppRouter = typeof appRouter;
