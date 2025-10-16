'use server';

import { RelationshipRepository } from '@/lib/repositories/relationship-repository';
import { RelationshipType } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';

const relationshipRepository = new RelationshipRepository();

export interface UnifiedRelationship {
  id: number;
  sourceType: string;
  sourceId: number;
  targetType: string;
  targetId: number;
  relationshipType: RelationshipType;
  properties: Record<string, string | number>;
  createdAt: Date;
  updatedAt: Date;
}

export async function getAllUnifiedRelationships(): Promise<
  UnifiedRelationship[]
> {
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
  sourceId: number | string;
  targetType: string;
  targetId: number | string;
  relationshipType: RelationshipType;
  properties: Record<string, string | number>;
}) {
  try {
    // Convert string IDs to numbers for database storage
    let numericSourceId: number;
    let numericTargetId: number;

    if (typeof data.sourceId === 'string') {
      const parsed = parseInt(data.sourceId);
      if (isNaN(parsed)) {
        console.error('Invalid sourceId:', data.sourceId);
        return { success: false, error: `Invalid source ID: ${data.sourceId}` };
      }
      numericSourceId = parsed;
    } else {
      numericSourceId = data.sourceId;
    }

    if (typeof data.targetId === 'string') {
      const parsed = parseInt(data.targetId);
      if (isNaN(parsed)) {
        console.error('Invalid targetId:', data.targetId);
        return { success: false, error: `Invalid target ID: ${data.targetId}` };
      }
      numericTargetId = parsed;
    } else {
      numericTargetId = data.targetId;
    }

    console.log('Creating relationship:', {
      sourceType: data.sourceType,
      sourceId: numericSourceId,
      targetType: data.targetType,
      targetId: numericTargetId,
      relationshipType: data.relationshipType,
    });

    // Check if relationship already exists
    const existing = await relationshipRepository.getBySourceAndTarget(
      data.sourceType,
      numericSourceId,
      data.targetType,
      numericTargetId
    );

    if (existing) {
      return { success: false, error: 'Relationship already exists' };
    }

    const relationship = await relationshipRepository.create({
      ...data,
      sourceId: numericSourceId,
      targetId: numericTargetId,
    });
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
    const relationship = await relationshipRepository.update(id, {
      properties,
    });
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
