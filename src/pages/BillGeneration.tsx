"use client";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import newBillImg from "@/images/new-bill.png";
import { addCustomer } from "@/adminApi/customerApi";
import saleImg from "@/images/sale.png";
import saleReturnImg from "@/images/sale-return.png";
import draftsImg from "@/images/drafts.png";

const mockProducts = [
  { itemCode: "0026", itemName: "Colorbar Nail paint", companyName: "Colorbar", hsnCode: "3304", mrp: "250" },
  { itemCode: "0027", itemName: "Lakme Lipstick", companyName: "Lakme", hsnCode: "3305", mrp: "450" },
  { itemCode: "0028", itemName: "Maybelline Foundation", companyName: "Maybelline", hsnCode: "3306", mrp: "750" },
  { itemCode: "PROD101", itemName: "Nivea Body Lotion", companyName: "Nivea", hsnCode: "3307", mrp: "350" },
  { itemCode: "PROD102", itemName: "Himalaya Face Wash", companyName: "Himalaya", hsnCode: "3308", mrp: "150" },
];

const getProducts = async () => ({ success: true, data: mockProducts });

// Mock API to add a bill. Replace with your actual API call.
const addBill = async (billData: any) => {
  console.log("Saving bill to database:", billData);
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate a successful response
      resolve({ success: true, message: "Bill created successfully!", data: { billId: `B-${Date.now()}`, ...billData } });
    }, 1500);
  });
};

export default function BillGeneration() {
  const navigate = useNavigate();
  const location = useLocation();

  const cards = [
    { title: "New Bill", img: newBillImg, path: "/bills/customers" },
    { title: "Sale", img: saleImg, path: "/bills/sale" },
    { title: "Sale Return", img: saleReturnImg, path: "/bills/sale-return" },
    { title: "Drafts", img: draftsImg, path: "/bills/drafts" },
  ];

  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    gender: "",
    dateOfBirth: "",
  });
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  const todayObj = new Date();
  const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCustomer = async () => {
    if (newCustomer.email && !newCustomer.email.includes("@")) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    setIsAddingCustomer(true);
    try {
      let formattedDob = newCustomer.dateOfBirth;
      if (formattedDob && formattedDob.includes("-")) {
        const [year, month, day] = formattedDob.split("-");
        formattedDob = `${day}/${month}/${year}`;
      }

      const payload: any = {
        firstName: newCustomer.firstName,
        lastName: newCustomer.lastName,
        email: newCustomer.email,
        phoneNumber: newCustomer.phoneNumber,
        dateOfBirth: formattedDob,
        gender: newCustomer.gender,
        password: "SecurePass123",
        profilePic: "https://example.com/profile.jpg",
      };
      const response = await addCustomer(payload);
      toast.success("Customer added successfully!");
      setIsAddCustomerOpen(false);
      setNewCustomer({
        firstName: "",
        lastName: "",
        phoneNumber: "",
        email: "",
        gender: "",
        dateOfBirth: "",
      });

      const createdCustomer = response.data?.data?.customer || response.data?.customer || response.data?.data || response.data;
      if (createdCustomer) {
        const customerId = createdCustomer._id || createdCustomer.id || createdCustomer.customerId;
        const name = createdCustomer.firstName || createdCustomer.lastName ? `${createdCustomer.firstName} ${createdCustomer.lastName}`.trim() : "N/A";
        const code = createdCustomer.customerCode || "N/A";
        navigate(`/bills/new-bill?id=${customerId}`, { state: { openAddProductModal: true, customerName: name, customerCode: code } });
      }
    } catch (error: any) {
      console.error("Failed to add customer:", error);
      toast.error(
        `Failed to add customer. ${
          error.response?.data?.message || "Please try again."
        }`
      );
    } finally {
      setIsAddingCustomer(false);
    }
  };

  useEffect(() => {
    if (location.state?.openAddCustomer) {
      setIsAddCustomerOpen(true);
      navigate(location.pathname, { replace: true });
    } else if (location.state?.customer) {
      setSelectedCustomer(location.state.customer);
      setShowModal(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    getProducts().then((res: any) => setAllProducts(res.data));
  }, []);

  const initialBillItem = {
    id: Date.now(),
    sno: "01.",
    itemCode: "",
    itemName: "",
    companyName: "",
    hsnCode: "",
    packing: "",
    lot: "",
    mrp: "",
    qty: "1",
    cd: "",
    netAmount: "",
    tax: "",
  };

  const [billItems, setBillItems] = useState<any[]>([initialBillItem]);

  const columns = [
    { id: "actions", label: "" },
    { id: "sno", label: "SNO" },
    { id: "itemCode", label: "ITEM CODE" },
    { id: "itemName", label: "ITEM NAME" },
    { id: "companyName", label: "COMPANY" },
    { id: "hsnCode", label: "HSN" },
    { id: "packing", label: "Packing" },
    { id: "lot", label: "Lot" },
    { id: "mrp", label: "MRP" },
    { id: "qty", label: "QTY" },
    { id: "cd", label: "CD" },
    { id: "netAmount", label: "NET" },
    { id: "tax", label: "TAX" },
  ];

  const SortableHeader = ({ column }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });
    return (
      <th
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className="px-3 py-2 cursor-grab"
      >
        {column.label}
      </th>
    );
  };

  const handleItemChange = (id: number, field: string, value: string) => {
    setBillItems(items => items.map(i => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleItemDelete = (id: number) => {
    setBillItems(items => items.filter(i => i.id !== id));
  };

  const handleProductSelect = (id: number, code: string) => {
    const p = allProducts.find(x => x.itemCode === code);
    if (!p) return;
    setBillItems(items => items.map(i => (i.id === id ? { ...i, ...p } : i)));
  };

  const handleContinue = async () => {
    // Basic validation
    if (billItems.length === 0 || billItems.some(item => !item.itemCode || !item.qty || Number(item.qty) === 0)) {
      toast.warning("Please add at least one item with a valid product and quantity.");
      return;
    }

    setIsSubmitting(true);
    try {
      const billPayload = {
        customer: selectedCustomer,
        items: billItems,
        // You can add other bill details here, like total amount, tax, etc.
      };

      const response: any = await addBill(billPayload);

      if (response.success) {
        toast.success(response.message);
        // Navigate to the new bill page with the saved bill details
        navigate("/bills/new-bill", { state: { billDetails: response.data } });
      } else {
        toast.error(response.message || "Failed to create bill.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCell = (item: any, col: string, index: number) => {
    if (col === "actions")
      return (
        <td className="px-2">
          <button onClick={() => handleItemDelete(item.id)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </td>
      );

    if (col === "sno") return <td className="px-2 text-center">{`0${index + 1}.`}</td>;

    if (col === "itemCode")
      return (
        <td className="px-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[150px] justify-between font-normal">
                {item.itemCode || "Select"}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
              <Command>
                <CommandInput placeholder="Search product" />
                <CommandList>
                  <CommandEmpty>No product</CommandEmpty>
                  <CommandGroup>
                    {allProducts.map((p) => (
                      <CommandItem key={p.itemCode} onSelect={() => handleProductSelect(item.id, p.itemCode)}>
                        <Check className={cn("mr-2 h-4 w-4", item.itemCode === p.itemCode ? "opacity-100" : "opacity-0")} />
                        {p.itemCode}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </td>
      );

    if (col === "itemName")
      return (
        <td className="px-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-between font-normal">
                {item.itemName || "Select Product"}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search product by name..." />
                <CommandList>
                  <CommandEmpty>No product found.</CommandEmpty>
                  <CommandGroup>
                    {allProducts.map((p) => (
                      <CommandItem key={p.itemCode} value={p.itemName} onSelect={() => handleProductSelect(item.id, p.itemCode)}>
                        <Check className={cn("mr-2 h-4 w-4", item.itemCode === p.itemCode ? "opacity-100" : "opacity-0")} />
                        {p.itemName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </td>
      );

    // All other fields are editable inputs
    return (
      <td className="px-2">
        <input
          value={item[col] || ""}
          onChange={e => handleItemChange(item.id, col, e.target.value)}
          className="border rounded px-2 py-1 w-full text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
          // Make MRP and QTY number inputs for better UX
          type={(col === 'mrp' || col === 'qty' || col === 'cd' || col === 'netAmount' || col === 'tax') ? 'number' : 'text'}
        />
      </td>
    );
  };

  return (
    <AdminLayout title="Bill Generation">
      <div className="flex flex-wrap items-center justify-center content-center gap-10 min-h-[60vh]">
        {cards.map((card, index) => (
          <Card
            key={index}
            className="w-[180px] h-[140px] flex flex-col items-center justify-center shadow-md rounded-2xl cursor-pointer transition-transform hover:scale-105 bg-[#e48a7c]"
            onClick={() => {
              if (card.title === "New Bill") {
                setIsAddCustomerOpen(true);
              } else {
                navigate(card.path);
              }
            }}
          >
            <CardContent className="flex flex-col items-center justify-center text-white p-4">
              <img src={card.img} alt={card.title} className="w-12 h-12 mb-3" />
              <p className="mt-1 font-medium">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Customer Sheet */}
      <Sheet open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <SheetContent side="right" className="w-full max-w-md bg-white shadow-2xl p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="border-b px-6 py-5">
              <SheetTitle className="text-xl font-semibold text-gray-900">
                Add Customer
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-5">
                <input
                  name="firstName"
                  value={newCustomer.firstName}
                  onChange={handleCustomerInputChange}
                  placeholder="First Name"
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg px-3 text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="lastName"
                  value={newCustomer.lastName}
                  onChange={handleCustomerInputChange}
                  placeholder="Last Name"
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg px-3 text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="phoneNumber"
                  value={newCustomer.phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 10) {
                      handleCustomerInputChange(e);
                    }
                  }}
                  placeholder="Mobile Number"
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg px-3 text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={handleCustomerInputChange}
                  placeholder="Email"
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg px-3 text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Select
                  value={newCustomer.gender}
                  onValueChange={(value) =>
                    setNewCustomer((prev) => ({ ...prev, gender: value }))
                  }
                >
                  <SelectTrigger className="w-full h-12 bg-gray-50 border-gray-200 rounded-lg text-gray-600">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <input
                    name="dateOfBirth"
                    type="date"
                    value={newCustomer.dateOfBirth}
                    max={today}
                    onChange={handleCustomerInputChange}
                    onKeyDown={(e) => e.preventDefault()}
                    onClick={(e) => e.currentTarget.showPicker()}
                    className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg px-3 text-gray-600 placeholder:text-gray-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  onClick={handleAddCustomer}
                  disabled={isAddingCustomer}
                  className="w-full h-12 text-white rounded-lg text-base font-medium bg-[#E98C81] hover:bg-[#d97a71]"
                >
                  {isAddingCustomer ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>

            <SheetFooter className="px-6 py-6 space-y-3"></SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[95%] max-w-7xl relative shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">Customer: {selectedCustomer?.name}</h2>

            <Button
              className="mb-4"
              onClick={() => setBillItems(p => [...p, { ...initialBillItem, id: Date.now(), sno: `0${p.length + 1}.` }])}
            >
              Add Item
            </Button>

            <div className="overflow-x-auto">
              <table className="w-full border">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                  <tr>{columns.map(c => <th key={c.id} className="px-3 py-2">{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  {billItems.map((item, index) => (
                    <tr key={item.id} className="border-t">
                      {columns.map(c => renderCell(item, c.id, index))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center mt-6">
              <Button onClick={handleContinue} disabled={isSubmitting}>
                {isSubmitting ? "Saving Bill..." : "Continue"}
              </Button>
            </div>

            <button onClick={() => setShowModal(false)} className="absolute top-4 right-6 text-2xl">×</button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
