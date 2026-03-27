import { useState } from "react";
 import { 
   Users, 
   BookOpen, 
   User, 
   School, 
   ChevronDown, 
   Plus,
   Check,
   Loader2
 } from "lucide-react";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { useUserRoles } from "@/hooks/useUserRoles";
 import { cn } from "@/lib/utils";
 
 type UserRole = "student" | "tutor" | "teacher" | "school_admin";
 
const roleConfig: Record<UserRole, { label: string; icon: typeof BookOpen; color: string }> = {
  student: { label: "Student", icon: BookOpen, color: "text-primary" },
  tutor: { label: "Tutor", icon: User, color: "text-accent" },
  teacher: { label: "Teacher", icon: Users, color: "text-foreground" },
  school_admin: { label: "School Admin", icon: School, color: "text-muted-foreground" },
 };
 
 const allRoles: UserRole[] = ["student", "tutor", "teacher", "school_admin"];
 
interface RoleSwitcherProps {
  collapsed?: boolean;
}

export function RoleSwitcher({ collapsed = false }: RoleSwitcherProps) {
   const { roles, currentRole, switchRole, addRole, loading } = useUserRoles();
   const [switching, setSwitching] = useState(false);
   const [addDialogOpen, setAddDialogOpen] = useState(false);
   const [addingRole, setAddingRole] = useState<UserRole | null>(null);
 
   const CurrentRoleIcon = roleConfig[currentRole as UserRole]?.icon || BookOpen;
   const currentConfig = roleConfig[currentRole as UserRole] || roleConfig.student;
 
   const handleSwitchRole = async (role: UserRole) => {
     if (role === currentRole) return;
     setSwitching(true);
     await switchRole(role);
     setSwitching(false);
   };
 
   const handleAddRole = async (role: UserRole) => {
     setAddingRole(role);
     const success = await addRole(role);
     if (success) {
       setAddDialogOpen(false);
       // Switch to the new role
       await switchRole(role);
     }
     setAddingRole(null);
   };
 
   const availableRolesToAdd = allRoles.filter((r) => !roles.includes(r));
 
   if (loading) {
     return (
      <div className={cn("py-2", collapsed ? "px-1.5" : "px-3")}>
        <div className={cn("bg-sidebar-accent/30 rounded-lg animate-pulse", collapsed ? "h-10 w-10 mx-auto" : "h-10")} />
       </div>
     );
   }
 
   return (
     <>
        <div className={cn("py-2", collapsed ? "px-1.5" : "px-3")}>
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
              <button
                aria-label={`Current role: ${currentConfig.label}`}
                className={cn(
                  "rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors",
                  collapsed
                    ? "h-10 w-10 mx-auto flex items-center justify-center"
                    : "w-full flex items-center gap-3 px-3 py-2.5"
                )}
              >
                <div className={cn("rounded-lg flex items-center justify-center bg-sidebar-accent", currentConfig.color, collapsed ? "w-7 h-7" : "w-8 h-8")}>
                 <CurrentRoleIcon className="w-4 h-4" />
               </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-sidebar-foreground">
                        {currentConfig.label}
                      </p>
                      <p className="text-xs text-sidebar-foreground/50">
                        {roles.length > 1 ? `${roles.length} roles` : "Current role"}
                      </p>
                    </div>
                    {switching ? (
                      <Loader2 className="w-4 h-4 text-sidebar-foreground/50 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-sidebar-foreground/50" />
                    )}
                  </>
                )}
                {collapsed && switching && (
                  <Loader2 className="w-4 h-4 text-sidebar-foreground/50 animate-spin absolute" />
                )}
             </button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="start" className="w-56">
             {roles.map((role) => {
               const config = roleConfig[role];
               const Icon = config.icon;
               const isActive = role === currentRole;
               
               return (
                 <DropdownMenuItem
                   key={role}
                   onClick={() => handleSwitchRole(role)}
                   className="flex items-center gap-3 py-2"
                 >
                   <div className={cn("w-6 h-6 rounded flex items-center justify-center", config.color)}>
                     <Icon className="w-4 h-4" />
                   </div>
                   <span className="flex-1">{config.label}</span>
                   {isActive && <Check className="w-4 h-4 text-primary" />}
                 </DropdownMenuItem>
               );
             })}
             
             {availableRolesToAdd.length > 0 && (
               <>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem
                   onClick={() => setAddDialogOpen(true)}
                   className="flex items-center gap-3 py-2 text-muted-foreground"
                 >
                   <Plus className="w-4 h-4" />
                   <span>Add another role</span>
                 </DropdownMenuItem>
               </>
             )}
           </DropdownMenuContent>
         </DropdownMenu>
       </div>
 
       {/* Add Role Dialog */}
       <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Add a new role</DialogTitle>
             <DialogDescription>
               Select a role to add to your account. You can switch between roles at any time.
             </DialogDescription>
           </DialogHeader>
           
           <div className="grid grid-cols-2 gap-3 mt-4">
             {availableRolesToAdd.map((role) => {
               const config = roleConfig[role];
               const Icon = config.icon;
               
               return (
                 <Button
                   key={role}
                   variant="outline"
                   className="h-auto p-4 flex flex-col items-center gap-2"
                   onClick={() => handleAddRole(role)}
                   disabled={addingRole !== null}
                 >
                   {addingRole === role ? (
                     <Loader2 className="w-6 h-6 animate-spin" />
                   ) : (
                     <Icon className={cn("w-6 h-6", config.color)} />
                   )}
                   <span>{config.label}</span>
                 </Button>
               );
             })}
           </div>
         </DialogContent>
       </Dialog>
     </>
   );
 }