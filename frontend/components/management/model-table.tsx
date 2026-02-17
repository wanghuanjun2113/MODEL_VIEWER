"use client";

import { useState, useEffect } from "react";
import { useMFUStore } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import type { Model, ModelFormData } from "@/lib/types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Default English translations for SSR
const defaultTranslations: Record<string, string> = {
  nameRequired: "Name is required",
  modelAdded: "Model added",
  modelUpdated: "Model updated",
  modelDeleted: "Model deleted",
  hfIdRequired: "Please enter a Hugging Face model ID",
  fetchConfigSuccess: "Model config fetched successfully",
  fetchConfigFailed: "Failed to fetch model config from Hugging Face",
  addModel: "Add Model",
  modelConfigDesc: "Manage model specifications. You can fetch model configurations directly from Hugging Face or enter them manually.",
  importFromHf: "Import from Hugging Face",
  manualEntry: "Manual Entry",
  preview: "Preview",
  reviewBeforeSaving: "Review and edit before saving",
  cancel: "Cancel",
  name: "Name",
  huggingfaceId: "Hugging Face ID",
  paramsBillions: "Parameters (Billion)",
  numLayers: "Layers",
  hiddenSize: "Hidden Size",
  numAttentionHeads: "Attention Heads",
  numKeyValueHeads: "KV Heads",
  actions: "Actions",
  editModel: "Edit Model",
  editModelDesc: "Update model configuration.",
  save: "Save",
  delete: "Delete",
  vocabSize: "Vocab Size",
  intermediateSize: "Intermediate Size",
  headDim: "Head Dim",
  maxPositionEmbeddings: "Max Position Embeddings",
  // Hybrid attention translations
  hybridAttention: "Hybrid Attention",
  hybridAttentionDesc: "This model uses a mix of Full Attention and Linear Attention layers.",
  fullAttentionLayers: "Full Attention Layers",
  linearAttentionLayers: "Linear Attention Layers",
  fullAttnInterval: "Full Attention Interval",
  linearKeyHeads: "Linear Key Heads",
  linearValueHeads: "Linear Value Heads",
  linearKeyDim: "Linear Key Head Dim",
  linearValueDim: "Linear Value Head Dim",
  hybridAttentionConfig: "Hybrid Attention Config",
};

const emptyFormData: ModelFormData = {
  name: "",
  huggingface_id: "",
  params_billions: 0,
  num_layers: 0,
  hidden_size: 0,
  num_attention_heads: 0,
  num_key_value_heads: 0,
  vocab_size: 0,
  intermediate_size: 0,
  head_dim: 0,
  max_position_embeddings: 0,
  // Hybrid attention fields
  is_hybrid_attention: false,
  full_attention_interval: 0,
  num_full_attention_layers: 0,
  num_linear_attention_layers: 0,
  linear_num_key_heads: 0,
  linear_num_value_heads: 0,
  linear_key_head_dim: 0,
  linear_value_head_dim: 0,
  linear_conv_kernel_dim: 0,
  layer_types: [],
};

export function ModelTable() {
  const { models, addModel, updateModel, deleteModel } = useMFUStore();
  const { t, isHydrated } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [formData, setFormData] = useState<ModelFormData>(emptyFormData);
  const [hfId, setHfId] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [previewData, setPreviewData] = useState<ModelFormData | null>(null);

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
    addModel(formData);
    setFormData(emptyFormData);
    setPreviewData(null);
    setHfId("");
    setIsAddOpen(false);
    toast.success(tt("modelAdded"));
  };

  const handleEdit = () => {
    if (!editingModel || !formData.name) {
      toast.error(tt("nameRequired"));
      return;
    }
    updateModel(editingModel.id, formData);
    setEditingModel(null);
    setFormData(emptyFormData);
    toast.success(tt("modelUpdated"));
  };

  const handleDelete = (id: string) => {
    deleteModel(id);
    toast.success(tt("modelDeleted"));
  };

  const handleFetchFromHF = async () => {
    if (!hfId.trim()) {
      toast.error(tt("hfIdRequired"));
      return;
    }

    setIsFetching(true);
    try {
      // Fetch model config from HuggingFace
      const response = await fetch(
        `https://huggingface.co/${hfId}/raw/main/config.json`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch model config: ${response.status}`);
      }

      const config = await response.json();
      console.log("Fetched config:", config); // Debug log

      // Extract model name from HF ID
      const modelName = hfId.split("/").pop() || hfId;

      // For multi-modal models (like Qwen3.5), text config is nested under "text_config"
      // For standard models, config is at root level
      const textConfig = config.text_config || config;

      // Extract model parameters from config with multiple field name variations
      const fetchedData: ModelFormData = {
        name: modelName,
        huggingface_id: hfId,
        params_billions: 0,
        num_layers: textConfig.num_hidden_layers || textConfig.num_layers || config.num_hidden_layers || config.num_layers || config.n_layer || config.n_layers || config.decoder_layers || 0,
        hidden_size: textConfig.hidden_size || config.hidden_size || config.d_model || config.n_embd || 0,
        num_attention_heads: textConfig.num_attention_heads || config.num_attention_heads || config.n_head || config.n_heads || config.attention_heads || 0,
        num_key_value_heads: textConfig.num_key_value_heads || config.num_key_value_heads || textConfig.n_kv_heads || config.n_kv_heads || textConfig.num_kv_heads || config.num_kv_heads || 0,
        vocab_size: textConfig.vocab_size || config.vocab_size || 0,
        intermediate_size: textConfig.intermediate_size || textConfig.moe_intermediate_size || config.intermediate_size || textConfig.ffn_hidden_size || config.ffn_hidden_size || config.n_inner || 0,
        head_dim: textConfig.head_dim || config.head_dim || 0,
        max_position_embeddings: textConfig.max_position_embeddings || config.max_position_embeddings || textConfig.max_sequence_length || config.max_sequence_length || config.n_positions || config.seq_length || 0,
      };

      // Check for hybrid attention (models like Qwen3.5 with linear attention)
      const layerTypes = textConfig.layer_types || [];
      if (layerTypes.length > 0 && layerTypes.includes("linear_attention")) {
        fetchedData.is_hybrid_attention = true;
        fetchedData.full_attention_interval = textConfig.full_attention_interval || 0;
        fetchedData.layer_types = layerTypes;
        fetchedData.num_full_attention_layers = layerTypes.filter((t: string) => t === "full_attention").length;
        fetchedData.num_linear_attention_layers = layerTypes.filter((t: string) => t === "linear_attention").length;
        fetchedData.linear_num_key_heads = textConfig.linear_num_key_heads || 0;
        fetchedData.linear_num_value_heads = textConfig.linear_num_value_heads || 0;
        fetchedData.linear_key_head_dim = textConfig.linear_key_head_dim || 0;
        fetchedData.linear_value_head_dim = textConfig.linear_value_head_dim || 0;
        fetchedData.linear_conv_kernel_dim = textConfig.linear_conv_kernel_dim || 0;
        console.log(`Hybrid attention model: ${fetchedData.num_full_attention_layers} full, ${fetchedData.num_linear_attention_layers} linear attention layers`);
      } else {
        fetchedData.is_hybrid_attention = false;
      }

      // If num_key_value_heads is still 0, default to num_attention_heads
      if (fetchedData.num_key_value_heads === 0 && fetchedData.num_attention_heads > 0) {
        fetchedData.num_key_value_heads = fetchedData.num_attention_heads;
      }

      // Calculate head_dim if not provided
      if (fetchedData.head_dim === 0 && fetchedData.hidden_size > 0 && fetchedData.num_attention_heads > 0) {
        fetchedData.head_dim = Math.floor(fetchedData.hidden_size / fetchedData.num_attention_heads);
      }

      // Try to parse params from model name (e.g., "397B-A17B" means 397B total, 17B active)
      const moeMatch = hfId.match(/(\d+)B-A(\d+)B/i);
      const standardMatch = hfId.match(/[-_](\d+)B(?:[-_]|$)/i);

      if (moeMatch) {
        // MoE model: extract total params from name
        fetchedData.params_billions = parseFloat(moeMatch[1]);
        console.log(`MoE model detected: ${moeMatch[1]}B total, ${moeMatch[2]}B active`);
      } else if (standardMatch) {
        // Standard model: extract params from name
        fetchedData.params_billions = parseFloat(standardMatch[1]);
      } else {
        // Estimate parameter count from config
        const d = fetchedData.hidden_size;
        const L = fetchedData.num_layers;
        const V = fetchedData.vocab_size || 32000;
        const ffnSize = fetchedData.intermediate_size || (d * 4);

        if (d > 0 && L > 0) {
          // Check for MoE config
          const numExperts = textConfig.num_experts || config.num_experts || textConfig.num_local_experts || config.num_local_experts || 0;
          const expertsPerTok = textConfig.num_experts_per_tok || config.num_experts_per_tok || textConfig.top_k || config.top_k || 0;

          if (numExperts > 0 && expertsPerTok > 0) {
            // MoE parameter estimation
            const embedParams = V * d * 2;
            const attnParams = L * 4 * d * d;
            const moeFfnParams = numExperts * 3 * d * ffnSize;
            const routerParams = L * d * numExperts;
            const totalParams = embedParams + attnParams + moeFfnParams + routerParams;
            fetchedData.params_billions = parseFloat((totalParams / 1e9).toFixed(2));
            console.log(`MoE estimated: ${numExperts} experts, ${(totalParams / 1e9).toFixed(2)}B params`);
          } else {
            // Standard parameter estimation
            const embedParams = V * d * 2;
            const attnParams = L * 4 * d * d;
            const ffnParams = L * 3 * d * ffnSize;
            const totalParams = embedParams + attnParams + ffnParams;
            fetchedData.params_billions = parseFloat((totalParams / 1e9).toFixed(2));
          }
        }
      }

      console.log("Parsed model data:", fetchedData); // Debug log

      setPreviewData(fetchedData);
      setFormData(fetchedData);
      toast.success(tt("fetchConfigSuccess"));
    } catch (error) {
      console.error("Failed to fetch from HuggingFace:", error);
      toast.error(tt("fetchConfigFailed"));
    } finally {
      setIsFetching(false);
    }
  };

  const openEditDialog = (m: Model) => {
    setEditingModel(m);
    setFormData({
      name: m.name,
      huggingface_id: m.huggingface_id,
      params_billions: m.params_billions,
      num_layers: m.num_layers,
      hidden_size: m.hidden_size,
      num_attention_heads: m.num_attention_heads,
      num_key_value_heads: m.num_key_value_heads,
      vocab_size: m.vocab_size,
      intermediate_size: m.intermediate_size,
      head_dim: m.head_dim,
      max_position_embeddings: m.max_position_embeddings,
      // Hybrid attention fields
      is_hybrid_attention: m.is_hybrid_attention,
      full_attention_interval: m.full_attention_interval,
      num_full_attention_layers: m.num_full_attention_layers,
      num_linear_attention_layers: m.num_linear_attention_layers,
      linear_num_key_heads: m.linear_num_key_heads,
      linear_num_value_heads: m.linear_num_value_heads,
      linear_key_head_dim: m.linear_key_head_dim,
      linear_value_head_dim: m.linear_value_head_dim,
      linear_conv_kernel_dim: m.linear_conv_kernel_dim,
      layer_types: m.layer_types,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            setFormData(emptyFormData);
            setPreviewData(null);
            setHfId("");
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {tt("addModel")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{tt("addModel")}</DialogTitle>
              <DialogDescription>
                {tt("modelConfigDesc")}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="huggingface" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="huggingface">{tt("importFromHf")}</TabsTrigger>
                <TabsTrigger value="manual">{tt("manualEntry")}</TabsTrigger>
              </TabsList>

              <TabsContent value="huggingface" className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., meta-llama/Llama-2-7b-hf"
                    value={hfId}
                    onChange={(e) => setHfId(e.target.value)}
                  />
                  <Button onClick={handleFetchFromHF} disabled={isFetching}>
                    {isFetching ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    {tt("preview")}
                  </Button>
                </div>

                {previewData && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{tt("preview")}</CardTitle>
                      <CardDescription>{tt("reviewBeforeSaving")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ModelForm formData={formData} setFormData={setFormData} tt={tt} />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="manual">
                <ModelForm formData={formData} setFormData={setFormData} tt={tt} />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddOpen(false);
                setFormData(emptyFormData);
                setPreviewData(null);
                setHfId("");
              }}>
                {tt("cancel")}
              </Button>
              <Button onClick={handleAdd} disabled={!formData.name}>
                {tt("addModel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tt("name")}</TableHead>
              <TableHead>{tt("huggingfaceId")}</TableHead>
              <TableHead className="text-right">{tt("paramsBillions")}</TableHead>
              <TableHead className="text-right">{tt("numLayers")}</TableHead>
              <TableHead className="text-right">{tt("hiddenSize")}</TableHead>
              <TableHead className="text-right">{tt("numAttentionHeads")}</TableHead>
              <TableHead className="text-right">{tt("numKeyValueHeads")}</TableHead>
              <TableHead className="w-[100px]">{tt("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {m.huggingface_id || "-"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {m.params_billions}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {m.num_layers}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {m.hidden_size}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {m.num_attention_heads}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {m.num_key_value_heads}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Dialog
                      open={editingModel?.id === m.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingModel(null);
                          setFormData(emptyFormData);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{tt("editModel")}</DialogTitle>
                          <DialogDescription>
                            {tt("editModelDesc")}
                          </DialogDescription>
                        </DialogHeader>
                        <ModelForm formData={formData} setFormData={setFormData} tt={tt} />
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingModel(null);
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
                          <AlertDialogTitle>{tt("delete")} Model</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {m.name}? This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{tt("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(m.id)}>
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

interface ModelFormProps {
  formData: ModelFormData;
  setFormData: (data: ModelFormData) => void;
  tt: (key: string, params?: Record<string, string | number>) => string;
}

function ModelForm({ formData, setFormData, tt }: ModelFormProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">{tt("name")}</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Llama 2 7B"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hf_id">{tt("huggingfaceId")}</Label>
          <Input
            id="hf_id"
            value={formData.huggingface_id}
            onChange={(e) => setFormData({ ...formData, huggingface_id: e.target.value })}
            placeholder="e.g., meta-llama/Llama-2-7b-hf"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="params">{tt("paramsBillions")}</Label>
          <Input
            id="params"
            type="number"
            step="0.1"
            value={formData.params_billions}
            onChange={(e) =>
              setFormData({ ...formData, params_billions: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="layers">{tt("numLayers")}</Label>
          <Input
            id="layers"
            type="number"
            value={formData.num_layers}
            onChange={(e) =>
              setFormData({ ...formData, num_layers: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hidden_size">{tt("hiddenSize")}</Label>
          <Input
            id="hidden_size"
            type="number"
            value={formData.hidden_size}
            onChange={(e) =>
              setFormData({ ...formData, hidden_size: Number(e.target.value) })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="attn_heads">{tt("numAttentionHeads")}</Label>
          <Input
            id="attn_heads"
            type="number"
            value={formData.num_attention_heads}
            onChange={(e) =>
              setFormData({ ...formData, num_attention_heads: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kv_heads">{tt("numKeyValueHeads")}</Label>
          <Input
            id="kv_heads"
            type="number"
            value={formData.num_key_value_heads}
            onChange={(e) =>
              setFormData({ ...formData, num_key_value_heads: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="head_dim">{tt("headDim")}</Label>
          <Input
            id="head_dim"
            type="number"
            value={formData.head_dim}
            onChange={(e) =>
              setFormData({ ...formData, head_dim: Number(e.target.value) })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vocab_size">{tt("vocabSize")}</Label>
          <Input
            id="vocab_size"
            type="number"
            value={formData.vocab_size}
            onChange={(e) =>
              setFormData({ ...formData, vocab_size: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intermediate">{tt("intermediateSize")}</Label>
          <Input
            id="intermediate"
            type="number"
            value={formData.intermediate_size}
            onChange={(e) =>
              setFormData({ ...formData, intermediate_size: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_pos">{tt("maxPositionEmbeddings")}</Label>
          <Input
            id="max_pos"
            type="number"
            value={formData.max_position_embeddings}
            onChange={(e) =>
              setFormData({ ...formData, max_position_embeddings: Number(e.target.value) })
            }
          />
        </div>
      </div>

      {/* Hybrid Attention Config - only show if model has hybrid attention */}
      {formData.is_hybrid_attention && formData.num_linear_attention_layers && formData.num_linear_attention_layers > 0 && (
        <div className="border rounded-lg p-4 space-y-4 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="font-semibold text-blue-700 dark:text-blue-400">{tt("hybridAttentionConfig")}</span>
          </div>
          <p className="text-xs text-muted-foreground">{tt("hybridAttentionDesc")}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="num_full_layers" className="text-green-700 dark:text-green-400">{tt("fullAttentionLayers")}</Label>
              <Input
                id="num_full_layers"
                type="number"
                value={formData.num_full_attention_layers || 0}
                onChange={(e) =>
                  setFormData({ ...formData, num_full_attention_layers: Number(e.target.value) })
                }
                className="border-green-200 dark:border-green-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="num_linear_layers" className="text-blue-700 dark:text-blue-400">{tt("linearAttentionLayers")}</Label>
              <Input
                id="num_linear_layers"
                type="number"
                value={formData.num_linear_attention_layers || 0}
                onChange={(e) =>
                  setFormData({ ...formData, num_linear_attention_layers: Number(e.target.value) })
                }
                className="border-blue-200 dark:border-blue-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_interval">{tt("fullAttnInterval")}</Label>
              <Input
                id="full_interval"
                type="number"
                value={formData.full_attention_interval || 0}
                onChange={(e) =>
                  setFormData({ ...formData, full_attention_interval: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_hybrid" className="flex items-center gap-2">
                <span>{tt("hybridAttention")}</span>
                <input
                  id="is_hybrid"
                  type="checkbox"
                  checked={formData.is_hybrid_attention || false}
                  onChange={(e) =>
                    setFormData({ ...formData, is_hybrid_attention: e.target.checked })
                  }
                  className="h-4 w-4"
                />
              </Label>
            </div>
          </div>

          <div className="border-t border-blue-200 dark:border-blue-800 pt-4 mt-2">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-3">{tt("hybridAttentionConfig")} - Linear Attention</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linear_k_heads">{tt("linearKeyHeads")}</Label>
                <Input
                  id="linear_k_heads"
                  type="number"
                  value={formData.linear_num_key_heads || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, linear_num_key_heads: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linear_v_heads">{tt("linearValueHeads")}</Label>
                <Input
                  id="linear_v_heads"
                  type="number"
                  value={formData.linear_num_value_heads || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, linear_num_value_heads: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linear_k_dim">{tt("linearKeyDim")}</Label>
                <Input
                  id="linear_k_dim"
                  type="number"
                  value={formData.linear_key_head_dim || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, linear_key_head_dim: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linear_v_dim">{tt("linearValueDim")}</Label>
                <Input
                  id="linear_v_dim"
                  type="number"
                  value={formData.linear_value_head_dim || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, linear_value_head_dim: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linear_conv_kernel">{tt("linearConvKernelDim")}</Label>
                <Input
                  id="linear_conv_kernel"
                  type="number"
                  value={formData.linear_conv_kernel_dim || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, linear_conv_kernel_dim: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
