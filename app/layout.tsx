import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Ton assistant IA personnel",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aria",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#030314" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#030314" }}>
        {children}
      </body>
    </html>
  );
}
