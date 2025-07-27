'use server';

import { ProductRepository } from '@/lib/repositories/product-repository';
import { PricingPlanRepository } from '@/lib/repositories/pricing-plan-repository';
import {
  productSchema,
  productWithPricingPlansSchema,
  type ProductFormData,
  type ProductWithPricingPlansFormData,
} from '@/lib/schemas/forms';
import { revalidatePath } from 'next/cache';

const productRepository = new ProductRepository();
const pricingPlanRepository = new PricingPlanRepository();

export async function getProducts() {
  try {
    return await productRepository.getAll();
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw new Error('Failed to fetch products');
  }
}

export async function createProduct(data: ProductFormData) {
  try {
    const validatedData = productSchema.parse(data);
    const result = await productRepository.create(validatedData);
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to create product:', error);
    return { success: false, error: 'Failed to create product' };
  }
}

export async function createProductWithPricingPlans(
  data: ProductWithPricingPlansFormData
) {
  try {
    const validatedData = productWithPricingPlansSchema.parse(data);

    // Create the product first
    const product = await productRepository.create(validatedData.product);

    // Create pricing plans for the product
    const pricingPlans = await Promise.all(
      validatedData.pricingPlans.map((plan) => {
        // Filter out empty optional fields to prevent database errors
        const cleanPlan: {
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
          invoiceTiming: 'Immediate' | 'Upfront' | 'Net30' | 'Net60' | 'Custom';
          leadToCashLag: number;
          customFrequency?: number;
          customInvoiceTiming?: number;
          escalatorPct?: string;
        } = {
          productId: product.id,
          name: plan.name,
          priceFormula: plan.priceFormula,
          frequency: plan.frequency,
          invoiceTiming: plan.invoiceTiming,
          leadToCashLag: plan.leadToCashLag,
        };

        // Only include optional fields if they have values
        if (plan.customFrequency !== undefined) {
          cleanPlan.customFrequency = plan.customFrequency;
        }
        if (plan.customInvoiceTiming !== undefined) {
          cleanPlan.customInvoiceTiming = plan.customInvoiceTiming;
        }
        if (plan.escalatorPct && plan.escalatorPct.trim() !== '') {
          cleanPlan.escalatorPct = plan.escalatorPct;
        }

        return pricingPlanRepository.create(cleanPlan);
      })
    );

    revalidatePath('/');
    return { success: true, data: { product, pricingPlans } };
  } catch (error) {
    console.error('Failed to create product with pricing plans:', error);
    return {
      success: false,
      error: 'Failed to create product with pricing plans',
    };
  }
}

export async function updateProduct(
  id: number,
  data: Partial<ProductFormData>
) {
  try {
    const result = await productRepository.update(id, data);
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to update product:', error);
    return { success: false, error: 'Failed to update product' };
  }
}

export async function deleteProduct(id: number) {
  try {
    const result = await productRepository.delete(id);
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to delete product:', error);
    return { success: false, error: 'Failed to delete product' };
  }
}
