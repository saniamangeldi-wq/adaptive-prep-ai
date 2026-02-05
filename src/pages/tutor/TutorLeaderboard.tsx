import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, Plus, Flame, Target, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface StudentGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface StudentPoints {
  id: string;
  student_id: string;
  points: number;
  assignments_completed: number;
  streak_days: number;
  last_activity?: string;
  school_id?: string | null;
  tutor_id?: string;
  updated_at?: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

interface Student {
  student_id: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

export default function TutorLeaderboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [leaderboard, setLeaderboard] = useState<StudentPoints[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addPointsOpen, setAddPointsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [pointsToAdd, setPointsToAdd] = useState("10");

  useEffect(() => {
    loadData();
  }, [user?.id]);

  useEffect(() => {
    if (selectedGroup) {
      loadLeaderboard();
    }
  }, [selectedGroup]);

  async function loadData() {
    if (!user?.id) return;

    try {
      // Load groups
      const { data: groupsData } = await supabase
        .from("student_groups")
        .select("*")
        .eq("tutor_id", user.id)
        .order("created_at", { ascending: false });

      setGroups(groupsData || []);

      // Load all tutor's students
      const { data: tutorStudents } = await supabase
        .from("tutor_students")
        .select("student_id")
        .eq("tutor_id", user.id);

      if (tutorStudents && tutorStudents.length > 0) {
        const studentIds = tutorStudents.map(ts => ts.student_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", studentIds);

        setStudents(tutorStudents.map(ts => ({
          student_id: ts.student_id,
          profile: profiles?.find(p => p.user_id === ts.student_id),
        })));
      }

      // Load leaderboard
      await loadLeaderboard();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaderboard() {
    if (!user?.id) return;

    try {
      let studentIds: string[] = [];

      if (selectedGroup === "all") {
        // All students
        const { data: tutorStudents } = await supabase
          .from("tutor_students")
          .select("student_id")
          .eq("tutor_id", user.id);
        studentIds = tutorStudents?.map(ts => ts.student_id) || [];
      } else {
        // Students in selected group
        const { data: members } = await supabase
          .from("group_members")
          .select("student_id")
          .eq("group_id", selectedGroup);
        studentIds = members?.map(m => m.student_id) || [];
      }

      if (studentIds.length === 0) {
        setLeaderboard([]);
        return;
      }

      // Get or create points for each student
      const { data: pointsData } = await supabase
        .from("student_points")
        .select("*")
        .eq("tutor_id", user.id)
        .in("student_id", studentIds)
        .order("points", { ascending: false });

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", studentIds);

      const leaderboardData = (pointsData || []).map(p => ({
        ...p,
        profile: profiles?.find(pr => pr.user_id === p.student_id),
      }));

      // Add students without points yet
      const existingStudentIds = new Set(leaderboardData.map(l => l.student_id));
      studentIds.forEach(sid => {
        if (!existingStudentIds.has(sid)) {
          leaderboardData.push({
            id: `temp-${sid}`,
            student_id: sid,
            points: 0,
            assignments_completed: 0,
            streak_days: 0,
            last_activity: new Date().toISOString(),
            school_id: null,
            tutor_id: user.id,
            updated_at: new Date().toISOString(),
            profile: profiles?.find(pr => pr.user_id === sid),
          });
        }
      });

      // Sort by points
      leaderboardData.sort((a, b) => b.points - a.points);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  }

  async function handleCreateGroup() {
    if (!groupName.trim() || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from("student_groups")
        .insert({
          tutor_id: user.id,
          name: groupName,
        })
        .select()
        .single();

      if (error) throw error;

      setGroups(prev => [data, ...prev]);
      setCreateGroupOpen(false);
      setGroupName("");
      toast.success("Group created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create group");
    }
  }

  async function handleAddPoints() {
    if (!selectedStudent || !user?.id) return;

    const points = parseInt(pointsToAdd) || 0;
    if (points === 0) return;

    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("student_points")
        .select("id, points")
        .eq("student_id", selectedStudent)
        .eq("tutor_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("student_points")
          .update({ points: existing.points + points, last_activity: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("student_points")
          .insert({
            student_id: selectedStudent,
            tutor_id: user.id,
            points,
          });
      }

      await loadLeaderboard();
      setAddPointsOpen(false);
      setSelectedStudent("");
      setPointsToAdd("10");
      toast.success(`Added ${points} points!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to add points");
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">🏆 Leaderboard</h1>
            <p className="text-muted-foreground mt-1">
              Track student progress and award points
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Student Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name"
                  />
                  <Button variant="hero" className="w-full" onClick={handleCreateGroup}>
                    Create Group
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={addPointsOpen} onOpenChange={setAddPointsOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm">
                  <Plus className="w-4 h-4" />
                  Add Points
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Award Points</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Student</label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(s => (
                          <SelectItem key={s.student_id} value={s.student_id}>
                            {s.profile?.full_name || s.profile?.email || "Student"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Points</label>
                    <Input
                      type="number"
                      value={pointsToAdd}
                      onChange={(e) => setPointsToAdd(e.target.value)}
                      min="1"
                    />
                  </div>
                  <Button variant="hero" className="w-full" onClick={handleAddPoints}>
                    Award Points
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Group Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedGroup === "all" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setSelectedGroup("all")}
          >
            All Students
          </Button>
          {groups.map(group => (
            <Button
              key={group.id}
              variant={selectedGroup === group.id ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSelectedGroup(group.id)}
            >
              {group.name}
            </Button>
          ))}
        </div>

        {/* Leaderboard */}
        {leaderboard.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No students yet</h3>
            <p className="text-muted-foreground">
              Add students to start tracking their progress
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 border-b border-border bg-muted/30 text-sm font-medium text-muted-foreground">
              <div className="w-12">Rank</div>
              <div>Student</div>
              <div className="text-center w-24">Points</div>
              <div className="text-center w-24 hidden sm:block">Completed</div>
              <div className="text-center w-24 hidden sm:block">Streak</div>
            </div>
            {/* Rows */}
            <div className="divide-y divide-border">
              {leaderboard.map((student, idx) => (
                <div
                  key={student.id}
                  className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 items-center ${
                    idx < 3 ? "bg-gradient-to-r from-primary/5 to-transparent" : ""
                  }`}
                >
                  <div className="w-12 text-center">
                    {idx === 0 && <span className="text-2xl">🥇</span>}
                    {idx === 1 && <span className="text-2xl">🥈</span>}
                    {idx === 2 && <span className="text-2xl">🥉</span>}
                    {idx > 2 && <span className="text-lg font-bold text-muted-foreground">{idx + 1}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center text-white font-medium">
                      {student.profile?.full_name?.[0] || student.profile?.email?.[0]?.toUpperCase() || "S"}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {student.profile?.full_name || "Student"}
                      </p>
                      <p className="text-sm text-muted-foreground">{student.profile?.email}</p>
                    </div>
                  </div>
                  <div className="text-center w-24">
                    <span className="text-xl font-bold text-primary">{student.points}</span>
                  </div>
                  <div className="text-center w-24 hidden sm:flex items-center justify-center gap-1 text-muted-foreground">
                    <Target className="w-4 h-4" />
                    {student.assignments_completed}
                  </div>
                  <div className="text-center w-24 hidden sm:flex items-center justify-center gap-1">
                    {student.streak_days > 0 ? (
                      <>
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="text-orange-400 font-medium">{student.streak_days}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
