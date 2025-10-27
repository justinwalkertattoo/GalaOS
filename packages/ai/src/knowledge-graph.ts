import neo4j, { Driver, Session } from 'neo4j-driver';

export interface KnowledgeNode {
  id: string;
  type: string; // concept, fact, entity, skill, tool, agent
  label: string;
  properties: Record<string, any>;
}

export interface KnowledgeRelationship {
  from: string;
  to: string;
  type: string; // RELATES_TO, CONTRADICTS, SUPPORTS, REQUIRES, USES
  properties?: Record<string, any>;
}

export class KnowledgeGraph {
  private driver: Driver;

  constructor(uri: string = 'bolt://localhost:7687', username: string = 'neo4j', password: string = 'password') {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  /**
   * Initialize graph with constraints and indexes
   */
  async initialize(): Promise<void> {
    const session = this.driver.session();
    try {
      // Create uniqueness constraints
      await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (n:KnowledgeNode) REQUIRE n.id IS UNIQUE');
      await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (c:Concept) REQUIRE c.id IS UNIQUE');
      await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE');

      // Create indexes
      await session.run('CREATE INDEX IF NOT EXISTS FOR (n:KnowledgeNode) ON (n.type)');
      await session.run('CREATE INDEX IF NOT EXISTS FOR (n:KnowledgeNode) ON (n.userId)');
      await session.run('CREATE INDEX IF NOT EXISTS FOR (n:KnowledgeNode) ON (n.timestamp)');

      console.log('Knowledge graph initialized');
    } finally {
      await session.close();
    }
  }

  /**
   * Add a knowledge node
   */
  async addNode(node: KnowledgeNode, userId?: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MERGE (n:KnowledgeNode {id: $id})
        SET n.type = $type,
            n.label = $label,
            n.properties = $properties,
            n.userId = $userId,
            n.timestamp = datetime(),
            n.accessCount = 0
        RETURN n
        `,
        {
          id: node.id,
          type: node.type,
          label: node.label,
          properties: node.properties,
          userId: userId || null,
        }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Add a relationship between nodes
   */
  async addRelationship(rel: KnowledgeRelationship): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (a:KnowledgeNode {id: $from})
        MATCH (b:KnowledgeNode {id: $to})
        MERGE (a)-[r:${rel.type}]->(b)
        SET r.properties = $properties,
            r.timestamp = datetime()
        RETURN r
        `,
        {
          from: rel.from,
          to: rel.to,
          properties: rel.properties || {},
        }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Find related knowledge
   */
  async findRelated(nodeId: string, relationshipType?: string, maxDepth: number = 2): Promise<KnowledgeNode[]> {
    const session = this.driver.session();
    try {
      const relationshipClause = relationshipType ? `[r:${relationshipType}*1..${maxDepth}]` : `[*1..${maxDepth}]`;

      const result = await session.run(
        `
        MATCH (n:KnowledgeNode {id: $nodeId})-${relationshipClause}-(related:KnowledgeNode)
        RETURN DISTINCT related
        LIMIT 50
        `,
        { nodeId }
      );

      return result.records.map((record) => {
        const node = record.get('related');
        return {
          id: node.properties.id,
          type: node.properties.type,
          label: node.properties.label,
          properties: node.properties.properties,
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Detect contradictions
   */
  async detectContradictions(nodeId: string): Promise<KnowledgeNode[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (n:KnowledgeNode {id: $nodeId})-[:CONTRADICTS]-(contradicting:KnowledgeNode)
        RETURN contradicting
        `,
        { nodeId }
      );

      return result.records.map((record) => {
        const node = record.get('contradicting');
        return {
          id: node.properties.id,
          type: node.properties.type,
          label: node.properties.label,
          properties: node.properties.properties,
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Mark contradiction between nodes
   */
  async markContradiction(nodeId1: string, nodeId2: string, reason?: string): Promise<void> {
    await this.addRelationship({
      from: nodeId1,
      to: nodeId2,
      type: 'CONTRADICTS',
      properties: { reason, detected: new Date().toISOString() },
    });

    // Make it bidirectional
    await this.addRelationship({
      from: nodeId2,
      to: nodeId1,
      type: 'CONTRADICTS',
      properties: { reason, detected: new Date().toISOString() },
    });
  }

  /**
   * Resolve contradiction (mark one as superseded)
   */
  async resolveContradiction(oldNodeId: string, newNodeId: string): Promise<void> {
    const session = this.driver.session();
    try {
      // Remove contradiction relationship
      await session.run(
        `
        MATCH (a:KnowledgeNode {id: $oldId})-[r:CONTRADICTS]-(b:KnowledgeNode {id: $newId})
        DELETE r
        `,
        { oldId: oldNodeId, newId: newNodeId }
      );

      // Add supersedes relationship
      await this.addRelationship({
        from: newNodeId,
        to: oldNodeId,
        type: 'SUPERSEDES',
        properties: { resolved: new Date().toISOString() },
      });

      // Mark old node as outdated
      await session.run(
        `
        MATCH (n:KnowledgeNode {id: $oldId})
        SET n.outdated = true,
            n.supersededBy = $newId
        `,
        { oldId: oldNodeId, newId: newNodeId }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Find knowledge paths between concepts
   */
  async findPath(fromId: string, toId: string, maxLength: number = 5): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH path = shortestPath((a:KnowledgeNode {id: $fromId})-[*..${maxLength}]-(b:KnowledgeNode {id: $toId}))
        RETURN path
        LIMIT 1
        `,
        { fromId, toId }
      );

      if (result.records.length === 0) {
        return [];
      }

      const path = result.records[0].get('path');
      return path.segments.map((segment: any) => ({
        from: segment.start.properties,
        relationship: segment.relationship.type,
        to: segment.end.properties,
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Update node access count (for importance tracking)
   */
  async recordAccess(nodeId: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (n:KnowledgeNode {id: $nodeId})
        SET n.accessCount = n.accessCount + 1,
            n.lastAccessed = datetime()
        `,
        { nodeId }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Get most important knowledge (by access count)
   */
  async getMostImportant(userId?: string, limit: number = 20): Promise<KnowledgeNode[]> {
    const session = this.driver.session();
    try {
      const userClause = userId ? 'WHERE n.userId = $userId' : '';

      const result = await session.run(
        `
        MATCH (n:KnowledgeNode)
        ${userClause}
        RETURN n
        ORDER BY n.accessCount DESC
        LIMIT $limit
        `,
        { userId, limit }
      );

      return result.records.map((record) => {
        const node = record.get('n');
        return {
          id: node.properties.id,
          type: node.properties.type,
          label: node.properties.label,
          properties: node.properties.properties,
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Consolidate similar concepts
   */
  async consolidateConcepts(nodeIds: string[], newLabel: string, newProperties: Record<string, any>): Promise<string> {
    const session = this.driver.session();
    try {
      // Create new consolidated node
      const consolidatedId = `consolidated_${Date.now()}`;
      await this.addNode({
        id: consolidatedId,
        type: 'concept',
        label: newLabel,
        properties: newProperties,
      });

      // Move all relationships to consolidated node
      for (const oldId of nodeIds) {
        await session.run(
          `
          MATCH (old:KnowledgeNode {id: $oldId})-[r]->(other:KnowledgeNode)
          MATCH (new:KnowledgeNode {id: $newId})
          WHERE old.id <> new.id AND other.id <> new.id
          MERGE (new)-[r2:${this.driver}]->(other)
          SET r2 = properties(r)
          `,
          { oldId, newId: consolidatedId }
        );

        // Mark old node as consolidated
        await session.run(
          `
          MATCH (n:KnowledgeNode {id: $oldId})
          SET n.consolidated = true,
              n.consolidatedInto = $newId
          `,
          { oldId, newId: consolidatedId }
        );
      }

      return consolidatedId;
    } finally {
      await session.close();
    }
  }

  /**
   * Search knowledge graph by keyword
   */
  async search(query: string, userId?: string, limit: number = 20): Promise<KnowledgeNode[]> {
    const session = this.driver.session();
    try {
      const userClause = userId ? 'AND n.userId = $userId' : '';

      const result = await session.run(
        `
        MATCH (n:KnowledgeNode)
        WHERE (toLower(n.label) CONTAINS toLower($query) OR
               ANY(key IN keys(n.properties) WHERE toLower(toString(n.properties[key])) CONTAINS toLower($query)))
        ${userClause}
        RETURN n
        LIMIT $limit
        `,
        { query, userId, limit }
      );

      return result.records.map((record) => {
        const node = record.get('n');
        return {
          id: node.properties.id,
          type: node.properties.type,
          label: node.properties.label,
          properties: node.properties.properties,
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get graph statistics
   */
  async getStats(userId?: string): Promise<any> {
    const session = this.driver.session();
    try {
      const userClause = userId ? 'WHERE n.userId = $userId' : '';

      const nodeCount = await session.run(
        `
        MATCH (n:KnowledgeNode)
        ${userClause}
        RETURN count(n) as count
        `,
        { userId }
      );

      const relCount = await session.run(
        `
        MATCH (n:KnowledgeNode ${userId ? '{userId: $userId}' : ''})-[r]->()
        RETURN count(r) as count
        `,
        { userId }
      );

      const contradictions = await session.run(
        `
        MATCH (n:KnowledgeNode ${userId ? '{userId: $userId}' : ''})-[r:CONTRADICTS]->()
        RETURN count(r) as count
        `,
        { userId }
      );

      return {
        nodes: nodeCount.records[0].get('count').toNumber(),
        relationships: relCount.records[0].get('count').toNumber(),
        contradictions: contradictions.records[0].get('count').toNumber(),
      };
    } finally {
      await session.close();
    }
  }
}
