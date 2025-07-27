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
import { RevenueStreamForm } from '@/components/forms/revenue-stream-form';
import { getRevenueStreams } from '@/lib/actions/revenue-stream-actions';

export function StreamsTab() {
  const [streams, setStreams] = useState<
    {
      id: number;
      name: string;
      type: string;
      description?: string;
      createdAt: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadStreams() {
      try {
        const data = await getRevenueStreams();
        setStreams(data);
      } catch (error) {
        console.error('Failed to load streams:', error);
      } finally {
        setLoading(false);
      }
    }
    loadStreams();
  }, []);

  const handleSuccess = async () => {
    setOpen(false);
    // Reload streams
    try {
      const data = await getRevenueStreams();
      setStreams(data);
    } catch (error) {
      console.error('Failed to reload streams:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Revenue Streams</h2>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button>New Revenue Stream</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Create New Revenue Stream</DrawerTitle>
              <DrawerDescription>
                Add a new revenue stream to organize your products.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <RevenueStreamForm onSuccess={handleSuccess} />
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
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {streams.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No revenue streams found. Create your first one to get
                  started.
                </TableCell>
              </TableRow>
            ) : (
              streams.map((stream) => (
                <TableRow key={stream.id}>
                  <TableCell className="font-medium">{stream.name}</TableCell>
                  <TableCell>{stream.type}</TableCell>
                  <TableCell>{stream.description || '-'}</TableCell>
                  <TableCell>
                    {new Date(stream.createdAt).toLocaleDateString()}
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
