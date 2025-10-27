import { z } from 'zod';

export const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  workspaceId: z.string().optional(),
  definition: z.any(),
  trigger: z.any().optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  definition: z.any().optional(),
  trigger: z.any().optional(),
  isActive: z.boolean().optional(),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

export type WorkflowNodeType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'loop'
  | 'transform'
  | 'ai'
  | 'http'
  | 'webhook';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, any>;
}

export type WorkflowExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface WorkflowExecutionTrace {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  input?: any;
  output?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}
