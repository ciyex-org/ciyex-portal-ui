"use client";

import { getEnv } from "@/utils/env";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { getInitials } from "@/utils/getInitials";
import { useRouter } from "next/navigation";
import { clearAuth, getPrimaryGroup, getGroupDisplayName } from '@/utils/authUtils';

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImage?: string;
  } | null>(null);
  const [primaryGroupDisplay, setPrimaryGroupDisplay] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser({
          firstName: parsed.firstName,
          lastName: parsed.LastName || parsed.lastName,
          email: parsed.email,
          profileImage: parsed.profileImage,
        });
      } catch (err) {
        console.error("Failed to parse user from localStorage", err);
      }
    }

    // Show primary Keycloak group as the user's context (if present)
    const pg = getPrimaryGroup();
    if (pg) setPrimaryGroupDisplay(getGroupDisplayName(pg));
  }, []);

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleSignOut = () => {
    // Read auth method before clearing state
    const authMethod = localStorage.getItem('authMethod');

    // Clear application auth state
    try {
      clearAuth();
      sessionStorage.removeItem('pkce_code_verifier');
    } catch (e) {
      console.warn('Error clearing auth state', e);
    }

    // If Keycloak was the auth method, redirect to Keycloak logout
    if (authMethod === 'keycloak') {
      const keycloakUrl = getEnv("NEXT_PUBLIC_KEYCLOAK_URL");
      const keycloakRealm = getEnv("NEXT_PUBLIC_KEYCLOAK_REALM");
      const keycloakClientId = getEnv("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID");

      if (keycloakUrl && keycloakRealm) {
        const redirect = encodeURIComponent(window.location.origin + '/signin');
        const clientParam = keycloakClientId ? `&client_id=${encodeURIComponent(keycloakClientId)}` : '';
        const logoutUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/logout?redirect_uri=${redirect}${clientParam}`;
        // Redirecting the browser to Keycloak logout will also clear IdP session cookies
        window.location.href = logoutUrl;
        return;
      }
    }

    // Fallback: go back to sign-in page
    router.push('/signin');
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dark:text-gray-400 dropdown-toggle"
      >
        <span className="mr-3 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold text-sm">
          {getInitials(user?.firstName, user?.lastName)}
        </span>
        <div className="flex flex-col items-start mr-1">
          <span className="block font-medium text-theme-sm">
            {user?.firstName || "User"}
          </span>
          {primaryGroupDisplay && (
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {primaryGroupDisplay}
            </span>
          )}
        </div>
        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <div>
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {user?.email}
          </span>
          {primaryGroupDisplay && (
            <span className="mt-0.5 block text-theme-xs text-indigo-600 dark:text-indigo-400">
              {primaryGroupDisplay}
            </span>
          )}
        </div>

        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/demographics"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              ✏️ Edit Profile
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              ⚙️ Account Settings
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/support"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              🛟 Support
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/select-practice"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              🔀 Switch Practice
            </DropdownItem>
          </li>
        </ul>

        <Link
          href="/signin"
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-red-600 rounded-lg group text-theme-sm hover:bg-red-50 dark:text-red-400 dark:hover:bg-white/5"
        >
          🚪 Sign out
        </Link>
      </Dropdown>
    </div>
  );
}
