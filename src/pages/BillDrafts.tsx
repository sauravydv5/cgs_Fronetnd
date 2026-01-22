"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, FileClock, GripVertical, Search, CircleUser, User, CalendarDays, BadgeIndianRupee, Hash, Percent } from "lucide-react";
import { getAllNewBills, updateBillPaymentStatus, generateBill } from "@/adminApi/billApi";
import { getAllSaleReturns, updateReturnStatus } from "@/adminApi/saleReturnApi";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const defaultColumns = [
  { id: "drag", label: "" },
  { id: "billNo", label: "Bill No" },
  { id: "type", label: "Type" },
  { id: "customer", label: "Customer" },
  { id: "date", label: "Date" },
  { id: "total", label: "Total Amount" },
  { id: "status", label: "Status" },
];

const SortableHeaderCell = ({ column }: { column: any }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    position: isDragging ? "relative" : undefined,
  } as React.CSSProperties;

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing bg-[#FEEEE5] text-center ${column.id === "drag" ? "w-[50px]" : ""}`}
    >
      {column.label}
    </TableHead>
  );
};

const SortableRow = ({ bill, columns, onStatusChange, onClick, onViewBill }: { bill: any; columns: any[]; onStatusChange: (id: string, status: string) => void; onClick: (bill: any) => void; onViewBill: (bill: any) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bill.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: isDragging ? "relative" : undefined,
  } as React.CSSProperties;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer ${isDragging ? "bg-blue-50 shadow-md" : "hover:bg-gray-50"}`}
      onClick={() => onClick(bill)}
    >
      {columns.map((col) => {
        if (col.id === "drag") {
          return (
            <TableCell key={col.id} className="w-[50px] text-center">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded text-gray-800 hover:text-black"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            </TableCell>
          );
        }
        if (col.id === "type") {
          return (
            <TableCell key={col.id} className="text-center">
              <Badge 
                variant={bill.type === 'SR' ? 'destructive' : 'secondary'}
                className="cursor-pointer hover:opacity-80"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewBill(bill);
                }}
              >
                {bill.type}
              </Badge>
            </TableCell>
          );
        }
        if (col.id === "status") {
          return (
            <TableCell key={col.id} className="text-center">
              <div onClick={(e) => e.stopPropagation()}>
              <Select
                value={bill.status || "Draft"}
                onValueChange={(value) => onStatusChange(bill.id, value)}
              >
                <SelectTrigger className="w-[110px] h-8 text-xs bg-white border-gray-300 mx-auto">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {bill.type === 'SR' ? (
                    <>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              </div>
            </TableCell>
          );
        }
        return (
          <TableCell key={col.id} className={`text-center ${col.id === "billNo" ? "font-medium" : ""}`}>
            {bill[col.id]}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

function BillDrafts() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("billDraftsColumns_v3");
    return saved ? JSON.parse(saved) : defaultColumns;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusConfirmationOpen, setStatusConfirmationOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ billId: string; status: string } | null>(null);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [generatedBillHtml, setGeneratedBillHtml] = useState<string | null>(null);
  const [showGeneratedBill, setShowGeneratedBill] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    localStorage.setItem("billDraftsColumns_v3", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    const fetchDraftsAndReturns = async () => {
      try {
        setLoading(true);
        const [billResponse, returnResponse] = await Promise.all([
          getAllNewBills(),
          getAllSaleReturns(),
        ]);
        
        // Handle different response structures
        let billData = [];
        if (billResponse && Array.isArray(billResponse)) {
          billData = billResponse;
        } else if (billResponse && billResponse.data && Array.isArray(billResponse.data)) {
          billData = billResponse.data;
        } else if (billResponse && billResponse.bills && Array.isArray(billResponse.bills)) {
          billData = billResponse.bills;
        }

        const formattedBills = billData.map((bill: any) => ({
          id: bill._id, // Unique ID for DnD
          billNo: bill.billNo || "N/A",
          customer: bill.customerName || bill.customerId?.firstName || "Unknown",
          date: bill.createdAt ? format(new Date(bill.createdAt), "dd MMM yyyy") : "N/A",
          total: `₹${bill.netAmount || bill.totalAmount || bill.grandTotal || 0}`,
          status: bill.paymentStatus || "Draft",
          type: 'SL',
          customerId: bill.customerId?._id || bill.customerId,
          customerName: bill.customerName || bill.customerId?.firstName || "Unknown",
          // Details for modal
          items: bill.items || [],
          discount: bill.totalDiscount || 0,
          sgst: bill.totalSGST || 0,
          cgst: bill.totalCGST || 0,
          grandTotal: bill.netAmount || bill.totalAmount || bill.grandTotal || 0,
          taxableAmount: bill.taxableAmount || 0,
          agentName: bill.agentName || "N/A",
        }));

        // Handle sale returns
        let returnData = [];
        if (returnResponse && Array.isArray(returnResponse.data)) {
          returnData = returnResponse.data;
        } else if (returnResponse && Array.isArray(returnResponse.saleReturns)) {
          returnData = returnResponse.saleReturns;
        } else if (Array.isArray(returnResponse)) {
          returnData = returnResponse;
        }

        const formattedReturns = returnData.map((ret: any) => ({
          id: `return-${ret._id}`,
          billNo: ret.returnId || ret._id.slice(-6).toUpperCase(),
          customer: ret.customerName || ret.customerId?.firstName || "Unknown",
          date: ret.createdAt ? format(new Date(ret.createdAt), "dd MMM yyyy") : "N/A",
          total: `₹${ret.refundAmount || 0}`,
          status: ret.status || "PENDING",
          type: 'SR',
          items: ret.items || [],
          grandTotal: ret.refundAmount || 0,
          customerId: ret.customerId?._id || ret.customerId,
        }));

        const combinedData = [...formattedBills, ...formattedReturns];
        combinedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setBills(combinedData);
      } catch (error) {
        console.error("Failed to fetch drafts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDraftsAndReturns();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Handle Column Reordering
    if (columns.some((col) => col.id === active.id)) {
      if (active.id !== over.id) {
        setColumns((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
      return;
    }

    // Handle Row Reordering
    if (active.id !== over?.id) {
      setBills((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const filteredBills = bills.filter((bill) =>
    bill.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.billNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredBills.length);
  const currentBills = filteredBills.slice(startIndex, endIndex);

  const initiatePaymentStatusChange = (billId: string, status: string) => {
    setPendingStatusUpdate({ billId, status });
    setStatusConfirmationOpen(true);
  };

  const confirmPaymentStatusChange = async () => {
    if (!pendingStatusUpdate) return;
    const { billId, status } = pendingStatusUpdate;

    try {
      const itemToUpdate = bills.find(b => b.id === billId);
      if (itemToUpdate?.type === 'SR') {
        // It's a sale return, remove prefix for API call
        await updateReturnStatus(billId.replace('return-', ''), status);
      } else {
        // It's a bill
        await updateBillPaymentStatus(billId, status);
      }

      toast.success("Payment status updated");
      setBills((prevBills) => prevBills.map((bill) => (bill.id === billId ? { ...bill, status: status } : bill)));

    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update status");
    } finally {
      setStatusConfirmationOpen(false);
      setPendingStatusUpdate(null);
    }
  };

  const handleViewGeneratedBill = async (bill: any) => {
    try {
      const customerId = bill.customerId;
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

  return (
    <AdminLayout title="Drafts">
      <div className="space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            {/* <h2 className="text-2xl font-bold tracking-tight">Pending Drafts</h2> */}
            <p className="text-sm text-muted-foreground">Manage your unpaid and draft bills here.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search drafts..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 w-[250px] rounded-full border-0 bg-[#FEEEE5] pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Generated Bill Modal */}
        <Dialog open={showGeneratedBill} onOpenChange={setShowGeneratedBill}>
          <DialogContent className="max-w-screen-lg w-[90vw] h-[90vh] flex flex-col p-2">
            <DialogHeader className="p-4 flex-row flex justify-between items-center">
              <DialogTitle>Generated Bill</DialogTitle>
              <Button
                onClick={() => {
                  const iframe = document.getElementById("bill-iframe") as HTMLIFrameElement;
                  iframe?.contentWindow?.print();
                }}
                className="bg-[#E98C81] hover:bg-[#d97a71] text-white"
              >
                Save & Print
              </Button>
            </DialogHeader>
            {generatedBillHtml && (
              <iframe id="bill-iframe" srcDoc={generatedBillHtml} className="w-full h-full border-0" title="Generated Bill Preview"></iframe>
            )}
          </DialogContent>
        </Dialog>

        {/* Draft Bills Table */}
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardContent className="p-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
                    <TableRow className="bg-[#FEEEE5] hover:bg-[#FEEEE5]">
                      {columns.map((col) => (
                        <SortableHeaderCell key={col.id} column={col} />
                      ))}
                    </TableRow>
                  </SortableContext>
                </TableHeader>

                <TableBody>
                <SortableContext
                  items={currentBills}
                  strategy={verticalListSortingStrategy}
                >
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Loading drafts...
                      </TableCell>
                    </TableRow>
                  ) : currentBills.length > 0 ? (
                    currentBills.map((bill) => (
                      <SortableRow 
                        key={bill.id} 
                        bill={bill} 
                        columns={columns} 
                        onStatusChange={initiatePaymentStatusChange} 
                        onClick={setSelectedBill} 
                        onViewBill={handleViewGeneratedBill}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-10 text-muted-foreground"
                      >
                        No draft bills found
                      </TableCell>
                    </TableRow>
                  )}
                </SortableContext>
                </TableBody>
              </Table>
            </DndContext>

            {!loading && filteredBills.length > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t">
                <div className="text-sm text-muted-foreground mb-4 sm:mb-0">
                  Showing {startIndex + 1} to {endIndex} of {filteredBills.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
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
                          className={`w-8 h-8 p-0 ${currentPage === pageNum ? "bg-[#E98C81] hover:bg-[#d97a71] text-white border-none" : ""}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* === Payment Status Confirmation Dialog === */}
        <Dialog open={statusConfirmationOpen} onOpenChange={setStatusConfirmationOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Status Change</DialogTitle>
              <DialogDescription>
                Are you sure you want to change the payment status to <strong>{pendingStatusUpdate?.status}</strong>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusConfirmationOpen(false)}>Cancel</Button>
              <Button onClick={confirmPaymentStatusChange} className="bg-[#E98C81] hover:bg-[#d37b70] text-white">Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* === Bill Details Modal === */}
        <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-white p-0 shadow-2xl">
            <DialogHeader className="bg-gradient-to-br from-[#f97a63] via-[#f86a53] to-[#f75943] text-white p-5 rounded-t-lg relative overflow-hidden flex flex-col items-start">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
              <div className="relative z-10">
                <DialogTitle className="text-2xl font-extrabold tracking-tight mb-1">
                  {selectedBill?.type === 'SR' ? 'Sale Return Details' : 'Bill Details'}
                </DialogTitle>
                <span className="bg-white text-[#f97a63] text-sm font-bold px-7 py-1.5 rounded-full shadow-lg">
                  #{selectedBill?.billNo}
                </span>
              </div>
            </DialogHeader>
            {selectedBill && (
              <div className="p-6">
                {/* Main Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
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

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-3 border border-orange-200/50 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center space-x-2.5">
                      <div className="bg-orange-500 rounded-lg p-2">
                        <CalendarDays className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Bill Date</p>
                        <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedBill.date}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items Section */}
                <div className="bg-white rounded-lg border border-gray-200 mb-5 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center">
                      <Hash className="h-3.5 w-3.5 mr-1.5 text-gray-600" />
                      Order Items
                    </h3>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase sticky top-0">
                        <tr>
                          <th className="px-4 py-2">Item Name</th>
                          <th className="px-4 py-2 text-center">Qty</th>
                          <th className="px-4 py-2 text-right">Rate</th>
                          <th className="px-4 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedBill.items && selectedBill.items.length > 0 ? (
                          selectedBill.items.map((item: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2">
                                <p className="font-medium text-gray-800">{item.itemName || item.productName || "N/A"}</p>
                                <p className="text-xs text-gray-500">{item.itemCode || ""}</p>
                              </td>
                              <td className="px-4 py-2 text-center">{item.qty}</td>
                              <td className="px-4 py-2 text-right">₹{item.rate || item.mrp || 0}</td>
                              <td className="px-4 py-2 text-right font-medium">₹{item.total || item.netAmount || 0}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-4 text-center text-gray-500">No items found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Amount Summary Section */}
                <div className="bg-gradient-to-br from-[#fff4f1] via-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-200 shadow-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <BadgeIndianRupee className="h-5 w-5 text-[#f97a63]" />
                      <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Total Amount</p>
                    </div>
                    <p className="text-2xl font-extrabold text-[#f97a63] tracking-tight">{selectedBill.total}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

export default BillDrafts;
