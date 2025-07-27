'use server';

import { ProductRepository } from '@/lib/repositories/product-repository';
import { RevenueStreamRepository } from '@/lib/repositories/revenue-stream-repository';
import {
  productSchema,
  type ProductFormData,
} from '@/lib/schemas/forms';
import { revalidatePath } from 'next/cache';

const productRepository = new ProductRepository();
const revenueStreamRepository = new RevenueStreamRepository();

export async function getProducts() {
  try {
    return await productRepository.getAll();
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw new Error('Failed to fetch products');
  }
}

export async function getRevenueStreams() {
  try {
    return await revenueStreamRepository.getAll();
  } catch (error) {
    console.error('Failed to fetch revenue streams:', error);
    throw new Error('Failed to fetch revenue streams');
  }
}

export async function createProduct(data: ProductFormData) {
  try {
    const validatedData = productSchema.parse(data);
    
    // Validate weight doesn't exceed 100% for the stream
    const isValidWeight = await productRepository.validateWeightUpdate(
      validatedData.productStreamId,
      null,
      validatedData.weight
    );
    
    if (!isValidWeight) {
      return { success: false, error: 'Total weight for products in this revenue stream would exceed 100%' };
    }
    
    const result = await productRepository.create(validatedData);
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to create product:', error);
    return { success: false, error: 'Failed to create product' };
  }
}


export async function updateProduct(
  id: number,
  data: Partial<ProductFormData>
) {
  try {
    // Validate weight if it's being updated
    if (data.productStreamId && data.weight) {
      const isValidWeight = await productRepository.validateWeightUpdate(
        data.productStreamId,
        id,
        data.weight
      );
      
      if (!isValidWeight) {
        return { success: false, error: 'Total weight for products in this revenue stream would exceed 100%' };
      }
    }
    
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
