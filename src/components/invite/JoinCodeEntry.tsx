 import { useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { UserPlus, Loader2 } from "lucide-react";
 import { toast } from "sonner";
 
 export function JoinCodeEntry() {
   const { user, profile } = useAuth();
   const [code, setCode] = useState("");
   const [loading, setLoading] = useState(false);
   const [open, setOpen] = useState(false);
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user?.id || !code.trim()) return;
 
     setLoading(true);
     const upperCode = code.trim().toUpperCase();
 
     try {
       // First check tutor codes
       const { data: tutorCode } = await supabase
         .from("tutor_invite_codes")
         .select("tutor_user_id")
         .eq("invite_code", upperCode)
         .maybeSingle();
 
       if (tutorCode) {
         // Check if already requested
         const { data: existing } = await supabase
           .from("join_requests")
           .select("id, status")
           .eq("student_user_id", user.id)
           .eq("target_type", "tutor")
           .eq("target_id", tutorCode.tutor_user_id)
           .maybeSingle();
 
         if (existing) {
           if (existing.status === "pending") {
             toast.info("You already have a pending request for this tutor");
           } else if (existing.status === "approved") {
             toast.info("You're already connected with this tutor");
           } else {
             toast.error("Your previous request was rejected");
           }
           setLoading(false);
           return;
         }
 
         // Create join request
         const { error } = await supabase.from("join_requests").insert({
           student_user_id: user.id,
           target_type: "tutor",
           target_id: tutorCode.tutor_user_id,
           invite_code: upperCode,
           student_email: profile?.email,
           student_name: profile?.full_name,
         });
 
         if (error) throw error;
         toast.success("Request sent! Waiting for tutor approval.");
         setCode("");
         setOpen(false);
         setLoading(false);
         return;
       }
 
       // Check school admin codes
       const { data: adminCode } = await supabase
         .from("admin_invite_codes")
         .select("school_id")
         .eq("invite_code", upperCode)
         .maybeSingle();
 
       if (adminCode) {
         // Check if already requested
         const { data: existing } = await supabase
           .from("join_requests")
           .select("id, status")
           .eq("student_user_id", user.id)
           .eq("target_type", "school")
           .eq("target_id", adminCode.school_id)
           .maybeSingle();
 
         if (existing) {
           if (existing.status === "pending") {
             toast.info("You already have a pending request for this school");
           } else if (existing.status === "approved") {
             toast.info("You're already a member of this school");
           } else {
             toast.error("Your previous request was rejected");
           }
           setLoading(false);
           return;
         }
 
         // Create join request
         const { error } = await supabase.from("join_requests").insert({
           student_user_id: user.id,
           target_type: "school",
           target_id: adminCode.school_id,
           invite_code: upperCode,
           student_email: profile?.email,
           student_name: profile?.full_name,
         });
 
         if (error) throw error;
         toast.success("Request sent! Waiting for school approval.");
         setCode("");
         setOpen(false);
         setLoading(false);
         return;
       }
 
       toast.error("Invalid invite code");
     } catch (error: any) {
       console.error("Error:", error);
       toast.error(error.message || "Failed to submit request");
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={setOpen}>
       <DialogTrigger asChild>
         <Button variant="outline" size="sm" className="gap-2">
           <UserPlus className="w-4 h-4" />
           Join with Code
         </Button>
       </DialogTrigger>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>Join a Tutor or School</DialogTitle>
         </DialogHeader>
         <form onSubmit={handleSubmit} className="space-y-4 mt-4">
           <div>
             <label className="text-sm font-medium text-foreground">Enter Invite Code</label>
             <Input
               value={code}
               onChange={(e) => setCode(e.target.value.toUpperCase())}
               placeholder="XXXXXXXX"
               className="mt-1 font-mono text-center tracking-widest"
               maxLength={8}
             />
             <p className="text-xs text-muted-foreground mt-2">
               Ask your tutor or school admin for their invite code
             </p>
           </div>
           <Button type="submit" variant="hero" className="w-full" disabled={loading || !code.trim()}>
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request to Join"}
           </Button>
         </form>
       </DialogContent>
     </Dialog>
   );
 }