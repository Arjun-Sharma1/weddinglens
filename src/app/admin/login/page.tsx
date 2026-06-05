"use client";

import { useState } from "react";
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
    <main className="grain relative flex min-h-dvh items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="animate-rise w-full max-w-sm rounded-3xl border border-line bg-paper-deep/40 p-8 shadow-[0_30px_80px_-40px_rgba(120,90,30,0.35)]"
      >
        <div className="text-center">
          <Brand className="text-xl" />
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
            className="focus-gold mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none"
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
            className="focus-gold mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none"
            required
          />
        </label>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="focus-gold mt-7 w-full rounded-full bg-ink py-3.5 font-medium text-paper transition hover:bg-gold-deep disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
