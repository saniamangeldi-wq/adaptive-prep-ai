import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAffiliation } from "@/hooks/useStudentAffiliation";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  subject: string | null;
}

const eventIcons: Record<string, string> = {
  exam: "📝",
  lesson: "📖",
  assignment: "📋",
  meeting: "👥",
  holiday: "🎉",
};

const eventColors: Record<string, string> = {
  exam: "bg-red-500/20 text-red-400 border-red-500/30",
  lesson: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  assignment: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  meeting: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  holiday: "bg-green-500/20 text-green-400 border-green-500/30",
};

export default function Calendar() {
  const { user } = useAuth();
  const { affiliation, loading: affiliationLoading } = useStudentAffiliation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [view, setView] = useState<"month" | "list">("month");

  useEffect(() => {
    async function loadEvents() {
      if (!user?.id || affiliationLoading) return;

      try {
        const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

        let query = supabase
          .from("calendar_events")
          .select("*")
          .gte("start_time", startOfMonth.toISOString())
          .lte("start_time", endOfMonth.toISOString())
          .order("start_time", { ascending: true });

        if (affiliation?.type === "school") {
          query = query.eq("school_id", affiliation.id);
        } else if (affiliation?.type === "tutor") {
          query = query.eq("tutor_id", affiliation.id);
        }

        const { data, error } = await query;

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error("Error loading events:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [user?.id, affiliation, affiliationLoading, selectedMonth]);

  const prevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  // Generate calendar days
  const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  function getEventsForDay(day: number | null): CalendarEvent[] {
    if (!day) return [];
    const dateStr = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day).toDateString();
    return events.filter((e) => new Date(e.start_time).toDateString() === dateStr);
  }

  if (loading || affiliationLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96" />
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">📅 Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View upcoming exams, lessons, and events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
            >
              Month
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
            >
              List
            </Button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground">
            {selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {view === "month" ? (
          /* Month View */
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const isToday =
                  day &&
                  new Date().toDateString() ===
                    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day).toDateString();

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] p-2 border-b border-r border-border ${
                      !day ? "bg-muted/20" : ""
                    } ${isToday ? "bg-primary/5" : ""}`}
                  >
                    {day && (
                      <>
                        <div
                          className={`text-sm font-medium mb-1 ${
                            isToday ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className={`text-xs px-1.5 py-0.5 rounded truncate border ${
                                eventColors[event.event_type] || "bg-muted text-muted-foreground"
                              }`}
                              title={event.title}
                            >
                              {eventIcons[event.event_type]} {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No events this month</h3>
                <p className="text-muted-foreground">
                  Check back later or browse other months
                </p>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-xl bg-card border border-border/50 flex items-start gap-4"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                      eventColors[event.event_type] || "bg-muted"
                    }`}
                  >
                    {eventIcons[event.event_type] || "📅"}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.start_time).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                    )}
                    {event.location && (
                      <p className="text-xs text-muted-foreground mt-1">📍 {event.location}</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      eventColors[event.event_type] || "bg-muted text-muted-foreground"
                    }`}
                  >
                    {event.event_type}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-card border border-border/50">
          {Object.entries(eventIcons).map(([type, icon]) => (
            <div key={type} className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  eventColors[type] || "bg-muted"
                }`}
              >
                {icon}
              </span>
              <span className="text-sm text-muted-foreground capitalize">{type}s</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
