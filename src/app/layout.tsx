import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

/**
 * 初回描画前に配色テーマ（light/dark/system）を確定させ、ちらつき（一瞬ダーク→ライトに切り替わる等）を防ぐ。
 * ThemeToggle（src/components/ThemeToggle.tsx）と同じ判定ロジックをここでも独立して持つ必要がある
 * （Reactのハイドレーション前に生JSで.darkクラスを当てる必要があるため）。
 */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem("sf6-command-lab-settings");
    var theme = "system";
    if (raw) {
      var parsed = JSON.parse(raw);
      theme = (parsed && parsed.state && parsed.state.theme) || "system";
    }
    var isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://sf6-command-lab-xwh5-ctcb2cjxo-httori85s-projects.vercel.app";
const SITE_TITLE = "スト6コマンド練習ラボ";
const SITE_DESCRIPTION =
  "ストリートファイター6のコマンド入力を無料で練習できるツール。実機準拠のフレーム判定、全29キャラの必殺技・SA対応、キーボード/ゲームパッド対応。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: ["ストリートファイター6", "スト6", "コマンド入力", "格闘ゲーム", "練習", "SF6"],
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_TITLE,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {/* パブリッシャーID未設定の間は読み込まない（AdSense審査通過後、Vercelの環境変数に
            NEXT_PUBLIC_ADSENSE_CLIENT_ID を設定するだけで有効になる） */}
        {ADSENSE_CLIENT_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        {children}
      </body>
    </html>
  );
}
