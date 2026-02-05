 import { useRef, useEffect, useState } from "react";
 import { Button } from "@/components/ui/button";
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from "@/components/ui/popover";
 import { Input } from "@/components/ui/input";
 import {
   Paperclip,
   Link2,
   Search,
   X,
   FileText,
   Globe,
   Image as ImageIcon,
   Loader2,
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Attachment } from "@/hooks/useAttachments";
 
 interface ChatAttachmentsProps {
   attachments: Attachment[];
   isUploading: boolean;
   onUploadFile: (file: File, type: "image" | "document") => void;
   onAttachUrl: (url: string) => void;
   onWebSearch: (query: string) => void;
   onRemove: (id: string) => void;
   disabled?: boolean;
 }
 
 export function ChatAttachments({
   attachments,
   isUploading,
   onUploadFile,
   onAttachUrl,
   onWebSearch,
   onRemove,
   disabled = false,
 }: ChatAttachmentsProps) {
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [showUrlInput, setShowUrlInput] = useState(false);
   const [showSearchInput, setShowSearchInput] = useState(false);
   const [urlValue, setUrlValue] = useState("");
   const [searchValue, setSearchValue] = useState("");
 
   // Handle paste events for images and URLs
   useEffect(() => {
     const handlePaste = async (e: ClipboardEvent) => {
       if (disabled) return;
       const items = e.clipboardData?.items;
       if (!items) return;
 
       for (const item of items) {
         if (item.type.startsWith("image/")) {
           e.preventDefault();
           const file = item.getAsFile();
           if (file) {
             onUploadFile(file, "image");
           }
         }
       }
     };
 
     document.addEventListener("paste", handlePaste);
     return () => document.removeEventListener("paste", handlePaste);
   }, [disabled, onUploadFile]);
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const files = Array.from(e.target.files || []);
     for (const file of files) {
       const type = file.type.startsWith("image/") ? "image" : "document";
       onUploadFile(file, type);
     }
     if (fileInputRef.current) {
       fileInputRef.current.value = "";
     }
   };
 
   const handleUrlSubmit = () => {
     if (urlValue.trim()) {
       onAttachUrl(urlValue.trim());
       setUrlValue("");
       setShowUrlInput(false);
     }
   };
 
   const handleSearchSubmit = () => {
     if (searchValue.trim()) {
       onWebSearch(searchValue.trim());
       setSearchValue("");
       setShowSearchInput(false);
     }
   };
 
   const formatFileSize = (bytes: number | null) => {
     if (!bytes) return "";
     if (bytes < 1024) return bytes + " B";
     if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
     return (bytes / (1024 * 1024)).toFixed(1) + " MB";
   };
 
   const getAttachmentIcon = (type: string) => {
     switch (type) {
       case "image":
         return <ImageIcon className="w-4 h-4 text-primary" />;
       case "url":
         return <Globe className="w-4 h-4 text-info" />;
       case "web_search":
         return <Search className="w-4 h-4 text-accent" />;
       default:
         return <FileText className="w-4 h-4 text-muted-foreground" />;
     }
   };
 
   return (
     <div className="space-y-2">
       {/* Attachment previews */}
       {attachments.length > 0 && (
         <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
           {attachments.map((att) => (
             <div
               key={att.id}
               className={cn(
                 "relative flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/50",
                 "max-w-[200px] group",
                 att.isUploading && "opacity-60"
               )}
             >
               {att.isUploading ? (
                 <Loader2 className="w-4 h-4 animate-spin text-primary" />
               ) : (
                 getAttachmentIcon(att.type)
               )}
               
               {att.type === "image" && att.file_url && !att.isUploading && (
                 <img
                   src={att.file_url}
                   alt={att.file_name || "Uploaded image"}
                   className="w-8 h-8 rounded object-cover"
                 />
               )}
               
               <div className="flex-1 min-w-0">
                 <p className="text-xs font-medium truncate">
                   {att.file_name || "Untitled"}
                 </p>
                 {att.file_size && (
                   <p className="text-[10px] text-muted-foreground">
                     {formatFileSize(att.file_size)}
                   </p>
                 )}
               </div>
               
               <Button
                 variant="ghost"
                 size="icon"
                 className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                 onClick={() => onRemove(att.id)}
                 disabled={att.isUploading}
               >
                 <X className="w-3 h-3" />
               </Button>
             </div>
           ))}
         </div>
       )}
 
       {/* Attachment buttons */}
       <div className="flex items-center gap-1">
         {/* File upload */}
         <Button
           variant="ghost"
           size="icon"
           className="h-8 w-8 text-muted-foreground hover:text-foreground"
           onClick={() => fileInputRef.current?.click()}
           disabled={disabled || isUploading}
           title="Upload file or image (Ctrl+V to paste)"
         >
           <Paperclip className="w-4 h-4" />
         </Button>
         <input
           ref={fileInputRef}
           type="file"
           multiple
           accept="image/*,.pdf,.txt,.md,.doc,.docx"
           className="hidden"
           onChange={handleFileSelect}
         />
 
         {/* URL attachment */}
         <Popover open={showUrlInput} onOpenChange={setShowUrlInput}>
           <PopoverTrigger asChild>
             <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-muted-foreground hover:text-foreground"
               disabled={disabled || isUploading}
               title="Attach website URL"
             >
               <Link2 className="w-4 h-4" />
             </Button>
           </PopoverTrigger>
           <PopoverContent className="w-80 p-2" align="start">
             <div className="flex gap-2">
               <Input
                 placeholder="Paste website URL..."
                 value={urlValue}
                 onChange={(e) => setUrlValue(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                 autoFocus
               />
               <Button size="sm" onClick={handleUrlSubmit}>
                 Add
               </Button>
             </div>
           </PopoverContent>
         </Popover>
 
         {/* Web search */}
         <Popover open={showSearchInput} onOpenChange={setShowSearchInput}>
           <PopoverTrigger asChild>
             <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-muted-foreground hover:text-foreground"
               disabled={disabled || isUploading}
               title="Search the web"
             >
               <Search className="w-4 h-4" />
             </Button>
           </PopoverTrigger>
           <PopoverContent className="w-80 p-2" align="start">
             <div className="flex gap-2">
               <Input
                 placeholder="Search the web..."
                 value={searchValue}
                 onChange={(e) => setSearchValue(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                 autoFocus
               />
               <Button size="sm" onClick={handleSearchSubmit}>
                 <Search className="w-3 h-3 mr-1" />
                 Search
               </Button>
             </div>
           </PopoverContent>
         </Popover>
       </div>
     </div>
   );
 }