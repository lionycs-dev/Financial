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
import { createRevenueStream } from '@/lib/actions/revenue-stream-actions';
import { useState } from 'react';

interface RevenueStreamFormProps {
  onSuccess: () => void;
}

export function RevenueStreamForm({ onSuccess }: RevenueStreamFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<RevenueStreamFormData>({
    resolver: zodResolver(revenueStreamSchema),
    defaultValues: {
      name: '',
      type: 'Subscription',
      description: '',
    },
  });

  async function onSubmit(values: RevenueStreamFormData) {
    setLoading(true);
    try {
      const result = await createRevenueStream(values);
      if (result.success) {
        form.reset();
        onSuccess();
      } else {
        console.error('Failed to create revenue stream:', result.error);
      }
    } catch (error) {
      console.error('Failed to create revenue stream:', error);
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
          {loading ? 'Creating...' : 'Create Revenue Stream'}
        </Button>
      </form>
    </Form>
  );
}
