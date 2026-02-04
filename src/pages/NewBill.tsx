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
import { Search, Edit, Trash2, Barcode, RotateCcw } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  addNewBill,
  getBillsByCustomerId,
  generateBill,
  updateBillPaymentStatus,
} from "@/adminApi/billApi";
import { getAllProducts } from "@/adminApi/productApi";
import { addSaleReturn } from "@/adminApi/saleReturnApi";
import { toast } from "sonner";
import { useZxing } from "react-zxing";

const updateBill = async ({ id, data }: { id: string; data: any }) => {
  return await adminInstance.put(`/bills/update/${id}`, data);
};

const deleteBill = async (id: string) => {
  return await adminInstance.delete(`/bills/delete/${id}`);
};

// Helper to calculate row amounts (net, tax, total)
const calculateRowAmount = ({
  mrp = 0,
  qty = 0,
  cd = 0,
  tax = 0,
}: {
  mrp?: number | string;
  qty?: number | string;
  cd?: number | string;
  tax?: number | string;
}) => {
  const m = Number(mrp) || 0;
  const q = Number(qty) || 0;
  const discountPercent = Number(cd) || 0;
  const gstPercent = Number(tax) || 0;

  const gross = m * q;
  const discountAmount = (gross * discountPercent) / 100;
  const taxable = gross - discountAmount;

  const cgst = (taxable * gstPercent) / 200;
  const sgst = (taxable * gstPercent) / 200;

  const total = taxable + cgst + sgst;

  return {
    netAmount: taxable.toFixed(2),
    taxAmount: (cgst + sgst).toFixed(2),
    total: total.toFixed(2),
  };
};

const BarcodeScannerWrapper = ({ onUpdate, onError, facingMode }: { onUpdate: (err: any, result: any) => void, onError: (err: any) => void, facingMode?: "environment" | "user" }) => {
  const { ref } = useZxing({
    onDecodeResult(result) {
      onUpdate(null, { text: result.getText() });
    },
    onError(error) {
      if (onError) onError(error);
    },
    constraints: { video: { facingMode: facingMode || "environment" } }
  });

  return <video ref={ref} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
};

export default function NewBill() {
  const [openPreview, setOpenPreview] = useState(false);
  const [openProductDetail, setOpenProductDetail] = useState(false);
  const [openAddProductModal, setOpenAddProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchParams] = useSearchParams();
  const [customerInfo, setCustomerInfo] = useState({ name: "", code: "" });
  const location = useLocation();
  const rawCustomerId = searchParams.get("id");
  const customerId = rawCustomerId === "undefined" ? null : rawCustomerId;
  const [products, setProducts] = useState<any[]>([]);
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);
  const [openNamePopoverIndex, setOpenNamePopoverIndex] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [generatedBillHtml, setGeneratedBillHtml] = useState<string | null>(
    null,
  );
  const [showGeneratedBill, setShowGeneratedBill] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [statusConfirmationOpen, setStatusConfirmationOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    billId: string;
    status: string;
  } | null>(null);
  const [exitConfirmationOpen, setExitConfirmationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanBarcodeDialogOpen, setScanBarcodeDialogOpen] = useState(false);
  
  // New states for camera handling 
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualBarcodeInput, setManualBarcodeInput] = useState("");
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");

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
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        const savedIds = new Set(parsed.map((c: any) => c.id));
        const missingColumns = initialColumns.filter((c) => !savedIds.has(c.id));
        return [...parsed, ...missingColumns];
      } catch (e) {
        return initialColumns;
      }
    }
    return initialColumns;
  });

  // Handle manual barcode input submission
  const handleManualBarcodeSubmit = () => {
    if (manualBarcodeInput.trim()) {
      const scannedCode = manualBarcodeInput.trim();
      const product = products.find(
        (p) => p.itemCode && p.itemCode.toLowerCase() === scannedCode.toLowerCase()
      );

      if (product) {
        setSaleItems((prev) => {
          const updated = [...prev];
          let targetIndex = updated.findIndex((r) => !r.itemCode);

          if (targetIndex === -1) {
            targetIndex = updated.length;
            updated.push({
              id: `new-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sno: `${String(updated.length + 1).padStart(2, "0")}.`,
            });
          }

          const row = updated[targetIndex];
          const mrp = Number(product.mrp) || 0;
          const qty = 1;
          const cd = Number(product.discount) || 0;
          const tax = Number(product.gst) || 0;
          const calc = calculateRowAmount({ mrp, qty, cd, tax });

          updated[targetIndex] = {
            ...row,
            productId: product._id,
            itemCode: product.itemCode,
            itemName: product.productName,
            companyName: product.brandName,
            hsnCode: product.hsnCode,
            packing: product.packSize,
            mrp,
            rate: mrp,
            qty,
            cd,
            tax,
            netAmount: calc.netAmount,
            lot: "N/A",
          };

          if (targetIndex === updated.length - 1) {
            updated.push({
              id: `new-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sno: `${String(updated.length + 1).padStart(2, "0")}.`,
            });
          }
          return updated;
        });
        
        toast.success(`Added: ${product.productName}`);
        setManualBarcodeInput("");
        setScanBarcodeDialogOpen(false);
      } else {
        toast.error("Product not found with this barcode");
      }
    } else {
      toast.error("Please enter a barcode");
    }
  };

  const fetchBills = React.useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      const response = await getBillsByCustomerId(customerId);
      if (
        response &&
        response.success &&
        Array.isArray(response.bills) &&
        response.bills.length > 0
      ) {
        const firstBill = response.bills[0];
        const customerName =
          firstBill.customerName || firstBill.customerId?.name;

        if (customerName) {
          setCustomerInfo((prev) => ({ ...prev, name: customerName }));
        }

        const allItems = response.bills.flatMap((bill: any) =>
          bill.items.map((item: any, idx: number) => ({
            ...bill,
            ...item,
            billId: bill._id,
            uniqueId: item._id || `${bill._id}-${idx}`,
          })),
        );

        const flattenedRows = allItems.map((item: any, index: number) => {
          const sno = index + 1;
          return {
            ...item,
            id: item.uniqueId,
            adItemCode: `AD${String(sno).padStart(4, "0")}`,
            sno: `${String(sno).padStart(2, "0")}.`,
            lot: item.batch || "N/A",
            cd: item.discountPercent,
            netAmount: item.taxableAmount,
            tax: item.gstPercent,
          };
        });
        setRows(flattenedRows);
      } else {
        setRows([]);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setRows([]);
      } else {
        console.error("Failed to fetch bills:", error);
        const errorMessage =
          error.response?.data?.message || "Could not fetch bills.";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getAllProducts({ limit: 10000 });

        let productData: any[] = [];

        if (
          response?.data?.data?.rows &&
          Array.isArray(response.data.data.rows)
        ) {
          productData = response.data.data.rows;
        } else if (
          response?.data?.data?.products &&
          Array.isArray(response.data.data.products)
        ) {
          productData = response.data.data.products;
        } else if (response?.data?.rows && Array.isArray(response.data.rows)) {
          productData = response.data.rows;
        } else if (
          response?.data?.products &&
          Array.isArray(response.data.products)
        ) {
          productData = response.data.products;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          productData = response.data.data;
        } else if (Array.isArray(response?.data)) {
          productData = response.data;
        } else {
          console.error("Invalid product data structure:", response?.data);
          toast.error("Could not load product list.");
        }

        setProducts(productData);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        toast.error("Failed to fetch products.");
      }
    };
    fetchProducts();

    if (location.state?.customerName) {
      setCustomerInfo({
        name: location.state.customerName,
        code: location.state.customerCode || "",
      });
    }

    if (location.state?.openAddProductModal) {
      setOpenAddProductModal(true);
      setSaleItems([{ id: `new-item-${Date.now()}`, sno: "01." }]);
      setReturnItems([]);
    }

    fetchBills();
  }, [customerId, location.state, fetchBills, navigate]);

  useEffect(() => {
    localStorage.setItem(
      "billDetailsTableColumnOrder_v2",
      JSON.stringify(columns),
    );
  }, [columns]);

  useEffect(() => {
    // Redirect wheel scrolling to popover when open
    const activeIndex =
      openPopoverIndex !== null ? openPopoverIndex : openNamePopoverIndex;
    if (activeIndex === null) return;

    const selector = `.product-popover-content[data-row-index="${activeIndex}"]`;

    const onWheel = (e: WheelEvent) => {
      const pop = document.querySelector(selector) as HTMLElement | null;
      if (!pop) return;

      const delta = e.deltaY;
      const atTop = pop.scrollTop === 0;
      const atBottom =
        Math.abs(pop.scrollHeight - pop.clientHeight - pop.scrollTop) <= 1;

      if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
        return;
      }

      e.preventDefault();
      pop.scrollTop += delta;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel as EventListener);
  }, [openPopoverIndex, openNamePopoverIndex]);

  // Barcode Scanner Listener for keyboard input
  useEffect(() => {
    if (!openAddProductModal) return;

    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      // Reset buffer if typing is too slow (likely manual input)
      if (currentTime - lastKeyTime > 100) {
        buffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length > 0) {
          const scannedCode = buffer.trim();
          const product = products.find(
            (p) => p.itemCode && p.itemCode.toLowerCase() === scannedCode.toLowerCase()
          );

          if (product) {
            e.preventDefault();
            
            setSaleItems((prev) => {
              const updated = [...prev];
              let targetIndex = updated.findIndex((r) => !r.itemCode);

              if (targetIndex === -1) {
                targetIndex = updated.length;
                updated.push({
                  id: `new-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  sno: `${String(updated.length + 1).padStart(2, "0")}.`,
                });
              }

              const row = updated[targetIndex];
              const mrp = Number(product.mrp) || 0;
              const qty = 1;
              const cd = Number(product.discount) || 0;
              const tax = Number(product.gst) || 0;
              const calc = calculateRowAmount({ mrp, qty, cd, tax });

              updated[targetIndex] = {
                ...row,
                productId: product._id,
                itemCode: product.itemCode,
                itemName: product.productName,
                companyName: product.brandName,
                hsnCode: product.hsnCode,
                packing: product.packSize,
                mrp,
                rate: mrp,
                qty,
                cd,
                tax,
                netAmount: calc.netAmount,
                lot: "N/A",
              };

              if (targetIndex === updated.length - 1) {
                updated.push({
                  id: `new-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  sno: `${String(updated.length + 1).padStart(2, "0")}.`,
                });
              }
              return updated;
            });
            toast.success(`Added: ${product.productName}`);
          }
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openAddProductModal, products]);

  const handleBarcodeScan = (err: any, result: any) => {
    if (result) {
      const scannedCode = result.text;
      const product = products.find(
        (p) => p.itemCode && p.itemCode.toLowerCase() === scannedCode.toLowerCase()
      );

      if (product) {
        setScanBarcodeDialogOpen(false);
        
        setSaleItems((prev) => {
          const updated = [...prev];
          let targetIndex = updated.findIndex((r) => !r.itemCode);

          if (targetIndex === -1) {
            targetIndex = updated.length;
            updated.push({
              id: `new-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sno: `${String(updated.length + 1).padStart(2, "0")}.`,
            });
          }

          const row = updated[targetIndex];
          const mrp = Number(product.mrp) || 0;
          const qty = 1;
          const cd = Number(product.discount) || 0;
          const tax = Number(product.gst) || 0;
          const calc = calculateRowAmount({ mrp, qty, cd, tax });

          updated[targetIndex] = {
            ...row,
            productId: product._id,
            itemCode: product.itemCode,
            itemName: product.productName,
            companyName: product.brandName,
            hsnCode: product.hsnCode,
            packing: product.packSize,
            mrp,
            rate: mrp,
            qty,
            cd,
            tax,
            netAmount: calc.netAmount,
            lot: "N/A",
          };

          if (targetIndex === updated.length - 1) {
            updated.push({
              id: `new-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sno: `${String(updated.length + 1).padStart(2, "0")}.`,
            });
          }
          return updated;
        });
        toast.success(`Added: ${product.productName}`);
      }
    }
  };

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
    setIsSaving(true);

    // Prepare Sale Items
    const saleBillItems = saleItems
      .map((row) => ({
        productId: row.productId,
        product: row.productId,
        itemCode: row.itemCode,
        itemName: row.itemName,
        companyName: row.companyName,
        hsnCode: row.hsnCode,
        packing: row.packing,
        batch: row.lot === "N/A" ? "" : (row.lot || ""),
        qty: Number(row.qty) || 0,
        rate: Number(row.mrp) || 0,
        mrp: Number(row.mrp) || 0,
        discountPercent: Number(row.cd) || 0,
        gstPercent: Number(row.tax) || 0,
      }))
      .filter((item) => item.itemCode && item.qty > 0);
    
    // Prepare Return Items
    const returnPayloadItems = returnItems
      .map((row) => {
        const qty = Number(row.qty) || 0;
        const rate = Number(row.mrp) || 0;
        const cd = Number(row.cd) || 0;
        const tax = Number(row.tax) || 0;

        const gross = rate * qty;
        const discountAmount = (gross * cd) / 100;
        const taxable = gross - discountAmount;
        const gstAmount = (taxable * tax) / 100;
        const total = taxable + gstAmount;

        return {
          productId: row.productId,
          product: row.productId,
          itemCode: row.itemCode,
          itemName: row.itemName,
          companyName: row.companyName,
          hsnCode: row.hsnCode,
          packing: row.packing,
          batch: row.lot === "N/A" ? "" : row.lot || "",
          qty: qty,
          rate: rate,
          mrp: rate,
          discountPercent: cd,
          discount: cd,
          gstPercent: tax,
          discountAmount: discountAmount,
          taxableAmount: taxable,
          taxAmount: gstAmount,
          total: total,
          amount: total,
          finalAmount: total,
        };
      })
      .filter((item) => item.itemCode && item.qty > 0);

    // Validations
    if (
      [...saleBillItems, ...returnPayloadItems].some((item) => !item.productId)
    ) {
      toast.error(
        "Some items are missing Product ID. Please remove and re-add them.",
      );
      setIsSaving(false);
      return;
    }

    if (saleBillItems.length === 0 && returnPayloadItems.length === 0) {
      toast.error("Please add at least one item.");
      setIsSaving(false);
      return;
    }

    try {
      let billIdForReturn = editingBillId;
      let billNoForReturn = null;

      if (editingBillId) {
        const existingBill = rows.find((r) => r.billId === editingBillId);
        if (existingBill) {
          billNoForReturn = existingBill.billNo;
        }
      }

      // Step 1: Save or Update the Sales Bill (SL part)
      if (saleBillItems.length > 0) {
        const salePayload = {
          customerId,
          billNo: billNoForReturn,
          items: saleBillItems,
          paymentMode: "Cash",
          notes: "Bill from NewBill page",
        };

        if (editingBillId) {
          await updateBill({ id: editingBillId, data: salePayload });
        } else {
          const response = await addNewBill(salePayload);
          const newBill = response?.bill || response?.data || response;
          if (!newBill?._id) {
            throw new Error("Failed to create sales bill.");
          }
          billIdForReturn = newBill._id;
        }
      } else if (editingBillId && returnPayloadItems.length > 0) {
        await updateBill({ id: editingBillId, data: { items: [] } });
      }

      // Step 2: Create the Sales Return (SR part)
      if (returnPayloadItems.length > 0) {
        if (!billIdForReturn) {
          toast.error(
            "A sales return must be associated with a sales bill. Add at least one sale item or edit an existing bill.",
          );
          setIsSaving(false);
          return;
        }

        const totalRefundAmount = calculateTotals(returnItems).total;

        const returnApiPayload = {
          billId: billIdForReturn,
          customerId,
          reason: "Returned during billing",
          refundAmount: totalRefundAmount,
          items: returnPayloadItems,
        };

        await addSaleReturn(returnApiPayload);
        toast.success("Sales Return created successfully!");
      }

      toast.success("Bill operations completed successfully!");
      setOpenAddProductModal(false);
      setEditingBillId(null);
      await fetchBills();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "An error occurred during saving.";
      toast.error(errorMessage);
      console.error("Error saving bill:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewBillForCustomer = () => {
    if (!customerId) {
      toast.info("Please select a customer to create a new bill.");
      navigate("/bills/customers");
      return;
    }
    setEditingBillId(null);
    setSaleItems([{ id: `new-item-${Date.now()}`, sno: "01." }]);
    setReturnItems([]);
    setOpenAddProductModal(true);
  };

  const handleGenerateBill = async () => {
    try {
      const response = await generateBill(customerId);
      const billDataUrl = response.url;

      if (response.success && billDataUrl) {
        toast.success("Bill generated successfully!");

        // Decode base64 to HTML string for srcDoc
        const base64Part = billDataUrl.split(",")[1];
        const binaryString = window.atob(base64Part);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decodedHtml = new TextDecoder().decode(bytes);

        setGeneratedBillHtml(decodedHtml);
        setShowGeneratedBill(true);

        // Automatically mark unpaid bills as Paid
        const uniqueBillIds = Array.from(new Set(rows.map((r) => r.billId))).filter(Boolean);
        const billsToUpdate = uniqueBillIds.filter((billId) => {
          const row = rows.find((r) => r.billId === billId);
          return row && row.paymentStatus !== "Paid";
        });

        if (billsToUpdate.length > 0) {
          try {
            await Promise.all(billsToUpdate.map((id) => updateBillPaymentStatus(id as string, "Paid")));
            setRows((prevRows) =>
              prevRows.map((row) => {
                if (billsToUpdate.includes(row.billId)) {
                  return { ...row, paymentStatus: "Paid" };
                }
                return row;
              })
            );
            toast.success("Bills marked as Paid.");
          } catch (err) {
            console.error("Failed to auto-update bill status:", err);
          }
        }
      } else {
        toast.error(
          response.message ||
            "Bill generated but no viewable file was returned.",
        );
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Failed to generate bill. Please try again.",
      );
      console.error("Error generating bill:", error);
    }
  };

  const handleEditBill = (row: any) => {
    const billId = row.billId;
    const billItems = rows.filter((r) => r.billId === billId);

    const sales: any[] = [];
    const returns: any[] = [];

    billItems.forEach((item, index) => {
      const pId =
        (item.productId &&
          (typeof item.productId === "object"
            ? item.productId._id
            : item.productId)) ||
        (item.product &&
          (typeof item.product === "object" ? item.product._id : item.product));

      const formatted = {
        ...item,
        id: item.uniqueId || `edit-item-${index}`,
        sno: `${String(index + 1).padStart(2, "0")}.`,
        mrp: item.rate || item.mrp,
        cd: item.discountPercent || item.cd,
        productId: pId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        companyName: item.companyName,
        hsnCode: item.hsnCode,
        packing: item.packing,
        lot: item.lot,
        qty: item.qty,
        tax: item.tax,
        netAmount: item.taxableAmount,
      };

      if (Number(item.qty) < 0) {
        formatted.qty = Math.abs(Number(item.qty));
        returns.push(formatted);
      } else {
        sales.push(formatted);
      }
    });

    setEditingBillId(billId);
    setSaleItems(sales);
    setReturnItems(returns);
    setOpenAddProductModal(true);
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    await deleteBill(billId);
    fetchBills();
  };

  const handleProductSelect = (product: any, rowIndex: number) => {
    setSaleItems((prev) => {
      const updated = [...prev];
      const row = updated[rowIndex];
      const mrp = Number(product.mrp) || 0;
      const qty = Number(row.qty) || 1;
      const cd = Number(product.discount) || 0;
      const tax = Number(product.gst) || 0;

      const calc = calculateRowAmount({ mrp, qty, cd, tax });

      updated[rowIndex] = {
        ...row,
        productId: product._id,
        itemCode: product.itemCode,
        itemName: product.productName,
        companyName: product.brandName,
        hsnCode: product.hsnCode,
        packing: product.packSize,
        mrp,
        rate: mrp,
        qty,
        cd,
        tax,
        netAmount: calc.netAmount,
      };

      // Automatically add a new row if the current row is the last one
      if (rowIndex === prev.length - 1) {
        updated.push({
          id: `new-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sno: `${String(prev.length + 1).padStart(2, "0")}.`,
        });
      }

      return updated;
    });
  };

  const handleItemChange = (
    index: number,
    field: string,
    value: string,
    type: 'sale' | 'return'
  ) => {
    const setItems = type === 'sale' ? setSaleItems : setReturnItems;
    setItems((currentRows) => {
      const newRows = [...currentRows];
      const updatedRow = {
        ...newRows[index],
        [field]: value,
      };

      // Auto-calculate netAmount when MRP, Qty, C.D or Tax changes
      if (["mrp", "qty", "cd", "tax"].includes(field)) {
        const calc = calculateRowAmount({
          mrp: updatedRow.mrp,
          qty: updatedRow.qty,
          cd: updatedRow.cd,
          tax: updatedRow.tax,
        });

        updatedRow.netAmount = calc.netAmount;
      }

      newRows[index] = updatedRow;
      return newRows;
    });
  };

  const handleRemoveItem = (idToRemove: string, type: 'sale' | 'return') => {
    const setItems = type === 'sale' ? setSaleItems : setReturnItems;
    setItems((prevItems) =>
      prevItems.filter((item) => item.id !== idToRemove),
    );
  };

  const handleAddSaleRow = () => {
    setSaleItems((prevItems) => [
      ...prevItems,
      {
        id: `new-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sno: `0${prevItems.length + 1}.`,
      },
    ]);
  };

  const handleReturnItem = (item: any) => {
    const currentQty = Number(item.qty) || 0;
    if (currentQty <= 0) return;

    let returnQty = 1;
    if (currentQty > 1) {
      const val = window.prompt(
        `Enter quantity to return (Max: ${currentQty})`,
        "1",
      );
      if (val === null) return;
      returnQty = Number(val);
      if (isNaN(returnQty) || returnQty <= 0 || returnQty > currentQty) {
        toast.error("Invalid quantity");
        return;
      }
    }

    const returnItemData = {
      productId: item.productId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      companyName: item.companyName,
      hsnCode: item.hsnCode,
      packing: item.packing,
      lot: item.lot,
      mrp: item.mrp,
      cd: item.cd,
      tax: item.tax,
      adItemCode: item.adItemCode,
    };

    if (returnQty === currentQty) {
      setSaleItems((prev) => prev.filter((i) => i.id !== item.id));
      setReturnItems((prev) => [
        ...prev,
        {
          ...returnItemData,
          id: `sr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          qty: returnQty,
          netAmount: item.netAmount,
        },
      ]);
      toast.success("Item moved to Return list");
    } else {
      setSaleItems((prev) =>
        prev.map((i) => {
          if (i.id === item.id) {
            const newQty = currentQty - returnQty;
            const calc = calculateRowAmount({ ...i, qty: newQty });
            return { ...i, qty: newQty, netAmount: calc.netAmount };
          }
          return i;
        }),
      );
      setReturnItems((prev) => {
        const calc = calculateRowAmount({ ...returnItemData, qty: returnQty });
        return [
          ...prev,
          {
            ...returnItemData,
            id: `sr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            qty: returnQty,
            netAmount: calc.netAmount,
          },
        ];
      });
      toast.success(`Returned ${returnQty} items`);
    }
  };

  const handleUndoReturn = (itemToMoveBack: any) => {
    setReturnItems((prev) => prev.filter((i) => i.id !== itemToMoveBack.id));

    const existingSaleItemIndex = saleItems.findIndex(
      (i) => i.productId === itemToMoveBack.productId,
    );

    if (existingSaleItemIndex > -1) {
      setSaleItems((prev) =>
        prev.map((item, index) => {
          if (index === existingSaleItemIndex) {
            const newQty =
              (Number(item.qty) || 0) + (Number(itemToMoveBack.qty) || 0);
            const calc = calculateRowAmount({ ...item, qty: newQty });
            return { ...item, qty: newQty, netAmount: calc.netAmount };
          }
          return item;
        }),
      );
    } else {
      setSaleItems((prev) => [...prev, itemToMoveBack]);
    }

    toast.info("Item moved back to Sale list");
  };

  const calculateTotals = (items: any[]) => {
    return items.reduce(
      (acc, item) => {
        const mrp = Number(item.mrp) || 0;
        const qty = Number(item.qty) || 0;
        const cd = Number(item.cd) || 0;
        const tax = Number(item.tax) || 0;

        const gross = mrp * qty;
        const discount = (gross * cd) / 100;
        const taxable = gross - discount;
        const gst = (taxable * tax) / 100;

        acc.amount += gross;
        acc.discount += discount;
        acc.tax += gst;
        acc.total += taxable + gst;

        return acc;
      },
      { amount: 0, discount: 0, tax: 0, total: 0 }
    );
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
      if (status === "Draft") {
        navigate("/bills/drafts");
      } else {
        setRows((prevRows) =>
          prevRows.map((row) =>
            row.billId === billId ? { ...row, paymentStatus: status } : row,
          ),
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

  const filteredRows = rows.filter((row) => {
    const query = searchQuery.toLowerCase();
    return (
      (row.itemCode || "").toLowerCase().includes(query) ||
      (row.itemName || "").toLowerCase().includes(query) ||
      (row.companyName || "").toLowerCase().includes(query)
    );
  });

  return (
    <AdminLayout title={`Bill Listing > ${customerInfo.name || "Customer"}`}>
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
      <div className="p-4 sm:p-6 bg-white min-h-screen text-[#3E3E3E] flex flex-col justify-between overflow-hidden relative">
        {/* Top Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Input
                  placeholder="Search by name, code or company"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full h-10 bg-gradient-to-r from-[#FBEFEF] to-[#FFE7E7] border border-[#F8C7B6] rounded-full shadow-sm placeholder:text-[#B27272] focus:ring-0 focus:border-none"
                />
                <Search
                  size={18}
                  className="absolute left-3 top-2.5 text-[#E57373]"
                />
              </div>

              <Button
                onClick={handleCreateNewBillForCustomer}
                className="bg-[#E57373] hover:bg-[#d75a5a] text-white rounded-full px-6 py-2 shadow-md whitespace-nowrap"
              >
                Add Product
              </Button>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                onClick={() => setExitConfirmationOpen(true)}
                className="bg-[#E57373] hover:bg-[#d75a5a] text-white rounded-md px-6 py-2 shadow-md whitespace-nowrap"
              >
                New Bill
              </Button>
            </div>
          </div>

          {/* Table */}
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
                      return <td className="py-3 px-4">{row.tax}%</td>;

                    case "paymentStatus":
                      return (
                        <td className="py-3 px-4">
                          <Select
                            value={row.paymentStatus}
                            onValueChange={(value) =>
                              initiatePaymentStatusChange(row.billId, value)
                            }
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs bg-white border-gray-300">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Paid">Paid</SelectItem>
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
                      {filteredRows.length > 0 ? (
                        filteredRows.map((r) => (
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

        {/* Bottom Buttons (Fixed) */}
        <div className="fixed bottom-6 right-8 flex flex-col sm:flex-row gap-4 z-50">
          <Button
            onClick={() => setOpenPreview(true)}
            className="bg-[#E98C81] hover:bg-[#d97a71] text-white rounded-md px-8 py-2 shadow-md"
          >
            Preview Bill
          </Button>
          <Button
            onClick={handleGenerateBill}
            className="bg-[#E98C81] hover:bg-[#d97a71] text-white rounded-md px-8 py-2 shadow-md"
          >
            Generate Bill
          </Button>
        </div>
      </div>

      {/* Generated Bill Modal */}
      <Dialog open={showGeneratedBill} onOpenChange={setShowGeneratedBill}>
        <DialogContent className="max-w-screen-lg w-[90vw] h-[90vh] flex flex-col p-2">
          <DialogHeader className="p-4 flex-row flex justify-between items-center">
            <DialogTitle>Generated Bill</DialogTitle>
            <Button
              onClick={() => {
                const iframe = document.getElementById(
                  "bill-iframe",
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

      {/* Add Product Modal (Editable) */}
      <Dialog open={openAddProductModal} onOpenChange={setOpenAddProductModal}>
        <DialogContent className="max-w-screen-2xl w-[95vw] max-h-[95vh] bg-white rounded-3xl p-5 sm:p-10 shadow-lg border-none overflow-y-auto">
          {(() => {
            const sl = calculateTotals(saleItems);
            const sr = calculateTotals(returnItems);
            const grossTotal = sl.total + sr.total;
            const netPayable = grossTotal - sr.total;
            return (
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

            <h3 className="font-semibold mb-2">( SL )</h3>
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
                {saleItems.map((r, i) => (
                  <tr
                    key={r.id}
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
                        <PopoverContent
                          className="w-[320px] max-h-[360px] p-0 overflow-y-auto product-popover-content"
                          data-row-index={i}
                        >
                          <Command>
                            <CommandInput placeholder="Search item code..." />
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((product, idx) => (
                                <CommandItem
                                  key={product._id}
                                  value={product.itemCode}
                                  onSelect={() => {
                                    handleProductSelect(product, i);
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
                      <Popover
                        open={openNamePopoverIndex === i}
                        onOpenChange={(isOpen) =>
                          setOpenNamePopoverIndex(isOpen ? i : null)
                        }
                      >
                        <PopoverTrigger asChild>
                          <Input
                            value={r.itemName || ""}
                            placeholder="Item Name"
                            className="bg-white cursor-pointer"
                            readOnly
                          />
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[320px] max-h-[360px] p-0 overflow-y-auto product-popover-content"
                          data-row-index={i}
                        >
                          <Command>
                            <CommandInput placeholder="Search item name..." />
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((product) => (
                                <CommandItem
                                  key={product._id}
                                  value={product.productName}
                                  onSelect={() => {
                                    handleProductSelect(product, i);
                                    setOpenNamePopoverIndex(null);
                                  }}
                                >
                                  {product.productName}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.companyName || ""}
                        onChange={(e) =>
                          handleItemChange(
                            i,
                            "companyName",
                            e.target.value,
                            'sale'
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
                          handleItemChange(i, "hsnCode", e.target.value, 'sale')
                        }
                        placeholder="HSN"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.packing || ""}
                        onChange={(e) =>
                          handleItemChange(i, "packing", e.target.value, 'sale')
                        }
                        placeholder="Packing"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.lot || ""}
                        onChange={(e) =>
                          handleItemChange(i, "lot", e.target.value, 'sale')
                        }
                        placeholder="Lot"
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.mrp || ""}
                        onChange={(e) =>
                          handleItemChange(i, "mrp", e.target.value, 'sale')
                        }
                        placeholder="MRP"
                        type="number"
                        className="bg-white"
                        min={0}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.qty || ""}
                        onChange={(e) =>
                          handleItemChange(i, "qty", e.target.value, 'sale')
                        }
                        placeholder="Qty"
                        type="number"
                        className="bg-white"
                        min={0}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={r.cd || ""}
                        onChange={(e) =>
                          handleItemChange(i, "cd", e.target.value, 'sale')
                        }
                        placeholder="C.D"
                        type="number"
                        className="bg-white"
                        min={0}
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
                          handleItemChange(i, "tax", e.target.value, 'sale')
                        }
                        placeholder="Tax"
                        type="number"
                        className="bg-white"
                        min={0}
                      />
                    </td>
                    <td className="p-2 text-center flex items-center justify-center gap-2">
                      <RotateCcw
                        size={16}
                        className="text-blue-600 cursor-pointer hover:scale-110 transition"
                        // @ts-ignore
                        title="Return Item"
                        onClick={() => handleReturnItem(r)}
                      />
                      <Trash2
                        size={16}
                        className="cursor-pointer text-[#E57373] hover:scale-110 transition"
                        onClick={() => handleRemoveItem(r.id, 'sale')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {returnItems.length > 0 && (
              <>
                <h3 className="font-semibold mt-8 mb-2">( SR )</h3>
                <table className="min-w-full text-sm text-left text-[#1B2A38] border border-gray-200 rounded-md">
                  <thead className="sticky top-0 bg-[#FDF5F5] z-10">
                    <tr className="border-b border-gray-300 bg-[#FDF5F5]">
                      {[
                        "SNO.", "Ad. item code", "ITEM CODE", "ITEM NAME", "COMPANY NAME",
                        "HSN CODE", "PACKING", "LOT", "MRP", "QTY", "C.D", "NET AMOUNT", "TAX", "ACTION"
                      ].map((head, i) => (
                        <th key={i} className="py-2 px-3 whitespace-nowrap">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map((r, i) => (
                      <tr key={r.id} className="bg-[#F9FAFB] hover:bg-[#F5F5F5] transition">
                        <td className="p-2"><Input value={r.sno || `0${i + 1}.`} className="bg-white" readOnly /></td>
                        <td className="p-2"><Input value={r.adItemCode || `AD000${i + 1}`} className="bg-white" readOnly /></td>
                        <td className="p-2"><Input value={r.itemCode || ""} className="bg-white" readOnly /></td>
                        <td className="p-2"><Input value={r.itemName || ""} className="bg-white" readOnly /></td>
                        <td className="p-2"><Input value={r.companyName || ""} className="bg-white" readOnly /></td>
                        <td className="p-2"><Input value={r.hsnCode || ""} className="bg-white" readOnly /></td>
                        <td className="p-2"><Input value={r.packing || ""} className="bg-white" readOnly /></td>
                        <td className="p-2"><Input value={r.lot || ""} onChange={(e) => handleItemChange(i, "lot", e.target.value, 'return')} className="bg-white" /></td>
                        <td className="p-2"><Input value={r.mrp || ""} onChange={(e) => handleItemChange(i, "mrp", e.target.value, 'return')} type="number" className="bg-white" /></td>
                        <td className="p-2"><Input value={r.qty || ""} onChange={(e) => handleItemChange(i, "qty", e.target.value, 'return')} type="number" className="bg-white" /></td>
                        <td className="p-2"><Input value={r.cd || ""} onChange={(e) => handleItemChange(i, "cd", e.target.value, 'return')} type="number" className="bg-white" /></td>
                        <td className="p-2"><Input value={r.netAmount || ""} readOnly className="bg-white" /></td>
                        <td className="p-2"><Input value={r.tax || ""} onChange={(e) => handleItemChange(i, "tax", e.target.value, 'return')} type="number" className="bg-white" /></td>
                        <td className="p-2 text-center flex items-center justify-center gap-2">
                          <RotateCcw
                            size={16}
                            className="text-green-600 cursor-pointer hover:scale-110 transition"
                            // @ts-ignore
                            title="Move back to Sale"
                            onClick={() => handleUndoReturn(r)}
                          />
                          <Trash2
                            size={16}
                            className="cursor-pointer text-[#E57373] hover:scale-110 transition"
                            onClick={() => handleRemoveItem(r.id, 'return')}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="flex justify-center items-center mt-8 gap-4">
              <Button
                onClick={() => {
                  setScanBarcodeDialogOpen(true);
                  setCameraError(null);
                  setCameraFacingMode("environment");
                  setManualBarcodeInput("");
                }}
                className="bg-[#E98C81] hover:bg-[#df7c72] text-white rounded-full px-6 py-2 font-medium shadow-sm flex items-center gap-2"
              >
                <Barcode size={18} />
                Scan Barcode
              </Button>
              <Button
                onClick={handleAddSaleRow}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full px-6 py-2 font-medium shadow-sm"
              >
                Add Row
              </Button>
              <Button
                onClick={handleSaveBill}
                disabled={isSaving}
                className="bg-[#E98C81] hover:bg-[#df7c72] text-white rounded-full px-10 py-3 font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving
                  ? "Saving..."
                  : editingBillId
                    ? "Update Bill"
                    : "Continue"}
              </Button>
            </div>

            <div className="mt-6 w-80 ml-auto text-sm border border-gray-200">
              <div className="flex justify-between p-2">
                <span>AMOUNT:</span>
                <span>₹{(sl.amount + sr.amount).toFixed(2)}</span>
              </div>

              <div className="flex justify-between p-2">
                <span>DIS:</span>
                <span>₹{(sl.discount + sr.discount).toFixed(2)}</span>
              </div>

              <div className="flex justify-between p-2">
                <span>AMT AFT DIS:</span>
                <span>₹{(sl.amount + sr.amount - (sl.discount + sr.discount)).toFixed(2)}</span>
              </div>

              <div className="flex justify-between p-2">
                <span>GST:</span>
                <span>₹{(sl.tax + sr.tax).toFixed(2)}</span>
              </div>

              <div className="flex justify-between p-2 font-semibold">
                <span>Total Sale Value:</span>
                <span>₹{grossTotal.toFixed(2)}</span>
              </div>

              {sr.total > 0 && (
                <>
                  <div className={`flex justify-between p-2 ${netPayable < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Return Discount:</span>
                    <span>- ₹{sr.discount.toFixed(2)}</span>
                  </div>

                  <div className={`flex justify-between p-2 ${netPayable < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Return GST:</span>
                    <span>- ₹{sr.tax.toFixed(2)}</span>
                  </div>

                  <div className={`flex justify-between p-2 ${netPayable < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Return Value:</span>
                    <span>- ₹{sr.total.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between p-2 font-bold border-t">
                <span>{netPayable >= 0 ? "NET PAYABLE:" : "REFUND AMOUNT:"}</span>
                <span className={netPayable < 0 ? "text-green-600" : ""}>
                  ₹{Math.abs(netPayable).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          );
        })()}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
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

      {/* Scan Barcode Dialog */}
      <Dialog open={scanBarcodeDialogOpen} onOpenChange={setScanBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
            <DialogDescription>
              Point your camera at a barcode or enter the code manually below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Manual Input - Priority for better UX */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Enter Barcode Manually
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Type barcode number here"
                  value={manualBarcodeInput}
                  onChange={(e) => setManualBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleManualBarcodeSubmit();
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  onClick={handleManualBarcodeSubmit}
                  className="bg-[#E98C81] hover:bg-[#df7c72] text-white px-6"
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-500 font-medium">OR USE CAMERA</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            {/* Camera Scanner */}
            <div className="py-4 h-[300px] sm:h-[400px] w-full bg-black rounded-md overflow-hidden relative flex items-center justify-center">
              {cameraError ? (
                <div className="text-white text-center p-6 space-y-3">
                  <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
                    <p className="font-semibold mb-2">⚠️ Camera Error</p>
                    <p className="text-sm text-white/90">{cameraError}</p>
                  </div>
                  <p className="text-xs text-white/60">
                    Please use the manual input above
                  </p>
                </div>
              ) : (
                <>
                  <div className="absolute top-2 left-2 right-2 bg-black/50 text-white text-xs p-2 rounded z-10 text-center">
                    📷 Point camera at barcode
                  </div>
                  {scanBarcodeDialogOpen && (
                    <BarcodeScannerWrapper
                      onUpdate={handleBarcodeScan}
                      onError={(err) => {
                        console.error("Camera error:", err);
                        // @ts-ignore
                        const errMsg = err?.message || err?.toString() || "";
                        if (errMsg.includes("not found") || errMsg.includes("NotFoundError") || errMsg.includes("OverconstrainedError")) {
                          if (cameraFacingMode === "environment") {
                            setCameraFacingMode("user");
                            toast.info("Switching to front camera/webcam...");
                            return;
                          }
                        }
                        setCameraError(errMsg || "Camera not available");
                      }}
                      facingMode={cameraFacingMode}
                    />
                  )}
                </>
              )}
            </div>

            {!cameraError && (
              <p className="text-xs text-center text-gray-500">
                💡 Tip: Hold the barcode steady in good lighting for best results
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScanBarcodeDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Details Modal */}
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

      {/* Payment Status Confirmation Dialog */}
      <Dialog
        open={statusConfirmationOpen}
        onOpenChange={setStatusConfirmationOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the payment status to{" "}
              <strong>{pendingStatusUpdate?.status}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusConfirmationOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPaymentStatusChange}
              className="bg-[#E98C81] hover:bg-[#d37b70] text-white"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitConfirmationOpen} onOpenChange={setExitConfirmationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Exit</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit this page?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExitConfirmationOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setExitConfirmationOpen(false);
                navigate("/bills", { state: { openAddCustomer: true } });
              }}
              className="bg-[#E98C81] hover:bg-[#d37b70] text-white"
            >
              Yes, Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}