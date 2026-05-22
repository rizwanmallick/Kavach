import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { UserProvider } from "@/context/user-context";
import { BootWrapper } from "@/components/BootWrapper";
import { InactivityHandler } from "@/components/InactivityHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kavach - Cybersecurity Learning Platform",
  description: "Learn cybersecurity through gamified modules and interactive challenges",
  icons: {
    icon: '/kavach_logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>
          <InactivityHandler />
          <Providers>
            <BootWrapper>{children}</BootWrapper>
          </Providers>
        </UserProvider>
      </body>
    </html>
  );
}
