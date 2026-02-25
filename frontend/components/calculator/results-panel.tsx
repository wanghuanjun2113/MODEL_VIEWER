"use client";

import React, { useState, useEffect } from "react"

import { useMFUStore } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Activity,
  Zap,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Info,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalculationResult } from "@/lib/types";

// Default English translations for SSR
const defaultTranslations: Record<string, string> = {
  mfu: "MFU",
  memoryBandwidthUtilization: "Memory Bandwidth Utilization",
  bottleneck: "Bottleneck",
  computeLimited: "Compute Limited",
  memoryLimited: "Memory Limited",
  balanced: "Balanced",
  actualFlops: "Actual FLOPS",
  theoreticalFlops: "Theoretical FLOPS",
  optimizationSuggestions: "Optimization Suggestions",
  runCalculationToSeeDetails: "Run a calculation to see optimization suggestions.",
  statusGood: "Good",
  statusWarning: "Warning",
  statusLow: "Low",
  mfuFormulas: "MFU Calculation Formulas",
  currentModelFormula: "Current Model Formula",
  formula: "Formula",
  substitution: "Substitution",
  parameters: "Parameters",
  calculationResult: "Calculation Result",
  prefillPhase: "Prefill Phase",
  decodePhase: "Decode Phase",
  timeBreakdown: "Time Breakdown",
  flopsBreakdown: "FLOPs Breakdown",
  totalFlops: "Total FLOPs",
  totalTime: "Total Time",
  peakTflops: "Peak TFLOPS",
  actualTflops: "Actual TFLOPS",
  gpuCount: "GPU Count",
  contextLength: "Context Length",
  generatedLength: "Generated Length",
  batchSize: "Batch Size",
  firstTokenLatency: "First Token Latency",
  tpot: "TPOT",
  attentionPrecision: "Attention Precision",
  ffnPrecision: "FFN Precision",
  bandwidthFormulas: "Memory Bandwidth Utilization Formulas",
  modelSize: "Model Size",
  kvCacheSize: "KV Cache Size",
  memoryPerToken: "Memory Per Token",
  requiredBandwidth: "Required Bandwidth",
  hardwareBandwidth: "Hardware Bandwidth",
  bandwidthUtilization: "Bandwidth Utilization",
};

export function ResultsPanel() {
  const { results } = useMFUStore();
  const { t, isHydrated } = useLanguage();
  const latestResult = results[0];
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

  if (!latestResult) {
    return (
      <div className="space-y-4">
        <PhaseMetricCard
          title="Prefill 阶段"
          icon={<Zap className="h-5 w-5" />}
          mfu="--"
          bandwidth="--"
          description="首Token生成阶段"
        />
        <PhaseMetricCard
          title="Decode 阶段"
          icon={<Activity className="h-5 w-5" />}
          mfu="--"
          bandwidth="--"
          description="后续Token生成阶段"
        />
        <SuggestionsCard tt={tt} suggestions={[]} />
      </div>
    );
  }

  // Phase-specific status
  const prefillMfuStatus = getMFUStatus(latestResult.prefill_mfu);
  const prefillBandwidthStatus = getBandwidthStatus(latestResult.prefill_bandwidth_utilization);
  const decodeMfuStatus = getMFUStatus(latestResult.decode_mfu);
  const decodeBandwidthStatus = getBandwidthStatus(latestResult.decode_bandwidth_utilization);

  return (
    <div className="space-y-4">
      {/* Prefill 阶段 */}
      <PhaseMetricCard
        title="Prefill 阶段"
        icon={<Zap className="h-5 w-5" />}
        mfu={latestResult.prefill_mfu.toFixed(2)}
        bandwidth={latestResult.prefill_bandwidth_utilization.toFixed(2)}
        description="首Token生成阶段 (Context Processing)"
        mfuStatus={prefillMfuStatus}
        bandwidthStatus={prefillBandwidthStatus}
        infoDialog={<MfuFormulaDialog result={latestResult} tt={tt} phase="prefill" />}
        bandwidthInfoDialog={<BandwidthFormulaDialog result={latestResult} tt={tt} phase="prefill" />}
      />

      {/* Decode 阶段 */}
      <PhaseMetricCard
        title="Decode 阶段"
        icon={<Activity className="h-5 w-5" />}
        mfu={latestResult.decode_mfu.toFixed(2)}
        bandwidth={latestResult.decode_bandwidth_utilization.toFixed(2)}
        description="后续Token生成阶段 (Token Generation)"
        mfuStatus={decodeMfuStatus}
        bandwidthStatus={decodeBandwidthStatus}
        infoDialog={<MfuFormulaDialog result={latestResult} tt={tt} phase="decode" />}
        bandwidthInfoDialog={<BandwidthFormulaDialog result={latestResult} tt={tt} phase="decode" />}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-primary" />
            {tt("bottleneck")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{tt("bottleneck")}</span>
            <Badge
              variant={
                latestResult.bottleneck_type === "compute"
                  ? "default"
                  : latestResult.bottleneck_type === "memory"
                  ? "secondary"
                  : "outline"
              }
            >
              {latestResult.bottleneck_type === "compute"
                ? tt("computeLimited")
                : latestResult.bottleneck_type === "memory"
                ? tt("memoryLimited")
                : tt("balanced")}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{tt("actualFlops")}</span>
            <span className="font-mono text-sm">
              {latestResult.actual_flops.toFixed(2)} TFLOPS
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{tt("theoreticalFlops")}</span>
            <span className="font-mono text-sm">
              {latestResult.theoretical_flops.toFixed(2)} TFLOPS
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">KV Cache</span>
            <span className="font-mono text-sm">
              {latestResult.kv_cache_size_gb.toFixed(2)} GB
            </span>
          </div>
        </CardContent>
      </Card>

      <SuggestionsCard tt={tt} suggestions={latestResult.optimization_suggestions} />
    </div>
  );
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  unit: string;
  description: string;
  progress?: number;
  status?: "good" | "warning" | "critical";
  infoDialog?: React.ReactNode;
}

function MetricCard({
  title,
  icon,
  value,
  unit,
  description,
  progress,
  status,
  infoDialog,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-sm font-medium">{title}</span>
            {infoDialog}
          </div>
          {status && (
            <StatusIndicator status={status} />
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight">{value}</span>
            <span className="text-lg text-muted-foreground">{unit}</span>
          </div>
          {progress !== undefined && (
            <Progress
              value={progress}
              className={cn(
                "h-2",
                status === "good" && "[&>div]:bg-success",
                status === "warning" && "[&>div]:bg-warning",
                status === "critical" && "[&>div]:bg-destructive"
              )}
            />
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Phase Metric Card - displays MFU and Bandwidth for a phase
interface PhaseMetricCardProps {
  title: string;
  icon: React.ReactNode;
  mfu: string;
  bandwidth: string;
  description: string;
  mfuStatus?: "good" | "warning" | "critical";
  bandwidthStatus?: "good" | "warning" | "critical";
  infoDialog?: React.ReactNode;
  bandwidthInfoDialog?: React.ReactNode;
}

function PhaseMetricCard({
  title,
  icon,
  mfu,
  bandwidth,
  description,
  mfuStatus,
  bandwidthStatus,
  infoDialog,
  bandwidthInfoDialog,
}: PhaseMetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{description}</p>

        <div className="space-y-4">
          {/* MFU 指标 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">MFU</span>
                {infoDialog}
              </div>
              {mfuStatus && <StatusIndicator status={mfuStatus} />}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">{mfu}</span>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <Separator />

          {/* 显存带宽利用率 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">显存带宽利用率</span>
                {bandwidthInfoDialog}
              </div>
              {bandwidthStatus && <StatusIndicator status={bandwidthStatus} />}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">{bandwidth}</span>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusIndicator({ status }: { status: "good" | "warning" | "critical" }) {
  const { t, isHydrated } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tt = mounted && isHydrated ? t : ((key: string) => defaultTranslations[key] || key);

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "good" && "bg-success/20 text-success",
        status === "warning" && "bg-warning/20 text-warning",
        status === "critical" && "bg-destructive/20 text-destructive"
      )}
    >
      {status === "good" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      {tt("statusGood")}
    </div>
  );
}

function SuggestionsCard({ suggestions, tt }: { suggestions: string[]; tt: (key: string) => string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="h-4 w-4 text-warning" />
          {tt("optimizationSuggestions")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tt("runCalculationToSeeDetails")}
          </p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((suggestionKey, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {tt(suggestionKey)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// MFU Formula Dialog Component
interface MfuFormulaDialogProps {
  result: CalculationResult;
  tt: (key: string) => string;
  phase?: "prefill" | "decode";
}

function MfuFormulaDialog({ result, tt }: MfuFormulaDialogProps) {
  const { model, hardware, input } = result;

  // Calculate time values
  const prefillTime = input.first_token_latency_ms / 1000;
  const decodeTime = (input.tpot_ms * input.generated_length) / 1000;
  const totalTime = prefillTime + decodeTime;

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
            <Cpu className="h-5 w-5 text-primary" />
            {tt("mfuFormulas")}
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
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{hardware.name}</span>
              </div>

              <div className="bg-background/80 p-3 rounded border space-y-3">
                {/* Main MFU Formula */}
                <div className="text-sm font-medium text-muted-foreground">{tt("formula")}</div>
                <div className="font-mono text-sm bg-muted/50 p-2 rounded">
                  MFU = (Actual TFLOPS / Peak TFLOPS) × 100%
                </div>

                <div className="text-sm font-medium text-muted-foreground mt-3">{tt("substitution")}</div>
                <div className="font-mono text-xs bg-muted/50 p-2 rounded text-primary">
                  = ({result.actual_flops.toFixed(2)} / {result.actual_flops && result.mfu ? (result.actual_flops * 100 / result.mfu).toFixed(2) : "N/A"}) × 100%
                </div>

                <Separator className="my-3" />

                {/* Parameters */}
                <div className="text-sm font-medium text-muted-foreground">{tt("parameters")}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">L (layers)</span>
                    <span className="font-mono">{model.num_layers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">d (hidden_size)</span>
                    <span className="font-mono">{model.hidden_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">H (attention heads)</span>
                    <span className="font-mono">{model.num_attention_heads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">H_kv (kv heads)</span>
                    <span className="font-mono">{model.num_key_value_heads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">V (vocab_size)</span>
                    <span className="font-mono">{model.vocab_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">intermediate_size</span>
                    <span className="font-mono">{model.intermediate_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("contextLength")}</span>
                    <span className="font-mono">{input.context_length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("generatedLength")}</span>
                    <span className="font-mono">{input.generated_length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("batchSize")}</span>
                    <span className="font-mono">{input.batch_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("gpuCount")}</span>
                    <span className="font-mono">{input.gpu_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("attentionPrecision")}</span>
                    <span className="font-mono">{input.attention_precision}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("ffnPrecision")}</span>
                    <span className="font-mono">{input.ffn_precision}</span>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Time Breakdown */}
                <div className="text-sm font-medium text-muted-foreground">{tt("timeBreakdown")}</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">{tt("prefillPhase")}</div>
                    <div className="font-mono font-semibold">{prefillTime.toFixed(4)} s</div>
                    <div className="text-xs text-muted-foreground">{tt("firstTokenLatency")}: {input.first_token_latency_ms} ms</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">{tt("decodePhase")}</div>
                    <div className="font-mono font-semibold">{decodeTime.toFixed(4)} s</div>
                    <div className="text-xs text-muted-foreground">{tt("tpot")}: {input.tpot_ms} ms × {input.generated_length}</div>
                  </div>
                  <div className="bg-primary/10 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">{tt("totalTime")}</div>
                    <div className="font-mono font-semibold text-primary">{totalTime.toFixed(4)} s</div>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* FLOPs Breakdown */}
                <div className="text-sm font-medium text-muted-foreground">{tt("flopsBreakdown")}</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">{tt("prefillPhase")}</div>
                    <div className="font-mono font-semibold">{result.prefill_flops.toFixed(2)} TFLOPs</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">{tt("decodePhase")}</div>
                    <div className="font-mono font-semibold">{result.decode_flops.toFixed(2)} TFLOPs</div>
                  </div>
                  <div className="bg-primary/10 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">{tt("totalFlops")}</div>
                    <div className="font-mono font-semibold text-primary">{result.theoretical_flops.toFixed(2)} TFLOPs</div>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Calculation Result */}
                <div className="text-sm font-medium text-muted-foreground">{tt("calculationResult")}</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">{tt("peakTflops")}</div>
                    <div className="font-mono font-semibold">{(result.actual_flops && result.mfu ? result.actual_flops * 100 / result.mfu : 0).toFixed(2)} TFLOPS</div>
                    <div className="text-xs text-muted-foreground">{hardware.name} × {input.gpu_count}</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">{tt("actualTflops")}</div>
                    <div className="font-mono font-semibold">{result.actual_flops.toFixed(2)} TFLOPS</div>
                    <div className="text-xs text-muted-foreground">{result.theoretical_flops.toFixed(2)} TFLOPs / {totalTime.toFixed(4)} s</div>
                  </div>
                  <div className="bg-primary/10 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">MFU</div>
                    <div className="font-mono font-semibold text-primary text-lg">{result.mfu.toFixed(2)}%</div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                  <strong>Note:</strong> MFU (Model FLOPs Utilization) measures how efficiently the hardware is being used for model computations. Higher values indicate better hardware utilization.
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* All Formulas Reference */}
          <div>
            <div className="font-semibold mb-4 flex items-center gap-2">
              <span>MFU Calculation Reference</span>
            </div>
            <div className="grid gap-4">
              <div className="border rounded-lg p-3 space-y-2">
                <span className="font-medium text-primary text-sm">Actual TFLOPS</span>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  Actual TFLOPS = Total FLOPs / Total Time
                </div>
                <div className="text-xs text-muted-foreground">
                  Total FLOPs = Prefill FLOPs + Decode FLOPs
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <span className="font-medium text-primary text-sm">Prefill FLOPs</span>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  = L × (Attn FLOPs + FFN FLOPs) + Embedding FLOPs
                </div>
                <div className="text-xs text-muted-foreground">
                  Attention: Q, K, V projections + attention scores + output projection
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <span className="font-medium text-primary text-sm">Decode FLOPs (per token)</span>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  = L × (Attn FLOPs + FFN FLOPs) + LM Head FLOPs
                </div>
                <div className="text-xs text-muted-foreground">
                  Calculated for each generated token with growing KV cache
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <span className="font-medium text-primary text-sm">Peak TFLOPS</span>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  Peak TFLOPS = Hardware Peak × GPU Count × Precision Scale
                </div>
                <div className="text-xs text-muted-foreground">
                  Based on hardware specifications and precision (INT8 has 2x throughput)
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Bandwidth Formula Dialog Component
interface BandwidthFormulaDialogProps {
  result: CalculationResult;
  tt: (key: string) => string;
  phase?: "prefill" | "decode";
}

function BandwidthFormulaDialog({ result, tt }: BandwidthFormulaDialogProps) {
  const { model, hardware, input } = result;

  // Calculate memory values based on the formula in calculator.ts
  const getBytesPerElement = (precision: string): number => {
    switch (precision) {
      case "FP16":
      case "BF16":
        return 2;
      case "INT8":
        return 1;
      default:
        return 2;
    }
  };

  // Determine the precision used for model size calculation
  const modelPrecision = input.attention_precision === "INT8" || input.ffn_precision === "INT8"
    ? "INT8"
    : input.attention_precision === "BF16" || input.ffn_precision === "BF16"
      ? "BF16"
      : "FP16";

  const bytesPerElement = getBytesPerElement(modelPrecision);

  // Model size in GB
  const modelSizeGB = (model.params_billions * 1e9 * bytesPerElement) / (1024 * 1024 * 1024);

  // KV Cache size in GB
  const totalContextLength = input.context_length + input.generated_length;
  const kvCacheBytesPerElement = getBytesPerElement(input.attention_precision);
  const kvCacheSizeGB = (2 * model.num_layers * model.num_key_value_heads * model.head_dim * totalContextLength * input.batch_size * kvCacheBytesPerElement) / (1024 * 1024 * 1024);

  // Memory read per token (GB)
  const memoryReadPerToken = modelSizeGB + kvCacheSizeGB / input.generated_length;

  // Required bandwidth (GB/s)
  const tpotSeconds = input.tpot_ms / 1000;
  const requiredBandwidth = memoryReadPerToken / tpotSeconds;

  // Hardware bandwidth (GB/s)
  const hardwareBandwidth = hardware.memory_bandwidth_tbps * input.gpu_count * 1000;

  // Bandwidth utilization
  const bandwidthUtilization = (requiredBandwidth / hardwareBandwidth) * 100;

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
            <HardDrive className="h-5 w-5 text-primary" />
            {tt("bandwidthFormulas")}
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
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{hardware.name}</span>
              </div>

              <div className="bg-background/80 p-3 rounded border space-y-3">
                {/* Main Bandwidth Utilization Formula */}
                <div className="text-sm font-medium text-muted-foreground">{tt("formula")}</div>
                <div className="font-mono text-sm bg-muted/50 p-2 rounded">
                  Bandwidth Utilization = (Required Bandwidth / Hardware Bandwidth) × 100%
                </div>

                <div className="text-sm font-medium text-muted-foreground mt-3">{tt("substitution")}</div>
                <div className="font-mono text-xs bg-muted/50 p-2 rounded text-primary">
                  = ({requiredBandwidth.toFixed(2)} GB/s / {hardwareBandwidth.toFixed(2)} GB/s) × 100%
                </div>

                <Separator className="my-3" />

                {/* Parameters */}
                <div className="text-sm font-medium text-muted-foreground">{tt("parameters")}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("modelSize")}</span>
                    <span className="font-mono">{modelSizeGB.toFixed(2)} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{model.params_billions}B params</span>
                    <span className="font-mono">{bytesPerElement} bytes/param</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("kvCacheSize")}</span>
                    <span className="font-mono">{kvCacheSizeGB.toFixed(2)} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Context</span>
                    <span className="font-mono">{totalContextLength} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("generatedLength")}</span>
                    <span className="font-mono">{input.generated_length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("batchSize")}</span>
                    <span className="font-mono">{input.batch_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("tpot")}</span>
                    <span className="font-mono">{input.tpot_ms} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tt("gpuCount")}</span>
                    <span className="font-mono">{input.gpu_count}</span>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Calculation Steps */}
                <div className="text-sm font-medium text-muted-foreground">Calculation Steps</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">{tt("memoryPerToken")}</div>
                    <div className="font-mono font-semibold">{memoryReadPerToken.toFixed(4)} GB</div>
                    <div className="text-xs text-muted-foreground">= Model + KV/GenLen</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">{tt("requiredBandwidth")}</div>
                    <div className="font-mono font-semibold">{requiredBandwidth.toFixed(2)} GB/s</div>
                    <div className="text-xs text-muted-foreground">= Mem/TPOT</div>
                  </div>
                  <div className="bg-primary/10 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">{tt("bandwidthUtilization")}</div>
                    <div className="font-mono font-semibold text-primary text-lg">{bandwidthUtilization.toFixed(2)}%</div>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Hardware Info */}
                <div className="text-sm font-medium text-muted-foreground">{tt("hardwareBandwidth")}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">Per GPU</div>
                    <div className="font-mono font-semibold">{(hardware.memory_bandwidth_tbps * 1000).toFixed(0)} GB/s</div>
                    <div className="text-xs text-muted-foreground">{hardware.name}</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-xs text-muted-foreground mb-1">Total ({input.gpu_count} GPUs)</div>
                    <div className="font-mono font-semibold">{hardwareBandwidth.toFixed(0)} GB/s</div>
                    <div className="text-xs text-muted-foreground">{hardware.memory_bandwidth_tbps} TB/s × {input.gpu_count}</div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                  <strong>Note:</strong> Memory bandwidth utilization measures how much of the hardware's memory bandwidth is being used during inference. High utilization indicates memory-bound workloads.
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* All Formulas Reference */}
          <div>
            <div className="font-semibold mb-4 flex items-center gap-2">
              <span>Bandwidth Calculation Reference</span>
            </div>
            <div className="grid gap-4">
              <div className="border rounded-lg p-3 space-y-2">
                <span className="font-medium text-primary text-sm">{tt("memoryPerToken")}</span>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  Memory Per Token = Model Size + (KV Cache Size / Generated Length)
                </div>
                <div className="text-xs text-muted-foreground">
                  During decode, each token requires reading model weights and amortized KV cache
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <span className="font-medium text-primary text-sm">{tt("requiredBandwidth")}</span>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  Required Bandwidth = Memory Per Token / TPOT (seconds)
                </div>
                <div className="text-xs text-muted-foreground">
                  Bandwidth needed to sustain the given token generation speed
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <span className="font-medium text-primary text-sm">{tt("modelSize")}</span>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  Model Size = Parameters × Bytes Per Element
                </div>
                <div className="text-xs text-muted-foreground">
                  FP16/BF16 = 2 bytes, INT8 = 1 byte per parameter
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <span className="font-medium text-primary text-sm">{tt("kvCacheSize")}</span>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs">
                  KV Cache = 2 × L × H_kv × d_head × Context × Batch × Bytes
                </div>
                <div className="text-xs text-muted-foreground">
                  L = layers, H_kv = KV heads, d_head = head dimension
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getMFUStatus(mfu: number): "good" | "warning" | "critical" {
  if (mfu >= 40) return "good";
  if (mfu >= 20) return "warning";
  return "critical";
}

function getBandwidthStatus(utilization: number): "good" | "warning" | "critical" {
  if (utilization <= 70) return "good";
  if (utilization <= 90) return "warning";
  return "critical";
}
