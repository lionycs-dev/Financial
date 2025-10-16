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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import React from 'react';
import { z } from 'zod';

// Simplified client group schema without product relationships
const simpleClientGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['B2B', 'B2C', 'DTC']),
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
});

type SimpleClientGroupFormData = z.infer<typeof simpleClientGroupSchema>;

interface SimpleClientGroupFormProps {
  onSuccess: () => void;
  initialData?: {
    id: number;
    name: string;
    type: 'B2B' | 'B2C' | 'DTC';
    startingCustomers: number;
    churnRate: string;
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
      type: initialData?.type || 'B2B',
      startingCustomers: initialData?.startingCustomers?.toString() || '',
      churnRate: initialData?.churnRate || '',
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        type: initialData.type,
        startingCustomers: initialData.startingCustomers.toString(),
        churnRate: initialData.churnRate,
      });
    }
  }, [initialData, form]);

  async function onSubmit(values: SimpleClientGroupFormData) {
    setLoading(true);
    setError('');

    try {
      const { createClientGroup, updateClientGroup } = await import(
        '@/lib/actions/client-group-actions'
      );

      const clientGroupData = {
        name: values.name,
        type: values.type,
        startingCustomers: parseInt(values.startingCustomers),
        churnRate: values.churnRate,
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
        setError(
          result.error ||
            `Failed to ${isEditing ? 'update' : 'create'} client group`
        );
      }
    } catch (error) {
      console.error(
        `Failed to ${isEditing ? 'update' : 'create'} client group:`,
        error
      );
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

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Group Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client group type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="B2B">
                    B2B (Business to Business)
                  </SelectItem>
                  <SelectItem value="B2C">
                    B2C (Business to Consumer)
                  </SelectItem>
                  <SelectItem value="DTC">DTC (Direct to Consumer)</SelectItem>
                </SelectContent>
              </Select>
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
                  <Input type="number" placeholder="100" {...field} />
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

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? isEditing
              ? 'Updating...'
              : 'Creating...'
            : isEditing
              ? 'Update Client Group'
              : 'Create Client Group'}
        </Button>
      </form>
    </Form>
  );
}
