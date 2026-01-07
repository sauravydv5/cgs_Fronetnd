import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Edit3, Trash2, Eye, Undo2 } from "lucide-react";
import { toast } from "sonner";
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

import {
  getAllPurchaseDetails,
  deletePurchaseDetail,
  addPurchaseDetail,
  updatePurchaseDetail,
  getPurchaseByDateRange,
} from "@/adminApi/purchaseDetailApi";
import { getAllSuppliers } from "@/adminApi/supplierApi";
import { addPurchaseReturn } from "@/adminApi/purchaseReturnApi";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function PurchaseDetail() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [newPurchase, setNewPurchase] = useState({
    supplier: "",
    date: "",
    totalAmount: "",
    paymentMethod: "CASH",
    status: "PENDING",
  });
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  const initialColumns = [
    { id: "purchaseId", label: "PURCHASE ID" },
    { id: "supplier", label: "SUPPLIER NAME" },
    { id: "date", label: "DATE" },
    { id: "amount", label: "TOTAL AMOUNT" },
    { id: "payment", label: "PAYMENT" },
    { id: "status", label: "STATUS" },
    { id: "actions", label: "ACTIONS" },
  ];

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("purchaseDetailColumnOrder");
    // Temporarily force initialColumns to debug column order issue
    return initialColumns; // savedOrder ? JSON.parse(savedOrder) : initialColumns;
  });

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllPurchaseDetails();
      if (response.success) {
        setPurchases(response.data || []);
      } else {
        toast.error(response.message || "Failed to fetch purchase details.");
      }
    } catch (error) {
      toast.error("An error occurred while fetching purchase details.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await getAllSuppliers();
      // The response for getAllSuppliers is { success: boolean, suppliers: [] }
      // or { success: boolean, data: [] }
      // We need to handle both cases to be safe.
      if (response.success) {
        const supplierList = response.data || response.suppliers || [];
        setSuppliers(supplierList);
      }
    } catch (error) {
      // Don't toast error for this, as it's a secondary fetch
      console.error("Failed to fetch suppliers for dropdown.");
    }
  }, []);

  const handleDateRangeSearch = async () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error("Please select both start and end dates");
      return;
    }

    setLoading(true);
    try {
      const response = await getPurchaseByDateRange(dateRange.start, dateRange.end);
      if (response.success || response.status) {
        const data = response.data || response.purchases || [];
        setPurchases(data);
        setDateFilterOpen(false);
        toast.success(`Found ${data.length} purchases`);
      } else {
        toast.error(response.message || "Failed to fetch purchases");
      }
    } catch (error: any) {
      console.error("Failed to fetch purchases by date:", error);
      toast.error(error.response?.data?.message || "Failed to fetch purchases");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (purchaseId: string) => {
    if (window.confirm("Are you sure you want to delete this purchase record?")) {
      try {
        const response = await deletePurchaseDetail(purchaseId);
        if (response.success) {
          toast.success(response.message || "Purchase deleted successfully!");
          fetchPurchases(); // Refresh the list
        } else {
          toast.error(response.message || "Failed to delete purchase.");
        }
      } catch (error) {
        toast.error("An error occurred while deleting the purchase.");
      }
    }
  };

  const handleEditClick = (purchase) => {
    setEditingPurchase(purchase);
    setNewPurchase({
      supplier: purchase.supplier?._id || "",
      date: format(new Date(purchase.date), "yyyy-MM-dd"),
      totalAmount: purchase.totalAmount.toString(),
      paymentMethod: purchase.paymentMethod,
      status: purchase.status,
    });
    setShowModal(true);
  };

  const handleViewClick = (purchase) => {
    setSelectedPurchase(purchase);
    setShowViewModal(true);
  };

  const handleReturnClick = (purchase) => {
    setSelectedPurchase(purchase);
    setReturnReason("");
    setShowReturnModal(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedPurchase) return;
    setReturnLoading(true);

    try {
      const payload = {
        purchase: selectedPurchase._id,
        supplier: selectedPurchase.supplier?._id || selectedPurchase.supplier,
        amount: selectedPurchase.totalAmount,
        reason: returnReason,
        date: new Date().toISOString(),
        qty: selectedPurchase.items?.reduce((acc: number, item: any) => acc + (Number(item.qty) || 0), 0) || 0,
        status: "PENDING",
        items: selectedPurchase.items || []
      };

      const response = await addPurchaseReturn(payload);
      if (response.success) {
        toast.success("Purchase returned successfully!");
        setShowReturnModal(false);
        setSelectedPurchase(null);
      } else {
        toast.error(response.message || "Failed to return purchase.");
      }
    } catch (error) {
      console.error("Return error:", error);
      toast.error("An error occurred while returning the purchase.");
    } finally {
      setReturnLoading(false);
    }
  };

  const resetForm = () => {
    setNewPurchase({
      supplier: "",
      date: "",
      totalAmount: "",
      paymentMethod: "CASH",
      status: "PENDING",
    });
    setShowModal(false);
    setEditingPurchase(null);
    setFormLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPurchase((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewPurchase((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async () => {
    if (!newPurchase.supplier || !newPurchase.date || !newPurchase.totalAmount) {
      toast.error("Please fill all required fields: Supplier, Date, and Amount.");
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        ...newPurchase,
        totalAmount: Number(newPurchase.totalAmount),
        items: [],
      };

      let response;
      if (editingPurchase) {
        response = await updatePurchaseDetail(editingPurchase._id, payload);
      } else {
        response = await addPurchaseDetail(payload);
      }

      if (response.success) {
        toast.success(response.message || `Purchase ${editingPurchase ? 'updated' : 'added'} successfully!`);
        fetchPurchases();
        resetForm();
      } else {
        toast.error(response.message || "An operation failed.");
      }
    } catch (error) {
      toast.error("An error occurred.");
      console.error(error);
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("purchaseDetailColumnOrder", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
  }, [fetchPurchases, fetchSuppliers]);

  const filteredPurchases = purchases.filter(p =>
    (p.purchaseId?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
        className="py-3 px-4 font-semibold cursor-grab text-center"
      >
        {column.label}
      </th>
    );
  };

  return (
    <AdminLayout title="Purchase > Purchase Detail">
      <div className="p-6">
        {/* Header & Search Section */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 w-[350px]">
            <Input
              type="text"
              placeholder="Search by Purchase ID or Supplier"
              className="rounded-full bg-[#fff7f6] border border-[#f3cdc8] text-gray-700 placeholder-gray-400 focus:ring-0 focus:border-[#e48a7c]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="bg-[#e48a7c] text-white hover:bg-[#d77b6f] rounded-full"
            >
              <Search size={18} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-[#e48a7c] text-[#e48a7c] hover:bg-[#fff4f2]"
              onClick={() => setDateFilterOpen(true)}
            >
              <Calendar size={18} />
            </Button>
          </div>
          <Button
            className="bg-[#e48a7c] hover:bg-[#d77b6f] text-white rounded-full px-6"
            onClick={() => setShowModal(true)}
          >
            + Add Purchase
          </Button>
        </div>

        {/* Table */}
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
              case "purchaseId": return <td className="py-3 px-4">{item.purchaseId}</td>;
              case "supplier": return <td className="py-3 px-4">{item.supplier?.name || item.supplierName || 'N/A'}</td>;
              case "date": return <td className="py-3 px-4">{format(new Date(item.date), "dd-MMM-yyyy")}</td>;
              case "amount": return <td className="py-3 px-4">₹{item.totalAmount?.toLocaleString('en-IN') || 0}</td>;
              case "payment": return <td className="py-3 px-4">{item.paymentMethod}</td>;
              case "status": return <td className={`py-3 px-4 font-semibold ${item.status === 'PAID' ? 'text-green-600' : 'text-red-600'}`}>{item.status}</td>;
              case "actions":
                return (
                  <td className="py-3 px-4 flex items-center justify-center gap-2">
                    <button onClick={() => handleViewClick(item)} className="w-8 h-8 flex items-center justify-center border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors" title="View Details">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleReturnClick(item)} className="w-8 h-8 flex items-center justify-center border border-orange-500 text-orange-500 rounded-full hover:bg-orange-50 transition-colors" title="Return Purchase">
                      <Undo2 size={16} />
                    </button>
                    <button onClick={() => handleEditClick(item)} className="w-8 h-8 flex items-center justify-center border border-gray-400 text-gray-600 rounded-full hover:bg-gray-100 transition-colors" title="Edit Purchase">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(item._id)} className="w-8 h-8 flex items-center justify-center border border-red-400 text-red-500 rounded-full hover:bg-red-50 transition-colors" title="Delete Purchase">
                      <Trash2 size={16} />
                    </button>
                  </td>
                );
              default: return null;
            }
          };

          return (
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm text-gray-700">
                <thead className="bg-[#fff7f6] border-b border-gray-200 text-gray-700">
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                      <tr className="text-left">
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
                      <td colSpan={columns.length} className="text-center py-10">Loading purchase details...</td>
                    </tr>
                  ) : filteredPurchases.length > 0 ? (
                    filteredPurchases.map((item) => (
                      <tr
                        key={item._id}
                        className="border-b hover:bg-[#fff7f6] transition-colors"
                      >
                        {columns.map((col) => renderCell(item, col.id))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-10">No purchase details found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* Pagination */}
        <div className="flex justify-center items-center mt-6 gap-2 text-sm">
          <button className="px-3 py-1 text-gray-500 hover:text-[#e48a7c]">
            &lt;
          </button>
          <button className="px-3 py-1 bg-[#e48a7c] text-white rounded-full">
            1
          </button>
          <button className="px-3 py-1 text-gray-700 hover:text-[#e48a7c]">
            2
          </button>
          <button className="px-3 py-1 text-gray-700">3</button>
          <span className="text-gray-500">...</span>
          <button className="px-3 py-1 text-gray-700">56</button>
          <button className="px-3 py-1 text-gray-500 hover:text-[#e48a7c]">
            &gt;
          </button>
        </div>
      </div>

      {/* Add/Edit Purchase Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingPurchase ? "Edit Purchase" : "Add New Purchase"}</h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-800">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Supplier <span className="text-red-500">*</span></label>
                <Select value={newPurchase.supplier} onValueChange={(value) => handleSelectChange("supplier", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier._id} value={supplier._id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date <span className="text-red-500">*</span></label>
                <Input type="date" name="date" value={newPurchase.date} onChange={handleInputChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Total Amount <span className="text-red-500">*</span></label>
                <Input type="number" name="totalAmount" placeholder="e.g., 15000" value={newPurchase.totalAmount} onChange={handleInputChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={newPurchase.paymentMethod} onValueChange={(value) => handleSelectChange("paymentMethod", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={newPurchase.status} onValueChange={(value) => handleSelectChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleFormSubmit} disabled={formLoading} className="w-full bg-[#e48a7c] hover:bg-[#d77b6f] text-white">
                {formLoading ? "Saving..." : (editingPurchase ? "Update Purchase" : "Add Purchase")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Purchase Modal */}
      {showViewModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => setShowViewModal(false)}>
          <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-2xl animate-fade-in-down overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-[#E98C81] p-6 relative">
              <button onClick={() => setShowViewModal(false)} className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors">
                <span className="text-2xl">&times;</span>
              </button>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 font-bold">Purchase ID: {selectedPurchase.purchaseId}</p>
                  <h2 className="text-2xl font-bold text-white">{selectedPurchase.supplierName}</h2>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${selectedPurchase.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {selectedPurchase.status}
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-gray-500 mb-1">Purchase Date</p>
                  <p className="font-semibold text-gray-800">{format(new Date(selectedPurchase.date), "dd MMMM, yyyy")}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-gray-500 mb-1">Total Amount</p>
                  <p className="font-semibold text-gray-800">₹{selectedPurchase.totalAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-gray-500 mb-1">Payment Method</p>
                  <p className="font-semibold text-gray-800">{selectedPurchase.paymentMethod}</p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Items in this Purchase</h3>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  {selectedPurchase.items && selectedPurchase.items.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="text-left text-gray-500">
                        <tr>
                          <th className="pb-2 font-normal">S.No.</th>
                          <th className="pb-2 font-normal">Product Name</th>
                          <th className="pb-2 font-normal text-center">Qty</th>
                          <th className="pb-2 font-normal text-right">Rate</th>
                          <th className="pb-2 font-normal text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPurchase.items.map((item: any, index: number) => (
                          <tr key={item._id || index} className="border-t">
                            <td className="py-2">{index + 1}</td>
                            <td className="py-2">{item.product?.productName || 'N/A'}</td>
                            <td className="py-2 text-center">{item.qty}</td>
                            <td className="py-2 text-right">₹{item.rate?.toLocaleString('en-IN')}</td>
                            <td className="py-2 text-right">₹{item.amount?.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No items were recorded for this purchase.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Purchase Modal */}
      {showReturnModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Return Purchase</h3>
              <button onClick={() => { setShowReturnModal(false); setSelectedPurchase(null); }} className="text-gray-500 hover:text-gray-800">&times;</button>
            </div>
            <div className="space-y-4">
              <p>Are you sure you want to process a return for this purchase?</p>
              <p><strong>Purchase ID:</strong> {selectedPurchase.purchaseId}</p>
              <p><strong>Supplier:</strong> {selectedPurchase.supplier?.name || selectedPurchase.supplierName}</p>
              <p><strong>Amount:</strong> ₹{selectedPurchase.totalAmount?.toLocaleString('en-IN') || 0}</p>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Reason for Return</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[#e48a7c] focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="Enter reason for return..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-4 mt-4">
                <Button variant="outline" onClick={() => { setShowReturnModal(false); setSelectedPurchase(null); }}>
                  Cancel
                </Button>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleConfirmReturn} disabled={returnLoading}>
                  {returnLoading ? "Processing..." : "Confirm Return"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Filter Dialog */}
      <Dialog open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Purchases by Date</DialogTitle>
            <DialogDescription>
              Select a start and end date to view purchases within that range.
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
            <Button variant="outline" onClick={() => setDateFilterOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-[#E98C81] hover:bg-[#f48c83]"
              onClick={handleDateRangeSearch}
            >
              Apply Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
