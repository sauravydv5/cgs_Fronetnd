import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Edit2, Trash2, Mail, Phone, MapPin, Building, ShoppingCart, Undo2, Eye } from "lucide-react";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addSupplier, getAllSuppliers, updateSupplier, deleteSupplier, getSuppliersByDateRange } from "@/adminApi/supplierApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function PurchasersDetail() {
  const [suppliers, setSuppliers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const initialColumns = [
  { id: "supplierId", label: "SUPPLIER ID" },
  { id: "supplierName", label: "SUPPLIER NAME" },
  { id: "companyName", label: "COMPANY" },
  { id: "mobileNumber", label: "CONTACT" },
  { id: "purchases", label: "PURCHASES" },
  { id: "returns", label: "RETURNS" },
  { id: "actions", label: "ACTIONS" },
];


  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof newSupplier, string>>>({});
  const [newSupplier, setNewSupplier] = useState({
    supplierName: "",
    mobileNumber: "",
    email: "",
    companyName: "",
    city: "",
    state: "",
    address: "",
    gstHolder: "No",
    purchases: "",
    returns: "",
  });
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  const todayObj = new Date();
  const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("purchasersDetailColumnOrder");
    return savedOrder ? JSON.parse(savedOrder) : initialColumns;
  });

  const fetchSuppliers = async () => {
    try {
      const response = await getAllSuppliers();
      if (response.status || response.success) {
        setSuppliers(response.data || response.suppliers || []);
      }
    } catch (error) {
      toast.error("Failed to fetch suppliers.");
    }
  };

  useEffect(() => {
    localStorage.setItem("purchasersDetailColumnOrder", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "mobileNumber") {
      // Allow only digits and limit the length to 10
      const numericValue = value.replace(/\D/g, ""); // Remove non-digit characters
      const truncatedValue = numericValue.slice(0, 10); // Limit to 10 digits

      setNewSupplier((prev) => ({ ...prev, [name]: truncatedValue }));

      // Update validation message based on the length of the number
      if (truncatedValue.length > 0 && truncatedValue.length < 10) {
        setFormErrors((prev) => ({ ...prev, mobileNumber: "Phone number must be 10 digits." }));
      } else {
        setFormErrors((prev) => ({ ...prev, mobileNumber: undefined }));
      }
    } else {
      // For all other fields
      setNewSupplier((prev) => ({ ...prev, [name]: value }));
      // Clear error when user types
      if (formErrors[name as keyof typeof newSupplier]) {
        setFormErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewSupplier((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setNewSupplier({ supplierName: "", mobileNumber: "", email: "", companyName: "", city: "", state: "", address: "", gstHolder: "No", purchases: "", returns: "" });
    setFormErrors({});
    setShowModal(false);
    setEditingSupplier(null);
    setLoading(false);
  };

  const handleViewSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setShowViewModal(true);
  };

  const handleEditClick = (supplier) => {
    setEditingSupplier(supplier);
    setNewSupplier({
      supplierName: supplier.name || "",
      mobileNumber: supplier.mobileNumber || "",
      email: supplier.email || "",
      companyName: supplier.companyName || "",
      city: supplier.city || "",
      state: supplier.state || "",
      address: supplier.address || "",
      gstHolder: supplier.gstHolder || "No",
      purchases: supplier.purchases?.toString() || "0",
      returns: supplier.returns?.toString() || "0",
    });
    setShowModal(true);
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!supplierId) {
      toast.error("Invalid Supplier ID");
      return;
    }
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      try {
        const response = await deleteSupplier(supplierId);
        if (response.status || response.success) {
          toast.success(response.message || "Supplier deleted successfully!");
          fetchSuppliers(); // Refresh the list
        } else {
          toast.error(response.message || "Failed to delete supplier.");
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message ||
          "An error occurred while deleting the supplier.";
        toast.error(errorMessage);
      }
    }
  };

  const SortableHeader = ({ column }) => {
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
        className="py-3 px-4 cursor-grab"
      >
        {column.label}
      </th>
    );
  };

  const handleFormSubmit = async () => {
    const errors: Partial<Record<keyof typeof newSupplier, string>> = {};

    // Phone number specific validation
    if (newSupplier.mobileNumber && !/^\d{10}$/.test(newSupplier.mobileNumber)) {
      errors.mobileNumber = "Phone number must be 10 digits.";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the errors.");
      return;
    }

    setLoading(true);
    try {
      // Prepare payload, ensuring numbers are correctly formatted
      const payload = {
        name: newSupplier.supplierName,
        mobileNumber: newSupplier.mobileNumber,
        email: newSupplier.email,
        companyName: newSupplier.companyName,
        city: newSupplier.city,
        state: newSupplier.state,
        address: newSupplier.address,
        gstHolder: newSupplier.gstHolder,
        purchases: Number(newSupplier.purchases) || 0,
        returns: Number(newSupplier.returns) || 0,
      };

      let response;
      if (editingSupplier) {
        // Update existing supplier
        const id = editingSupplier._id || editingSupplier.id;
        response = await updateSupplier(id, payload);
      } else {
        // Add new supplier
        response = await addSupplier(payload);
      }

      if (response.status || response.success) {
        toast.success(response.message || `Supplier ${editingSupplier ? 'updated' : 'added'} successfully!`);
        fetchSuppliers();
        resetForm();
      } else {
        toast.error(response.message || `Failed to ${editingSupplier ? 'update' : 'add'} supplier.`);
      }

    } catch (error) {
      // This will catch network errors and also API errors that throw an exception
      const errorMessage =
        error.response?.data?.message ||
        "An error occurred while adding the supplier.";
      toast.error(errorMessage);
      console.error("Add supplier error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeSearch = async () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error("Please select both start and end dates");
      return;
    }

    setLoading(true);
    try {
      const response = await getSuppliersByDateRange(dateRange.start, dateRange.end);
      if (response.status || response.success) {
        setSuppliers(response.data || response.suppliers || []);
        setDateFilterOpen(false);
        toast.success("Suppliers filtered by date range");
      } else {
        toast.error(response.message || "Failed to fetch suppliers");
      }
    } catch (error: any) {
      console.error("Failed to fetch suppliers by date:", error);
      toast.error(error.response?.data?.message || "Failed to fetch suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilter = () => {
    setDateRange({ start: "", end: "" });
    setDateFilterOpen(false);
    fetchSuppliers();
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      (supplier.name && supplier.name.toLowerCase().includes(query)) ||
      (supplier.supplierId && supplier.supplierId.toLowerCase().includes(query)) ||
      (supplier.companyName && supplier.companyName.toLowerCase().includes(query))
    );
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredSuppliers.length);
  const currentSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  return (
    <AdminLayout title="Purchasers Detail">
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        {/* Search + Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search by ID, Supplier Name, Company"
              className="w-80 h-10 rounded-full bg-[#FEEEE5] border-none"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Button className="rounded-full px-3 py-2 bg-[#E98C81] hover:bg-[#d97a71]">
              <Search size={18} className="text-white" />
            </Button>
            <Button
              variant="outline"
              className="rounded-full px-3 py-2 border-gray-300 hover:bg-gray-100"
              onClick={() => setDateFilterOpen(true)}
            >
              <Calendar size={18} className="text-gray-600" />
            </Button>
          </div>

          <Button
            className="rounded-full bg-[#E98C81] text-white hover:bg-[#d97a71] px-6"
            onClick={() => {
              setEditingSupplier(null);
              setNewSupplier({
                supplierName: "",
                mobileNumber: "",
                email: "",
                companyName: "",
                city: "",
                state: "",
                address: "",
                gstHolder: "No",
                purchases: "",
                returns: "",
              });
              setShowModal(true);
            }}
          >
            Add Suppliers
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

          const renderCell = (row, columnId) => {
  switch (columnId) {
    case "supplierId":
      return <td className="py-3 px-4">{row.supplierId}</td>;

    case "supplierName":
      return <td className="py-3 px-4">{row.name}</td>;

    case "companyName":
      return <td className="py-3 px-4">{row.companyName}</td>;

    case "mobileNumber":
      return <td className="py-3 px-4">{row.mobileNumber}</td>;

    case "purchases":
      return <td className="py-3 px-4">{row.purchases}</td>;

    case "returns":
      return <td className="py-3 px-4">{row.returns}</td>;

    case "actions":
      return (
        <td className="py-3 px-4 flex items-center justify-center gap-3">
          <button
            onClick={() => handleViewSupplier(row)}
            className="w-8 h-8 flex items-center justify-center border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50"
          >
            <Eye size={16} />
          </button>

          <button
            onClick={() => handleEditClick(row)}
            className="w-8 h-8 flex items-center justify-center border border-gray-400 text-gray-600 rounded-full hover:bg-gray-100"
          >
            <Edit2 size={16} />
          </button>

          <button
            onClick={() => handleDeleteSupplier(row._id || row.id)}
            className="w-8 h-8 flex items-center justify-center border border-red-400 text-red-500 rounded-full hover:bg-red-50"
          >
            <Trash2 size={16} />
          </button>
        </td>
      );

    default:
      return null;
  }
};


          return (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm text-center">
                <thead className="bg-[#fafafa] border-b">
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                      <tr className="text-gray-700 font-semibold">
                        {columns.map((column) => (
                          <SortableHeader key={column.id} column={column} />
                        ))}
                      </tr>
                    </SortableContext>
                  </DndContext>
                </thead>
                <tbody>
                  {currentSuppliers.length > 0 ? (
                    currentSuppliers.map((row) => (
                      <tr key={row._id} className="border-b hover:bg-[#fff6f5] transition-colors">
                        {columns.map((col) => renderCell(row, col.id))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-10">No suppliers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}

        {filteredSuppliers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t bg-gray-50 gap-3 rounded-b-lg mt-4">
            <div className="text-xs sm:text-sm text-gray-600">
              Showing {startIndex + 1} to {endIndex} of {filteredSuppliers.length} entries
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
                  className={`h-8 w-8 p-0 text-xs ${currentPage === i + 1 ? "bg-[#E98C81] hover:bg-[#d97a71] text-white border-[#E98C81]" : ""}`}
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
      </div>

      {/*RIGHT SIDE MODAL*/}
{/*RIGHT SIDE MODAL*/}
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-end z-50">

    <div className="w-[350px] h-full bg-white border-l-[3px] border-[#e5e5e5] shadow-xl overflow-y-auto">

      <div className="p-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{editingSupplier ? "Edit Supplier" : "Add Supplier"}</h2>
          <button onClick={resetForm}>
            <span className="text-xl font-bold">&times;</span>
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Name</label>
            <Input name="supplierName" value={newSupplier.supplierName} onChange={handleInputChange} placeholder="Name" className="h-9" />
            {formErrors.supplierName && <span className="text-red-500 text-xs ml-1">{formErrors.supplierName}</span>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Mobile Number</label>
            <Input name="mobileNumber" value={newSupplier.mobileNumber} onChange={handleInputChange} placeholder="Mobile Number"  />
            {formErrors.mobileNumber && <span className="text-red-500 text-xs ml-1">{formErrors.mobileNumber}</span>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Email</label>
            <Input name="email" value={newSupplier.email} onChange={handleInputChange} placeholder="Email" className="h-9" />
            {formErrors.email && <span className="text-red-500 text-xs ml-1">{formErrors.email}</span>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Company Name</label>
            <Input name="companyName" value={newSupplier.companyName} onChange={handleInputChange} placeholder="Company Name" className="h-9" />
            {formErrors.companyName && <span className="text-red-500 text-xs ml-1">{formErrors.companyName}</span>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">City</label>
            <Input name="city" value={newSupplier.city} onChange={handleInputChange} placeholder="City" className="h-9" />
            {formErrors.city && <span className="text-red-500 text-xs ml-1">{formErrors.city}</span>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">State</label>
            <Input name="state" value={newSupplier.state} onChange={handleInputChange} placeholder="State" className="h-9" />
            {formErrors.state && <span className="text-red-500 text-xs ml-1">{formErrors.state}</span>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Complete Address</label>
            <Input name="address" value={newSupplier.address} onChange={handleInputChange} placeholder="Complete Address" className="h-9" />
            {formErrors.address && <span className="text-red-500 text-xs ml-1">{formErrors.address}</span>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">GST Holder</label>
            <Select value={newSupplier.gstHolder} onValueChange={(value) => handleSelectChange("gstHolder", value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Is GST Holder?" />
              </SelectTrigger>
              <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Purchases</label>
            <Input name="purchases" type="number" min="0" value={newSupplier.purchases} onChange={handleInputChange} placeholder="Purchases" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Returns</label>
            <Input name="returns" type="number" min="0" value={newSupplier.returns} onChange={handleInputChange} placeholder="Returns" className="h-9" />
          </div>
        </div>

        {/* Add Button */}
        <Button onClick={handleFormSubmit} disabled={loading} className="w-full mt-5 bg-black text-white hover:bg-gray-900 rounded-md h-9">
          {loading ? (editingSupplier ? "Updating..." : "Adding...") : (editingSupplier ? "Update Supplier" : "Add Supplier")}
        </Button>
      </div>

    </div>
  </div>
)}

{/* VIEW SUPPLIER MODAL */}
{showViewModal && selectedSupplier && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => setShowViewModal(false)}>
    <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-down overflow-hidden" onClick={(e) => e.stopPropagation()}>
      {/* Profile Header */}
      <div className="bg-[#E98C81] p-6 relative">
        <button onClick={() => setShowViewModal(false)} className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors">
          <span className="text-2xl">&times;</span>
        </button>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {selectedSupplier.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{selectedSupplier.name}</h2>
            <p className="text-sm text-white/80 font-bold">Supplier ID: {selectedSupplier.supplierId}</p>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="p-6 space-y-5">
        {/* Contact Info */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3">Contact Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3"><Phone size={14} className="text-gray-400"/> <span className="text-gray-600">{selectedSupplier.mobileNumber}</span></div>
            <div className="flex items-center gap-3"><Mail size={14} className="text-gray-400"/> <span className="text-gray-600">{selectedSupplier.email}</span></div>
            <div className="flex items-center gap-3"><Building size={14} className="text-gray-400"/> <span className="text-gray-600">{selectedSupplier.companyName}</span></div>
            <div className="flex items-center gap-3"><MapPin size={14} className="text-gray-400"/> <span className="text-gray-600">{`${selectedSupplier.address}, ${selectedSupplier.city}, ${selectedSupplier.state}`}</span></div>
          </div>
        </div>

        {/* Purchase Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-4">
            <div className="bg-green-100 p-2 rounded-full"><ShoppingCart size={20} className="text-green-600"/></div>
            <div>
              <p className="text-xs text-gray-500">Purchases</p>
              <p className="text-lg font-bold text-gray-800">{selectedSupplier.purchases}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-4">
            <div className="bg-red-100 p-2 rounded-full"><Undo2 size={20} className="text-red-600"/></div>
            <div>
              <p className="text-xs text-gray-500">Returns</p>
              <p className="text-lg font-bold text-gray-800">{selectedSupplier.returns}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Date Range Filter Dialog */}
      <Dialog open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Suppliers by Date</DialogTitle>
            <DialogDescription>
              Select a start and end date to view suppliers within that range.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.start}
                max={today}
                onChange={(e) => {
                  const val = e.target.value;
                  setDateRange({ ...dateRange, start: val, end: dateRange.end && val > dateRange.end ? "" : dateRange.end });
                }}
                onKeyDown={(e) => e.preventDefault()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.end}
                min={dateRange.start}
                max={today}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                onKeyDown={(e) => e.preventDefault()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClearFilter}>
              Clear Filter
            </Button>
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
