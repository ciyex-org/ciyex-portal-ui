import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { EnvProvider } from "@/context/EnvContext";
import { UserProvider } from "@/hooks/useUser";   // ✅ add this

const outfit = Outfit({
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Ciyex Connect",
    description: "Patient Portal",
    icons: {
        icon: ['/shield-favicon.ico'],
        shortcut: '/shield-favicon.ico',
        apple: '/shield-favicon.ico',
    },
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <head>
            <link rel="icon" href="/shield-favicon.ico" type="image/x-icon" />
            <link rel="shortcut icon" href="/shield-favicon.ico" type="image/x-icon" />
        </head>
        <body className={`${outfit.className} dark:bg-gray-900`}>
        <EnvProvider>
            <ThemeProvider>
                <SidebarProvider>
                    <UserProvider>      {/* ✅ wrap your app */}
                        {children}
                    </UserProvider>
                </SidebarProvider>
            </ThemeProvider>
        </EnvProvider>
        </body>
        </html>
    );
}
