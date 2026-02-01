import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Award, 
  PenTool, 
  X, 
  Loader2,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface UploadedFile {
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

interface PortfolioUploadProps {
  onComplete: () => void;
}

export function PortfolioUpload({ onComplete }: PortfolioUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [academicDocs, setAcademicDocs] = useState<UploadedFile[]>([]);
  const [extracurricularDocs, setExtracurricularDocs] = useState<UploadedFile[]>([]);
  const [essays, setEssays] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing portfolio
  useEffect(() => {
    async function loadPortfolio() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("student_portfolios")
          .select("*")
          .eq("student_id", user.id)
          .maybeSingle();

        if (data) {
          setAcademicDocs((data.academic_docs as unknown as UploadedFile[]) || []);
          setExtracurricularDocs((data.extracurricular_docs as unknown as UploadedFile[]) || []);
          setEssays(data.essays || "");
        }
      } catch (err) {
        console.error("Error loading portfolio:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPortfolio();
  }, [user]);

  const uploadFile = useCallback(async (
    file: File, 
    category: "academic" | "extracurricular"
  ) => {
    if (!user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${category}/${Date.now()}.${fileExt}`;

    setUploading(category);
    setUploadProgress(0);

    // Simulate progress (Supabase doesn't have real progress events)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    try {
      const { error: uploadError, data } = await supabase.storage
        .from("portfolios")
        .upload(fileName, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("portfolios")
        .getPublicUrl(fileName);

      const newFile: UploadedFile = {
        name: file.name,
        url: publicUrl,
        type: file.type,
        uploadedAt: new Date().toISOString()
      };

      if (category === "academic") {
        setAcademicDocs(prev => [...prev, newFile]);
      } else {
        setExtracurricularDocs(prev => [...prev, newFile]);
      }

      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded successfully.`
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: err.message || "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
      setUploadProgress(0);
    }
  }, [user, toast]);

  const removeFile = (category: "academic" | "extracurricular", index: number) => {
    if (category === "academic") {
      setAcademicDocs(prev => prev.filter((_, i) => i !== index));
    } else {
      setExtracurricularDocs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>, 
    category: "academic" | "extracurricular"
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0], category);
    }
  };

  const saveAndContinue = async () => {
    if (!user) return;

    setSaving(true);

    try {
      // Check if portfolio exists
      const { data: existing } = await supabase
        .from("student_portfolios")
        .select("id")
        .eq("student_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("student_portfolios")
          .update({
            academic_docs: academicDocs as unknown as any,
            extracurricular_docs: extracurricularDocs as unknown as any,
            essays: essays,
            updated_at: new Date().toISOString()
          })
          .eq("student_id", user.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("student_portfolios")
          .insert({
            student_id: user.id,
            academic_docs: academicDocs as unknown as any,
            extracurricular_docs: extracurricularDocs as unknown as any,
            essays: essays
          });
        
        if (error) throw error;
      }

      toast({
        title: "Portfolio saved",
        description: "Your portfolio has been saved successfully."
      });

      onComplete();
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: "Save failed",
        description: err.message || "Failed to save portfolio",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const hasContent = academicDocs.length > 0 || extracurricularDocs.length > 0 || essays.trim().length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Academic Documents */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Academic Documents</h3>
            <p className="text-sm text-muted-foreground">
              Transcripts, SAT/ACT scores, AP/IB results, certificates
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {academicDocs.map((file, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-foreground truncate max-w-xs">
                  {file.name}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => removeFile("academic", index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => handleFileSelect(e, "academic")}
              disabled={uploading === "academic"}
            />
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              {uploading === "academic" ? (
                <div className="space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  <Progress value={uploadProgress} className="h-1 w-32 mx-auto" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload academic documents
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    PDF, DOC, DOCX, JPG, PNG (max 10MB)
                  </p>
                </>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Extracurricular Documents */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Award className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Extracurricular Portfolio</h3>
            <p className="text-sm text-muted-foreground">
              Sports, clubs, volunteer work, art/music portfolios
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {extracurricularDocs.map((file, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-foreground truncate max-w-xs">
                  {file.name}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => removeFile("extracurricular", index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => handleFileSelect(e, "extracurricular")}
              disabled={uploading === "extracurricular"}
            />
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              {uploading === "extracurricular" ? (
                <div className="space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  <Progress value={uploadProgress} className="h-1 w-32 mx-auto" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload extracurricular documents
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    PDF, DOC, DOCX, JPG, PNG (max 10MB)
                  </p>
                </>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Essays */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <PenTool className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Essays & Writing Samples</h3>
            <p className="text-sm text-muted-foreground">
              Personal statements, research papers, creative writing
            </p>
          </div>
        </div>

        <Textarea
          placeholder="Paste your essay or writing sample here..."
          value={essays}
          onChange={(e) => setEssays(e.target.value)}
          className="min-h-[200px] resize-y"
        />
        <p className="text-xs text-muted-foreground text-right">
          {essays.length} characters
        </p>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button 
          onClick={saveAndContinue}
          disabled={!hasContent || saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue to Preferences
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
