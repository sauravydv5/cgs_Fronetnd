import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { addPurchaseVoucher, getAllPurchaseDetails, getPurchaseVouchers } from "@/adminApi/purchaseDetailApi";
import { getAllSuppliers } from "@/adminApi/supplierApi";
import { getAllNewBills } from "@/adminApi/billApi";
import { getAllProducts } from "@/adminApi/productApi";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PurchaseVoucher() {
  const [items, setItems] = useState<any[]>([
    {
      id: "new-1",
      brandName: "",
      productName: "",
      productId: "",
      quantity: 1,
      rate: 0,
      amount: 0,
      discount: 0,
      discountType: "percentage",
      gstType: "IGST",
      gstRate: 18,
    },
  ]);
  const [voucherData, setVoucherData] = useState({
    billNo: "",
    date: new Date().toISOString().split("T")[0],
    supplierName: "",
    supplierId: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [billOptions, setBillOptions] = useState<string[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [purchaseRes, billRes, supplierRes] = await Promise.all([
          getAllPurchaseDetails(),
          getAllNewBills(),
          getAllSuppliers(),
        ]);

        const billsSet = new Set<string>();
        const suppliersMap = new Map<string, string>();

        // Handle Purchase Details Response
        const purchaseList = Array.isArray(purchaseRes)
          ? purchaseRes
          : (purchaseRes?.data || []);

        if (Array.isArray(purchaseList)) {
          purchaseList.forEach((item: any) => {
            if (item.billNo) billsSet.add(item.billNo);
            
            const sId = item.supplier && typeof item.supplier === 'object' ? item.supplier._id : item.supplier;
            if (sId && item.supplierName) {
              suppliersMap.set(sId, item.supplierName);
            }
          });
        }

        // Handle Sales Bills Response
        const salesBillsList = Array.isArray(billRes)
          ? billRes
          : (billRes?.bills || billRes?.data || []);

        if (Array.isArray(salesBillsList)) {
          salesBillsList.forEach((item: any) => {
            if (item.billNo) billsSet.add(item.billNo);
          });
        }

        // Handle Suppliers API Response
        const supplierList = Array.isArray(supplierRes)
          ? supplierRes
          : (supplierRes?.data || supplierRes?.suppliers || []);

        if (Array.isArray(supplierList)) {
          supplierList.forEach((s: any) => {
            const name = s.name || (s.firstName ? `${s.firstName} ${s.lastName || ""}`.trim() : "") || s.companyName;
            if (s._id && name) suppliersMap.set(s._id, name);
          });
        }

        setBillOptions(Array.from(billsSet));
        setSupplierOptions(Array.from(suppliersMap.entries()).map(([id, name]) => ({ id, name })));
      } catch (error) {
        console.error("Error fetching dropdown options:", error);
      }
    };
    fetchDropdownData();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getAllProducts();
        if (response?.data?.data?.rows) {
           setProducts(response.data.data.rows);
           const uniqueCompanies = Array.from(new Set(response.data.data.rows.map((p: any) => p.brandName).filter(Boolean))) as string[];
           setCompanies(uniqueCompanies);
        }
      } catch (error) {
        console.error("Error fetching products", error);
      }
    }
    fetchProducts();
  }, []);

  const fetchVouchers = useCallback(async () => {
    try {
      const response = await getPurchaseVouchers();
      if (response.success && Array.isArray(response.data)) {
        setVouchers(response.data);
      }
    } catch (error) {
      console.error("Error fetching vouchers:", error);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleSaveVoucher = async () => {
    setLoading(true);
    try {
      const payload = { ...voucherData, supplier: voucherData.supplierId, items };
      const response = await addPurchaseVoucher(payload);
      if (response.success) {
        toast.success("Voucher added successfully!");
        setItems([{
          id: "new-1",
          brandName: "",
          productName: "",
          productId: "",
          quantity: 1,
          rate: 0,
          amount: 0,
          discount: 0,
          discountType: "percentage",
          gstType: "IGST",
          gstRate: 18,
        }]);
        setVoucherData({
          billNo: "",
          date: new Date().toISOString().split("T")[0],
          supplierName: "",
          supplierId: "",
          notes: "",
        });
        fetchVouchers();
      } else {
        toast.error(response.message || "Failed to add voucher.");
      }
    } catch (error) {
      console.error("Error adding voucher:", error);
      toast.error("Error adding voucher.");
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          let updatedItem = { ...item, [field]: value };
          
          // If Company changes, reset product
          if (field === 'brandName') {
             updatedItem.productName = '';
             updatedItem.productId = '';
          }

          // Recalculate amount when quantity or rate changes
          if (["quantity", "rate", "discount", "discountType"].includes(field)) {
            const qty = Number(updatedItem.quantity) || 0;
            const rate = Number(updatedItem.rate) || 0;
            const discount = Number(updatedItem.discount) || 0;
            let totalAmount = qty * rate;
            if (updatedItem.discountType === "amount") {
              totalAmount -= discount;
            } else {
              totalAmount -= totalAmount * (discount / 100);
            }
            updatedItem.amount = totalAmount > 0 ? totalAmount : 0;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleProductSelect = (id: string, productId: string) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    setItems(items.map(item => {
      if (item.id === id) {
        const qty = Number(item.quantity) || 1;
        const rate = Number(product.mrp) || 0; // Defaulting to MRP, user can change
        
        const discount = Number(item.discount) || 0;
        let totalAmount = qty * rate;
        if (item.discountType === "amount") {
          totalAmount -= discount;
        } else {
          totalAmount -= totalAmount * (discount / 100);
        }

        return {
          ...item,
          productId: product._id,
          productName: product.productName,
          brandName: product.brandName,
          rate: rate,
          gstRate: product.gst || 0,
          amount: totalAmount > 0 ? totalAmount : 0
        };
      }
      return item;
    }));
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `new-${items.length + 1}`, // Use a unique key for new items
        brandName: "",
        productName: "",
        productId: "",
        quantity: 1,
        rate: 0,
        discount: 0,
        gstType: "IGST",
        gstRate: 18,
      },
    ]);
  };

  const handleDeleteItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const total = items.reduce(
    (sum, item) => sum + (item.amount || (item.rate || 0) * (item.quantity || 0)),
    0
  );

  return (
    <AdminLayout title="Purchase > Purchase Voucher">
      <div className="p-8 max-w-7xl mx-auto">

        {/* TOP FORM */}
        <div className="bg-[#E8D4C0] rounded-lg p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">
            New Purchase Voucher
          </h2>

          {/* Header Row */}
          <div className="grid grid-cols-3 gap-0 bg-white rounded-t-md border border-gray-200">
            <div className="border-r border-gray-200 px-4 py-3">
              <label className="block text-xs font-medium text-gray-700">Bill No.</label>
            </div>
            <div className="border-r border-gray-200 px-4 py-3">
              <label className="block text-xs font-medium text-gray-700">Date</label>
            </div>
            <div className="px-4 py-3">
              <label className="block text-xs font-medium text-gray-700">Supplier</label>
            </div>
          </div>

          {/* Data Row */}
          <div className="grid grid-cols-3 gap-0 bg-white rounded-b-md border border-t-0 border-gray-200">
            <div className="border-r border-gray-200 px-4 py-3">
              <select
                className="w-full bg-white border-0 text-sm h-auto p-0 focus:ring-0 outline-none"
                value={voucherData.billNo}
                onChange={(e) => setVoucherData({ ...voucherData, billNo: e.target.value })}
              >
                <option value="">Select Bill No</option>
                {billOptions.map((bill, index) => (
                  <option key={index} value={bill}>{bill}</option>
                ))}
              </select>
            </div>

            <div className="border-r border-gray-200 px-4 py-3">
              <Input
                type="date"
                className="bg-white border-0 text-sm h-auto p-0 focus:ring-0"
                value={voucherData.date}
                onChange={(e) => setVoucherData({ ...voucherData, date: e.target.value })}
              />
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <select
                className="w-full bg-white border-0 text-sm h-auto p-0 focus:ring-0 outline-none"
                value={voucherData.supplierId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedName = supplierOptions.find(s => s.id === selectedId)?.name || "";
                  setVoucherData({ ...voucherData, supplierId: selectedId, supplierName: selectedName });
                }}
              >
                <option value="">Select Supplier</option>
                {supplierOptions.map((supplier, index) => (
                  <option key={index} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* PURCHASE ITEM TABLE */}
        <div className="mb-4">
          <div className="flex justify-center mb-4">
            <Button
              onClick={handleAddItem}
              className="bg-[#E89B87] hover:bg-[#d88976] text-white rounded-full px-5 py-2 text-sm h-9"
            >
              + Add Item
            </Button>
          </div>
          <h2 className="text-sm font-medium text-gray-700 mb-4">
            Purchase Item
          </h2>
        </div>

        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="min-w-full text-xs">
            <thead className="bg-[#E8D4C0]">
              <tr>
                <th className="py-3 px-3 text-left font-medium text-gray-700">S.No</th>
                <th className="py-3 px-3 text-left font-medium text-gray-700">Brand Name</th>
                <th className="py-3 px-3 text-left font-medium text-gray-700">Product</th>
                <th className="py-3 px-3 text-left font-medium text-gray-700">Quantity</th>
                <th className="py-3 px-3 text-left font-medium text-gray-700">Rate</th>
                <th className="py-3 px-3 text-left font-medium text-gray-700">Amount</th>
                <th className="py-3 px-3 text-left font-medium text-gray-700">Discount Type</th>
                <th className="py-3 px-3 text-left font-medium text-gray-700">GST Type</th>
                <th className="py-3 px-3 text-left font-medium text-gray-700">GST Rate (%)</th>
                <th className="py-3 px-3 text-left font-medium text-gray-700">Action</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-t border-gray-200">
                  <td className="py-3 px-3 text-gray-700">{index + 1}</td>

                  <td className="py-3 px-3">
                    <select 
                      className="border border-gray-300 rounded p-1.5 w-full bg-white text-xs" 
                      value={item.brandName || ''} 
                      onChange={(e) => handleItemChange(item.id, 'brandName', e.target.value)}
                    >
                      <option value="">Select Brand</option>
                      {companies.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </td>

                  <td className="py-3 px-3">
                    <select 
                      className="border border-gray-300 rounded p-1.5 w-full bg-white text-xs" 
                      value={item.productId || ''} 
                      onChange={(e) => handleProductSelect(item.id, e.target.value)}
                    >
                      <option value="">Select Product</option>
                      {products
                        .filter(p => !item.brandName || p.brandName === item.brandName)
                        .map(p => <option key={p._id} value={p._id}>{p.productName}</option>)}
                    </select>
                  </td>

                  <td className="py-3 px-3">
                    <Input
                      type="number"
                      value={item.quantity || ''}
                      className="w-16 border-gray-300 h-8 text-xs"
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                    />
                  </td>

                  <td className="py-3 px-3">
                    <Input
                      type="number"
                      value={item.rate || ''}
                      className="w-20 border-gray-300 h-8 text-xs"
                      onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value))}
                    />
                  </td>

                  <td className="py-3 px-3 text-gray-700">{(item.amount || 0).toLocaleString('en-IN')}</td>

                  <td className="py-3 px-3">
                    <div className="flex gap-1">
                      <Input 
                          type="number" 
                          className="w-12 border-gray-300 h-8 text-xs" 
                          value={item.discount || 0}
                          onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)}
                      />
                      <select 
                        className="border border-gray-300 rounded p-1 w-16 bg-white text-xs" 
                        value={item.discountType || 'percentage'}
                        onChange={(e) => handleItemChange(item.id, 'discountType', e.target.value)}
                      >
                        <option value="percentage">%</option>
                        <option value="amount">₹</option>
                      </select>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <select 
                      className="border border-gray-300 rounded p-1.5 w-20 bg-white text-xs"
                      value={item.gstType || 'IGST'}
                      onChange={(e) => handleItemChange(item.id, 'gstType', e.target.value)}
                    >
                      <option>IGST</option>
                      <option>CGST</option>
                      <option>SGST</option>
                    </select>
                  </td>

                  <td className="py-3 px-3">
                    <Input
                      type="number"
                      className="w-16 border-gray-300 h-8 text-xs"
                      value={item.gstRate || 0}
                      onChange={(e) => handleItemChange(item.id, 'gstRate', e.target.value)}
                    />
                  </td>

                  <td className="py-3 px-3 text-center">
                    <button onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTAL SECTION */}
        <div className="mt-6 flex justify-center">
          <div className="bg-[#E89B87] text-white text-sm font-medium px-20 py-3 rounded-lg">
            Total Amount : ₹{total.toLocaleString('en-IN')}
          </div>
        </div>

        {/* NOTES */}
        <div className="mt-8">
          <label className="block text-xs font-semibold text-gray-800 mb-2">
            Notes / Additional Information
          </label>
          <textarea
            placeholder="Enter Any Additional Remark Or Note......."
            className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm h-20 resize-none"
            value={voucherData.notes}
            onChange={(e) => setVoucherData({ ...voucherData, notes: e.target.value })}
          />
        </div>

        {/* BUTTONS */}
        <div className="mt-8 flex justify-center gap-4">
          <Button className="bg-gray-400 hover:bg-gray-500 text-white px-16 py-5 rounded-full text-sm">
            Cancel
          </Button>

          <Button onClick={handleSaveVoucher} disabled={loading} className="bg-[#E89B87] hover:bg-[#d88976] text-white px-16 py-5 rounded-full text-sm">
            {loading ? "Saving..." : "Save Voucher"}
          </Button>
        </div>

        {/* VOUCHER LIST */}
        <div className="mt-12">
          <h2 className="text-sm font-medium text-gray-700 mb-4">
            Recent Vouchers
          </h2>
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="min-w-full text-xs">
              <thead className="bg-[#E8D4C0]">
                <tr>
                  <th className="py-3 px-3 text-left font-medium text-gray-700">Date</th>
                  <th className="py-3 px-3 text-left font-medium text-gray-700">Bill No</th>
                  <th className="py-3 px-3 text-left font-medium text-gray-700">Supplier</th>
                  <th className="py-3 px-3 text-left font-medium text-gray-700">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher, index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="py-3 px-3 text-gray-700">{voucher.date ? format(new Date(voucher.date), "dd-MMM-yyyy") : "N/A"}</td>
                    <td className="py-3 px-3 text-gray-700">{voucher.purchaseId || voucher.billNo || "N/A"}</td>
                    <td className="py-3 px-3 text-gray-700">
                      {voucher.supplier?.name || voucher.supplierName || "N/A"}
                    </td>
                    <td className="py-3 px-3 text-gray-700">
                      ₹{(voucher.totalAmount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {vouchers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">No vouchers found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}