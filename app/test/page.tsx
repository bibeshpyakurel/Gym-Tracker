"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("(checking...)");

  async function refresh() {
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    setEmail(session?.user?.email ?? "Not logged in");

    const { data, error } = await supabase
      .from("exercises")
      .select("name, split, muscle_group, metric_type, sort_order")
      .order("split")
      .order("sort_order");

    if (error) setError(error.message);
    setRows(data ?? []);
  }

  useEffect(() => {
    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Supabase Connection Test</h1>
      <p className="mt-2 text-sm text-gray-600">Logged in as: {email}</p>

      <button
        className="mt-3 rounded-md border px-3 py-2"
        onClick={refresh}
      >
        Refresh
      </button>

      {error && <p className="mt-4 text-red-600">Error: {error}</p>}

      <pre className="mt-4 whitespace-pre-wrap">
        {JSON.stringify(rows, null, 2)}
      </pre>
    </div>
  );
}
