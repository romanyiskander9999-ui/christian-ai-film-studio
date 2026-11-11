import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "استوديو الينبوع السينمائي",
  description: "استوديو عربي لإعداد سيناريوهات ومشاهد الأفلام والقصص المسيحية.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
