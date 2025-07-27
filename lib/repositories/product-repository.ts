import { db } from '@/lib/db';
import { products, revenueStreams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export class ProductRepository {
  async getAll() {
    return await db
      .select({
        id: products.id,
        streamId: products.streamId,
        name: products.name,
        unitCost: products.unitCost,
        entryWeight: products.entryWeight,
        cac: products.cac,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        revenueStream: {
          id: revenueStreams.id,
          name: revenueStreams.name,
          type: revenueStreams.type,
        },
      })
      .from(products)
      .leftJoin(revenueStreams, eq(products.streamId, revenueStreams.id));
  }

  async getById(id: number) {
    const result = await db
      .select({
        id: products.id,
        streamId: products.streamId,
        name: products.name,
        unitCost: products.unitCost,
        entryWeight: products.entryWeight,
        cac: products.cac,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        revenueStream: {
          id: revenueStreams.id,
          name: revenueStreams.name,
          type: revenueStreams.type,
        },
      })
      .from(products)
      .leftJoin(revenueStreams, eq(products.streamId, revenueStreams.id))
      .where(eq(products.id, id));
    return result[0] || null;
  }

  async getByStreamId(streamId: number) {
    return await db
      .select()
      .from(products)
      .where(eq(products.streamId, streamId));
  }

  async create(data: {
    streamId: number;
    name: string;
    unitCost: string;
    entryWeight: string;
    cac: string;
  }) {
    const result = await db.insert(products).values(data).returning();
    return result[0];
  }

  async update(
    id: number,
    data: Partial<{
      streamId: number;
      name: string;
      unitCost: string;
      entryWeight: string;
      cac: string;
    }>
  ) {
    const result = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return result[0] || null;
  }

  async delete(id: number) {
    const result = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();
    return result[0] || null;
  }
}
