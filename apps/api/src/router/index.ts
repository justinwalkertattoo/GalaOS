import { router } from '../trpc';
import { authRouter } from './auth';
import { workspaceRouter } from './workspace';
import { workflowRouter } from './workflow';
import { aiRouter } from './ai';
import { integrationRouter } from './integration';
import { orchestrationRouter } from './orchestration';
import { inboxRouter } from './inbox';
import { inboxEnhancedRouter } from './inbox-enhanced';
import { artTrainingRouter } from './art-training';
import { settingsRouter } from './settings';
import { agentsRouter } from './agents';
import { modelsRouter } from './models';
import { sandboxRouter } from './sandbox';
import { toolsRouter } from './tools';
import { skillsRouter } from './skills';

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  workflow: workflowRouter,
  ai: aiRouter,
  integration: integrationRouter,
  orchestration: orchestrationRouter,
  inbox: inboxRouter,
  inboxEnhanced: inboxEnhancedRouter,
  artTraining: artTrainingRouter,
  settings: settingsRouter,
  agents: agentsRouter,
  models: modelsRouter,
  sandbox: sandboxRouter,
  tools: toolsRouter,
  skills: skillsRouter,
});

export type AppRouter = typeof appRouter;
