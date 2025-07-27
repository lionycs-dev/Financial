'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import React from 'react';
import { z } from 'zod';

// Simplified client group schema without product relationships
const simpleClientGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startingCustomers: z
    .string()
    .min(1, 'Starting customers is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
      message: 'Starting customers must be at least 1',
    }),
  churnRate: z
    .string()
    .min(1, 'Churn rate is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1,
      {
        message: 'Churn rate must be between 0 and 1',
      }
    ),
  acvGrowthRate: z
    .string()
    .min(1, 'ACV growth rate is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= -1, {
      message: 'ACV growth rate must be greater than -1',
    }),
});

type SimpleClientGroupFormData = z.infer<typeof simpleClientGroupSchema>;

interface SimpleClientGroupFormProps {
  onSuccess: () => void;
  initialData?: {
    id: number;
    name: string;
    startingCustomers: number;
    churnRate: string;
    acvGrowthRate: string;
  } | null;
}

export function SimpleClientGroupForm({
  onSuccess,
  initialData,
}: SimpleClientGroupFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const isEditing = !!initialData;

  const form = useForm<SimpleClientGroupFormData>({
    resolver: zodResolver(simpleClientGroupSchema),
    defaultValues: {
      name: initialData?.name || '',
      startingCustomers: initialData?.startingCustomers?.toString() || '',
      churnRate: initialData?.churnRate || '',
      acvGrowthRate: initialData?.acvGrowthRate || '',
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        startingCustomers: initialData.startingCustomers.toString(),
        churnRate: initialData.churnRate,
        acvGrowthRate: initialData.acvGrowthRate,
      });
    }
  }, [initialData, form]);

  async function onSubmit(values: SimpleClientGroupFormData) {
    setLoading(true);
    setError('');

    try {
      const { createClientGroup, updateClientGroup } = await import('@/lib/actions/client-group-actions');
      
      const clientGroupData = {
        name: values.name,
        startingCustomers: parseInt(values.startingCustomers),
        churnRate: values.churnRate,
        acvGrowthRate: values.acvGrowthRate,
      };

      const result = isEditing 
        ? await updateClientGroup(initialData!.id, clientGroupData)
        : await createClientGroup(clientGroupData);
      
      if (result.success) {
        if (!isEditing) {
          form.reset();
        }
        onSuccess();
      } else {
        setError(result.error || `Failed to ${isEditing ? 'update' : 'create'} client group`);
      }
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} client group:`, error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Group Name</FormLabel>
              <FormControl>
                <Input placeholder="Enterprise Customers" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startingCustomers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starting Customers</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="100"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="churnRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Churn Rate</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    placeholder="0.05"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Monthly churn rate as decimal (e.g., 0.05 for 5%)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="acvGrowthRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ACV Growth Rate</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.10"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Annual contract value growth rate as decimal (e.g., 0.10 for
                10%)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading 
            ? (isEditing ? 'Updating...' : 'Creating...') 
            : (isEditing ? 'Update Client Group' : 'Create Client Group')
          }
        </Button>
      </form>
    </Form>
  );
}
