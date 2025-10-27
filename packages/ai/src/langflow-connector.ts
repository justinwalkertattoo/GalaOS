/**
 * Langflow Integration for GalaOS
 *
 * Langflow is a visual framework for building LLM applications.
 * This connector allows GalaOS to execute Langflow flows programmatically.
 *
 * Features:
 * - Execute Langflow flows via API
 * - Real-time streaming support
 * - Flow versioning and management
 * - Custom component integration
 * - Visual workflow builder integration
 */

import axios, { AxiosInstance } from 'axios';

export interface LangflowConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface LangflowFlow {
  id: string;
  name: string;
  description?: string;
  data: any; // Flow JSON structure
  is_component?: boolean;
  updated_at?: string;
  folder?: string;
}

export interface LangflowExecutionInput {
  flowId: string;
  inputValue?: string;
  inputType?: 'chat' | 'text' | 'json';
  tweaks?: Record<string, any>; // Override component parameters
  stream?: boolean;
  sessionId?: string;
}

export interface LangflowExecutionResult {
  result: any;
  session_id: string;
  outputs: Array<{
    type: string;
    value: any;
    component: string;
  }>;
  messages?: Array<{
    role: string;
    content: string;
  }>;
}

export interface LangflowComponent {
  name: string;
  display_name: string;
  description: string;
  type: string;
  inputs: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: any;
  }>;
  outputs: Array<{
    name: string;
    type: string;
  }>;
}

/**
 * Langflow Client
 */
export class LangflowClient {
  private axios: AxiosInstance;
  private config: LangflowConfig;

  constructor(config: LangflowConfig) {
    this.config = config;

    this.axios = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 60000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
    });
  }

  /**
   * List all flows
   */
  async listFlows(): Promise<LangflowFlow[]> {
    try {
      const response = await this.axios.get('/api/v1/flows');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to list flows: ${error.message}`);
    }
  }

  /**
   * Get flow by ID
   */
  async getFlow(flowId: string): Promise<LangflowFlow> {
    try {
      const response = await this.axios.get(`/api/v1/flows/${flowId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get flow: ${error.message}`);
    }
  }

  /**
   * Create a new flow
   */
  async createFlow(flow: Partial<LangflowFlow>): Promise<LangflowFlow> {
    try {
      const response = await this.axios.post('/api/v1/flows', flow);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create flow: ${error.message}`);
    }
  }

  /**
   * Update existing flow
   */
  async updateFlow(flowId: string, flow: Partial<LangflowFlow>): Promise<LangflowFlow> {
    try {
      const response = await this.axios.patch(`/api/v1/flows/${flowId}`, flow);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to update flow: ${error.message}`);
    }
  }

  /**
   * Delete flow
   */
  async deleteFlow(flowId: string): Promise<void> {
    try {
      await this.axios.delete(`/api/v1/flows/${flowId}`);
    } catch (error: any) {
      throw new Error(`Failed to delete flow: ${error.message}`);
    }
  }

  /**
   * Execute a flow
   */
  async executeFlow(input: LangflowExecutionInput): Promise<LangflowExecutionResult> {
    try {
      const payload: any = {
        input_value: input.inputValue || '',
        input_type: input.inputType || 'chat',
        output_type: 'chat',
      };

      if (input.tweaks) {
        payload.tweaks = input.tweaks;
      }

      if (input.sessionId) {
        payload.session_id = input.sessionId;
      }

      const response = await this.axios.post(
        `/api/v1/run/${input.flowId}`,
        payload
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to execute flow: ${error.message}`);
    }
  }

  /**
   * Execute flow with streaming
   */
  async executeFlowStream(
    input: LangflowExecutionInput,
    onChunk: (chunk: any) => void
  ): Promise<void> {
    try {
      const payload: any = {
        input_value: input.inputValue || '',
        input_type: input.inputType || 'chat',
        output_type: 'chat',
        stream: true,
      };

      if (input.tweaks) {
        payload.tweaks = input.tweaks;
      }

      if (input.sessionId) {
        payload.session_id = input.sessionId;
      }

      const response = await this.axios.post(
        `/api/v1/run/${input.flowId}`,
        payload,
        {
          responseType: 'stream',
        }
      );

      response.data.on('data', (chunk: Buffer) => {
        try {
          const text = chunk.toString();
          const lines = text.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              onChunk(data);
            }
          }
        } catch (error) {
          console.error('Error parsing stream chunk:', error);
        }
      });

      return new Promise((resolve, reject) => {
        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
    } catch (error: any) {
      throw new Error(`Failed to execute flow stream: ${error.message}`);
    }
  }

  /**
   * Get available components
   */
  async listComponents(): Promise<LangflowComponent[]> {
    try {
      const response = await this.axios.get('/api/v1/components');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to list components: ${error.message}`);
    }
  }

  /**
   * Get component details
   */
  async getComponent(componentName: string): Promise<LangflowComponent> {
    try {
      const response = await this.axios.get(`/api/v1/components/${componentName}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get component: ${error.message}`);
    }
  }

  /**
   * Build flow from template
   */
  async buildFlowFromTemplate(template: LangflowFlowTemplate): Promise<LangflowFlow> {
    const flowData = {
      name: template.name,
      description: template.description,
      data: {
        nodes: template.nodes.map((node, index) => ({
          id: `node_${index}`,
          type: node.type,
          position: node.position || { x: index * 200, y: 100 },
          data: {
            type: node.type,
            node: {
              template: node.params || {},
            },
          },
        })),
        edges: template.connections.map((conn, index) => ({
          id: `edge_${index}`,
          source: `node_${conn.from}`,
          target: `node_${conn.to}`,
          sourceHandle: conn.output || 'output',
          targetHandle: conn.input || 'input',
        })),
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    };

    return await this.createFlow(flowData);
  }
}

// Flow Template Structure
export interface LangflowFlowTemplate {
  name: string;
  description: string;
  nodes: Array<{
    type: string;
    position?: { x: number; y: number };
    params?: Record<string, any>;
  }>;
  connections: Array<{
    from: number; // Node index
    to: number;
    output?: string;
    input?: string;
  }>;
}

/**
 * Langflow Template Library
 */
export class LangflowTemplates {
  /**
   * Simple chat template
   */
  static chatbot(): LangflowFlowTemplate {
    return {
      name: 'Simple Chatbot',
      description: 'Basic chatbot with conversation memory',
      nodes: [
        {
          type: 'ChatInput',
          params: { input_value: '{user_message}' },
        },
        {
          type: 'ConversationBufferMemory',
          params: { memory_key: 'chat_history' },
        },
        {
          type: 'ChatOpenAI',
          params: {
            model_name: 'gpt-4',
            temperature: 0.7,
          },
        },
        {
          type: 'ChatOutput',
        },
      ],
      connections: [
        { from: 0, to: 2 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ],
    };
  }

  /**
   * RAG (Retrieval-Augmented Generation) template
   */
  static rag(): LangflowFlowTemplate {
    return {
      name: 'RAG System',
      description: 'Document Q&A with vector search',
      nodes: [
        {
          type: 'TextInput',
          params: { input_value: '{query}' },
        },
        {
          type: 'VectorStoreRetriever',
          params: { k: 5 },
        },
        {
          type: 'PromptTemplate',
          params: {
            template:
              'Answer based on context:\n\nContext: {context}\n\nQuestion: {question}',
          },
        },
        {
          type: 'ChatOpenAI',
          params: { model_name: 'gpt-4' },
        },
        {
          type: 'TextOutput',
        },
      ],
      connections: [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
      ],
    };
  }

  /**
   * Agent with tools template
   */
  static agentWithTools(): LangflowFlowTemplate {
    return {
      name: 'Agent with Tools',
      description: 'AI agent that can use external tools',
      nodes: [
        {
          type: 'ChatInput',
        },
        {
          type: 'GoogleSearchTool',
        },
        {
          type: 'CalculatorTool',
        },
        {
          type: 'WebScrapeTool',
        },
        {
          type: 'AgentInitializer',
          params: {
            agent_type: 'zero-shot-react-description',
          },
        },
        {
          type: 'ChatOpenAI',
          params: { model_name: 'gpt-4', temperature: 0 },
        },
        {
          type: 'ChatOutput',
        },
      ],
      connections: [
        { from: 0, to: 4 },
        { from: 1, to: 4 },
        { from: 2, to: 4 },
        { from: 3, to: 4 },
        { from: 4, to: 5 },
        { from: 5, to: 6 },
      ],
    };
  }

  /**
   * Sequential chain template
   */
  static sequentialChain(): LangflowFlowTemplate {
    return {
      name: 'Sequential Processing Chain',
      description: 'Multi-step processing pipeline',
      nodes: [
        {
          type: 'TextInput',
        },
        {
          type: 'LLMChain',
          params: {
            llm: 'ChatOpenAI',
            prompt: 'Summarize: {text}',
          },
        },
        {
          type: 'LLMChain',
          params: {
            llm: 'ChatOpenAI',
            prompt: 'Translate to Spanish: {summary}',
          },
        },
        {
          type: 'LLMChain',
          params: {
            llm: 'ChatOpenAI',
            prompt: 'Create title for: {translation}',
          },
        },
        {
          type: 'TextOutput',
        },
      ],
      connections: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
      ],
    };
  }
}

/**
 * Example Usage
 */
export async function exampleLangflowUsage() {
  // Initialize client
  const client = new LangflowClient({
    baseUrl: 'http://localhost:7860',
    apiKey: process.env.LANGFLOW_API_KEY,
  });

  // List flows
  const flows = await client.listFlows();
  console.log('Available flows:', flows);

  // Create flow from template
  const chatbotTemplate = LangflowTemplates.chatbot();
  const flow = await client.buildFlowFromTemplate(chatbotTemplate);
  console.log('Created flow:', flow.id);

  // Execute flow
  const result = await client.executeFlow({
    flowId: flow.id,
    inputValue: 'Hello! How are you?',
    inputType: 'chat',
  });
  console.log('Flow result:', result);

  // Execute with streaming
  await client.executeFlowStream(
    {
      flowId: flow.id,
      inputValue: 'Tell me a story',
      inputType: 'chat',
    },
    (chunk) => {
      console.log('Stream chunk:', chunk);
    }
  );
}
