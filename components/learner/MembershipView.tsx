"use client";

import React from "react";
import { Check, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { useApp } from "@/components/context/AppContext";

export default function MembershipView() {
  const {
    userProfile,
    subscriptionPlans,
    subscriptions,
    selectSubscriptionPlan,
    setLearnerRoute,
  } = useApp();

  const activePlan =
    subscriptionPlans.find((p) => p.id === userProfile.planId) || subscriptionPlans[0];

  const aiUsagePct = activePlan
    ? Math.min(100, Math.round((userProfile.dailyAiCalls / Math.max(1, activePlan.dailyAiLimit)) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Membership & Access Plans</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Unlock full academic, Medical Admission, BCS, and IELTS libraries, interactive 3D labs, and live voice tutoring.
        </p>
      </div>

      {/* Active Plan Summary Card — Compact on Mobile */}
      {activePlan && (
        <div className="rounded-[20px] sm:rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#131D3A] to-[#1E1B4B] p-4 sm:p-6 text-white flex flex-wrap items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-0.5 sm:space-y-1">
            <div className="text-[11px] sm:text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Current Active Plan
            </div>
            <h2 className="font-display text-lg sm:text-2xl font-bold">{activePlan.name}</h2>
            <p className="text-[11.5px] sm:text-xs text-slate-300">{activePlan.tagline}</p>
          </div>

          <div className="w-full sm:w-72 space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[11.5px] sm:text-xs">
              <span className="text-slate-300">Daily AI Tutor Quota</span>
              <span className="font-mono tabular-nums font-semibold text-white">
                {userProfile.dailyAiCalls} / {activePlan.dailyAiLimit}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
                style={{ width: `${aiUsagePct}%` }}
              />
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-slate-400">
              Allowed Tiers: {activePlan.allowedTiers.map((t) => t.toUpperCase()).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* 3 Plan Cards — Global 2-Per-Row on Mobile */}
      <div className="skyx-grid-cards">
        {subscriptionPlans.map((plan) => {
          const isCurrent = plan.id === userProfile.planId;
          const isFeatured = plan.id === "plan-pro";

          return (
            <div
              key={plan.id}
              className={`rounded-[18px] sm:rounded-2xl p-3.5 sm:p-6 flex flex-col justify-between border transition-all ${
                isFeatured
                  ? "bg-white border-indigo-400 shadow-lg shadow-indigo-500/10"
                  : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="space-y-2.5 sm:space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <h3 className="font-display text-sm sm:text-lg font-bold text-slate-900 truncate">
                      {plan.name}
                    </h3>
                    {isFeatured && (
                      <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600 flex items-center gap-0.5 shrink-0">
                        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">Popular</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 line-clamp-2">
                    {plan.tagline}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {plan.priceMonthly === 0 ? "Free" : `${plan.currency} ${plan.priceMonthly}`}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className="text-[10.5px] sm:text-xs text-slate-500">/mo</span>
                  )}
                </div>

                <ul className="space-y-1.5 sm:space-y-2.5 pt-2.5 sm:pt-3 border-t border-slate-100 text-[11px] sm:text-xs text-slate-700">
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>{plan.allowedTiers.map((t) => t.toUpperCase()).join(", ")}</strong> books
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-mono">{plan.dailyAiLimit}</strong> AI calls/day
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <Check
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5 ${plan.has3dLab ? "text-emerald-600" : "text-slate-300"}`}
                    />
                    <span className={plan.has3dLab ? "" : "text-slate-400 line-through"}>
                      3D Diagrams Lab
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <Check
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5 ${plan.hasVoiceTutor ? "text-emerald-600" : "text-slate-300"}`}
                    />
                    <span className={plan.hasVoiceTutor ? "" : "text-slate-400 line-through"}>
                      AI Voice &amp; Podcast
                    </span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => plan.priceMonthly > 0 ? setLearnerRoute("library") : selectSubscriptionPlan(plan)}
                disabled={isCurrent && plan.priceMonthly === 0}
                className={`mt-4 sm:mt-6 w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-slate-100 text-slate-500 cursor-default"
                    : isFeatured
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-sm"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {plan.priceMonthly > 0 ? "View in Marketplace" : isCurrent ? "Current Plan" : `Choose ${plan.name.split(" ")[0]}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Subscription / Billing History */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Subscription Activity</h2>
        </div>

        {subscriptions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">
            Switch plans above to record and sync your subscription history.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{sub.planName}</td>
                    <td className="py-3 px-3 font-mono tabular-nums text-slate-700">
                      {sub.currency} {sub.amount}
                    </td>
                    <td className="py-3 pl-3 text-right capitalize font-semibold text-emerald-600">
                      {sub.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
