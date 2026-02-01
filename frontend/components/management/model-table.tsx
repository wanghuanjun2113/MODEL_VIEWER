"use client";

import { useState } from "react";
import { useMFUStore } from "@/lib/store";
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
};

export function ModelTable() {
  const { models, addModel, updateModel, deleteModel } = useMFUStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [formData, setFormData] = useState<ModelFormData>(emptyFormData);
  const [hfId, setHfId] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [previewData, setPreviewData] = useState<ModelFormData | null>(null);

  const handleAdd = () => {
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }
    addModel(formData);
    setFormData(emptyFormData);
    setPreviewData(null);
    setHfId("");
    setIsAddOpen(false);
    toast.success("Model added");
  };

  const handleEdit = () => {
    if (!editingModel || !formData.name) {
      toast.error("Name is required");
      return;
    }
    updateModel(editingModel.id, formData);
    setEditingModel(null);
    setFormData(emptyFormData);
    toast.success("Model updated");
  };

  const handleDelete = (id: string) => {
    deleteModel(id);
    toast.success("Model deleted");
  };

  const handleFetchFromHF = async () => {
    if (!hfId.trim()) {
      toast.error("Please enter a Hugging Face model ID");
      return;
    }

    setIsFetching(true);
    try {
      // Fetch model config from HuggingFace
      const response = await fetch(
        `https://huggingface.co/${hfId}/raw/main/config.json`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch model config");
      }

      const config = await response.json();
      
      // Extract model parameters from config
      const fetchedData: ModelFormData = {
        name: hfId.split("/").pop() || hfId,
        huggingface_id: hfId,
        params_billions: 0, // Will be calculated
        num_layers: config.num_hidden_layers || config.n_layer || 0,
        hidden_size: config.hidden_size || config.n_embd || 0,
        num_attention_heads: config.num_attention_heads || config.n_head || 0,
        num_key_value_heads: config.num_key_value_heads || config.num_attention_heads || config.n_head || 0,
        vocab_size: config.vocab_size || 0,
        intermediate_size: config.intermediate_size || config.n_inner || (config.hidden_size * 4) || 0,
        head_dim: config.head_dim || Math.floor((config.hidden_size || 0) / (config.num_attention_heads || 1)),
        max_position_embeddings: config.max_position_embeddings || config.n_positions || 0,
      };

      // Estimate parameter count (rough estimate)
      const d = fetchedData.hidden_size;
      const L = fetchedData.num_layers;
      const V = fetchedData.vocab_size;
      const ffnSize = fetchedData.intermediate_size;
      
      // Rough parameter estimate: embeddings + attention + FFN for each layer
      const embedParams = d * V;
      const attnParams = L * (4 * d * d);
      const ffnParams = L * (3 * d * ffnSize);
      const totalParams = embedParams + attnParams + ffnParams;
      fetchedData.params_billions = parseFloat((totalParams / 1e9).toFixed(2));

      setPreviewData(fetchedData);
      setFormData(fetchedData);
      toast.success("Model config fetched successfully");
    } catch {
      toast.error("Failed to fetch model config from Hugging Face");
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
              Add Model
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Model</DialogTitle>
              <DialogDescription>
                Add a new model configuration. You can fetch from Hugging Face or enter manually.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="huggingface" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="huggingface">From Hugging Face</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
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
                    Fetch
                  </Button>
                </div>

                {previewData && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Preview</CardTitle>
                      <CardDescription>Review and edit before saving</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ModelForm formData={formData} setFormData={setFormData} />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="manual">
                <ModelForm formData={formData} setFormData={setFormData} />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddOpen(false);
                setFormData(emptyFormData);
                setPreviewData(null);
                setHfId("");
              }}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!formData.name}>
                Add Model
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Hugging Face ID</TableHead>
              <TableHead className="text-right">Params (B)</TableHead>
              <TableHead className="text-right">Layers</TableHead>
              <TableHead className="text-right">Hidden Size</TableHead>
              <TableHead className="text-right">Heads</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
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
                          <DialogTitle>Edit Model</DialogTitle>
                          <DialogDescription>
                            Update model configuration.
                          </DialogDescription>
                        </DialogHeader>
                        <ModelForm formData={formData} setFormData={setFormData} />
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingModel(null);
                              setFormData(emptyFormData);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleEdit}>Save Changes</Button>
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
                          <AlertDialogTitle>Delete Model</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {m.name}? This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(m.id)}>
                            Delete
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
}

function ModelForm({ formData, setFormData }: ModelFormProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Llama 2 7B"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hf_id">Hugging Face ID</Label>
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
          <Label htmlFor="params">Parameters (Billion)</Label>
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
          <Label htmlFor="layers">Number of Layers</Label>
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
          <Label htmlFor="hidden_size">Hidden Size</Label>
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
          <Label htmlFor="attn_heads">Attention Heads</Label>
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
          <Label htmlFor="kv_heads">KV Heads</Label>
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
          <Label htmlFor="head_dim">Head Dimension</Label>
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
          <Label htmlFor="vocab_size">Vocabulary Size</Label>
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
          <Label htmlFor="intermediate">Intermediate Size</Label>
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
          <Label htmlFor="max_pos">Max Position Embeddings</Label>
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
    </div>
  );
}
