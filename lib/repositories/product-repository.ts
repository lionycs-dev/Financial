import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export class ProductRepository {
  async getAll() {
    return await db.select().from(products);
  }

  async getById(id: number) {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return result[0] || null;
  }

  async create(data: {
    name: string;
    unitCost: string;
    cac: string;
  }) {
    const result = await db.insert(products).values(data).returning();
    return result[0];
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      unitCost: string;
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
