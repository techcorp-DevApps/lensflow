// inferred too narrowly from this JS source. Runtime behavior is exercised by unit
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckSquare, Camera, Package, MapPin, MessageSquare, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import ChecklistEditor from "@/components/checklists/ChecklistEditor";
import ShootChecklistView from "@/components/checklists/ShootChecklistView";
import ErrorState from "@/components/ErrorState";

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
  client_communication: "Client Communication",
  post_shoot: "Post-Shoot",
};

const sessionTypeLabels = {
  portrait: "Portrait",
  wedding: "Wedding",
  family: "Family",
  newborn: "Newborn",
  maternity: "Maternity",
  event: "Event",
  commercial: "Commercial",
  headshot: "Headshot",
};

export default function Checklists() {
  const [showEditor, setShowEditor] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [activeChecklist, setActiveChecklist] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates = [], isLoading: loadingTemplates, error: templatesError, refetch: refetchTemplates } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: () => base44.entities.ChecklistTemplate.list(),
  });

  const { data: shootChecklists = [], isLoading: loadingChecklists, error: checklistsError, refetch: refetchChecklists } = useQuery({
    queryKey: ["shoot-checklists"],
    queryFn: () => base44.entities.ShootChecklist.list("-created_date"),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (/** @type {any} */ data) => base44.entities.ChecklistTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      setShowEditor(false);
      toast({ title: "Template saved" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (/** @type {{ id: string, data: any }} */ { id, data }) => base44.entities.ChecklistTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      setShowEditor(false);
      setEditTemplate(null);
      toast({ title: "Template updated" });
    },
  });

  const createFromTemplate = async (template, bookingId) => {
    const items = template.items.map(item => ({ ...item, completed: false }));
    await base44.entities.ShootChecklist.create({
      booking_id: bookingId,
      session_type: template.session_type,
      items,
    });
    queryClient.invalidateQueries({ queryKey: ["shoot-checklists"] });
    toast({ title: "Checklist created for shoot" });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Pre-Shoot Checklists</h1>
          <p className="text-muted-foreground mt-1">Templates and active shoot checklists</p>
        </div>
        <Button onClick={() => { setEditTemplate(null); setShowEditor(true); }} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      {/* Templates Section */}
      <div>
        <h2 className="text-lg font-heading font-semibold mb-4">Checklist Templates</h2>
        {templatesError ? (
          <ErrorState title="Couldn't load templates" error={templatesError} onRetry={() => refetchTemplates()} />
        ) : loadingTemplates ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground">
            <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No templates yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer"
                onClick={() => { setEditTemplate(template); setShowEditor(true); }}
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge className="bg-accent/10 text-accent">{sessionTypeLabels[template.session_type] || template.session_type}</Badge>
                  <span className="text-xs text-muted-foreground">{template.items?.length || 0} items</span>
                </div>
                <h3 className="font-semibold capitalize mb-2">{sessionTypeLabels[template.session_type]} Checklist</h3>
                <div className="space-y-1">
                  {template.items?.slice(0, 3).map((item, i) => (
                    <p key={i} className="text-xs text-muted-foreground truncate">• {item.text}</p>
                  ))}
                  {(template.items?.length || 0) > 3 && (
                    <p className="text-xs text-muted-foreground">+{template.items.length - 3} more</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Checklists */}
      <div>
        <h2 className="text-lg font-heading font-semibold mb-4">Active Shoot Checklists</h2>
        {checklistsError ? (
          <ErrorState title="Couldn't load checklists" error={checklistsError} onRetry={() => refetchChecklists()} />
        ) : loadingChecklists ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : shootChecklists.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground">
            <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No active checklists. Create one from a template!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shootChecklists.map(checklist => {
              const booking = bookings.find(b => b.id === checklist.booking_id);
              const completed = checklist.items?.filter(i => i.completed).length || 0;
              const total = checklist.items?.length || 0;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <div
                  key={checklist.id}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => setActiveChecklist(checklist)}
                >
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{booking?.client_name || "Unknown Client"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{checklist.session_type} session</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Editor */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>Checklist Template</DialogTitle></DialogHeader>
          <ChecklistEditor
            template={editTemplate}
            onSubmit={(data) => {
              if (editTemplate) {
                updateTemplateMutation.mutate({ id: editTemplate.id, data });
              } else {
                createTemplateMutation.mutate(data);
              }
            }}
            onCancel={() => { setShowEditor(false); setEditTemplate(null); }}
            isSubmitting={createTemplateMutation.isPending || updateTemplateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Active Checklist View */}
      <Dialog open={!!activeChecklist} onOpenChange={() => setActiveChecklist(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>Shoot Checklist</DialogTitle></DialogHeader>
          {activeChecklist && (
            <ShootChecklistView
              checklist={activeChecklist}
              booking={bookings.find(b => b.id === activeChecklist.booking_id)}
              onClose={() => setActiveChecklist(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
