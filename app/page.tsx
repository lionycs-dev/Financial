import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StreamsTab } from '@/components/tabs/streams-tab';
import { ProductsTab } from '@/components/tabs/products-tab';
import { ClientGroupsTab } from '@/components/tabs/client-groups-tab';

export default async function Home() {
  return (
    <div className="font-sans min-h-screen p-8">
      <main className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Financial Dashboard
        </h1>

        <Tabs defaultValue="streams" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="streams">Revenue Streams</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="clientgroups">Client Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="streams">
            <StreamsTab />
          </TabsContent>

          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="clientgroups">
            <ClientGroupsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
