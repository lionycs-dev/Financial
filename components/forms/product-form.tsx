'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import {
  productWithPricingPlansSchema,
  type ProductWithPricingPlansFormData,
} from '@/lib/schemas/forms';
import { createProductWithPricingPlans } from '@/lib/actions/product-actions';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface ProductFormProps {
  onSuccess: () => void;
}

export function ProductForm({ onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<ProductWithPricingPlansFormData>({
    resolver: zodResolver(productWithPricingPlansSchema),
    defaultValues: {
      product: {
        name: '',
        unitCost: '',
        cac: '',
      },
      pricingPlans: [
        {
          name: '',
          priceFormula: '',
          frequency: 'Monthly',
          customFrequency: undefined,
          invoiceTiming: 'Immediate',
          customInvoiceTiming: undefined,
          leadToCashLag: 0,
          escalatorPct: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'pricingPlans',
  });


  async function onSubmit(values: ProductWithPricingPlansFormData) {
    setLoading(true);
    try {
      const result = await createProductWithPricingPlans(values);
      if (result.success) {
        form.reset();
        onSuccess();
      } else {
        console.error('Failed to create product:', result.error);
      }
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Product Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Product Details</h3>

          <FormField
            control={form.control}
            name="product.name"
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
              name="product.unitCost"
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
              name="product.cac"
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

        </div>

        {/* Pricing Plans */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Pricing Plans</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  name: '',
                  priceFormula: '',
                  frequency: 'Monthly',
                  customFrequency: undefined,
                  invoiceTiming: 'Immediate',
                  customInvoiceTiming: undefined,
                  leadToCashLag: 0,
                  escalatorPct: '',
                })
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Plan {index + 1}</h4>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`pricingPlans.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Basic Plan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`pricingPlans.${index}.priceFormula`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Formula</FormLabel>
                      <FormControl>
                        <Input placeholder="$99/month" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`pricingPlans.${index}.frequency`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="SemiAnnual">
                            Semi-Annual
                          </SelectItem>
                          <SelectItem value="Annual">Annual</SelectItem>
                          <SelectItem value="OneTime">One Time</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`pricingPlans.${index}.invoiceTiming`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Timing</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Immediate">Immediate</SelectItem>
                          <SelectItem value="Upfront">Upfront</SelectItem>
                          <SelectItem value="Net30">Net 30</SelectItem>
                          <SelectItem value="Net60">Net 60</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`pricingPlans.${index}.leadToCashLag`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead to Cash Lag (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="30"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`pricingPlans.${index}.escalatorPct`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escalator % (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.05"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Annual price increase percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Create Product with Pricing Plans'}
        </Button>
      </form>
    </Form>
  );
}
