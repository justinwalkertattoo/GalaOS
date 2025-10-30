import { TaskIntent } from './types';
import { ToolRegistry } from './tool-registry';

export interface CapabilityAuditOptions {
  availableGenerators?: string[];
  env?: Record<string, string | undefined>;
  providers?: {
    anthropic?: boolean;
    openai?: boolean;
    ollama?: boolean;
  };
}

export interface CapabilityGap {
  type: 'tool' | 'integration' | 'generator' | 'workflow' | 'unknown';
  name: string;
  detail?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CapabilityAuditResult {
  intent: TaskIntent;
  presentTools: string[];
  missingTools: CapabilityGap[];
  missingIntegrations: CapabilityGap[];
  suggestedGenerators: CapabilityGap[];
  actions: Array<{
    kind: 'connect' | 'generate' | 'install' | 'configure' | 'confirm';
    description: string;
    payload?: any;
  }>;
  confidence: number; // overall confidence in ability to execute now
}

export class CapabilityAuditor {
  constructor(private tools: ToolRegistry) {}

  audit(intent: TaskIntent, options?: CapabilityAuditOptions): CapabilityAuditResult {
    const presentTools = this.tools.list();
    const missingTools: CapabilityGap[] = [];
    const missingIntegrations: CapabilityGap[] = [];
    const suggestedGenerators: CapabilityGap[] = [];
    const actions: CapabilityAuditResult['actions'] = [];

    // Tools: check requiredTools vs registry
    for (const name of intent.requiredTools || []) {
      if (!this.tools.has(name)) {
        missingTools.push({ type: 'tool', name, severity: 'high', detail: 'Not registered in ToolRegistry' });
      }
    }

    // Integrations: basic heuristic checks via env and providers
    const env = options?.env || {};
    const providers = options?.providers || {};

    if (intent.requiredTools?.some((t) => t.includes('anthropic') || t.includes('claude'))) {
      if (!env.ANTHROPIC_API_KEY && !providers.anthropic) {
        missingIntegrations.push({ type: 'integration', name: 'Anthropic API', severity: 'medium', detail: 'Missing ANTHROPIC_API_KEY' });
        actions.push({ kind: 'connect', description: 'Add ANTHROPIC_API_KEY to environment' });
      }
    }

    if (intent.requiredTools?.some((t) => t.includes('openai') || t.includes('gpt'))) {
      if (!env.OPENAI_API_KEY && !providers.openai) {
        missingIntegrations.push({ type: 'integration', name: 'OpenAI API', severity: 'medium', detail: 'Missing OPENAI_API_KEY' });
        actions.push({ kind: 'connect', description: 'Add OPENAI_API_KEY to environment' });
      }
    }

    // Suggest generators for common missing artifacts
    const gen = (options?.availableGenerators || []).reduce<Record<string, true>>((acc, g) => { acc[g] = true; return acc; }, {});

    // If a web feature is implicated and route is likely missing
    if (intent.intent.includes('feature') || intent.intent.includes('web') || intent.intent.includes('page')) {
      if (gen['nextjs-feature']) {
        suggestedGenerators.push({ type: 'generator', name: 'nextjs-feature', severity: 'low', detail: 'Scaffold route/component/API' });
        actions.push({ kind: 'generate', description: 'Scaffold Next.js feature', payload: { generator: 'nextjs-feature' } });
      }
    }

    // If a shared utility/package is implied by tools missing
    if (missingTools.length > 0 && gen['new-package']) {
      suggestedGenerators.push({ type: 'generator', name: 'new-package', severity: 'low', detail: 'Create a package to host new tools' });
    }

    // Confidence: reduce for missing tools/integrations
    let confidence = Math.max(0, Math.min(1, (intent.confidence || 0.6) - missingTools.length * 0.2 - missingIntegrations.length * 0.1));

    // If nothing missing, request confirmation to proceed
    if (missingTools.length === 0 && missingIntegrations.length === 0) {
      actions.push({ kind: 'confirm', description: 'All capabilities present. Proceed to execute plan?' });
    }

    return {
      intent,
      presentTools,
      missingTools,
      missingIntegrations,
      suggestedGenerators,
      actions,
      confidence,
    };
  }
}

