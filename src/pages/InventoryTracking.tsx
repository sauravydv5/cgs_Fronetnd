import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MoreVertical, Image as ImageIcon, X, Plus, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useNavigate } from "react-router-dom";
import { getAllProducts, updateProduct, deleteProduct, getLowStockProducts, updateLowStockSettings, updateProductStock } from "@/adminApi/productApi";
import { getAllCategories } from "@/adminApi/categoryApi";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function InventoryTracking() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [emailAlert, setEmailAlert] = useState(true);
  const [pushAlert, setPushAlert] = useState(false);
  const itemsPerPage = 10;

  // State for forms and dialogs
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStockUpdate, setShowStockUpdate] = useState(false);
  const [stockUpdateProduct, setStockUpdateProduct] = useState<any>(null);
  const [newStockValue, setNewStockValue] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    productName: "", category: "", mrp: "", costPrice: "", stock: "", gst: "",
    brandName: "", company: "", itemCode: "", hsnCode: "", size: "",
    discount: "", packSize: "", description: "", image: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      fetchProducts();
      fetchCategories();
      fetchLowStock();
    }
  }, [navigate]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await getAllProducts();
      const productData = res?.data?.data?.rows || [];
      setProducts(Array.isArray(productData) ? productData.map(p => ({...p, stock: p.stock ?? 0})) : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getAllCategories();
      const categoryData = res?.data?.data?.rows || res?.data?.rows || res?.data || [];
      setCategories(Array.isArray(categoryData) ? categoryData : []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchLowStock = async () => {
    try {
      const res = await getLowStockProducts();
      if (res?.data?.status && res?.data?.data) {
        const { products, settings } = res.data.data;
        setLowStockProducts(Array.isArray(products) ? products : []);
        if (settings) {
          setLowStockThreshold(settings.threshold ?? 10);
          setEmailAlert(settings.emailAlert ?? true);
          setPushAlert(settings.pushAlert ?? false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch low stock products:", err);
    }
  };

  // ✅ Filter products based on search
  const filteredProducts = products.filter((p) => {
    const search = searchTerm.toLowerCase().trim();
    return (
      (p.productName || "").toLowerCase().includes(search) ||
      (p.brandName || "").toLowerCase().includes(search) ||
      (p.category?.name || "").toLowerCase().includes(search) ||
      (p.itemCode || "").toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const resetForm = () => {
    setFormData({
      productName: "", category: "", mrp: "", costPrice: "", stock: "", gst: "",
      brandName: "", company: "", itemCode: "", hsnCode: "", size: "",
      discount: "", packSize: "", description: "", image: "",
    });
    setImagePreview(null);
    setImageFile(null);
    setErrors({});
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      brandName: product.brandName || "",
      productName: product.productName || "",
      category: product.category?._id || "",
      company: product.company || "",
      mrp: product.mrp ?? "",
      costPrice: product.costPrice ?? "",
      stock: product.stock ?? "",
      itemCode: product.itemCode || "",
      gst: product.gst ?? "",
      hsnCode: product.hsnCode || "",
      size: product.size || "",
      discount: product.discount ?? "",
      packSize: product.packSize || "",
      description: product.description || "",
      image: product.image || "",
    });
    setImagePreview(product.image || null);
    setImageFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct({ id });
        toast.success("Product deleted successfully!");
        await fetchProducts();
      } catch (err) {
        console.error("Delete error:", err);
        toast.error("Failed to delete product.");
      }
    }
  };

  const handleView = (product) => {
    setViewingProduct(product);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCategoryChange = (value) => {
    setFormData({ ...formData, category: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(editingProduct?.image || null);
    setFormData((prev) => ({ ...prev, image: editingProduct?.image || "" }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.productName || !formData.category || !formData.mrp || formData.stock === "") {
      toast.error("Please fill all required fields.");
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        brandName: formData.brandName,
        productName: formData.productName,
        category: formData.category,
        company: formData.company,
        mrp: parseFloat(formData.mrp) || 0, // Keep as float
        costPrice: parseFloat(formData.costPrice) || 0, // Add costPrice
        stock: parseInt(formData.stock, 10) || 0, // Keep as integer
        itemCode: formData.itemCode,
        gst: parseFloat(formData.gst) || 0, // Keep as float
        hsnCode: formData.hsnCode,
        size: formData.size, // Add size
        discount: formData.discount,
        packSize: formData.packSize, // Add packSize
        description: formData.description,
      };

      if (imageFile) {
        toast.info("Image upload not implemented yet. Other fields will be updated.");
      } else if (formData.image && !imageFile) {
        //@ts-ignore
        payload.image = formData.image;
      }

      if (editingProduct) {
        await updateProduct({ id: editingProduct._id, data: payload });
        toast.success("Product updated successfully!");
      }

      setShowForm(false);
      resetForm();
      await fetchProducts();
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error(err.response?.data?.message || "Failed to save product.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await updateLowStockSettings({ data: { 
        threshold: lowStockThreshold,
        emailAlert,
        pushAlert
      }});
      toast.success("Low stock settings updated successfully!");
      setShowSettings(false);
      fetchLowStock();
    } catch (err) {
      console.error("Failed to update settings:", err);
      toast.error("Failed to update settings.");
    }
  };

  const handleAlertChange = async (type: 'email' | 'push', value: boolean) => {
    if (type === 'email') setEmailAlert(value);
    if (type === 'push') setPushAlert(value);

    try {
      await updateLowStockSettings({
        data: {
          threshold: lowStockThreshold,
          emailAlert: type === 'email' ? value : emailAlert,
          pushAlert: type === 'push' ? value : pushAlert
        }
      });
      toast.success(`${type === 'email' ? 'Email' : 'Push'} alerts ${value ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error("Failed to update alert settings:", err);
      toast.error("Failed to update settings.");
    }
  };

  const handleStockUpdateSubmit = async () => {
    if (!stockUpdateProduct || newStockValue === "") return;
    try {
      await updateProductStock({ id: stockUpdateProduct._id, stock: Number(newStockValue) });
      toast.success("Stock updated successfully!");
      setShowStockUpdate(false);
      setStockUpdateProduct(null);
      fetchLowStock();
      fetchProducts();
    } catch (err) {
      console.error("Failed to update stock:", err);
      toast.error("Failed to update stock.");
    }
  };

  const getStockColor = (stock) => {
    if (stock <= 10) return "text-red-600";
    if (stock > 10 && stock <= 50) return "text-yellow-600";
    return "text-green-600";
  };

  if (loading) {
    return (
      <AdminLayout title="Inventory Tracking">
        <div className="flex justify-center items-center h-64">Loading inventory...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Inventory Tracking">
      <div
        className="flex flex-col xl:flex-row gap-4 md:gap-6 w-full"
      >
        <div className="flex-1 space-y-4 md:space-y-6 min-w-0">
          {/* 🔍 Search Bar */}
          <div className="flex flex-wrap justify-between items-center gap-3 md:gap-4">
            <div className="relative w-full sm:w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, brand, category or code"
                className="pl-9 sm:pl-10 pr-4 py-2 text-sm bg-muted border-0 rounded-full shadow-sm focus:ring-2 focus:ring-[#007E66]"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {/* 🖥️ Desktop Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hidden lg:block">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-border text-gray-700 sticky top-0 z-10">
                  <tr className="text-left text-xs lg:text-sm font-medium">
                    <th className="px-4 py-3">Item Code</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Thumbnail</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentProducts.length > 0 ? (
                      currentProducts.map((product, index) => (
                        <tr
                          key={product._id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">{product.itemCode || 'N/A'}</td>
                          <td className="px-4 py-3">{product.brandName || 'N/A'}</td>
                          <td className="px-4 py-3">{product.category?.name || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                              {product.image ?
                                <img src={product.image} alt={product.productName} className="object-cover w-full h-full" />
                               :
                                <ImageIcon className="w-5 h-5 text-gray-400" />
                              }
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate">{product.productName || 'N/A'}</td>
                          <td className="px-4 py-3">{product.stock ?? 0}</td>
                          <td className="px-4 py-3">Rs. {product.mrp || 0}</td>
                          <td className={`px-4 py-3 font-semibold ${getStockColor(product.stock)}`}>
                            {product.stock ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-gray-100 rounded">
                                  <MoreVertical className="w-4 h-4 text-gray-500" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white shadow-md">
                                <DropdownMenuItem onClick={() => handleEdit(product)}>Edit Product</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleView(product)}>View Detail</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(product._id)} className="text-red-600">Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 📄 Pagination */}
            {filteredProducts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t bg-gray-50 gap-3">
                <div className="text-xs sm:text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of{" "}
                  {filteredProducts.length}
                </div>
                <div className="flex gap-1 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 text-xs"
                  >
                    Prev
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Button
                      key={i + 1}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(i + 1)}
                      className="h-8 w-8 p-0 text-xs"
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

          {/* 📱 Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {currentProducts.length > 0 ? (
                currentProducts.map((product, index) => (
                  <div
                    key={product._id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-14 h-14 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.image ?
                            <img src={product.image} alt={product.productName} className="object-cover w-full h-full" />
                           :
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          }
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{product.productName || 'N/A'}</h3>
                          <p className="text-xs text-gray-500">
                            {product.brandName || 'N/A'} • {product.category?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-400">{product.itemCode || 'N/A'}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(product)}>Edit Product</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleView(product)}>View Detail</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(product._id)} className="text-red-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100 mt-2">
                      <p><span className="text-gray-500">Qty: </span>{product.stock ?? 0}</p>
                      <p><span className="text-gray-500">Price: </span>Rs. {product.mrp || 0}</p>
                      <p><span className="text-gray-500">Stock: </span><span className={getStockColor(product.stock)}>{product.stock ?? 0}</span></p>
                    </div>
                  </div>
                ))
              ) : (
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
                No products found
              </div>
            )}
          </div>
        </div>

        {/* ⚙️ Right Panel */}
        <div className="xl:w-[320px] w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 h-fit xl:sticky xl:top-24 self-start">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base md:text-lg font-semibold text-gray-800">
              Low Stock Alert
            </h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 text-gray-500" />
            </Button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto mb-4">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product: any) => (
                <div key={product._id} className="bg-red-50 p-3 rounded-md border border-red-200">
                  <p className="text-xs sm:text-sm text-red-700 font-medium">
                    {product.productName} – <span className="font-semibold">{product.stock} Units remaining</span>
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No low stock alerts.</p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200 mt-3 space-y-4">
            <select 
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#007E66]"
              onChange={(e) => {
                const product = lowStockProducts.find((p: any) => p._id === e.target.value);
                if (product) {
                  setStockUpdateProduct(product);
                  setNewStockValue(product.stock);
                  setShowStockUpdate(true);
                }
                e.target.value = "Update Stock"; // Reset selection
              }}
            >
              <option>Update Stock</option>
              {lowStockProducts.map((p: any) => (
                <option key={p._id} value={p._id}>{p.productName}</option>
              ))}
            </select>

            {/* 🔔 Notification Toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-start gap-2">
                <Switch checked={emailAlert} onCheckedChange={(val) => handleAlertChange('email', val)} />
                <span className="text-sm text-gray-700">Email</span>
              </div>
              <div className="flex items-center justify-start gap-2">
                <Switch checked={pushAlert} onCheckedChange={(val) => handleAlertChange('push', val)} />
                <span className="text-sm text-gray-700">Push</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!viewingProduct} onOpenChange={() => setViewingProduct(null)}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingProduct?.productName}</DialogTitle>
            <DialogDescription>
              Item Code: {viewingProduct?.itemCode || "N/A"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-center">
              <div className="w-32 h-32 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                {viewingProduct?.image ? (
                  <img src={viewingProduct.image} alt={viewingProduct.productName} className="object-cover w-full h-full" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div><p className="text-sm text-muted-foreground">Brand</p><p className="font-medium">{viewingProduct?.brandName || "N/A"}</p></div>
              <div><p className="text-sm text-muted-foreground">Category</p><p className="font-medium">{viewingProduct?.category?.name || "N/A"}</p></div>
              <div><p className="text-sm text-muted-foreground">MRP</p><p className="font-medium">Rs. {viewingProduct?.mrp || 0}</p></div>
              <div><p className="text-sm text-muted-foreground">Cost Price</p><p className="font-medium">Rs. {viewingProduct?.costPrice || 0}</p></div>
              <div><p className="text-sm text-muted-foreground">Stock</p><p className={`font-medium ${getStockColor(viewingProduct?.stock)}`}>{viewingProduct?.stock ?? 0}</p></div>
              <div><p className="text-sm text-muted-foreground">GST</p><p className="font-medium">{viewingProduct?.gst || 0}%</p></div>
            </div>
            {viewingProduct?.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium text-sm">{viewingProduct.description}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingProduct(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Low Stock Settings</DialogTitle>
            <DialogDescription>
              Set the minimum stock level to trigger low stock alerts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="threshold" className="text-right text-sm font-medium col-span-2">
                Minimum Stock Level
              </label>
              <Input
                id="threshold"
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="col-span-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={handleUpdateSettings}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Update Dialog */}
      <Dialog open={showStockUpdate} onOpenChange={setShowStockUpdate}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Update inventory count for <span className="font-semibold text-gray-900">{stockUpdateProduct?.productName}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">New Stock Quantity</label>
            <Input
              type="number"
              value={newStockValue}
              onChange={(e) => setNewStockValue(e.target.value)}
              placeholder="Enter new stock quantity"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockUpdate(false)}>Cancel</Button>
            <Button onClick={handleStockUpdateSubmit} className="bg-[#119D82] hover:bg-[#0e866f]">Update Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Modal */}
      {showForm && (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
          <div
              className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
              <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-2">Product Image</label>
                <div className="border-2 border-dashed border-[#119D82] rounded-lg p-6 text-center">
                  <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-3">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-md border" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <span className="text-[#119D82] font-medium text-sm">Click to upload</span>
                        <p className="text-xs text-gray-500">PNG, JPG, or WEBP</p>
                      </>
                    )}
                  </label>
                  <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  {imagePreview && (
                    <div className="mt-3"><Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={removeImage}>Remove</Button></div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Item Code", name: "itemCode" },
                  { label: "Brand Name", name: "brandName" },
                  { label: "Product Name", name: "productName", required: true },
                  { label: "Category", name: "category", required: true },
                  { label: "Company", name: "company" },
                  { label: "MRP", name: "mrp", type: "number", required: true },
                  { label: "Cost Price", name: "costPrice", type: "number" },
                  { label: "Stock", name: "stock", type: "number", required: true },
                  { label: "GST %", name: "gst", type: "number" },
                  { label: "HSN Code", name: "hsnCode" },
                  { label: "Size", name: "size" },
                  { label: "Discount %", name: "discount", type: "number" },
                  { label: "Pack Size", name: "packSize" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.name === "category" ? (
                      <Select onValueChange={handleCategoryChange} value={formData.category}>
                        <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        name={field.name}
                        type={field.type || "text"}
                        value={formData[field.name]}
                        onChange={handleChange}
                        placeholder={
                          field.name === "hsnCode"
                            ? `Enter ${field.label.toLowerCase()} (for eg., 22011010)`
                            : field.name === "itemCode"
                            ? `Enter ${field.label.toLowerCase()} (for eg., CMT1234)`
                            : field.name === "size"
                            ? `Enter ${field.label.toLowerCase()} (for eg., small, large, medium)`
                            : field.name === "packSize" ? `Enter ${field.label.toLowerCase()} (1, 2, 3)` : `Enter ${field.label.toLowerCase()}`
                        }
                      />
                    )}
                    {errors[field.name] && <span className="text-red-500 text-xs mt-1">{errors[field.name]}</span>}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter product description"
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} disabled={formLoading}>
                Cancel
              </Button>
              <Button
                className="bg-[#119D82] hover:bg-[#0e866f] text-white"
                onClick={handleSubmit}
                disabled={formLoading}
              >
                {formLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
            </div>
          </div>
      )}
    </AdminLayout>
  );
}
