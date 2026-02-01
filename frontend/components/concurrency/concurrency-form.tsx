"use client";

import React from "react";

import { useState, useEffect } from "react";
import { useMFUStore } from "@/lib/store";
import { calculateMaxConcurrency, calculateMaxConcurrencyWithPA } from "@/lib/concurrency-calculator";
import { useLanguageStore } from "@/lib/i18n";
import type { ConcurrencyInput, Precision } from "@/lib/types";
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
  onCalculate: (result: Awaited<ReturnType<typeof calculateMaxConcurrency>>) => void;
}

export function ConcurrencyForm({ onCalculate }: ConcurrencyFormProps) {
  const { hardware, models } = useMFUStore();
  const { t } = useLanguageStore();
  const [isCalculating, setIsCalculating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState<ConcurrencyInput>({
    hardware_id: "",
    model_id: "",
    gpu_count: 1,
    context_length: 4096,
    attention_precision: "FP16",
    framework_overhead_gb: 2,
    activation_reserve_gb: 5,
  });

  const [frameworkPreset, setFrameworkPreset] = useState<"vLLM" | "TensorRT-LLM" | "TGI" | "自定义">("vLLM");

  const handleFrameworkPresetChange = (preset: string) => {
    setFrameworkPreset(preset as "vLLM" | "TensorRT-LLM" | "TGI" | "自定义");
    const presetValue = FRAMEWORK_PRESETS.find((p) => p.label === preset)?.value ?? 0;
    setFormData({ ...formData, framework_overhead_gb: presetValue });
  };

  const handleFrameworkOverheadChange = (value: string) => {
    const numValue = Number(value);
    setFormData({ ...formData, framework_overhead_gb: isNaN(numValue) ? 0 : numValue });
    if (frameworkPreset !== "自定义") {
      setFrameworkPreset("自定义");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hardware_id || !formData.model_id) {
      toast.error(t("pleaseSelectHardwareModel"));
      return;
    }

    const selectedHardware = hardware.find((h) => h.id === formData.hardware_id);
    const selectedModel = models.find((m) => m.id === formData.model_id);

    if (!selectedHardware || !selectedModel) {
      toast.error(t("invalidSelection"));
      return;
    }

    setIsCalculating(true);

    try {
      // Simulate async calculation
      await new Promise((resolve) => setTimeout(resolve, 300));

      const result = calculateMaxConcurrency(formData, selectedHardware, selectedModel);
      // Calculate with Paged Attention
      const resultWithPA = {
        ...result,
        max_concurrency_with_pa: calculateMaxConcurrencyWithPA(result),
      };
      onCalculate(resultWithPA);

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
                value={formData.model_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, model_id: value })
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
                value={formData.hardware_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, hardware_id: value })
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
                value={String(formData.gpu_count)}
                onValueChange={(value) =>
                  setFormData({ ...formData, gpu_count: Number(value) })
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
              value={formData.context_length}
              onChange={(e) =>
                setFormData({
                  ...formData,
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
                  value={formData.framework_overhead_gb}
                  onChange={(e) => handleFrameworkOverheadChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Activation Reserve */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-muted-foreground" />
              {tt("activationReserve", "Activation Reserve")}
            </Label>
            <Input
              id="activation_reserve"
              type="number"
              min={0}
              step={0.5}
              value={formData.activation_reserve_gb}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  activation_reserve_gb: Number(e.target.value),
                })
              }
            />
          </div>

          <Separator />

          {/* Precision Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">{tt("attentionPrecision", "Attention Precision")}</Label>
            <RadioGroup
              value={formData.attention_precision}
              onValueChange={(value: Precision) =>
                setFormData({ ...formData, attention_precision: value })
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
