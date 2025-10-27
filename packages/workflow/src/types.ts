export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: any;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, any>;
}

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  startTime: Date;
  variables: Record<string, any>;
  nodeResults: Map<string, any>;
  currentNode?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  error?: string;
}

export interface NodeExecutor {
  type: string;
  execute(node: WorkflowNode, context: ExecutionContext): Promise<any>;
}

export interface WorkflowEvent {
  type: 'node_start' | 'node_complete' | 'node_error' | 'workflow_complete' | 'workflow_error' | 'human_input_required';
  executionId: string;
  nodeId?: string;
  data?: any;
  timestamp: Date;
}

export type WorkflowEventListener = (event: WorkflowEvent) => void | Promise<void>;
