'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { ProductForm } from '@/components/forms/product-form';
import { getProducts } from '@/lib/actions/product-actions';
import { FrequencyType, InvoiceTimingType } from '@/lib/schemas/forms';
import { ProductSelect } from '@/lib/db/schema';

export function ProductsTab() {
  const [products, setProducts] = useState<
    {
      id: number;
      name: string;
      unitCost: string;
      productStreamId: number;
      weight: string;
      pricingPlans: Array<{
        name: string;
        priceFormula: string;
        frequency: string;
        customFrequency?: number;
        invoiceTiming: string;
        customInvoiceTiming?: number;
        leadToCashLag: number;
        escalatorPct?: string;
      }>;
      revenueStream?: {
        id: number;
        name: string;
        type: string;
      };
      createdAt: Date;
      updatedAt: Date;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{
    id: number;
    name: string;
    unitCost: string;
    productStreamId?: number;
    weight?: string;
    pricingPlans?: Array<{
      name: string;
      priceFormula: string;
      frequency: FrequencyType;
      customFrequency?: number;
      invoiceTiming: InvoiceTimingType;
      customInvoiceTiming?: number;
      leadToCashLag: number;
      escalatorPct?: string;
    }>;
  } | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProducts();
        const safeData = data.map((product: ProductSelect) => ({
          ...product,
          pricingPlans: Array.isArray(product.pricingPlans)
            ? product.pricingPlans
            : [],
        }));
        setProducts(safeData);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const handleSuccess = async () => {
    setOpen(false);
    setEditingProduct(null);
    // Reload products
    try {
      const data = await getProducts();
      const safeData = data.map((product: ProductSelect) => ({
        ...product,
        pricingPlans: Array.isArray(product.pricingPlans)
          ? product.pricingPlans
          : [],
      }));
      setProducts(safeData);
    } catch (error) {
      console.error('Failed to reload products:', error);
    }
  };

  const handleEditProduct = (product: (typeof products)[0]) => {
    setEditingProduct({
      id: product.id,
      name: product.name,
      unitCost: product.unitCost,
      productStreamId: product.productStreamId,
      weight: product.weight,
      pricingPlans: product.pricingPlans?.map((plan) => ({
        ...plan,
        frequency: plan.frequency as FrequencyType,
        invoiceTiming: plan.invoiceTiming as InvoiceTimingType,
      })),
    });
    setOpen(true);
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setOpen(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Products</h2>
        <Drawer
          open={open}
          onOpenChange={(open) => {
            setOpen(open);
            if (!open) {
              setEditingProduct(null);
            }
          }}
          direction="right"
        >
          <DrawerTrigger asChild>
            <Button onClick={handleNewProduct}>New Product</Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[100vh] overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle>
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </DrawerTitle>
              <DrawerDescription>
                {editingProduct
                  ? 'Update the product details and pricing plans.'
                  : 'Add a new product with pricing plans and detailed information.'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <ProductForm
                onSuccess={handleSuccess}
                initialData={editingProduct}
              />
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Revenue Stream</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Pricing Plans</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No products found. Create your first one to get started.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleEditProduct(product)}
                >
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {product.revenueStream ? (
                      <div>
                        <div className="font-medium">
                          {product.revenueStream.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {product.revenueStream.type}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No stream</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(Number(product.weight) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell>${product.unitCost}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {product.pricingPlans?.length > 0 ? (
                        product.pricingPlans.map((plan, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{plan.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {plan.priceFormula} ({plan.frequency})
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No plans
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(product.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
