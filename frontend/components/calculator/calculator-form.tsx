"use client";

import React from "react"

import { useState, useEffect } from "react";
import { useMFUStore } from "@/lib/store";
import { calculateMFU } from "@/lib/calculator";
import { apiClient } from "@/lib/api";
import { useLanguageStore } from "@/lib/i18n";
import type { CalculationInput, Precision, GPU_COUNT_OPTIONS } from "@/lib/types";
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
import { Calculator, Cpu, Timer, Hash, Layers, Grid3X3 } from "lucide-react";

interface CalculatorFormProps {
  onCalculate: () => void;
}

export function CalculatorForm({ onCalculate }: CalculatorFormProps) {
  const { hardware, models, addResult, useApi } = useMFUStore();
  const { t } = useLanguageStore();
  const [isCalculating, setIsCalculating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tt = (key: string, fallback: string) => mounted ? t(key as any) : fallback;

  const [formData, setFormData] = useState<CalculationInput>({
    hardware_id: "",
    model_id: "",
    gpu_count: 1,
    precision: "FP16",
    attention_precision: "FP16",
    ffn_precision: "FP16",
    first_token_latency_ms: 100,
    tpot_ms: 20,
    context_length: 2048,
    generated_length: 256,
    batch_size: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hardware_id || !formData.model_id) {
      toast.error(tt("pleaseSelectHardwareModel", "Please select hardware and model"));
      return;
    }

    const selectedHardware = hardware.find((h) => h.id === formData.hardware_id);
    const selectedModel = models.find((m) => m.id === formData.model_id);

    if (!selectedHardware || !selectedModel) {
      toast.error(tt("invalidSelection", "Invalid hardware or model selection"));
      return;
    }

    setIsCalculating(true);

    // Convert frontend types to API types
    const toApiPrecision = (p: string) => p.toLowerCase() as "fp16" | "bf16" | "fp32";

    try {
      if (useApi) {
        // Use API for calculation
        const response = await apiClient.calculateMFU({
          hardware_id: Number(formData.hardware_id),
          model_id: Number(formData.model_id),
          gpu_count: formData.gpu_count,
          precision: toApiPrecision(formData.precision),
          attention_precision: toApiPrecision(formData.attention_precision),
          ffn_precision: toApiPrecision(formData.ffn_precision),
          first_token_latency_ms: formData.first_token_latency_ms,
          tpot_ms: formData.tpot_ms,
          context_length: formData.context_length,
          generated_length: formData.generated_length,
          batch_size: formData.batch_size,
        });

        if (!response.success || !response.result) {
          throw new Error(response.error || tt("calculationFailed", "Calculation failed"));
        }

        // Convert API response to frontend format
        const result = {
          id: crypto.randomUUID(),
          input: formData,
          hardware: selectedHardware,
          model: selectedModel,
          mfu: response.result.mfu,
          memory_bandwidth_utilization: response.result.memory_bandwidth_utilization,
          theoretical_flops: response.result.theoretical_flops,
          actual_flops: response.result.actual_flops,
          bottleneck_type: response.result.bottleneck_type,
          prefill_flops: response.result.prefill_flops,
          decode_flops: response.result.decode_flops,
          kv_cache_size_gb: response.result.kv_cache_bytes / (1024 * 1024 * 1024),
          optimization_suggestions: response.suggestions.map((s) => s.suggestion),
          timestamp: new Date().toISOString(),
        };

        addResult(result);
      } else {
        // Use local calculation
        await new Promise((resolve) => setTimeout(resolve, 500));
        const result = calculateMFU(formData, selectedHardware, selectedModel);
        addResult(result);
      }

      toast.success(tt("calculationCompleted", "Calculation completed"));
      onCalculate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tt("calculationFailed", "Calculation failed"));
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
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
                      {h.name}
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

          {/* Latency Information */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Timer className="h-4 w-4 text-muted-foreground" />
              {tt("latencyInformation", "Latency Information")}
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_token" className="text-xs text-muted-foreground">
                  {tt("firstTokenLatency", "First Token Latency (ms)")}
                </Label>
                <Input
                  id="first_token"
                  type="number"
                  min={1}
                  value={formData.first_token_latency_ms}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      first_token_latency_ms: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpot" className="text-xs text-muted-foreground">
                  {tt("tpot", "TPOT (ms)")}
                </Label>
                <Input
                  id="tpot"
                  type="number"
                  min={1}
                  value={formData.tpot_ms}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tpot_ms: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Context Information */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Hash className="h-4 w-4 text-muted-foreground" />
              {tt("contextInformation", "Context Information")}
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="context_length" className="text-xs text-muted-foreground">
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
              <div className="space-y-2">
                <Label htmlFor="generated_length" className="text-xs text-muted-foreground">
                  {tt("generatedLength", "Generated Length (tokens)")}
                </Label>
                <Input
                  id="generated_length"
                  type="number"
                  min={1}
                  value={formData.generated_length}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      generated_length: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_size" className="text-xs text-muted-foreground">
                {tt("batchSize", "Batch Size / Concurrency")}
              </Label>
              <Input
                id="batch_size"
                type="number"
                min={1}
                value={formData.batch_size}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    batch_size: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Precision Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">{tt("precision", "Precision")}</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {tt("attentionPrecision", "Attention Precision")}
                </Label>
                <Select
                  value={formData.attention_precision}
                  onValueChange={(value: Precision) =>
                    setFormData({ ...formData, attention_precision: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["FP16", "BF16", "INT8"] as Precision[]).map((precision) => (
                      <SelectItem key={precision} value={precision}>
                        {precision}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {tt("ffnPrecision", "FFN Precision")}
                </Label>
                <Select
                  value={formData.ffn_precision}
                  onValueChange={(value: Precision) =>
                    setFormData({ ...formData, ffn_precision: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["FP16", "BF16", "INT8"] as Precision[]).map((precision) => (
                      <SelectItem key={precision} value={precision}>
                        {precision}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                {tt("calculateMfu", "Calculate MFU")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
