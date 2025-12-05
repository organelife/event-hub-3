import { useState, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, ImageIcon, Loader2 } from "lucide-react";

export default function PhotoGallery() {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: photos, isLoading } = useQuery({
    queryKey: ["photos"],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("photos").list("", {
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      return data.filter((file) => file.name !== ".emptyFolderPlaceholder");
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage.from("photos").upload(fileName, file);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `${files.length} photo(s) uploaded successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getPublicUrl = (fileName: string) => {
    const { data } = supabase.storage.from("photos").getPublicUrl(fileName);
    return data.publicUrl;
  };

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Photo Gallery</h1>
            <p className="text-muted-foreground mt-1">Event photos and memories</p>
          </div>
          <div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
              id="photo-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload Photos
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : photos && photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden group">
                <CardContent className="p-0">
                  <img
                    src={getPublicUrl(photo.name)}
                    alt={photo.name}
                    className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="py-20">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">No photos yet</h3>
              <p className="text-muted-foreground mt-1">Upload photos to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
