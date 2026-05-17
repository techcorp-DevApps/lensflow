import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { galleriesApi } from "@/api/galleries";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Camera, Star, Download, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

export default function ClientGallery() {
  const urlParams = new URLSearchParams(window.location.search);
  const galleryPath = window.location.pathname.split("/gallery/")[1];
  const galleryId = galleryPath || urlParams.get("id");

  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const queryClient = useQueryClient();

  const { data: gallery, isLoading: loadingGallery } = useQuery({
    queryKey: ["public-gallery", galleryId],
    queryFn: () => galleriesApi.filter({ id: galleryId }),
    enabled: !!galleryId,
    select: (data) => data[0],
  });

  const { data: images = [] } = useQuery({
    queryKey: ["public-gallery-images", galleryId],
    queryFn: () => base44.entities.GalleryImage.filter({ gallery_id: galleryId }, "order"),
    enabled: authenticated && !!galleryId,
  });

  const toggleSelectMutation = useMutation({
    mutationFn: ({ id, selected }) => base44.entities.GalleryImage.update(id, { selected }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["public-gallery-images", galleryId] }),
  });

  const handleLogin = (e) => {
    e.preventDefault();
    if (gallery && password === gallery.password) {
      setAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  if (!galleryId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body">
        <p className="text-muted-foreground">Gallery not found.</p>
      </div>
    );
  }

  if (loadingGallery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground">{gallery?.title || "Gallery"}</h1>
            {gallery?.client_name && (
              <p className="text-muted-foreground mt-1">for {gallery.client_name}</p>
            )}
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter gallery password"
                value={password}
                onChange={e => { setPassword(e.target.value); setPasswordError(false); }}
                className={`pl-10 ${passwordError ? "border-destructive" : ""}`}
              />
            </div>
            {passwordError && (
              <p className="text-destructive text-sm">Incorrect password. Please try again.</p>
            )}
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              View Gallery
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  const selectedCount = images.filter(i => i.selected).length;

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">{gallery?.title}</h1>
            <p className="text-sm text-muted-foreground">{images.length} photos</p>
          </div>
          {gallery?.selections_enabled && (
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">{selectedCount} selected</span>
            </div>
          )}
        </div>
      </header>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          <AnimatePresence>
            {images.map((img, index) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative group break-inside-avoid cursor-pointer rounded-lg overflow-hidden"
                onClick={() => setLightboxImage(img)}
              >
                <img src={img.image_url} alt={img.filename} className="w-full rounded-lg" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-lg" />
                {gallery?.selections_enabled && (
                  <button
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all
                      ${img.selected 
                        ? "bg-accent text-accent-foreground scale-110" 
                        : "bg-black/40 text-white opacity-0 group-hover:opacity-100"
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectMutation.mutate({ id: img.id, selected: !img.selected });
                    }}
                  >
                    <Heart className={`w-4 h-4 ${img.selected ? "fill-current" : ""}`} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black border-none">
          {lightboxImage && (
            <div className="relative">
              <img src={lightboxImage.image_url} alt={lightboxImage.filename} className="w-full max-h-[85vh] object-contain" />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between">
                <span className="text-white text-sm">{lightboxImage.filename}</span>
                <div className="flex items-center gap-2">
                  {gallery?.selections_enabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-white gap-1 ${lightboxImage.selected ? "bg-accent/80" : ""}`}
                      onClick={() => {
                        toggleSelectMutation.mutate({ id: lightboxImage.id, selected: !lightboxImage.selected });
                        setLightboxImage(prev => ({ ...prev, selected: !prev.selected }));
                      }}
                    >
                      <Heart className={`w-4 h-4 ${lightboxImage.selected ? "fill-current" : ""}`} />
                      {lightboxImage.selected ? "Selected" : "Select"}
                    </Button>
                  )}
                  {gallery?.download_enabled && (
                    <a href={lightboxImage.image_url} download target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm" className="text-white gap-1">
                        <Download className="w-4 h-4" /> Download
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
