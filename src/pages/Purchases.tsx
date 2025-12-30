import React from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { ClipboardList, FileText, RotateCcw, TicketPercent } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Purchases() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Purchasers Detail",
      icon: <ClipboardList size={28} />,
      path: "/purchases/purchasers-detail",
    },
    {
      title: "Purchase Detail",
      icon: <FileText size={28} />,
      path: "/purchases/purchase-detail",
    },
    {
      title: "Return Purchase",
      icon: <RotateCcw size={28} />,
      path: "/purchases/return-purchases",
    },
    {
      title: "Purchase Voucher",
      icon: <TicketPercent size={28} />,
      path: "/purchases/purchase-voucher",
    },
  ];

  return (
    <AdminLayout title="Purchases">
      <div className="p-8">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="flex flex-wrap justify-center gap-8">
            {cards.map((card, index) => (
              <div
                key={index}
                onClick={() => navigate(card.path)}
                className="flex flex-col items-center justify-center w-[180px] h-[130px] rounded-xl transition-transform hover:scale-105 cursor-pointer"
                style={{
                  backgroundColor: "#e48a7c",
                  color: "white",
                  boxShadow: "3px 3px 10px rgba(0, 0, 0, 0.2)",
                }}
              >
                <div className="mb-3">{card.icon}</div>
                <span className="text-sm font-medium">{card.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
