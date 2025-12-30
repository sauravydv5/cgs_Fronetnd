import { AdminLayout } from "@/components/AdminLayout";
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  ClipboardList,
  BarChart2,
  Layers,
  Percent,
  Hash,
} from "lucide-react";

export default function Reports() {
  const navigate = useNavigate();

  const reports = [
    {
      title: "Sale Tax Register",
      icon: <ClipboardList size={28} />,
      path: "/reports/sale-tax-register",
    },
    {
      title: "Bill Wise Report",
      icon: <FileText size={28} />,
      path: "/reports/bill-wise-report",
    },
    {
      title: "HSN Wise",
      icon: <Hash size={28} />,
      path: "/reports/hsn-wise",
    },
    {
      title: "Bill HSN Wise",
      icon: <Layers size={28} />,
      path: "/reports/bill-hsn-wise",
    },
    {
      title: "GST Return",
      icon: <Percent size={28} />,
      path: "/reports/gst-return",
    },
    {
      title: "Bill Number",
      icon: <BarChart2 size={28} />,
      path: "/reports/bill-number",
    },
    {
      title: "Item Wise Sale Report",
      icon: <Percent size={28} />,
      path: "/reports/item-wise-sale-report",
    },
    {
      title: "Sale Register",
      icon: <BarChart2 size={28} />,
      path: "/reports/sale-register",
    },
  ];

  return (
    <AdminLayout title="Reports">
      <div className="flex flex-col items-center justify-center p-3 min-h-[70vh]">

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {reports.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="w-[217px] h-[140px] bg-[#E98C81] text-white rounded-[20px] shadow-[0_2px_6px_rgba(0,0,0,0.15)] border border-[#da7d72] flex flex-col items-center justify-center gap-3 hover:bg-[#e67f74] hover:scale-[1.03] transition-all duration-300 focus:outline-none"
            >
              <div>{item.icon}</div>
              <span className="text-[17px] font-semibold">{item.title}</span>
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
