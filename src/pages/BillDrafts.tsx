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
import { Pencil, Trash2, FileClock, GripVertical, Search } from "lucide-react";
import { getBillDrafts, updateBillPaymentStatus } from "@/adminApi/billApi";
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
      className={`cursor-grab active:cursor-grabbing bg-gray-50/50 text-center ${column.id === "drag" ? "w-[50px]" : ""}`}
    >
      {column.label}
    </TableHead>
  );
};

const SortableRow = ({ bill, columns, onStatusChange }: { bill: any; columns: any[]; onStatusChange: (id: string, status: string) => void }) => {
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
      className={isDragging ? "bg-blue-50 shadow-md" : "hover:bg-gray-50"}
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
        if (col.id === "status") {
          return (
            <TableCell key={col.id} className="text-center">
              <Select
                value={bill.status || "Draft"}
                onValueChange={(value) => onStatusChange(bill.id, value)}
              >
                <SelectTrigger className="w-[110px] h-8 text-xs bg-white border-gray-300 mx-auto">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  {/* <SelectItem value="Pending">Pending</SelectItem> */}
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>
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

  useEffect(() => {
    localStorage.setItem("billDraftsColumns_v3", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        setLoading(true);
        const response = await getBillDrafts();
        
        // Handle different response structures
        let data = [];
        if (response && Array.isArray(response)) {
          data = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          data = response.data;
        } else if (response && response.bills && Array.isArray(response.bills)) {
          data = response.bills;
        }

        const formattedBills = data.map((bill: any) => ({
          id: bill._id, // Unique ID for DnD
          billNo: bill.billNo || "N/A",
          customer: bill.customerName || bill.customerId?.firstName || "Unknown",
          date: bill.createdAt ? format(new Date(bill.createdAt), "dd MMM yyyy") : "N/A",
          total: `₹${bill.netAmount || bill.totalAmount || bill.grandTotal || 0}`,
          status: bill.paymentStatus || "Draft",
          customerId: bill.customerId?._id || bill.customerId,
          customerName: bill.customerName || bill.customerId?.firstName || "Unknown",
        }));

        setBills(formattedBills);
      } catch (error) {
        console.error("Failed to fetch drafts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDrafts();
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

  const initiatePaymentStatusChange = (billId: string, status: string) => {
    setPendingStatusUpdate({ billId, status });
    setStatusConfirmationOpen(true);
  };

  const confirmPaymentStatusChange = async () => {
    if (!pendingStatusUpdate) return;
    const { billId, status } = pendingStatusUpdate;

    try {
      await updateBillPaymentStatus(billId, status);
      toast.success("Payment status updated");
      if (status !== 'Draft') {
        const updatedBill = bills.find(b => b.id === billId);
        if (updatedBill && updatedBill.customerId) {
          navigate(`/bills/new-bill?customerId=${updatedBill.customerId}`, {
            state: { customerName: updatedBill.customerName }
          });
        } else {
          setBills((prevBills) => prevBills.filter((bill) => bill.id !== billId));
        }
      } else {
        setBills((prevBills) => prevBills.map((bill) => (bill.id === billId ? { ...bill, status: status } : bill)));
      }
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update status");
    } finally {
      setStatusConfirmationOpen(false);
      setPendingStatusUpdate(null);
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-[250px] rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

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
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      {columns.map((col) => (
                        <SortableHeaderCell key={col.id} column={col} />
                      ))}
                    </TableRow>
                  </SortableContext>
                </TableHeader>

                <TableBody>
                <SortableContext
                  items={filteredBills}
                  strategy={verticalListSortingStrategy}
                >
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Loading drafts...
                      </TableCell>
                    </TableRow>
                  ) : filteredBills.length > 0 ? (
                    filteredBills.map((bill) => (
                      <SortableRow key={bill.id} bill={bill} columns={columns} onStatusChange={initiatePaymentStatusChange} />
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
      </div>
    </AdminLayout>
  );
}

export default BillDrafts;
