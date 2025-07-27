import { db } from '@/lib/db';
import { pricingPlans, products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export class PricingPlanRepository {
  async getAll() {
    return await db
      .select({
        id: pricingPlans.id,
        productId: pricingPlans.productId,
        name: pricingPlans.name,
        priceFormula: pricingPlans.priceFormula,
        frequency: pricingPlans.frequency,
        customFrequency: pricingPlans.customFrequency,
        invoiceTiming: pricingPlans.invoiceTiming,
        customInvoiceTiming: pricingPlans.customInvoiceTiming,
        leadToCashLag: pricingPlans.leadToCashLag,
        escalatorPct: pricingPlans.escalatorPct,
        createdAt: pricingPlans.createdAt,
        updatedAt: pricingPlans.updatedAt,
        product: {
          id: products.id,
          name: products.name,
        },
      })
      .from(pricingPlans)
      .leftJoin(products, eq(pricingPlans.productId, products.id));
  }

  async getById(id: number) {
    const result = await db
      .select({
        id: pricingPlans.id,
        productId: pricingPlans.productId,
        name: pricingPlans.name,
        priceFormula: pricingPlans.priceFormula,
        frequency: pricingPlans.frequency,
        customFrequency: pricingPlans.customFrequency,
        invoiceTiming: pricingPlans.invoiceTiming,
        customInvoiceTiming: pricingPlans.customInvoiceTiming,
        leadToCashLag: pricingPlans.leadToCashLag,
        escalatorPct: pricingPlans.escalatorPct,
        createdAt: pricingPlans.createdAt,
        updatedAt: pricingPlans.updatedAt,
        product: {
          id: products.id,
          name: products.name,
        },
      })
      .from(pricingPlans)
      .leftJoin(products, eq(pricingPlans.productId, products.id))
      .where(eq(pricingPlans.id, id));
    return result[0] || null;
  }

  async getByProductId(productId: number) {
    return await db
      .select()
      .from(pricingPlans)
      .where(eq(pricingPlans.productId, productId));
  }

  async create(data: {
    productId: number;
    name: string;
    priceFormula: string;
    frequency:
      | 'Monthly'
      | 'Quarterly'
      | 'SemiAnnual'
      | 'Annual'
      | 'OneTime'
      | 'Custom';
    customFrequency?: number;
    invoiceTiming: 'Immediate' | 'Upfront' | 'Net30' | 'Net60' | 'Custom';
    customInvoiceTiming?: number;
    leadToCashLag: number;
    escalatorPct?: string;
  }) {
    const result = await db.insert(pricingPlans).values(data).returning();
    return result[0];
  }

  async update(
    id: number,
    data: Partial<{
      productId: number;
      name: string;
      priceFormula: string;
      frequency:
        | 'Monthly'
        | 'Quarterly'
        | 'SemiAnnual'
        | 'Annual'
        | 'OneTime'
        | 'Custom';
      customFrequency: number;
      invoiceTiming: 'Immediate' | 'Upfront' | 'Net30' | 'Net60' | 'Custom';
      customInvoiceTiming: number;
      leadToCashLag: number;
      escalatorPct: string;
    }>
  ) {
    const result = await db
      .update(pricingPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pricingPlans.id, id))
      .returning();
    return result[0] || null;
  }

  async delete(id: number) {
    const result = await db
      .delete(pricingPlans)
      .where(eq(pricingPlans.id, id))
      .returning();
    return result[0] || null;
  }
}
