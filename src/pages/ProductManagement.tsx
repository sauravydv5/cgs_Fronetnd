import React, { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import BarcodeScanner from "react-qr-barcode-scanner";
import { parse } from "papaparse";
import Barcode from "react-barcode";
import {
  addProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
  getLowStockProducts,
} from "@/adminApi/productApi";
import { toast } from "sonner";
import {
  addCategory,
  addSubCategory,
  getAllCategories,
  getAllSubCategories,
} from "@/adminApi/categoryApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  MoreVertical,
  Plus,
  ImageIcon,
  Barcode as BarcodeIcon,
  Download,
  Upload,
  Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialColumns = [
  { id: "sno", label: "S.No" },
  { id: "code", label: "Item Code" },
  { id: "brand", label: "Brand Name" },
  { id: "category", label: "Category" },
  { id: "subcategory", label: "Sub Category" },
  { id: "thumbnail", label: "Thumbnail" },
  { id: "name", label: "Name" },
  { id: "quantity", label: "Quantity" },
  { id: "price", label: "Price" },
  { id: "stock", label: "Stock" },
  { id: "barcode", label: "Barcode" },
  { id: "actions", label: "Actions" },
];

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
      className="px-6 py-4 font-medium cursor-grab"
    >
      {column.label}
    </th>
  );
};

export default function ProductManagement() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [addSubCategoryDialogOpen, setAddSubCategoryDialogOpen] =
    useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [addingProduct, setAddingProduct] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [productToView, setProductToView] = useState<any>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<any>(null);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [scanBarcodeDialogOpen, setScanBarcodeDialogOpen] = useState(false);
  // const [scanBarcodeDialogOpen, setScanBarcodeDialogOpen] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const barcodeRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    brandName: "",
    productName: "",
    category: "",
    subcategory: "",
    mrp: "",
    costPrice: "",
    stock: "",
    itemCode: "",
    gst: "",
    hsnCode: "",
    size: "",
    discount: "",
    packSize: "",
    image: "",
    description: "",
  });
  const [errors, setErrors] = useState<any>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("productTableColumnOrder_v2");
    if (savedOrder) {
      try {
        const savedColumns = JSON.parse(savedOrder);
        const savedColumnIds = new Set(savedColumns.map((c: any) => c.id));
        const missingColumns = initialColumns.filter(
          (c) => !savedColumnIds.has(c.id)
        );

        const allColumns = [...savedColumns, ...missingColumns];

        // Force 'sno' to be the first column always
        const snoColumn = allColumns.find((c) => c.id === "sno");
        const otherColumns = allColumns.filter((c) => c.id !== "sno");

        return snoColumn ? [snoColumn, ...otherColumns] : allColumns;
      } catch (e) {
        return initialColumns;
      }
    }
    return initialColumns;
  });
  const itemsPerPage = 10;
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      (product.productName || "").toLowerCase().includes(query) ||
      (product.brandName || "").toLowerCase().includes(query) ||
      (product.itemCode || "").toLowerCase().includes(query) ||
      (product.category?.name || "").toLowerCase().includes(query)
    );
  });

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredProducts.length);

  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  useEffect(() => {
    localStorage.setItem("productTableColumnOrder_v2", JSON.stringify(columns));
  }, [columns]);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      // @ts-ignore
      const response = await getAllProducts({ limit: 10000 });

      let productData = [];
      let count = 0;

      if (response.data?.data?.rows && Array.isArray(response.data.data.rows)) {
        productData = response.data.data.rows;
        count = response.data.data.count || productData.length;
      } else if (
        response.data?.data?.products &&
        Array.isArray(response.data.data.products)
      ) {
        productData = response.data.data.products;
        count = response.data.data.total || productData.length;
      } else if (response.data?.rows && Array.isArray(response.data.rows)) {
        productData = response.data.rows;
        count = response.data.count || productData.length;
      } else if (
        response.data?.products &&
        Array.isArray(response.data.products)
      ) {
        productData = response.data.products;
        count = response.data.total || productData.length;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        productData = response.data.data;
        count = response.data.count || productData.length;
      } else if (Array.isArray(response.data)) {
        productData = response.data;
        count = productData.length;
      } else if (response.data?.result && Array.isArray(response.data.result)) {
        productData = response.data.result;
        count = response.data.total || productData.length;
      } else if (response.data?.items && Array.isArray(response.data.items)) {
        productData = response.data.items;
        count = response.data.total || productData.length;
      }

      productData.sort((a, b) => {
        const stockA = a.stock ?? 0;
        const stockB = b.stock ?? 0;
        if (stockA !== stockB) return stockA - stockB;
        return (a.itemCode || "").localeCompare(b.itemCode || "");
      });

      setProducts(productData);
      setTotalProducts(count);
    } catch (error: any) {
      toast.error(
        `Failed to fetch products: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      // Request a large limit so we get all categories from the server
      // @ts-ignore
      const res = await getAllCategories({ limit: 10000 });
      let categoryData: any[] = [];

      if (res?.data?.data?.rows && Array.isArray(res.data.data.rows)) {
        categoryData = res.data.data.rows;
      } else if (res?.data?.rows && Array.isArray(res.data.rows)) {
        categoryData = res.data.rows;
      } else if (res?.data?.categories && Array.isArray(res.data.categories)) {
        categoryData = res.data.categories;
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        categoryData = res.data.data;
      } else if (Array.isArray(res?.data)) {
        categoryData = res.data;
      }

      setCategories(categoryData);
    } catch (error) {
      toast.error("Failed to fetch categories.");
    }
  }, []);

  const fetchSubCategories = useCallback(async () => {
    try {
      // @ts-ignore
      const res = await getAllSubCategories({ limit: 10000 });
      let subCategoryData: any[] = [];
      if (res?.data?.data?.rows && Array.isArray(res.data.data.rows)) {
        subCategoryData = res.data.data.rows;
      } else if (res?.data?.rows && Array.isArray(res.data.rows)) {
        subCategoryData = res.data.rows;
      } else if (
        res?.data?.subcategories &&
        Array.isArray(res.data.subcategories)
      ) {
        subCategoryData = res.data.subcategories;
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        subCategoryData = res.data.data;
      } else if (Array.isArray(res?.data)) {
        subCategoryData = res.data;
      }
      setSubCategories(subCategoryData);
    } catch (error) {
      toast.error("Failed to fetch sub-categories.");
    }
  }, []);

  const fetchLowStockSettings = useCallback(async () => {
    try {
      const res = await getLowStockProducts();
      if (res?.data?.status && res?.data?.data?.settings) {
        setLowStockThreshold(res.data.data.settings.threshold ?? 10);
      }
    } catch (err) {
      console.error("Failed to fetch low stock settings:", err);
    }
  }, []);

  const fetchLowStock = async () => {
    try {
      const res = await getLowStockProducts();
      if (res?.data?.data?.products) {
        setLowStockProducts(Array.isArray(res.data.data.products) ? res.data.data.products : []);
      } else if (res?.data?.products) {
        setLowStockProducts(Array.isArray(res.data.products) ? res.data.products : []);
      } else if (Array.isArray(res?.data)) {
        setLowStockProducts(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch low stock products:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSubCategories();
    fetchLowStockSettings();
    fetchLowStock();
  }, [fetchProducts, fetchCategories, fetchSubCategories, fetchLowStockSettings]);

  // Helper function to get product threshold from lowStockProducts
  const getProductThreshold = (productId: string) => {
    const product = lowStockProducts.find((p: any) => p._id === productId);
    return product?.lowStockThreshold ?? 10;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((items: any[]) => {
        const oldIndex = items.findIndex(
          (item) => (item.id || item._id) === active.id
        );
        const newIndex = items.findIndex(
          (item) => (item.id || item._id) === over.id
        );
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const validate = () => {
    const requiredFields = {
      productName: "Product Name",
      category: "Category",
      mrp: "MRP",
      costPrice: "Cost Price",
      stock: "Stock",
      gst: "GST",
    };
    const newErrors: any = {};

    Object.entries(requiredFields).forEach(([field, label]) => {
      const value = formData[field as keyof typeof formData];
      if (!value || String(value).trim() === "") {
        newErrors[field] = `${label} is required.`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.warning("Please fill all required fields correctly.");
      return;
    }

    setAddingProduct(true);
    try {
      const payload: any = {
        brandName: formData.brandName,
        productName: formData.productName,
        category: formData.category,
        subcategory: formData.subcategory || null,
        mrp: parseFloat(formData.mrp),
        costPrice: parseFloat(formData.costPrice),
        stock: parseInt(formData.stock),
        itemCode: formData.itemCode,
        gst: parseFloat(formData.gst),
        hsnCode: formData.hsnCode,
        size: formData.size,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        packSize: formData.packSize,
        description: formData.description,
      };

      let imageData = formData.image || "";
      if (imageFile && imageFile instanceof File) {
        imageData = imagePreview || "";
      }

      payload.image = imageData;

      let response;
      if (editingProduct) {
        const productId = editingProduct._id || editingProduct.id;
        response = await updateProduct({ id: productId, data: payload });
      } else {
        response = await addProduct({ data: payload });
      }

      if (
        response.data?.status === true ||
        [200, 201].includes(response.status)
      ) {
        toast.success(
          editingProduct
            ? "Product updated successfully!"
            : "Product added successfully!"
        );
        setShowForm(false);

        setFormData({
          brandName: "",
          productName: "",
          category: "",
          subcategory: "",
          mrp: "",
          costPrice: "",
          stock: "",
          itemCode: "",
          gst: "",
          hsnCode: "",
          size: "",
          discount: "",
          packSize: "",
          image: "",
          description: "",
        });
        setErrors({});
        setImagePreview(null);
        setImageFile(null);

        await fetchProducts();
      } else {
        toast.error(response.data?.message || "Failed to add product.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred.";
      toast.error(errorMessage);
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteClick = (product: any) => {
    setProductToDelete(product);
    setDeleteConfirmationOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    const productId = productToDelete._id || productToDelete.id;

    if (!productId) {
      toast.error("Cannot delete product: ID is missing.");
      return;
    }

    try {
      const response = await deleteProduct({ id: productId });
      if (response.data?.status === true || response.status === 200) {
        toast.success("Product deleted successfully!");
        setDeleteConfirmationOpen(false);
        setProductToDelete(null);
        await fetchProducts();
      } else {
        toast.error(response.data?.message || "Failed to delete product.");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "An error occurred while deleting the product."
      );
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.warning("Please enter a category name.");
      return;
    }

    const isDuplicate = categories.some(
      (cat) => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast.error("Category already exists.");
      return;
    }

    try {
      await addCategory({
        name: newCategoryName,
      });
      toast.success("Category added successfully!");
      setAddCategoryDialogOpen(false);
      setNewCategoryName("");
      await fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add category");
    }
  };

  const handleAddSubCategory = async () => {
    if (!parentCategoryId) {
      toast.warning("Please select a parent category.");
      return;
    }
    if (!newSubCategoryName.trim()) {
      toast.warning("Please enter a sub-category name.");
      return;
    }

    const isDuplicate = subCategories.some((sub) => {
      const p = sub.parent || sub.category;
      const pId = typeof p === "object" ? p._id : p;
      return pId === parentCategoryId && sub.name.toLowerCase() === newSubCategoryName.trim().toLowerCase();
    });
    if (isDuplicate) {
      toast.error("Sub-category already exists.");
      return;
    }

    try {
      // Call addSubCategory API
      await addSubCategory({
        name: newSubCategoryName,
        category: parentCategoryId,
      });
      toast.success("Sub-category added successfully!");
      setAddSubCategoryDialogOpen(false);
      setNewSubCategoryName("");
      setParentCategoryId("");
      await fetchCategories();
      await fetchSubCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add sub-category");
    }
  };

  const handleViewDetails = (product: any) => {
    setProductToView(product);
    setViewDetailsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      brandName: "",
      productName: "",
      category: "",
      subcategory: "",
      mrp: "",
      costPrice: "",
      stock: "",
      itemCode: "",
      gst: "",
      hsnCode: "",
      size: "",
      discount: "",
      packSize: "",
      image: "",
      description: "",
    });
    setImagePreview(null);
    setImageFile(null);
    setErrors({});
    setEditingProduct(null);
  };

  // Update handleEdit function
  const handleEdit = (product: any) => {
    setEditingProduct(product);

    const pCat = product.category;
    const sCat = product.subcategory;

    let parentCatId = "";
    let subCatVal = "";

    // 1. Try to get IDs directly
    if (pCat) parentCatId = typeof pCat === 'object' ? pCat._id : pCat;
    if (sCat) {
      if (typeof sCat === 'object' && sCat.name) {
        subCatVal = sCat.name;
      } else if (typeof sCat === 'string') {
        const found = subCategories.find(s => s._id === sCat);
        if (found) subCatVal = found.name;
      }
    }

    // 2. If we have a subcategory but no parent, try to find parent from subcategory list
    if (!parentCatId && subCatVal) {
      const sub = subCategories.find(s => s.name === subCatVal);
      if (sub) {
        const p = sub.parent || sub.category;
        if (p) parentCatId = typeof p === 'object' ? p._id : p;
      }
    }

    // 3. Fallback: Check if the 'category' field actually holds a subcategory ID (legacy/mixed data)
    if (!subCatVal && parentCatId) {
      const subAsCat = subCategories.find(s => s._id === parentCatId);
      if (subAsCat) {
        subCatVal = subAsCat.name;
        const p = subAsCat.parent || subAsCat.category;
        if (p) parentCatId = typeof p === 'object' ? p._id : p;
      }
    }

    setFormData({
      brandName: product.brandName || "",
      productName: product.productName || "",
      category: parentCatId,
      subcategory: subCatVal || "",
      mrp: product.mrp?.toString() || "",
      costPrice: product.costPrice?.toString() || "",
      stock: product.stock?.toString() || "",
      itemCode: product.itemCode || "",
      gst: product.gst?.toString() || "",
      hsnCode: product.hsnCode || "",
      size: product.size || "",
      discount: product.discount?.toString() || "",
      packSize: product.packSize || "",
      image: product.image || "",
      description: product.description || "",
    });
    setImagePreview(product.image || null);
    setImageFile(null);
    setShowForm(true);
  };

  const handleGenerateBarcode = (product: any) => {
    setBarcodeProduct(product);
    setBarcodeDialogOpen(true);
  };

  const downloadBarcode = () => {
    const svgNode = barcodeRef.current?.querySelector("svg");
    if (!svgNode) return;

    const svgData = new XMLSerializer().serializeToString(svgNode);
    const canvas = document.createElement("canvas");
    const svgSize = svgNode.getBoundingClientRect();
    canvas.width = svgSize.width;
    canvas.height = svgSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `barcode-${barcodeProduct?.itemCode || "product"}.png`;
      link.href = url;
      link.click();
      toast.success("Barcode saved successfully");
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const printBarcode = () => {
    const printContent = barcodeRef.current?.innerHTML;
    if (!printContent) return;

    const itemCode = barcodeProduct?.itemCode || "product";
    // Sanitize filename to remove invalid characters
    const fileName = `barcode-${itemCode.replace(/[^a-z0-9-_]/gi, "-")}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            @page {
              margin: 20mm;
            }
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .container {
              text-align: center;
            }
            .product-name {
              margin-top: 10px;
              font-weight: bold;
              font-size: 18px;
            }
            .item-code {
              margin-top: 5px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${printContent}
            <div class="product-name">${barcodeProduct?.productName || ""}</div>
            <div class="item-code">Item Code: ${itemCode}</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");

    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print.");
    } else {
      const checkWindowClosed = setInterval(() => {
        if (printWindow.closed) {
          clearInterval(checkWindowClosed);
          toast.success("Print/Save successfully");
          setBarcodeDialogOpen(false);
        }
      }, 500);
    }

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData((prev) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: "" }));
  };

  const columnIds = columns.map((c) => c.id);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value, subcategory: "" }));
    setErrors((prev: any) => ({ ...prev, category: undefined }));
  };

  const handleSubCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, subcategory: value }));
  };

  const handleBulkUpload = (file: File) => {
    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const productsToUpload = results.data;
        toast.info(`Uploading ${productsToUpload.length} products...`);

        // Here you would loop through productsToUpload and call your addProduct API
        // For demonstration, I'll just log them.
        console.log("Products to upload:", productsToUpload);

        try {
          // Example of how you might call the API in a loop
          for (const product of productsToUpload) {
            let categoryId = product.category;
            if (categoryId) {
              const matchedCategory = categories.find(
                (c) =>
                  c.name.toLowerCase() === String(categoryId).trim().toLowerCase() ||
                  c._id === String(categoryId).trim()
              );
              if (matchedCategory) {
                categoryId = matchedCategory._id;
              }
            }

            let subCategoryId = product.subcategory;
            if (subCategoryId) {
              const matchedSubCategory = subCategories.find(
                (s) =>
                  s.name.toLowerCase() === String(subCategoryId).trim().toLowerCase() ||
                  s._id === String(subCategoryId).trim()
              );
              if (matchedSubCategory) {
                subCategoryId = matchedSubCategory._id;
              }
            }

            // Assuming your CSV has an 'image' column with the URL
            const payload = {
              ...product,
              category: categoryId,
              subcategory: subCategoryId,
              // Ensure numeric fields are parsed correctly
              mrp: parseFloat(product.mrp) || 0,
              costPrice: parseFloat(product.costPrice) || 0,
              stock: parseInt(product.stock) || 0,
              gst: parseFloat(product.gst) || 0,
              discount: parseFloat(product.discount) || 0,
            };
            // The 'image' field from the CSV (which is a URL) will be part of the payload
            await addProduct({ data: payload });
          }
          toast.success("Bulk upload completed successfully!");
          await fetchProducts(); // Refresh products list
        } catch (error) {
          toast.error("An error occurred during bulk upload.");
          console.error("Bulk upload error:", error);
        }

        setBulkUploadDialogOpen(false);
      },
      error: (error: any) => {
        toast.error("Failed to parse CSV file: " + error.message);
      },
    });
  };

  const handleBarcodeScan = (err, result) => {
    if (result) {
      const scannedCode = result.text;
      setScanBarcodeDialogOpen(false); // Close scanner immediately
      const foundProduct = products.find((p) => p.itemCode === scannedCode);
      if (foundProduct) {
        toast.success(`Product "${foundProduct.productName}" found. Opening edit form.`);
        handleEdit(foundProduct);
      } else {
        toast.info(`Product with code "${scannedCode}" not found. Opening add form.`);
        resetForm();
        setFormData((prev) => ({ ...prev, itemCode: scannedCode }));
        setShowForm(true);
      }
    }
    // Errors can be ignored as the scanner will keep trying.
  };

  const getSubCategories = () => {
    return [];
  };
  // Update renderCell function for category and subcategory
  const renderCell = (product: any, columnId: string, index: number) => {
    switch (columnId) {
      case "sno":
        return (
          <td key={columnId} className="px-6 py-4">
            {startIndex + index + 1}
          </td>
        );
      case "code":
        return (
          <td key={columnId} className="px-6 py-4">
            {product.itemCode || "N/A"}
          </td>
        );
      case "brand":
        return (
          <td key={columnId} className="px-6 py-4">
            {product.brandName || "N/A"}
          </td>
        );

      case "category":
        const pCat = product.category;
        const sCatRef = product.subcategory;
        
        // If we have a direct category object, use it
        if (pCat && typeof pCat === 'object' && pCat.name) {
             return <td key={columnId} className="px-6 py-4">{pCat.name}</td>;
        }

        // If category is null/ID, but we have a subcategory, try to find parent from subcategory
        if (sCatRef) {
             const sId = typeof sCatRef === 'object' ? sCatRef._id : sCatRef;
             const sub = subCategories.find(s => s._id === sId);
             if (sub) {
                 const p = sub.parent || sub.category;
                 const pId = (p && typeof p === 'object') ? p._id : p;
                 const parent = categories.find(c => c._id === pId);
                 if (parent) return <td key={columnId} className="px-6 py-4">{parent.name}</td>;
             }
        }
        
        // Fallback: Check if pCat ID is actually a subcategory ID
        if (pCat) {
             const pId = typeof pCat === 'object' ? pCat._id : pCat;
             const subAsCat = subCategories.find(s => s._id === pId);
             if (subAsCat) {
                 const p = subAsCat.parent || subAsCat.category;
                 const pIdReal = (p && typeof p === 'object') ? p._id : p;
                 const parent = categories.find(c => c._id === pIdReal);
                 if (parent) return <td key={columnId} className="px-6 py-4">{parent.name}</td>;
             }
             // If it's just a category ID, try to find it in categories list
             const cat = categories.find(c => c._id === pId);
             if (cat) return <td key={columnId} className="px-6 py-4">{cat.name}</td>;
        }
        
        return <td key={columnId} className="px-6 py-4">N/A</td>;

      case "subcategory":
        const sCat = product.category;
        const realSub = product.subcategory;

        // If we have a direct subcategory object/ID
        if (realSub) {
             if (typeof realSub === 'object' && realSub.name) return <td key={columnId} className="px-6 py-4">{realSub.name}</td>;
             const sub = subCategories.find(s => s._id === realSub);
             if (sub) return <td key={columnId} className="px-6 py-4">{sub.name}</td>;
        }
        
        // Fallback: Check if 'category' field holds the subcategory
        if (sCat) {
             const sId = typeof sCat === 'object' ? sCat._id : sCat;
             const subObj = subCategories.find(s => s._id === sId);
             if (subObj) return <td key={columnId} className="px-6 py-4">{subObj.name}</td>;
        }
        
        return <td key={columnId} className="px-6 py-4">N/A</td>;

      case "thumbnail":
        return (
          <td key={columnId} className="px-6 py-4">
            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.productName}
                  className="w-full h-full object-cover"
                />
              ) : (
                "📦"
              )}
            </div>
          </td>
        );
      case "name":
        return (
          <td key={columnId} className="px-6 py-4">
            {product.productName || "N/A"}
          </td>
        );
      case "quantity":
        return (
          <td key={columnId} className="px-6 py-4">
            {product.stock || 0}
          </td>
        );
      case "price":
        return (
          <td key={columnId} className="px-6 py-4">
            ₹{product.mrp || 0}
          </td>
        );
      case "stock":
        const isLowStock = (product.stock ?? 0) <= getProductThreshold(product._id);
        return (
          <td key={columnId} className="px-6 py-4">
            <span
              className={
                isLowStock ? "text-red-600 font-medium" : "text-green-600"
              }
            >
              {product.stock > 0
                ? isLowStock
                  ? `Low Stock (${product.stock})`
                  : "In-stock"
                : "Out of stock"}
            </span>
          </td>
        );
      case "barcode":
        return (
          <td key={columnId} className="px-6 py-4">
            <Button
              size="sm"
              onClick={() => handleGenerateBarcode(product)}
              className="bg-[#E98C81] hover:bg-[#d97a71] text-white transition-colors"
              disabled={!product.itemCode}
            >
              Generate Barcode
            </Button>
          </td>
        );
      case "actions":
        return (
          <td key={columnId} className="px-6 py-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-muted rounded">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => handleEdit(product)}>
                  Edit Product
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-error"
                  onClick={() => handleDeleteClick(product)}
                >
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleViewDetails(product)}>
                  View Detail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        );
      default:
        return <td key={columnId} />;
    }
  };

  return (
    <AdminLayout title="Product Management">
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
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4 items-center">
          <Button
            className="rounded-full text-white hover:opacity-90 border-0 font-bold"
            style={{ background: "linear-gradient(180deg, #F1D6CF 0%, #EDA093 100%)" }}
            onClick={() => setAddCategoryDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
          <Button
            className="rounded-full text-white hover:opacity-90 border-0 font-bold"
            style={{ background: "linear-gradient(180deg, #F1D6CF 0%, #EDA093 100%)" }}
            onClick={() => setAddSubCategoryDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Sub-Category
          </Button>
          <Button
            className="rounded-full text-white hover:opacity-90 border-0 font-bold"
            style={{ background: "linear-gradient(180deg, #F1D6CF 0%, #EDA093 100%)" }}
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
          <Button
            className="rounded-full text-white hover:opacity-90 border-0 font-bold"
            style={{ background: "linear-gradient(180deg, #F1D6CF 0%, #EDA093 100%)" }}
            onClick={() => setScanBarcodeDialogOpen(true)}
          >
            <BarcodeIcon className="w-4 h-4 mr-2" />
            Scan Barcode
          </Button>
          <Button
            className="rounded-full text-white hover:opacity-90 border-0 font-bold"
            style={{ background: "linear-gradient(180deg, #F1D6CF 0%, #EDA093 100%)" }}
            onClick={() => setBulkUploadDialogOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, brand, code, or category"
              className="pl-10 bg-[#FEEEE5] border-0 rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full">
                <thead className="border-b border-border">
                  <SortableContext
                    items={columnIds}
                    strategy={horizontalListSortingStrategy}
                  >
                    <tr className="text-left text-sm text-muted-foreground">
                      {columns.map((column) => (
                        <SortableHeader key={column.id} column={column} />
                      ))}
                    </tr>
                  </SortableContext>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingProducts ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="text-center py-10"
                      >
                        Loading products...
                      </td>
                    </tr>
                  ) : currentProducts.length > 0 ? (
                    currentProducts.map((product, index) => (
                      <tr
                        key={product.id || product._id}
                        className="text-sm hover:bg-muted/50"
                      >
                        {columns.map((col) =>
                          renderCell(product, col.id, index)
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="text-center py-10"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-muted-foreground">
                            {searchQuery
                              ? "No products match your search."
                              : "No products found."}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              resetForm();
                              setShowForm(true);
                            }}
                          >
                            Add Your First Product
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DndContext>
          </div>

          {products.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {endIndex} of{" "}
                {filteredProducts.length} entries
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Product Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Make changes to the product details here."
                : "Enter details for the new product."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto px-1">
            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Product Preview"
                      className="w-24 h-24 object-cover rounded-md border"
                    />
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <span className="text-primary font-medium text-sm">
                        Click to upload
                      </span>
                    </>
                  )}
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error hover:text-error mt-2"
                    onClick={removeImage}
                  >
                    Remove Image
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Product Name", name: "productName", required: true },
                { label: "Brand Name", name: "brandName" },
                { label: "Category", name: "category", required: true },
                {
                  label: "MRP",
                  name: "mrp",
                  type: "number",
                  required: true,
                  placeholder: "e.g., 199.99",
                },
                {
                  label: "Cost Price",
                  name: "costPrice",
                  type: "number",
                  required: true,
                  placeholder: "Cost Price",
                },
                {
                  label: "Stock",
                  name: "stock",
                  type: "number",
                  required: true,
                  placeholder: "e.g., 100",
                },
                {
                  label: "Item Code",
                  name: "itemCode",
                  placeholder: "for eg., CGS1234",
                },
                {
                  label: "GST %",
                  name: "gst",
                  type: "number",
                  required: true,
                  placeholder: "e.g., 18",
                },
                {
                  label: "HSN Code",
                  name: "hsnCode",
                  placeholder: "e.g., 12345678",
                },
                {
                  label: "Size & Weight",
                  name: "size",
                  placeholder: "e.g., Small, Medium, Large",
                },
                {
                  label: "Discount %",
                  name: "discount",
                  type: "number",
                  placeholder: "e.g., 10",
                },
                {
                  label: "Pack Size",
                  name: "packSize",
                  placeholder: "e.g., 1, 6, 12",
                },
              ].map((field) => (
                <div
                  key={field.name}
                  className={`grid gap-2 ${
                    field.name === "category" ? "sm:col-span-2" : ""
                  }`}
                >
                  {field.name !== "category" && (
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && (
                        <span className="text-error ml-1">*</span>
                      )}
                    </Label>
                  )}
                  {field.name === "category" ? (
                    <>
                      <div className="sm:col-span-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>
                              Category{" "}
                              <span className="text-error ml-1">*</span>
                            </Label>
                            <Select
                              onValueChange={handleCategoryChange}
                              value={formData.category}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent className="category-select-content max-h-[360px] overflow-y-auto">
                                {categories
                                  .filter((c) => !c.parent)
                                  .map((cat) => (
                                    <SelectItem key={cat._id} value={cat._id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {errors.category && (
                              <p className="text-xs text-error mt-1">
                                {errors.category}
                              </p>
                            )}
                          </div>
                          <div className="grid gap-2">
                            <Label>Sub Category</Label>
                            <Select
                              onValueChange={handleSubCategoryChange}
                              value={formData.subcategory}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a sub-category" />
                              </SelectTrigger>
                              <SelectContent className="category-select-content max-h-[360px] overflow-y-auto">
                                {subCategories.map((sub) => (
                                  <SelectItem key={sub._id} value={sub.name}>
                                    {sub.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type || "text"}
                      placeholder={
                        field.placeholder ||
                        `Enter ${field.label.toLowerCase()}`
                      }
                      value={formData[field.name as keyof typeof formData]}
                      min={field.type === "number" ? 0 : undefined}
                      onChange={handleFormChange}
                    />
                  )}
                  {field.name !== "category" && errors[field.name] && (
                    <p className="text-xs text-error">{errors[field.name]}</p>
                  )}
                </div>
              ))}
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter product description"
                  value={formData.description}
                  onChange={handleFormChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={addingProduct}>
              {addingProduct
                ? editingProduct
                  ? "Updating..."
                  : "Adding..."
                : editingProduct
                ? "Update Product"
                : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog
        open={addCategoryDialogOpen}
        onOpenChange={setAddCategoryDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Create a new parent category for your products.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddCategoryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Save Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Sub-Category Dialog */}
      <Dialog
        open={addSubCategoryDialogOpen}
        onOpenChange={setAddSubCategoryDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Sub-Category</DialogTitle>
            <DialogDescription>
              Create a new sub-category under a parent category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="parent-category">Parent Category</Label>
              <Select
                onValueChange={setParentCategoryId}
                value={parentCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent className="category-select-content max-h-[360px] overflow-y-auto">
                  {categories
                    .filter((c) => !c.parent)
                    .map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sub-category-name">Sub-Category Name</Label>
              <Input
                id="sub-category-name"
                placeholder="Enter sub-category name"
                value={newSubCategoryName}
                onChange={(e) => setNewSubCategoryName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddSubCategoryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddSubCategory}>Save Sub-Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Product Details Dialog */}
      {/* View Product Details Dialog */}
      <Dialog
        open={viewDetailsDialogOpen}
        onOpenChange={setViewDetailsDialogOpen}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Detailed information about{" "}
              <span className="font-bold">{productToView?.productName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto px-1">
            {productToView && (
              <div className="grid md:grid-cols-3 gap-8">
                {/* Left Column: Image & Barcode */}
                <div className="md:col-span-1 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">
                      Product Image
                    </Label>
                    {productToView.image ? (
                      <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                        <img
                          src={productToView.image}
                          alt={productToView.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center border">
                        <ImageIcon className="w-16 h-16 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Barcode</Label>
                    <div className="bg-white p-4 rounded-lg border flex flex-col items-center">
                      <Barcode
                        value={productToView.itemCode || "NO-CODE"}
                        width={1.5}
                        height={60}
                        fontSize={14}
                        displayValue={false}
                      />
                      <p className="mt-2 text-xs text-muted-foreground tracking-widest">
                        {productToView.itemCode || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Details */}
                <div className="md:col-span-2 space-y-6">
                  {/* Header */}
                  <div>
                    <Badge
                      variant={
                        productToView.stock > 0 ? "default" : "destructive"
                      }
                      className={
                        productToView.stock > 0
                          ? "bg-green-100 text-green-800"
                          : ""
                      }
                    >
                      {productToView.stock > 0 ? "In Stock" : "Out of Stock"}
                    </Badge>
                    <h2 className="text-2xl font-bold mt-2">
                      {productToView.productName}
                    </h2>
                    <p className="text-muted-foreground">
                      {productToView.brandName || "No Brand"}
                    </p>
                  </div>

                  {/* General Info */}
                  {/* In View Details Dialog - General Information section */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">General Information</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Category</span>
                        <span className="font-medium">
                          {productToView?.category?.name || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">
                          Sub Category
                        </span>
                        <span className="font-medium">
                          {productToView?.subcategory?.name || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Item Code</span>
                        <span className="font-medium">
                          {productToView?.itemCode || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">HSN Code</span>
                        <span className="font-medium">
                          {productToView?.hsnCode || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Size & Weight</span>
                        <span className="font-medium">
                          {productToView?.size || "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Pack Size</span>
                        <span className="font-medium">
                          {productToView?.packSize || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Inventory */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Pricing & Inventory</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">MRP</span>
                        <span className="font-medium">
                          ₹{productToView.mrp?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">
                          Cost Price
                        </span>
                        <span className="font-medium">
                          ₹{productToView.costPrice?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="font-medium">
                          {productToView.discount || "0"}%
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">GST</span>
                        <span className="font-medium">
                          {productToView.gst || "0"}%
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Stock</span>
                        <span className="font-medium">
                          {productToView.stock || "0"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {productToView.description && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground">
                        {productToView.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDetailsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmationOpen}
        onOpenChange={setDeleteConfirmationOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              product
              <span className="font-bold"> {productToDelete?.productName}</span>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmationOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Yes, delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scanBarcodeDialogOpen} onOpenChange={setScanBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
            <DialogDescription>
              Point your camera at a product's barcode or enter the code manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="py-4 h-[300px] sm:h-[400px] w-full bg-black rounded-md overflow-hidden relative flex items-center justify-center">
              <p className="text-white/50 text-sm absolute">Camera loading... Ensure permission is granted.</p>
              {scanBarcodeDialogOpen && (
                <BarcodeScanner
                  onUpdate={handleBarcodeScan}
                  onError={(err) => console.error("Camera access error: " + err)}
                  width="100%"
                  height="100%"
                  facingMode="environment"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-500 font-medium">OR ENTER MANUALLY</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            <div className="flex gap-2">
              <Input
                id="manual-barcode-input"
                placeholder="Enter barcode number"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value;
                    if (val) handleBarcodeScan(null, { text: val });
                  }
                }}
              />
              <Button
                onClick={() => {
                  const input = document.getElementById(
                    "manual-barcode-input"
                  ) as HTMLInputElement;
                  if (input && input.value) {
                    handleBarcodeScan(null, { text: input.value });
                  }
                }}
              >
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}

      <Dialog
        open={bulkUploadDialogOpen}
        onOpenChange={setBulkUploadDialogOpen}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Bulk Upload Products
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Upload a CSV file to add multiple products at once.</p>
              <div className="bg-muted p-3 rounded-md text-xs space-y-2 mt-3">
                <p className="font-semibold">Required CSV Headers:</p>
                <code className="block bg-background p-2 rounded text-[10px] overflow-x-auto">
                  productName,brandName,category,subcategory,mrp,costPrice,stock,itemCode,gst,hsnCode,size,discount,packSize,image
                </code>
                <div className="text-[11px] text-muted-foreground space-y-1 mt-2">
                  <p>
                    • <strong>Required fields:</strong> productName, category,
                    mrp, costPrice
                  </p>
                  <p>
                    • <strong>category:</strong> Use exact category name from
                    your system
                  </p>
                  <p>
                    • <strong>subcategory:</strong> Use exact sub-category name (optional)
                  </p>
                  <p>
                    • <strong>image:</strong> Provide direct image URL
                    (optional)
                  </p>
                  <p>
                    • <strong>Numbers:</strong> mrp, costPrice, stock, gst,
                    discount should be numeric
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto px-1">
            {/* Download Sample Template Button */}
            {/* <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          // onClick={downloadSampleCSV}/
          className="text-xs"
        >
          <Download className="w-3 h-3 mr-2" />
          Download Sample Template
        </Button>
      </div> */}

            {/* Upload Area */}

            <div
              className="py-12 border-2 border-dashed border-[#E98C81] bg-[#fdebe3] rounded-lg flex flex-col items-center justify-center text-center hover:bg-[#f9e5dc] transition-colors cursor-pointer relative"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add(
                  "border-[#E98C81]",
                  "bg-[#f9e5dc]"
                );
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove(
                  "border-[#E98C81]",
                  "bg-[#f9e5dc]"
                );
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove(
                  "border-[#E98C81]",
                  "bg-[#f9e5dc]"
                );
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  if (file.name.endsWith(".csv")) {
                    handleBulkUpload(file);
                  } else {
                    toast.error("Please upload a CSV file");
                  }
                }
              }}
            >
              <Upload className="w-12 h-12 text-[#E98C81] mb-3" />
              <p className="font-semibold text-lg mb-1">
                Drag & drop your CSV file here
              </p>
              <p className="text-sm text-muted-foreground mb-3">or</p>
              <Input
                type="file"
                accept=".csv"
                className="hidden"
                id="csv-upload"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleBulkUpload(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="csv-upload">
                <Button
                  type="button"
                  variant="default"
                  className="bg-[#E98C81] hover:bg-[#d67b70] cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("csv-upload")?.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Browse for a file
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-3">
                Maximum file size: 5MB
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-blue-900 mb-2">
                📋 Upload Instructions:
              </h4>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Ensure all required fields are filled in your CSV</li>
                <li>Category names must match existing categories exactly</li>
                <li>Use proper number formats (no currency symbols)</li>
                <li>Image URLs should be direct links to images</li>
                <li>Upload may take time for large files - please wait</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkUploadDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Barcode Dialog */}
      <Dialog open={barcodeDialogOpen} onOpenChange={setBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarcodeIcon className="w-5 h-5" />
              Generate Barcode
            </DialogTitle>
            <DialogDescription>
              Barcode for{" "}
              <span className="font-bold">{barcodeProduct?.productName}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6">
            {barcodeProduct && (
              <div className="flex flex-col items-center gap-4">
                <div
                  ref={barcodeRef}
                  className="bg-white p-4 rounded-lg border"
                >
                  <Barcode
                    value={barcodeProduct.itemCode || "NO-CODE"}
                    width={2}
                    height={80}
                    fontSize={16}
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">
                    {barcodeProduct.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Item Code: {barcodeProduct.itemCode}
                  </p>
                </div>

                <div className="flex gap-3 w-full">
                  <Button
                    onClick={downloadBarcode}
                    className="flex-1"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button onClick={printBarcode} className="flex-1">
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBarcodeDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
