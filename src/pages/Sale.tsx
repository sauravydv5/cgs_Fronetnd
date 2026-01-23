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
  Undo2,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { format, isValid } from "date-fns";
import { updateBillPaymentStatus, generateBill } from "@/adminApi/billApi";
import { addSaleReturn, getAllSaleReturns } from "@/adminApi/saleReturnApi";

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
  return isValid(date) ? format(date, "dd-MM-yyyy") : "-";
};
export default function Sale() {
  const initialColumns = [
    { id: "agentName", header: "AGENT NAME", size: "1.5fr" },
    { id: "billId", header: "BILL ID", size: "1.0fr" },
    { id: "date", header: "DATE", size: "1.3fr" },
    { id: "customerName", header: "CUSTOMER NAME", size: "2fr" },
    { id: "discount", header: "DISCOUNT %", size: "1fr" },
    { id: "amountAfterDiscount", header: "AMT AFT DIS", size: "1.6fr" },
    { id: "cgst", header: "CGST ₹", size: "1fr" },
    { id: "sgst", header: "SGST ₹", size: "1fr" },
    { id: "totalAmount", header: "TOTAL AMOUNT", size: "1.6fr" },
    // { id: "paymentStatus", header: "PAYMENT STATUS", size: "1.5fr" },
    { id: "action", header: "ACTION", size: "1.5fr" },
  ];

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("saleTableColumnOrder");
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        const initialIds = new Set(initialColumns.map((c) => c.id));
        const validSaved = parsed.filter((c: any) => initialIds.has(c.id));
        const savedIds = new Set(validSaved.map((c: any) => c.id));
        const missingColumns = initialColumns.filter((c) => !savedIds.has(c.id));
        return [...validSaved, ...missingColumns];
      } catch (e) {
        return initialColumns;
      }
    }
    return initialColumns;
  });

  useEffect(() => {
    localStorage.setItem("saleTableColumnOrder", JSON.stringify(columns));
  }, [columns]);

  const [bills, setBills] = useState<any[]>([]);
  const [allBills, setAllBills] = useState<any[]>([]); // To store all bills
  const [loading, setLoading] = useState(true);
  const [generatedBillHtml, setGeneratedBillHtml] = useState<string | null>(null);
  const [showGeneratedBill, setShowGeneratedBill] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [billToReturn, setBillToReturn] = useState<any | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [returnedBillIds, setReturnedBillIds] = useState<Set<string>>(new Set());

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

  const fetchReturns = async () => {
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

      const ids = new Set(rawReturns.map((r: any) => {
        if (r.billId && typeof r.billId === 'object') {
          return r.billId._id;
        }
        return r.billId;
      }).filter(Boolean));
      setReturnedBillIds(ids);
    } catch (error) {
      console.error("Failed to fetch returns:", error);
    }
  };

  useEffect(() => {
    fetchBills();
    fetchReturns();
  }, []); // Initial fetch

  useEffect(() => {
    if (location.state?.refresh) {
      fetchBills();
      fetchReturns();
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

  const handleViewBill = async (bill: any) => {
    try {
      const customerId = bill.customerId?._id || bill.customerId;
      if (!customerId) {
        toast.error("Customer ID not found for this bill.");
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

  const handleReturnClick = (bill: any) => {
    setBillToReturn(bill);
    // Initialize items with selected: false
    const items = (bill.items || []).map((item: any) => ({
      ...item,
      selected: false,
      returnQty: item.qty // Default to full quantity
    }));
    setReturnItems(items);
    setRefundAmount("0");
    setReturnReason("");
    setReturnModalOpen(true);
  };

  const calculateRefundAmount = (items: any[]) => {
    const total = items.reduce((acc, item) => {
      if (!item.selected) return acc;
      const originalTotal = Number(item.total) || Number(item.netAmount) || 0;
      const originalQty = Number(item.qty) || 1;
      const unitPrice = originalTotal / originalQty;
      const qty = item.returnQty === "" ? 0 : Number(item.returnQty);
      const itemRefund = unitPrice * qty;
      return acc + itemRefund;
    }, 0);
    setRefundAmount(total.toFixed(2));
  };

  const handleItemSelect = (index: number, checked: boolean) => {
    setReturnItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], selected: checked };
      calculateRefundAmount(newItems);
      return newItems;
    });
  };

  const handleReturnQtyChange = (index: number, value: string) => {
    setReturnItems((prev) => {
      const newItems = [...prev];
      const item = newItems[index];

      if (value === "") {
        newItems[index] = { ...item, returnQty: "" };
        calculateRefundAmount(newItems);
        return newItems;
      }

      let val = parseInt(value);
      if (isNaN(val)) val = 0;
      
      // Clamp between 0 and max qty (purchased qty)
      const maxQty = Number(item.qty);
      if (val > maxQty) val = maxQty;
      if (val < 0) val = 0;

      newItems[index] = { ...item, returnQty: val };
      calculateRefundAmount(newItems);
      return newItems;
    });
  };

  const handleSubmitReturn = async () => {
    if (!billToReturn) return;
    const selectedItems = returnItems
      .filter((i) => i.selected && i.returnQty !== "" && Number(i.returnQty) > 0)
      .map((i) => ({
        ...i,
        qty: Number(i.returnQty), // Send the return quantity
        total: ((Number(i.total) || Number(i.netAmount) || 0) / (Number(i.qty) || 1)) * Number(i.returnQty),
        finalAmount: ((Number(i.total) || Number(i.netAmount) || 0) / (Number(i.qty) || 1)) * Number(i.returnQty)
      }));

    if (selectedItems.length === 0) {
      toast.error("Please select items to return with valid quantity");
      return;
    }

    try {
      await addSaleReturn({
        billId: billToReturn._id,
        reason: returnReason,
        refundAmount,
        items: selectedItems,
      });
      toast.success("Return processed successfully");
      setReturnModalOpen(false);
      setBillToReturn(null);
      fetchReturns();
    } catch (error: any) {
      console.error("Failed to process return:", error);
      toast.error(error.response?.data?.message || "Failed to process return.");
    }
  };

  const filteredBills = bills.filter((bill) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      (bill.billId && bill.billId.toLowerCase().includes(query)) ||
      (bill.customerName && bill.customerName.toLowerCase().includes(query)) ||
      formatDate(bill.date).includes(query)
    );
  });

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredBills.length);
  const currentBills = filteredBills.slice(startIndex, endIndex);

  const totalSales = bills.reduce((acc, bill) => {
    return acc + (Number(bill.totalAmount) || 0);
  }, 0);

  return (
    <AdminLayout title="Bill Generation > Sale">
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
                <Label>Select Items to Return</Label>
                <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-medium sticky top-0">
                      <tr>
                        <th className="p-2 w-10 text-center">#</th>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-center">Return Qty</th>
                        <th className="p-2 text-right">Refund Amt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {returnItems.map((item, index) => {
                         const originalTotal = Number(item.total) || Number(item.netAmount) || 0;
                         const originalQty = Number(item.qty) || 1;
                         const unitPrice = originalTotal / originalQty;
                         const currentRefund = unitPrice * (item.returnQty === "" ? 0 : Number(item.returnQty));

                         return (
                        <tr key={index} className={item.selected ? "bg-blue-50" : "hover:bg-gray-50"}>
                          <td className="p-2 text-center">
                            <Checkbox
                              checked={item.selected}
                              onCheckedChange={(checked) => handleItemSelect(index, checked as boolean)}
                            />
                          </td>
                          <td className="p-2">
                            <div className="font-medium">{item.itemName || item.productName}</div>
                            <div className="text-xs text-gray-500">Purchased: {item.qty}</div>
                          </td>
                          <td className="p-2 text-center">
                            <Input
                                type="number"
                                className="w-20 h-8 text-center mx-auto bg-white"
                                value={item.returnQty}
                                min={0}
                                max={item.qty}
                                onChange={(e) => handleReturnQtyChange(index, e.target.value)}
                                onFocus={(e) => e.target.select()}
                                disabled={!item.selected}
                            />
                          </td>
                          <td className="p-2 text-right">₹{currentRefund.toFixed(2)}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
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

      {/* Total Sales Summary Card */}
      {dateRange?.from && dateRange.to && (
        <div className="flex justify-end mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4 min-w-[240px]">
            <div className="bg-green-100 p-3 rounded-full">
              <BadgeIndianRupee className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Sales</p>
              <p className="text-xl font-bold text-gray-800">
                ₹{totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

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
              {currentBills.map((bill, i) => (
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
                      ) : */ column.id === "action" ? (() => {
                        const isReturned = returnedBillIds.has(bill._id);
                        return (
                        <div className="flex items-center justify-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-8 h-8 rounded-full border border-gray-300 hover:bg-blue-50"
                                  onClick={() => handleViewBill(bill)}
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
                                  disabled={isReturned}
                                >
                                  <Undo2 className={`h-4 w-4 ${isReturned ? "text-gray-400" : "text-orange-600"}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{isReturned ? "Return Already Exists" : "Return"}</p>
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
                      );
                      })() : column.id === 'date' ? (
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
      {filteredBills.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t bg-gray-50 gap-3 rounded-b-lg mt-4">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {startIndex + 1} to {endIndex} of {filteredBills.length} entries
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
