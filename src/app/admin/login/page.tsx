"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Brand, Ornament } from "@/components/Brand";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Those credentials didn’t match. Please try again.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="grain vignette relative flex min-h-dvh items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="animate-rise card w-full max-w-sm rounded-3xl p-8 shadow-e4"
      >
        <div className="flex flex-col items-center text-center">
          <Brand withMark markSize={40} className="flex-col gap-3 text-xl" />
          <div className="mt-5 flex items-center justify-center gap-3">
            <Ornament />
            <span className="eyebrow">Organizer access</span>
            <Ornament />
          </div>
        </div>

        <label className="mt-8 block text-sm font-medium text-ink-soft">
          Username
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input mt-1.5"
            required
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-ink-soft">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1.5"
            required
          />
        </label>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={loading} className="btn btn-primary mt-7 w-full py-3.5">
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <Link
          href="/"
          className="mt-5 block text-center text-sm text-ink-soft transition-colors hover:text-ink"
        >
          ← Back to home
        </Link>
      </form>
    </main>
  );
}
