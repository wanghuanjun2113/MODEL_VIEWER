"use client";

import React from "react";

import { useState, useEffect } from "react";
import { useMFUStore } from "@/lib/store";
import { calculateMaxConcurrency, calculateMaxConcurrencyWithPA } from "@/lib/concurrency-calculator";
import { useLanguageStore } from "@/lib/i18n";
import { generateUUID } from "@/lib/utils";
import type { Precision, ConcurrencyResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calculator, Cpu, Layers, Database, Settings, Grid3X3, Zap } from "lucide-react";

// Framework overhead presets
const FRAMEWORK_PRESETS = [
  { label: "vLLM", value: 2 },
  { label: "TensorRT-LLM", value: 1 },
  { label: "TGI", value: 1.5 },
  { label: "自定义", value: 0 },
] as const;

interface ConcurrencyFormProps {
  onCalculate: () => void;
}

export function ConcurrencyForm({ onCalculate }: ConcurrencyFormProps) {
  const { hardware, models, concurrencyInput, setConcurrencyInput, addConcurrencyResult } = useMFUStore();
  const { t } = useLanguageStore();
  const [isCalculating, setIsCalculating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [frameworkPreset, setFrameworkPreset] = useState<"vLLM" | "TensorRT-LLM" | "TGI" | "自定义">("vLLM");

  const handleFrameworkPresetChange = (preset: string) => {
    setFrameworkPreset(preset as "vLLM" | "TensorRT-LLM" | "TGI" | "自定义");
    const presetValue = FRAMEWORK_PRESETS.find((p) => p.label === preset)?.value ?? 0;
    setConcurrencyInput({ ...concurrencyInput, framework_overhead_gb: presetValue });
  };

  const handleFrameworkOverheadChange = (value: string) => {
    const numValue = Number(value);
    setConcurrencyInput({ ...concurrencyInput, framework_overhead_gb: isNaN(numValue) ? 0 : numValue });
    if (frameworkPreset !== "自定义") {
      setFrameworkPreset("自定义");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!concurrencyInput.hardware_id || !concurrencyInput.model_id) {
      toast.error(t("pleaseSelectHardwareModel"));
      return;
    }

    const selectedHardware = hardware.find((h) => h.id === concurrencyInput.hardware_id);
    const selectedModel = models.find((m) => m.id === concurrencyInput.model_id);

    if (!selectedHardware || !selectedModel) {
      toast.error(t("invalidSelection"));
      return;
    }

    setIsCalculating(true);

    try {
      // Simulate async calculation
      await new Promise((resolve) => setTimeout(resolve, 300));

      const result = calculateMaxConcurrency(concurrencyInput, selectedHardware, selectedModel);
      // Calculate with Paged Attention
      const fullResult: ConcurrencyResult = {
        id: generateUUID(),
        input: concurrencyInput,
        hardware: selectedHardware,
        model: selectedModel,
        gpu_count: concurrencyInput.gpu_count,
        max_concurrency_without_pa: result.max_concurrency_without_pa,
        max_concurrency_with_pa: calculateMaxConcurrencyWithPA(result),
        memory_breakdown: result.memory_breakdown,
        hardware_memory_gb: result.hardware_memory_gb,
        available_memory_gb: result.available_memory_gb,
        per_request_kv_cache_gb: result.per_request_kv_cache_gb,
        per_request_activation_gb: result.per_request_activation_gb,
        timestamp: new Date().toISOString(),
      };
      addConcurrencyResult(fullResult);
      onCalculate();

      toast.success(t("calculationCompleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("calculationFailed"));
    } finally {
      setIsCalculating(false);
    }
  };

  const tt = (key: string, fallback: string) => mounted ? t(key as any) : fallback;

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5 text-primary" />
          {tt("inputParameters", "Input Parameters")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Model, Hardware & GPU Selection - Horizontal Layout */}
          <div className="grid grid-cols-3 gap-4">
            {/* Model - First */}
            <div className="space-y-2">
              <Label htmlFor="model" className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                {tt("model", "Model")}
              </Label>
              <Select
                value={concurrencyInput.model_id}
                onValueChange={(value) =>
                  setConcurrencyInput({ ...concurrencyInput, model_id: value })
                }
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder={tt("selectModel", "Select model")} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.params_billions}B)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hardware - Second */}
            <div className="space-y-2">
              <Label htmlFor="hardware" className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                {tt("hardware", "Hardware")}
              </Label>
              <Select
                value={concurrencyInput.hardware_id}
                onValueChange={(value) =>
                  setConcurrencyInput({ ...concurrencyInput, hardware_id: value })
                }
              >
                <SelectTrigger id="hardware">
                  <SelectValue placeholder={tt("selectHardware", "Select hardware")} />
                </SelectTrigger>
                <SelectContent>
                  {hardware.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} ({h.memory_size_gb}GB)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* GPU Count - Third */}
            <div className="space-y-2">
              <Label htmlFor="gpu_count" className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                {tt("gpuCount", "GPU Count")}
              </Label>
              <Select
                value={String(concurrencyInput.gpu_count)}
                onValueChange={(value) =>
                  setConcurrencyInput({ ...concurrencyInput, gpu_count: Number(value) })
                }
              >
                <SelectTrigger id="gpu_count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {([1, 2, 4, 8, 16, 32] as const).map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Context Length */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4 text-muted-foreground" />
              {tt("contextLength", "Context Length (tokens)")}
            </Label>
            <Input
              id="context_length"
              type="number"
              min={1}
              value={concurrencyInput.context_length}
              onChange={(e) =>
                setConcurrencyInput({
                  ...concurrencyInput,
                  context_length: Number(e.target.value),
                })
              }
            />
          </div>

          <Separator />

          {/* Framework Overhead */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              {tt("frameworkOverhead", "Framework Overhead")}
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {tt("frameworkPreset", "Framework Preset")}
                </Label>
                <Select
                  value={frameworkPreset}
                  onValueChange={handleFrameworkPresetChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FRAMEWORK_PRESETS.map((preset) => (
                      <SelectItem key={preset.label} value={preset.label}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {tt("overheadGb", "Overhead (GB)")}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={concurrencyInput.framework_overhead_gb}
                  onChange={(e) => handleFrameworkOverheadChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* GPU Utilization */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-muted-foreground" />
              {tt("gpuUtilization", "GPU Utilization")}
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="gpu_utilization"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={concurrencyInput.gpu_utilization ?? 0.9}
                onChange={(e) =>
                  setConcurrencyInput({
                    ...concurrencyInput,
                    gpu_utilization: Math.min(1, Math.max(0, Number(e.target.value))),
                  })
                }
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12">
                {((concurrencyInput.gpu_utilization ?? 0.9) * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              激活预留 = (1 - GPU利用率) × 总显存
            </p>
          </div>

          <Separator />

          {/* Precision Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">{tt("attentionPrecision", "Attention Precision")}</Label>
            <RadioGroup
              value={concurrencyInput.attention_precision}
              onValueChange={(value: Precision) =>
                setConcurrencyInput({ ...concurrencyInput, attention_precision: value })
              }
              className="flex space-x-4"
            >
              {(["FP16", "BF16", "INT8"] as Precision[]).map((precision) => (
                <div key={precision} className="flex items-center space-x-2">
                  <RadioGroupItem value={precision} id={`precision-${precision}`} />
                  <Label htmlFor={`precision-${precision}`}>{precision}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isCalculating}
          >
            {isCalculating ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {tt("calculating", "Calculating...")}
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                {tt("calculateMaxConcurrency", "Calculate Max Concurrency")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
