"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EllipsisVertical, type LucideIcon } from "lucide-react";

interface ReaderShortcut {
  label: string;
  icon: LucideIcon;
  run: () => void;
  desktopOnly?: boolean;
  disabled?: boolean;
}

export default function ReaderShortcutRail({
  documentTitle,
  shortcuts,
}: {
  documentTitle?: string;
  shortcuts: ReaderShortcut[];
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (root.current?.contains(document.activeElement)) trigger.current?.focus();
      setOpen(false);
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape, true);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="absolute left-0 top-1/2 z-20 flex -translate-y-1/2 items-center"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !root.current?.querySelector(":focus-visible")) {
          setOpen(false);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label="Reader shortcuts"
        aria-expanded={open}
        aria-controls={panelId}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) setOpen(true);
        }}
        onClick={() => setOpen((value) => !value)}
        className="group flex h-12 w-11 items-center justify-start text-indigo-700 focus-visible:outline-indigo-600"
      >
        <span className="flex h-10 w-5 items-center justify-center rounded-r-full border border-l-0 border-indigo-200 bg-white/90 shadow-sm backdrop-blur-md group-hover:bg-indigo-50">
          <EllipsisVertical aria-hidden="true" className="size-4" />
        </span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="max-h-[min(22rem,65dvh)] w-44 max-w-[calc(100vw-4rem)] overflow-y-auto rounded-xl border border-indigo-100 bg-white/95 p-1.5 text-slate-800 shadow-lg backdrop-blur-md"
      >
        <div className="border-b border-slate-200 px-2 pb-1.5 text-xs font-semibold text-indigo-700">
          Smart Reader
          {documentTitle && (
            <div className="truncate font-normal text-slate-600" title={documentTitle}>
              {documentTitle}
            </div>
          )}
        </div>
        {shortcuts.map(({ label, icon: Icon, run, disabled, desktopOnly }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => {
              trigger.current?.focus({ preventScroll: true });
              setOpen(false);
              run();
            }}
            className={`${desktopOnly ? "hidden lg:flex" : "flex"} min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold hover:bg-indigo-50 focus-visible:bg-indigo-50 disabled:opacity-50`}
          >
            <Icon aria-hidden="true" className="size-4 text-indigo-600" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
