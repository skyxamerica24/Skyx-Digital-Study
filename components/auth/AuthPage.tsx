"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";

type AuthMode = "signin" | "register" | "reset";

export default function AuthPage() {
  const { signInWithEmailPassword, registerWithEmailPassword, sendPasswordReset } = useApp();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [providerDisabledHint, setProviderDisabledHint] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "" };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    return { score, label: labels[score] || "Weak" };
  }, [password]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setProviderDisabledHint(false);
    setSuccessMessage(null);
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setProviderDisabledHint(false);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (mode === "reset") {
      setSubmitting(true);
      try {
        await sendPasswordReset(trimmedEmail);
        setSuccessMessage("If an account exists for this address, check your inbox for a reset link.");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Password reset failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (mode === "register") {
      if (fullName.trim().length < 2) {
        setErrorMessage("Please enter your full name (at least 2 characters).");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signInWithEmailPassword(trimmedEmail, password);
      } else {
        await registerWithEmailPassword(fullName, trimmedEmail, password);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10 bg-[#F2F5FA] bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.12),_transparent_58%)] text-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[392px]"
      >
        {/* Compact Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5B52F5] via-[#6D55F7] to-[#8B5CF6] flex items-center justify-center text-white shadow-[0_10px_24px_-6px_rgba(99,102,241,0.55)] mb-3">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
            Skyx Academy
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            AI Digital Learning & Interactive Book Workspace
          </p>
        </div>

        {/* Compact Single-Elevation Auth Card */}
        <div className="bg-white rounded-[22px] border border-slate-200/80 shadow-[0_14px_40px_-18px_rgba(15,23,42,0.16)] p-6 sm:p-7">
          {mode !== "reset" ? (
            <div className="space-y-3 mb-5">
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="relative grid grid-cols-2 p-1 rounded-xl bg-slate-100/90"
              >
                {(["signin", "register"] as const).map((tab) => {
                  const active = mode === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => switchMode(tab)}
                      className={`relative z-10 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        active ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="authModePill"
                          transition={{ type: "spring", stiffness: 450, damping: 34 }}
                          className="absolute inset-0 -z-10 rounded-lg bg-white shadow-xs"
                        />
                      )}
                      {tab === "signin" ? "Sign In" : "Create Account"}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-4">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {mode === "signin"
                    ? "Sign in to your account"
                    : mode === "register"
                      ? "Create a new account"
                      : "Reset password"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {mode === "signin"
                    ? "Enter your email and password to continue."
                    : mode === "register"
                      ? "Set up your Skyx Academy credentials below."
                      : "Password recovery is currently unavailable."}
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-900 space-y-1.5"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{errorMessage}</span>
                  </div>
                  {providerDisabledHint && (
                    <p className="pl-6 text-[11px] text-rose-800 leading-relaxed">
                      Please enable Email/Password authentication in your backend settings.
                    </p>
                  )}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 flex items-start gap-2 text-xs text-emerald-900"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                {mode === "register" && (
                  <div>
                    <label
                      htmlFor="auth-fullname"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-fullname"
                        type="text"
                        autoComplete="name"
                        required
                        maxLength={120}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={200}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {mode !== "reset" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="auth-password"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Password
                      </label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => switchMode("reset")}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        required
                        minLength={6}
                        maxLength={128}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === "signin" ? "••••••••" : "Min. 6 characters"}
                        className="w-full h-10 pl-9 pr-10 rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {mode === "register" && password.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-4 gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1 rounded-full transition-colors ${
                                passwordStrength.score >= level
                                  ? passwordStrength.score >= 3
                                    ? "bg-emerald-500"
                                    : passwordStrength.score === 2
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  : "bg-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">
                          {passwordStrength.label}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {mode === "register" && (
                  <div>
                    <label
                      htmlFor="auth-confirm-password"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        maxLength={128}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full h-10 pl-9 pr-10 rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  className="mt-1 w-full h-10 px-4 rounded-xl bg-gradient-to-r from-[#5B52F5] via-[#6D55F7] to-[#7C5CF8] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-[0_10px_24px_-6px_rgba(99,102,241,0.55)] transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {mode === "signin"
                          ? "Signing in..."
                          : mode === "register"
                            ? "Creating account..."
                            : "Sending link..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === "signin"
                          ? "Sign In"
                          : mode === "register"
                            ? "Create Account"
                            : "Send Reset Link"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} Skyx Academy · Secure Email & Password Access
        </p>
      </motion.div>
    </div>
  );
}
