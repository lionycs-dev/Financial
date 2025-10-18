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
import {
  clientGroupSchema,
  type ClientGroupFormData,
} from '@/lib/schemas/forms';
import { createClientGroup } from '@/lib/actions/client-group-actions';
import { getProducts } from '@/lib/actions/product-actions';
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface ClientGroupFormProps {
  onSuccess: () => void;
}

interface PurchaseMixItem {
  productId: string;
  percentage: number;
}

export function ClientGroupForm({ onSuccess }: ClientGroupFormProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const [purchaseMix, setPurchaseMix] = useState<PurchaseMixItem[]>([
    { productId: '', percentage: 0 },
  ]);
  const [error, setError] = useState<string>('');

  const form = useForm<ClientGroupFormData>({
    resolver: zodResolver(clientGroupSchema),
    defaultValues: {
      name: '',
      startingCustomers: 0,
      conversionRate: '',
      churnRate: '',
    },
  });

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    }
    loadProducts();
  }, []);

  const addPurchaseMixItem = () => {
    setPurchaseMix([...purchaseMix, { productId: '', percentage: 0 }]);
  };

  const removePurchaseMixItem = (index: number) => {
    if (purchaseMix.length > 1) {
      setPurchaseMix(purchaseMix.filter((_, i) => i !== index));
    }
  };

  const updatePurchaseMixItem = (
    index: number,
    field: keyof PurchaseMixItem,
    value: string | number
  ) => {
    const updated = [...purchaseMix];
    updated[index] = { ...updated[index], [field]: value };
    setPurchaseMix(updated);
  };

  async function onSubmit(values: ClientGroupFormData) {
    setLoading(true);
    setError('');

    try {
      // Validate that at least one product is selected
      if (
        purchaseMix.length === 0 ||
        !purchaseMix.some((item) => item.productId && item.percentage > 0)
      ) {
        setError('Please add at least one product to the purchase mix');
        setLoading(false);
        return;
      }

      const result = await createClientGroup({
        ...values,
      });

      if (result.success) {
        form.reset();
        setPurchaseMix([{ productId: '', percentage: 0 }]);
        setError('');
        onSuccess();
      } else {
        setError(result.error || 'Failed to create client group');
      }
    } catch (error) {
      console.error('Failed to create client group:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Debug form state
  console.log('Form errors:', form.formState.errors);
  console.log('Form is valid:', form.formState.isValid);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          console.log('Form submit event triggered');
          form.handleSubmit(onSubmit)(e);
        }}
        className="space-y-6"
      >
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
          name="startingCustomers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Starting Customers</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="100"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="conversionRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conversion Rate (New Customers)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    placeholder="0.10"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Monthly new customer acquisition rate as decimal (e.g., 0.10
                  for 10%)
                </FormDescription>
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
                  Monthly customer loss rate as decimal (e.g., 0.05 for 5%)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* First Purchase Mix */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">First Purchase Mix</h3>
              <p className="text-sm text-muted-foreground">
                Define the percentage breakdown of first purchases by product
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPurchaseMixItem}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>

          {purchaseMix.map((item, index) => (
            <div key={index} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">Product</label>
                <Select
                  value={item.productId}
                  onValueChange={(value) =>
                    updatePurchaseMixItem(index, 'productId', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem
                        key={product.id}
                        value={product.id.toString()}
                      >
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium">Percentage</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="25.0"
                  value={item.percentage}
                  onChange={(e) =>
                    updatePurchaseMixItem(
                      index,
                      'percentage',
                      Number(e.target.value)
                    )
                  }
                />
              </div>

              {purchaseMix.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePurchaseMixItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="text-sm text-muted-foreground">
            Total:{' '}
            {purchaseMix
              .reduce((sum, item) => sum + (item.percentage || 0), 0)
              .toFixed(1)}
            % (must equal 100%)
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
          onClick={() => {
            console.log('Button clicked');
            console.log('Current form values:', form.getValues());
          }}
        >
          {loading ? 'Creating...' : 'Create Client Group'}
        </Button>
      </form>
    </Form>
  );
}
