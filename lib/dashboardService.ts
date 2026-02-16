import { supabase } from "@/lib/supabaseClient";
import type { DashboardData } from "@/lib/dashboardTypes";

export type DashboardLoadResult =
  | { status: "ok"; data: DashboardData }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

export async function loadDashboardData(): Promise<DashboardLoadResult> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    return { status: "error", message: sessionErr.message };
  }

  if (!sessionData.session) {
    return { status: "unauthenticated" };
  }

  const user = sessionData.session.user;
  const userId = user.id;

  const [workoutsCountRes, bodyweightCountRes, latestWorkoutRes, latestBodyweightRes] =
    await Promise.all([
      supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("bodyweight_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("workout_sessions")
        .select("session_date,split")
        .eq("user_id", userId)
        .order("session_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("bodyweight_logs")
        .select("log_date,weight_input,unit_input")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (
    workoutsCountRes.error ||
    bodyweightCountRes.error ||
    latestWorkoutRes.error ||
    latestBodyweightRes.error
  ) {
    return {
      status: "error",
      message:
        workoutsCountRes.error?.message ||
        bodyweightCountRes.error?.message ||
        latestWorkoutRes.error?.message ||
        latestBodyweightRes.error?.message ||
        "Failed to load dashboard.",
    };
  }

  return {
    status: "ok",
    data: {
      email: user.email ?? "Athlete",
      workoutCount: workoutsCountRes.count ?? 0,
      bodyweightCount: bodyweightCountRes.count ?? 0,
      latestWorkout: (latestWorkoutRes.data as DashboardData["latestWorkout"]) ?? null,
      latestBodyweight: (latestBodyweightRes.data as DashboardData["latestBodyweight"]) ?? null,
    },
  };
}
