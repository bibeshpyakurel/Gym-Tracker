import { useCallback, useEffect, useState } from "react";
import type { Unit } from "@/lib/convertWeight";
import { supabase } from "@/lib/supabaseClient";
import { getDaysAgo } from "@/features/log/formatters";
import type {
  DurationSet,
  Exercise,
  LastSessionInfo,
  RecentWorkoutSession,
  Split,
  WeightedSet,
} from "@/features/log/types";

type UseLogSessionDataParams = {
  split: Split;
  date: string;
  setMsg: (message: string | null) => void;
};

export function useLogSessionData({ split, date, setMsg }: UseLogSessionDataParams) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lastSessionBySplit, setLastSessionBySplit] = useState<Partial<Record<Split, LastSessionInfo>>>({});
  const [recentSessions, setRecentSessions] = useState<RecentWorkoutSession[]>([]);
  const [weightedForm, setWeightedForm] = useState<Record<string, [WeightedSet, WeightedSet]>>({});
  const [durationForm, setDurationForm] = useState<Record<string, [DurationSet, DurationSet]>>({});
  const [lastModifiedBySetKey, setLastModifiedBySetKey] = useState<Record<string, string>>({});

  const loadLastSessions = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLastSessionBySplit({});
      return;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from("workout_sessions")
      .select("split,session_date")
      .eq("user_id", userId)
      .order("session_date", { ascending: false });

    if (error || !data) return;

    const next: Partial<Record<Split, LastSessionInfo>> = {};
    for (const row of data as Array<{ split: Split; session_date: string }>) {
      if (!next[row.split]) {
        next[row.split] = {
          sessionDate: row.session_date,
          daysAgo: getDaysAgo(row.session_date),
        };
      }
    }

    setLastSessionBySplit(next);
  }, []);

  const loadRecentSessions = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setRecentSessions([]);
      return;
    }

    const userId = sessionData.session.user.id;
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("id,split,session_date")
      .eq("user_id", userId)
      .eq("split", split)
      .order("session_date", { ascending: false })
      .limit(5);

    if (error) {
      setRecentSessions([]);
      return;
    }

    setRecentSessions((data ?? []) as RecentWorkoutSession[]);
  }, [split]);

  useEffect(() => {
    (async () => {
      setMsg(null);

      void loadLastSessions();
      void loadRecentSessions();

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setMsg("Not logged in. Go to /login first.");
        setExercises([]);
        return;
      }

      const { data, error } = await supabase
        .from("exercises")
        .select("id,name,split,muscle_group,metric_type,sort_order")
        .eq("split", split)
        .eq("is_active", true)
        .order("sort_order");

      if (error) {
        setMsg(`Error loading exercises: ${error.message}`);
        setExercises([]);
        return;
      }

      const rows = (data ?? []) as Exercise[];
      setExercises(rows);

      const weightedDefaults: Record<string, [WeightedSet, WeightedSet]> = {};
      const durationDefaults: Record<string, [DurationSet, DurationSet]> = {};

      for (const ex of rows) {
        if (ex.metric_type === "WEIGHTED_REPS") {
          weightedDefaults[ex.id] = [
            { reps: "", weight: "", unit: "lb" },
            { reps: "", weight: "", unit: "lb" },
          ];
        } else {
          durationDefaults[ex.id] = [{ seconds: "" }, { seconds: "" }];
        }
      }

      const { data: existingSession } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", sessionData.session.user.id)
        .eq("session_date", date)
        .eq("split", split)
        .maybeSingle();

      if (existingSession?.id) {
        const { data: existingSets } = await supabase
          .from("workout_sets")
          .select("*")
          .eq("session_id", existingSession.id)
          .order("set_number", { ascending: true });

        const modifiedMap: Record<string, string> = {};

        for (const row of (existingSets ?? []) as Array<{
          exercise_id: string;
          set_number: number;
          reps: number | null;
          weight_input: number | null;
          unit_input: Unit | null;
          duration_seconds: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        }>) {
          const setIdx = row.set_number === 2 ? 1 : 0;
          if (setIdx !== 0 && setIdx !== 1) continue;

          if (weightedDefaults[row.exercise_id]) {
            weightedDefaults[row.exercise_id][setIdx] = {
              reps: row.reps != null ? String(row.reps) : "",
              weight: row.weight_input != null ? String(row.weight_input) : "",
              unit: row.unit_input ?? "lb",
            };
          }

          if (durationDefaults[row.exercise_id]) {
            durationDefaults[row.exercise_id][setIdx] = {
              seconds: row.duration_seconds != null ? String(row.duration_seconds) : "",
            };
          }

          const modifiedAt = row.updated_at ?? row.created_at;
          if (modifiedAt) {
            modifiedMap[`${row.exercise_id}:${row.set_number}`] = modifiedAt;
          }
        }

        setLastModifiedBySetKey(modifiedMap);
      } else {
        setLastModifiedBySetKey({});
      }

      setWeightedForm(weightedDefaults);
      setDurationForm(durationDefaults);
    })();
  }, [date, loadLastSessions, loadRecentSessions, setMsg, split]);

  return {
    exercises,
    lastSessionBySplit,
    recentSessions,
    weightedForm,
    durationForm,
    lastModifiedBySetKey,
    setWeightedForm,
    setDurationForm,
    setLastModifiedBySetKey,
    loadLastSessions,
    loadRecentSessions,
  };
}
