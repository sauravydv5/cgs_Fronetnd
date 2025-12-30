"use client";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    { title: "New Bill", img: "src/images/new-bill.png", path: "/bills/customers" },
    { title: "Sale", img: "src/images/sale.png", path: "/bills/sale" },
    { title: "Sale Return", img: "src/images/sale-return.png", path: "/bills/sale-return" },
    { title: "Drafts", img: "src/images/drafts.png", path: "/bills/drafts" },
  ];

  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.customer) {
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
            onClick={() => navigate(card.path)}
          >
            <CardContent className="flex flex-col items-center justify-center text-white p-4">
              <img src={card.img} alt={card.title} className="w-12 h-12 mb-3" />
              <p className="mt-1 font-medium">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
