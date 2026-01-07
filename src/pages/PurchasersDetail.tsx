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
  const initialColumns = [
    { id: "contact", label: "CONTACT" },
    { id: "supplierId", label: "SUPPLIER ID" },
    { id: "name", label: "SUPPLIER NAME" },
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
        setFormErrors((prev) => ({ ...prev, mobile: "Phone number must be 10 digits." }));
      } else {
        setFormErrors((prev) => ({ ...prev, mobile: undefined }));
      }
    } else {
      // For all other fields
      setNewSupplier((prev) => ({ ...prev, [name]: value }));
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
    const requiredFields: (keyof typeof newSupplier)[] = [
      "supplierName",
      "mobileNumber",
      "email",
      "companyName",
      "city",
      "state",
      "address",
    ];

    requiredFields.forEach(field => {
      if (!newSupplier[field]) {
        errors[field] = "This field is required.";
      }
    });

    // Phone number specific validation
    if (newSupplier.mobileNumber && !/^\d{10}$/.test(newSupplier.mobileNumber)) {
      errors.mobileNumber = "Phone number must be 10 digits.";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Please fill all the required fields.");
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

  const filteredSuppliers = suppliers.filter(supplier => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      (supplier.name && supplier.name.toLowerCase().includes(query)) ||
      (supplier.supplierId && supplier.supplierId.toLowerCase().includes(query)) ||
      (supplier.companyName && supplier.companyName.toLowerCase().includes(query))
    );
  });

  return (
    <AdminLayout title="Purchasers Detail">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        {/* Search + Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search by ID, Supplier Name, Company"
              className="w-80 h-10 rounded-full border border-gray-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button className="rounded-full px-3 py-2 bg-[#ff8573] hover:bg-[#e47a69]">
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
            className="rounded-full bg-[#ff8573] text-white hover:bg-[#e47a69] px-6"
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
                return <td className="py-3 px-4">{row.name || row.supplierName}</td>;
              case "company":
                return <td className="py-3 px-4">{row.companyName}</td>;
              case "name":
                return <td className="py-3 px-4">{row.name}</td>;
              case "contact":
                return <td className="py-3 px-4">{row.mobileNumber}</td>;
              case "purchases":
                return <td className="py-3 px-4">{row.purchases}</td>;
              case "returns":
                return <td className="py-3 px-4">{row.returns}</td>;
              case "actions":
                return (
                  <td className="py-3 px-4 flex items-center justify-center gap-3">
                    <button onClick={() => handleViewSupplier(row)} className="w-8 h-8 flex items-center justify-center border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors" title="View Details">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleEditClick(row)} className="w-8 h-8 flex items-center justify-center border border-gray-400 text-gray-600 rounded-full hover:bg-gray-100 transition-colors" title="Edit Supplier"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteSupplier(row._id || row.id)} className="w-8 h-8 flex items-center justify-center border border-red-400 text-red-500 rounded-full hover:bg-red-50 transition-colors" title="Delete Supplier"><Trash2 size={16} /></button>
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
                  {filteredSuppliers.map((row) => (
                    <tr key={row._id} className="border-b hover:bg-[#fff6f5] transition-colors">
                      {columns.map((col) => renderCell(row, col.id))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* Pagination */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <button className="px-2 py-1 text-sm text-gray-500 hover:text-gray-800" disabled>
            &lt;
          </button>
          <button className="px-3 py-1 rounded-full bg-[#ff8573] text-white text-sm">
            1
          </button>
          <button className="px-3 py-1 text-sm text-gray-600 hover:text-[#ff8573]" disabled>
            2
          </button>
          <button className="px-3 py-1 text-sm text-gray-600 hover:text-[#ff8573]">
            3
          </button>
          <span className="text-sm text-gray-400">...</span>
          <button className="px-3 py-1 text-sm text-gray-600 hover:text-[#ff8573]">
            56
          </button>
          <button className="px-2 py-1 text-sm text-gray-500 hover:text-gray-800">
            &gt;
          </button>
        </div>
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
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Name<span className="text-red-500">*</span></label>
            <Input name="supplierName" value={newSupplier.supplierName} onChange={handleInputChange} placeholder="Name" className="h-9" />
            
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Mobile Number<span className="text-red-500">*</span></label>
            <Input name="mobileNumber" value={newSupplier.mobileNumber} onChange={handleInputChange} placeholder="Mobile Number"  />
            
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Email<span className="text-red-500">*</span></label>
            <Input name="email" value={newSupplier.email} onChange={handleInputChange} placeholder="Email" className="h-9" />
            
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Company Name<span className="text-red-500">*</span></label>
            <Input name="companyName" value={newSupplier.companyName} onChange={handleInputChange} placeholder="Company Name" className="h-9" />
            
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">City<span className="text-red-500">*</span></label>
            <Input name="city" value={newSupplier.city} onChange={handleInputChange} placeholder="City" className="h-9" />
            
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">State<span className="text-red-500">*</span></label>
            <Input name="state" value={newSupplier.state} onChange={handleInputChange} placeholder="State" className="h-9" />
            
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Complete Address<span className="text-red-500">*</span></label>
            <Input name="address" value={newSupplier.address} onChange={handleInputChange} placeholder="Complete Address" className="h-9" />
            
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
            <Input name="purchases" type="number" value={newSupplier.purchases} onChange={handleInputChange} placeholder="Purchases" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 ml-1 mb-1 block">Returns</label>
            <Input name="returns" type="number" value={newSupplier.returns} onChange={handleInputChange} placeholder="Returns" className="h-9" />
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
