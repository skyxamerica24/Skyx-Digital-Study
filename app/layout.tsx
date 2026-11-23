import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#070B16",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Skyx Academy — AI Digital Learning & Interactive Book Platform",
  description:
    "AI-powered digital education & interactive book learning platform featuring structured academic, medical, BCS & IELTS libraries, Gemini study tabs, Three.js 3D diagrams, timed MCQ exams, and real-time AI voice tutoring.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Skyx Academy",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Skyx Academy — AI Digital Learning & Interactive Book Platform",
    description:
      "Read, highlight, visualize in 3D, practice timed MCQ exams, and learn with an AI Voice Tutor inside Skyx Academy.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skyx Academy — AI Digital Learning & Interactive Book Platform",
    description:
      "AI-powered digital book library, Three.js 3D lab, timed MCQ exam engine, and real-time AI voice tutor.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className="font-sans antialiased bg-[#F2F5FA] text-slate-900 selection:bg-indigo-200 selection:text-indigo-950"
      >
        {children}
      </body>
    </html>
  );
}
