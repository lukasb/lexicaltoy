import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

/*export const metadata: Metadata = {
  title: "🍊✅",
  description: "orangetask 0.1.0",
};*/

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <main>{children}</main>
  );
}