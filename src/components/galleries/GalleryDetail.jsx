import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { galleriesApi } from "@/api/galleries";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Image, Star, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function GalleryDetail({ gallery, onClose, onDelete }) {
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["gallery-images", gallery.id],
    queryFn: () => base44.entities.GalleryImage.filter({ gallery_id: gallery.id }, "order"),
  });

  const updateGalleryMutation = useMutation({
    mutationFn: (data) => galleriesApi.update(gallery.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      toast({ title: "Gallery updated" });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (id) => base44.entities.GalleryImage.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gallery-images", gallery.id] }),
  });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.GalleryImage.create({
        gallery_id: gallery.id,
        image_url: file_url,
        thumbnail_url: file_url,
        filename: file.name,
        order: images.length,
      });
    }
    // Set first uploaded image as cover if none exists
    if (!gallery.cover_image_url && files.length > 0) {
      const updatedImages = await base44.entities.GalleryImage.filter({ gallery_id: gallery.id });
      if (updatedImages.length > 0) {
        await updateGalleryMutation.mutateAsync({ cover_image_url: updatedImages[0].image_url });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["gallery-images", gallery.id] });
    setUploading(false);
    toast({ title: `${files.length} image(s) uploaded` });
  };

  const galleryLink = `${window.location.origin}/gallery/${gallery.id}`;
  const copyLink = () => {
    navigator.clipboard.writeText(galleryLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold">{gallery.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{gallery.client_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={gallery.status}
            onValueChange={(v) => updateGalleryMutation.mutate({ status: v })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Share Link */}
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
        <span className="text-xs text-muted-foreground flex-1 truncate font-mono">{galleryLink}</span>
        <Button variant="outline" size="sm" onClick={copyLink} className="gap-1 shrink-0">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy Link"}
        </Button>
      </div>

      {/* Upload */}
      <div className="flex items-center gap-3">
        <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading..." : "Upload Images"}
        </Button>
        <span className="text-sm text-muted-foreground">{images.length} image(s)</span>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map(img => (
          <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img src={img.image_url} alt={img.filename} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => deleteImageMutation.mutate(img.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            {img.selected && (
              <div className="absolute top-2 right-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              </div>
            )}
          </div>
        ))}
        {images.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Image className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No images yet. Upload some photos!</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-border">
        <Button variant="outline" className="text-destructive hover:bg-destructive/10 gap-2" onClick={onDelete}>
          <Trash2 className="w-4 h-4" /> Delete Gallery
        </Button>
        {gallery.client_email && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={async () => {
              await base44.integrations.Core.SendEmail({
                to: gallery.client_email,
                subject: `Your Photo Gallery is Ready — ${gallery.title}`,
                body: `
                  <h2>Hello ${gallery.client_name},</h2>
                  <p>Your photo gallery "<strong>${gallery.title}</strong>" is ready for viewing!</p>
                  <p><strong>Gallery Link:</strong> ${galleryLink}</p>
                  <p><strong>Password:</strong> ${gallery.password}</p>
                  <p>Please review your images and select your favorites.</p>
                  <br/>
                  <p>Thank you!</p>
                `,
              });
              toast({ title: "Gallery link sent to client" });
            }}
          >
            <ExternalLink className="w-4 h-4" /> Send Gallery Link
          </Button>
        )}
      </div>
    </div>
  );
}
