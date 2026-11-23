"use client";

import React, { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const sync = setTimeout(() => {
      setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    }, 0);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearTimeout(sync);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-[60px] lg:top-[72px] left-1/2 -translate-x-1/2 z-[65] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-600 text-white text-xs font-semibold shadow-lg">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Viewing cached data</span>
    </div>
  );
}
