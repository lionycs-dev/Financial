'use server';

import { RelationshipRepository } from '@/lib/repositories/relationship-repository';
import { revalidatePath } from 'next/cache';

const relationshipRepository = new RelationshipRepository();

export interface UnifiedRelationship {
  id: number;
  sourceType: string;
  sourceId: number;
  targetType: string;
  targetId: number;
  relationshipType: string;
  properties: Record<string, string | number>;
  createdAt: Date;
  updatedAt: Date;
}

export async function getAllUnifiedRelationships(): Promise<UnifiedRelationship[]> {
  try {
    const relationships = await relationshipRepository.getAll();
    return relationships;
  } catch (error) {
    console.error('Failed to get relationships:', error);
    return [];
  }
}

export async function createRelationship(data: {
  sourceType: string;
  sourceId: number;
  targetType: string;
  targetId: number;
  relationshipType: string;
  properties: Record<string, string | number>;
}) {
  try {
    // Check if relationship already exists
    const existing = await relationshipRepository.getBySourceAndTarget(
      data.sourceType,
      data.sourceId,
      data.targetType,
      data.targetId
    );
    
    if (existing) {
      return { success: false, error: 'Relationship already exists' };
    }

    const relationship = await relationshipRepository.create(data);
    revalidatePath('/dependency-graph');
    return { success: true, data: relationship };
  } catch (error) {
    console.error('Failed to create relationship:', error);
    return { success: false, error: 'Failed to create relationship' };
  }
}

export async function updateRelationship(
  id: number,
  properties: Record<string, string | number>
) {
  try {
    const relationship = await relationshipRepository.update(id, { properties });
    if (!relationship) {
      return { success: false, error: 'Relationship not found' };
    }
    revalidatePath('/dependency-graph');
    return { success: true, data: relationship };
  } catch (error) {
    console.error('Failed to update relationship:', error);
    return { success: false, error: 'Failed to update relationship' };
  }
}

export async function deleteRelationship(id: number) {
  try {
    const relationship = await relationshipRepository.delete(id);
    if (!relationship) {
      return { success: false, error: 'Relationship not found' };
    }
    revalidatePath('/dependency-graph');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete relationship:', error);
    return { success: false, error: 'Failed to delete relationship' };
  }
}

export async function deleteRelationshipBySourceAndTarget(
  sourceType: string,
  sourceId: number,
  targetType: string,
  targetId: number
) {
  try {
    const relationship = await relationshipRepository.deleteBySourceAndTarget(
      sourceType,
      sourceId,
      targetType,
      targetId
    );
    if (!relationship) {
      return { success: false, error: 'Relationship not found' };
    }
    revalidatePath('/dependency-graph');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete relationship:', error);
    return { success: false, error: 'Failed to delete relationship' };
  }
}