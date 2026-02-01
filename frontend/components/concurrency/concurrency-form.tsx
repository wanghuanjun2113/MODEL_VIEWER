"use client";

import React from "react";

import { useState } from "react";
import { useMFUStore } from "@/lib/store";
import { calculateMaxConcurrency } from "@/lib/concurrency-calculator";
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
import { Calculator, Cpu, Layers, Database, Settings } from "lucide-react";

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

  const [formData, setFormData] = useState<ConcurrencyInput>({
    hardware_id: "",
    model_id: "",
    context_length: 4096,
    precision: "FP16",
    framework_overhead_gb: 2,
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
      onCalculate(result);

      toast.success(t("calculationCompleted"));
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
          <Settings className="h-5 w-5 text-primary" />
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
                      {h.name} ({h.memory_size_gb}GB)
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

          {/* Context Length */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4 text-muted-foreground" />
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

          <Separator />

          {/* Framework Overhead */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              {t("frameworkOverhead")}
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("frameworkPreset")}
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
                  {t("overheadGb")}
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

          {/* Precision Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">{t("precision")}</Label>
            <RadioGroup
              value={formData.precision}
              onValueChange={(value: Precision) =>
                setFormData({ ...formData, precision: value })
              }
              className="flex space-x-4"
            >
              {(["FP16", "BF16", "FP32"] as Precision[]).map((precision) => (
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
                {t("calculating")}
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                {t("calculateMaxConcurrency")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
