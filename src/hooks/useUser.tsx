"use client";

import { getEnv } from "@/utils/env";
import React, { createContext, useContext, useState, useEffect } from "react";

interface Org {
    orgId?: number;
    orgName?: string;
    roles?: string[];
}

interface User {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    dateOfBirth?: string;
    securityQuestion?: string;
    securityAnswer?: string;
    token?: string;
    orgIds?: number[];
    orgs?: Org[];
    role?: string;
}

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    updateUser: (updates: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    // Restore from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("user");
        if (saved) {
            try {
                setUser(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved user", e);
            }
        }
    }, []);

    const updateUser = async (updates: Partial<User>) => {
        if (!user) return;

        const updatedUser = { ...user, ...updates };

        const res = await fetch(
            `${getEnv("NEXT_PUBLIC_API_URL")}/api/auth/user/${user.email}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify(updatedUser),
            }
        );

        if (!res.ok) {
            throw new Error("Failed to update user");
        }

        const data = await res.json();
        setUser(data.data);
        localStorage.setItem("user", JSON.stringify(data.data));
    };

    return (
        <UserContext.Provider value={{ user, setUser, updateUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used inside UserProvider");
    }
    return context;
};
