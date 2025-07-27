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
import { SimpleClientGroupForm } from '@/components/forms/simple-client-group-form';
import { getClientGroups } from '@/lib/actions/client-group-actions';

export function ClientGroupsTab() {
  const [clientGroups, setClientGroups] = useState<
    {
      id: number;
      name: string;
      startingCustomers: number;
      churnRate: string;
      acvGrowthRate: string;
      firstPurchaseMix: unknown;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadClientGroups() {
      try {
        const data = await getClientGroups();
        setClientGroups(data);
      } catch (error) {
        console.error('Failed to load client groups:', error);
      } finally {
        setLoading(false);
      }
    }
    loadClientGroups();
  }, []);

  const handleSuccess = async () => {
    setOpen(false);
    // Reload client groups
    try {
      const data = await getClientGroups();
      setClientGroups(data);
    } catch (error) {
      console.error('Failed to reload client groups:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Client Groups</h2>
        <Drawer open={open} onOpenChange={setOpen} direction="right">
          <DrawerTrigger asChild>
            <Button>New Client Group</Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[100vh] overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle>Create New Client Group</DrawerTitle>
              <DrawerDescription>
                Add a new client group with basic customer metrics.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <SimpleClientGroupForm onSuccess={handleSuccess} />
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
              <TableHead>Starting Customers</TableHead>
              <TableHead>Churn Rate</TableHead>
              <TableHead>ACV Growth Rate</TableHead>
              <TableHead>Purchase Mix</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientGroups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No client groups found. Create your first one to get started.
                </TableCell>
              </TableRow>
            ) : (
              clientGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>
                    {group.startingCustomers.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {(Number(group.churnRate) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    {(Number(group.acvGrowthRate) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    {Object.entries(
                      group.firstPurchaseMix as Record<string, number>
                    )
                      .map(
                        ([productId, percentage]) =>
                          `P${productId}: ${(percentage * 100).toFixed(0)}%`
                      )
                      .join(', ')}
                  </TableCell>
                  <TableCell>
                    {new Date(group.createdAt).toLocaleDateString()}
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
