"use client";

import { useMFUStore } from "@/lib/store";
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

export function ComparisonTable() {
  const { results, deleteResult, clearResults } = useMFUStore();

  const handleExport = () => {
    if (results.length === 0) {
      toast.error("No results to export");
      return;
    }

    const exportData = results.map((r) => ({
      timestamp: r.timestamp,
      hardware: r.hardware.name,
      model: r.model.name,
      precision: r.input.precision,
      context_length: r.input.context_length,
      generated_length: r.input.generated_length,
      batch_size: r.input.batch_size,
      first_token_latency_ms: r.input.first_token_latency_ms,
      tpot_ms: r.input.tpot_ms,
      mfu: r.mfu,
      memory_bandwidth_utilization: r.memory_bandwidth_utilization,
      bottleneck_type: r.bottleneck_type,
      actual_tflops: r.actual_flops,
      theoretical_tflops: r.theoretical_flops,
      kv_cache_size_gb: r.kv_cache_size_gb,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mfu-results-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Results exported");
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitCompare className="h-5 w-5 text-primary" />
            Results Comparison
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearResults();
                toast.success("All results cleared");
              }}
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Hardware</TableHead>
                <TableHead className="min-w-[120px]">Model</TableHead>
                <TableHead>Precision</TableHead>
                <TableHead className="text-right">MFU</TableHead>
                <TableHead className="text-right">BW Util</TableHead>
                <TableHead>Bottleneck</TableHead>
                <TableHead className="text-right">Context</TableHead>
                <TableHead className="text-right">Batch</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, index) => (
                <TableRow key={result.id} className={index === 0 ? "bg-secondary/30" : ""}>
                  <TableCell className="font-medium">
                    {result.hardware.name}
                  </TableCell>
                  <TableCell>{result.model.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {result.input.precision}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {result.mfu.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {result.memory_bandwidth_utilization.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        result.bottleneck_type === "compute"
                          ? "default"
                          : result.bottleneck_type === "memory"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {result.bottleneck_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {result.input.context_length}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {result.input.batch_size}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteResult(result.id)}
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
