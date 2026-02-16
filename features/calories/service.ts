import { supabase } from "@/lib/supabaseClient";
import type { CaloriesLog, PendingOverwrite } from "@/features/calories/types";

export async function getCurrentUserId(): Promise<{ userId: string | null; error: string | null }> {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) {
    return { userId: null, error: error.message };
  }

  return { userId: sessionData.session?.user.id ?? null, error: null };
}

export async function loadCaloriesLogsForCurrentUser(): Promise<{
  logs: CaloriesLog[];
  error: string | null;
}> {
  const { userId, error: userError } = await getCurrentUserId();
  if (userError) {
    return { logs: [], error: userError };
  }

  if (!userId) {
    return { logs: [], error: null };
  }

  const { data, error } = await supabase
    .from("calories_logs")
    .select("*")
    .eq("user_id", userId)
    .order("log_date", { ascending: false });

  if (error) {
    return { logs: [], error: error.message };
  }

  return { logs: (data ?? []) as CaloriesLog[], error: null };
}

export async function upsertCaloriesEntry(payload: PendingOverwrite): Promise<string | null> {
  const { error } = await supabase
    .from("calories_logs")
    .upsert(
      {
        user_id: payload.userId,
        log_date: payload.logDate,
        pre_workout_kcal: payload.preWorkoutKcal,
        post_workout_kcal: payload.postWorkoutKcal,
      },
      { onConflict: "user_id,log_date" }
    );

  return error ? error.message : null;
}

export async function deleteCaloriesLogForCurrentUser(
  logId: string | number
): Promise<{ deleted: boolean; error: string | null }> {
  const { userId, error: userError } = await getCurrentUserId();
  if (userError) {
    return { deleted: false, error: userError };
  }

  if (!userId) {
    return { deleted: false, error: "Not logged in." };
  }

  const { error } = await supabase
    .from("calories_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId);

  if (error) {
    return { deleted: false, error: error.message };
  }

  return { deleted: true, error: null };
}

export async function updateCaloriesLogForCurrentUser(
  logId: string | number,
  payload: {
    logDate: string;
    preWorkoutKcal: number | null;
    postWorkoutKcal: number | null;
  }
): Promise<string | null> {
  const { userId, error: userError } = await getCurrentUserId();
  if (userError) {
    return userError;
  }

  if (!userId) {
    return "Not logged in.";
  }

  const { error } = await supabase
    .from("calories_logs")
    .update({
      log_date: payload.logDate,
      pre_workout_kcal: payload.preWorkoutKcal,
      post_workout_kcal: payload.postWorkoutKcal,
    })
    .eq("id", logId)
    .eq("user_id", userId);

  return error ? error.message : null;
}
