import { compareSets, type SetSummary } from "@/core/engine/set-summary";
import { EXERCISES } from "@/core/exercises/definitions";
import { CoachNote } from "./coach-note";

function Delta({ value, unit = "", invert = false }: { value: number; unit?: string; invert?: boolean }) {
  const rounded = Math.round(value);
  if (rounded === 0) return <span className="text-zinc-500">±0{unit}</span>;
  const good = invert ? rounded < 0 : rounded > 0;
  return (
    <span className={good ? "text-lime-400" : "text-amber-400"}>
      {rounded > 0 ? "+" : ""}
      {rounded}
      {unit}
    </span>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-900 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {delta && <p className="text-xs">{delta}</p>}
    </div>
  );
}

export function SetSummaryPanel({
  summary,
  previous,
  setNumber,
  onNextSet,
}: {
  summary: SetSummary;
  previous: SetSummary | null;
  setNumber: number;
  onNextSet: () => void;
}) {
  const diff = previous ? compareSets(previous, summary) : null;
  const { fatigue } = summary;

  return (
    <div className="absolute inset-x-0 bottom-0 max-h-[85%] overflow-y-auto rounded-t-3xl bg-zinc-950/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur">
      <h2 className="text-lg font-semibold">
        Set {setNumber} · {EXERCISES[summary.exercise].name}
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Reps" value={String(summary.reps)} delta={diff && <Delta value={diff.repsDelta} />} />
        <Stat
          label="Form score"
          value={`${summary.avgScore}/100`}
          delta={diff && <Delta value={diff.scoreDelta} />}
        />
        <Stat
          label="Range of motion"
          value={`${summary.avgRangeOfMotion}°`}
          delta={diff && <Delta value={diff.romDelta} unit="°" />}
        />
        <Stat
          label="Lowering time"
          value={`${(summary.avgEccentricMs / 1000).toFixed(1)}s`}
          delta={diff && <Delta value={diff.eccentricDeltaMs / 1000} unit="s" />}
        />
      </div>

      {previous && <p className="mt-2 text-xs text-zinc-500">Compared with your previous set of this exercise.</p>}

      <CoachNote key={setNumber} summary={summary} previous={previous} />

      <ul className="mt-4 space-y-2 text-sm text-zinc-300">
        {summary.partialReps > 0 && (
          <li>
            {summary.partialReps} rep{summary.partialReps > 1 ? "s" : ""} didn&apos;t reach full range and
            weren&apos;t counted.
          </li>
        )}
        {summary.topFault ? (
          <li>
            Most common issue: <strong>{summary.topFault.label}</strong> ({summary.topFault.count} of{" "}
            {summary.reps} reps).
          </li>
        ) : (
          summary.reps > 0 && <li>No form issues detected. Nice work.</li>
        )}
        {fatigue && fatigue.scoreChange < -5 && (
          <li>Form dropped by {Math.abs(Math.round(fatigue.scoreChange))} points in the second half. That&apos;s fatigue.</li>
        )}
        {fatigue && fatigue.romChangePct < -8 && (
          <li>Your range of motion shrank {Math.abs(Math.round(fatigue.romChangePct))}% late in the set.</li>
        )}
        {fatigue && fatigue.eccentricChangePct < -25 && (
          <li>You rushed the lowering as the set went on.</li>
        )}
      </ul>

      <button
        type="button"
        onClick={onNextSet}
        className="mt-5 w-full rounded-full bg-lime-400 py-3 font-semibold text-zinc-950 active:scale-95"
      >
        Start next set
      </button>
    </div>
  );
}
