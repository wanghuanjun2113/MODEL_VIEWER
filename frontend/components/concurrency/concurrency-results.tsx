"use client";

import React, { useState, useEffect } from "react";

import { useLanguage } from "@/lib/i18n";
import type { ConcurrencyResult } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Zap,
  HardDrive,
  Server,
  Cpu,
  Database,
  Lightbulb,
  Cpu as CpuIcon,
} from "lucide-react";
import { calculateMemoryWithConcurrency } from "@/lib/concurrency-calculator";

// Default English translations for SSR
const defaultTranslations: Record<string, string> = {
  maxConcurrency: "Max Concurrency",
  withoutPagedAttention: "Without Paged Attention",
  withPagedAttention: "With Paged Attention",
  requests: "requests",
  memoryBreakdown: "Memory Breakdown",
  item: "Item",
  singleRequest: "Single Request",
  total: "Total",
  weightMemory: "Weight Memory",
  frameworkOverhead: "Framework Overhead",
  kvCacheMemory: "KV Cache Memory",
  activationMemory: "Activation Memory",
  hardwareMemory: "Hardware Memory",
  usedMemory: "Used Memory",
  availableMemory: "Available Memory",
  runCalculationToSeeDetails: "Run a calculation to see memory details",
  hardwareInfo: "Hardware Info",
  hardwareInfoTip: "Total GPU memory available for model loading",
  totalMemory: "Total Memory",
};

interface ConcurrencyResultsProps {
  result: ConcurrencyResult | null;
}

export function ConcurrencyResults({ result }: ConcurrencyResultsProps) {
  const { t, isHydrated } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use translations only after mounted, otherwise use default English
  const tt = mounted && isHydrated ? t : ((key: string) => defaultTranslations[key] || key);

  if (!result) {
    return (
      <div className="space-y-4">
        <ConcurrencyCard tt={tt} title={tt("maxConcurrency")} withoutPA="--" withPA="--" />
        <MemoryBreakdownCard tt={tt} breakdown={null} hardwareMemory={0} availableMemory={0} />
        <HardwareInfoCard tt={tt} hardwareMemory={0} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ConcurrencyCard
        tt={tt}
        title={tt("maxConcurrency")}
        withoutPA={result.max_concurrency_without_pa.toString()}
        withPA={result.max_concurrency_with_pa.toString()}
      />
      <MemoryBreakdownCard
        tt={tt}
        breakdown={result.memory_breakdown}
        hardwareMemory={result.hardware_memory_gb}
        availableMemory={result.available_memory_gb}
      />
      <HardwareInfoCard tt={tt} hardwareMemory={result.hardware_memory_gb} />
    </div>
  );
}

interface ConcurrencyCardProps {
  title: string;
  withoutPA: string;
  withPA: string;
  tt: (key: string) => string;
}

function ConcurrencyCard({ title, withoutPA, withPA, tt }: ConcurrencyCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              {tt("withoutPagedAttention")}
            </div>
            <div className="text-3xl font-bold tracking-tight">{withoutPA}</div>
            <div className="text-xs text-muted-foreground">{tt("requests")}</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Server className="h-3 w-3" />
              {tt("withPagedAttention")}
            </div>
            <div className="text-3xl font-bold tracking-tight text-primary">
              {withPA}
            </div>
            <div className="text-xs text-muted-foreground">
              {tt("requests")} (×2.3)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MemoryBreakdownCardProps {
  breakdown: ReturnType<typeof calculateMemoryWithConcurrency> | null;
  hardwareMemory: number;
  availableMemory: number;
  tt: (key: string) => string;
}

function MemoryBreakdownCard({
  breakdown,
  hardwareMemory,
  availableMemory,
  tt,
}: MemoryBreakdownCardProps) {
  const items = breakdown
    ? [
        {
          label: tt("weightMemory"),
          icon: Cpu,
          single: breakdown.weight_memory_gb,
          total: breakdown.weight_memory_gb,
        },
        {
          label: tt("frameworkOverhead"),
          icon: Server,
          single: breakdown.framework_overhead_gb,
          total: breakdown.framework_overhead_gb,
        },
        {
          label: tt("kvCacheMemory"),
          icon: Database,
          single: breakdown.kv_cache_memory_gb,
          total: breakdown.kv_cache_memory_gb,
        },
        {
          label: tt("activationMemory"),
          icon: HardDrive,
          single: breakdown.activation_memory_gb,
          total: breakdown.activation_memory_gb,
        },
      ]
    : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <HardDrive className="h-4 w-4 text-primary" />
          {tt("memoryBreakdown")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {breakdown ? (
          <div className="space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>{tt("item")}</span>
              <span className="text-right">{tt("singleRequest")}</span>
              <span className="text-right">{tt("total")}</span>
            </div>

            <Separator />

            {/* Table Rows */}
            {items.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-3 gap-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-3 w-3 text-muted-foreground" />
                  <span>{item.label}</span>
                </div>
                <span className="text-right font-mono text-muted-foreground">
                  {item.single.toFixed(2)} GB
                </span>
                <span className="text-right font-mono">
                  {item.total.toFixed(2)} GB
                </span>
              </div>
            ))}

            <Separator />

            {/* Total */}
            <div className="grid grid-cols-3 gap-2 text-sm font-medium">
              <span>{tt("total")}</span>
              <span className="text-right font-mono text-muted-foreground">
                {(
                  breakdown.weight_memory_gb +
                  breakdown.framework_overhead_gb +
                  breakdown.kv_cache_memory_gb +
                  breakdown.activation_memory_gb
                ).toFixed(2)}{" "}
                GB
              </span>
              <span className="text-right font-mono">
                {breakdown.total_memory_gb.toFixed(2)} GB
              </span>
            </div>

            <Separator />

            {/* Available Memory */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tt("hardwareMemory")}</span>
                <span className="font-mono">{hardwareMemory.toFixed(2)} GB</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tt("usedMemory")}</span>
                <span className="font-mono">
                  {(hardwareMemory - availableMemory).toFixed(2)} GB
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-muted-foreground">{tt("availableMemory")}</span>
                <span className="font-mono text-success">
                  {availableMemory.toFixed(2)} GB
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {tt("runCalculationToSeeDetails")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface HardwareInfoCardProps {
  hardwareMemory: number;
  tt: (key: string) => string;
}

function HardwareInfoCard({ hardwareMemory, tt }: HardwareInfoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CpuIcon className="h-4 w-4 text-primary" />
          {tt("hardwareInfo")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{tt("totalMemory")}</span>
          <span className="font-mono font-medium">{hardwareMemory.toFixed(2)} GB</span>
        </div>
        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          <Lightbulb className="mb-1 h-3 w-3 inline-block mr-1" />
          {tt("hardwareInfoTip")}
        </div>
      </CardContent>
    </Card>
  );
}
