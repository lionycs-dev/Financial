import { db } from '@/lib/db';
import { clientGroups } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export class ClientGroupRepository {
  async getAll() {
    return await db.select().from(clientGroups);
  }

  async getById(id: number) {
    const result = await db
      .select()
      .from(clientGroups)
      .where(eq(clientGroups.id, id));
    return result[0] || null;
  }

  async create(data: {
    name: string;
    type: 'B2B' | 'B2C' | 'DTC';
    startingCustomers: number;
    conversionRate: string;
    churnRate: string;
  }) {
    const result = await db.insert(clientGroups).values(data).returning();
    return result[0];
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      type: 'B2B' | 'B2C' | 'DTC';
      startingCustomers: number;
      conversionRate: string;
      churnRate: string;
    }>
  ) {
    const result = await db
      .update(clientGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientGroups.id, id))
      .returning();
    return result[0] || null;
  }

  async delete(id: number) {
    const result = await db
      .delete(clientGroups)
      .where(eq(clientGroups.id, id))
      .returning();
    return result[0] || null;
  }
}
