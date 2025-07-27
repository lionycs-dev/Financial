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
import { useState } from 'react';
import { z } from 'zod';

// Simplified product schema without relationships
const simpleProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unitCost: z
    .string()
    .min(1, 'Unit cost is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Unit cost must be a valid positive number',
    }),
  entryWeight: z
    .string()
    .min(1, 'Entry weight is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1,
      {
        message: 'Entry weight must be between 0 and 1',
      }
    ),
  cac: z
    .string()
    .min(1, 'CAC is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'CAC must be a valid positive number',
    }),
});

type SimpleProductFormData = z.infer<typeof simpleProductSchema>;

interface SimpleProductFormProps {
  onSuccess: () => void;
}

export function SimpleProductForm({ onSuccess }: SimpleProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const form = useForm<SimpleProductFormData>({
    resolver: zodResolver(simpleProductSchema),
    defaultValues: {
      name: '',
      unitCost: '',
      entryWeight: '',
      cac: '',
    },
  });

  async function onSubmit(values: SimpleProductFormData) {
    setLoading(true);
    setError('');

    try {
      const { createProduct } = await import('@/lib/actions/product-actions');
      
      // Convert string values to numbers for the database
      const productData = {
        streamId: 1, // Default revenue stream ID - will be configurable later
        name: values.name,
        unitCost: values.unitCost,
        entryWeight: values.entryWeight,
        cac: values.cac,
      };

      const result = await createProduct(productData);
      
      if (result.success) {
        form.reset();
        onSuccess();
      } else {
        setError(result.error || 'Failed to create product');
      }
    } catch (error) {
      console.error('Failed to create product:', error);
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
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter product name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="unitCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Cost</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cac"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CAC</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="entryWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry Weight</FormLabel>
              <FormControl>
                <Input
                  placeholder="0.25"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Percentage of first purchases (0-1, e.g., 0.25 for 25%)
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
          {loading ? 'Creating...' : 'Create Product'}
        </Button>
      </form>
    </Form>
  );
}
