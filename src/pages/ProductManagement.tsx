import React, { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
// import BarcodeScanner from "react-qr-barcode-scanner";
import { parse } from "papaparse";
import Barcode from "react-barcode";
import adminInstance from "@/adminApi/adminInstance";
import {
  addProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
} from "@/adminApi/productApi";
import { toast } from "sonner";
import {
  addCategory,
  addSubCategory,
  getAllCategories,
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
  { id: "code", label: "Item Code" },
  { id: "brand", label: "Brand Name" },
  { id: "category", label: "Category/Sub Category" },
  { id: "thumbnail", label: "Thumbnail" },
  { id: "name", label: "Name" },
  { id: "quantity", label: "Quantity" },
  { id: "price", label: "Price" },
  { id: "stock", label: "Stock" },
  { id: "barcode", label: "Barcode" },
  { id: "actions", label: "Actions" },
];

const SortableHeader = ({ column }: { column: { id: string; label: string } }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <th ref={setNodeRef} style={style} {...attributes} {...listeners} className="px-6 py-4 font-medium cursor-grab">
      {column.label}
    </th>
  );
};

export default function ProductManagement() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
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
  // const [scanBarcodeDialogOpen, setScanBarcodeDialogOpen] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    brandName: "",
    productName: "",
    category: "",
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
  });
  const [errors, setErrors] = useState<any>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("productTableColumnOrder");
    if (savedOrder) {
      try {
        const savedColumns = JSON.parse(savedOrder);
        const savedColumnIds = new Set(savedColumns.map((c: any) => c.id));
        const missingColumns = initialColumns.filter((c) => !savedColumnIds.has(c.id));
        return [...savedColumns, ...missingColumns];
      } catch (e) {
        return initialColumns;
      }
    }
    return initialColumns;
  });
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalProducts);

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      (product.productName || "").toLowerCase().includes(query) ||
      (product.brandName || "").toLowerCase().includes(query) ||
      (product.itemCode || "").toLowerCase().includes(query) ||
      (product.category?.name || "").toLowerCase().includes(query)
    );
  });

  const currentProducts = filteredProducts;

  useEffect(() => {
    localStorage.setItem("productTableColumnOrder", JSON.stringify(columns));
  }, [columns]);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoadingProducts(true);
    try {
      // @ts-ignore
      const response = await getAllProducts({ page, limit: itemsPerPage });

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

      productData.sort((a, b) =>
        (a.itemCode || "").localeCompare(b.itemCode || "")
      );

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
      const res = await getAllCategories();
      let categoryData = [];

      if (res?.data?.data?.rows && Array.isArray(res.data.data.rows)) {
        categoryData = res.data.data.rows;
      } else if (res?.data?.rows && Array.isArray(res.data.rows)) {
        categoryData = res.data.rows;
      } else if (Array.isArray(res?.data)) {
        categoryData = res.data;
      }

      setCategories(categoryData);
    } catch (error) {
      toast.error("Failed to fetch categories.");
    }
  }, []);

  useEffect(() => {
    fetchProducts(currentPage);
    fetchCategories();
  }, [fetchProducts, fetchCategories, currentPage]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((items: any[]) => {
        const oldIndex = items.findIndex((item) => (item.id || item._id) === active.id);
        const newIndex = items.findIndex((item) => (item.id || item._id) === over.id);
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
        mrp: parseFloat(formData.mrp),
        costPrice: parseFloat(formData.costPrice),
        stock: parseInt(formData.stock),
        itemCode: formData.itemCode,
        gst: parseFloat(formData.gst),
        hsnCode: formData.hsnCode,
        size: formData.size,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        packSize: formData.packSize,
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
        await fetchProducts(currentPage);
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
    try {
      // @ts-ignore
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
    try {
      // @ts-ignore
      await addSubCategory({
        name: newSubCategoryName,
        parent: parentCategoryId,
      });
      toast.success("Sub-category added successfully!");
      setAddSubCategoryDialogOpen(false);
      setNewSubCategoryName("");
      setParentCategoryId("");
      await fetchCategories();
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
    });
    setImagePreview(null);
    setImageFile(null);
    setErrors({});
    setEditingProduct(null);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      brandName: product.brandName || "",
      productName: product.productName || "",
      category: product.category?._id || "",
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
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const printBarcode = () => {
    const printContent = barcodeRef.current?.innerHTML;
    const printWindow = window.open("", "_blank");
    printWindow?.document.write(`<html><head><title>Print Barcode</title></head><body style="text-align:center; margin-top: 20px;">${printContent}</body></html>`);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
    printWindow?.close();
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
    setFormData((prev) => ({ ...prev, category: value }));
    setErrors((prev: any) => ({ ...prev, category: undefined }));
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
            // Assuming your CSV has an 'image' column with the URL
            const payload = {
              ...product,
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

  const handleBarcodeScan = (err: any, result: any) => {
    if (result) {
      const scannedCode = result.text;
      const foundProduct = products.find(p => p.itemCode === scannedCode);
      if (foundProduct) {
        handleViewDetails(foundProduct);
        // setScanBarcodeDialogOpen(false);
      } else {
        toast.error(`Product with barcode "${scannedCode}" not found.`);
      }
    }
  };
  // const handleBarcodeScan = (err: any, result: any) => {
  //   if (result) {
  //     const scannedCode = result.text;
  //     const foundProduct = products.find(p => p.itemCode === scannedCode);
  //     if (foundProduct) {
  //       handleViewDetails(foundProduct);
  //       setScanBarcodeDialogOpen(false);
  //     } else {
  //       toast.error(`Product with barcode "${scannedCode}" not found.`);
  //     }
  //   }
  // };

  const getSubCategories = () => {
    return [];
  };

  const renderCell = (product: any, columnId: string) => {
    switch (columnId) {
      case "code":
        return <td className="px-6 py-4">{product.itemCode || "N/A"}</td>
      case "brand":
        return <td className="px-6 py-4">{product.brandName || "N/A"}</td>;
      case "category":
        const category = product.category;
        let categoryDisplay = "N/A";
        if (category) {
          if (category.parent) {
            const parentName = typeof category.parent === 'object' ? category.parent.name : '';
            categoryDisplay = `${parentName} / ${category.name}`;
          } else {
            categoryDisplay = category.name;
          }
        }
        return <td className="px-6 py-4">{categoryDisplay}</td>;
      case "thumbnail":
        return (
          <td className="px-6 py-4">
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
        return <td className="px-6 py-4">{product.productName || "N/A"}</td>;
      case "quantity":
        return <td className="px-6 py-4">{product.stock || 0}</td>;
      case "price":
        return <td className="px-6 py-4">₹{product.mrp || 0}</td>;
      case "stock":
        return (
          <td className="px-6 py-4">
            <span
              className={product.stock > 0 ? "text-green-600" : "text-red-600"}
            >
              {product.stock > 0 ? "In-stock" : "Out of stock"}
            </span>
          </td>
        );
      case "barcode":
        return (
          <td className="px-6 py-4">
            <Button
              size="sm"
              onClick={() => handleGenerateBarcode(product)}
              className="bg-[#fdebe3] text-[#E98C81] border border-[#E98C81] hover:bg-[#E98C81] hover:text-white transition-colors"
              disabled={!product.itemCode}
            >
              Generate Barcode
            </Button>
          </td>
        );
      case "actions":
        return (
          <td className="px-6 py-4">
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
        return null;
    }
  };

  return (
    <AdminLayout title="Product Management">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4 items-center">
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => setAddCategoryDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => setAddSubCategoryDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Sub-Category
          </Button>
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        {/* <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => setScanBarcodeDialogOpen(true)}
          >
            <BarcodeIcon className="w-4 h-4 mr-2" />
            Scan Barcode
          </Button> */}
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => setBulkUploadDialogOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, brand, code, or category"
              className="pl-10 bg-muted border-0"
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
                  <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
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
                      <td colSpan={columns.length} className="text-center py-10">
                        Loading products...
                      </td>
                    </tr>
                  ) : currentProducts.length > 0 ? (
                    currentProducts.map((product) => (
                      <tr key={product.id || product._id} className="text-sm hover:bg-muted/50">
                        {columns.map((col) => renderCell(product, col.id))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-10">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-muted-foreground">
                            {searchQuery
                              ? "No products match your search."
                              : "No products found."}
                          </p>
                          <Button variant="outline" size="sm" onClick={() => {
                            resetForm();
                            setShowForm(true);
                          }}>
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
                Showing {startIndex + 1} to {endIndex} of {totalProducts}{" "}
                entries
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
                  label: "Size",
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
                <div key={field.name} className="grid gap-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && (
                      <span className="text-error ml-1">*</span>
                    )}
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type={field.type || "text"}
                    placeholder={
                      field.placeholder || `Enter ${field.label.toLowerCase()}`
                    }
                    value={formData[field.name as keyof typeof formData]}
                    onChange={handleFormChange}
                  />
                  {errors[field.name] && (
                    <p className="text-xs text-error">{errors[field.name]}</p>
                  )}
                </div>
              ))}

              {/* Category Dropdown */}
              <div className="grid gap-2">
                <Label htmlFor="category">
                  Category<span className="text-error ml-1">*</span>
                </Label>
                <Select
                  onValueChange={handleCategoryChange}
                  value={formData.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => !c.parent).map(category => (
                      <React.Fragment key={category._id}>
                        <SelectItem value={category._id}>
                          {category.name}
                        </SelectItem>
                        {categories.filter(sub => sub.parent?._id === category._id).map(sub => (
                          <SelectItem key={sub._id} value={sub._id}>
                            <span className="ml-4">{sub.name}</span>
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-xs text-error">{errors.category}</p>
                )}
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
                <SelectContent>
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
                    <Label className="text-muted-foreground">Product Image</Label>
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
                      <p className="mt-2 text-xs text-muted-foreground tracking-widest">{productToView.itemCode || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Details */}
                <div className="md:col-span-2 space-y-6">
                  {/* Header */}
                  <div>
                    <Badge
                      variant={productToView.stock > 0 ? "default" : "destructive"}
                      className={productToView.stock > 0 ? "bg-green-100 text-green-800" : ""}
                    >
                      {productToView.stock > 0 ? "In Stock" : "Out of Stock"}
                    </Badge>
                    <h2 className="text-2xl font-bold mt-2">{productToView.productName}</h2>
                    <p className="text-muted-foreground">{productToView.brandName || "No Brand"}</p>
                  </div>

                  {/* General Info */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">General Information</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Category</span>
                        <span className="font-medium">{productToView.category?.name || "N/A"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Item Code</span>
                        <span className="font-medium">{productToView.itemCode || "N/A"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">HSN Code</span>
                        <span className="font-medium">{productToView.hsnCode || "N/A"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Size</span>
                        <span className="font-medium">{productToView.size || "N/A"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Pack Size</span>
                        <span className="font-medium">{productToView.packSize || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Inventory */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Pricing & Inventory</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">MRP</span>
                        <span className="font-medium">₹{productToView.mrp?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Cost Price</span>
                        <span className="font-medium">₹{productToView.costPrice?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="font-medium">{productToView.discount || "0"}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">GST</span>
                        <span className="font-medium">{productToView.gst || "0"}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Stock</span>
                        <span className="font-medium">{productToView.stock || "0"}</span>
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

      {/* Scan Barcode Dialog */}
      {/* Scan Barcode Dialog
      <Dialog open={scanBarcodeDialogOpen} onOpenChange={setScanBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
            <DialogDescription>
              Point your camera at a product's barcode to view its details.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <BarcodeScanner
              onUpdate={handleBarcodeScan}
              width={500}
              height={500}
            />
          </div>
        </DialogContent>
      </Dialog>
      </Dialog> */}

      {/* Bulk Upload Dialog */}

<Dialog open={bulkUploadDialogOpen} onOpenChange={setBulkUploadDialogOpen}>
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
            productName,brandName,category,mrp,costPrice,stock,itemCode,gst,hsnCode,size,discount,packSize,image
          </code>
          <div className="text-[11px] text-muted-foreground space-y-1 mt-2">
            <p>• <strong>Required fields:</strong> productName, category, mrp, costPrice</p>
            <p>• <strong>category:</strong> Use exact category name from your system</p>
            <p>• <strong>image:</strong> Provide direct image URL (optional)</p>
            <p>• <strong>Numbers:</strong> mrp, costPrice, stock, gst, discount should be numeric</p>
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
          e.currentTarget.classList.add('border-[#E98C81]', 'bg-[#f9e5dc]');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('border-[#E98C81]', 'bg-[#f9e5dc]');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-[#E98C81]', 'bg-[#f9e5dc]');
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.csv')) {
              handleBulkUpload(file);
            } else {
              toast.error("Please upload a CSV file");
            }
          }
        }}
      >
        <Upload className="w-12 h-12 text-[#E98C81] mb-3" />
        <p className="font-semibold text-lg mb-1">Drag & drop your CSV file here</p>
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
              document.getElementById('csv-upload')?.click();
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Browse for a file
          </Button>
        </label>
        <p className="text-xs text-muted-foreground mt-3">Maximum file size: 5MB</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-sm text-blue-900 mb-2">📋 Upload Instructions:</h4>
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
      <Dialog
        open={barcodeDialogOpen}
        onOpenChange={setBarcodeDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarcodeIcon className="w-5 h-5" />
              Generate Barcode
            </DialogTitle>
            <DialogDescription>
              Barcode for <span className="font-bold">{barcodeProduct?.productName}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6">
            {barcodeProduct && (
              <div className="flex flex-col items-center gap-4">
                <div ref={barcodeRef} className="bg-white p-4 rounded-lg border">
                  <Barcode
                    value={barcodeProduct.itemCode || "NO-CODE"}
                    width={2}
                    height={80}
                    fontSize={16}
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">{barcodeProduct.productName}</p>
                  <p className="text-xs text-muted-foreground">Item Code: {barcodeProduct.itemCode}</p>
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
                  <Button
                    onClick={printBarcode}
                    className="flex-1"
                  >
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