"use client";
import { AdminLayout } from "@/components/AdminLayout"; // Assuming this is the correct path
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getAllReports, getReportsByDateRange } from "@/adminApi/reportApi";

export default function SaleTaxRegister() {
  const initialColumns = [
    { id: "sno", label: "S.NO." },
    { id: "billDate", label: "BILL DATE" },
    { id: "partyName", label: "PARTY NAME" },
    { id: "billAmt", label: "BILL AMT" },
    { id: "totalqty", label: "TOTAL QTY" },
    { id: "cgst1", label: "CGST OUTPUT 1%" },
    { id: "cgst1_4", label: "CGST OUTPUT 1.4%" },
    { id: "cgst2_5", label: "CGST OUTPUT 2.5%" },
    { id: "cgst4", label: "CGST OUTPUT 4%" },
    { id: "cgst6", label: "CGST OUTPUT 6%" },
    { id: "cgst9", label: "CGST OUTPUT 9%" },
    { id: "sale12", label: "CGST SALE 12%" },
    { id: "sale14", label: "CGST SALE 14%" },
    { id: "sale20", label: "CGST SALE 20%" },
  ];

  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalBillAmount: 0,
    totalTaxCollected: 0,
    numberOfTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const todayObj = new Date();
  const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("saleTaxRegisterColumnOrder");
    return savedOrder ? JSON.parse(savedOrder) : initialColumns;
  });

  const handleClearFilter = () => {
    setFromDate("");
    setToDate("");
  };

  useEffect(() => {
    const fetchReport = async () => {
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
          let billsData = response.bills;

          if (fromDate && toDate) {
            const start = new Date(fromDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            billsData = billsData.filter((bill: any) => {
              const billDate = new Date(bill.billDate || bill.date || bill.createdAt);
              return billDate >= start && billDate <= end;
            });
          }

          // Transform API data to fit the table row structure
          const transformedRows = billsData.map((bill: any, index: number) => {
            const taxBreakdown = {
              cgst1: 0,
              cgst1_4: 0,
              cgst2_5: 0,
              cgst4: 0,
              cgst6: 0,
              cgst9: 0,
              sale12: 0,
              sale14: 0,
              sale20: 0,
            };

            (bill.items || []).forEach((item: any) => {
              const gstRate = Number(item.gstPercent || 0);
              const cgst = Number(item.cgst || 0);
              const taxable = Number(item.taxableAmount || 0);

              // Using a small tolerance for comparing floating-point numbers
              const tolerance = 0.01;

              if (Math.abs(gstRate - 2.0) < tolerance) { // 1% CGST
                taxBreakdown.cgst1 += cgst;
              } else if (Math.abs(gstRate - 2.8) < tolerance) { // 1.4% CGST
                taxBreakdown.cgst1_4 += cgst;
              } else if (Math.abs(gstRate - 5.0) < tolerance) { // 2.5% CGST
                taxBreakdown.cgst2_5 += cgst;
              } else if (Math.abs(gstRate - 8.0) < tolerance) { // 4% CGST
                taxBreakdown.cgst4 += cgst;
              } else if (Math.abs(gstRate - 12.0) < tolerance) { // 6% CGST
                taxBreakdown.cgst6 += cgst;
                taxBreakdown.sale12 += taxable;
              } else if (Math.abs(gstRate - 18.0) < tolerance) { // 9% CGST
                taxBreakdown.cgst9 += cgst;
              } else if (Math.abs(gstRate - 14.0) < tolerance) {
                taxBreakdown.sale14 += taxable;
              } else if (Math.abs(gstRate - 20.0) < tolerance) {
                taxBreakdown.sale20 += taxable;
              }
            });


            return {
              id: bill._id,
              sno: index + 1,
              billDate: new Date(bill.billDate)
                .toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "2-digit",
                })
                .replace(/ /g, "-"),
              partyName:
                (bill.customerId &&
                  `${bill.customerId.firstName || ""} ${
                    bill.customerId.lastName || ""
                  }`.trim()) ||
                bill.customerName ||
                "N/A",
              billAmt: bill.netAmount,
              totalqty: bill.totalQty,
              ...taxBreakdown,
            };
          });

          const calculatedSummary = {
            totalBillAmount: billsData.reduce(
              (sum: number, bill: any) => sum + (bill.netAmount || 0),
              0
            ),
            totalTaxCollected: billsData.reduce(
              (sum: number, bill: any) =>
                sum +
                ((bill.totalCGST || 0) +
                  (bill.totalSGST || 0) +
                  (bill.totalIGST || 0)),
              0
            ),
            numberOfTransactions: billsData.length || 0,
          };

          setRows(transformedRows);
          setSummary(calculatedSummary);
          setCurrentPage(1);
        } else {
          setError("Failed to fetch sale tax register data.");
        }
      } catch (err: any) {
        setError("Failed to fetch report data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [fromDate, toDate]);

  useEffect(() => {
    localStorage.setItem("saleTaxRegisterColumnOrder", JSON.stringify(columns));
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
    link.setAttribute(
      "download",
      `Sale_Tax_Register_${new Date().toISOString().split("T")[0]}.csv`
    );
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
        className="px-4 py-2 text-left border cursor-grab whitespace-nowrap"
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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = rows.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(rows.length / itemsPerPage);

  return (
    <AdminLayout title="Report > Sale Tax Register">
      <div className=" bg-white min-h-screen">
        {/* Header Filters */}
        <div className="flex justify-center items-center gap-8 mb-10">
          {/* From Date */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1 ml-1">From Date</label>
            <div className="flex items-center gap-2 w-[239px] h-[50px] bg-[#F0F0F0] rounded-md px-3 shadow-sm">
              <Calendar className="w-5 h-5 text-gray-600" />
              <Input
                type="date"
                className="border-none bg-transparent focus-visible:ring-0 text-sm text-gray-700"
                value={fromDate}
                max={today}
                onChange={(e) => {
                  const val = e.target.value;
                  setFromDate(val);
                  if (toDate && val > toDate) {
                    setToDate("");
                  }
                }}
                onKeyDown={(e) => e.preventDefault()}
              />
            </div>
          </div>

          {/* To Date */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1 ml-1">To Date</label>
            <div className="flex items-center gap-2 w-[239px] h-[50px] bg-[#F0F0F0] rounded-md px-3 shadow-sm">
              <Calendar className="w-5 h-5 text-gray-600" />
              <Input
                type="date"
                className="border-none bg-transparent focus-visible:ring-0 text-sm text-gray-700"
                value={toDate}
                min={fromDate}
                max={today}
                onChange={(e) => setToDate(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
              />
            </div>
          </div>

          {/* Clear Filter */}
          <div className="flex flex-col">
            <label className="text-xs opacity-0 mb-1 ml-1">_</label>
            <Button
              variant="outline"
              onClick={handleClearFilter}
              className="h-[50px] text-gray-700 hover:bg-gray-100 border-gray-300"
            >
              Clear Filter
            </Button>
          </div>

          {/* Export Button */}
          <div className="flex flex-col">
            <label className="text-xs opacity-0 mb-1 ml-1">_</label>
            <Button
              onClick={handleExport}
              disabled={loading || rows.length === 0}
              className="w-[239px] h-[50px] bg-[#E98C81] hover:bg-[#d97a71] text-white rounded-full flex items-center justify-center gap-2 shadow-md"
            >
              Export <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Cards Section */}
        <div className="flex gap-6 mb-8 justify-start">
          <div className="bg-[#E98C81] text-white rounded-xl flex flex-col items-center justify-center shadow-sm w-[217px] h-[140px]">
            <p className="text-2xl font-semibold">
              ₹ {summary.totalBillAmount.toLocaleString("en-IN")}
            </p>
            <p className="text-sm font-medium">Total Bill Amount</p>
          </div>
          <div className="bg-[#E98C81] text-white rounded-xl flex flex-col items-center justify-center shadow-sm w-[217px] h-[140px]">
            <p className="text-2xl font-semibold">
              ₹ {summary.totalTaxCollected.toLocaleString("en-IN")}
            </p>
            <p className="text-sm font-medium">Total Tax Collected</p>
          </div>
          <div className="bg-[#E98C81] text-white rounded-xl flex flex-col items-center justify-center shadow-sm w-[217px] h-[140px]">
            <p className="text-2xl font-semibold">
              {summary.numberOfTransactions}
            </p>
            <p className="text-sm font-medium">Number of Transactions</p>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-10">Loading report...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : (
            (() => {
              const columnIds = columns.map((c) => c.id);
              const renderCell = (row: any, columnId: string) => {
                const value = row[columnId];
                const formatCurrency = (num: number) =>
                  num?.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00";

                switch (columnId) {
                  case "sno":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        {row.sno}.
                      </td>
                    );
                  case "billDate":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        {row.billDate}
                      </td>
                    );
                  case "partyName":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        {row.partyName}
                      </td>
                    );
                  case "billAmt":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        ₹{formatCurrency(value)}
                      </td>
                    );
                  case "totalqty":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        {row.totalqty}
                      </td>
                    );
                  case "cgst1":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        ₹{formatCurrency(value)}
                      </td>
                    );
                  case "cgst1_4":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        ₹{formatCurrency(value)}
                      </td>
                    );
                  case "cgst2_5":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        ₹{formatCurrency(value)}
                      </td>
                    );
                  case "cgst4":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        ₹{formatCurrency(value)}
                      </td>
                    );
                  case "cgst6":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        ₹{formatCurrency(value)}
                      </td>
                    );
                  case "cgst9":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        ₹{formatCurrency(value)}
                      </td>
                    );
                  case "sale12":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        ₹{formatCurrency(value)}
                      </td>
                    );
                  case "sale14":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        ₹{formatCurrency(value)}
                      </td>
                    );
                  case "sale20":
                    return (
                      <td className="px-4 py-2 border whitespace-nowrap">
                        ₹{formatCurrency(value)}
                      </td>
                    );
                  default:
                    return null;
                }
              };

              return (
                <table className="min-w-full border border-gray-200 rounded-lg text-sm">
                  <thead className="bg-[#E7F2FF] text-gray-700">
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
                  <tbody>
                    {currentItems.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b hover:bg-gray-50 text-gray-800"
                      >
                        {columns.map((col) => renderCell(row, col.id))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && rows.length > itemsPerPage && (
          <div className="flex justify-between items-center mt-4 pb-10 px-4">
            <div className="text-sm text-gray-500">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, rows.length)} of {rows.length} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 p-0 ${
                        currentPage === pageNum
                          ? "bg-[#E98C81] hover:bg-[#d87a6f] text-white border-none"
                          : ""
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
