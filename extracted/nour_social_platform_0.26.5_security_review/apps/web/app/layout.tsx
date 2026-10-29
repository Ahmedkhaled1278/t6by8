import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "نُور — مساحة تجمعنا",
  description: "نُور مشروع لمنصة اجتماعية عربية تجمع المنشورات والمجتمعات والمحادثات في تجربة واحدة.",
  applicationName: "نُور",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/nour-mark.svg", type: "image/svg+xml" }, { url: "/icons/nour-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/icons/nour-192.png", sizes: "192x192", type: "image/png" }] },
  openGraph: {
    title: "نُور — مساحة تجمعنا",
    description: "منصة اجتماعية عربية قيد البناء، الخصوصية وسهولة الاستخدام في المقدمة.",
    locale: "ar_EG",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08796e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}<PwaRegister /></body></html>;
}
