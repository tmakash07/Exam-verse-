import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ErrorBoundary } from "@/components/ui";

export const metadata: Metadata = { title: "ExamVerse — Online Exam Platform", description: "Mock tests, practice and analytics for admission exam preparation." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4f46e5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='dark'||(!localStorage.getItem('theme')&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}` }} /></head>
      <body><ErrorBoundary><AuthProvider>{children}</AuthProvider></ErrorBoundary></body>
    </html>
  );
}
