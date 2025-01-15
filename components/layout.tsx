import { Inter } from "next/font/google";
import Head from "next/head";

const inter = Inter({ subsets: ["latin"] });

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  //<link rel="manifest" href="/site.webmanifest" />
  return (
    <>
      <Head>
        <title>🍊✅</title>
        <meta name="description" content="orangetask 0.1.0" />
        <meta name="theme-color" content="#596BF6" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <meta content="width=device-width, initial-scale=1, user-scalable=no" name="viewport" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </Head>
      <main className={inter.className}>{children}</main>
    </>
  );
}