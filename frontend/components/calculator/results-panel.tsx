"use client";

import React, { useState, useEffect } from "react"

import { useMFUStore } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Zap,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const tt = mounted && isHydrated ? t : ((key: string) => defaultTranslations[key] || key);

  if (!latestResult) {
    return (
      <div className="space-y-4">
        <MetricCard
          title={tt("mfu")}
          icon={<Activity className="h-5 w-5" />}
          value="--"
          unit="%"
          description={tt("mfu")}
        />
        <MetricCard
          title={tt("memoryBandwidthUtilization")}
          icon={<HardDrive className="h-5 w-5" />}
          value="--"
          unit="%"
          description={tt("memoryBandwidthUtilization")}
        />
        <SuggestionsCard tt={tt} suggestions={[]} />
      </div>
    );
  }

  const mfuStatus = getMFUStatus(latestResult.mfu);
  const bandwidthStatus = getBandwidthStatus(latestResult.memory_bandwidth_utilization);

  return (
    <div className="space-y-4">
      <MetricCard
        title={tt("mfu")}
        icon={<Activity className="h-5 w-5" />}
        value={latestResult.mfu.toFixed(2)}
        unit="%"
        description={tt("mfu")}
        progress={latestResult.mfu}
        status={mfuStatus}
      />
      <MetricCard
        title={tt("memoryBandwidthUtilization")}
        icon={<HardDrive className="h-5 w-5" />}
        value={latestResult.memory_bandwidth_utilization.toFixed(2)}
        unit="%"
        description={tt("memoryBandwidthUtilization")}
        progress={latestResult.memory_bandwidth_utilization}
        status={bandwidthStatus}
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
}

function MetricCard({
  title,
  icon,
  value,
  unit,
  description,
  progress,
  status,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-sm font-medium">{title}</span>
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
