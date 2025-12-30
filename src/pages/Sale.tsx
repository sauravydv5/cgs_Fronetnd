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
  User,
  CircleUser,
  Hash,
  BadgeIndianRupee,
  Percent,
  Eye,
  RotateCcw,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  getAllBills,
  deleteBillById,
} from "@/adminApi/saleApi";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { format } from "date-fns";
import { updateBillPaymentStatus } from "@/adminApi/billApi";
import { addSaleReturn } from "@/adminApi/saleReturnApi";

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
export default function Sale() {
  const initialColumns = [
    { id: "agentName", header: "AGENT NAME", size: "1.5fr" },
    { id: "billId", header: "BILL ID", size: "1.0fr" },
    { id: "date", header: "DATE", size: "1.3fr" },
    { id: "customerName", header: "CUSTOMER NAME", size: "2fr" },
    { id: "discount", header: "DISCOUNT %", size: "1fr" },
    { id: "sgst", header: "SGST", size: "1fr" },
    { id: "totalAmount", header: "TOTAL AMOUNT", size: "1.6fr" },
    { id: "cgst", header: "CGST", size: "1fr" },
    { id: "amountAfterDiscount", header: "AMT AFT DIS", size: "1.6fr" },
    // { id: "paymentStatus", header: "PAYMENT STATUS", size: "1.5fr" },
    { id: "action", header: "ACTION", size: "1.5fr" },
  ];

  const [columns, setColumns] = useState(initialColumns);
  const [bills, setBills] = useState<any[]>([]);
  const [allBills, setAllBills] = useState<any[]>([]); // To store all bills
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [billToReturn, setBillToReturn] = useState<any | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  const location = useLocation();

  const fetchBills = async () => {
    setLoading(true);
    try {
      const data = await getAllBills();
      // Check if the bills are in a nested property like 'bills' or 'data'
      let rawBills = [];
      if (data && Array.isArray(data.bills)) { // Handle { success: true, bills: [] }
        rawBills = data.bills;
      } else if (data && Array.isArray(data)) { // Handle [{...}, {...}]
        rawBills = data;
      }

      if (rawBills.length > 0) {
        const formattedBills = rawBills.map((bill: any) => ({
          ...bill,
          billId: bill.billNo || bill.billId,
          date: bill.billDate || bill.date,
          customerName: (bill.customerId && `${bill.customerId.firstName || ''} ${bill.customerId.lastName || ''}`.trim()) || bill.customerName || "N/A",
          discount: bill.items && bill.items.length > 0 ? bill.items[0].discountPercent : (bill.totalDiscount !== undefined ? bill.totalDiscount : 0),
          sgst: bill.totalSGST !== undefined ? bill.totalSGST : bill.sgst,
          cgst: bill.totalCGST !== undefined ? bill.totalCGST : bill.cgst,
          totalAmount: bill.netAmount !== undefined ? bill.netAmount : bill.totalAmount,
          amountAfterDiscount: bill.taxableAmount !== undefined ? bill.taxableAmount : bill.amountAfterDiscount,
          paymentStatus: bill.paymentStatus || bill.status || "UNPAID",
          agentName: (bill.agentId && `${bill.agentId.firstName || ''} ${bill.agentId.lastName || ''}`.trim()) || bill.agentName || "N/A"
        }));
        const sortedBills = formattedBills.sort((a: any, b: any) => new Date(b.date || b.billDate).getTime() - new Date(a.date || a.billDate).getTime());
        setAllBills(sortedBills);
        setBills(sortedBills);
      }
    } catch (error) {
      console.error("Failed to fetch bills:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []); // Initial fetch

  useEffect(() => {
    if (location.state?.refresh) {
      fetchBills();
    }
  }, [location.state]);

  useEffect(() => {
    let filtered = allBills;

    if (dateRange?.from && dateRange.to) {
      const fromDate = dateRange.from;
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999); // Include the entire end day

      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.date);
        return billDate >= fromDate && billDate <= toDate;
      });
    }

    setBills(filtered);
  }, [dateRange, allBills]);

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

  const handleDeleteBill = async (billId: string) => {
    if (!window.confirm("Are you sure you want to delete this bill?")) {
      return;
    }
    try {
      await deleteBillById(billId);
      toast.success("Bill deleted successfully!");
      setBills((prevBills) => prevBills.filter((bill) => bill._id !== billId));
    } catch (error) {
      console.error("Failed to delete bill:", error);
      // Optionally, show an error message to the user
      toast.error("Failed to delete the bill.");
    }
  };

  const handleUpdateStatus = async (billId: string, currentStatus: string) => {
    const newStatus = currentStatus === "PAID" ? "UNPAID" : "PAID";
    if (
      !window.confirm(
        `Are you sure you want to change the status to ${newStatus}?`
      )
    ) {
      return;
    }
    try {
      await updateBillPaymentStatus(billId, newStatus);
      toast.success(`Payment status updated to ${newStatus}`);
      setBills((prevBills) =>
        prevBills.map((bill) =>
          bill._id === billId ? { ...bill, paymentStatus: newStatus } : bill
        )
      );
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update payment status.");
    }
  };

  const handleReturnClick = (bill: any) => {
    setBillToReturn(bill);
    setRefundAmount(bill.totalAmount || "");
    setReturnReason("");
    setReturnModalOpen(true);
  };

  const handleSubmitReturn = async () => {
    if (!billToReturn) return;
    try {
      await addSaleReturn({
        billId: billToReturn._id,
        reason: returnReason,
        refundAmount,
        items: billToReturn.items || [],
      });
      toast.success("Return processed successfully");
      setReturnModalOpen(false);
      setBillToReturn(null);
    } catch (error) {
      console.error("Failed to process return:", error);
      toast.error("Failed to process return.");
    }
  };

  const BillDetailItem = ({
    label,
    value,
    icon: Icon,
    valueClassName,
  }: {
    label: string;
    value: string | number;
    icon?: React.ElementType;
    valueClassName?: string;
  }) => (
    <div className="flex items-center space-x-3 py-3 border-b border-gray-100">
      {Icon && <Icon className="h-5 w-5 text-[#f97a63]" />}
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`font-semibold text-gray-800 ${valueClassName}`}>
          {value}
        </p>
      </div>
    </div>
  );

  const filteredBills = bills.filter((bill) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      (bill.billId && bill.billId.toLowerCase().includes(query)) ||
      (bill.customerName && bill.customerName.toLowerCase().includes(query)) ||
      formatDate(bill.date).includes(query)
    );
  });

  return (
    <AdminLayout title="Bill Generation > Sale">
      <Toaster position="top-center" />

      {/* Bill Details Modal */}
      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-white p-0 shadow-2xl">
          <DialogHeader className="bg-gradient-to-br from-[#f97a63] via-[#f86a53] to-[#f75943] text-white p-5 rounded-t-lg relative overflow-hidden flex flex-col items-start">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-extrabold tracking-tight mb-1">
                Bill Details
              </DialogTitle>
              <span className="bg-white text-[#f97a63] text-sm font-bold px-7 py-1.5 rounded-full shadow-lg">
                  #{selectedBill?.billId}
                </span>
            </div>
          </DialogHeader>
          {selectedBill && (
            <div className="p-6">
              {/* Main Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                {/* Agent Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200/50 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-blue-500 rounded-lg p-2">
                      <CircleUser className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Agent Name</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedBill.agentName}</p>
                    </div>
                  </div>
                </div>

                {/* Customer Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-3 border border-purple-200/50 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-purple-500 rounded-lg p-2">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Customer Name</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedBill.customerName}</p>
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
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Bill Date</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">
                        {new Date(selectedBill.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Status Card */}
                <div className={`bg-gradient-to-br ${selectedBill.paymentStatus === "PAID" ? "from-green-50 to-green-100/50 border-green-200/50" : "from-red-50 to-red-100/50 border-red-200/50"} rounded-lg p-3 border shadow-sm hover:shadow-md transition-all`}>
                  <div className="flex items-center space-x-2.5">
                    <div className={`${selectedBill.paymentStatus === "PAID" ? "bg-green-500" : "bg-red-500"} rounded-lg p-2`}>
                      <BadgeIndianRupee className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-semibold ${selectedBill.paymentStatus === "PAID" ? "text-green-600" : "text-red-600"} uppercase tracking-wide`}>Payment Status</p>
                      <p className={`text-sm font-bold mt-0.5 ${selectedBill.paymentStatus === "PAID" ? "text-green-800" : "text-red-800"}`}>
                        {selectedBill.paymentStatus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax & Discount Section */}
              <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center">
                  <Hash className="h-3.5 w-3.5 mr-1.5 text-gray-600" />
                  Tax & Discount Details
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <Percent className="h-4 w-4 text-[#f97a63] mx-auto mb-1.5" />
                    <p className="text-xs text-gray-500 font-semibold uppercase">Discount</p>
                    <p className="text-lg font-bold text-gray-800 mt-1">₹ {selectedBill.discount}</p>
                  </div>
                  <div className="text-center bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <Percent className="h-4 w-4 text-blue-600 mx-auto mb-1.5" />
                    <p className="text-xs text-gray-500 font-semibold uppercase">SGST</p>
                    <p className="text-lg font-bold text-gray-800 mt-1">₹ {selectedBill.sgst}</p>
                  </div>
                  <div className="text-center bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <Percent className="h-4 w-4 text-indigo-600 mx-auto mb-1.5" />
                    <p className="text-xs text-gray-500 font-semibold uppercase">CGST</p>
                    <p className="text-lg font-bold text-gray-800 mt-1">₹ {selectedBill.cgst}</p>
                  </div>
                </div>
              </div>

              {/* Amount Summary Section */}
              <div className="bg-gradient-to-br from-[#fff4f1] via-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-200 shadow-lg">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center pb-2.5 border-b-2 border-orange-300">
                    <div className="flex items-center space-x-2">
                      <BadgeIndianRupee className="h-5 w-5 text-[#f97a63]" />
                      <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Total Amount</p>
                    </div>
                    <p className="text-2xl font-extrabold text-[#f97a63] tracking-tight">₹ {selectedBill.totalAmount}</p>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <p className="text-sm font-semibold text-gray-600">Amount After Discount</p>
                    <p className="text-xl font-bold text-gray-800">₹ {selectedBill.amountAfterDiscount}</p>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-gray-500">You saved</p>
                    <p className="font-bold text-green-600">₹ {selectedBill.discount}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Return Modal */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Return</DialogTitle>
            <DialogDescription>
              Process a return for Bill #{billToReturn?.billId}
            </DialogDescription>
          </DialogHeader>

          {billToReturn && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Customer</Label>
                  <p className="font-medium">{billToReturn.customerName}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Bill Date</Label>
                  <p className="font-medium">{formatDate(billToReturn.date)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-reason">Reason for Return</Label>
                <Input
                  id="return-reason"
                  placeholder="e.g. Damaged product, Wrong item"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund-amount">Refund Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                  <Input
                    id="refund-amount"
                    type="number"
                    className="pl-7"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500">Max refundable: ₹{billToReturn.totalAmount}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitReturn} className="bg-[#E98C81] hover:bg-[#d37b70] text-white">
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative flex items-center">
          <Input
            type="text"
            placeholder="Search by Bill ID, date, Customer"
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
              {filteredBills.map((bill, i) => (
                <tr
                  key={bill._id || i}
                  className="text-sm border-b last:border-none bg-white hover:bg-[#f8fbff] transition"
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className="px-5 py-3 text-center whitespace-nowrap"
                    >
                      {/* {column.id === "paymentStatus" ? (
                        <span
                          onClick={() =>
                            handleUpdateStatus(bill._id, bill.paymentStatus)
                          }
                          className={`font-semibold tracking-wide cursor-pointer px-3 py-1 rounded-full text-xs ${
                            bill.paymentStatus === "PAID"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {bill.paymentStatus}
                        </span>
                      ) : */ column.id === "action" ? (
                        <div className="flex items-center justify-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-8 h-8 rounded-full border border-gray-300 hover:bg-blue-50"
                                  onClick={() => setSelectedBill(bill)}
                                >
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View Bill</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-8 h-8 rounded-full border border-gray-300 hover:bg-orange-50"
                                  onClick={() => handleReturnClick(bill)}
                                >
                                  <RotateCcw className="h-4 w-4 text-orange-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Return</p>
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
                                  onClick={() => handleDeleteBill(bill._id)}
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
                        formatDate(bill.date) 
                      ) : column.id === 'discount' ? (
                        `${bill.discount || 0}%`
                      ) : (
                        bill[column.id as keyof typeof bill] ?? "N/A"
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
