'use server';

import { ClientGroupRepository } from '@/lib/repositories/client-group-repository';
import {
  clientGroupSchema,
  type ClientGroupFormData,
} from '@/lib/schemas/forms';
import { revalidatePath } from 'next/cache';

const clientGroupRepository = new ClientGroupRepository();

export async function getClientGroups() {
  try {
    return await clientGroupRepository.getAll();
  } catch (error) {
    console.error('Failed to fetch client groups:', error);
    throw new Error('Failed to fetch client groups');
  }
}

export async function createClientGroup(data: ClientGroupFormData) {
  try {
    const validatedData = clientGroupSchema.parse(data);
    const result = await clientGroupRepository.create(validatedData);
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to create client group:', error);
    return { success: false, error: 'Failed to create client group' };
  }
}

export async function updateClientGroup(
  id: number,
  data: Partial<ClientGroupFormData>
) {
  try {
    const result = await clientGroupRepository.update(id, data);
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to update client group:', error);
    return { success: false, error: 'Failed to update client group' };
  }
}

export async function deleteClientGroup(id: number) {
  try {
    const result = await clientGroupRepository.delete(id);
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to delete client group:', error);
    return { success: false, error: 'Failed to delete client group' };
  }
}
