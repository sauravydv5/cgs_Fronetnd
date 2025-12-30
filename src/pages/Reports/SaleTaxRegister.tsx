"use client";
import { AdminLayout } from "@/components/AdminLayout"; // Assuming this is the correct path
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Download } from "lucide-react";
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
import { getAllReports } from "@/adminApi/reportApi";

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

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("saleTaxRegisterColumnOrder");
    return savedOrder ? JSON.parse(savedOrder) : initialColumns;
  });

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        // The API function you provided doesn't take date arguments.
        // You may need to update it to accept fromDate and toDate.
        const response = await getAllReports();
        if (response.success && Array.isArray(response.bills)) {
          const billsData = response.bills;

          // Transform API data to fit the table row structure
          const transformedRows = billsData.map((bill: any, index: number) => {
            const taxBreakdown = {
              cgst1: 0, cgst1_4: 0, cgst2_5: 0, cgst4: 0, cgst6: 0, cgst9: 0,
              sale12: 0, sale14: 0, sale20: 0,
            };

            (bill.items || []).forEach((item: any) => {
              const totalGstRate = item.gstPercent || 0;
              const taxableAmount = item.taxableAmount || 0;
              const cgstAmount = item.cgst || 0;

              if (totalGstRate === 2) taxBreakdown.cgst1 += cgstAmount;
              else if (totalGstRate === 2.8) taxBreakdown.cgst1_4 += cgstAmount;
              else if (totalGstRate === 5) taxBreakdown.cgst2_5 += cgstAmount;
              else if (totalGstRate === 8) taxBreakdown.cgst4 += cgstAmount;
              else if (totalGstRate === 12) { taxBreakdown.cgst6 += cgstAmount; taxBreakdown.sale12 += taxableAmount; }
              else if (totalGstRate === 18) taxBreakdown.cgst9 += cgstAmount;
              else if (totalGstRate === 14) taxBreakdown.sale14 += taxableAmount;
              else if (totalGstRate === 20) taxBreakdown.sale20 += taxableAmount;
            });

            return {
              id: bill._id,
              sno: index + 1,
              billDate: new Date(bill.billDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-'),
              partyName: (bill.customerId && `${bill.customerId.firstName || ''} ${bill.customerId.lastName || ''}`.trim()) || bill.customerName || "N/A",
              billAmt: bill.netAmount,
              totalqty: bill.totalQty,
              ...taxBreakdown,
            };
          });

          const calculatedSummary = {
            totalBillAmount: billsData.reduce((sum: number, bill: any) => sum + (bill.netAmount || 0), 0),
            totalTaxCollected: billsData.reduce((sum: number, bill: any) => sum + ((bill.totalCGST || 0) + (bill.totalSGST || 0) + (bill.totalIGST || 0)), 0),
            numberOfTransactions: billsData.length || 0,
          };

          setRows(transformedRows);
          setSummary(calculatedSummary);
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

  return (
    <AdminLayout title="Report > Sale Tax Register">
      <div className=" bg-white min-h-screen">
        {/* Header Filters */}
        <div className="flex justify-center items-center gap-8 mb-10">
          {/* From Date */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1 ml-1">
              From Date
            </label>
            <div className="flex items-center gap-2 w-[239px] h-[50px] bg-[#F0F0F0] rounded-md px-3 shadow-sm">
              <Calendar className="w-5 h-5 text-gray-600" />
              <Input
                type="text"
                placeholder="DD-MM-YY"
                className="border-none bg-transparent focus-visible:ring-0 text-sm text-gray-700"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
          </div>

          {/* To Date */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1 ml-1">To Date</label>
            <div className="flex items-center gap-2 w-[239px] h-[50px] bg-[#F0F0F0] rounded-md px-3 shadow-sm">
              <Calendar className="w-5 h-5 text-gray-600" />
              <Input
                type="text"
                placeholder="DD-MM-YY"
                className="border-none bg-transparent focus-visible:ring-0 text-sm text-gray-700"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {/* Export Button */}
          <div className="flex flex-col">
            <label className="text-xs opacity-0 mb-1 ml-1">_</label>
            <Button
              className="w-[239px] h-[50px] bg-[#E98C81] hover:bg-[#d87a6f] text-white rounded-full flex items-center justify-center gap-2 shadow-md"
            >
              Export <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Cards Section */}
        <div className="flex gap-6 mb-8 justify-start">
          <div className="bg-[#E98C81] text-white rounded-xl flex flex-col items-center justify-center shadow-sm w-[217px] h-[140px]">
            <p className="text-2xl font-semibold">₹ {summary.totalBillAmount.toLocaleString('en-IN')}</p>
            <p className="text-sm font-medium">Total Bill Amount</p>
          </div>
          <div className="bg-[#E98C81] text-white rounded-xl flex flex-col items-center justify-center shadow-sm w-[217px] h-[140px]">
            <p className="text-2xl font-semibold">₹ {summary.totalTaxCollected.toLocaleString('en-IN')}</p>
            <p className="text-sm font-medium">Total Tax Collected</p>
          </div>
          <div className="bg-[#E98C81] text-white rounded-xl flex flex-col items-center justify-center shadow-sm w-[217px] h-[140px]">
            <p className="text-2xl font-semibold">{summary.numberOfTransactions}</p>
            <p className="text-sm font-medium">Number of Transactions</p>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-10">Loading report...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : (() => {
            const columnIds = columns.map((c) => c.id);
            const renderCell = (row: any, columnId: string) => {
              const value = row[columnId];
              const formatCurrency = (num: number) => num?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';

              switch (columnId) {
                case "sno": return <td className="px-4 py-2 border whitespace-nowrap">{row.sno}.</td>;
                case "billDate": return <td className="px-4 py-2 border whitespace-nowrap">{row.billDate}</td>;
                case "partyName": return <td className="px-4 py-2 border whitespace-nowrap">{row.partyName}</td>;
                case "billAmt": return <td className="px-4 py-2 border whitespace-nowrap">₹{formatCurrency(value)}</td>;
                case "totalqty": return <td className="px-4 py-2 border whitespace-nowrap">{row.totalqty}</td>;
                case "cgst1": return <td className="px-4 py-2 border whitespace-nowrap">₹{formatCurrency(value)}</td>;
                case "cgst1_4": return <td className="px-4 py-2 border whitespace-nowrap">₹{formatCurrency(value)}</td>;
                case "cgst2_5": return <td className="px-4 py-2 border whitespace-nowrap">₹{formatCurrency(value)}</td>;
                case "cgst4": return <td className="px-4 py-2 border whitespace-nowrap">₹{formatCurrency(value)}</td>;
                case "cgst6": return <td className="px-4 py-2 border whitespace-nowrap">₹{formatCurrency(value)}</td>;
                case "cgst9": return <td className="px-4 py-2 border whitespace-nowrap">₹{formatCurrency(value)}</td>;
                case "sale12": return <td className="px-4 py-2 border whitespace-nowrap">₹{formatCurrency(value)}</td>;
                case "sale14": return <td className="px-4 py-2 border whitespace-nowrap">₹{formatCurrency(value)}</td>;
                case "sale20": return <td className="px-4 py-2 border whitespace-nowrap">₹{formatCurrency(value)}</td>;
                default: return null;
              }
            };

            return (
              <table className="min-w-full border border-gray-200 rounded-lg text-sm">
                <thead className="bg-[#E7F2FF] text-gray-700">
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
                <tbody>
                  {rows.map((row) => (
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
          })()}
        </div>
      </div>
    </AdminLayout>
  );
}
