'use server';

import { ProductRepository } from '@/lib/repositories/product-repository';
import {
  productSchema,
  type ProductFormData,
} from '@/lib/schemas/forms';
import { revalidatePath } from 'next/cache';

const productRepository = new ProductRepository();

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
