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
      type: 'B2B' | 'B2C' | 'DTC';
      startingCustomers: number;
      churnRate: string;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingClientGroup, setEditingClientGroup] = useState<{
    id: number;
    name: string;
    type: 'B2B' | 'B2C' | 'DTC';
    startingCustomers: number;
    churnRate: string;
  } | null>(null);

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
    setEditingClientGroup(null);
    // Reload client groups
    try {
      const data = await getClientGroups();
      setClientGroups(data);
    } catch (error) {
      console.error('Failed to reload client groups:', error);
    }
  };

  const handleEditClientGroup = (group: (typeof clientGroups)[0]) => {
    setEditingClientGroup({
      id: group.id,
      name: group.name,
      type: group.type,
      startingCustomers: group.startingCustomers,
      churnRate: group.churnRate,
    });
    setOpen(true);
  };

  const handleNewClientGroup = () => {
    setEditingClientGroup(null);
    setOpen(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Client Groups</h2>
        <Drawer
          open={open}
          onOpenChange={(open) => {
            setOpen(open);
            if (!open) {
              setEditingClientGroup(null);
            }
          }}
          direction="right"
        >
          <DrawerTrigger asChild>
            <Button onClick={handleNewClientGroup}>New Client Group</Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[100vh] overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle>
                {editingClientGroup
                  ? 'Edit Client Group'
                  : 'Create New Client Group'}
              </DrawerTitle>
              <DrawerDescription>
                {editingClientGroup
                  ? 'Update the client group details.'
                  : 'Add a new client group with basic customer metrics.'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <SimpleClientGroupForm
                onSuccess={handleSuccess}
                initialData={editingClientGroup}
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
              <TableHead>Type</TableHead>
              <TableHead>Starting Customers</TableHead>
              <TableHead>Churn Rate</TableHead>
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
                <TableRow
                  key={group.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleEditClientGroup(group)}
                >
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                      {group.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    {group.startingCustomers.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {(Number(group.churnRate) * 100).toFixed(1)}%
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
