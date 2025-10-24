import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  ExecutionContext,
  WorkflowEvent,
  WorkflowEventListener,
} from './types';
import { globalNodeExecutorRegistry } from './nodes';

export class WorkflowEngine {
  private listeners: WorkflowEventListener[] = [];
  private pausedExecutions: Map<string, ExecutionContext> = new Map();

  on(listener: WorkflowEventListener): void {
    this.listeners.push(listener);
  }

  off(listener: WorkflowEventListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private emit(event: WorkflowEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  async execute(
    workflow: WorkflowDefinition,
    input: Record<string, any> = {}
  ): Promise<ExecutionContext> {
    const context: ExecutionContext = {
      executionId: this.generateExecutionId(),
      workflowId: 'workflow',
      startTime: new Date(),
      variables: { ...workflow.variables, ...input },
      nodeResults: new Map(),
      status: 'running',
    };

    try {
      // Find entry points (nodes with no incoming edges)
      const entryNodes = this.findEntryNodes(workflow);

      if (entryNodes.length === 0) {
        throw new Error('No entry points found in workflow');
      }

      // Execute workflow starting from entry points
      for (const node of entryNodes) {
        await this.executeNode(node, workflow, context);
      }

      context.status = 'completed';
      this.emit({
        type: 'workflow_complete',
        executionId: context.executionId,
        timestamp: new Date(),
      });
    } catch (error) {
      context.status = 'failed';
      context.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit({
        type: 'workflow_error',
        executionId: context.executionId,
        data: { error: context.error },
        timestamp: new Date(),
      });
    }

    return context;
  }

  private async executeNode(
    node: WorkflowNode,
    workflow: WorkflowDefinition,
    context: ExecutionContext
  ): Promise<any> {
    // Check if this node was already executed
    if (context.nodeResults.has(node.id)) {
      return context.nodeResults.get(node.id);
    }

    context.currentNode = node.id;

    this.emit({
      type: 'node_start',
      executionId: context.executionId,
      nodeId: node.id,
      timestamp: new Date(),
    });

    try {
      // Get executor for this node type
      const executor = globalNodeExecutorRegistry.get(node.type);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      // Execute the node
      const result = await executor.execute(node, context);

      // Handle human input node specially
      if (node.type === 'human_input' && result.status === 'awaiting_input') {
        context.status = 'paused';
        this.pausedExecutions.set(context.executionId, context);

        this.emit({
          type: 'human_input_required',
          executionId: context.executionId,
          nodeId: node.id,
          data: result,
          timestamp: new Date(),
        });

        return result;
      }

      // Store result
      context.nodeResults.set(node.id, result);

      this.emit({
        type: 'node_complete',
        executionId: context.executionId,
        nodeId: node.id,
        data: result,
        timestamp: new Date(),
      });

      // Find and execute next nodes
      const nextNodes = this.findNextNodes(node.id, workflow, context, result);
      for (const nextNode of nextNodes) {
        await this.executeNode(nextNode, workflow, context);
      }

      return result;
    } catch (error) {
      this.emit({
        type: 'node_error',
        executionId: context.executionId,
        nodeId: node.id,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async resumeExecution(
    executionId: string,
    nodeId: string,
    userInput: any
  ): Promise<ExecutionContext> {
    const context = this.pausedExecutions.get(executionId);
    if (!context) {
      throw new Error(`No paused execution found: ${executionId}`);
    }

    // Store user input
    context.nodeResults.set(nodeId, userInput);
    context.status = 'running';

    // Continue execution from the next node
    // This is simplified - in production you'd need to reconstruct the workflow state
    this.pausedExecutions.delete(executionId);

    return context;
  }

  private findEntryNodes(workflow: WorkflowDefinition): WorkflowNode[] {
    const nodesWithIncoming = new Set(workflow.edges.map((e) => e.target));
    return workflow.nodes.filter((node) => !nodesWithIncoming.has(node.id));
  }

  private findNextNodes(
    nodeId: string,
    workflow: WorkflowDefinition,
    context: ExecutionContext,
    nodeResult: any
  ): WorkflowNode[] {
    const outgoingEdges = workflow.edges.filter((e) => e.source === nodeId);

    const validEdges = outgoingEdges.filter((edge) => {
      if (!edge.condition) return true;

      // Evaluate condition
      const { type, value } = edge.condition;
      if (type === 'equals') return nodeResult === value;
      if (type === 'truthy') return !!nodeResult;
      if (type === 'falsy') return !nodeResult;

      return true;
    });

    return validEdges
      .map((edge) => workflow.nodes.find((n) => n.id === edge.target))
      .filter(Boolean) as WorkflowNode[];
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getExecution(executionId: string): ExecutionContext | undefined {
    return this.pausedExecutions.get(executionId);
  }

  listPausedExecutions(): string[] {
    return Array.from(this.pausedExecutions.keys());
  }
}
