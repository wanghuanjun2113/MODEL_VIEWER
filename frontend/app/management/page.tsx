"use client";

import { Header } from "@/components/header";
import { HardwareTable } from "@/components/management/hardware-table";
import { ModelTable } from "@/components/management/model-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, Layers } from "lucide-react";

export default function ManagementPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage hardware configurations and model specifications
          </p>
        </div>

        <Tabs defaultValue="hardware" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="hardware" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Hardware
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Models
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hardware" className="space-y-4">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">Hardware Configurations</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Manage GPU and accelerator specifications for MFU calculations. You can
                download the template, fill in your hardware specs, and import via CSV.
              </p>
              <HardwareTable />
            </div>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">Model Configurations</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Manage model specifications. You can fetch model configurations directly
                from Hugging Face or enter them manually.
              </p>
              <ModelTable />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
