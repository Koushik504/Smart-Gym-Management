import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Smart Gym | Management & Workout Analytics",
  description:
    "Membership operations, workout intelligence and a healthier gym.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
