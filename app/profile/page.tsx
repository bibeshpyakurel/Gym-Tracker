"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ThemeMode = "light" | "dark";
type SaveOverlayState = "hidden" | "saving" | "success";

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saveOverlayState, setSaveOverlayState] = useState<SaveOverlayState>("hidden");
  const [msg, setMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [launchAnimationEnabled, setLaunchAnimationEnabled] = useState(true);
  const [speakRepliesEnabled, setSpeakRepliesEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const root = document.documentElement;
      const currentTheme = root.classList.contains("dark") ? "dark" : "light";
      const savedLaunch = localStorage.getItem("launch_animation_enabled");
      const savedSpeakReplies = localStorage.getItem("insights_speak_replies");

      if (!isMounted) return;

      setTheme(currentTheme);
      setLaunchAnimationEnabled(savedLaunch !== "false");
      setSpeakRepliesEnabled(savedSpeakReplies === "true");

      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      const sessionUserId = data.session.user.id;
      setUserId(sessionUserId);
      setEmail(data.session.user.email ?? "");

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("first_name,last_name,avatar_url")
        .eq("user_id", sessionUserId)
        .maybeSingle();

      if (!isMounted) return;

      if (profileError) {
        setMsg("Profile table is not set up yet. Add db/profiles.sql in Supabase.");
      } else {
        setFirstName(profileRow?.first_name ?? "");
        setLastName(profileRow?.last_name ?? "");
        setAvatarUrl(profileRow?.avatar_url ?? null);
      }

      setLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [router]);

  function applyTheme(nextTheme: ThemeMode) {
    const root = document.documentElement;
    root.classList.toggle("dark", nextTheme === "dark");
    root.style.colorScheme = nextTheme;
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  }

  function toggleLaunchAnimation() {
    setLaunchAnimationEnabled((current) => {
      const next = !current;
      localStorage.setItem("launch_animation_enabled", String(next));
      return next;
    });
  }

  function toggleSpeakReplies() {
    setSpeakRepliesEnabled((current) => {
      const next = !current;
      localStorage.setItem("insights_speak_replies", String(next));
      return next;
    });
  }

  async function signOut() {
    setIsSigningOut(true);
    setMsg(null);
    const { error } = await supabase.auth.signOut();
    setIsSigningOut(false);

    if (error) {
      setMsg(`Failed to sign out: ${error.message}`);
      return;
    }

    router.replace("/login");
  }

  async function saveName() {
    if (!userId) return;
    setIsSavingName(true);
    setSaveOverlayState("saving");
    setMsg(null);

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const namePattern = /^[A-Za-z][A-Za-z '-]*$/;

    if (!normalizedFirstName && !normalizedLastName) {
      setIsSavingName(false);
      setSaveOverlayState("hidden");
      setMsg("Please enter at least a first name or last name before saving.");
      return;
    }

    if (normalizedFirstName && !namePattern.test(normalizedFirstName)) {
      setIsSavingName(false);
      setSaveOverlayState("hidden");
      setMsg("First name must be letters only (spaces, apostrophes, and hyphens allowed).");
      return;
    }

    if (normalizedLastName && !namePattern.test(normalizedLastName)) {
      setIsSavingName(false);
      setSaveOverlayState("hidden");
      setMsg("Last name must be letters only (spaces, apostrophes, and hyphens allowed).");
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        first_name: normalizedFirstName || null,
        last_name: normalizedLastName || null,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      setIsSavingName(false);
      setSaveOverlayState("hidden");
      setMsg(`Failed to save name: ${error.message}`);
      return;
    }

    setFirstName(normalizedFirstName);
    setLastName(normalizedLastName);
    setIsSavingName(false);
    setSaveOverlayState("success");
    window.setTimeout(() => setSaveOverlayState("hidden"), 900);
    setMsg("Profile name saved ✅");
  }

  async function uploadAvatar(file: File) {
    if (!userId) return;

    const mimeType = file.type.toLowerCase();
    if (!mimeType.startsWith("image/")) {
      setMsg("Please choose an image file.");
      return;
    }

    setIsUploadingAvatar(true);
    setMsg(null);

    const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (uploadError) {
      setIsUploadingAvatar(false);
      setMsg(
        `Failed to upload profile photo: ${uploadError.message}. Create bucket 'profile-avatars' and add policies.`
      );
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("profile-avatars").getPublicUrl(path);
    const nextAvatarUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        avatar_url: nextAvatarUrl,
      },
      { onConflict: "user_id" }
    );

    setIsUploadingAvatar(false);

    if (updateError) {
      setMsg(`Failed to save profile photo URL: ${updateError.message}`);
      return;
    }

    setAvatarUrl(nextAvatarUrl);
    setMsg("Profile photo updated ✅");
  }

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-10">
          <p className="text-sm text-zinc-300">Loading profile settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(245,158,11,0.18),transparent_34%),radial-gradient(circle_at_84%_12%,rgba(59,130,246,0.14),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:46px_46px] opacity-20" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">Profile</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Account Settings</h1>
        <p className="mt-2 text-zinc-300">Manage your account preferences and experience.</p>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <section className="rounded-3xl border border-zinc-700/80 bg-zinc-900/70 p-5 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white">Personal Info</h2>
            <p className="mt-1 text-sm text-zinc-400">Save your name for profile personalization.</p>
            <div className="mt-4 flex items-center gap-4 rounded-xl border border-zinc-700/70 bg-zinc-950/50 px-4 py-3">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-zinc-600 bg-zinc-800">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl text-zinc-300">
                    {(firstName || email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">Profile photo</p>
                <label className="mt-2 inline-flex cursor-pointer rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800">
                  {isUploadingAvatar ? "Uploading..." : "Upload / Change"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingAvatar || isSavingName || isSigningOut}
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0];
                      if (nextFile) {
                        void uploadAvatar(nextFile);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-first-name" className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">
                  First name
                </label>
                <input
                  id="profile-first-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none ring-amber-300/70 transition focus:ring-2"
                />
              </div>
              <div>
                <label htmlFor="profile-last-name" className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">
                  Last name
                </label>
                <input
                  id="profile-last-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none ring-amber-300/70 transition focus:ring-2"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void saveName()}
              disabled={isSavingName || isSigningOut || isUploadingAvatar}
              className="mt-4 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:brightness-110 disabled:opacity-50"
            >
              {isSavingName ? "Saving..." : "Save Name"}
            </button>
          </section>

          <section className="rounded-3xl border border-zinc-700/80 bg-zinc-900/70 p-5 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white">Appearance</h2>
            <p className="mt-1 text-sm text-zinc-400">Set your preferred theme for all tabs.</p>
            <div className="mt-4 inline-flex rounded-xl border border-zinc-700/70 bg-zinc-950/60 p-1">
              <button
                type="button"
                onClick={() => applyTheme("light")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  theme === "light"
                    ? "bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 text-zinc-900"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => applyTheme("dark")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  theme === "dark"
                    ? "bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 text-zinc-900"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Dark
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-700/80 bg-zinc-900/70 p-5 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white">Experience</h2>
            <p className="mt-1 text-sm text-zinc-400">Control app behavior after login and in AI chat.</p>

            <div className="mt-4 space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-zinc-700/70 bg-zinc-950/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Launch animation after login</p>
                  <p className="text-xs text-zinc-400">Show the “Gym Tracker” transition before Dashboard.</p>
                </div>
                <button
                  type="button"
                  onClick={toggleLaunchAnimation}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    launchAnimationEnabled
                      ? "bg-emerald-400/20 text-emerald-300"
                      : "bg-zinc-700/40 text-zinc-300"
                  }`}
                >
                  {launchAnimationEnabled ? "On" : "Off"}
                </button>
              </label>

              <label className="flex items-center justify-between rounded-xl border border-zinc-700/70 bg-zinc-950/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Insights voice replies</p>
                  <p className="text-xs text-zinc-400">Speak AI answers by default in the Insights tab.</p>
                </div>
                <button
                  type="button"
                  onClick={toggleSpeakReplies}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    speakRepliesEnabled
                      ? "bg-emerald-400/20 text-emerald-300"
                      : "bg-zinc-700/40 text-zinc-300"
                  }`}
                >
                  {speakRepliesEnabled ? "On" : "Off"}
                </button>
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-700/80 bg-zinc-900/70 p-5 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white">Account</h2>
            <p className="mt-1 text-sm text-zinc-400">Manage your current session.</p>
            <div className="mt-4 rounded-xl border border-zinc-700/70 bg-zinc-950/50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Email</p>
              <p className="mt-1 text-sm font-medium text-zinc-100">{email || "Not available"}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={isSigningOut || isSavingName || isUploadingAvatar}
              className="mt-4 rounded-xl border border-red-400/60 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </section>
        </div>

        {msg && (
          <p className={`mt-4 text-sm ${msg.includes("✅") ? "text-emerald-300" : "text-red-300"}`}>
            {msg}
          </p>
        )}
      </div>

      {saveOverlayState !== "hidden" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/55 backdrop-blur-sm">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-700/80 bg-zinc-900/90 px-8 py-7 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.22),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(59,130,246,0.2),transparent_46%)]" />
            <div className="relative z-10 flex flex-col items-center">
              {saveOverlayState === "saving" ? (
                <>
                  <div className="relative h-14 w-14">
                    <span className="absolute inset-0 rounded-full border-2 border-amber-300/40 animate-ping" />
                    <span className="absolute inset-1 rounded-full border-2 border-transparent border-t-amber-300 border-r-orange-300 animate-spin" />
                  </div>
                  <p className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-amber-300/90">
                    Saving Profile
                  </p>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/20 text-2xl text-emerald-300 animate-pulse">
                    ✓
                  </div>
                  <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Saved
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
