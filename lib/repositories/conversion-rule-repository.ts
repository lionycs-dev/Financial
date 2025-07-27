import { db } from '@/lib/db';
import { conversionRules, products, clientGroups } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export class ConversionRuleRepository {
  async getAll() {
    return await db
      .select({
        id: conversionRules.id,
        clientGroupId: conversionRules.clientGroupId,
        fromProductId: conversionRules.fromProductId,
        toProductId: conversionRules.toProductId,
        afterMonths: conversionRules.afterMonths,
        probability: conversionRules.probability,
        createdAt: conversionRules.createdAt,
        updatedAt: conversionRules.updatedAt,
        clientGroup: {
          id: clientGroups.id,
          name: clientGroups.name,
        },
        fromProduct: {
          id: products.id,
          name: products.name,
        },
        toProduct: {
          id: products.id,
          name: products.name,
        },
      })
      .from(conversionRules)
      .leftJoin(
        clientGroups,
        eq(conversionRules.clientGroupId, clientGroups.id)
      )
      .leftJoin(products, eq(conversionRules.fromProductId, products.id));
  }

  async getById(id: number) {
    const result = await db
      .select({
        id: conversionRules.id,
        clientGroupId: conversionRules.clientGroupId,
        fromProductId: conversionRules.fromProductId,
        toProductId: conversionRules.toProductId,
        afterMonths: conversionRules.afterMonths,
        probability: conversionRules.probability,
        createdAt: conversionRules.createdAt,
        updatedAt: conversionRules.updatedAt,
        clientGroup: {
          id: clientGroups.id,
          name: clientGroups.name,
        },
        fromProduct: {
          id: products.id,
          name: products.name,
        },
        toProduct: {
          id: products.id,
          name: products.name,
        },
      })
      .from(conversionRules)
      .leftJoin(
        clientGroups,
        eq(conversionRules.clientGroupId, clientGroups.id)
      )
      .leftJoin(products, eq(conversionRules.fromProductId, products.id))
      .where(eq(conversionRules.id, id));
    return result[0] || null;
  }

  async getByClientGroupId(clientGroupId: number) {
    return await db
      .select()
      .from(conversionRules)
      .where(eq(conversionRules.clientGroupId, clientGroupId));
  }

  async getByProductId(productId: number) {
    return await db
      .select()
      .from(conversionRules)
      .where(eq(conversionRules.fromProductId, productId));
  }

  async create(data: {
    clientGroupId: number;
    fromProductId: number;
    toProductId: number;
    afterMonths: number;
    probability: string;
  }) {
    const result = await db.insert(conversionRules).values(data).returning();
    return result[0];
  }

  async update(
    id: number,
    data: Partial<{
      clientGroupId: number;
      fromProductId: number;
      toProductId: number;
      afterMonths: number;
      probability: string;
    }>
  ) {
    const result = await db
      .update(conversionRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversionRules.id, id))
      .returning();
    return result[0] || null;
  }

  async delete(id: number) {
    const result = await db
      .delete(conversionRules)
      .where(eq(conversionRules.id, id))
      .returning();
    return result[0] || null;
  }
}
