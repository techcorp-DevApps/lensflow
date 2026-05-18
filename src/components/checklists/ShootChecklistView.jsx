import React, { useState } from "react";
import { apiClient } from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, Circle, Package, Camera, MapPin, MessageSquare, Image } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const categoryIcons = {
  gear: Package,
  preparation: Camera,
  location: MapPin,
  client_communication: MessageSquare,
  post_shoot: Image,
};

const categoryLabels = {
  gear: "Gear",
  preparation: "Preparation",
  location: "Location",
  client_communication: "Client Comm.",
  post_shoot: "Post-Shoot",
};

export default function ShootChecklistView({ checklist, booking, onClose }) {
  const [items, setItems] = useState(checklist.items || []);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: (newItems) => apiClient.entities.ShootChecklist.update(checklist.id, { items: newItems }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shoot-checklists"] }),
  });

  const toggleItem = (index) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    );
    setItems(newItems);
    updateMutation.mutate(newItems);
  };

  const completed = items.filter(i => i.completed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Group by category
  const grouped = items.reduce((acc, item, index) => {
    const cat = item.category || "preparation";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...item, originalIndex: index });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-semibold">
          {booking?.client_name || "Shoot"} Checklist
        </h2>
        {booking && (
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(booking.session_date), "MMM d, yyyy 'at' h:mm a")} — {booking.location || "TBD"}
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{completed} of {total} completed</span>
          <span className="text-sm font-bold text-accent">{pct}%</span>
        </div>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Grouped Items */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, categoryItems]) => {
          const CatIcon = categoryIcons[category] || Camera;
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <CatIcon className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {categoryLabels[category] || category}
                </h3>
              </div>
              <div className="space-y-1">
                {categoryItems.map((item) => (
                  <button
                    key={item.originalIndex}
                    onClick={() => toggleItem(item.originalIndex)}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted/30 transition-colors text-left"
                  >
                    {item.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
