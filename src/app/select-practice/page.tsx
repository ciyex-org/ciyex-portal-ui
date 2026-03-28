"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Org {
  orgId: number;
  orgName: string;
  city?: string;
  state?: string;
  country?: string;
}

export default function SelectPracticePage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const router = useRouter();

  useEffect(() => {
    const storedOrgs = localStorage.getItem("orgs");
    if (storedOrgs) {
      try {
        setOrgs(JSON.parse(storedOrgs));
      } catch (err) {
        console.error("Invalid orgs in localStorage:", err);
      }
    }
  }, []);

  const handleSelect = (org: Org) => {
    localStorage.setItem("orgId", org.orgId.toString());
    localStorage.setItem("orgName", org.orgName);

    // 🚨 Also update user object so UserDropdown re-renders instantly
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        parsed.orgName = org.orgName; // attach current org name
        localStorage.setItem("user", JSON.stringify(parsed));
      } catch (err) {
        console.error("Failed to update user with orgName", err);
      }
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">
          Select Your Practice
        </h1>
        {orgs.length === 0 ? (
          <p className="text-center text-gray-500">
            No practices available. Please log in again.
          </p>
        ) : (
          <ul className="space-y-4">
            {orgs.map((org) => (
              <li
                key={org.orgId}
                className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold text-gray-800">{org.orgName}</p>
                  <p className="text-sm text-gray-500">
                    {[org.city, org.state, org.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
                <button
                  onClick={() => handleSelect(org)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Select
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
