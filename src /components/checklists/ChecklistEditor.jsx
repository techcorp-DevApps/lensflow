import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, X, GripVertical } from "lucide-react";

const CATEGORIES = [
  { value: "gear", label: "Gear" },
  { value: "preparation", label: "Preparation" },
  { value: "location", label: "Location" },
  { value: "client_communication", label: "Client Communication" },
  { value: "post_shoot", label: "Post-Shoot" },
];

const SESSION_TYPES = [
  { value: "portrait", label: "Portrait" },
  { value: "wedding", label: "Wedding" },
  { value: "family", label: "Family" },
  { value: "newborn", label: "Newborn" },
  { value: "maternity", label: "Maternity" },
  { value: "event", label: "Event" },
  { value: "commercial", label: "Commercial" },
  { value: "headshot", label: "Headshot" },
];

export default function ChecklistEditor({ template, onSubmit, onCancel, isSubmitting }) {
  const [form, setForm] = useState({
    session_type: template?.session_type || "portrait",
    items: template?.items || [{ text: "", category: "gear" }],
  });

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { text: "", category: "gear" }],
    }));
  };

  const removeItem = (index) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validItems = form.items.filter(item => item.text.trim());
    onSubmit({ ...form, items: validItems });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold">{template ? "Edit Template" : "New Checklist Template"}</h2>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2">
        <Label>Session Type</Label>
        <Select value={form.session_type} onValueChange={v => setForm(prev => ({ ...prev, session_type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SESSION_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Checklist Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
            <Plus className="w-3 h-3" /> Add Item
          </Button>
        </div>
        {form.items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground/30 shrink-0" />
            <Input
              value={item.text}
              onChange={e => updateItem(index, "text", e.target.value)}
              placeholder="Checklist item..."
              className="flex-1"
            />
            <Select value={item.category} onValueChange={v => updateItem(index, "category", v)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="shrink-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Saving..." : template ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </form>
  );
}
