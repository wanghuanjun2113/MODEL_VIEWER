"use client";

import React from "react"

import { useState, useEffect } from "react";
import { useMFUStore } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { generateUUID } from "@/lib/utils";
import type { Hardware, HardwareFormData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Download, Upload } from "lucide-react";
import { toast } from "sonner";

// Default English translations for SSR
const defaultTranslations: Record<string, string> = {
  nameRequired: "Name is required",
  hardwareAdded: "Hardware added",
  hardwareUpdated: "Hardware updated",
  hardwareDeleted: "Hardware deleted",
  templateDownloaded: "Template downloaded",
  importHardwareSuccess: "Imported hardware",
  importHardwareFailed: "Failed to parse CSV file",
  downloadTemplate: "Download Template",
  import: "Import",
  addHardware: "Add Hardware",
  cancel: "Cancel",
  editHardware: "Edit Hardware",
  editHardwareDesc: "Update hardware configuration for MFU calculations.",
  save: "Save",
  deleteHardware: "Delete Hardware",
  deleteHardwareConfirm: "Are you sure you want to delete this hardware? This action cannot be undone.",
  delete: "Delete",
  name: "Name",
  memorySize: "Memory Size (GB)",
  memoryBandwidth: "Memory Bandwidth (TB/s)",
  actions: "Actions",
  fp16PeakTflops: "FP16 Peak (TFLOPS)",
  bf16PeakTflops: "BF32 Peak (TFLOPS)",
  int8PeakTops: "INT8 Peak (TOPS)",
  hardwareConfigDesc: "Manage GPU and accelerator specifications for MFU calculations.",
};

const emptyFormData: HardwareFormData = {
  name: "",
  fp16_peak_tflops: 0,
  bf16_peak_tflops: 0,
  int8_peak_tops: 0,
  memory_size_gb: 0,
  memory_bandwidth_tbps: 0,
};

export function HardwareTable() {
  const { hardware, addHardware, updateHardware, deleteHardware, importHardware } =
    useMFUStore();
  const { t, isHydrated } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingHardware, setEditingHardware] = useState<Hardware | null>(null);
  const [formData, setFormData] = useState<HardwareFormData>(emptyFormData);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use translations only after mounted, otherwise use default English
  const tt = (key: string, params?: Record<string, string | number>): string => {
    if (mounted && isHydrated) {
      return t(key as any, params);
    }
    let text = defaultTranslations[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const handleAdd = () => {
    if (!formData.name) {
      toast.error(tt("nameRequired"));
      return;
    }
    addHardware(formData);
    setFormData(emptyFormData);
    setIsAddOpen(false);
    toast.success(tt("hardwareAdded"));
  };

  const handleEdit = () => {
    if (!editingHardware || !formData.name) {
      toast.error(tt("nameRequired"));
      return;
    }
    updateHardware(editingHardware.id, formData);
    setEditingHardware(null);
    setFormData(emptyFormData);
    toast.success(tt("hardwareUpdated"));
  };

  const handleDelete = (id: string) => {
    deleteHardware(id);
    toast.success(tt("hardwareDeleted"));
  };

  const handleExport = () => {
    const csvContent = [
      ["Name", "FP16 TFLOPS", "BF16 TFLOPS", "FP32 TFLOPS", "Memory (GB)", "Bandwidth (TB/s)"].join(","),
      ...hardware.map((h) =>
        [
          h.name,
          h.fp16_peak_tflops,
          h.bf16_peak_tflops,
          h.fp32_peak_tflops,
          h.memory_size_gb,
          h.memory_bandwidth_tbps,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hardware-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(tt("templateDownloaded"));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",");

        if (headers.length < 6) {
          toast.error("Invalid CSV format");
          return;
        }

        const items: Hardware[] = lines.slice(1).map((line) => {
          const values = line.split(",");
          return {
            id: generateUUID(),
            name: values[0]?.trim() || "",
            fp16_peak_tflops: parseFloat(values[1]) || 0,
            bf16_peak_tflops: parseFloat(values[2]) || 0,
            int8_peak_tops: parseFloat(values[3]) || 0,
            memory_size_gb: parseFloat(values[4]) || 0,
            memory_bandwidth_tbps: parseFloat(values[5]) || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

        importHardware(items);
        toast.success(tt("importHardwareSuccess", { count: items.length }));
      } catch {
        toast.error(tt("importHardwareFailed"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const openEditDialog = (h: Hardware) => {
    setEditingHardware(h);
    setFormData({
      name: h.name,
      fp16_peak_tflops: h.fp16_peak_tflops,
      bf16_peak_tflops: h.bf16_peak_tflops,
      int8_peak_tops: h.int8_peak_tops,
      memory_size_gb: h.memory_size_gb,
      memory_bandwidth_tbps: h.memory_bandwidth_tbps,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            {tt("downloadTemplate")}
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              {tt("import")}
            </Button>
          </div>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {tt("addHardware")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tt("addHardware")}</DialogTitle>
              <DialogDescription>
                {tt("hardwareConfigDesc")}
              </DialogDescription>
            </DialogHeader>
            <HardwareForm formData={formData} setFormData={setFormData} tt={tt} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                {tt("cancel")}
              </Button>
              <Button onClick={handleAdd}>{tt("addHardware")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tt("name")}</TableHead>
              <TableHead className="text-right">FP16</TableHead>
              <TableHead className="text-right">BF16</TableHead>
              <TableHead className="text-right">INT8</TableHead>
              <TableHead className="text-right">{tt("memorySize")}</TableHead>
              <TableHead className="text-right">{tt("memoryBandwidth")}</TableHead>
              <TableHead className="w-[100px]">{tt("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hardware.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-medium">{h.name}</TableCell>
                <TableCell className="text-right font-mono">
                  {h.fp16_peak_tflops}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {h.bf16_peak_tflops}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {h.int8_peak_tops}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {h.memory_size_gb}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {h.memory_bandwidth_tbps}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Dialog
                      open={editingHardware?.id === h.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingHardware(null);
                          setFormData(emptyFormData);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(h)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{tt("editHardware")}</DialogTitle>
                          <DialogDescription>
                            {tt("editHardwareDesc")}
                          </DialogDescription>
                        </DialogHeader>
                        <HardwareForm formData={formData} setFormData={setFormData} tt={tt} />
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingHardware(null);
                              setFormData(emptyFormData);
                            }}
                          >
                            {tt("cancel")}
                          </Button>
                          <Button onClick={handleEdit}>{tt("save")}</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{tt("deleteHardware")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {tt("deleteHardwareConfirm")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{tt("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(h.id)}>
                            {tt("delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface HardwareFormProps {
  formData: HardwareFormData;
  setFormData: (data: HardwareFormData) => void;
  tt: (key: string, params?: Record<string, string | number>) => string;
}

function HardwareForm({ formData, setFormData, tt }: HardwareFormProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">{tt("name")}</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., NVIDIA A100 80GB"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fp16">{tt("fp16PeakTflops")}</Label>
          <Input
            id="fp16"
            type="number"
            value={formData.fp16_peak_tflops}
            onChange={(e) =>
              setFormData({ ...formData, fp16_peak_tflops: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bf16">{tt("bf16PeakTflops")}</Label>
          <Input
            id="bf16"
            type="number"
            value={formData.bf16_peak_tflops}
            onChange={(e) =>
              setFormData({ ...formData, bf16_peak_tflops: Number(e.target.value) })
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="int8">{tt("int8PeakTops")}</Label>
          <Input
            id="int8"
            type="number"
            value={formData.int8_peak_tops}
            onChange={(e) =>
              setFormData({ ...formData, int8_peak_tops: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="memory">{tt("memorySize")}</Label>
          <Input
            id="memory"
            type="number"
            value={formData.memory_size_gb}
            onChange={(e) =>
              setFormData({ ...formData, memory_size_gb: Number(e.target.value) })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bandwidth">{tt("memoryBandwidth")}</Label>
        <Input
          id="bandwidth"
          type="number"
          step="0.001"
          value={formData.memory_bandwidth_tbps}
          onChange={(e) =>
            setFormData({ ...formData, memory_bandwidth_tbps: Number(e.target.value) })
          }
        />
      </div>
    </div>
  );
}
