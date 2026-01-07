"use client";
import { AdminLayout } from "@/components/AdminLayout";
import { getAllReports, getReportsByDateRange } from "@/adminApi/reportApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function GSTReturn() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [gstNumber, setGstNumber] = useState("03AATFC3920N125"); // Placeholder

  const initialColumns = [
    { id: "sno", label: "SNO." },
    { id: "description", label: "DESCRIPTION" },
    { id: "docType", label: "DOC TYPE" },
    { id: "invoiceValue", label: "INVOICE VALUE" },
    { id: "invoiceValueTcs", label: "INVOICE VALUE WITH TCS" },
    { id: "taxableValue", label: "TAXABLE VALUE" },
    { id: "centralTax", label: "CENTRAL TAX AMT" },
    { id: "stateTax", label: "STATE UT TAX AMOUNT" },
    { id: "integratedTax", label: "INTEGRATED TAX AMOUNT" },
    { id: "cess", label: "CESS" },
    { id: "totalTax", label: "TOTAL TAX" },
  ];

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("gstReturnColumnOrder");
    return savedOrder ? JSON.parse(savedOrder) : initialColumns;
  });

  useEffect(() => {
    const fetchGSTReport = async () => {
      setLoading(true);
      setError(null);
      try {
        let response;
        if (reportDate) {
          const dateObj = new Date(reportDate);
          const startDate = format(startOfMonth(dateObj), "yyyy-MM-dd");
          const endDate = format(endOfMonth(dateObj), "yyyy-MM-dd");
          response = await getReportsByDateRange(startDate, endDate);
        } else {
          response = await getAllReports();
        }
        if (response.success && Array.isArray(response.bills)) {
          const billsData = response.bills;

          // Aggregate sales data for GST Return
          const aggregatedData: { [key: string]: any } = {};

          billsData.forEach((bill: any) => {
            const partyType = bill.partyType || "Unknown"; // partyType not in provided data, will fallback
            let description = "Other Supplies";
            let docType = "OTHERS";

            if (partyType.toLowerCase() === "retail" || partyType.toLowerCase() === "customer") {
              description = "B2C Large Invoices"; // Assuming B2CL for retail/customer
              docType = "B2CL";
            } else if (partyType.toLowerCase() === "wholesale") {
              description = "B2B Invoices";
              docType = "B2B";
            }

            if (!aggregatedData[docType]) {
              aggregatedData[docType] = {
                id: docType,
                description: description,
                docType: docType,
                invoiceValue: 0,
                invoiceValueTcs: 0, // Not available in current API
                taxableValue: 0,
                centralTax: 0,
                stateTax: 0,
                integratedTax: 0,
                cess: 0, // Not available in current API
                totalTax: 0,
              };
            }

            aggregatedData[docType].invoiceValue += bill.netAmount || 0;
            aggregatedData[docType].taxableValue += bill.taxableAmount || 0;
            aggregatedData[docType].centralTax += bill.totalCGST || 0;
            aggregatedData[docType].stateTax += bill.totalSGST || 0;
            aggregatedData[docType].integratedTax += bill.totalIGST || 0;
            aggregatedData[docType].totalTax += (bill.totalCGST || 0) + (bill.totalSGST || 0) + (bill.totalIGST || 0);
          });

          setData(Object.values(aggregatedData));
        } else {
          setError("Failed to fetch GST return data.");
        }
      } catch (err) {
        setError("An error occurred while fetching the report.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGSTReport();
  }, [reportDate, gstNumber]); // Refetch when date or GST number changes

  useEffect(() => {
    localStorage.setItem("gstReturnColumnOrder", JSON.stringify(columns));
  }, [columns]);

  const SortableHeader = ({ column }: { column: { id: string; label: string } }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: column.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <th
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="border px-4 py-2 font-medium text-left cursor-grab"
      >
        {column.label}
      </th>
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleExport = () => {
    if (!data || data.length === 0) return;

    const csvContent = [
      columns.map((col) => col.label).join(","),
      ...data.map((row) =>
        columns
          .map((col) => {
            const val = row[col.id];
            const str = String(val ?? "");
            return str.includes(",") ? `"${str}"` : str;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `GST_Return_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout title="Report > GST Return">
      <div className="bg-white p-8 rounded-xl">
        {/* Top Filters */}
        <div className="flex items-center justify-center mb-6 gap-6">
          <div className="flex items-center gap-6 pb-4">
            {/* Date */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Report Date</label>
              <Input
                type="date" // Changed to type="date" for native date picker
                placeholder="DD-MM-YY"
                className="w-[145px] h-[42px] rounded-[12px] bg-[#EDEDED] border border-gray-200 text-center text-gray-800 font-medium shadow-sm focus-visible:ring-0"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
            
            {/* GST Number */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">GST Number</label>
              <Input
                placeholder="03AATFC3920N125"
                className="w-[215px] h-[42px] rounded-[12px] bg-[#EDEDED] border border-gray-200 text-center text-gray-800 font-medium shadow-sm focus-visible:ring-0"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={loading || data.length === 0}
            className="flex items-center gap-2 bg-[#F46C6C] hover:bg-[#f35454] text-white text-sm px-6 py-5 h-[42px] rounded-full shadow-sm"
          >
            Export <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* Info Card */}
        <div className="rounded-xl p-5 mb-6 bg-[#EBEBEB] shadow-sm border border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-2">
            GSTR1 - Details of outward supplies for {format(new Date(reportDate), "MM/yyyy")}
          </h2>
          <p className="text-sm text-gray-700">
            Company Name : Cheap General Store {/* Placeholder */}
          </p>
          <p className="text-sm text-gray-700">Period Name : {format(new Date(reportDate), "yyyy-MM")}</p> {/* Derived from reportDate */}
          <p className="text-sm text-gray-700">GST No. : {gstNumber}</p>
          <p className="text-sm text-gray-700">GST Date : {format(new Date(reportDate), "dd-MMM-yy")}</p>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
          {(() => {
            const columnIds = columns.map((c) => c.id); // Ensure columnIds is defined here
            const renderCell = (row: any, columnId: string, index: number) => {
              switch (columnId) {
                case "sno": return <td className="border px-4 py-2">{index + 1}</td>;
                case "description": return <td className="border px-4 py-2">{row.description}</td>;
                case "docType": return <td className="border px-4 py-2">{row.docType}</td>;
                case "invoiceValue": return <td className="border px-4 py-2">{row.invoiceValue}</td>;
                case "invoiceValueTcs": return <td className="border px-4 py-2">{row.invoiceValueTcs}</td>;
                case "taxableValue": return <td className="border px-4 py-2">{row.taxableValue}</td>;
                case "centralTax": return <td className="border px-4 py-2">{row.centralTax}</td>;
                case "stateTax": return <td className="border px-4 py-2">{row.stateTax}</td>;
                case "integratedTax": return <td className="border px-4 py-2">{row.integratedTax}</td>;
                case "cess": return <td className="border px-4 py-2">{row.cess}</td>;
                case "totalTax": return <td className="border px-4 py-2">{row.totalTax}</td>;
                default: return null;
              }
            };

            return (
              <table className="min-w-full text-sm text-gray-800 border-collapse">
                <thead className="bg-[#F9F9F9]">
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                      <tr>
                        {columns.map((column) => (
                          <SortableHeader key={column.id} column={column} />
                        ))}
                      </tr>
                    </SortableContext>
                  </DndContext>
                </thead>
                {loading ? (
                  <tbody><tr><td colSpan={columns.length} className="text-center py-10">Loading report...</td></tr></tbody>
                ) : error ? (
                  <tbody><tr><td colSpan={columns.length} className="text-center py-10 text-red-500">{error}</td></tr></tbody>
                ) : (
                  <tbody>
                    {data.map((row, i) => (
                      <tr key={row.id} className="bg-white hover:bg-gray-50">
                        {columns.map((col) => renderCell(row, col.id, i))}
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            );
          })()}
        </div>
      </div>
    </AdminLayout>
  );
}
