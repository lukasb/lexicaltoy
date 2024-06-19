import { Inter } from "next/font/google";
import Head from "next/head";

const inter = Inter({ subsets: ["latin"] });

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
    <Head>
      <title>🍊✅</title>
      <meta name="description" content="orangetask 0.1.0" />
    </Head>
      <main className={inter.className}>{children}</main>
      </>
  );
}