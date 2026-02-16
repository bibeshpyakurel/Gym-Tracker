import type { Split } from "@/features/log/types";
import type { Unit } from "@/lib/convertWeight";

export type DashboardData = {
  email: string;
  workoutCount: number;
  bodyweightCount: number;
  latestWorkout: { session_date: string; split: Split } | null;
  latestBodyweight: { log_date: string; weight_input: number; unit_input: Unit } | null;
};
