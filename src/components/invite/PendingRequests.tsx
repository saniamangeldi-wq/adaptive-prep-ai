 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Check, X, Clock, User } from "lucide-react";
 import { toast } from "sonner";
 
 interface JoinRequest {
   id: string;
   student_user_id: string;
   student_email: string | null;
   student_name: string | null;
   status: string;
   created_at: string;
 }
 
 interface PendingRequestsProps {
   targetType: "tutor" | "school";
   targetId: string;
  onApprove?: () => void;
 }
 
export function PendingRequests({ targetType, targetId, onApprove }: PendingRequestsProps) {
   const [requests, setRequests] = useState<JoinRequest[]>([]);
   const [loading, setLoading] = useState(true);
 
   const fetchRequests = async () => {
     if (!targetId) return;
 
     const { data, error } = await supabase
       .from("join_requests")
       .select("*")
       .eq("target_type", targetType)
       .eq("target_id", targetId)
       .eq("status", "pending")
       .order("created_at", { ascending: false });
 
     if (error) {
       console.error("Error fetching requests:", error);
     } else {
       setRequests(data || []);
     }
     setLoading(false);
   };
 
   useEffect(() => {
     fetchRequests();
   }, [targetId, targetType]);
 
   const handleApprove = async (request: JoinRequest) => {
     try {
       // Update request status
       const { error: updateError } = await supabase
         .from("join_requests")
         .update({ status: "approved" })
         .eq("id", request.id);
 
       if (updateError) throw updateError;
 
       // Add to appropriate relationship table
       if (targetType === "tutor") {
         const { error: relationError } = await supabase
           .from("tutor_students")
           .insert({ tutor_id: targetId, student_id: request.student_user_id });
         if (relationError && !relationError.message.includes("duplicate")) throw relationError;
       } else if (targetType === "school") {
         const { error: memberError } = await supabase
           .from("school_members")
           .insert({ school_id: targetId, user_id: request.student_user_id, role: "student", status: "active" });
         if (memberError && !memberError.message.includes("duplicate")) throw memberError;
       }
 
       toast.success("Student approved!");
       fetchRequests();
      onApprove?.();
     } catch (error: any) {
       console.error("Error approving:", error);
       toast.error(error.message || "Failed to approve");
     }
   };
 
   const handleReject = async (requestId: string) => {
     try {
       const { error } = await supabase
         .from("join_requests")
         .update({ status: "rejected" })
         .eq("id", requestId);
 
       if (error) throw error;
       toast.success("Request rejected");
       fetchRequests();
     } catch (error: any) {
       toast.error(error.message || "Failed to reject");
     }
   };
 
   if (loading) {
     return (
       <div className="p-6 rounded-2xl bg-card border border-border/50">
         <div className="animate-pulse h-20 bg-muted rounded" />
       </div>
     );
   }
 
   return (
     <div className="p-6 rounded-2xl bg-card border border-border/50">
       <div className="flex items-center gap-3 mb-4">
         <Clock className="w-5 h-5 text-amber-500" />
         <h3 className="font-semibold text-foreground">Pending Requests</h3>
         {requests.length > 0 && (
           <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-medium">
             {requests.length}
           </span>
         )}
       </div>
 
       {requests.length === 0 ? (
         <p className="text-muted-foreground text-center py-8">No pending requests</p>
       ) : (
         <div className="space-y-3">
           {requests.map((request) => (
             <div key={request.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                   <User className="w-5 h-5 text-primary" />
                 </div>
                 <div>
                   <p className="font-medium text-foreground">{request.student_name || "Student"}</p>
                   <p className="text-sm text-muted-foreground">{request.student_email || "No email"}</p>
                 </div>
               </div>
               <div className="flex gap-2">
                 <Button size="sm" variant="outline" onClick={() => handleReject(request.id)}>
                   <X className="w-4 h-4" />
                 </Button>
                 <Button size="sm" variant="hero" onClick={() => handleApprove(request)}>
                   <Check className="w-4 h-4" />
                 </Button>
               </div>
             </div>
           ))}
         </div>
       )}
     </div>
   );
 }