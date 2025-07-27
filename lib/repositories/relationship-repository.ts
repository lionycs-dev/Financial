import { db } from '@/lib/db';
import { relationships } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export interface RelationshipData {
  sourceType: string;
  sourceId: number;
  targetType: string;
  targetId: number;
  relationshipType: string;
  properties: Record<string, string | number>;
}

export class RelationshipRepository {
  async getAll() {
    return await db.select().from(relationships);
  }

  async getById(id: number) {
    const result = await db
      .select()
      .from(relationships)
      .where(eq(relationships.id, id));
    return result[0] || null;
  }

  async getBySourceAndTarget(sourceType: string, sourceId: number, targetType: string, targetId: number) {
    const result = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.sourceType, sourceType),
          eq(relationships.sourceId, sourceId),
          eq(relationships.targetType, targetType),
          eq(relationships.targetId, targetId)
        )
      );
    return result[0] || null;
  }

  async getByType(relationshipType: string) {
    return await db
      .select()
      .from(relationships)
      .where(eq(relationships.relationshipType, relationshipType));
  }

  async create(data: RelationshipData) {
    const result = await db.insert(relationships).values({
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      targetType: data.targetType,
      targetId: data.targetId,
      relationshipType: data.relationshipType,
      properties: data.properties,
    }).returning();
    return result[0];
  }

  async update(id: number, data: Partial<RelationshipData>) {
    const result = await db
      .update(relationships)
      .set({ 
        ...data, 
        updatedAt: new Date() 
      })
      .where(eq(relationships.id, id))
      .returning();
    return result[0] || null;
  }

  async delete(id: number) {
    const result = await db
      .delete(relationships)
      .where(eq(relationships.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteBySourceAndTarget(sourceType: string, sourceId: number, targetType: string, targetId: number) {
    const result = await db
      .delete(relationships)
      .where(
        and(
          eq(relationships.sourceType, sourceType),
          eq(relationships.sourceId, sourceId),
          eq(relationships.targetType, targetType),
          eq(relationships.targetId, targetId)
        )
      )
      .returning();
    return result[0] || null;
  }
}