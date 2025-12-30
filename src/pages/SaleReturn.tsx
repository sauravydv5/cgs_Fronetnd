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
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

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
        totalAmount: ret.totalAmount !== undefined ? ret.totalAmount : (ret.refundAmount || 0),
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

  return (
    <AdminLayout title="Bill Generation > Sale Return">
      <Toaster position="top-center" />

      {/* Return Details Modal */}
      <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-white p-0 shadow-2xl">
          <DialogHeader className="bg-gradient-to-br from-[#f97a63] via-[#f86a53] to-[#f75943] text-white p-5 rounded-t-lg relative overflow-hidden flex flex-col items-start">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-extrabold tracking-tight mb-1">
                Return Details
              </DialogTitle>
              <span className="bg-white text-[#f97a63] text-sm font-bold px-7 py-1.5 rounded-full shadow-lg">
                  #{selectedReturn?.returnId}
                </span>
            </div>
          </DialogHeader>
          {selectedReturn && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                {/* Customer Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-3 border border-purple-200/50 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-purple-500 rounded-lg p-2">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Customer Name</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedReturn.customerName}</p>
                    </div>
                  </div>
                </div>

                {/* Date Card */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-3 border border-orange-200/50 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-orange-500 rounded-lg p-2">
                      <CalendarDays className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Return Date</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">
                        {formatDate(selectedReturn.date)}
                      </p>
                    </div>
                  </div>
                </div>
                
                 {/* Bill Ref Card */}
                 <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200/50 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-blue-500 rounded-lg p-2">
                      <Hash className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Original Bill</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedReturn.billId}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Summary Section */}
              <div className="bg-gradient-to-br from-[#fff4f1] via-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-200 shadow-lg">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center pb-2.5 border-b-2 border-orange-300">
                    <div className="flex items-center space-x-2">
                      <BadgeIndianRupee className="h-5 w-5 text-[#f97a63]" />
                      <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Refund Amount</p>
                    </div>
                    <p className="text-2xl font-extrabold text-[#f97a63] tracking-tight">₹ {selectedReturn.totalAmount}</p>
                  </div>
                   <div className="flex justify-between items-center pt-1">
                    <p className="text-sm font-semibold text-gray-600">Reason</p>
                    <p className="text-sm font-bold text-gray-800">{selectedReturn.reason}</p>
                  </div>
                </div>
              </div>
            </div>
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
              {filteredReturns.map((ret, i) => (
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
                                  onClick={() => setSelectedReturn(ret)}
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
                        ret[column.id as keyof typeof ret] ?? "N/A"
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
       {/* Pagination (Static for now as per Sale.tsx) */}
      <div className="flex justify-center items-center space-x-2 mt-6">
        <button className="text-gray-500 hover:text-black text-sm">&lt;</button>
        <button className="w-6 h-6 flex items-center justify-center rounded-full bg-[#f97a63] text-white text-sm">
          1
        </button>
        <button className="text-gray-700 hover:text-black text-sm">2</button>
        <span className="text-gray-500 text-sm">3 ... 56</span>
        <button className="text-gray-500 hover:text-black text-sm">&gt;</button>
      </div>
    </AdminLayout>
  );
}
