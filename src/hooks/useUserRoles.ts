 import { useEffect, useState, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "sonner";
 
 type UserRole = "student" | "tutor" | "teacher" | "school_admin";
 
 interface UserRoleRecord {
   id: string;
   user_id: string;
   role: UserRole;
   created_at: string;
 }
 
 export function useUserRoles() {
   const { user, profile, refreshProfile } = useAuth();
   const [roles, setRoles] = useState<UserRole[]>([]);
   const [loading, setLoading] = useState(true);
 
   const fetchRoles = useCallback(async () => {
     if (!user?.id) {
       setRoles([]);
       setLoading(false);
       return;
     }
 
     try {
       const { data, error } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", user.id);
 
       if (error) throw error;
 
       const userRoles = (data || []).map((r) => r.role as UserRole);
       
       // Also include the current profile role if not in user_roles
       if (profile?.role && !userRoles.includes(profile.role)) {
         userRoles.push(profile.role);
       }
 
       setRoles(userRoles);
     } catch (error) {
       console.error("Error fetching user roles:", error);
       // Fallback to profile role
       if (profile?.role) {
         setRoles([profile.role]);
       }
     } finally {
       setLoading(false);
     }
   }, [user?.id, profile?.role]);
 
   useEffect(() => {
     fetchRoles();
   }, [fetchRoles]);
 
   const addRole = async (role: UserRole) => {
     if (!user?.id) return false;
     
     // Check if role already exists
     if (roles.includes(role)) {
       toast.info(`You already have the ${role.replace("_", " ")} role`);
       return false;
     }
 
     try {
       const { error } = await supabase
         .from("user_roles")
         .insert({ user_id: user.id, role });
 
       if (error) throw error;
 
       setRoles((prev) => [...prev, role]);
       toast.success(`Added ${role.replace("_", " ")} role to your account`);
       return true;
     } catch (error: any) {
       console.error("Error adding role:", error);
       toast.error(error.message || "Failed to add role");
       return false;
     }
   };
 
   const switchRole = async (role: UserRole) => {
     if (!user?.id) return false;
     if (profile?.role === role) return true;
 
     // First ensure the role exists in user_roles
     if (!roles.includes(role)) {
       const added = await addRole(role);
       if (!added) return false;
     }
 
     try {
       const { error } = await supabase
         .from("profiles")
         .update({ role })
         .eq("user_id", user.id);
 
       if (error) throw error;
 
       await refreshProfile();
       toast.success(`Switched to ${role.replace("_", " ")} view`);
       return true;
     } catch (error: any) {
       console.error("Error switching role:", error);
       toast.error(error.message || "Failed to switch role");
       return false;
     }
   };
 
   const currentRole = profile?.role || "student";
   const hasMultipleRoles = roles.length > 1;
 
   return {
     roles,
     currentRole,
     hasMultipleRoles,
     loading,
     addRole,
     switchRole,
     refreshRoles: fetchRoles,
   };
 }