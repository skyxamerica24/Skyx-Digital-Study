"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookMarked,
  BookOpen,
  Bookmark,
  Box,
  Brain,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileEdit,
  FileUp,
  FolderKanban,
  FolderTree,
  GraduationCap,
  HelpCircle,
  History,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { useApp } from "@/components/context/AppContext";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import type { AdminRoute, LearnerRoute } from "@/lib/types";

interface DashboardShellProps {
  children: React.ReactNode;
}

const SPRING_FAST = { type: "spring" as const, stiffness: 430, damping: 34 };
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export default function DashboardShell({ children }: DashboardShellProps) {
  const {
    userProfile,
    isAdmin,
    signOut,
    activePanel,
    setActivePanel,
    learnerRoute,
    setLearnerRoute,
    adminRoute,
    setAdminRoute,
    sidebarCollapsed: collapsed,
    setSidebarCollapsed: setCollapsed,
    setIsSearchOpen,
    openAiTutor,
    books,
    openBookReader,
  } = useApp();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [profileMenuOpen]);

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  const learnerNav: {
    id: LearnerRoute | "ai-tutor";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "library", label: "Book Library", icon: Library },
    { id: "my-library", label: "My Library", icon: BookMarked },
    { id: "reader", label: "Book Reader", icon: BookOpen },
    { id: "lab3d", label: "3D Visual Lab", icon: Box },
    { id: "exams", label: "Exam Center", icon: ClipboardCheck },
    { id: "exam-history", label: "Exam History", icon: History },
    { id: "vault", label: "Study Vault", icon: Bookmark },
    { id: "revision", label: "Revision & SRS", icon: Brain },
    { id: "ai-tutor", label: "Skyx AI", icon: Sparkles },
    { id: "membership", label: "Membership", icon: CreditCard },
    { id: "book-manager", label: "Book Manager", icon: FolderKanban },
    { id: "account", label: "Settings", icon: Settings },
  ];

  const adminNav: { id: AdminRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "academic", label: "Academic Catalog", icon: FolderTree },
    { id: "books", label: "Books & Splitter", icon: Library },
    { id: "processing", label: "Book Processing", icon: FileUp },
    { id: "editor", label: "Book Editor", icon: FileEdit },
    { id: "ai-studio", label: "AI Content Studio", icon: Sparkles },
    { id: "questions", label: "Question Bank", icon: HelpCircle },
    { id: "lab-manager", label: "3D Diagrams", icon: Box },
    { id: "search-ops", label: "Search & Knowledge", icon: Search },
    { id: "learners", label: "Admin Access & Users", icon: Users },
    { id: "billing", label: "Membership & Billing", icon: CreditCard },
    { id: "analytics", label: "Analytics & Reports", icon: BarChart3 },
    { id: "operations", label: "Operations & Logs", icon: Activity },
    { id: "book-manager", label: "Book Manager", icon: FolderKanban },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handlePrimaryCta = () => {
    if (activePanel === "admin") {
      setAdminRoute("books");
    } else if (books[0]) {
      openBookReader(books[0].id);
    }
  };

  const userInitial = (userProfile.displayName || "A").slice(0, 1).toUpperCase();
  const routeKey = `${activePanel}-${activePanel === "admin" ? adminRoute : learnerRoute}`;

  const renderNavItem = (
    id: string,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    isActive: boolean,
    onClick: () => void,
    isMobile: boolean
  ) => (
    <motion.button
      key={id}
      type="button"
      onClick={onClick}
      whileHover={{ x: collapsed && !isMobile ? 0 : 2.5 }}
      whileTap={{ scale: 0.975 }}
      transition={{ duration: 0.14, ease: EASE_OUT }}
      title={collapsed && !isMobile ? label : undefined}
      className={`group relative w-full flex items-center whitespace-nowrap transition-colors cursor-pointer ${
        isMobile
          ? "gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium"
          : "gap-3 px-3 py-2.5 rounded-2xl text-[13.5px] font-medium"
      } ${isActive ? "text-white" : "text-slate-400 hover:text-slate-100"}`}
    >
      {isActive && (
        <motion.div
          layoutId={isMobile ? "sidebarActivePillMobile" : "sidebarActivePill"}
          transition={SPRING_FAST}
          className={`absolute inset-0 bg-gradient-to-r from-[#2D2A74]/95 via-[#1C2C52]/80 to-[#133952]/55 border border-indigo-400/35 shadow-[0_8px_24px_-6px_rgba(99,102,241,0.45)] ${
            isMobile ? "rounded-xl" : "rounded-2xl"
          }`}
        >
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#818CF8] via-[#A78BFA] to-[#38BDF8] shadow-[0_0_12px_rgba(129,140,248,0.95)] ${
              isMobile ? "w-[3px] h-5" : "w-[3.5px] h-7"
            }`}
          />
        </motion.div>
      )}

      {!isActive && (
        <span
          className={`absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] border border-transparent group-hover:border-white/[0.06] transition-all duration-150 ${
            isMobile ? "rounded-xl" : "rounded-2xl"
          }`}
        />
      )}

      <span
        className={`relative z-10 flex items-center justify-center shrink-0 transition-all duration-200 ${
          isMobile ? "w-7 h-7 rounded-lg" : "w-8 h-8 rounded-xl"
        } ${
          isActive
            ? "bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white shadow-[0_4px_14px_rgba(99,102,241,0.65)]"
            : "bg-white/[0.04] border border-white/[0.05] text-slate-400 group-hover:text-indigo-200 group-hover:bg-white/[0.08] group-hover:border-white/[0.1]"
        }`}
      >
        <Icon className={isMobile ? "w-3.5 h-3.5" : "w-[15px] h-[15px]"} />
      </span>

      {(!collapsed || isMobile) && (
        <span className={`relative z-10 truncate ${isActive ? "font-semibold tracking-[-0.01em]" : ""}`}>
          {label}
        </span>
      )}
    </motion.button>
  );

  const renderSidebarContent = (isMobile: boolean) => (
    <div
      className={`relative flex flex-col h-full bg-[#070B16] bg-[radial-gradient(ellipse_at_top_left,_rgba(79,70,229,0.16),_transparent_45%),radial-gradient(ellipse_at_bottom_right,_rgba(56,189,248,0.08),_transparent_45%)] text-slate-300 select-none border-r border-white/[0.07] ${
        isMobile ? "rounded-r-[24px] overflow-hidden" : ""
      }`}
    >
      {/* Brand Header */}
      <div
        className={`flex items-center justify-between border-b border-white/[0.06] ${
          isMobile ? "h-[56px] px-3.5" : "h-[68px] px-4"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`bg-gradient-to-br from-[#5B52F5] via-[#6D55F7] to-[#8B5CF6] flex items-center justify-center text-white shrink-0 shadow-[0_6px_20px_-4px_rgba(99,102,241,0.65)] ring-1 ring-white/20 ${
              isMobile ? "w-8 h-8 rounded-xl" : "w-10 h-10 rounded-2xl"
            }`}
          >
            <GraduationCap className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <div
                className={`font-display font-bold text-white tracking-tight truncate ${
                  isMobile ? "text-[13.5px]" : "text-[15px]"
                }`}
              >
                SKYX ACADEMY
              </div>
              <div className="text-[10.5px] text-slate-400 truncate">
                {activePanel === "admin" ? "Admin Console" : "Study Workspace"}
              </div>
            </div>
          )}
        </div>
        {!isMobile ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-xl text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-colors shrink-0 cursor-pointer"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </motion.button>
        ) : (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Close mobile menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Animated Navigation List */}
      <nav
        className={`sidebar-scroll flex-1 overflow-y-auto ${
          isMobile ? "px-2.5 py-3 space-y-0.5" : "px-3 py-4 space-y-1"
        }`}
      >
        {activePanel === "learner"
          ? learnerNav.map((item) =>
              renderNavItem(
                item.id,
                item.label,
                item.icon,
                item.id !== "ai-tutor" && learnerRoute === item.id,
                () => {
                  if (item.id === "ai-tutor") {
                    openAiTutor({ mode: "chat" });
                  } else {
                    setLearnerRoute(item.id);
                  }
                  setMobileOpen(false);
                },
                isMobile
              )
            )
          : adminNav.map((item) =>
              renderNavItem(
                item.id,
                item.label,
                item.icon,
                adminRoute === item.id,
                () => {
                  setAdminRoute(item.id);
                  setMobileOpen(false);
                },
                isMobile
              )
            )}
      </nav>

      {/* Bottom Cosmic AI Card + Optional PWA Install */}
      {(!collapsed || isMobile) && (
        <div className={isMobile ? "px-2.5 pb-2.5 pt-1 space-y-2" : "px-3 pb-3 pt-1 space-y-2"}>
          <PWAInstallButton variant="sidebar" onAction={() => setMobileOpen(false)} />

          <div
            className={`relative rounded-2xl bg-gradient-to-br from-[#111730] via-[#131936] to-[#23194D] border border-indigo-400/20 overflow-hidden shadow-[0_12px_28px_-12px_rgba(15,23,42,0.8)] ${
              isMobile ? "p-3" : "p-4"
            }`}
          >
            <div className="pointer-events-none absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-indigo-500/25 blur-2xl" />
            <div className="relative z-10 flex items-center gap-2 text-xs font-display font-bold tracking-wide text-white">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>SKYX AI</span>
            </div>
            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setMobileOpen(false);
                openAiTutor({ mode: "voice" });
              }}
              className="relative z-10 mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <span>Open assistant</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-300" />
            </motion.button>
          </div>
        </div>
      )}

      {/* User Account Footer Card */}
      <div className={`${isMobile ? "p-2.5 pb-safe" : "p-3"} border-t border-white/[0.06]`}>
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-xs font-display font-bold flex items-center justify-center shrink-0 shadow-sm">
              {userInitial}
            </div>
            {(!collapsed || isMobile) && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {userProfile.displayName}
                </div>
                <div className="text-[10.5px] text-slate-400 truncate">
                  {isAdmin ? "Administrator" : "Scholar"}
                </div>
              </div>
            )}
          </div>
          {(!collapsed || isMobile) && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={signOut}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );

  // Mobile 5-Item Sticky Bottom PWA Navigation Items
  const mobileBottomItems =
    activePanel === "learner"
      ? [
          {
            id: "dashboard",
            label: "Home",
            icon: LayoutDashboard,
            isActive: learnerRoute === "dashboard",
            isCenter: false,
            onClick: () => setLearnerRoute("dashboard"),
          },
          {
            id: "library",
            label: "Books",
            icon: Library,
            isActive: learnerRoute === "library",
            isCenter: false,
            onClick: () => setLearnerRoute("library"),
          },
          {
            id: "my-library",
            label: "My Library",
            icon: BookMarked,
            isActive: learnerRoute === "my-library" || learnerRoute === "reader",
            isCenter: true,
            onClick: () => setLearnerRoute("my-library"),
          },
          {
            id: "exams",
            label: "Exams",
            icon: ClipboardCheck,
            isActive: learnerRoute === "exams" || learnerRoute === "exam-history",
            isCenter: false,
            onClick: () => setLearnerRoute("exams"),
          },
          {
            id: "ai-tutor",
            label: "Skyx AI",
            icon: Sparkles,
            isActive: false,
            isCenter: false,
            onClick: () => openAiTutor({ mode: "chat" }),
          },
        ]
      : [
          {
            id: "overview",
            label: "Overview",
            icon: LayoutDashboard,
            isActive: adminRoute === "overview",
            isCenter: false,
            onClick: () => setAdminRoute("overview"),
          },
          {
            id: "books",
            label: "Books",
            icon: Library,
            isActive: adminRoute === "books" || adminRoute === "academic",
            isCenter: false,
            onClick: () => setAdminRoute("books"),
          },
          {
            id: "editor",
            label: "Editor",
            icon: FileEdit,
            isActive: adminRoute === "editor" || adminRoute === "ai-studio",
            isCenter: true,
            onClick: () => setAdminRoute("editor"),
          },
          {
            id: "questions",
            label: "Exams",
            icon: HelpCircle,
            isActive: adminRoute === "questions",
            isCenter: false,
            onClick: () => setAdminRoute("questions"),
          },
          {
            id: "learners",
            label: "Users",
            icon: Users,
            isActive: adminRoute === "learners",
            isCenter: false,
            onClick: () => setAdminRoute("learners"),
          },
        ];

  return (
    <div className="min-h-screen flex bg-[#F2F5FA] bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.07),_transparent_45%)] text-slate-900">
      <OfflineBanner />

      {/* Desktop Animated Collapsible Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 78 : 252 }}
        transition={{ type: "spring", stiffness: 360, damping: 34 }}
        className="hidden lg:block shrink-0 sticky top-0 h-screen overflow-hidden"
      >
        {renderSidebarContent(false)}
      </motion.aside>

      {/* Slimmer, Refined Mobile PWA Drawer (232px) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden flex">
            <motion.div
              initial={{ x: -244 }}
              animate={{ x: 0 }}
              exit={{ x: -244 }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
              className="w-[232px] max-w-[76vw] h-full shadow-2xl"
            >
              {renderSidebarContent(true)}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 bg-slate-950/55 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Main Workspace Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Crisp Adaptive Executive Top Header Bar (56px mobile PWA -> 68px desktop) */}
        <header className="sticky top-0 z-30 h-[56px] lg:h-[68px] pt-safe bg-white/92 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-5 lg:px-7 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setMobileOpen(true)}
              className="lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </motion.button>

            <div className="hidden sm:flex w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 items-center justify-center text-indigo-600 shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-[13.5px] sm:text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  SKYX
                  <span className="hidden sm:inline"> ACADEMY</span>
                </span>
                <span className="hidden md:inline text-[11px] font-bold tracking-wider uppercase text-indigo-600 whitespace-nowrap">
                  {activePanel === "admin" ? "Executive Dashboard" : "Learning Workspace"}
                </span>
              </div>
              <div className="hidden lg:block text-[10.5px] font-medium text-slate-400 tracking-wide truncate">
                AI-POWERED DIGITAL TEXTBOOK & INTERACTIVE STUDY PLATFORM
              </div>
            </div>
          </div>

          {/* Right Controls (Open Reader hidden on mobile per PWA spec!) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Desktop-only Primary CTA Button */}
            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handlePrimaryCta}
              className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5B52F5] via-[#6B54F7] to-[#7C5CF8] hover:brightness-105 text-white text-xs font-semibold shadow-[0_8px_22px_-4px_rgba(99,102,241,0.55)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{activePanel === "admin" ? "Create new" : "Open Reader"}</span>
            </motion.button>

            {/* Mobile Compact Search Trigger */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsSearchOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
              aria-label="Search library"
            >
              <Search className="w-4 h-4" />
            </motion.button>

            {/* Desktop Cmd+K Search Bar */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-2.5 w-56 xl:w-60 px-3.5 py-2 rounded-xl bg-slate-50/90 border border-slate-200/90 text-xs text-slate-500 hover:border-indigo-300 hover:bg-white hover:text-slate-700 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="flex-1 text-left truncate">Search or jump to...</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">
                ⌘K
              </kbd>
            </button>

            {/* Animated Learner / Admin Switcher (kept clean on mobile & desktop) */}
            {isAdmin && (
              <div className="relative flex items-center p-0.5 sm:p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                {(["learner", "admin"] as const).map((panel) => {
                  const active = activePanel === panel;
                  return (
                    <button
                      key={panel}
                      type="button"
                      onClick={() => setActivePanel(panel)}
                      className={`relative z-10 inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? panel === "admin"
                            ? "text-white"
                            : "text-slate-900"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="panelSwitchPill"
                          transition={{ type: "spring", stiffness: 450, damping: 34 }}
                          className={`absolute inset-0 -z-10 rounded-lg shadow-xs ${
                            panel === "admin"
                              ? "bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8]"
                              : "bg-white"
                          }`}
                        />
                      )}
                      {panel === "admin" && <ShieldCheck className="w-3 h-3 hidden sm:inline" />}
                      <span>{panel === "admin" ? "Admin" : "Learner"}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Date Chip (Desktop xl) */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/90 bg-white text-xs font-medium text-slate-600 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{todayFormatted}</span>
            </div>

            {/* Profile Avatar with Animated Dropdown Menu */}
            <div ref={profileMenuRef} className="relative">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setProfileMenuOpen((v) => !v)}
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
                className="inline-flex items-center gap-1 p-0.5 pr-1.5 rounded-full bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/80 transition-colors cursor-pointer"
              >
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-xs font-display font-bold flex items-center justify-center shadow-xs">
                  {userInitial}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${
                    profileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </motion.button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: EASE_OUT }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/15 p-2 z-50"
                  >
                    {/* User Identity Summary */}
                    <div className="px-3 py-2.5 border-b border-slate-100 mb-1.5">
                      <div className="font-display text-xs font-bold text-slate-900 truncate">
                        {userProfile.displayName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {userProfile.email}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActivePanel("learner");
                          setLearnerRoute("dashboard");
                          setProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Dashboard</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePanel("admin");
                            setAdminRoute("overview");
                            setProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                          <span>Admin Panel</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setActivePanel("learner");
                          setLearnerRoute("account");
                          setProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Profile & Settings</span>
                      </button>

                      <div className="pt-1">
                        <PWAInstallButton
                          variant="menu"
                          onAction={() => setProfileMenuOpen(false)}
                        />
                      </div>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Smoothly Animated Route Content Area (padded for sticky PWA bottom bar on mobile) */}
        <main
          className={`flex-1 w-full mx-auto ${
            (activePanel === "admin" ? adminRoute : learnerRoute) === "book-manager"
              ? "px-2.5 pt-2.5 pb-24 sm:px-4 sm:pt-3 lg:px-5 lg:pt-3 lg:pb-6 max-w-[1680px]"
              : "px-3.5 pt-3.5 pb-24 sm:px-5 sm:pt-5 lg:p-7 max-w-[1440px]"
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={routeKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Native PWA Sticky 5-Button Mobile Bottom Bar (2 left · Center Hero · 2 right) */}
      <nav
        aria-label="Mobile quick navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/94 backdrop-blur-xl border-t border-slate-200/85 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] pb-safe"
      >
        <div className="grid grid-cols-5 items-end h-[60px] max-w-lg mx-auto px-1">
          {mobileBottomItems.map((item) => {
            const Icon = item.icon;
            if (item.isCenter) {
              return (
                <div key={item.id} className="flex flex-col items-center justify-end pb-1.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={item.onClick}
                    className={`-mt-5 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_22px_rgba(91,82,245,0.45)] ring-4 ring-white transition-all cursor-pointer ${
                      item.isActive
                        ? "bg-gradient-to-br from-[#4F46E5] via-[#6D55F7] to-[#8B5CF6]"
                        : "bg-gradient-to-br from-[#5B52F5] via-[#6D55F7] to-[#7C5CF8]"
                    }`}
                    aria-label={item.label}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.button>
                  <span
                    className={`text-[10px] font-semibold mt-0.5 leading-none truncate max-w-full ${
                      item.isActive ? "text-indigo-600" : "text-slate-600"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            }

            return (
              <motion.button
                key={item.id}
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={item.onClick}
                className={`relative flex flex-col items-center justify-center h-full pb-1 pt-1.5 transition-colors cursor-pointer ${
                  item.isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.isActive && (
                  <motion.span
                    layoutId="mobileBottomActiveBar"
                    transition={SPRING_FAST}
                    className="absolute top-0 w-7 h-[2.5px] rounded-b-full bg-gradient-to-r from-[#5B52F5] to-[#7C5CF8]"
                  />
                )}
                <Icon className="w-[19px] h-[19px]" />
                <span className="text-[10px] font-semibold mt-1 leading-none truncate">
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
