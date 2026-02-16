"use client";

import React from "react"

import { useState } from "react";
import { useMFUStore } from "@/lib/store";
import { useLanguageStore } from "@/lib/i18n";
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
  const { t } = useLanguageStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingHardware, setEditingHardware] = useState<Hardware | null>(null);
  const [formData, setFormData] = useState<HardwareFormData>(emptyFormData);

  const handleAdd = () => {
    if (!formData.name) {
      toast.error(t("nameRequired"));
      return;
    }
    addHardware(formData);
    setFormData(emptyFormData);
    setIsAddOpen(false);
    toast.success(t("hardwareAdded"));
  };

  const handleEdit = () => {
    if (!editingHardware || !formData.name) {
      toast.error(t("nameRequired"));
      return;
    }
    updateHardware(editingHardware.id, formData);
    setEditingHardware(null);
    setFormData(emptyFormData);
    toast.success(t("hardwareUpdated"));
  };

  const handleDelete = (id: string) => {
    deleteHardware(id);
    toast.success(t("hardwareDeleted"));
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
    toast.success(t("templateDownloaded"));
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
        toast.success(t("importHardwareSuccess", { count: items.length }));
      } catch {
        toast.error(t("importHardwareFailed"));
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
            {t("downloadTemplate")}
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
              {t("import")}
            </Button>
          </div>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("addHardware")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addHardware")}</DialogTitle>
              <DialogDescription>
                {t("hardwareConfigDesc")}
              </DialogDescription>
            </DialogHeader>
            <HardwareForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleAdd}>{t("addHardware")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead className="text-right">FP16</TableHead>
              <TableHead className="text-right">BF16</TableHead>
              <TableHead className="text-right">INT8</TableHead>
              <TableHead className="text-right">{t("memorySize")}</TableHead>
              <TableHead className="text-right">{t("memoryBandwidth")}</TableHead>
              <TableHead className="w-[100px]">{t("actions")}</TableHead>
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
                          <DialogTitle>{t("editHardware")}</DialogTitle>
                          <DialogDescription>
                            {t("editHardwareDesc")}
                          </DialogDescription>
                        </DialogHeader>
                        <HardwareForm formData={formData} setFormData={setFormData} />
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingHardware(null);
                              setFormData(emptyFormData);
                            }}
                          >
                            {t("cancel")}
                          </Button>
                          <Button onClick={handleEdit}>{t("save")}</Button>
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
                          <AlertDialogTitle>{t("deleteHardware")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("deleteHardwareConfirm")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(h.id)}>
                            {t("delete")}
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
}

function HardwareForm({ formData, setFormData }: HardwareFormProps) {
  const { t } = useLanguageStore();
  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., NVIDIA A100 80GB"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fp16">{t("fp16PeakTflops")}</Label>
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
          <Label htmlFor="bf16">{t("bf16PeakTflops")}</Label>
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
          <Label htmlFor="int8">{t("int8PeakTops")}</Label>
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
          <Label htmlFor="memory">{t("memorySize")}</Label>
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
        <Label htmlFor="bandwidth">{t("memoryBandwidth")}</Label>
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
