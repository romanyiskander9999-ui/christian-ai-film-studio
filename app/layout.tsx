import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALYANBOA CINEMATIC STUDIO | استوديو الينبوع للإنتاج السينمائي",
  description: "استوديو إنتاج سينمائي عربي لتحويل النصوص والقصص إلى سيناريو ومشاهد وتعليق صوتي وفيلم MP4 مع أدوات المونتاج والهوية البصرية.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
