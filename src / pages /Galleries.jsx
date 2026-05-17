import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Image, Lock, Eye, Archive, Upload, Trash2, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import GalleryForm from "@/components/galleries/GalleryForm";
import GalleryDetail from "@/components/galleries/GalleryDetail";

const statusStyles = {
  preparing: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
};

export default function Galleries() {
  const [showForm, setShowForm] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ["galleries"],
    queryFn: () => base44.entities.Gallery.list("-created_date"),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Gallery.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      setShowForm(false);
      toast({ title: "Gallery created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Gallery.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      toast({ title: "Gallery deleted" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Client Galleries</h1>
          <p className="text-muted-foreground mt-1">Password-protected image galleries for clients</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
          <Plus className="w-4 h-4" /> New Gallery
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : galleries.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl text-muted-foreground">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No galleries created yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {galleries.map(gallery => (
            <div
              key={gallery.id}
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
              onClick={() => setSelectedGallery(gallery)}
            >
              <div className="h-40 bg-muted relative overflow-hidden">
                {gallery.cover_image_url ? (
                  <img src={gallery.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge className={`${statusStyles[gallery.status] || ""} text-[10px]`}>
                    {gallery.status}
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">{gallery.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{gallery.client_name || "No client linked"}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Protected</span>
                  <span>{format(new Date(gallery.created_date), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>New Gallery</DialogTitle></DialogHeader>
          <GalleryForm
            bookings={bookings}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedGallery} onOpenChange={() => setSelectedGallery(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>Gallery Detail</DialogTitle></DialogHeader>
          {selectedGallery && (
            <GalleryDetail
              gallery={selectedGallery}
              onClose={() => setSelectedGallery(null)}
              onDelete={() => { deleteMutation.mutate(selectedGallery.id); setSelectedGallery(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
