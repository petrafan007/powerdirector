import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getConfigManager } from "../lib/config-instance";
import SidebarLayout from "./SidebarLayout";
import { SettingsProvider } from "./config/SettingsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PowerDirector",
  description: "Reliability-first AI orchestration and chat control",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ui = getConfigManager().getSection("ui", false) as any;
  const theme = ui?.theme || "system";
  const fontSize = Number(ui?.fontSize || 14);
  const fontFamily = ui?.fontFamily || "Geist, Inter, system-ui, sans-serif";
  const sidebarWidth = Number(ui?.sidebarWidth || 256);
  const showTimestamps = ui?.showTimestamps !== false;
  const showToolCalls = ui?.showToolCalls !== false;
  const codeHighlighting = ui?.codeHighlighting !== false;
  const markdownRendering = ui?.markdownRendering !== false;

  return (
    <html lang="en" data-pd-theme={theme}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          ["--pd-font-size" as any]: `${fontSize}px`,
          ["--pd-font-family" as any]: fontFamily,
          ["--pd-sidebar-width" as any]: `${sidebarWidth}px`
        }}
        data-pd-show-timestamps={showTimestamps ? "true" : "false"}
        data-pd-show-tool-calls={showToolCalls ? "true" : "false"}
        data-pd-code-highlighting={codeHighlighting ? "true" : "false"}
        data-pd-markdown-rendering={markdownRendering ? "true" : "false"}
      >
        <SettingsProvider>
          <SidebarLayout>
            {children}
          </SidebarLayout>
        </SettingsProvider>
      </body>
    </html>
  );
}
