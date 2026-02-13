"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppNav() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <nav className="border-b p-4 flex gap-4">
      <Link href="/log" className="underline">
        Log Workout
      </Link>
      <Link href="/bodyweight" className="underline">
        Bodyweight
      </Link>
    </nav>
  );
}