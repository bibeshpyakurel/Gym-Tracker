"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toKg, type Unit } from "@/lib/convertWeight";

export default function BodyweightPage() {
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<Unit>("lb");

  const [logs, setLogs] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadLogs() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    const userId = sessionData.session.user.id;

    const { data } = await supabase
      .from("bodyweight_logs")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: false });

    setLogs(data ?? []);
  }

  useEffect(() => {
    loadLogs();
  }, []);

  async function save() {
    setLoading(true);
    setMsg(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setMsg("Not logged in.");
      setLoading(false);
      return;
    }

    const userId = sessionData.session.user.id;

    const weightNum = Number(weight);
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      setMsg("Enter valid weight.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("bodyweight_logs")
      .upsert(
        {
          user_id: userId,
          log_date: date,
          weight_input: weightNum,
          unit_input: unit,
          weight_kg: toKg(weightNum, unit),
        },
        { onConflict: "user_id,log_date" }
      );

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    setMsg("Saved ✅");
    setWeight("");
    setLoading(false);
    loadLogs();
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold">Bodyweight</h1>

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <input
          type="date"
          className="border rounded-md p-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <input
          className="border rounded-md p-2 w-32"
          placeholder="Weight"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <select
          className="border rounded-md p-2"
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
        >
          <option value="lb">lb</option>
          <option value="kg">kg</option>
        </select>

        <button
          onClick={save}
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded-md"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>

      {msg && <p className="mt-3 text-sm">{msg}</p>}

      <div className="mt-6">
        <h2 className="font-semibold">History</h2>

        <div className="mt-2 space-y-2">
          {logs.map((l) => (
            <div
              key={l.id}
              className="border rounded-md p-2 flex justify-between"
            >
              <span>{l.log_date}</span>
              <span>
                {l.weight_input} {l.unit_input}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
