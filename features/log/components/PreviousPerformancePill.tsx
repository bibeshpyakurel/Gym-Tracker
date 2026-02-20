import { formatLastSessionDate } from "@/features/log/formatters";

type PreviousPerformancePillProps = {
  primary: string;
  sessionDate: string;
};

export default function PreviousPerformancePill({ primary, sessionDate }: PreviousPerformancePillProps) {
  return (
    <div className="inline-flex min-w-[300px] items-center gap-2 rounded-md border border-amber-300/45 bg-gradient-to-r from-amber-400/14 via-orange-400/10 to-red-400/14 px-3 py-1.5 text-base text-amber-100">
      <span className="font-semibold text-amber-200/90">Previous:</span>
      <span>{primary}</span>
      <span className="text-sm text-amber-200/80">({formatLastSessionDate(sessionDate)})</span>
    </div>
  );
}
