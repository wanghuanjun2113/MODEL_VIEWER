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
  MemoryStick,
} from "lucide-react";

// Default English translations for SSR
const defaultTranslations: Record<string, string> = {
  maxConcurrency: "Max Concurrency",
  withoutPagedAttention: "Without Paged Attention",
  withPagedAttention: "With Paged Attention",
  requests: "requests",
  memoryBreakdown: "Memory Breakdown",
  gpuInfo: "GPU Info",
  singleGpuMemory: "Single GPU Memory",
  gpuCount: "GPU Count",
  totalMemory: "Total Memory",
  fixedMemory: "Fixed Memory Usage",
  weightMemory: "Weight Memory",
  frameworkOverhead: "Framework Overhead",
  activationReserve: "Activation Reserve",
  kvCacheInfo: "KVCache Info",
  availableKvCacheMemory: "Available KVCache Memory",
  singleTokenKvCache: "Single Token KVCache",
  singleConcurrencyKvCache: "Single Concurrency KVCache",
  maxConcurrencyLabel: "Max Concurrency",
  runCalculationToSeeDetails: "Run a calculation to see memory details",
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
        <MemoryBreakdownCard
          tt={tt}
          singleGpuMemory={0}
          gpuCount={0}
          totalMemory={0}
          weightMemory={0}
          frameworkOverhead={0}
          activationReserve={0}
          availableKvCache={0}
          singleTokenKvCache={0}
          singleConcurrencyKvCache={0}
          maxConcurrency={0}
          contextLength={0}
        />
      </div>
    );
  }

  // Calculate values
  const singleGpuMemory = result.hardware.memory_size_gb;
  const gpuCount = result.gpu_count;
  const totalMemory = result.hardware_memory_gb;

  const weightMemory = result.memory_breakdown.weight_memory_gb;
  const frameworkOverhead = result.input.framework_overhead_gb * gpuCount;
  const activationReserve = result.input.activation_reserve_gb;

  const availableKvCache = result.available_memory_gb;
  const singleConcurrencyKvCache = result.per_request_kv_cache_gb;
  const singleTokenKvCache = singleConcurrencyKvCache / result.input.context_length;
  const maxConcurrency = result.max_concurrency_without_pa;

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
        singleGpuMemory={singleGpuMemory}
        gpuCount={gpuCount}
        totalMemory={totalMemory}
        weightMemory={weightMemory}
        frameworkOverhead={frameworkOverhead}
        activationReserve={activationReserve}
        availableKvCache={availableKvCache}
        singleTokenKvCache={singleTokenKvCache}
        singleConcurrencyKvCache={singleConcurrencyKvCache}
        maxConcurrency={maxConcurrency}
        contextLength={result.input.context_length}
      />
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
  singleGpuMemory: number;
  gpuCount: number;
  totalMemory: number;
  weightMemory: number;
  frameworkOverhead: number;
  activationReserve: number;
  availableKvCache: number;
  singleTokenKvCache: number;
  singleConcurrencyKvCache: number;
  maxConcurrency: number;
  contextLength: number;
  tt: (key: string) => string;
}

function MemoryBreakdownCard({
  singleGpuMemory,
  gpuCount,
  totalMemory,
  weightMemory,
  frameworkOverhead,
  activationReserve,
  availableKvCache,
  singleTokenKvCache,
  singleConcurrencyKvCache,
  maxConcurrency,
  contextLength,
  tt,
}: MemoryBreakdownCardProps) {
  const totalFixed = weightMemory + frameworkOverhead + activationReserve;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <HardDrive className="h-4 w-4 text-primary" />
          {tt("memoryBreakdown")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GPU Info Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Cpu className="h-3 w-3" />
            {tt("gpuInfo")}
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tt("singleGpuMemory")}</span>
              <span className="font-mono">{singleGpuMemory.toFixed(0)} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tt("gpuCount")}</span>
              <span className="font-mono">{gpuCount}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>{tt("totalMemory")}</span>
              <span className="font-mono text-primary">{totalMemory.toFixed(0)} GB</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Fixed Memory Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <MemoryStick className="h-3 w-3" />
            {tt("fixedMemory")}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tt("weightMemory")}</span>
              <span className="font-mono">{weightMemory.toFixed(2)} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tt("frameworkOverhead")}</span>
              <span className="font-mono">{frameworkOverhead.toFixed(2)} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tt("activationReserve")}</span>
              <span className="font-mono">{activationReserve.toFixed(2)} GB</span>
            </div>
            <div className="flex justify-between font-medium pt-1">
              <span>{tt("total")}</span>
              <span className="font-mono">{totalFixed.toFixed(2)} GB</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* KVCache Info Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Database className="h-3 w-3" />
            {tt("kvCacheInfo")}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tt("availableKvCacheMemory")}</span>
              <span className="font-mono text-success">{availableKvCache.toFixed(2)} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tt("singleTokenKvCache")}</span>
              <span className="font-mono">{(singleTokenKvCache * 1024).toFixed(2)} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tt("singleConcurrencyKvCache")}</span>
              <span className="font-mono">{singleConcurrencyKvCache.toFixed(2)} GB</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Max Concurrency */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{tt("maxConcurrencyLabel")}</span>
          <span className="font-mono text-primary text-xl font-bold">{maxConcurrency}</span>
        </div>

        <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          <Lightbulb className="mb-0.5 h-3 w-3 inline-block mr-1" />
          单并发KVCache = 单Token KVCache × 上下文长度 ({contextLength})
        </div>
      </CardContent>
    </Card>
  );
}
