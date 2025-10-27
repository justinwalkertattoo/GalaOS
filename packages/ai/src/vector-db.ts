import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    userId?: string;
    text: string;
    metadata?: Record<string, any>;
    timestamp: string;
    source?: string;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  payload: VectorPoint['payload'];
}

export class VectorDatabase {
  private baseUrl: string;
  private collectionName: string;

  constructor(baseUrl: string = 'http://localhost:6333', collectionName: string = 'galaos_knowledge') {
    this.baseUrl = baseUrl;
    this.collectionName = collectionName;
  }

  /**
   * Initialize the collection with proper schema
   */
  async initialize(vectorSize: number = 1536): Promise<void> {
    try {
      // Check if collection exists
      const response = await axios.get(`${this.baseUrl}/collections/${this.collectionName}`);
      console.log(`Collection ${this.collectionName} already exists`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Create collection
        await axios.put(`${this.baseUrl}/collections/${this.collectionName}`, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
          optimizers_config: {
            indexing_threshold: 10000,
          },
        });
        console.log(`Created collection ${this.collectionName}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Add a vector point to the database
   */
  async addPoint(point: VectorPoint): Promise<void> {
    await axios.put(`${this.baseUrl}/collections/${this.collectionName}/points`, {
      points: [point],
    });
  }

  /**
   * Add multiple vector points
   */
  async addPoints(points: VectorPoint[]): Promise<void> {
    await axios.put(`${this.baseUrl}/collections/${this.collectionName}/points`, {
      points,
    });
  }

  /**
   * Search for similar vectors
   */
  async search(queryVector: number[], limit: number = 10, filter?: Record<string, any>): Promise<SearchResult[]> {
    const response = await axios.post(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
      vector: queryVector,
      limit,
      with_payload: true,
      filter,
    });

    return response.data.result.map((item: any) => ({
      id: item.id,
      score: item.score,
      payload: item.payload,
    }));
  }

  /**
   * Search by text (requires embedding service)
   */
  async searchByText(
    text: string,
    embeddingService: (text: string) => Promise<number[]>,
    limit: number = 10,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    const vector = await embeddingService(text);
    return this.search(vector, limit, filter);
  }

  /**
   * Get point by ID
   */
  async getPoint(id: string): Promise<VectorPoint | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/collections/${this.collectionName}/points/${id}`);
      return response.data.result;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update point payload
   */
  async updatePayload(id: string, payload: Record<string, any>): Promise<void> {
    await axios.post(`${this.baseUrl}/collections/${this.collectionName}/points/payload`, {
      points: [id],
      payload,
    });
  }

  /**
   * Delete point
   */
  async deletePoint(id: string): Promise<void> {
    await axios.post(`${this.baseUrl}/collections/${this.collectionName}/points/delete`, {
      points: [id],
    });
  }

  /**
   * Delete points by filter
   */
  async deleteByFilter(filter: Record<string, any>): Promise<void> {
    await axios.post(`${this.baseUrl}/collections/${this.collectionName}/points/delete`, {
      filter,
    });
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/collections/${this.collectionName}`);
    return response.data.result;
  }
}

/**
 * RAG (Retrieval-Augmented Generation) System
 */
export class RAGSystem {
  private vectorDb: VectorDatabase;
  private embeddingService: (text: string) => Promise<number[]>;

  constructor(vectorDb: VectorDatabase, embeddingService: (text: string) => Promise<number[]>) {
    this.vectorDb = vectorDb;
    this.embeddingService = embeddingService;
  }

  /**
   * Add knowledge to the system
   */
  async addKnowledge(
    text: string,
    metadata?: Record<string, any>,
    userId?: string,
    source?: string
  ): Promise<string> {
    const id = uuidv4();
    const vector = await this.embeddingService(text);

    await this.vectorDb.addPoint({
      id,
      vector,
      payload: {
        userId,
        text,
        metadata,
        timestamp: new Date().toISOString(),
        source,
      },
    });

    return id;
  }

  /**
   * Retrieve relevant context for a query
   */
  async retrieveContext(
    query: string,
    limit: number = 5,
    userId?: string,
    minScore: number = 0.7
  ): Promise<Array<{ text: string; score: number; metadata?: Record<string, any> }>> {
    const filter = userId
      ? {
          must: [{ key: 'userId', match: { value: userId } }],
        }
      : undefined;

    const results = await this.vectorDb.searchByText(query, this.embeddingService, limit, filter);

    // Filter by minimum score
    return results
      .filter((r) => r.score >= minScore)
      .map((r) => ({
        text: r.payload.text,
        score: r.score,
        metadata: r.payload.metadata,
      }));
  }

  /**
   * Generate augmented prompt with retrieved context
   */
  async augmentPrompt(userQuery: string, systemPrompt?: string, userId?: string): Promise<string> {
    const context = await this.retrieveContext(userQuery, 5, userId);

    if (context.length === 0) {
      return userQuery;
    }

    const contextText = context.map((c, i) => `[${i + 1}] ${c.text} (relevance: ${c.score.toFixed(2)})`).join('\n\n');

    const augmentedPrompt = `${systemPrompt ? systemPrompt + '\n\n' : ''}Based on the following relevant information from the knowledge base:

${contextText}

User query: ${userQuery}

Please provide an accurate response using the above context when relevant. If the context doesn't contain relevant information, please say so.`;

    return augmentedPrompt;
  }

  /**
   * Update knowledge (mark as outdated or update)
   */
  async updateKnowledge(id: string, newText?: string, metadata?: Record<string, any>): Promise<void> {
    if (newText) {
      const vector = await this.embeddingService(newText);
      const existingPoint = await this.vectorDb.getPoint(id);

      if (existingPoint) {
        await this.vectorDb.deletePoint(id);
        await this.vectorDb.addPoint({
          id,
          vector,
          payload: {
            ...existingPoint.payload,
            text: newText,
            metadata: { ...existingPoint.payload.metadata, ...metadata },
            timestamp: new Date().toISOString(),
          },
        });
      }
    } else if (metadata) {
      await this.vectorDb.updatePayload(id, metadata);
    }
  }

  /**
   * Find similar knowledge (for deduplication/consolidation)
   */
  async findSimilarKnowledge(
    text: string,
    threshold: number = 0.95,
    userId?: string
  ): Promise<SearchResult[]> {
    const vector = await this.embeddingService(text);
    const filter = userId
      ? {
          must: [{ key: 'userId', match: { value: userId } }],
        }
      : undefined;

    const results = await this.vectorDb.search(vector, 10, filter);
    return results.filter((r) => r.score >= threshold);
  }

  /**
   * Detect contradictions in knowledge base
   */
  async detectContradictions(
    statement: string,
    userId?: string
  ): Promise<Array<{ contradictingText: string; score: number }>> {
    // Find similar statements
    const similar = await this.retrieveContext(statement, 10, userId, 0.6);

    // Use LLM to check for contradictions
    // This would require an LLM call to analyze if statements contradict each other
    // For now, return potential contradictions based on high similarity

    return similar
      .filter((s) => s.score > 0.8 && s.score < 0.95) // High similarity but not exact match
      .map((s) => ({
        contradictingText: s.text,
        score: s.score,
      }));
  }
}
