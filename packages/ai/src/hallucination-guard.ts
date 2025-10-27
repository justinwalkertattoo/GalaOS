import { KnowledgeGraph } from './knowledge-graph';
import { RAGSystem } from './vector-db';

export interface VerificationResult {
  isVerified: boolean;
  confidence: number; // 0-1
  contradictions: string[];
  supportingEvidence: string[];
  warnings: string[];
  shouldBlock: boolean;
}

export interface FactClaim {
  claim: string;
  context?: string;
  source?: string;
}

export interface GuardrailConfig {
  minConfidence: number; // Minimum confidence to pass (default: 0.7)
  requireEvidence: boolean; // Require supporting evidence (default: false)
  blockOnContradiction: boolean; // Block if contradictions found (default: true)
  enableBiasDetection: boolean; // Detect potential biases (default: true)
  enableFactChecking: boolean; // Cross-reference with knowledge base (default: true)
}

/**
 * Hallucination Guard System
 *
 * Provides safeguards against:
 * - False narratives
 * - Hallucinated facts
 * - Contradictions
 * - Biases
 */
export class HallucinationGuard {
  private knowledgeGraph: KnowledgeGraph;
  private ragSystem: RAGSystem;
  private config: GuardrailConfig;

  constructor(
    knowledgeGraph: KnowledgeGraph,
    ragSystem: RAGSystem,
    config?: Partial<GuardrailConfig>
  ) {
    this.knowledgeGraph = knowledgeGraph;
    this.ragSystem = ragSystem;
    this.config = {
      minConfidence: config?.minConfidence ?? 0.7,
      requireEvidence: config?.requireEvidence ?? false,
      blockOnContradiction: config?.blockOnContradiction ?? true,
      enableBiasDetection: config?.enableBiasDetection ?? true,
      enableFactChecking: config?.enableFactChecking ?? true,
    };
  }

  /**
   * Verify a response before returning to user
   */
  async verifyResponse(response: string, context?: any): Promise<VerificationResult> {
    const result: VerificationResult = {
      isVerified: true,
      confidence: 1.0,
      contradictions: [],
      supportingEvidence: [],
      warnings: [],
      shouldBlock: false,
    };

    // Extract factual claims from response
    const claims = this.extractClaims(response);

    if (claims.length === 0) {
      // No factual claims, likely conversational - allow
      result.confidence = 0.9;
      return result;
    }

    // Check each claim
    for (const claim of claims) {
      const claimVerification = await this.verifyClaim(claim);

      // Aggregate results
      result.confidence = Math.min(result.confidence, claimVerification.confidence);
      result.contradictions.push(...claimVerification.contradictions);
      result.supportingEvidence.push(...claimVerification.supportingEvidence);
      result.warnings.push(...claimVerification.warnings);
    }

    // Bias detection
    if (this.config.enableBiasDetection) {
      const biases = this.detectBiases(response);
      if (biases.length > 0) {
        result.warnings.push(...biases);
        result.confidence *= 0.9; // Reduce confidence
      }
    }

    // Determine if should block
    result.shouldBlock =
      result.confidence < this.config.minConfidence ||
      (this.config.blockOnContradiction && result.contradictions.length > 0) ||
      (this.config.requireEvidence &&
        result.supportingEvidence.length === 0 &&
        claims.length > 0);

    result.isVerified = !result.shouldBlock;

    return result;
  }

  /**
   * Verify a single factual claim
   */
  async verifyClaim(claim: FactClaim): Promise<VerificationResult> {
    const result: VerificationResult = {
      isVerified: true,
      confidence: 0.5, // Default: uncertain
      contradictions: [],
      supportingEvidence: [],
      warnings: [],
      shouldBlock: false,
    };

    if (!this.config.enableFactChecking) {
      return result;
    }

    try {
      // Search knowledge base for related information
      const relatedKnowledge = await this.ragSystem.retrieveContext(claim.claim, 10);

      if (relatedKnowledge.length === 0) {
        result.warnings.push('No supporting evidence found in knowledge base');
        result.confidence = 0.5; // Unknown claim
        return result;
      }

      // Check for contradictions
      const contradictions = await this.ragSystem.detectContradictions(claim.claim, 0.85);

      if (contradictions.length > 0) {
        result.contradictions = contradictions.map(
          (c) => `Contradicts: ${c.metadata?.content || c.id}`
        );
        result.confidence = 0.3; // Low confidence due to contradictions
        result.warnings.push(
          `Found ${contradictions.length} potential contradiction(s) in knowledge base`
        );
      } else {
        // No contradictions, check for supporting evidence
        result.supportingEvidence = relatedKnowledge.map(
          (k) => k.metadata?.content || k.id
        );
        result.confidence = 0.8; // High confidence with evidence and no contradictions
      }

      // Cross-reference with knowledge graph
      const graphStats = await this.knowledgeGraph.search(claim.claim, undefined, 5);

      if (graphStats.length > 0) {
        // Found related knowledge in graph
        result.confidence = Math.min(1.0, result.confidence + 0.1);

        // Check for verified knowledge
        for (const node of graphStats) {
          if (node.properties?.verified) {
            result.supportingEvidence.push(`Verified: ${node.label}`);
            result.confidence = Math.min(1.0, result.confidence + 0.1);
          }

          // Check for contradictions in graph
          const graphContradictions = await this.knowledgeGraph.detectContradictions(node.id);
          if (graphContradictions.length > 0) {
            result.contradictions.push(
              ...graphContradictions.map((c) => `Graph contradiction: ${c.label}`)
            );
            result.confidence = Math.min(result.confidence, 0.4);
          }
        }
      }
    } catch (error) {
      console.error('Error verifying claim:', error);
      result.warnings.push('Error during fact verification');
      result.confidence = 0.5;
    }

    return result;
  }

  /**
   * Extract factual claims from text
   */
  private extractClaims(text: string): FactClaim[] {
    const claims: FactClaim[] = [];

    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();

      // Skip if too short or conversational
      if (trimmed.length < 20) continue;

      // Detect factual statements (heuristic)
      // Look for patterns that indicate factual claims
      const factualPatterns = [
        /\b(is|are|was|were|has|have|will|can|does|did)\b/i,
        /\b\d+/, // Contains numbers
        /\b(because|therefore|thus|since|as)\b/i, // Causal relationships
        /\b(all|every|always|never|none)\b/i, // Absolute statements
      ];

      const isFact = factualPatterns.some((pattern) => pattern.test(trimmed));

      if (isFact) {
        claims.push({ claim: trimmed });
      }
    }

    return claims;
  }

  /**
   * Detect potential biases in text
   */
  private detectBiases(text: string): string[] {
    const warnings: string[] = [];

    // Bias detection patterns
    const biasPatterns = [
      {
        pattern: /\b(always|never|all|none|everyone|nobody)\b/gi,
        warning: 'Detected absolute language that may indicate overgeneralization',
      },
      {
        pattern: /\b(obviously|clearly|undoubtedly|certainly)\b/gi,
        warning: 'Detected certainty language that may mask uncertainty',
      },
      {
        pattern: /\b(should|must|need to|have to)\b/gi,
        warning: 'Detected prescriptive language that may indicate opinion as fact',
      },
      {
        pattern: /\b(I think|I believe|in my opinion|personally)\b/gi,
        warning: 'Detected subjective language - verify if opinion or fact',
      },
    ];

    for (const { pattern, warning } of biasPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 2) {
        // Only warn if multiple instances
        warnings.push(`${warning} (${matches.length} instances)`);
      }
    }

    return warnings;
  }

  /**
   * Mark a fact as verified in the knowledge base
   */
  async markAsVerified(claim: string, verifiedBy: string = 'system'): Promise<void> {
    // Add to knowledge graph as verified
    const nodeId = `verified_${Date.now()}`;
    await this.knowledgeGraph.addNode(
      {
        id: nodeId,
        type: 'fact',
        label: claim,
        properties: {
          verified: true,
          verifiedBy,
          verifiedAt: new Date().toISOString(),
        },
      },
      undefined
    );

    // Add to RAG system
    await this.ragSystem.addKnowledge(claim, {
      verified: true,
      verifiedBy,
      type: 'fact',
    });
  }

  /**
   * Report a contradiction for manual review
   */
  async reportContradiction(
    claim1: string,
    claim2: string,
    reason: string
  ): Promise<void> {
    // Search for existing nodes
    const nodes1 = await this.knowledgeGraph.search(claim1, undefined, 1);
    const nodes2 = await this.knowledgeGraph.search(claim2, undefined, 1);

    let node1Id: string;
    let node2Id: string;

    if (nodes1.length > 0) {
      node1Id = nodes1[0].id;
    } else {
      // Create new node
      node1Id = `claim_${Date.now()}_1`;
      await this.knowledgeGraph.addNode({
        id: node1Id,
        type: 'fact',
        label: claim1,
        properties: {},
      });
    }

    if (nodes2.length > 0) {
      node2Id = nodes2[0].id;
    } else {
      // Create new node
      node2Id = `claim_${Date.now()}_2`;
      await this.knowledgeGraph.addNode({
        id: node2Id,
        type: 'fact',
        label: claim2,
        properties: {},
      });
    }

    // Mark contradiction
    await this.knowledgeGraph.markContradiction(node1Id, node2Id, reason);
  }

  /**
   * Get verification statistics
   */
  async getStats(): Promise<any> {
    const graphStats = await this.knowledgeGraph.getStats();

    return {
      totalFacts: graphStats.nodes,
      contradictions: graphStats.contradictions,
      verificationRate:
        graphStats.nodes > 0 ? (graphStats.nodes - graphStats.contradictions) / graphStats.nodes : 1,
      config: this.config,
    };
  }
}

/**
 * Pre-response verification middleware
 */
export async function verifyBeforeResponse(
  response: string,
  guard: HallucinationGuard,
  context?: any
): Promise<{ response: string; verification: VerificationResult }> {
  const verification = await guard.verifyResponse(response, context);

  if (verification.shouldBlock) {
    // Block and return warning
    const warningMessage = [
      'I cannot provide this response due to verification concerns:',
      ...verification.contradictions.map((c) => `- ${c}`),
      ...verification.warnings.map((w) => `- ${w}`),
      '',
      `Confidence: ${(verification.confidence * 100).toFixed(1)}%`,
      '',
      'Please rephrase your question or provide more context.',
    ].join('\n');

    return {
      response: warningMessage,
      verification,
    };
  }

  // Add verification footer if low confidence
  if (verification.confidence < 0.8) {
    const footer = [
      '',
      '',
      `⚠️ Confidence: ${(verification.confidence * 100).toFixed(1)}%`,
      verification.warnings.length > 0 ? `Warnings: ${verification.warnings.join('; ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      response: response + footer,
      verification,
    };
  }

  return { response, verification };
}
