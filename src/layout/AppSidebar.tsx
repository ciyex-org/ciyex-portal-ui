"use client";
import React, { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";

// ---------- Types ----------
type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

// ---------- SVG ICONS ----------
const DashboardIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M3 6h18M3 18h18"/>
  </svg>
);

// const ProfileIcon = (
//   <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zM4 21c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6"/>
//   </svg>
// );

const DemographicsIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 7h14M5 11h14M5 15h10M5 19h6"/>
  </svg>
);

const AppointmentIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7H3v12a2 2 0 002 2z"/>
  </svg>
);

// const EncounterIcon = (
//   <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h5a2 2 0 012 2v12a2 2 0 01-2 2z"/>
//   </svg>
// );

const VitalsIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16M12 4v16"/>
  </svg>
);

const MedicationsIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-6 0H7a2 2 0 01-2-2V8a2 2 0 012-2h4l2 2h4a2 2 0 012 2v2"/>
  </svg>
);

const AllergiesIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth={2}/>
  </svg>
);

const MessagesIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 4h8m5-9v10a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);

const DocumentsIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9M12 4h9M4 9h16M4 15h16"/>
  </svg>
);

const EducationIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 7v-6"/>
  </svg>
);

const BillingIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-3.866 0-7 1.343-7 3v5c0 1.657 3.134 3 7 3s7-1.343 7-3v-5c0-1.657-3.134-3-7-3z"/>
  </svg>
);

const InsuranceIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const LabsIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M9 17h6M12 3v14"/>
  </svg>
);

const ReportsIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M5 7h14M5 19h14"/>
  </svg>
);

const SettingsIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317l.895-1.789a2 2 0 013.56 0l.894 1.789a2 2 0 001.517 1.087l1.988.29a2 2 0 011.11 3.415l-1.438 1.402a2 2 0 00-.576 1.77l.34 1.982a2 2 0 01-2.905 2.104l-1.781-.936a2 2 0 00-1.862 0l-1.78.936a2 2 0 01-2.906-2.104l.34-1.982a2 2 0 00-.576-1.77L4.7 9.109a2 2 0 011.11-3.415l1.987-.29a2 2 0 001.518-1.087z"/>
  </svg>
);

// ---------- Nav Items ----------
const navItems: NavItem[] = [
  { name: "Dashboard", icon: DashboardIcon, path: "/dashboard" },
  // { name: "Profile", icon: ProfileIcon, path: "/profile" },
  { name: "Demographics", icon: DemographicsIcon, path: "/profile" },
  { name: "Appointments", icon: AppointmentIcon, path: "/appointments" },
  // { name: "Encounters", icon: EncounterIcon, path: "/encounters" },
  { name: "Vitals", icon: VitalsIcon, path: "/vitals" },
  { name: "Medications", icon: MedicationsIcon, path: "/medications" },
  { name: "Allergies & History", icon: AllergiesIcon, path: "/allergies" },
  { name: "Messages", icon: MessagesIcon, path: "/messages" },
  { name: "Documents", icon: DocumentsIcon, path: "/documents" },
  { name: "Patient Education", icon: EducationIcon, path: "/education" },
  { name: "Billing", icon: BillingIcon, path: "/billing" },
  { name: "Insurance", icon: InsuranceIcon, path: "/insurance" },
  { name: "Labs", icon: LabsIcon, path: "/labs" },
  { name: "Reports", icon: ReportsIcon, path: "/reports" },
];

// ---------- Sidebar ----------
const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen ? "w-[280px]" : isHovered ? "w-[280px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className="py-8 flex justify-center">
        {isExpanded || isHovered || isMobileOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle"
              fontFamily="Poppins, Arial, sans-serif" fontSize="34" fontWeight="800" fill="#1e3a8a">
              Ciyex
            </text>
            <text x="50%" y="75%" dominantBaseline="middle" textAnchor="middle"
              fontFamily="Poppins, Arial, sans-serif" fontSize="24" fontWeight="600" fill="url(#grad)">
              Connect
            </text>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <defs>
              <linearGradient id="gradSmall" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="8" fill="url(#gradSmall)" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle"
              fontFamily="Poppins, Arial, sans-serif" fontSize="16" fontWeight="700" fill="white">
              CC
            </text>
          </svg>
        )}
      </div>

      {/* Menu Items */}
      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar py-6">
        <ul className="flex flex-col gap-2">
          {navItems.map((nav) => (
            <li key={nav.name}>
              <Link
                href={nav.path}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"}`}
              >
                <span className={`${isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Settings pinned bottom */}
      <div className="border-t dark:border-gray-700 py-4">
        <Link
          href="/settings"
          className={`menu-item group ${isActive("/settings") ? "menu-item-active" : "menu-item-inactive"}`}
        >
          <span className={`${isActive("/settings") ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
            {SettingsIcon}
          </span>
          {(isExpanded || isHovered || isMobileOpen) && (
            <span className="menu-item-text">Settings</span>
          )}
        </Link>
      </div>
    </aside>
  );
};

export default AppSidebar;
