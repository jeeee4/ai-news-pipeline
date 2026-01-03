import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI News Pipeline",
  description: "Daily AI news summaries from Hacker News",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
