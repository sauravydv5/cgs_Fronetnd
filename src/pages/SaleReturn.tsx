"use client";
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DateRange } from "react-day-picker";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Search,
  CalendarDays,
  Trash2,
  Eye,
  User,
  Hash,
  BadgeIndianRupee,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { getAllSaleReturns, deleteSaleReturn, updateReturnStatus } from "@/adminApi/saleReturnApi";
import { generateBill } from "@/adminApi/billApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DraggableHeader = ({
  column,
}: {
  column: { id: string; header: string };
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
      className="px-5 py-3 bg-[#eaf3ff] text-center text-sm font-semibold h-12 whitespace-nowrap cursor-grab"
    >
      {column.header}
    </th>
  );
};

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function SaleReturn() {
  const initialColumns = [
    { id: "returnId", header: "RETURN ID", size: "1.0fr" },
    { id: "billId", header: "BILL ID", size: "1.0fr" },
    { id: "date", header: "RETURN DATE", size: "1.3fr" },
    { id: "customerName", header: "CUSTOMER NAME", size: "2fr" },
    { id: "totalAmount", header: "REFUND AMOUNT", size: "1.6fr" },
    { id: "reason", header: "REASON", size: "2fr" },
    { id: "status", header: "STATUS", size: "1.2fr" },
    { id: "action", header: "ACTION", size: "1.5fr" },
  ];

  const [columns, setColumns] = useState(initialColumns);
  const [returns, setReturns] = useState<any[]>([]);
  const [allReturns, setAllReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedBillHtml, setGeneratedBillHtml] = useState<string | null>(null);
  const [showGeneratedBill, setShowGeneratedBill] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const location = useLocation();

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const data = await getAllSaleReturns();
      let rawReturns = [];
      if (data && Array.isArray(data.data)) {
        rawReturns = data.data;
      } else if (data && Array.isArray(data.saleReturns)) {
        rawReturns = data.saleReturns;
      } else if (Array.isArray(data)) {
        rawReturns = data;
      }

      const formattedReturns = rawReturns.map((ret: any) => ({
        ...ret,
        returnId: ret.returnId || ret._id?.slice(-6).toUpperCase(),
        billId: ret.billNo || (typeof ret.billId === 'object' ? ret.billId?.billId : ret.billId) || "N/A",
        date: ret.date || ret.createdAt,
        customerName: ret.customerName || (ret.customerId?.firstName ? `${ret.customerId.firstName} ${ret.customerId.lastName}` : "N/A"),
        totalAmount: ret.refundAmount !== undefined ? ret.refundAmount : (ret.totalAmount || 0),
        reason: ret.reason || ret.returnReason || "-",
        status: ret.status || "PENDING",
      }));

      setAllReturns(formattedReturns);
      setReturns(formattedReturns);
    } catch (error) {
      console.error("Failed to fetch sale returns:", error);
      toast.error("Failed to load sale returns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  useEffect(() => {
    if (location.state?.refresh) {
      fetchReturns();
    }
  }, [location.state]);

  useEffect(() => {
    let filtered = allReturns;

    if (dateRange?.from && dateRange.to) {
      const fromDate = dateRange.from;
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter(ret => {
        const retDate = new Date(ret.date);
        return retDate >= fromDate && retDate <= toDate;
      });
    }

    setReturns(filtered);
  }, [dateRange, allReturns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

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

  const handleViewBill = async (ret: any) => {
    try {
      const customerId = ret.customerId?._id || ret.customerId;
      if (!customerId) {
        toast.error("Customer ID not found for this return.");
        return;
      }
      const response = await generateBill(customerId);
      const billDataUrl = response.url;
      if (response.success && billDataUrl) {
        const base64Part = billDataUrl.split(",")[1];
        const binaryString = window.atob(base64Part);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decodedHtml = new TextDecoder().decode(bytes);
        setGeneratedBillHtml(decodedHtml);
        setShowGeneratedBill(true);
      } else {
        toast.error(response.message || "Failed to generate bill.");
      }
    } catch (error: any) {
      console.error("Error generating bill:", error);
      toast.error("Failed to generate bill.");
    }
  };

  const handleDeleteReturn = async (returnId: string) => {
    if (!window.confirm("Are you sure you want to delete this return record?")) {
      return;
    }
    try {
      await deleteSaleReturn(returnId);
      toast.success("Return record deleted successfully!");
      setReturns((prev) => prev.filter((r) => r._id !== returnId));
    } catch (error) {
      console.error("Failed to delete return:", error);
      toast.error("Failed to delete the return record.");
    }
  };

  const handleStatusUpdate = async (returnId: string, newStatus: string) => {
    if (!window.confirm(`Are you sure you want to change the status to ${newStatus}?`)) {
      return;
    }
    try {
      await updateReturnStatus(returnId, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      setReturns((prev) =>
        prev.map((r) => (r._id === returnId ? { ...r, status: newStatus } : r))
      );
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status.");
    }
  };

  const filteredReturns = returns.filter((ret) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      (ret.returnId && String(ret.returnId).toLowerCase().includes(query)) ||
      (ret.billId && String(ret.billId).toLowerCase().includes(query)) ||
      (ret.customerName && ret.customerName.toLowerCase().includes(query)) ||
      formatDate(ret.date).includes(query)
    );
  });

  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredReturns.length);
  const currentReturns = filteredReturns.slice(startIndex, endIndex);

  return (
    <AdminLayout title="Bill Generation > Sale Return">
      <Toaster position="top-center" />

      {/* Generated Bill Modal */}
      <Dialog open={showGeneratedBill} onOpenChange={setShowGeneratedBill}>
        <DialogContent className="max-w-screen-lg w-[90vw] h-[90vh] flex flex-col p-2">
          <DialogHeader className="p-4 flex-row flex justify-between items-center">
            <DialogTitle>Generated Bill</DialogTitle>
            <Button
              onClick={() => {
                const iframe = document.getElementById(
                  "bill-iframe"
                ) as HTMLIFrameElement;
                iframe?.contentWindow?.print();
              }}
              className="bg-[#E98C81] hover:bg-[#d97a71] text-white"
            >
              Save & Print
            </Button>
          </DialogHeader>
          {generatedBillHtml && (
            <iframe
              id="bill-iframe"
              srcDoc={generatedBillHtml}
              className="w-full h-full border-0"
              title="Generated Bill Preview"
            ></iframe>
          )}
        </DialogContent>
      </Dialog>

      {/* Search Bar & Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative flex items-center">
          <Input
            type="text"
            placeholder="Search by Return ID, Bill ID, Customer"
            className="w-80 rounded-full pl-4 pr-10 py-2 bg-[#ffe9e1] placeholder:text-gray-500 border-none shadow-sm focus:ring-0"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Search
            className="absolute right-3 text-[#f97a63] cursor-pointer"
            size={20}
          />
        </div>
        <div className="flex items-center gap-4">
           <TooltipProvider>
            <Tooltip>
              <Popover>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      className="rounded-full bg-[#e98c81] text-white hover:bg-[#d37b70] shadow-md w-64 justify-center"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {dateRange?.from && dateRange.to ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Date Range (Start - End)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              {dateRange?.from && dateRange.to && (
                <TooltipContent>
                  <p>Start Date - End Date</p>
                </TooltipContent>
              )}
              </Popover>
            </Tooltip>
            {dateRange?.from && (
              <Button
                variant="ghost"
                onClick={() => setDateRange(undefined)}
                className="text-sm text-gray-600 hover:bg-gray-200 rounded-full"
              >
                Clear
              </Button>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#d0e1f7] rounded-md overflow-x-auto relative">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columns.map((c) => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                <tr>
                  {columns.map((column) => (
                    <DraggableHeader key={column.id} column={column} />
                  ))}
                </tr>
              </SortableContext>
            </DndContext>
          </thead>

          {loading ? (
            <tbody>
              <tr>
                <td colSpan={columns.length} className="text-center py-10">
                  Loading...
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {currentReturns.map((ret, i) => (
                <tr
                  key={ret._id || i}
                  className="text-sm border-b last:border-none bg-white hover:bg-[#f8fbff] transition"
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className="px-5 py-3 text-center whitespace-nowrap"
                    >
                      {column.id === "status" ? (
                        <div className="flex justify-center">
                          <Select
                            value={ret.status}
                            onValueChange={(val) => handleStatusUpdate(ret._id, val)}
                          >
                            <SelectTrigger
                              className={`h-7 text-xs font-semibold rounded-full border-0 w-28 justify-center ${
                                ret.status === "APPROVED"
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : ret.status === "REJECTED"
                                  ? "bg-red-100 text-red-800 hover:bg-red-200"
                                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">PENDING</SelectItem>
                              <SelectItem value="APPROVED">APPROVED</SelectItem>
                              <SelectItem value="REJECTED">REJECTED</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : column.id === "action" ? (
                        <div className="flex items-center justify-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-8 h-8 rounded-full border border-gray-300 hover:bg-blue-50"
                                  onClick={() => handleViewBill(ret)}
                                >
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View Return</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-8 h-8 rounded-full border border-gray-300 hover:bg-red-50"
                                  onClick={() => handleDeleteReturn(ret._id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ) : column.id === 'date' ? (
                        formatDate(ret.date)
                      ) : (
                        column.id === 'totalAmount'
                          ? `₹${Number(ret.totalAmount).toFixed(2)}`
                          : ret[column.id as keyof typeof ret] ?? "N/A"
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination */}
      {filteredReturns.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t bg-gray-50 gap-3 rounded-b-lg mt-4">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {startIndex + 1} to {endIndex} of {filteredReturns.length} entries
          </div>
          <div className="flex gap-1 flex-wrap justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <Button
                key={i + 1}
                variant={currentPage === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(i + 1)}
                className={`h-8 w-8 p-0 text-xs ${currentPage === i + 1 ? "bg-[#e48a7c] hover:bg-[#d77b6f] text-white border-[#e48a7c]" : ""}`}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
