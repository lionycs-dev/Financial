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
import { SimpleProductForm } from '@/components/forms/simple-product-form';
import { getProducts } from '@/lib/actions/product-actions';

export function ProductsTab() {
  const [products, setProducts] = useState<
    {
      id: number;
      streamId: number;
      name: string;
      unitCost: string;
      entryWeight: string;
      cac: string;
      createdAt: Date;
      updatedAt: Date;
      revenueStream: {
        id: number;
        name: string;
        type:
          | 'Subscription'
          | 'RepeatPurchase'
          | 'SinglePurchase'
          | 'RevenueOnly';
      } | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProducts();
        setProducts(data);
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
    // Reload products
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to reload products:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Products</h2>
        <Drawer open={open} onOpenChange={setOpen} direction="right">
          <DrawerTrigger asChild>
            <Button>New Product</Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[100vh] overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle>Create New Product</DrawerTitle>
              <DrawerDescription>
                Add a new product with basic information.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <SimpleProductForm onSuccess={handleSuccess} />
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
              <TableHead>Unit Cost</TableHead>
              <TableHead>Entry Weight</TableHead>
              <TableHead>CAC</TableHead>
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
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.revenueStream?.name || 'N/A'}</TableCell>
                  <TableCell>${product.unitCost}</TableCell>
                  <TableCell>
                    {(Number(product.entryWeight) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell>${product.cac}</TableCell>
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
