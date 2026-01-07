"use client";
import { AdminLayout } from "@/components/AdminLayout";
import { getAllReports, getReportsByDateRange } from "@/adminApi/reportApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Download } from "lucide-react";
import React, { useState, useEffect } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SaleRegister() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialColumns = [
    { id: "sno", label: "SNO." },
    { id: "billNo", label: "BILL NO." },
    { id: "billDate", label: "BILL DATE" },
    { id: "itemName", label: "ITEM NAME" },
    { id: "packSize", label: "PACK/SIZE" },
    { id: "companyName", label: "COMPANY NAME" },
    { id: "totalQty", label: "TOTAL QTY" },
    { id: "itemCode", label: "ITEM CODE" },
    { id: "rateUnit", label: "RATE/UNIT" },
    { id: "cd", label: "CD" },
    { id: "netAmt", label: "NET AMT" },
    { id: "agentName", label: "AGENT NAME" },
  ];

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("saleRegisterColumnOrder");
    return savedOrder ? JSON.parse(savedOrder) : initialColumns;
  });

  useEffect(() => {
    const fetchSaleRegister = async () => {
      setLoading(true);
      setError(null);
      try {
        let response;
        if (fromDate && toDate) {
          response = await getReportsByDateRange(fromDate, toDate);
        } else {
          response = await getAllReports();
        }
        if (response.success && Array.isArray(response.bills)) {
          const flattenedData = response.bills.flatMap((bill: any) =>
            (bill.items || []).map((item: any) => ({
              id: item._id || `${bill._id}-${item.productId}`,
              billNo: bill.billNo,
              billDate: new Date(bill.billDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
              itemName: item.itemName,
              packSize: item.packing || "N/A",
              companyName: item.companyName || "N/A",
              totalQty: item.qty,
              itemCode: item.itemCode || "N/A",
              rateUnit: item.rate,
              cd: item.discountPercent || 0,
              netAmt: item.total,
              agentName: bill.agentName || "N/A", // agentName is not in the provided data
            }))
          );
          setRows(flattenedData);
        } else {
          setError("Failed to fetch sale register data.");
        }
      } catch (err) {
        setError("An error occurred while fetching the report.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSaleRegister();
  }, [fromDate, toDate]);

  useEffect(() => {
    localStorage.setItem("saleRegisterColumnOrder", JSON.stringify(columns));
  }, [columns]);

  const handleExport = () => {
    if (!rows || rows.length === 0) return;

    const csvContent = [
      columns.map((col) => col.label).join(","),
      ...rows.map((row) =>
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
    link.setAttribute("download", `Sale_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortableHeader = ({
    column,
  }: {
    column: { id: string; label: string };
  }) => {
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
        className="p-3 rounded-l-md cursor-grab"
      >
        {column.label}
      </th>
    );
  };

  return (
    <AdminLayout title="Reports > Sale Register">
      <div className="p-6">
        {/* Top Filters */}
        <div className="flex justify-center gap-9 items-center mb-4">
          {/* From Date */}
          <div className="flex flex-col">
            <label className="text-[13px] text-gray-500 mb-1">From Date</label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
              <Input
                type="date"
                className="pl-10 pr-4 w-[180px] h-[42px] rounded-lg bg-[#F5F5F5] border border-gray-300 text-gray-700 focus:ring-0 focus:outline-none"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
              />
            </div>
          </div>

          {/* To Date */}
          <div className="flex flex-col">
            <label className="text-[13px] text-gray-500 mb-1">To Date</label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
              <Input
                type="date"
                className="pl-10 pr-4 w-[180px] h-[42px] rounded-lg bg-[#F5F5F5] border border-gray-300 text-gray-700 focus:ring-0 focus:outline-none"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <button className="rounded-full text-[13px] text-transparent mb-1 select-none">
              Export
            </button>
            <Button
              onClick={handleExport}
              disabled={loading || rows.length === 0}
              className="bg-[#E98C81] hover:bg-[#d87b71] text-white rounded-md w-[160px] h-[38px] text-[14px] font-medium flex items-center justify-center gap-2 shadow-sm"
            >
              Export
              <Download size={16} />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {(() => {
            const handleDragEnd = (event: DragEndEvent) => {
              const { active, over } = event;
              if (over && active.id !== over.id) {
                setColumns((items) => {
                  const oldIndex = items.findIndex(
                    (item) => item.id === active.id
                  );
                  const newIndex = items.findIndex(
                    (item) => item.id === over.id
                  );
                  return arrayMove(items, oldIndex, newIndex);
                });
              }
            };

            const columnIds = columns.map((c) => c.id);

            const renderCell = (row: any, columnId: string) => {
              switch (columnId) {
                case "sno": return <td className="p-3 rounded-l-md">{rows.indexOf(row) + 1}</td>;
                case "billNo":
                  return <td className="p-3">{row.billNo}</td>;
                case "billDate":
                  return <td className="p-3">{row.billDate}</td>;
                case "itemName":
                  return <td className="p-3">{row.itemName}</td>;
                case "packSize":
                  return <td className="p-3">{row.packSize}</td>;
                case "companyName":
                  return <td className="p-3">{row.companyName}</td>;
                case "totalQty":
                  return <td className="p-3">{row.totalQty}</td>;
                case "itemCode":
                  return <td className="p-3">{row.itemCode}</td>;
                case "rateUnit":
                  return <td className="p-3">₹{row.rateUnit?.toLocaleString('en-IN')}</td>;
                case "cd":
                  return <td className="p-3">{row.cd}%</td>;
                case "netAmt":
                  return <td className="p-3">₹{row.netAmt?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>;
                case "agentName":
                  return <td className="p-3 rounded-r-md">{row.agentName}</td>;
                default:
                  return null;
              }
            };

            return (
              <table className="w-full border-separate border-spacing-y-2 text-sm whitespace-nowrap">
                <thead className="bg-[#F6F6F6] text-gray-800 text-left">
                  <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={columnIds}
                      strategy={horizontalListSortingStrategy}
                    >
                      <tr>
                        {columns.map((column) => (
                          <SortableHeader key={column.id} column={column} />
                        ))}
                      </tr>
                    </SortableContext>
                  </DndContext>
                </thead>
                {loading ? (
                  <tbody><tr><td colSpan={columns.length} className="text-center py-10">Loading...</td></tr></tbody>
                ) : error ? (
                  <tbody><tr><td colSpan={columns.length} className="text-center py-10 text-red-500">{error}</td></tr></tbody>
                ) : (
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="bg-white shadow-sm hover:border hover:border-blue-400 transition-all"
                      >
                        {columns.map((col) => renderCell(row, col.id))}
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
