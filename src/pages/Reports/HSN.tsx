"use client";
import { AdminLayout } from "@/components/AdminLayout";
import { getAllReports } from "@/adminApi/reportApi";
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

export default function HSN() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const initialColumns = [
    { id: "sno", label: "SNO." },
    { id: "hsn", label: "HSN CODE" },
    { id: "gst", label: "GST RATE" },
    { id: "qty", label: "QTY" },
    { id: "taxable", label: "TAXABLE AMT ₹" },
    { id: "cgst", label: "CGST ₹" },
    { id: "sgst", label: "SGST ₹" },
    { id: "total", label: "TOTAL AMT ₹" },
  ];

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("hsnReportColumnOrder");
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder);
      // Ensure 'total' column is always last
      const totalColumn = parsed.find((c: any) => c.id === 'total');
      const otherColumns = parsed.filter((c: any) => c.id !== 'total');
      if (totalColumn) {
        return [...otherColumns, totalColumn];
      }
    }
    return initialColumns;
  });

  useEffect(() => {
    const fetchHsnReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getAllReports();
        if (response.success && Array.isArray(response.bills)) {
          const hsnSummary: { [key: string]: any } = {};

          response.bills.forEach((bill: any) => {
            (bill.items || []).forEach((item: any) => {
              const hsn = item.hsnCode || 'N/A';
              if (hsn === 'N/A') return;

              if (!hsnSummary[hsn]) {
                hsnSummary[hsn] = {
                  hsnCode: hsn,
                  gstRate: item.gstPercent,
                  qty: 0,
                  taxableAmount: 0,
                  cgstAmount: 0,
                  sgstAmount: 0,
                  totalAmount: 0,
                };
              }
              hsnSummary[hsn].qty += item.qty || 0;
              hsnSummary[hsn].taxableAmount += item.taxableAmount || 0;
              hsnSummary[hsn].cgstAmount += item.cgst || 0;
              hsnSummary[hsn].sgstAmount += item.sgst || 0;
              hsnSummary[hsn].totalAmount += item.total || 0;
            });
          });

          const transformedData = Object.values(hsnSummary).map((item: any, index: number) => {
            return {
              id: item.hsnCode,
              sno: index + 1,
              hsn: item.hsnCode || "N/A",
              gst: item.gstRate ? `${item.gstRate}%` : "0%",
              qty: item.qty || 0,
              taxable: item.taxableAmount || 0,
              cgst: item.cgstAmount || 0,
              sgst: item.sgstAmount || 0,
              total: item.totalAmount || 0,
            };
          });
          setData(transformedData);
        } else {
          setError(response.message || "Failed to fetch HSN report data.");
        }
      } catch (err) {
        setError("An error occurred while fetching the report.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHsnReport();
  }, [fromDate, toDate]);

  useEffect(() => {
    localStorage.setItem("hsnReportColumnOrder", JSON.stringify(columns));
  }, [columns]);

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

  return (
    <AdminLayout title="Report > HSN Date Wise">
      <div className="p-6 w-full bg-white">
        {/* Header */}
        <div className="flex justify-center mb-6">
          <div className="flex flex-wrap items-end justify-center gap-4">
            {/* From Date */}
            <div className="flex flex-col">
              <label className="text-[13px] text-gray-500 mb-1">
                From Date
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-2.5 text-gray-400"
                  size={18}
                />
                <Input
                  type="text"
                  placeholder="DD-MM-YY"
                  className="pl-10 pr-4 w-[180px] h-[42px] rounded-lg bg-[#F5F5F5] border border-gray-300 text-gray-700 focus:ring-0 focus:outline-none"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
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
                  type="text"
                  placeholder="DD-MM-YY"
                  className="pl-10 pr-4 w-[180px] h-[42px] rounded-lg bg-[#F5F5F5] border border-gray-300 text-gray-700 focus:ring-0 focus:outline-none"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            {/* Export Button */}
            <div className="flex flex-col">
              <label className="text-[13px] text-transparent mb-1 select-none">
                Export
              </label>
              <Button className="bg-[#E98C81] hover:bg-[#d87b71] text-white rounded-lg w-[239px] h-[42px] text-[15px] font-medium flex items-center justify-center gap-2 shadow-sm">
                Export
                <Download size={18} />
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        {(() => {
          const columnIds = columns.map((c) => c.id);
          const renderCell = (row: any, columnId: string, index: number) => {
            switch (columnId) {
              case "sno":
                return <td className="p-3">{index + 1}.</td>;
              case "hsn":
                return <td className="p-3">{row.hsn}</td>;
              case "gst":
                return <td className="p-3">{row.gst}</td>;
              case "qty":
                return (
                  <td className="p-3 text-right">
                    {row.qty.toLocaleString("en-IN")}
                  </td>
                );
              case "taxable":
                return (
                  <td className="p-3 text-right">
                    {row.taxable.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                );
              case "cgst":
                return (
                  <td className="p-3 text-right">
                    {row.cgst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                );
              case "sgst":
                return (
                  <td className="p-3 text-right">
                    {row.sgst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                );
              case "total":
                return (
                  <td className="p-3 text-right">
                    {row.total.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                );
              default:
                return null;
            }
          };

          return (
            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <table className="min-w-full bg-white rounded-xl">
                  {/* HEADER */}
                  <thead className="bg-[#F8F8F8]">
                    <SortableContext
                      items={columns.map((c) => c.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      <tr className="text-gray-700 text-sm">
                        {columns.map((c) => (
                          <SortableHeader key={c.id} column={c} />
                        ))}
                      </tr>
                    </SortableContext>
                  </thead>

                  {/* BODY */}
                  <tbody>
                    {loading && (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="text-center py-10"
                        >
                          Loading report...
                        </td>
                      </tr>
                    )}

                    {error && (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="text-center py-10 text-red-500"
                        >
                          {error}
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !error &&
                      data.map((row, index) => (
                        <tr
                          key={row.id}
                          className="text-sm text-gray-800 border-b hover:bg-[#FAFAFA]"
                        >
                          {columns.map((col) => renderCell(row, col.id, index))}
                        </tr>
                      ))}

                   {!loading && !error && data.length > 0 && (
                      <tr className="font-semibold bg-gray-100 text-gray-900">
                        {columns.map((col, idx) => {
                          if (idx === 0) {
                            return (
                              <td key={col.id} className="p-3" colSpan={3}>
                                TOTAL
                              </td>
                            );
                          }
                          if (idx === 1 || idx === 2) {
                            return null;
                          }
                          if (col.id === "qty") {
                            return (
                              <td key={col.id} className="p-3 text-right">
                                {data
                                  .reduce((s, r) => s + r.qty, 0)
                                  .toLocaleString("en-IN")}
                              </td>
                            );
                          }
                          if (col.id === "taxable") {
                            return (
                              <td key={col.id} className="p-3 text-right">
                                {data
                                  .reduce((s, r) => s + r.taxable, 0)
                                  .toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                              </td>
                            );
                          }
                          if (col.id === "cgst") {
                            return (
                              <td key={col.id} className="p-3 text-right">
                                {data
                                  .reduce((s, r) => s + r.cgst, 0)
                                  .toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                              </td>
                            );
                          }
                          if (col.id === "sgst") {
                            return (
                              <td key={col.id} className="p-3 text-right">
                                {data
                                  .reduce((s, r) => s + r.sgst, 0)
                                  .toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                              </td>
                            );
                          }
                          if (col.id === "total") {
                            return (
                              <td key={col.id} className="p-3 text-right">
                                {data
                                  .reduce((s, r) => s + r.total, 0)
                                  .toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                              </td>
                            );
                          }
                          return <td key={col.id}></td>;
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </DndContext>
            </div>
          );
        })()}
      </div>
    </AdminLayout>
  );
}
