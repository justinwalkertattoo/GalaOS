import { AgentConfig, Message, AgentResponse, ToolCall } from './types';
import { createProvider, AIProviderClient, ProviderConfig } from './providers';
import { ToolRegistry } from './tool-registry';

export class Agent {
  private config: AgentConfig;
  private provider: AIProviderClient;
  private conversationHistory: Message[] = [];
  private toolRegistry: ToolRegistry;

  constructor(config: AgentConfig, providerConfig: ProviderConfig, toolRegistry?: ToolRegistry) {
    this.config = config;
    this.provider = createProvider(providerConfig);
    this.toolRegistry = toolRegistry || new ToolRegistry();

    // Register agent's tools
    if (config.tools) {
      this.toolRegistry.registerMultiple(config.tools);
    }

    // Initialize with system prompt
    if (config.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: config.systemPrompt,
      });
    }
  }

  async chat(userMessage: string, options?: { maxIterations?: number }): Promise<string> {
    const maxIterations = options?.maxIterations || 5;
    let iterations = 0;

    // Add user message
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    while (iterations < maxIterations) {
      iterations++;

      // Get response from AI
      const response = await this.provider.chat(this.conversationHistory, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        tools: this.config.tools,
      });

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content,
        });
        return response.content;
      }

      // Execute tool calls
      const toolResults = await this.executeToolCalls(response.toolCalls);

      // Add assistant's response with tool calls
      this.conversationHistory.push({
        role: 'assistant',
        content: response.content || 'Using tools...',
      });

      // Add tool results to conversation
      const toolResultsMessage = toolResults
        .map((result) => `Tool ${result.name} result: ${JSON.stringify(result.result)}`)
        .join('\n');

      this.conversationHistory.push({
        role: 'user',
        content: `Tool results:\n${toolResultsMessage}`,
      });

      // Check if we got a final answer
      if (response.finishReason === 'stop' || response.finishReason === 'end_turn') {
        break;
      }
    }

    // Get final response after tool execution
    const finalResponse = await this.provider.chat(this.conversationHistory, {
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    this.conversationHistory.push({
      role: 'assistant',
      content: finalResponse.content,
    });

    return finalResponse.content;
  }

  private async executeToolCalls(
    toolCalls: ToolCall[]
  ): Promise<Array<{ name: string; result: any; error?: string }>> {
    const results = await Promise.all(
      toolCalls.map(async (call) => {
        try {
          const result = await this.toolRegistry.execute(call.name, call.parameters);
          return { name: call.name, result };
        } catch (error) {
          return {
            name: call.name,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return results;
  }

  async execute(input: any): Promise<any> {
    // For structured execution without chat interface
    const message = typeof input === 'string' ? input : JSON.stringify(input);
    return await this.chat(message);
  }

  getConversationHistory(): Message[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    const systemMessages = this.conversationHistory.filter((m) => m.role === 'system');
    this.conversationHistory = systemMessages;
  }

  addTool(tool: any): void {
    this.toolRegistry.register(tool);
    if (!this.config.tools) {
      this.config.tools = [];
    }
    this.config.tools.push(tool);
  }
}
