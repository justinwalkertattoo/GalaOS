import { router } from '../trpc';
import { authRouter } from './auth';
import { workspaceRouter } from './workspace';
import { workflowRouter } from './workflow';
import { aiRouter } from './ai';
import { integrationRouter } from './integration';
import { orchestrationRouter } from './orchestration';
import { inboxRouter } from './inbox';

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  workflow: workflowRouter,
  ai: aiRouter,
  integration: integrationRouter,
  orchestration: orchestrationRouter,
  inbox: inboxRouter,
});

export type AppRouter = typeof appRouter;
