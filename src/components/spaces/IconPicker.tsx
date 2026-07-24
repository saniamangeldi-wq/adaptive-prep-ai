import { useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRESET_ICONS = [
  "🎓", "📚", "📖", "✏️", "📝", "🧠", "💡", "🔬",
  "🧪", "🧮", "📐", "📊", "📈", "🌍", "🗺️", "🏛️",
  "⚗️", "🔭", "💻", "⌨️", "🎨", "🎭", "🎵", "🏆",
  "⭐", "🚀", "🎯", "🔥", "💼", "📅", "🗂️", "📌",
];



const MAX_SIZE = 512 * 1024; // 512KB

export function isImageIcon(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
}

export function SpaceIconDisplay({ icon, className, imgClassName }: { icon: string; className?: string; imgClassName?: string }) {
  if (isImageIcon(icon)) {
    return (
      <img
        src={icon}
        alt="Space icon"
        className={cn("w-full h-full object-cover rounded-md", imgClassName)}
      />
    );
  }
  return <span className={className}>{icon}</span>;
}

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!/image\/(png|svg\+xml|jpeg|jpg|webp|gif)/.test(file.type)) {
      toast.error("Please upload a PNG, SVG, JPG, WEBP, or GIF");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Image must be under 512KB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/space-icons/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("generated-documents")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("generated-documents").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Icon uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-muted/40 border border-border/30 flex items-center justify-center overflow-hidden text-3xl">
          <SpaceIconDisplay icon={value} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowEmoji((s) => !s)}
          >
            {showEmoji ? "Close emoji" : "Choose emoji"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="gap-1.5"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload image
          </Button>
          {isImageIcon(value) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("🎓")}
              className="gap-1 text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {showEmoji && (
        <div className="rounded-lg overflow-hidden border border-border/30">
          <EmojiPicker
            onEmojiClick={(e) => {
              onChange(e.emoji);
              setShowEmoji(false);
            }}
            theme={Theme.DARK}
            emojiStyle={EmojiStyle.NATIVE}
            width="100%"
            height={340}
            searchPlaceholder="Search emoji..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground/60">
        Pick any emoji or upload a small image (PNG, SVG, JPG — max 512KB).
      </p>
    </div>
  );
}
