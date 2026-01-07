import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Pencil, Eye, Undo2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { getAllPurchaseReturns, updatePurchaseReturn, deletePurchaseReturn, getPurchaseReturnsByDateRange } from "@/adminApi/purchaseReturnApi";
import { Label } from "@/components/ui/label";
export default function ReturnPurchase() {
  const [search, setSearch] = useState("");
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formState, setFormState] = useState({
    qty: "",
    reason: "",
    amount: "",
    status: "",
  });
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  const initialColumns = [
    { id: "returnId", label: "RETURN ID" },
    { id: "purchaseId", label: "PURCHASE ID" },
    { id: "supplier", label: "SUPPLIER" },
    { id: "product", label: "PRODUCT" },
    { id: "qty", label: "QTY" },
    { id: "reason", label: "REASON" },
    { id: "amount", label: "AMOUNT" },
    { id: "status", label: "STATUS" },
    { id: "actions", label: "ACTIONS" },
  ];

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("returnPurchaseColumnOrder");
    return savedOrder ? JSON.parse(savedOrder) : initialColumns;
  });

  useEffect(() => {
    localStorage.setItem("returnPurchaseColumnOrder", JSON.stringify(columns));
  }, [columns]);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllPurchaseReturns();
      if (response.success) {
        const returnsData = response.data || [];
        const flattenedReturns = returnsData.flatMap((ret: any) => {
          if (ret.items && ret.items.length > 0) {
            return ret.items.map((item: any) => ({
              ...ret, // Copy top-level return properties
              _id: `${ret._id}-${item._id}`, // Create a unique key for React
              product: item.product,
              qty: item.qty || 0,
              amount: item.amount ?? ((item.qty || 0) * (item.rate || 0)),
            }));
          }
          return [{ ...ret, _id: ret._id, product: null, qty: 0, amount: ret.totalAmount }];
        });
        setReturns(flattenedReturns);
      } else {
        toast.error(response.message || "Failed to fetch purchase returns.");
      }
    } catch (error) {
      toast.error("An error occurred while fetching data.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const handleDateRangeSearch = async () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error("Please select both start and end dates");
      return;
    }

    setLoading(true);
    try {
      const response = await getPurchaseReturnsByDateRange(dateRange.start, dateRange.end);
      console.log("📅 Date Range Response:", response);

      let returnsData = [];
      let dataFound = false;

      // Robust parsing similar to OrderManagement
      if (response.success && Array.isArray(response.data)) {
        returnsData = response.data;
        dataFound = true;
      } else if (response.data && Array.isArray(response.data)) {
        returnsData = response.data;
        dataFound = true;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        returnsData = response.data.data;
        dataFound = true;
      } else if (Array.isArray(response)) {
        returnsData = response;
        dataFound = true;
      }

      if (dataFound || response.success) {
        const flattenedReturns = returnsData.flatMap((ret: any) => {
          if (ret.items && ret.items.length > 0) {
            return ret.items.map((item: any) => ({
              ...ret,
              _id: `${ret._id}-${item._id}`,
              product: item.product,
              qty: item.qty || 0,
              amount: item.amount ?? ((item.qty || 0) * (item.rate || 0)),
            }));
          }
          return [{ ...ret, _id: ret._id, product: null, qty: 0, amount: ret.totalAmount }];
        });
        setReturns(flattenedReturns);
        setDateFilterOpen(false);
        toast.success(`Found ${flattenedReturns.length} returns.`);
      } else {
        toast.error(response.message || "Failed to fetch returns.");
      }
    } catch (error: any) {
      console.error("Failed to fetch returns by date:", error);
      toast.error(error.response?.data?.message || "Failed to fetch returns");
    } finally {
      setLoading(false);
    }
  };

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
        className="px-4 py-3 text-left font-semibold cursor-grab"
      >
        {column.label}
      </th>
    );
  };

  // STEP 2: Pencil icon par click karne par ye function call hota hai.
  // Ye modal open karta hai aur edit karne wale item ka data set karta hai.
  const handleEditClick = (item) => {
    setEditingReturn(item);
    setFormState({
      qty: item.qty.toString(),
      reason: item.reason,
      amount: item.amount.toString(),
      status: item.status,
    });
    setIsEditModalOpen(true);
  };

  const handleViewClick = (item) => {
    setEditingReturn(item); // Use the same state as edit for simplicity
    setIsViewModalOpen(true);
  };

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSelectChange = (name: string, value: string) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  // STEP 4: Modal ke andar "Update Return" button par click karne par ye function call hota hai.
  // Ye data taiyar karke updatePurchaseReturn API ko call karta hai.
  const handleUpdateSubmit = async () => {
    if (!formState.qty || !formState.reason || !formState.amount) {
      toast.error("Please fill all fields: Quantity, Reason, and Amount.");
      return;
    }

    if (!window.confirm("Are you sure you want to update this purchase return?")) {
      return;
    }

    setFormLoading(true);
    try {
      // Backend ko 'purchase', 'date', aur 'items' ki zaroorat hai.
      // Hum validation pass karne ke liye payload ko sahi se banayenge.
      const payload = {
        purchase: editingReturn.purchase?._id || editingReturn.purchase,
        date: editingReturn.date, // Original date ko background mein pass karein
        reason: formState.reason,
        status: formState.status,
        items: [
          {
            product: editingReturn.product?._id,
            qty: Number(formState.qty),
            // Rate ko amount aur quantity se calculate karein
            rate: Number(formState.qty) > 0 ? Number(formState.amount) / Number(formState.qty) : 0,
          },
        ],
      };

      // Original return ka _id chahiye, flattened wala nahi.
      const originalReturnId = editingReturn._id.split('-')[0];

      // STEP 5: Yahan API call hota hai updated data ke saath.
      const response = await updatePurchaseReturn(originalReturnId, payload);

      if (response.success) {
        toast.success("Purchase return updated successfully!");
        fetchReturns(); // List ko refresh karein
        setIsEditModalOpen(false);
        setEditingReturn(null);
      } else {
        toast.error(response.message || "Failed to update purchase return.");
      }
    } catch (error) {
      toast.error("An error occurred while updating.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteReturn = async (returnId: string) => {
    if (!window.confirm("Are you sure you want to delete this purchase return?")) {
      return;
    }

    try {
      const originalReturnId = returnId.split('-')[0];
      const response = await deletePurchaseReturn(originalReturnId);

      if (response.success) {
        toast.success("Purchase return deleted successfully!");
        fetchReturns(); // Refresh the list
      } else {
        toast.error(response.message || "Failed to delete purchase return.");
      }
    } catch (error) {
      toast.error("An error occurred while deleting.");
    }
  };

  const filteredReturns = returns.filter(
    (item) => {
      const lowercasedSearch = search.toLowerCase();
      if (!lowercasedSearch) return true; // Agar search khali hai, to sab dikhayein

      const returnIdMatch = item.returnId && item.returnId.toLowerCase().includes(lowercasedSearch);
      const supplierNameMatch = item.supplier && item.supplier.name && item.supplier.name.toLowerCase().includes(lowercasedSearch);
      return returnIdMatch || supplierNameMatch;
    }
  );

  return (
    <AdminLayout title="Purchase > Return Purchase">
      <div className="p-6">
        {/* Search Section */}
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Input
              type="text"
              placeholder="Search by Return ID, Supplier"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-full border-gray-300 focus:ring-0"
            />
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
          </div>
          <Button
            variant="outline"
            className="rounded-full flex items-center gap-2"
            onClick={() => setDateFilterOpen(true)}
          >
            <Calendar size={18} />
          </Button>
        </div>

        {/* Table Section */}
        <Card className="shadow-sm rounded-2xl border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {(() => {
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

                const columnIds = columns.map((c) => c.id);

                const renderCell = (item: any, columnId: string) => {
                  switch (columnId) {
                    case "returnId": return <td className="px-4 py-3">{item.returnId}</td>;
                    case "purchaseId": return <td className="px-4 py-3">{item.purchase?.purchaseId || 'N/A'}</td>;
                    case "supplier": return <td className="px-4 py-3">{item.supplier?.name || 'N/A'}</td>;
                    case "product": return <td className="px-4 py-3">{item.product?.name || item.product?.productName || 'N/A'}</td>;
                    case "qty": return <td className="px-4 py-3">{item.qty}</td>;
                    case "reason": return <td className="px-4 py-3">{item.reason}</td>;
                    case "amount": return <td className="px-4 py-3">₹{item.amount?.toLocaleString('en-IN') || 0}</td>;
                    case "status": return <td className="px-4 py-3 text-orange-500 font-medium">{item.status}</td>;
                    case "actions":
                      return (
                        <td className="py-3 px-4 flex items-center justify-center gap-2">
                          <button onClick={() => handleViewClick(item)} className="w-8 h-8 flex items-center justify-center border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors" title="View Details">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => handleDeleteReturn(item._id)} className="w-8 h-8 flex items-center justify-center border border-red-400 text-red-500 rounded-full hover:bg-red-50 transition-colors" title="Delete Return">
                            <Trash2 size={16} />
                          </button>
                          {/* STEP 1: User yahan pencil icon par click karta hai. */}
                          <button onClick={() => handleEditClick(item)} className="w-8 h-8 flex items-center justify-center border border-gray-400 text-gray-600 rounded-full hover:bg-gray-100 transition-colors" title="Edit Return">
                            <Pencil size={16} />
                          </button>
                        </td>
                      );
                    default: return null;
                  }
                };

                return (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-700">
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
                      {loading ? (
                        <tr>
                          <td colSpan={columns.length} className="text-center py-10">Loading...</td>
                        </tr>
                      ) : filteredReturns.length > 0 ? (
                        filteredReturns.map((item) => (
                          <tr
                            key={item._id}
                            className="border-t border-gray-100 hover:bg-gray-50 transition"
                          >
                            {columns.map((col) => <React.Fragment key={col.id}>{renderCell(item, col.id)}</React.Fragment>)}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columns.length} className="text-center py-10">No purchase returns found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-2 mt-6 text-sm text-gray-600">
          <button className="px-2 py-1 rounded hover:bg-gray-100">&lt;</button>
          <button className="px-2 py-1 rounded bg-gray-200 text-gray-800">1</button>
          <span className="font-medium text-blue-600">2</span>
          <span>3</span>
          <span>…</span>
          <span>56</span>
          <button className="px-2 py-1 rounded hover:bg-gray-100">&gt;</button>
        </div>
      </div>

      {/* Date Range Filter Dialog */}
      <Dialog open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Purchase Returns by Date</DialogTitle>
            <DialogDescription>
              Select a start and end date to view returns within that range.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                onKeyDown={(e) => e.preventDefault()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                onKeyDown={(e) => e.preventDefault()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateFilterOpen(false)}>Cancel</Button>
            <Button className="bg-[#E98C81] hover:bg-[#f48c83]" onClick={handleDateRangeSearch}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Return Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Edit Purchase Return</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <Input name="qty" type="number" value={formState.qty} onChange={handleFormInputChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Input name="reason" value={formState.reason} onChange={handleFormInputChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input name="amount" type="number" value={formState.amount} onChange={handleFormInputChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formState.status} onValueChange={(value) => handleFormSelectChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* STEP 3: User modal ke andar is button par click karke changes submit karta hai. */}
              <Button
                onClick={handleUpdateSubmit}
                disabled={formLoading}
                className="w-full bg-[#e48a7c] hover:bg-[#d77b6f] text-white"
              >
                {formLoading ? "Updating..." : "Update Return"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Return Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">Purchase Return Details</DialogTitle>
          </DialogHeader>
          {editingReturn && (
            <div className="py-4 space-y-6">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Return ID</p>
                  <p className="font-bold text-lg text-[#e48a7c]">{editingReturn.returnId}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                  editingReturn.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                  editingReturn.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                  'bg-orange-100 text-orange-800'
                }`}>
                  {editingReturn.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-gray-500">Purchase ID</p>
                  <p className="font-semibold">{editingReturn.purchase?.purchaseId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Supplier</p>
                  <p className="font-semibold">{editingReturn.supplier?.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Product</p>
                  <p className="font-semibold">{editingReturn.product?.productName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Quantity</p>
                  <p className="font-semibold">{editingReturn.qty}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-gray-500">Reason</p>
                  <p className="font-semibold">{editingReturn.reason}</p>
                </div>
                <div className="space-y-1 col-span-2 border-t pt-4 mt-2">
                  <p className="text-gray-500">Total Amount</p>
                  <p className="font-bold text-xl text-gray-800">₹{editingReturn.amount?.toLocaleString('en-IN') || 0}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
