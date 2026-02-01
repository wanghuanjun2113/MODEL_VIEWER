"use client";

import React from "react"

import { useState } from "react";
import { useMFUStore } from "@/lib/store";
import { calculateMFU } from "@/lib/calculator";
import { apiClient } from "@/lib/api";
import { useLanguageStore } from "@/lib/i18n";
import type { CalculationInput, Precision } from "@/lib/types";
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
import { Calculator, Cpu, Timer, Hash, Layers } from "lucide-react";

interface CalculatorFormProps {
  onCalculate: () => void;
}

export function CalculatorForm({ onCalculate }: CalculatorFormProps) {
  const { hardware, models, addResult, useApi } = useMFUStore();
  const { t } = useLanguageStore();
  const [isCalculating, setIsCalculating] = useState(false);

  const [formData, setFormData] = useState<CalculationInput>({
    hardware_id: "",
    model_id: "",
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
      if (useApi) {
        // Use API for calculation
        const response = await apiClient.calculateMFU({
          hardware_id: formData.hardware_id,
          model_id: formData.model_id,
          precision: formData.precision,
          attention_precision: formData.attention_precision,
          ffn_precision: formData.ffn_precision,
          first_token_latency_ms: formData.first_token_latency_ms,
          tpot_ms: formData.tpot_ms,
          context_length: formData.context_length,
          generated_length: formData.generated_length,
          batch_size: formData.batch_size,
        });

        if (!response.success || !response.result) {
          throw new Error(response.error || t("calculationFailed"));
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

      toast.success(t("calculationCompleted"));
      onCalculate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("calculationFailed"));
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          {t("inputParameters")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hardware & Model Selection - Horizontal Layout */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hardware" className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                {t("hardware")}
              </Label>
              <Select
                value={formData.hardware_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, hardware_id: value })
                }
              >
                <SelectTrigger id="hardware">
                  <SelectValue placeholder={t("selectHardware")} />
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

            <div className="space-y-2">
              <Label htmlFor="model" className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                {t("model")}
              </Label>
              <Select
                value={formData.model_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, model_id: value })
                }
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder={t("selectModel")} />
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
          </div>

          <Separator />

          {/* Latency Information */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Timer className="h-4 w-4 text-muted-foreground" />
              {t("latencyInformation")}
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_token" className="text-xs text-muted-foreground">
                  {t("firstTokenLatency")}
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
                  {t("tpot")}
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
              {t("contextInformation")}
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="context_length" className="text-xs text-muted-foreground">
                  {t("contextLength")}
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
                  {t("generatedLength")}
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
                {t("batchSize")}
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
            <Label className="text-sm font-medium">{t("precision")}</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("attentionPrecision")}
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
                  {t("ffnPrecision")}
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
                {t("calculating")}
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                {t("calculateMfu")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
