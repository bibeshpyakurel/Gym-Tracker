"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setMsg(`Login failed: ${error.message}`);
      return;
    }

    // If login succeeds, you should get a session here
    const hasSession = !!data.session;
    setLoading(false);

    if (!hasSession) {
      setMsg(
        "Login call succeeded but no session returned. This usually means email confirmation is required."
      );
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-md rounded-2xl border bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">
            Bibesh Personal Gym Tracker
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Welcome back, Bibesh 💪</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in and keep your progress moving. One workout at a time.
          </p>

          <label className="block mt-4 text-sm font-medium">Email</label>
          <input
            className="mt-1 w-full rounded-md border p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label className="block mt-4 text-sm font-medium">Password</label>
          <input
            className="mt-1 w-full rounded-md border p-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button
            onClick={signIn}
            disabled={loading}
            className="mt-5 w-full rounded-md bg-black text-white py-2 disabled:opacity-60"
          >
            {loading ? "Working..." : "Sign in"}
          </button>

          {msg && <p className="mt-4 text-sm">{msg}</p>}
      </div>
    </div>
  );
}
