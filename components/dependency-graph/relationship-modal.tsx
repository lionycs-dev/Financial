'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import React from 'react';
import { getAllUnifiedRelationships } from '@/lib/actions/unified-relationship-actions';
import { getProducts } from '@/lib/actions/product-actions';
import { getRevenueStreams } from '@/lib/actions/revenue-stream-actions';

const relationshipSchema = z.object({
  type: z.enum(['first_purchase', 'existing_relationship', 'upselling']),
  weight: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1),
      {
        message: 'Weight must be between 0 and 1',
      }
    ),
  probability: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1),
      {
        message: 'Probability must be between 0 and 1',
      }
    ),
  afterMonths: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: 'Must be a positive number',
    }),
});

type RelationshipType =
  | 'first_purchase'
  | 'existing_relationship'
  | 'upselling';
type RelationshipFormData = z.infer<typeof relationshipSchema>;

interface RelationshipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: 'stream' | 'product' | 'clientGroup' | 'clientGroupType';
  targetType: 'stream' | 'product' | 'clientGroup' | 'clientGroupType';
  sourceId: string;
  targetId: string;
  onSave: (data: RelationshipFormData) => void;
  editData?: RelationshipFormData | null;
}

type RelatedRelationship = {
  id: number;
  targetId: number;
  targetName: string;
  currentWeight: number;
  adjustedWeight: number;
};

export function RelationshipModal({
  open,
  onOpenChange,
  sourceType,
  targetType,
  sourceId,
  targetId,
  onSave,
  editData,
}: RelationshipModalProps) {
  const [loading, setLoading] = useState(false);
  const [relatedRelationships, setRelatedRelationships] = useState<
    RelatedRelationship[]
  >([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const validTypes = getValidRelationshipTypes(sourceType, targetType);
  const defaultType: RelationshipType =
    validTypes.length > 0 ? validTypes[0].value : 'first_purchase';

  const form = useForm<RelationshipFormData>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: editData || {
      type: defaultType,
      weight: '', // Will be set to '1' for first relationship
      probability: '',
      afterMonths: '',
    },
  });

  // Track if this is the first relationship
  const isFirstRelationship = relatedRelationships.length === 0 && !editData;

  // Reset form when editData changes
  React.useEffect(() => {
    if (editData) {
      form.reset(editData);
    } else {
      form.reset({
        type: defaultType,
        weight: '',
        probability: '',
        afterMonths: '',
      });
    }
  }, [editData, defaultType, form]);

  // Fetch related relationships when modal opens
  useEffect(() => {
    if (!open) return;

    async function loadRelatedRelationships() {
      // Only load for clientGroup -> product/stream relationships
      if (
        sourceType !== 'clientGroup' &&
        sourceType !== 'clientGroupType' &&
        targetType !== 'clientGroup' &&
        targetType !== 'clientGroupType'
      ) {
        setRelatedRelationships([]);
        return;
      }

      setLoadingRelated(true);
      try {
        const [relationships, products, streams] = await Promise.all([
          getAllUnifiedRelationships(),
          getProducts(),
          getRevenueStreams(),
        ]);

        // Extract source ID from node ID format (e.g., "clientgroup-1" -> 1)
        const sourceIdNum = parseInt(sourceId.split('-')[1]);
        const targetIdNum = parseInt(targetId.split('-')[1]);

        // Find relationships from the same source to other targets
        const related = relationships
          .filter((rel) => {
            // Same source
            const isSameSource =
              rel.sourceType === sourceType && rel.sourceId === sourceIdNum;

            // Different target (or same if editing)
            const isDifferentTarget =
              rel.targetType === targetType && rel.targetId !== targetIdNum;

            return isSameSource && isDifferentTarget;
          })
          .map((rel) => {
            // Get target name
            let targetName = 'Unknown';
            if (rel.targetType === 'product') {
              const product = products.find((p) => p.id === rel.targetId);
              targetName = product?.name || `Product ${rel.targetId}`;
            } else if (rel.targetType === 'stream') {
              const stream = streams.find((s) => s.id === rel.targetId);
              targetName = stream?.name || `Stream ${rel.targetId}`;
            }

            return {
              id: rel.id,
              targetId: rel.targetId,
              targetName,
              currentWeight: Number(rel.properties.weight) || 0,
              adjustedWeight: Number(rel.properties.weight) || 0,
            };
          });

        setRelatedRelationships(related);
      } catch (error) {
        console.error('Failed to load related relationships:', error);
        setRelatedRelationships([]);
      } finally {
        setLoadingRelated(false);
      }
    }

    loadRelatedRelationships();
  }, [open, sourceType, targetType, sourceId, targetId]);

  function getValidRelationshipTypes(
    source: string,
    target: string
  ): Array<{ value: RelationshipType; label: string }> {
    const validTypes: Array<{ value: RelationshipType; label: string }> = [];

    // Product to Product: only upselling
    if (source === 'product' && target === 'product') {
      validTypes.push({
        value: 'upselling',
        label: 'Upselling (product to product with timing)',
      });
      return validTypes;
    }

    // All other connections can be first_purchase or existing_relationship
    validTypes.push({
      value: 'first_purchase',
      label: 'First Purchase (when customer is acquired)',
    });
    validTypes.push({
      value: 'existing_relationship',
      label: 'Existing Relationship',
    });

    return validTypes;
  }

  // Watch weight changes and calculate adjustments
  const currentWeight = form.watch('weight');

  const weightAdjustments = useMemo(() => {
    const newWeight = Number(currentWeight) || 0;
    if (newWeight === 0 || relatedRelationships.length === 0) {
      return relatedRelationships;
    }

    // Calculate total current weight of related relationships
    const totalRelatedWeight = relatedRelationships.reduce(
      (sum, rel) => sum + rel.currentWeight,
      0
    );

    // Remaining weight to distribute among related relationships
    const remainingWeight = 1 - newWeight;

    if (remainingWeight < 0 || totalRelatedWeight === 0) {
      // If new weight > 1 or no existing weights, set all others to 0
      return relatedRelationships.map((rel) => ({
        ...rel,
        adjustedWeight: 0,
      }));
    }

    // Proportionally adjust related weights to sum to remainingWeight
    return relatedRelationships.map((rel) => ({
      ...rel,
      adjustedWeight:
        (rel.currentWeight / totalRelatedWeight) * remainingWeight,
    }));
  }, [currentWeight, relatedRelationships]);

  const totalWeight = useMemo(() => {
    const newWeight = Number(currentWeight) || 0;
    const adjustedTotal = weightAdjustments.reduce(
      (sum, rel) => sum + rel.adjustedWeight,
      0
    );
    return newWeight + adjustedTotal;
  }, [currentWeight, weightAdjustments]);

  async function onSubmit(values: RelationshipFormData) {
    setLoading(true);
    try {
      // Auto-set weight to 1.0 (100%) if it's the first relationship
      const finalWeight =
        isFirstRelationship && !values.weight ? '1' : values.weight || '1';

      const finalValues = {
        ...values,
        weight: finalWeight,
      };

      // Save the main relationship
      await onSave(finalValues);

      // Update related relationships with adjusted weights if applicable
      if (
        weightAdjustments.length > 0 &&
        Number(finalWeight) > 0 &&
        (sourceType === 'clientGroup' || sourceType === 'clientGroupType')
      ) {
        const { updateRelationship } = await import(
          '@/lib/actions/unified-relationship-actions'
        );

        // Update each related relationship with its adjusted weight
        await Promise.all(
          weightAdjustments.map(async (rel) => {
            try {
              await updateRelationship(rel.id, {
                ...finalValues,
                weight: rel.adjustedWeight.toString(),
              });
            } catch (error) {
              console.error(
                `Failed to update related relationship ${rel.id}:`,
                error
              );
            }
          })
        );
      }

      form.reset();
      onOpenChange(false);

      // Trigger a page reload to show updated weights
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to save relationship:', error);
    } finally {
      setLoading(false);
    }
  }

  const relationshipType = form.watch('type');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Edit Relationship' : 'Create Relationship'}
          </DialogTitle>
          <DialogDescription>
            {editData ? 'Modify' : 'Define'} the relationship properties between{' '}
            {sourceType} and {targetType}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {validTypes.length === 0 && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                No valid relationship types available for this connection.
              </div>
            )}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {validTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* First relationship - no weight needed */}
            {isFirstRelationship ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <svg
                      className="h-5 w-5 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-green-900">
                      First Product Relationship
                    </h4>
                    <p className="text-xs text-green-700 mt-1">
                      This is the first product for this client group. Weight
                      will automatically be set to 100% (1.0). You&apos;ll
                      specify weights when adding additional products.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Weight (Purchase Mix){' '}
                        {relatedRelationships.length > 0 && (
                          <span className="text-xs text-muted-foreground font-normal">
                            - Will auto-adjust other products to total 100%
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          placeholder="0.25"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Percentage as decimal (e.g., 0.25 for 25%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Weight Distribution Preview */}
                {relatedRelationships.length > 0 &&
                  Number(currentWeight) > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-blue-900">
                          Weight Distribution Preview
                        </h4>
                        <span
                          className={`text-xs font-medium ${
                            Math.abs(totalWeight - 1) < 0.001
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          Total: {(totalWeight * 100).toFixed(1)}%
                        </span>
                      </div>

                      {loadingRelated ? (
                        <div className="text-xs text-muted-foreground">
                          Loading related products...
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {/* Current relationship */}
                          <div className="text-xs bg-white rounded px-2 py-1.5 border border-blue-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-blue-900">
                                This product
                              </span>
                              <span className="font-semibold text-blue-700">
                                {(Number(currentWeight) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Related relationships */}
                          {weightAdjustments.map((rel) => (
                            <div
                              key={rel.id}
                              className="text-xs bg-white rounded px-2 py-1.5"
                            >
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-gray-700 truncate">
                                  {rel.targetName}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-gray-400 line-through">
                                    {(rel.currentWeight * 100).toFixed(1)}%
                                  </span>
                                  <span>→</span>
                                  <span className="font-semibold text-gray-900">
                                    {(rel.adjustedWeight * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-blue-700 mt-2 pt-2 border-t border-blue-200">
                        Other products will be proportionally adjusted to
                        maintain 100% total
                      </div>
                    </div>
                  )}
              </>
            )}

            {relationshipType === 'upselling' && (
              <>
                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probability</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          placeholder="0.15"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="afterMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>After Months</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || validTypes.length === 0}
              >
                {loading
                  ? editData
                    ? 'Updating...'
                    : 'Creating...'
                  : editData
                    ? 'Update Relationship'
                    : 'Create Relationship'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
