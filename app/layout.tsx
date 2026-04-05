import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Your personal AI command center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0, background: "#030314" }}>
        {children}
      </body>
    </html>
  );
}
