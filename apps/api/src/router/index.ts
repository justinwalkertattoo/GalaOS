import { router } from '../trpc';
import { authRouter } from './auth';
import { workspaceRouter } from './workspace';
import { workflowRouter } from './workflow';
import { aiRouter } from './ai';
import { integrationRouter } from './integration';

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  workflow: workflowRouter,
  ai: aiRouter,
  integration: integrationRouter,
});

export type AppRouter = typeof appRouter;
