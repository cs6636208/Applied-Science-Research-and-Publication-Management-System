import type { Metadata } from "next";
import { Prompt, Inter } from "next/font/google";
import Navbar from "./components/Navbar";
import "./globals.css";

const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบบริหารจัดการงานวิจัยและผลงานตีพิมพ์ คณะวิทยาศาสตร์ประยุกต์ | Applied Science Research and Publication Management System",
  description: "ระบบบริหารจัดการงานวิจัยและผลงานตีพิมพ์ คณะวิทยาศาสตร์ประยุกต์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      data-scroll-behavior="smooth"
      className={`${prompt.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-[#f6f8fa] text-slate-700 font-sans selection:bg-orange-200 selection:text-orange-900">
        <Navbar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}

