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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  revenueStreamSchema,
  type RevenueStreamFormData,
} from '@/lib/schemas/forms';
import {
  createRevenueStream,
  updateRevenueStream,
} from '@/lib/actions/revenue-stream-actions';
import { useState, useEffect } from 'react';

interface RevenueStreamFormProps {
  onSuccess: () => void;
  initialData?: {
    id: number;
    name: string;
    type: 'Subscription' | 'RepeatPurchase' | 'SinglePurchase' | 'RevenueOnly';
    description?: string;
  } | null;
}

export function RevenueStreamForm({
  onSuccess,
  initialData,
}: RevenueStreamFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData;

  const form = useForm<RevenueStreamFormData>({
    resolver: zodResolver(revenueStreamSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'Subscription',
      description: initialData?.description || '',
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        type: initialData.type,
        description: initialData.description || '',
      });
    }
  }, [initialData, form]);

  async function onSubmit(values: RevenueStreamFormData) {
    setLoading(true);
    try {
      const result = isEditing
        ? await updateRevenueStream(initialData!.id, values)
        : await createRevenueStream(values);

      if (result.success) {
        if (!isEditing) {
          form.reset();
        }
        onSuccess();
      } else {
        console.error(
          `Failed to ${isEditing ? 'update' : 'create'} revenue stream:`,
          result.error
        );
      }
    } catch (error) {
      console.error(
        `Failed to ${isEditing ? 'update' : 'create'} revenue stream:`,
        error
      );
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter revenue stream name" {...field} />
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
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select revenue stream type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Subscription">Subscription</SelectItem>
                  <SelectItem value="RepeatPurchase">
                    Repeat Purchase
                  </SelectItem>
                  <SelectItem value="SinglePurchase">
                    Single Purchase
                  </SelectItem>
                  <SelectItem value="RevenueOnly">Revenue Only</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional description"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide additional details about this revenue stream.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? isEditing
              ? 'Updating...'
              : 'Creating...'
            : isEditing
              ? 'Update Revenue Stream'
              : 'Create Revenue Stream'}
        </Button>
      </form>
    </Form>
  );
}
