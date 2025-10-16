import { db } from '@/lib/db';
import { products, revenueStreams } from '@/lib/db/schema';
import { eq, sum } from 'drizzle-orm';
import { FrequencyType, InvoiceTimingType } from '../schemas/forms';

export class ProductRepository {
  async getAll() {
    return await db
      .select({
        id: products.id,
        name: products.name,
        unitCost: products.unitCost,
        productStreamId: products.productStreamId,
        weight: products.weight,
        pricingPlans: products.pricingPlans,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        revenueStream: {
          id: revenueStreams.id,
          name: revenueStreams.name,
          type: revenueStreams.type,
        },
      })
      .from(products)
      .leftJoin(
        revenueStreams,
        eq(products.productStreamId, revenueStreams.id)
      );
  }

  async getById(id: number) {
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        unitCost: products.unitCost,
        productStreamId: products.productStreamId,
        weight: products.weight,
        pricingPlans: products.pricingPlans,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        revenueStream: {
          id: revenueStreams.id,
          name: revenueStreams.name,
          type: revenueStreams.type,
        },
      })
      .from(products)
      .leftJoin(revenueStreams, eq(products.productStreamId, revenueStreams.id))
      .where(eq(products.id, id));
    return result[0] || null;
  }

  async create(data: {
    name: string;
    unitCost: string;
    productStreamId: number;
    weight: string;
    pricingPlans: Array<{
      name: string;
      priceFormula: string;
      frequency: FrequencyType;
      customFrequency?: number;
      invoiceTiming: InvoiceTimingType;
      customInvoiceTiming?: number;
      leadToCashLag: number;
      escalatorPct?: string;
    }>;
  }) {
    const result = await db.insert(products).values(data).returning();
    return result[0];
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      unitCost: string;
      productStreamId: number;
      weight: string;
      pricingPlans: Array<{
        name: string;
        priceFormula: string;
        frequency: FrequencyType;
        customFrequency?: number;
        invoiceTiming: InvoiceTimingType;
        customInvoiceTiming?: number;
        leadToCashLag: number;
        escalatorPct?: string;
      }>;
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

  async getProductsByStreamId(streamId: number) {
    return await db
      .select()
      .from(products)
      .where(eq(products.productStreamId, streamId));
  }

  async getTotalWeightByStreamId(streamId: number) {
    const result = await db
      .select({ total: sum(products.weight) })
      .from(products)
      .where(eq(products.productStreamId, streamId));
    return Number(result[0]?.total) || 0;
  }

  async validateWeightUpdate(
    streamId: number,
    productId: number | null,
    newWeight: string
  ) {
    const currentTotal = await this.getTotalWeightByStreamId(streamId);

    let adjustedTotal = currentTotal;
    if (productId) {
      // If updating existing product, subtract its current weight
      const currentProduct = await this.getById(productId);
      if (currentProduct) {
        adjustedTotal -= Number(currentProduct.weight);
      }
    }

    // Add the new weight
    adjustedTotal += Number(newWeight);

    return adjustedTotal <= 1.0;
  }
}
