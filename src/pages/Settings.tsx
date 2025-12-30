"use client";
import React from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { ChevronRight } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();

  const settingsOptions = [
    { id: 1, label: "Profile Settings", path: "/profile" },
    { id: 2, label: "Forgot Password", path: "/settings/forgot-password" },
  ];

  return (
    <AdminLayout title="Settings">
      <div className="flex flex-col items-start w-full px-8 mt-6">
        <div className="w-full max-w-2xl space-y-4 md:w-[70%]">
          {settingsOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => navigate(option.path)}
              className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-5 py-4 shadow-sm transition-all hover:bg-gray-50"
            >
              <span className="text-base font-medium text-gray-800">
                {option.label}
              </span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
