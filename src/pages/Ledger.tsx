import { AdminLayout } from "@/components/AdminLayout";
import React, { useState, useEffect, useCallback } from "react";
import { Search, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getCustomerLedger,
  getSupplierLedger,
  addLedgerEntry,
} from "@/adminApi/ledgerApi";
import { getAllCustomers } from "@/adminApi/customerApi";
import { getAllSuppliers } from "@/adminApi/supplierApi";
import { Label } from "@/components/ui/label";

function Ledger() {
  const [activeTab, setActiveTab] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [customerData, setCustomerData] = useState([]);
  const [supplierData, setSupplierData] = useState([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState({
    customer: {
      totalDebit: 0,
      totalCredit: 0,
      customersWithBalance: 0,
      totalSales: 0,
      totalReceivable: 0,
    },
    supplier: {
      totalDebit: 0,
      totalCredit: 0,
      netBalance: 0,
    },
  });
  const [addLedgerDialogOpen, setAddLedgerDialogOpen] = useState(false);
  const [newLedgerEntry, setNewLedgerEntry] = useState({
    partyId: "",
    date: new Date().toISOString().split("T")[0],
    type: "",
    referenceNo: "",
    paymentMethod: "",
    amount: "",
    transactionType: "debit", // 'debit' or 'credit'
    dueDate: "",
  });

  const initialCustomerColumns = [
    { id: "date", label: "DATE" },
    { id: "customer", label: "CUSTOMER" },
    { id: "mobilenumber", label: "MOBILE NUMBER" },
    { id: "customerId", label: "CUSTOMER ID" },
    { id: "type", label: "TYPE" },
    { id: "referenceNo", label: "REFERENCE NO." },
    { id: "paymentMethod", label: "PAYMENT METHOD" },
    { id: "debit", label: "DEBIT(₹)" },
    { id: "credit", label: "CREDIT(₹)" },
    { id: "balance", label: "BALANCE" },
    { id: "dueDate", label: "DUE DATE" },
  ];

  const initialSupplierColumns = [
    { id: "date", label: "DATE" },
    { id: "party", label: "PARTY NAME" },
    { id: "type", label: "VOUCHER TYPE" },
    { id: "referenceNo", label: "VOUCHER NO." },
    { id: "debit", label: "DEBIT(₹)" },
    { id: "credit", label: "CREDIT(₹)" },
    { id: "balance", label: "BALANCE" },
  ];

  const [customerColumns, setCustomerColumns] = useState(() => {
    const savedOrder = localStorage.getItem("customerLedgerColumnOrder");
    return savedOrder ? JSON.parse(savedOrder) : initialCustomerColumns;
  });

  const [supplierColumns, setSupplierColumns] = useState(() => {
    const savedOrder = localStorage.getItem("supplierLedgerColumnOrder");
    return savedOrder ? JSON.parse(savedOrder) : initialSupplierColumns;
  });

  useEffect(() => {
    localStorage.setItem(
      "customerLedgerColumnOrder",
      JSON.stringify(customerColumns)
    );
  }, [customerColumns]);

  useEffect(() => {
    localStorage.setItem(
      "supplierLedgerColumnOrder",
      JSON.stringify(supplierColumns)
    );
  }, [supplierColumns]);

  // Reset filters when switching tabs
  useEffect(() => {
    setTypeFilter("all");
    setSearchQuery("");
  }, [activeTab]);

  const fetchLedgerData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: 1,
        limit: 1000,
      };

      // Add type filter if not "all"
      if (typeFilter && typeFilter !== "all") {
        params.type = typeFilter;
      }

      console.log("Fetching ledger data with params:", params);

      if (activeTab === "customer") {
        const response = await getCustomerLedger(params);
        console.log("Customer ledger response:", response.data);
        if (response.data.success) {
          const ledger = response.data.ledger || [];

          // Manually calculate summary values on the client-side for accuracy
          const calculatedTotalSales = ledger
            .filter((item: any) => item.type?.toLowerCase() === "sale")
            .reduce(
              (sum: number, item: any) =>
                sum + (item.debit || 0) + (item.credit || 0),
              0
            );

          const calculatedTotalPayments = ledger
            .filter((item: any) =>
              ["payment", "receipt"].includes(item.type?.toLowerCase())
            )
            .reduce(
              (sum: number, item: any) =>
                sum + (item.debit || 0) + (item.credit || 0),
              0
            );

          const calculatedTotalReceivable =
            calculatedTotalSales - calculatedTotalPayments;

          setCustomerData(ledger);
          setSummaryData((prev) => ({
            ...prev,
            customer: {
              ...prev.customer,

              // ❌ keep old calculated values (not deleting)
              calculatedTotalSales,
              calculatedTotalPayments,
              calculatedTotalReceivable,

              // ✅ USE BACKEND AS SOURCE OF TRUTH
              totalSales: response.data.totalSales ?? calculatedTotalSales,
              totalCredit: response.data.totalCredit ?? calculatedTotalPayments,
              totalReceivable: response.data.totalReceivable ?? calculatedTotalReceivable,
              customersWithBalance:
                response.data.customersWithBalance ??
                prev.customer.customersWithBalance,
            },
          }));
        }
      } else {
        const response = await getSupplierLedger(params);
        console.log("Supplier ledger response:", response.data);
        if (response.data.success) {
          setSupplierData(response.data.ledger);
          setSummaryData((prev) => ({
            ...prev,
            supplier: {
              totalDebit: response.data.totalDebit || 0,
              totalCredit: response.data.totalCredit || 0,
              netBalance: response.data.netBalance || 0,
            },
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching ledger data:", error);
      alert("Failed to fetch ledger data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, typeFilter]);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  useEffect(() => {
    const fetchParties = async () => {
      try {
        const customersRes = await getAllCustomers();
        if (
          customersRes.data &&
          customersRes.data.status &&
          Array.isArray(customersRes.data.data?.customers)
        ) {
          const rawCustomers = customersRes.data.data.customers;
          const reversedCustomers = [...rawCustomers].reverse();
          const processedCustomers = reversedCustomers.map(
            (c: any, index: number) => ({
              ...c,
              customerCode: `CUST${String(index + 1).padStart(3, "0")}`,
            })
          );
          setAllCustomers(processedCustomers);
        } else if (Array.isArray(customersRes.data)) {
          setAllCustomers(customersRes.data);
        }

        const suppliersRes = await getAllSuppliers();
        const supplierList = Array.isArray(suppliersRes)
          ? suppliersRes
          : suppliersRes?.data || suppliersRes?.suppliers || [];

        if (Array.isArray(supplierList)) {
          setAllSuppliers(supplierList);
        }
      } catch (error) {
        console.error("Error fetching parties:", error);
      }
    };
    fetchParties();
  }, []);

  const handleSearch = () => {
    fetchLedgerData();
  };

  const handleAddLedgerSubmit = async () => {
    if (
      !newLedgerEntry.partyId ||
      !newLedgerEntry.date ||
      !newLedgerEntry.type ||
      !newLedgerEntry.amount
    ) {
      alert("Please fill all required fields: Party, Date, Type, and Amount.");
      return;
    }

    setLoading(true);
    try {
      const { amount, transactionType, ...restOfEntry } = newLedgerEntry;
      const payload: any = {
        ...restOfEntry,
        ledgerType: activeTab, // 'customer' or 'supplier'
      };

      // Conditionally add debit or credit based on transactionType
      if (transactionType === "debit") {
        payload.debit = Number(amount);
      } else {
        payload.credit = Number(amount);
      }
      const response = await addLedgerEntry(payload);

      if (response.data.success) {
        alert("Ledger entry added successfully!");
        setAddLedgerDialogOpen(false);
        fetchLedgerData(); // Refresh data
      } else {
        alert(response.data.message || "Failed to add ledger entry.");
      }
    } catch (error) {
      console.error("Error adding ledger entry:", error);
      alert("An error occurred while adding the ledger entry.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const data = activeTab === "customer" ? customerData : supplierData;
    const headers =
      activeTab === "customer" ? customerColumns : supplierColumns;

    // Create CSV content
    let csv = headers.map((col) => col.label).join(",") + "\n";

    data.forEach((item) => {
      const row = headers
        .map((col) => {
          switch (col.id) {
            case "date":
              return formatDate(item.date);
            case "customer":
            case "party":
              return item.partyName;
            case "mobilenumber":
              return item.mobileNumber;
            case "customerId":
              return item.partyId;
            case "type":
              return item.type;
            case "referenceNo":
              return item.referenceNo;
            case "paymentMethod":
              return item.paymentMethod;
            case "debit":
              return item.debit;
            case "credit":
              return item.credit;
            case "balance":
              return item.balance;
            case "dueDate":
              return item.dueDate ? formatDate(item.dueDate) : "";
            default:
              return "";
          }
        })
        .join(",");
      csv += row + "\n";
    });

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}-ledger-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Format currency helper
  const formatCurrency = (amount: number) => {
    if (!amount || amount === 0) return "-";
    const formatted = Math.abs(amount).toLocaleString("en-IN");
    return amount < 0 ? `-₹${formatted}` : `₹${formatted}`;
  };

  const summary =
    activeTab === "customer"
      ? [
          {
            label: "Total Receivables",
            value: formatCurrency(summaryData.customer.totalReceivable),
          },
          {
            label: "Total Sales",
            value: formatCurrency(summaryData.customer.totalSales),
          },
          {
            label: "Total Payments Received",
            value: formatCurrency(summaryData.customer.totalCredit),
          },
          {
            label: "Customers with Balance",
            value: summaryData.customer.customersWithBalance,
          },
        ]
      : [
          {
            label: "Total Debit",
            value: formatCurrency(summaryData.supplier.totalDebit),
          },
          {
            label: "Total Credit",
            value: formatCurrency(summaryData.supplier.totalCredit),
          },
          {
            label: "Net Balance",
            value: formatCurrency(summaryData.supplier.netBalance),
          },
        ];

  const tableData = (
    activeTab === "customer" ? customerData : supplierData
  ).filter((item: any) => {
    // Filter by Type
    if (typeFilter !== "all" && item.type !== typeFilter) return false;

    // Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesName = (item.partyName || "").toLowerCase().includes(query);
      const matchesMobile = (item.mobileNumber || "").toLowerCase().includes(query);
      const matchesRef = (item.referenceNo || "").toLowerCase().includes(query);
      
      let matchesId = false;
      if (activeTab === "customer") {
        const matchedCustomer = allCustomers.find((c: any) => c._id === item.partyId);
        const customerCode = (matchedCustomer?.customerCode || "").toLowerCase();
        matchesId = customerCode.includes(query) || (item.partyId || "").toLowerCase().includes(query);
      } else {
        matchesId = (item.partyId || "").toLowerCase().includes(query);
      }
      return matchesName || matchesMobile || matchesRef || matchesId;
    }
    return true;
  });

  return (
    <AdminLayout title="Ledger">
      <div className="p-4 md:p-6 space-y-6 bg-white min-h-screen rounded-2xl">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          <Button
            className={`rounded-full px-5 py-2 text-sm font-medium shadow-sm transition ${
              activeTab === "customer"
                ? "bg-[#E98C81] text-white"
                : "bg-white text-gray-600 border border-gray-300"
            }`}
            onClick={() => setActiveTab("customer")}
          >
            Customer Ledger
          </Button>
          <Button
            className={`rounded-full px-5 py-2 text-sm font-medium shadow-sm transition ${
              activeTab === "supplier"
                ? "bg-[#E98C81] text-white"
                : "bg-white text-gray-600 border border-gray-300"
            }`}
            onClick={() => setActiveTab("supplier")}
          >
            Supplier Ledger
          </Button>
        </div>

        {/* Search + Filter + Export */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex w-full md:w-1/2 items-center gap-2">
            <Input
              placeholder={
                activeTab === "customer"
                  ? "Search by Customer Name, ID, Mobile"
                  : "Search by Supplier Name, ID, Mobile"
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              className="rounded-full px-4 py-2 border border-gray-300 flex-grow bg-[#FEEEE5]"
            />
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="rounded-full bg-[#E98C81] hover:bg-[#e67a6d] text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={handleExport}
              disabled={loading || tableData.length === 0}
              variant="outline"
              className="rounded-full border border-gray-300 flex items-center gap-2 bg-[#E98C81] text-white hover:bg-[#e67a6d]"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                console.log("Type filter changed to:", value);
                setTypeFilter(value);
              }}
            >
              <SelectTrigger className="w-[130px] rounded-full bg-[#FEEEE5] border border-gray-300">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Sale">Sale</SelectItem>
                <SelectItem value="Purchase">Purchase</SelectItem>
                <SelectItem value="Payment">Payment</SelectItem>
                <SelectItem value="Receipt">Receipt</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setAddLedgerDialogOpen(true)}
              disabled={loading}
              variant="outline"
              className="rounded-full border border-gray-300 flex items-center gap-2 bg-[#E98C81] text-white hover:bg-[#e67a6d]"
            >
              Add Entry
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div
          className={`grid ${
            activeTab === "customer"
              ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-4"
              : "grid-cols-2 sm:grid-cols-3"
          } gap-4 sm:gap-6 text-center`}
        >
          {summary.map((card, i) => (
            <div
              key={i}
              className="bg-[#E98C81] rounded-2xl py-5 sm:py-6 shadow text-white"
            >
              <p className="text-lg sm:text-2xl font-semibold">{card.value}</p>
              <p className="text-xs sm:text-sm opacity-90">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto bg-white rounded-2xl shadow">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#E98C81]" />
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-gray-500">
              <p className="text-lg font-medium">No data available</p>
              {/* <p className="text-sm mt-2">Try adjusting your search or filters</p> */}
            </div>
          ) : (
            <table className="min-w-full border-collapse text-sm text-gray-700 text-center whitespace-nowrap">
              {(() => {
                const columns =
                  activeTab === "customer" ? customerColumns : supplierColumns;

                const renderCell = (item: any, columnId: string) => {
                  switch (columnId) {
                    case "date":
                      return (
                        <td className="px-3 py-3">{formatDate(item.date)}</td>
                      );
                    case "customer":
                      return (
                        <td className="px-3 py-3 text-left">
                          {item.partyName || "-"}
                        </td>
                      );
                    case "mobilenumber":
                      return (
                        <td className="px-3 py-3">
                          {item.mobileNumber || "-"}
                        </td>
                      );
                    case "customerId":
                      const matchedCustomer = allCustomers.find(
                        (c: any) => c._id === item.partyId
                      );
                      return (
                        <td className="px-3 py-3">
                          {matchedCustomer?.customerCode || item.partyId || "-"}
                        </td>
                      );
                    case "type":
                      return (
                        <td className="px-3 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              item.type === "Sale" || item.type === "Purchase"
                                ? "bg-[#E0EDFF] text-[#0055CC]"
                                : "bg-[#E4F7F3] text-[#0D9A83]"
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>
                      );
                    case "referenceNo":
                      return (
                        <td className="px-3 py-3">{item.referenceNo || "-"}</td>
                      );
                    case "paymentMethod":
                      return (
                        <td className="px-3 py-3">
                          {item.paymentMethod || "-"}
                        </td>
                      );
                    case "debit":
                      return (
                        <td className="px-3 py-3 text-red-600 font-medium">
                          {formatCurrency(item.debit)}
                        </td>
                      );
                    case "credit":
                      return (
                        <td className="px-3 py-3 text-green-600 font-medium">
                          {formatCurrency(item.credit)}
                        </td>
                      );
                    case "balance":
                      return (
                        <td
                          className={`px-3 py-3 font-medium ${
                            item.balance < 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {formatCurrency(item.balance)}
                        </td>
                      );
                    case "dueDate":
                      return (
                        <td className="px-3 py-3">
                          {formatDate(item.dueDate)}
                        </td>
                      );
                    case "party":
                      return (
                        <td className="px-3 py-3 text-left">
                          {item.partyName || "-"}
                        </td>
                      );
                    default:
                      return null;
                  }
                };

                return (
                  <>
                    <thead className="bg-[#F6F6F6] text-gray-600">
                      <tr>
                        {columns.map((column) => (
                          <th key={column.id} className="px-3 py-3">
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((item) => (
                        <tr
                          key={item._id}
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          {columns.map((col) => (
                            <React.Fragment key={col.id}>
                              {renderCell(item, col.id)}
                            </React.Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </>
                );
              })()}
            </table>
          )}
        </div>
      </div>

      {/* Add Ledger Dialog */}
      <Dialog open={addLedgerDialogOpen} onOpenChange={setAddLedgerDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Add {activeTab === "customer" ? "Customer" : "Supplier"} Ledger
              Entry
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="partyId" className="text-right">
                {activeTab === "customer" ? "Customer" : "Supplier"}
              </Label>
              <Select
                value={newLedgerEntry.partyId}
                onValueChange={(value) =>
                  setNewLedgerEntry({ ...newLedgerEntry, partyId: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue
                    placeholder={`Select ${
                      activeTab === "customer" ? "Customer" : "Supplier"
                    }`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {activeTab === "customer"
                    ? allCustomers.map((c: any) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.customerCode ? `${c.customerCode} - ` : ""}
                          {c.firstName} {c.lastName}
                        </SelectItem>
                      ))
                    : allSuppliers.map((s: any) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name || s.companyName}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={newLedgerEntry.date}
                onChange={(e) =>
                  setNewLedgerEntry({ ...newLedgerEntry, date: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select
                value={newLedgerEntry.type}
                onValueChange={(value) =>
                  setNewLedgerEntry({ ...newLedgerEntry, type: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sale">Sale</SelectItem>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                  <SelectItem value="Receipt">Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="referenceNo" className="text-right">
                Reference No.
              </Label>
              <Input
                id="referenceNo"
                value={newLedgerEntry.referenceNo}
                onChange={(e) =>
                  setNewLedgerEntry({
                    ...newLedgerEntry,
                    referenceNo: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMethod" className="text-right">
                Payment Method
              </Label>
              <Select
                value={newLedgerEntry.paymentMethod}
                onValueChange={(value) =>
                  setNewLedgerEntry({ ...newLedgerEntry, paymentMethod: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={newLedgerEntry.amount}
                onChange={(e) =>
                  setNewLedgerEntry({
                    ...newLedgerEntry,
                    amount: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Transaction</Label>
              <div className="col-span-3">
                <Select
                  value={newLedgerEntry.transactionType}
                  onValueChange={(value) =>
                    setNewLedgerEntry({
                      ...newLedgerEntry,
                      transactionType: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {activeTab === "customer" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newLedgerEntry.dueDate}
                  onChange={(e) =>
                    setNewLedgerEntry({
                      ...newLedgerEntry,
                      dueDate: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddLedgerDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLedgerSubmit}
              className="bg-[#E98C81] hover:bg-[#e67a6d] text-white"
            >
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

export default Ledger;
