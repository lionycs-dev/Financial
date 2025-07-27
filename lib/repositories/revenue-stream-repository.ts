import { db } from '@/lib/db';
import { revenueStreams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export class RevenueStreamRepository {
  async getAll() {
    return await db.select().from(revenueStreams);
  }

  async getById(id: number) {
    const result = await db
      .select()
      .from(revenueStreams)
      .where(eq(revenueStreams.id, id));
    return result[0] || null;
  }

  async create(data: {
    name: string;
    type: 'Subscription' | 'RepeatPurchase' | 'SinglePurchase' | 'RevenueOnly';
    description?: string;
  }) {
    const result = await db.insert(revenueStreams).values(data).returning();
    return result[0];
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      type:
        | 'Subscription'
        | 'RepeatPurchase'
        | 'SinglePurchase'
        | 'RevenueOnly';
      description: string;
    }>
  ) {
    const result = await db
      .update(revenueStreams)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(revenueStreams.id, id))
      .returning();
    return result[0] || null;
  }

  async delete(id: number) {
    const result = await db
      .delete(revenueStreams)
      .where(eq(revenueStreams.id, id))
      .returning();
    return result[0] || null;
  }
}
