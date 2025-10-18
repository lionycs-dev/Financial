'use client';

import { useState } from 'react';
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

const relationshipSchema = z.object({
  type: z.enum(['first_purchase', 'existing_relationship', 'upselling']),
  weight: z
    .string()
    .min(1, 'Weight is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1,
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

export function RelationshipModal({
  open,
  onOpenChange,
  sourceType,
  targetType,
  onSave,
  editData,
}: RelationshipModalProps) {
  const [loading, setLoading] = useState(false);

  const validTypes = getValidRelationshipTypes(sourceType, targetType);
  const defaultType: RelationshipType =
    validTypes.length > 0 ? validTypes[0].value : 'first_purchase';

  const form = useForm<RelationshipFormData>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: editData || {
      type: defaultType,
      weight: '',
      probability: '',
      afterMonths: '',
    },
  });

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

  async function onSubmit(values: RelationshipFormData) {
    setLoading(true);
    try {
      await onSave(values);
      form.reset();
      onOpenChange(false);
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

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {relationshipType === 'first_purchase' && 'Weight'}
                    {relationshipType === 'existing_relationship' && 'Weight'}
                    {relationshipType === 'upselling' && 'Weight'}
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
                  <FormMessage />
                </FormItem>
              )}
            />

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
