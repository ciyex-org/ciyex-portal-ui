import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserProvider } from "@/hooks/useUser";   // ✅ add this

const outfit = Outfit({
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Ciyex Connect",
    description: "Patient Portal",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
            <SidebarProvider>
                <UserProvider>      {/* ✅ wrap your app */}
                    {children}
                </UserProvider>
            </SidebarProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}
