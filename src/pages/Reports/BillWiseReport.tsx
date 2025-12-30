"use client";
import { AdminLayout } from "@/components/AdminLayout";
import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getAllReports } from "@/adminApi/reportApi";

const transformSaleData = (salesData: any[]) => {
  if (!Array.isArray(salesData)) return [];
  return salesData.map((bill: any, index: number) => ({
    id: bill._id,
    sno: `${index + 1}.`,
    billDate: new Date(bill.billDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-').toUpperCase(),
    billNumber: bill.billNo,
    partyName: (bill.customerId && `${bill.customerId.firstName || ''} ${bill.customerId.lastName || ''}`.trim()) || bill.customerName || "N/A",
    billAmt: bill.netAmount,
    totalQty: bill.totalQty,
    gstSale: bill.taxableAmount,
    sgstOutput: bill.totalSGST,
    cgstOutput: bill.totalCGST,
  }));
};

export default function BillWiseReport() {
  const [rows, setRows] = useState<any[]>([]);

  const initialColumns = [
    { id: "sno", label: "SNO." },
    { id: "billDate", label: "BILL DATE" },
    { id: "billNumber", label: "BILL NUMBER" },
    { id: "partyName", label: "PARTY NAME" },
    { id: "billAmt", label: "BILL AMT" },
    { id: "totalQty", label: "TOTAL QTY" },
    { id: "gstSale", label: "GST SALE ₹" },
    { id: "sgstOutput", label: "SGST OUTPUT ₹" },
    { id: "cgstOutput", label: "CGST OUTPUT ₹" },
  ];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("billWiseReportColumnOrder");
    return savedOrder ? JSON.parse(savedOrder) : initialColumns;
  });

  useEffect(() => {
    localStorage.setItem("billWiseReportColumnOrder", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getAllReports();
        if (response.success && Array.isArray(response.bills)) {
          setRows(transformSaleData(response.bills));
        } else {
          setError("Failed to fetch report data: response was not successful.");
          setRows([]);
        }
      } catch (err) {
        setError("Failed to fetch report data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

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
        className="p-3 cursor-grab"
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

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    return rows.filter(row =>
      (row.billNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (row.partyName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [rows, searchTerm]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.billAmt += row.billAmt || 0;
        acc.totalQty += row.totalQty || 0;
        acc.gstSale += row.gstSale || 0;
        acc.sgstOutput += row.sgstOutput || 0;
        acc.cgstOutput += row.cgstOutput || 0;
        return acc;
      },
      { billAmt: 0, totalQty: 0, gstSale: 0, sgstOutput: 0, cgstOutput: 0 }
    );
  }, [filteredRows]);

  return (
    <AdminLayout title="Report > Sale Tax bill wise report">
      <div className="p-6">
        {/* Search and Filter Section */}
        {/* Search and Filter Section */}
        <div className="flex items-center justify-start gap-4 mb-6">
          {/* Search Input */}
          <Input
            placeholder="Search by Bill ID, Number, party name"
            className="bg-[#FFF3EF] placeholder:text-gray-500 text-sm w-[320px] h-[36px] 
               rounded-full border-none focus-visible:ring-0 focus-visible:ring-offset-0
               focus:outline-none shadow-sm px-4"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Search Button (separate round icon) */}
          <Button
            className="bg-[#E98C81] hover:bg-[#d97b71] text-white rounded-full w-[36px] h-[36px] 
               flex items-center justify-center shadow-sm"
          >
            <Search size={16} />
          </Button>

          {/* Date Dropdown */}
          <Select>
            <SelectTrigger
              className="w-[140px] text-sm border-none bg-[#EBEBEB] text-gray-700 rounded-full 
                 shadow-sm h-9 focus:ring-0"
            >
              <SelectValue placeholder="All dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>

          {/* Export Button */}
          <Button className="bg-[#E98C81] hover:bg-[#d97b71] text-white rounded-full px-6 h-9 flex items-center gap-2 shadow-sm">
            <Download size={16} />
            Export
          </Button>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
          {loading ? (
            <div className="text-center py-10">Loading...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : (() => {
            const columnIds = columns.map((c) => c.id);
            const renderCell = (row: any, columnId: string) => {
              const value = row[columnId];
              switch (columnId) {
                case "sno": return <td className="p-3">{row.sno}</td>;
                case "billDate": return <td className="p-3">{row.billDate}</td>;
                case "billNumber": return <td className="p-3">{row.billNumber}</td>;
                case "partyName": return <td className="p-3">{row.partyName}</td>;
                case "billAmt": return <td className="p-3">₹{value?.toLocaleString('en-IN') || 0}</td>;
                case "totalQty": return <td className="p-3">{row.totalQty}</td>;
                case "gstSale": return <td className="p-3">₹{value?.toLocaleString('en-IN') || 0}</td>;
                case "sgstOutput": return <td className="p-3">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>;
                case "cgstOutput": return <td className="p-3">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>;
                default: return null;
              }
            };

            return (
              <table className="w-full text-sm text-left">
                <thead className="bg-[#FFFFFF] text-gray-700 font-semibold">
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
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-[#FFF6F5]">
                      {columns.map((col) => renderCell(row, col.id))}
                    </tr>
                  ))}
                  {filteredRows.length > 0 && (
                    <tr className="font-semibold bg-[#FFFFFF]">
                      <td className="p-3" colSpan={4}>
                        TOTAL
                      </td>
                      <td className="p-3">₹{totals.billAmt.toLocaleString('en-IN')}</td>
                      <td className="p-3">{totals.totalQty}</td>
                      <td className="p-3">₹{totals.gstSale.toLocaleString('en-IN')}</td>
                      <td className="p-3">₹{totals.sgstOutput.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3">₹{totals.cgstOutput.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          })()}
        </div>

        {/* Summary Cards */}
        <div className="flex flex-wrap justify-center gap-6 mt-6">
          <div
            className="bg-[#F8F9FA] border rounded-2xl shadow-sm text-center py-6"
            style={{ width: "201px", height: "97px" }}
          >
            <p className="text-gray-600 text-sm">Total Bills</p><h2 className="text-lg font-semibold">{filteredRows.length}</h2>
          </div>
          <div
            className="bg-[#E8F8F2] border rounded-2xl shadow-sm text-center py-6"
            style={{ width: "201px", height: "97px" }}
          >
            <p className="text-gray-600 text-sm">Total Amount</p>
            <h2 className="text-lg font-semibold text-[#2B8A6E]">₹{totals.billAmt.toLocaleString('en-IN')}</h2>
          </div>
          <div
            className="bg-[#FFF1F1] border rounded-2xl shadow-sm text-center py-6"
            style={{ width: "201px", height: "97px" }}
          >
            <p className="text-gray-600 text-sm">Total CGST</p>
            <h2 className="text-lg font-semibold text-[#E98C81]">₹{totals.cgstOutput.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          </div>
          <div
            className="bg-[#FFF1E9] border rounded-2xl shadow-sm text-center py-6"
            style={{ width: "201px", height: "97px" }}
          >
            <p className="text-gray-600 text-sm">Total SGST</p>
            <h2 className="text-lg font-semibold text-[#E98C81]">₹{totals.sgstOutput.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
