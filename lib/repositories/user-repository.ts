import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export class UserRepository {
  async getAll() {
    return await db.select().from(users);
  }

  async getById(id: number) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }

  async getByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  }

  async create(data: { email: string; name: string }) {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  async update(id: number, data: Partial<{ email: string; name: string }>) {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0] || null;
  }

  async delete(id: number) {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result[0] || null;
  }
}
