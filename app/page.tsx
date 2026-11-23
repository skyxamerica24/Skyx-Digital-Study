"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AppProvider, useApp } from "@/components/context/AppContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { GraduationCap, Loader2 } from "lucide-react";
import AuthPage from "@/components/auth/AuthPage";
import DashboardShell from "@/components/layout/DashboardShell";
import LearnerDashboard from "@/components/learner/LearnerDashboard";
import BookLibraryView from "@/components/learner/BookLibraryView";
import MyLibraryView from "@/components/learner/MyLibraryView";
import ExamCenterView from "@/components/learner/ExamCenterView";
import ExamHistoryView from "@/components/learner/ExamHistoryView";
import StudyVaultView from "@/components/learner/StudyVaultView";
import RevisionPracticeView from "@/components/learner/RevisionPracticeView";
import MembershipView from "@/components/learner/MembershipView";
import SettingsHubView from "@/components/settings/SettingsHubView";
import GlobalSearchModal from "@/components/search/GlobalSearchModal";

const BookMarketplace = dynamic(() => import("@/components/store/BookMarketplace"), { ssr: false });
const BookReaderWorkspace = dynamic(() => import("@/components/reader/BookReaderWorkspace"), { ssr: false });
const ThreeDiagramLab = dynamic(() => import("@/components/lab/ThreeDiagramLab"), { ssr: false });
const AdminWorkspace = dynamic(() => import("@/components/admin/AdminWorkspace"), { ssr: false });
const FloatingAiTutor = dynamic(() => import("@/components/ai/FloatingAiTutor"), { ssr: false });
const BookManagerWorkspace = dynamic(
  () => import("@/components/book-manager/BookManagerWorkspace"),
  { ssr: false }
);

function SkyxAcademyRouter() {
  const {
    user,
    authLoading,
    activePanel,
    learnerRoute,
    activeLabModel,
    setActiveLabModel,
    openAiTutor,
  } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FB] text-slate-900 p-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 mb-4">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading Skyx Academy...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Dedicated full-bleed Book Reader layout matching Reference Screenshot 2
  const isFocusedReader = activePanel === "learner" && learnerRoute === "reader";

  return (
    <>
      {isFocusedReader ? (
        <BookReaderWorkspace />
      ) : (
        <DashboardShell>
          {activePanel === "admin" ? (
            <AdminWorkspace />
          ) : learnerRoute === "dashboard" ? (
            <LearnerDashboard />
          ) : learnerRoute === "library" ? (
            <><BookMarketplace /><BookLibraryView /></>
          ) : learnerRoute === "my-library" ? (
            <MyLibraryView />
          ) : learnerRoute === "lab3d" ? (
            <ThreeDiagramLab
              modelKey={activeLabModel}
              onModelChange={setActiveLabModel}
              onAskAiPart={(partName, modelTitle) =>
                openAiTutor({
                  mode: "chat",
                  prefill: `Explain the anatomical/scientific function and exam significance of "${partName}" in the ${modelTitle} 3D model.`,
                })
              }
            />
          ) : learnerRoute === "exams" ? (
            <ExamCenterView />
          ) : learnerRoute === "exam-history" ? (
            <ExamHistoryView />
          ) : learnerRoute === "vault" ? (
            <StudyVaultView />
          ) : learnerRoute === "revision" ? (
            <RevisionPracticeView />
          ) : learnerRoute === "book-manager" ? (
            <BookManagerWorkspace />
          ) : learnerRoute === "account" ? (
            <SettingsHubView defaultTab="preferences" />
          ) : (
            <MembershipView />
          )}
        </DashboardShell>
      )}

      <GlobalSearchModal />
      <FloatingAiTutor key={user.uid} />
    </>
  );
}

export default function HomePage() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <SkyxAcademyRouter />
      </AppProvider>
    </ErrorBoundary>
  );
}
