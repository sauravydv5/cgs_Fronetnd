"use client";
import { AdminLayout } from "@/components/AdminLayout";
import adminInstance from "@/adminApi/adminInstance";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Edit, Trash2, Barcode } from "lucide-react";
import React, { useState, useEffect } from "react"; // React is imported here
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { addNewBill, getBillsByCustomerId, generateBill, updateBillPaymentStatus } from '@/adminApi/billApi'; // Assuming the api is in billApi
import { getAllProducts } from "@/adminApi/productApi";
import { toast } from "sonner";

const updateBill = async ({ id, data }: { id: string; data: any }) => {
  return await adminInstance.put(`/bills/update/${id}`, data);
};

const deleteBill = async (id: string) => {
  return await adminInstance.delete(`/bills/delete/${id}`);
};

export default function NewBill() {
  const [openPreview, setOpenPreview] = useState(false);
  const [openProductDetail, setOpenProductDetail] = useState(false);
  const [openAddProductModal, setOpenAddProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchParams] = useSearchParams();
  const [customerInfo, setCustomerInfo] = useState({ name: "", code: "" });
  const location = useLocation();
  const customerId = searchParams.get("customerId");
  const [products, setProducts] = useState<any[]>([]);
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBillItems, setNewBillItems] = useState<any[]>([]);
  const [generatedBillHtml, setGeneratedBillHtml] = useState<string | null>(null);
  const [showGeneratedBill, setShowGeneratedBill] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [statusConfirmationOpen, setStatusConfirmationOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ billId: string; status: string } | null>(null);

  const initialColumns = [
    { id: "sno", label: "SNO." },
    { id: "adItemCode", label: "Ad. item code" },
    { id: "itemCode", label: "ITEM CODE" },
    { id: "itemName", label: "ITEM NAME" },
    { id: "companyName", label: "COMPANY NAME" },
    { id: "hsnCode", label: "HSN CODE" },
    { id: "packing", label: "PACKING" },
    { id: "lot", label: "LOT" },
    { id: "mrp", label: "MRP" },
    { id: "qty", label: "QTY" },
    { id: "cd", label: "C.D" },
    { id: "netAmount", label: "NET AMOUNT" },
    { id: "tax", label: "TAX" },
    { id: "paymentStatus", label: "PAYMENT STATUS" },
    { id: "actions", label: "ACTIONS" },
  ];

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("billDetailsTableColumnOrder_v2");
    return savedOrder ? JSON.parse(savedOrder) : initialColumns;
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getAllProducts();
        if (
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data.rows)
        ) {
          setProducts(response.data.data.rows);
        } else {
          console.error("Invalid product data structure:", response.data);
          toast.error("Could not load product list.");
        }
      } catch (error) {
        toast.error("Failed to fetch products.");
      }
    };
    fetchProducts();
    // If we are creating a new bill, open the modal and prepare an empty row.
    if (location.state?.customerName) {
      setCustomerInfo({
        name: location.state.customerName,
        code: location.state.customerCode || "",
      });
    }

    // If there's no customerId, don't attempt to fetch.
    if (!customerId) {
      setLoading(false);
      return;
    }

    const fetchBills = async () => {
      if (!customerId) {
        toast.error("No Customer ID provided.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Clear previous data to prevent showing stale bills from another customer
        setRows([]);
        setCustomerInfo({ 
          name: location.state?.customerName || "", 
          code: location.state?.customerCode || "" 
        });

        const response = await getBillsByCustomerId(customerId);
        // The API returns an array of bills for a customer, we'll take the first one.
        if (
          response &&
          response.success &&
          Array.isArray(response.bills) &&
          response.bills.length > 0
        ) {
          const firstBill = response.bills[0];
          const customerName = firstBill.customerName || firstBill.customerId?.name;
          const customerCode = firstBill.customerCode || firstBill.customerId?.customerCode;

          if (customerName) {
            setCustomerInfo({
              name: customerName,
              code: customerCode || "",
            });
          }

          // Flatten items from ALL bills, not just the first one
          const allItems = response.bills.flatMap((bill: any) =>
            bill.items.map((item: any, idx: number) => ({
              ...bill,
              ...item,
              billId: bill._id,
              uniqueId: item._id || `${bill._id}-${idx}`,
            }))
          );

          const flattenedRows = allItems.map((item: any, index: number) => {
            const sno = index + 1;
            return {
              ...item,
              id: item.uniqueId,
              adItemCode: `AD${String(sno).padStart(4, "0")}`,
              sno: `${String(sno).padStart(2, "0")}.`,
              lot: item.batch || "N/A", // Ensure N/A for blank batch
              cd: item.discountPercent, // Map discountPercent to cd for consistency
              netAmount: item.total, // Map total to netAmount
              tax: item.gstPercent, // Map gstPercent to tax
            };
          });
          setRows(flattenedRows);
        } else {
          toast.error(response.message || "Bill not found.");
        }
      } catch (error: any) {
        console.error("Failed to fetch bills:", error);
        const errorMessage =
          error.response?.data?.message || "Could not fetch bills.";
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, [customerId, location.state]);
  useEffect(() => {
    localStorage.setItem(
      "billDetailsTableColumnOrder_v2",
      JSON.stringify(columns)
    );
  }, [columns]);

  const SortableHeader = ({
    column,
  }: {
    column: { id: string; label: string };
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
        className="py-3 px-4 whitespace-nowrap cursor-grab"
      >
        {column.label}
      </th>
    );
  };

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

  const handleRemoveRow = (idToRemove: string) => {
    setRows((prevRows) => prevRows.filter((row) => row.id !== idToRemove));
  };

  const handleSaveBill = async () => {
    if (!customerId) {
      toast.error("Customer ID is missing.");
      return;
    }

    const billItems = newBillItems
      .map((row) => ({
        productId: row.productId,
        itemCode: row.itemCode,
        itemName: row.itemName,
        companyName: row.companyName,
        hsnCode: row.hsnCode,
        packing: row.packing,
        batch: row.lot === "N/A" ? "" : row.lot, // Map lot back to batch
        qty: Number(row.qty) || 0,
        rate: Number(row.mrp) || 0,
        mrp: Number(row.mrp) || 0,
        discountPercent: Number(row.cd) || 0,
        gstPercent: Number(row.tax) || 0,
        // The backend should calculate other fields like taxableAmount, gst, total etc.
      }))
      .filter((item) => item.itemCode && item.qty > 0);

    if (billItems.length === 0) {
      toast.error("Please add at least one product with a quantity.");
      return;
    }

    let currentBillNo;
    if (editingBillId) {
      const existingBill = rows.find((r) => r.billId === editingBillId);
      if (existingBill) {
        currentBillNo = existingBill.billNo;
      }
    }

    // We include customerId here so the bill is linked to the correct customer
    const payload = {
      customerId,
      billNo: currentBillNo,
      items: billItems,
      paymentMode: "Cash", // Or get this from a form field
      notes: "Bill created from admin panel.",
    };

    console.log("Saving Bill Payload (Check for customerId):", payload);

    setIsSaving(true);
    try {
      if (editingBillId) {
        await updateBill({ id: editingBillId, data: payload });
        toast.success("Bill updated successfully!");
      } else {
        await addNewBill(payload);
        toast.success("Bill saved successfully!");
      }
      setOpenAddProductModal(false);
      setOpenPreview(false);
      setEditingBillId(null);
      navigate(0); // Refresh the page to show updated data
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to save the bill. Please try again.";
      toast.error(errorMessage);
      console.error("Error saving bill:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewBillForCustomer = () => {
    if (!customerId) {
      // If there's no customer context, go to the customer list to select one.
      toast.info("Please select a customer to create a new bill.");
      navigate("/bills/customers");
      return;
    }
    // If there is a customer, open the modal to add a new bill for them.
    setEditingBillId(null);
    setNewBillItems([{ id: `new-item-${Date.now()}`, sno: "01." }]); // Start with one fresh row for the new bill
    setOpenAddProductModal(true);
  };

  const handleGenerateBill = async () => {
    if (!customerId) {
      toast.error("Customer ID is missing.");
      return;
    }
    try {
      const response = await generateBill(customerId);
      // The API returns a base64 data URL in the 'url' field
      const billDataUrl = response.url;

      if (response.success && billDataUrl) {
        toast.success("Bill generated successfully!");

        // Decode base64 to HTML string for srcDoc (allows printing)
        const base64Part = billDataUrl.split(',')[1];
        const binaryString = window.atob(base64Part);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decodedHtml = new TextDecoder().decode(bytes);

        setGeneratedBillHtml(decodedHtml);
        setShowGeneratedBill(true);
      } else {
        toast.error(response.message || "Bill generated but no viewable file was returned.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to generate bill. Please try again.");
      console.error("Error generating bill:", error);
    }
  };

  const handleEditBill = (row: any) => {
    const billId = row.billId;
    // Filter all rows that belong to this bill to populate the modal
    const billItems = rows.filter((r) => r.billId === billId);

    const formattedItems = billItems.map((item, index) => ({
      ...item,
      id: item.uniqueId || `edit-item-${index}`,
      sno: `${String(index + 1).padStart(2, "0")}.`,
      // Ensure fields map correctly for the modal inputs
      mrp: item.rate || item.mrp,
      cd: item.discountPercent || item.cd,
      // Ensure productId is present
      productId: typeof item.productId === 'object' ? item.productId?._id : item.productId,
      // Ensure other fields are present
      itemCode: item.itemCode,
      itemName: item.itemName,
      companyName: item.companyName,
      hsnCode: item.hsnCode,
      packing: item.packing,
      lot: item.lot,
      qty: item.qty,
      tax: item.tax,
      netAmount: item.netAmount
    }));

    setEditingBillId(billId);
    setNewBillItems(formattedItems);
    setOpenAddProductModal(true);
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    await deleteBill(billId);
    navigate(0);
  };

  const handleNewBillProductSelect = (product: any, rowIndex: number) => {
    setNewBillItems((prev) => {
      const updated = [...prev];

      const row = updated[rowIndex];

      // 🔴 VERY IMPORTANT: product ka real Mongo ID
      const productId = product._id;

      const mrp = Number(product.mrp) || 0;
      const qty = Number(row.qty) || 1;
      const cd = Number(product.discount) || 0;
      const netAmount = (mrp * qty) - ((mrp * qty * cd) / 100);

      updated[rowIndex] = {
        ...row,

        // 🔑 THIS IS THE FIX
        productId: productId,

        // UI fields
        itemCode: product.itemCode,
        itemName: product.productName,
        companyName: product.brandName,
        hsnCode: product.hsnCode,
        packing: product.packSize,
        mrp: mrp,
        rate: mrp,
        tax: product.gst || 0, // Map product GST to tax field

        // defaults
        qty: qty,
        cd: cd,
        netAmount: netAmount.toFixed(2),
      };

      return updated;
    });
  };

  const handleNewBillItemChange = (
    index: number,
    field: string,
    value: string
  ) => {
    setNewBillItems((currentRows) => {
      const newRows = [...currentRows];
      const updatedRow = {
        ...newRows[index],
        [field]: value,
      };

      // Auto-calculate netAmount when MRP, Qty, or C.D changes
      if (["mrp", "qty", "cd"].includes(field)) {
        const mrp = parseFloat(updatedRow.mrp) || 0;
        const qty = parseInt(updatedRow.qty, 10) || 0;
        const cd = parseFloat(updatedRow.cd) || 0; // Cash Discount percentage

        const grossAmount = mrp * qty;
        const discountValue = grossAmount * (cd / 100);
        const netAmount = grossAmount - discountValue;

        updatedRow.netAmount = netAmount.toFixed(2); // Format to 2 decimal places
      }

      newRows[index] = updatedRow;
      return newRows;
    });
  };

  const handleRemoveNewBillItem = (idToRemove: string) => {
    setNewBillItems((prevItems) =>
      prevItems.filter((item) => item.id !== idToRemove)
    );
  };

  const handleAddRowToNewBill = () => {
    setNewBillItems((prevItems) => [
      ...prevItems,
      {
        id: `new-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sno: `0${prevItems.length + 1}.`,
      },
    ]);
  };

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
      if (status === 'Draft') {
        navigate('/bills/drafts');
      } else {
        setRows((prevRows) =>
          prevRows.map((row) => (row.billId === billId ? { ...row, paymentStatus: status } : row))
        );
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
    <AdminLayout title={`Bill Listing > ${customerInfo.name || 'Customer'}`}>
      <div className="p-4 sm:p-6 bg-white min-h-screen text-[#3E3E3E] flex flex-col justify-between overflow-hidden relative">
        {/* === Top Section === */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Input
                  placeholder="Search by name"
                  className="pl-10 w-full h-10 bg-gradient-to-r from-[#FBEFEF] to-[#FFE7E7] border border-[#F8C7B6] rounded-full shadow-sm placeholder:text-[#B27272] focus:ring-0 focus:border-none"
                />
                <Search
                  size={18}
                  className="absolute left-3 top-2.5 text-[#E57373]"
                />
              </div>

              <Button
                onClick={() => navigate("/products")}
                className="bg-[#E57373] hover:bg-[#d75a5a] text-white rounded-full px-6 py-2 shadow-md whitespace-nowrap"
              >
                Add Product
              </Button>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                onClick={handleCreateNewBillForCustomer}
                className="bg-[#E57373] hover:bg-[#d75a5a] text-white rounded-full px-6 py-2 shadow-md whitespace-nowrap"
              >
                New Bill
              </Button>
            </div>
          </div>

          {/* === Table === */}
          <div className="bg-white p-3 rounded-xl shadow-sm overflow-x-auto border border-[#F3D9D9] min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                Loading bills...
              </div>
            ) : (
              (() => {
                const columnIds = columns.map((c) => c.id);
                const renderCell = (row: any, columnId: string) => {
                  switch (columnId) {
                    case "sno":
                      return <td className="py-3 px-4">{row.sno}</td>;
                    case "adItemCode":
                      return <td className="py-3 px-4">{row.adItemCode}</td>;
                    case "itemCode":
                      return <td className="py-3 px-4">{row.itemCode}</td>;
                    case "itemName":
                      return (
                        <td className="py-3 px-4">{row.itemName || "N/A"}</td>
                      );
                    case "companyName":
                      return <td className="py-3 px-4">{row.companyName}</td>;
                    case "hsnCode":
                      return (
                        <td className="py-3 px-4">{row.hsnCode || "N/A"}</td>
                      );
                    case "packing":
                      return (
                        <td className="py-3 px-4">{row.packing || "N/A"}</td>
                      );
                    case "lot":
                      return <td className="py-3 px-4">{row.lot || "N/A"}</td>;
                    case "mrp":
                      return <td className="py-3 px-4">{row.mrp}</td>;
                    case "qty":
                      return <td className="py-3 px-4">{row.qty}</td>;
                    case "cd":
                      return (
                        <td className="py-3 px-4">
                          {typeof row.cd === "number"
                            ? `${row.cd}%`
                            : row.cd || "N/A"}
                        </td>
                      );
                    case "netAmount":
                      return <td className="py-3 px-4">{row.netAmount}</td>;
                    case "tax":
                      return <td className="py-3 px-4">{row.tax}</td>;
                    case "paymentStatus":
                      return (
                        <td className="py-3 px-4">
                          <Select
                            value={row.paymentStatus}
                            onValueChange={(value) => initiatePaymentStatusChange(row.billId, value)}
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs bg-white border-gray-300">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Paid">Paid</SelectItem>
                              {/* <SelectItem value="Pending">Pending</SelectItem> */}
                              <SelectItem value="Unpaid">Unpaid</SelectItem>
                              <SelectItem value="Draft">Draft</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      );
                    case "actions":
                      return (
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center items-center space-x-3">
                            <Edit
                              size={18}
                              className="text-[#E57373] cursor-pointer hover:scale-110 transition"
                              onClick={() => handleEditBill(row)}
                            />
                            <Trash2
                              size={18}
                              className="text-[#E57373] cursor-pointer hover:scale-110 transition"
                              onClick={() => handleDeleteBill(row.billId)}
                            />
                            <Barcode
                              size={18}
                              className="text-[#E57373] cursor-pointer hover:scale-110 transition"
                              onClick={() => {
                                setSelectedProduct(row);
                                setOpenProductDetail(true);
                              }}
                            />
                          </div>
                        </td>
                      );
                    default:
                      return <td className="py-3 px-4">{row[columnId]}</td>;
                  }
                };
                return (
                  <table className="min-w-full text-sm text-left text-[#3E3E3E] border border-[#F3D9D9] rounded-lg">
                    <thead className="bg-[#FFEAEA] font-semibold">
                      <DndContext
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={columnIds}
                          strategy={horizontalListSortingStrategy}
                        >
                          <tr>
                            {columns.map((column) => (
                              <SortableHeader key={column.id} column={column} />
                            ))}
                          </tr>
                        </SortableContext>
                      </DndContext>
                    </thead>
                    <tbody>
                      {rows.length > 0 ? (
                        rows.map((r) => (
                          <tr
                            key={r.id}
                            className="bg-white hover:bg-[#FFF7F7] transition-colors border-t border-[#F3D9D9]"
                          >
                            {columns.map((col) => renderCell(r, col.id))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={columns.length}
                            className="text-center py-10 text-gray-500"
                          >
                            No bills found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                );
              })()
            )}
          </div>
        </div>

        {/* === Bottom Buttons (Fixed) === */}
        <div className="fixed bottom-6 right-8 flex flex-col sm:flex-row gap-4 z-50">
          <Button
            onClick={() => setOpenPreview(true)}
            className="bg-[#E57373] hover:bg-[#d75a5a] text-white rounded-md px-8 py-2 shadow-md"
          >
            Preview Bill
          </Button>
          <Button
            onClick={handleGenerateBill}
            className="bg-[#E57373] hover:bg-[#d75a5a] text-white rounded-md px-8 py-2 shadow-md"
          >
            Generate Bill
          </Button>
        </div>
      </div>

      {/* === Generated Bill Modal === */}
      <Dialog open={showGeneratedBill} onOpenChange={setShowGeneratedBill}>
        <DialogContent className="max-w-screen-lg w-[90vw] h-[90vh] flex flex-col p-2">
          <DialogHeader className="p-4 flex-row flex justify-between items-center">
            <DialogTitle>Generated Bill</DialogTitle>
            <Button
              onClick={() => {
                const iframe = document.getElementById('bill-iframe') as HTMLIFrameElement;
                iframe?.contentWindow?.print();
              }}
            >
              Print
            </Button>
          </DialogHeader>
          {generatedBillHtml && (
            <iframe id="bill-iframe" srcDoc={generatedBillHtml} className="w-full h-full border-0" title="Generated Bill Preview"></iframe>
          )}
        </DialogContent>
      </Dialog>

      {/* === Add Product Modal (Editable) === */}
      <Dialog open={openAddProductModal} onOpenChange={setOpenAddProductModal}>
        <DialogContent className="max-w-screen-2xl w-[95vw] bg-white rounded-3xl p-5 sm:p-10 shadow-lg border-none overflow-hidden">
          <div className="overflow-x-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[#1B2A38] text-base sm:text-lg mb-6 gap-3">
              <p>
                Customer Name:{" "}
                <span className="font-bold">{customerInfo.name}</span>
              </p>
              <p>
                Customer Code:{" "}
                <span className="font-bold">{customerInfo.code}</span>
              </p>
            </div>

            <h2 className="text-center font-semibold text-[#1B2A38] mb-6">
              Enter your Product details
            </h2>

            <table className="min-w-full text-sm text-left text-[#1B2A38] border border-gray-200 rounded-md">
              <thead className="sticky top-0 bg-[#FDF5F5] z-10">
                <tr className="border-b border-gray-300 bg-[#FDF5F5]">
                  {[
                    "SNO.",
                    "Ad. item code",
                    "ITEM CODE",
                    "ITEM NAME",
                    "COMPANY NAME",
                    "HSN CODE",
                    "PACKING",
                    "LOT",
                    "MRP",
                    "QTY",
                    "C.D",
                    "NET AMOUNT",
                    "TAX",
                    "ACTION",
                  ].map((head, i) => (
                    <th key={i} className="py-2 px-3 whitespace-nowrap">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {newBillItems.map((r, i) => (
                  <tr
                    key={i}
                    className="bg-[#F9FAFB] hover:bg-[#F5F5F5] transition"
                  >
                    <td className="p-2">
                      <Input
                        value={r.sno || `0${i + 1}.`}
                        className="bg-white"
                        readOnly
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.adItemCode || `AD000${i + 1}`}
                        className="bg-white"
                        readOnly
                      />
                    </td>
                    <td className="p-2">
                      <Popover
                        open={openPopoverIndex === i}
                        onOpenChange={(isOpen) =>
                          setOpenPopoverIndex(isOpen ? i : null)
                        }
                      >
                        <PopoverTrigger asChild>
                          <Input
                            placeholder="Select Item Code"
                            value={r.itemCode || ""}
                            className="bg-white cursor-pointer"
                            readOnly
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                          <Command>
                            <CommandInput placeholder="Search item code..." />
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((product, idx) => (
                                <CommandItem
                                  key={product._id}
                                  value={product.itemCode}
                                  onSelect={() => {
                                    handleNewBillProductSelect(product, i);
                                    setOpenPopoverIndex(null);
                                  }}
                                >
                                  {product.itemCode} - {product.productName}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.itemName || ""}
                        onChange={(e) =>
                          handleNewBillItemChange(i, "itemName", e.target.value)
                        }
                        placeholder="Item Name"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.companyName || ""}
                        onChange={(e) =>
                          handleNewBillItemChange(
                            i,
                            "companyName",
                            e.target.value
                          )
                        }
                        placeholder="Company"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.hsnCode || ""}
                        onChange={(e) =>
                          handleNewBillItemChange(i, "hsnCode", e.target.value)
                        }
                        placeholder="HSN"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.packing || ""}
                        onChange={(e) =>
                          handleNewBillItemChange(i, "packing", e.target.value)
                        }
                        placeholder="Packing"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.lot || ""}
                        onChange={(e) =>
                          handleNewBillItemChange(i, "lot", e.target.value)
                        }
                        placeholder="Lot"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.mrp || ""}
                        onChange={(e) =>
                          handleNewBillItemChange(i, "mrp", e.target.value)
                        }
                        placeholder="MRP"
                        type="number"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.qty || ""}
                        onChange={(e) =>
                          handleNewBillItemChange(i, "qty", e.target.value)
                        }
                        placeholder="Qty"
                        type="number"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.cd || ""}
                        onChange={(e) =>
                          handleNewBillItemChange(i, "cd", e.target.value)
                        }
                        placeholder="C.D"
                        type="number"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.netAmount || ""}
                        placeholder="Net Amount"
                        type="number"
                        className="bg-white"
                        readOnly
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.tax || ""}
                        onChange={(e) =>
                          handleNewBillItemChange(i, "tax", e.target.value)
                        }
                        placeholder="Tax"
                        type="number"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <Trash2
                        className="cursor-pointer text-[#E57373] hover:scale-110 transition"
                        onClick={() => handleRemoveNewBillItem(r.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-center items-center mt-8 gap-4">
              <Button
                onClick={handleAddRowToNewBill}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full px-6 py-2 font-medium shadow-sm"
              >
                Add Row
              </Button>
              <Button
                onClick={handleSaveBill}
                className="bg-[#E98C81] hover:bg-[#df7c72] text-white rounded-full px-10 py-3 font-medium shadow-md"
              >
                {editingBillId ? "Update Bill" : "Save Bill"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Preview Modal === */}
      <Dialog open={openPreview} onOpenChange={setOpenPreview}>
        
        <DialogContent className="max-w-screen-2xl w-[95vw] bg-white rounded-3xl p-5 sm:p-10 shadow-lg border-none overflow-hidden">
          <div className="overflow-x-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[#1B2A38] text-base sm:text-lg mb-6 gap-3">
              <p>
                Customer Name:{" "}
                <span className="font-bold">{customerInfo.name}</span>
              </p>
              <p>
                Customer Code:{" "}
                <span className="font-bold">{customerInfo.code}</span>
              </p>
            </div>

            <h2 className="text-center font-semibold text-[#1B2A38] mb-6">
              Enter your Product details
            </h2>

            <table className="min-w-full text-sm text-left text-[#1B2A38] border border-gray-200 rounded-md">
              <thead>
                <tr className="border-b border-gray-300 bg-[#FDF5F5]">
                  {[
                    "SNO.",
                    "Ad. item code",
                    "ITEM CODE",
                    "ITEM NAME",
                    "COMPANY NAME",
                    "HSN CODE",
                    "PACKING",
                    "LOT",
                    "MRP",
                    "QTY",
                    "C.D",
                    "NET AMOUNT",
                    "TAX",
                  ].map((head, i) => (
                    <th key={i} className="py-2 px-3 whitespace-nowrap">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className="bg-[#F9FAFB] hover:bg-[#F5F5F5] transition"
                  >
                    <td className="py-3 px-4">{r.sno}</td>
                    <td className="py-3 px-4">{r.adItemCode}</td>
                    <td className="py-3 px-4">{r.itemCode}</td>
                    <td className="py-3 px-4">{r.itemName}</td>
                    <td className="py-3 px-4">{r.companyName}</td>
                    <td className="py-3 px-4">{r.hsnCode}</td>
                    <td className="py-3 px-4">{r.packing}</td>
                    <td className="py-3 px-4">{r.lot}</td>
                    <td className="py-3 px-4">{r.mrp}</td>
                    <td className="py-3 px-4">{r.qty}</td>
                    <td className="py-3 px-4">{r.cd}</td>
                    <td className="py-3 px-4">{r.netAmount}</td>
                    <td className="py-3 px-4">{r.tax}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-center mt-8">
              <Button
                onClick={() => {
                  toast.success("Bill saved successfully!");
                  setOpenPreview(false);
                }}
                className="bg-[#E98C81] hover:bg-[#df7c72] text-white rounded-full px-10 py-3 font-medium shadow-md"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
        
      </Dialog>

      {/* === Product Details Modal === */}
      <Dialog open={openProductDetail} onOpenChange={setOpenProductDetail}>
        <DialogContent className="max-w-md w-[85vw] bg-white rounded-xl p-5 shadow-lg border-none max-h-[80vh] overflow-y-auto">
          {selectedProduct && (
            <div>
              <h2 className="text-lg font-bold text-[#1B2A38] mb-4 text-center">
                Product Details
              </h2>

              <div className="space-y-2 text-[#3E3E3E] text-sm">
                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">Serial Number:</span>
                  <span className="font-semibold">{selectedProduct.sno}</span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">Ad. Item Code:</span>
                  <span className="font-semibold">
                    {selectedProduct.adItemCode}
                  </span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">Item Code:</span>
                  <span className="font-semibold">
                    {selectedProduct.itemCode}
                  </span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">Item Name:</span>
                  <span className="font-semibold">
                    {selectedProduct.itemName}
                  </span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">Company Name:</span>
                  <span className="font-semibold">
                    {selectedProduct.companyName}
                  </span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">HSN Code:</span>
                  <span className="font-semibold">
                    {selectedProduct.hsnCode}
                  </span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">Packing:</span>
                  <span className="font-semibold">
                    {selectedProduct.packing}
                  </span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">Lot:</span>
                  <span className="font-semibold">{selectedProduct.lot}</span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">MRP:</span>
                  <span className="font-semibold">₹{selectedProduct.mrp}</span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">Quantity:</span>
                  <span className="font-semibold">{selectedProduct.qty}</span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">C.D:</span>
                  <span className="font-semibold">{selectedProduct.cd}</span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">Net Amount:</span>
                  <span className="font-semibold">
                    ₹{selectedProduct.netAmount}
                  </span>
                </div>

                <div className="bg-[#FFF7F7] p-3 rounded-lg border border-[#F3D9D9] flex justify-between">
                  <span className="text-[#B27272]">Tax:</span>
                  <span className="font-semibold">{selectedProduct.tax}%</span>
                </div>
              </div>

              <div className="flex justify-center mt-5">
                <Button
                  onClick={() => setOpenProductDetail(false)}
                  className="bg-[#E57373] hover:bg-[#d75a5a] text-white rounded-full px-6 py-2 shadow-md text-sm"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
    </AdminLayout>
  );
}
