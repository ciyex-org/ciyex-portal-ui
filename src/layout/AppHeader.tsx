"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";

const AppHeader: React.FC = () => {
    const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
    const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleToggle = () => {
        if (window.innerWidth >= 1024) {
            toggleSidebar();
        } else {
            toggleMobileSidebar();
        }
    };

    const toggleApplicationMenu = () => {
        setApplicationMenuOpen(!isApplicationMenuOpen);
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "k") {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return (
        <header className="sticky top-0 flex w-full bg-white border-gray-200 z-50 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
            <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
                <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
                    {/* Sidebar Toggle */}
                    <button
                        className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
                        onClick={handleToggle}
                        aria-label="Toggle Sidebar"
                    >
                        {isMobileOpen ? (
                            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M6.22 7.28a.75.75 0 0 1 1.06 0L12 11.94l4.72-4.66a.75.75 0 0 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L10.94 12 6.22 7.28Z"
                                />
                            </svg>
                        ) : (
                            <svg width="16" height="12" fill="none" viewBox="0 0 16 12">
                                <path
                                    fill="currentColor"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M.58 1c0-.41.34-.75.75-.75h13.33c.41 0 .75.34.75.75s-.34.75-.75.75H1.33c-.41 0-.75-.34-.75-.75Zm0 10c0-.41.34-.75.75-.75h13.33c.41 0 .75.34.75.75s-.34.75-.75.75H1.33a.75.75 0 0 1-.75-.75ZM1.33 5.25c-.41 0-.75.34-.75.75s.34.75.75.75h6.67c.41 0 .75-.34.75-.75s-.34-.75-.75-.75H1.33Z"
                                />
                            </svg>
                        )}
                    </button>

                    {/* Logo */}
                    <Link href="/" className="lg:hidden">
                        <Image width={154} height={32} className="dark:hidden" src="./images/logo/logo.svg" alt="Logo" />
                        <Image width={154} height={32} className="hidden dark:block" src="./images/logo/logo-dark.svg" alt="Logo" />
                    </Link>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={toggleApplicationMenu}
                        className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
                    >
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M6 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm12 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-6 1.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                            />
                        </svg>
                    </button>

                    {/* Search */}
                    <div className="hidden lg:block">
                        <form>
                            <div className="relative">
                                <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                                    <svg className="fill-gray-500 dark:fill-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                            d="M3.04 9.37c0-3.5 2.83-6.33 6.33-6.33 3.5 0 6.33 2.83 6.33 6.33 0 3.5-2.83 6.33-6.33 6.33-3.5 0-6.33-2.83-6.33-6.33Zm6.33-7.83c-4.32 0-7.83 3.5-7.83 7.83 0 4.33 3.51 7.83 7.83 7.83 1.89 0 3.62-.67 4.98-1.79l2.82 2.82a.75.75 0 1 0 1.06-1.06l-2.82-2.82a7.8 7.8 0 0 0 1.79-4.98c0-4.33-3.51-7.83-7.83-7.83Z"
                                        />
                                    </svg>
                                </span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search or type command..."
                                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 xl:w-[430px]"
                                />
                                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                                    ⌘ K
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Side */}
                <div
                    className={`${isApplicationMenuOpen ? "flex" : "hidden"} items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
                >
                    <div className="flex items-center gap-2 2xsm:gap-3">
                        <ThemeToggleButton />
                        <NotificationDropdown />
                    </div>
                    <UserDropdown />
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
