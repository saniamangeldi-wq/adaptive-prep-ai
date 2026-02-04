import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Trash2,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  file: File;
  status: "pending" | "processing" | "success" | "error";
  progress: number;
  result?: {
    testId: string;
    testName: string;
    questionsCount: number;
  };
  error?: string;
}

export default function UploadTests() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Check if user is admin (for now, check if role is school_admin)
  const isAdmin = profile?.role === "school_admin";

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === "application/pdf"
    );
    
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === "application/pdf"
      );
      addFiles(selectedFiles);
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
      file,
      status: "pending",
      progress: 0,
    }));
    setFiles(prev => [...prev, ...uploadedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFile = async (fileIndex: number) => {
    const uploadedFile = files[fileIndex];
    if (!uploadedFile || uploadedFile.status !== "pending") return;

    setFiles(prev => prev.map((f, i) => 
      i === fileIndex ? { ...f, status: "processing", progress: 10 } : f
    ));

    try {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Convert file to base64
      const base64 = await fileToBase64(uploadedFile.file);

      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, progress: 30 } : f
      ));

      // Call edge function to process PDF
      const { data, error } = await supabase.functions.invoke("process-sat-pdf", {
        body: {
          fileName: uploadedFile.file.name,
          fileBase64: base64,
        },
      });

      if (error) throw error;

      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { 
          ...f, 
          status: "success", 
          progress: 100,
          result: data
        } : f
      ));

      toast({
        title: "Test processed successfully!",
        description: `Added "${data.testName}" with ${data.questionsCount} questions.`,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { 
          ...f, 
          status: "error", 
          progress: 0,
          error: error instanceof Error ? error.message : "Failed to process PDF"
        } : f
      ));

      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process PDF",
        variant: "destructive",
      });
    }
  };

  const processAllPending = async () => {
    const pendingIndices = files
      .map((f, i) => f.status === "pending" ? i : -1)
      .filter(i => i !== -1);

    for (const index of pendingIndices) {
      await processFile(index);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page. Admin access is required to upload SAT tests.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const pendingCount = files.filter(f => f.status === "pending").length;
  const successCount = files.filter(f => f.status === "success").length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Upload SAT Tests</h1>
          <p className="text-muted-foreground mt-1">
            Upload PDF practice tests to extract questions for students
          </p>
        </div>

        {/* Upload Zone */}
        <Card
          className={cn(
            "border-2 border-dashed p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-border"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Drop PDF files here
          </h3>
          <p className="text-muted-foreground mb-4">
            or click to browse your computer
          </p>
          <Input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-upload"
          />
          <Label htmlFor="pdf-upload">
            <Button variant="outline" asChild>
              <span>Browse Files</span>
            </Button>
          </Label>
        </Card>

        {/* Supported Formats Info */}
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground">Supported Formats</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• College Board Official SAT Practice Tests (PDFs)</li>
                <li>• Khan Academy SAT Practice Tests</li>
                <li>• Tests must include questions and answer keys</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Uploaded Files ({files.length})
              </h2>
              {pendingCount > 0 && (
                <Button onClick={processAllPending} variant="hero">
                  Process All ({pendingCount})
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {files.map((uploadedFile, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center gap-4">
                    <FileText className={cn(
                      "w-10 h-10",
                      uploadedFile.status === "success" ? "text-green-500" :
                      uploadedFile.status === "error" ? "text-destructive" :
                      "text-muted-foreground"
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {uploadedFile.file.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      
                      {uploadedFile.status === "processing" && (
                        <Progress value={uploadedFile.progress} className="mt-2 h-2" />
                      )}
                      
                      {uploadedFile.status === "success" && uploadedFile.result && (
                        <p className="text-sm text-green-600 mt-1">
                          ✓ Added {uploadedFile.result.questionsCount} questions
                        </p>
                      )}
                      
                      {uploadedFile.status === "error" && (
                        <p className="text-sm text-destructive mt-1">
                          {uploadedFile.error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {uploadedFile.status === "pending" && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => processFile(index)}
                          >
                            Process
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeFile(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      
                      {uploadedFile.status === "processing" && (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      )}
                      
                      {uploadedFile.status === "success" && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      
                      {uploadedFile.status === "error" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setFiles(prev => prev.map((f, i) => 
                              i === index ? { ...f, status: "pending", error: undefined } : f
                            ));
                          }}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {successCount > 0 && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-green-600 font-medium">
                  ✓ {successCount} test{successCount > 1 ? "s" : ""} processed successfully!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Questions are now available in the Practice Tests section.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
