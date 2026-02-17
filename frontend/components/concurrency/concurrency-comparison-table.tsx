"use client";

import { useMFUStore } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, GitCompare, Download } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// Default English translations for SSR
const defaultTranslations: Record<string, string> = {
  comparison: "Comparison",
  export: "Export",
  clearAll: "Clear All",
  hardware: "Hardware",
  model: "Model",
  gpuCount: "GPU Count",
  maxConcurrency: "Max Concurrency",
  withoutPA: "Without PA",
  withPA: "With PA",
  contextLength: "Context",
  precision: "Precision",
};

export function ConcurrencyComparisonTable() {
  const { concurrencyResults, deleteConcurrencyResult, clearConcurrencyResults } = useMFUStore();
  const { t, isHydrated } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tt = ((key: string) => {
    if (mounted && isHydrated) {
      return t(key as any);
    }
    return defaultTranslations[key] || key;
  });

  const handleExport = () => {
    if (concurrencyResults.length === 0) {
      toast.error("No results to export");
      return;
    }

    const exportData = concurrencyResults.map((r) => ({
      timestamp: r.timestamp,
      hardware: r.hardware.name,
      model: r.model.name,
      gpu_count: r.gpu_count,
      context_length: r.input.context_length,
      attention_precision: r.input.attention_precision,
      framework_overhead_gb: r.input.framework_overhead_gb,
      gpu_utilization: r.input.gpu_utilization,
      max_concurrency_without_pa: r.max_concurrency_without_pa,
      max_concurrency_with_pa: r.max_concurrency_with_pa,
      hardware_memory_gb: r.hardware_memory_gb,
      available_memory_gb: r.available_memory_gb,
      weight_memory_gb: r.memory_breakdown.weight_memory_gb,
      kv_cache_memory_gb: r.memory_breakdown.kv_cache_memory_gb,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `concurrency-results-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Results exported");
  };

  if (concurrencyResults.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitCompare className="h-5 w-5 text-primary" />
            {tt("comparison")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {tt("export")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearConcurrencyResults();
                toast.success("All results cleared");
              }}
            >
              {tt("clearAll")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">{tt("hardware")}</TableHead>
                <TableHead className="min-w-[120px]">{tt("model")}</TableHead>
                <TableHead className="text-right">{tt("gpuCount")}</TableHead>
                <TableHead className="text-right">{tt("contextLength")}</TableHead>
                <TableHead>{tt("precision")}</TableHead>
                <TableHead className="text-right">{tt("withoutPA")}</TableHead>
                <TableHead className="text-right">{tt("withPA")}</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {concurrencyResults.map((result, index) => (
                <TableRow key={result.id} className={index === 0 ? "bg-secondary/30" : ""}>
                  <TableCell className="font-medium">
                    {result.hardware.name}
                  </TableCell>
                  <TableCell>{result.model.name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {result.gpu_count}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {result.input.context_length}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {result.input.attention_precision}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {result.max_concurrency_without_pa}
                  </TableCell>
                  <TableCell className="text-right font-mono text-primary">
                    {result.max_concurrency_with_pa}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteConcurrencyResult(result.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
