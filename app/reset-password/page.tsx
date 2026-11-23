"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string>();
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setToken(new URLSearchParams(location.hash.slice(1)).get("token") ?? "");
    if (location.hash) history.replaceState(null, "", location.pathname);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    if (password !== form.get("confirm")) {
      setStatus("Passwords do not match.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({token,password}),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setDone(true);
      setStatus("Password updated. Sign in with your new password.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
    <section className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900">
      <h1 className="text-xl font-semibold">Reset Password</h1>
      {token && !done && <form className="space-y-3" onSubmit={submit}>
        <label className="grid gap-1 text-sm">New Password
          <input className="rounded-lg border p-2" name="password" type="password" minLength={10} maxLength={72} required autoComplete="new-password" />
        </label>
        <label className="grid gap-1 text-sm">Confirm Password
          <input className="rounded-lg border p-2" name="confirm" type="password" required autoComplete="new-password" />
        </label>
        <button disabled={busy} className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Update Password</button>
      </form>}
      {token === "" && <p>This reset link is invalid. Request a new one from the sign-in page.</p>}
      {status && <p role="status" className="text-sm">{status}</p>}
      <a href="/" className="text-sm text-indigo-700 underline">Back to Sign In</a>
    </section>
  </main>;
}
