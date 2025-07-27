'use server';

import { RevenueStreamRepository } from '@/lib/repositories/revenue-stream-repository';
import {
  revenueStreamSchema,
  type RevenueStreamFormData,
} from '@/lib/schemas/forms';
import { revalidatePath } from 'next/cache';

const revenueStreamRepository = new RevenueStreamRepository();

export async function getRevenueStreams() {
  try {
    return await revenueStreamRepository.getAll();
  } catch (error) {
    console.error('Failed to fetch revenue streams:', error);
    throw new Error('Failed to fetch revenue streams');
  }
}

export async function createRevenueStream(data: RevenueStreamFormData) {
  try {
    const validatedData = revenueStreamSchema.parse(data);
    const result = await revenueStreamRepository.create(validatedData);
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to create revenue stream:', error);
    return { success: false, error: 'Failed to create revenue stream' };
  }
}

export async function updateRevenueStream(
  id: number,
  data: Partial<RevenueStreamFormData>
) {
  try {
    const result = await revenueStreamRepository.update(id, data);
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to update revenue stream:', error);
    return { success: false, error: 'Failed to update revenue stream' };
  }
}

export async function deleteRevenueStream(id: number) {
  try {
    const result = await revenueStreamRepository.delete(id);
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to delete revenue stream:', error);
    return { success: false, error: 'Failed to delete revenue stream' };
  }
}
