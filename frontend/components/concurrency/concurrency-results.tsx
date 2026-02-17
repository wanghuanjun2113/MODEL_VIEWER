"use client";

import React, { useState, useEffect } from "react";

import { useLanguage } from "@/lib/i18n";
import type { ConcurrencyResult, Model, Precision } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Zap,
  HardDrive,
  Server,
  Cpu,
  Database,
  Lightbulb,
  MemoryStick,
  Info,
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
  kvCacheFormulas: "KVCache Formulas by Architecture",
  linearModels: "Linear / SSM Models",
  linearModelsNote: "Fixed state size, no per-token KV cache growth",
  hybridModels: "Hybrid Models",
  hybridModelsNote: "Combines multiple attention mechanisms, calculation varies by layer",
  currentModelFormula: "Current Model Formula",
  allArchitectures: "All Architectures",
  currentModel: "Current",
  formula: "Formula",
  substitution: "Substitution",
  parameters: "Parameters",
  calculationResult: "Calculation Result",
  perTokenKvCache: "Per-Token KVCache",
  perSeqKvCache: "Per-Sequence KVCache",
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
  const tt = ((key: string) => {
    if (mounted && isHydrated) {
      return t(key as any);
    }
    return defaultTranslations[key] || key;
  });

  if (!result) {
    // Default model for placeholder display
    const defaultModel: Model = {
      id: "",
      name: "",
      huggingface_id: "",
      params_billions: 0,
      num_layers: 0,
      hidden_size: 0,
      num_attention_heads: 0,
      num_key_value_heads: 0,
      vocab_size: 0,
      intermediate_size: 0,
      head_dim: 0,
      max_position_embeddings: 0,
      created_at: "",
      updated_at: "",
    };

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
          model={defaultModel}
          precision="FP16"
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
  // Calculate activation reserve from GPU utilization (with fallback for old data)
  const gpuUtilization = result.input.gpu_utilization ?? 0.9;
  const activationReserve = (1 - gpuUtilization) * totalMemory;

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
        model={result.model}
        precision={result.input.attention_precision}
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
  model: Model;
  precision: Precision;
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
  model,
  precision,
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
            <KvCacheFormulaDialog
              tt={tt}
              model={model}
              precision={precision}
              contextLength={contextLength}
              singleTokenKvCache={singleTokenKvCache}
            />
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

// Helper function to get bytes per element
function getBytesPerElement(precision: Precision): number {
  switch (precision) {
    case "FP16":
    case "BF16":
      return 2;
    case "INT8":
      return 1;
  }
}

// KVCache formula dialog component
interface KvCacheFormulaDialogProps {
  tt: (key: string) => string;
  model: Model;
  precision: Precision;
  contextLength: number;
  singleTokenKvCache: number;
}

function KvCacheFormulaDialog({
  tt,
  model,
  precision,
  contextLength,
  singleTokenKvCache,
}: KvCacheFormulaDialogProps) {
  const bytesPerElement = getBytesPerElement(precision);
  const numLayers = model.num_layers;
  const numHeads = model.num_attention_heads;
  const numKvHeads = model.num_key_value_heads;
  const headDim = model.head_dim;

  // Check if this is a hybrid attention model
  const isHybrid = model.is_hybrid_attention;
  const numFullAttnLayers = model.num_full_attention_layers || 0;
  const numLinearAttnLayers = model.num_linear_attention_layers || 0;
  const linearKeyHeads = model.linear_num_key_heads || 0;
  const linearValueHeads = model.linear_num_value_heads || 0;
  const linearKeyHeadDim = model.linear_key_head_dim || 0;
  const linearValueHeadDim = model.linear_value_head_dim || 0;
  const linearConvKernelDim = model.linear_conv_kernel_dim || 1;

  // Determine attention type
  const getAttentionType = (): { type: string; formula: string; example: string } => {
    // Hybrid attention model (like Qwen3.5)
    if (isHybrid && numFullAttnLayers > 0) {
      // Linear attention state size (fixed, not dependent on seq_len)
      // Recurrent state: linearKeyHeads * linearKeyHeadDim * linearValueHeadDim
      // Conv buffer: linearKeyHeads * linearKeyHeadDim * linearConvKernelDim
      const recurrentState = linearKeyHeads * linearKeyHeadDim * linearValueHeadDim;
      const convBuffer = linearKeyHeads * linearKeyHeadDim * linearConvKernelDim;
      const linearStateSize = recurrentState + convBuffer;
      return {
        type: "Hybrid Attention (Full + Linear)",
        formula: `KV = 2 × L_full × H_kv × d × seq × bytes + L_linear × (K×V_state + conv_buffer) × bytes`,
        example: `= 2 × ${numFullAttnLayers} × ${numKvHeads} × ${headDim} × ${contextLength} × ${bytesPerElement} + ${numLinearAttnLayers} × (${linearKeyHeads}×${linearKeyHeadDim}×${linearValueHeadDim} + ${linearKeyHeads}×${linearKeyHeadDim}×${linearConvKernelDim}) × ${bytesPerElement}`,
      };
    }

    if (numKvHeads === numHeads) {
      // MHA - standard multi-head attention
      return {
        type: "MHA (Multi-Head Attention)",
        formula: `KV = 2 × L × H × d × seq × bytes`,
        example: `= 2 × ${numLayers} × ${numHeads} × ${headDim} × ${contextLength} × ${bytesPerElement}`,
      };
    } else if (numKvHeads === 1) {
      // MQA - multi-query attention
      return {
        type: "MQA (Multi-Query Attention)",
        formula: `KV = 2 × L × 1 × d × seq × bytes`,
        example: `= 2 × ${numLayers} × 1 × ${headDim} × ${contextLength} × ${bytesPerElement}`,
      };
    } else {
      // GQA - grouped query attention
      return {
        type: "GQA (Grouped Query Attention)",
        formula: `KV = 2 × L × H_kv × d × seq × bytes`,
        example: `= 2 × ${numLayers} × ${numKvHeads} × ${headDim} × ${contextLength} × ${bytesPerElement}`,
      };
    }
  };

  const attentionInfo = getAttentionType();

  // Calculate the expected value
  // For hybrid models: only full attention layers contribute to per-token cache
  // Linear attention has fixed state size
  let kvCachePerTokenBytes: number;
  let linearStateBytes = 0;

  if (isHybrid && numFullAttnLayers > 0) {
    // Full attention per-token cache
    kvCachePerTokenBytes = 2 * numFullAttnLayers * numKvHeads * headDim * bytesPerElement;
    // Linear attention fixed state:
    // - Recurrent state (K^T * V accumulator): linearKeyHeads * linearKeyHeadDim * linearValueHeadDim
    // - Convolution buffer: linearKeyHeads * linearKeyHeadDim * linearConvKernelDim
    const recurrentState = linearKeyHeads * linearKeyHeadDim * linearValueHeadDim;
    const convBuffer = linearKeyHeads * linearKeyHeadDim * linearConvKernelDim;
    linearStateBytes = numLinearAttnLayers * (recurrentState + convBuffer) * bytesPerElement;
  } else {
    kvCachePerTokenBytes = 2 * numLayers * numKvHeads * headDim * bytesPerElement;
  }

  const kvCachePerTokenMB = kvCachePerTokenBytes / (1024 * 1024);
  const linearStateMB = linearStateBytes / (1024 * 1024);
  // Total KV cache includes both per-token cache and fixed linear state
  const kvCachePerSeqGB = (kvCachePerTokenBytes * contextLength + linearStateBytes) / (1024 * 1024 * 1024);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center justify-center rounded-full hover:bg-muted/50 p-0.5 transition-colors">
          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </button>
      </DialogTrigger>
      <DialogContent className="w-[50vw] max-w-[calc(100%-2rem)] sm:max-w-[50vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {tt("kvCacheFormulas")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Model Calculation */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-semibold text-primary">{tt("currentModelFormula")}</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{model.name}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{attentionInfo.type}</span>
              </div>

              <div className="bg-background/80 p-3 rounded border space-y-2">
                <div className="text-sm font-medium text-muted-foreground">{tt("formula")}</div>
                <div className="font-mono text-sm bg-muted/50 p-2 rounded">
                  {attentionInfo.formula}
                </div>

                <div className="text-sm font-medium text-muted-foreground mt-3">{tt("substitution")}</div>
                <div className="font-mono text-xs bg-muted/50 p-2 rounded text-primary">
                  {attentionInfo.example}
                </div>

                <div className="text-sm font-medium text-muted-foreground mt-3">{tt("parameters")}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {isHybrid ? (
                    <>
                      {/* Hybrid attention parameters */}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">L_total (layers)</span>
                        <span className="font-mono">{numLayers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">L_full (full attn)</span>
                        <span className="font-mono text-green-600">{numFullAttnLayers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">L_linear (linear attn)</span>
                        <span className="font-mono text-blue-600">{numLinearAttnLayers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">H_kv (full attn kv heads)</span>
                        <span className="font-mono">{numKvHeads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">d (full attn head_dim)</span>
                        <span className="font-mono">{headDim}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">seq (context)</span>
                        <span className="font-mono">{contextLength}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">linear_K_heads</span>
                        <span className="font-mono text-blue-600">{linearKeyHeads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">linear_V_heads</span>
                        <span className="font-mono text-blue-600">{linearValueHeads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">linear_K_dim</span>
                        <span className="font-mono text-blue-600">{linearKeyHeadDim}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">linear_V_dim</span>
                        <span className="font-mono text-blue-600">{linearValueHeadDim}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">linear_conv_kernel</span>
                        <span className="font-mono text-blue-600">{linearConvKernelDim}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">bytes (precision)</span>
                        <span className="font-mono">{bytesPerElement} ({precision})</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Standard attention parameters */}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">L (layers)</span>
                        <span className="font-mono">{numLayers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">H (query heads)</span>
                        <span className="font-mono">{numHeads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">H_kv (kv heads)</span>
                        <span className="font-mono">{numKvHeads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">d (head_dim)</span>
                        <span className="font-mono">{headDim}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">seq (context)</span>
                        <span className="font-mono">{contextLength}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">bytes (precision)</span>
                        <span className="font-mono">{bytesPerElement} ({precision})</span>
                      </div>
                    </>
                  )}
                </div>

                <Separator className="my-3" />

                <div className="text-sm font-medium text-muted-foreground">{tt("calculationResult")}</div>
                {isHybrid ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="bg-muted/50 p-2 rounded">
                        <div className="text-xs text-muted-foreground mb-1">Full Attn KV/Token</div>
                        <div className="font-mono font-semibold">{kvCachePerTokenMB.toFixed(4)} MB</div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                        <div className="text-xs text-muted-foreground mb-1">Linear State (Fixed)</div>
                        <div className="font-mono font-semibold text-blue-600">{linearStateMB.toFixed(4)} MB</div>
                      </div>
                      <div className="bg-primary/10 p-2 rounded">
                        <div className="text-xs text-muted-foreground mb-1">{tt("perSeqKvCache")}</div>
                        <div className="font-mono font-semibold text-primary">{kvCachePerSeqGB.toFixed(4)} GB</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                      <strong>Note:</strong> Linear attention uses a fixed-size state that does not grow with sequence length.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-muted/50 p-2 rounded">
                      <div className="text-xs text-muted-foreground mb-1">{tt("perTokenKvCache")}</div>
                      <div className="font-mono font-semibold">{kvCachePerTokenMB.toFixed(4)} MB</div>
                    </div>
                    <div className="bg-primary/10 p-2 rounded">
                      <div className="text-xs text-muted-foreground mb-1">{tt("perSeqKvCache")}</div>
                      <div className="font-mono font-semibold text-primary">{kvCachePerSeqGB.toFixed(4)} GB</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* All Architecture Formulas */}
          <div>
            <div className="font-semibold mb-4 flex items-center gap-2">
              <span>{tt("allArchitectures")}</span>
            </div>
            <div className="grid gap-4">
              {/* Standard MHA */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary text-sm">MHA (Multi-Head Attention)</span>
                  {numKvHeads === numHeads && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{tt("currentModel")}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">GPT-2, BERT, Original Transformer</div>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  KV = 2 × L × H × d × seq × bytes
                </div>
              </div>

              {/* GQA */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary text-sm">GQA (Grouped Query Attention)</span>
                  {!isHybrid && numKvHeads > 1 && numKvHeads < numHeads && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{tt("currentModel")}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Llama 2/3, Mistral, Qwen, Gemma</div>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  KV = 2 × L × H_kv × d × seq × bytes
                </div>
                <div className="text-xs text-muted-foreground">H_kv = num_key_value_heads (≤ H)</div>
              </div>

              {/* MQA */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary text-sm">MQA (Multi-Query Attention)</span>
                  {numKvHeads === 1 && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{tt("currentModel")}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">PaLM, Falcon (some variants)</div>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  KV = 2 × L × 1 × d × seq × bytes
                </div>
                <div className="text-xs text-muted-foreground">Single KV head shared across all query heads</div>
              </div>

              {/* MLA */}
              <div className="border rounded-lg p-3 space-y-2">
                <span className="font-medium text-primary text-sm">MLA (Multi-Head Latent Attention)</span>
                <div className="text-xs text-muted-foreground">DeepSeek-V2, DeepSeek-V3</div>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  KV = L × d_latent × seq × bytes
                </div>
                <div className="text-xs text-muted-foreground">Compressed latent representation (d_latent ≪ 2×H×d)</div>
              </div>

              {/* Linear / SSM */}
              <div className="border rounded-lg p-3 space-y-2">
                <span className="font-medium text-primary text-sm">{tt("linearModels")}</span>
                <div className="text-xs text-muted-foreground">Mamba, RWKV, State Space Models</div>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  State = L × d_state × bytes (Fixed size)
                </div>
                <div className="text-xs text-muted-foreground">{tt("linearModelsNote")}</div>
              </div>

              {/* Hybrid */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary text-sm">{tt("hybridModels")}</span>
                  {isHybrid && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{tt("currentModel")}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Qwen3.5, Jamba, DeepSeek-V3 (MoE+MLA)</div>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  KV = 2 × L_full × H_kv × d × seq × bytes + L_linear × (K×V_state + conv_buffer) × bytes
                </div>
                <div className="text-xs text-muted-foreground">
                  {tt("hybridModelsNote")} Qwen3.5: 每4层有1个Full Attention层，3个Linear Attention层。Linear Attention使用固定大小的状态，不随序列长度增长。状态包含：K^T×V累加器 (K_heads × K_dim × V_dim) 和卷积缓冲区 (K_heads × K_dim × conv_kernel)。
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
