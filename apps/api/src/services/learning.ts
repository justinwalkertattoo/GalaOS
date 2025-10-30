import { prisma } from '@galaos/db';
import { KnowledgeGraph } from '@galaos/ai/src/knowledge-graph';
import { RAGSystem } from '@galaos/ai/src/vector-db';
import { HallucinationGuard } from '@galaos/ai/src/hallucination-guard';

const kg = new KnowledgeGraph();
const rag = new RAGSystem();
const guard = new HallucinationGuard(kg, rag);

export async function processObservation(id: string) {
  const obs = await prisma.observation.findUnique({ where: { id } });
  if (!obs || obs.status !== 'pending') return;

  try {
    const text = [obs.inputText, obs.outputText].filter(Boolean).join('\n');
    if (text) {
      // Add to RAG for retrieval
      await rag.addKnowledge(text, { source: obs.source, type: obs.type, userId: obs.userId });
      // Add to Knowledge Graph as a node
      const nodeId = `obs_${obs.id}`;
      await kg.addNode({ id: nodeId, type: obs.type, label: (obs.outputText || obs.inputText || '').slice(0, 140), properties: { source: obs.source, userId: obs.userId } });
    }

    // Basic verification pass; store results and simple tags
    let verification: any = null;
    if (obs.outputText) {
      verification = await guard.verifyResponse(obs.outputText);
    }

    const tags: string[] = [];
    if (obs.source) tags.push(`source:${obs.source}`);
    if (obs.type) tags.push(`type:${obs.type}`);
    const len = (obs.outputText || obs.inputText || '').length;
    tags.push(len > 2000 ? 'len:long' : len > 400 ? 'len:medium' : 'len:short');
    if (verification) {
      tags.push(`conf:${Math.round((verification.confidence || 0) * 100)}`);
      if (verification.contradictions?.length) tags.push('contradiction:true');
    }

    await prisma.observation.update({ where: { id: obs.id }, data: { status: 'processed', processedAt: new Date(), metadata: { ...(obs.metadata as any), verification }, tags } });
  } catch (e: any) {
    await prisma.observation.update({ where: { id: obs.id }, data: { status: 'error', metadata: { error: e.message } } });
  }
}
