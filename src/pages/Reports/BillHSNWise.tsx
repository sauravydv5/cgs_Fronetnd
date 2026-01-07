import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Download, Search, Calendar } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getAllReports, getReportsByDateRange } from "@/adminApi/reportApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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

// ---------------- Types ----------------
type BillItem = {
  id?: string;
  billDate: string;
  billNumber: string;
  itemName: string;
  hsnCode?: string;
  gstPercent?: number;
  sgst?: number;
  cgst?: number;
  qty: number;
  total: number;
  taxableAmount: number;
};

type SummaryType = {
  totalItems: number;
  totalQty: number;
  totalAmount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
};

export default function BillHSNWise() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHSN, setSelectedHSN] = useState("All HSN Code");
  const [billData, setBillData] = useState<BillItem[]>([]);
  const [summary, setSummary] = useState<SummaryType | null>(null);
  const [loading, setLoading] = useState(false);
  const [hsnCodes, setHsnCodes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  const initialColumns = [
    { id: "sno", label: "SNO." },
    { id: "billDate", label: "BILL DATE" },
    { id: "billNumber", label: "BILL NUMBER" },
    { id: "itemName", label: "ITEM NAME" },
    { id: "hsnCode", label: "HSN CODE" },
    { id: "gstRate", label: "GST RATE" },
    { id: "sgst", label: "SGST" },
    { id: "cgst", label: "CGST" },
    { id: "qty", label: "QTY" },
    { id: "totalAmt", label: "TOTAL AMT" },
    { id: "taxableAmt", label: "TAXABLE AMT" },
  ];

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("billHSNWiseColumnOrder");
    return savedOrder ? JSON.parse(savedOrder) : initialColumns;
  });

  // ---------------- Fetch & Calculate ----------------
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setBillData([]);
    setSummary(null);
    try {
      let response;
      if (dateRange.start && dateRange.end) {
        response = await getReportsByDateRange(dateRange.start, dateRange.end);
      } else {
        response = await getAllReports();
      }

      if (response.success && Array.isArray(response.bills)) {
        // Flatten items and calculate totals
        const flattenedItems: BillItem[] = response.bills.flatMap((bill: any) =>
          (bill.items || []).map((item: any) => {
            const qty = Number(item.qty || 0);
            const taxableAmount = Number(item.taxableAmount || 0);
            const sgst = Number(item.sgst || 0);
            const cgst = Number(item.cgst || 0);
            const total = taxableAmount + sgst + cgst + (Number(bill.roundOff) || 0);
            return {
              ...item,
              billDate: bill.billDate,
              billNumber: bill.billNo,
              qty,
              taxableAmount,
              sgst,
              cgst,
              total,
            };
          })
        );

        // Filter by HSN & Search
        const filteredData = flattenedItems.filter((item) => {
          const hsnMatch = selectedHSN === "All HSN Code" || item.hsnCode === selectedHSN;
          const searchMatch =
            !searchTerm ||
            item.hsnCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.itemName?.toLowerCase().includes(searchTerm.toLowerCase());
          return hsnMatch && searchMatch;
        });

        setBillData(filteredData);

        // Set HSN codes for dropdown
        const uniqueHsnCodes = [...new Set(flattenedItems.map((item) => item.hsnCode).filter(Boolean))];
        setHsnCodes(uniqueHsnCodes as string[]);

        // Calculate summary
        const totalQty = filteredData.reduce((sum, item) => sum + Number(item.qty || 0), 0);
        const totalTaxableAmount = filteredData.reduce((sum, item) => sum + Number(item.taxableAmount || 0), 0);
        const totalSgst = filteredData.reduce((sum, item) => sum + Number(item.sgst || 0), 0);
        const totalCgst = filteredData.reduce((sum, item) => sum + Number(item.cgst || 0), 0);
        const totalAmount = filteredData.reduce((sum, item) => sum + Number(item.total || 0), 0);

        setSummary({
          totalItems: filteredData.length,
          totalQty,
          totalAmount,
          totalTaxableAmount,
          totalCgst,
          totalSgst,
        });
      } else {
        toast.error("Failed to fetch report data.");
      }
    } catch (error) {
      toast.error("An error occurred while fetching the report.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedHSN, dateRange]);

  const handleDateRangeApply = () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error("Please select both start and end dates");
      return;
    }
    setDateFilterOpen(false);
    fetchReportData();
  };

  useEffect(() => {
    localStorage.setItem("billHSNWiseColumnOrder", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // ---------------- CSV Export ----------------
  const handleExport = () => {
    if (!billData.length) return;
    const csvContent = [
      columns.map((c) => c.label).join(","),
      ...billData.map((row) =>
        columns
          .map((col) => {
            let val: any = row[col.id as keyof BillItem] ?? "";
            if (typeof val === "number") val = val.toFixed(2);
            return String(val).includes(",") ? `"${val}"` : val;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Bill_HSN_Wise_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------- Sortable Header ----------------
  const SortableHeader = ({ column }: { column: { id: string; label: string } }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
      <th
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-grab"
      >
        {column.label}
      </th>
    );
  };

  // ---------------- Render ----------------
  const renderCell = (row: BillItem & { sno: number }, columnId: string) => {
    switch (columnId) {
      case "sno": return <td className="px-4 py-4 text-sm text-gray-700">{row.sno}</td>;
      case "billDate": return <td className="px-4 py-4 text-sm text-gray-700">{new Date(row.billDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric'})}</td>;
      case "billNumber": return <td className="px-4 py-4 text-sm text-gray-700">{row.billNumber}</td>;
      case "itemName": return <td className="px-4 py-4 text-sm text-gray-700">{row.itemName}</td>;
      case "hsnCode": return <td className="px-4 py-4 text-sm text-gray-700">{row.hsnCode || "N/A"}</td>;
      case "gstRate": return <td className="px-4 py-4 text-sm text-gray-700">{row.gstPercent ? `${row.gstPercent}%` : "N/A"}</td>;
      case "sgst": return <td className="px-4 py-4 text-sm text-gray-700">₹{row.sgst.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}</td>;
      case "cgst": return <td className="px-4 py-4 text-sm text-gray-700">₹{row.cgst.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}</td>;
      case "qty": return <td className="px-4 py-4 text-sm text-gray-700">{row.qty}</td>;
      case "totalAmt": return <td className="px-4 py-4 text-sm text-gray-700">₹{row.total.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}</td>;
      case "taxableAmt": return <td className="px-4 py-4 text-sm text-gray-700">₹{row.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}</td>;
      default: return null;
    }
  };

  return (
    <AdminLayout title="Reports > Bill HSN Wise">
      <div className="bg-white-50 min-h-screen">
        {/* Header */}
        <div className="bg-white p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex w-full md:w-1/2 items-center gap-2">
              <input
                type="text"
                placeholder="Search by HSN Code, Bill ID, Number, party..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-full px-4 py-2 border border-gray-300 flex-grow bg-[#FEEEE5] focus:outline-none"
              />
              <Button onClick={fetchReportData} className="rounded-full bg-[#E98C81] hover:bg-[#e67a6d] text-white">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <select
              className="px-4 py-2.5 border border-gray-300 rounded-lg bg-[#EBEBEB] text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              value={selectedHSN}
              onChange={(e) => setSelectedHSN(e.target.value)}
            >
              <option>All HSN Code</option>
              {hsnCodes.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>

            <Button variant="outline" className="rounded-full border border-gray-300 bg-[#EBEBEB] text-gray-700 hover:bg-gray-200 flex items-center gap-2" onClick={() => setDateFilterOpen(true)}>
              <Calendar size={16} />
            </Button>

            <Button onClick={handleExport} disabled={loading || billData.length === 0} className="w-[239px] h-[50px] bg-[#E98C81] hover:bg-[#d87a6f] text-white rounded-full flex items-center justify-center gap-2 shadow-md">
              Export <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="p-6">
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <DndContext collisionDetection={closestCenter} onDragEnd={(event) => {
              const { active, over } = event;
              if (over && active.id !== over.id) {
                setColumns((items) => {
                  const oldIndex = items.findIndex((item) => item.id === active.id);
                  const newIndex = items.findIndex((item) => item.id === over.id);
                  return arrayMove(items, oldIndex, newIndex);
                });
              }
            }}>
              <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                <table className="w-full">
                  <thead className="bg-white border-b-2 border-gray-200">
                    <tr>
                      {columns.map((col) => <SortableHeader key={col.id} column={col} />)}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-10">Loading report...</td>
                      </tr>
                    ) : billData.length > 0 ? (
                      <>
                        {billData.map((row, index) => (
                          <tr key={row.id || index} className="hover:bg-gray-50 transition-colors">
                            {columns.map((col) => renderCell({ ...row, sno: index + 1 }, col.id))}
                          </tr>
                        ))}
                        {summary && (
                          <tr className="bg-gray-100 font-semibold border-t-2 border-gray-200">
                            {columns.map((col, index) => {
                              if (index === 0) {
                                return (
                                  <td key={col.id} className="px-4 py-4 text-sm text-gray-900">
                                    TOTAL
                                  </td>
                                );
                              }
                              switch (col.id) {
                                case "sgst":
                                  return (
                                    <td key={col.id} className="px-4 py-4 text-sm text-gray-900">
                                      ₹{summary.totalSgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  );
                                case "cgst":
                                  return (
                                    <td key={col.id} className="px-4 py-4 text-sm text-gray-900">
                                      ₹{summary.totalCgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  );
                                case "qty":
                                  return <td key={col.id} className="px-4 py-4 text-sm text-gray-900">{summary.totalQty}</td>;
                                case "totalAmt":
                                  return (
                                    <td key={col.id} className="px-4 py-4 text-sm text-gray-900">
                                      ₹{summary.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  );
                                case "taxableAmt":
                                  return (
                                    <td key={col.id} className="px-4 py-4 text-sm text-gray-900">
                                      ₹{summary.totalTaxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  );
                                default:
                                  return <td key={col.id} className="px-4 py-4 text-sm text-gray-900"></td>;
                              }
                            })}
                          </tr>
                        )}
                      </>
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-10">No data found for the selected criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          </div>

          {/* Summary Cards */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Items", value: summary?.totalItems || 0, color: "blue" },
              { label: "Total Qty", value: summary?.totalQty || 0, color: "purple" },
              { label: "Total Amount", value: `₹ ${summary?.totalAmount?.toLocaleString('en-IN') || 0}`, color: "green" },
              { label: "Total CGST", value: `₹ ${summary?.totalCgst?.toLocaleString('en-IN') || 0}`, color: "orange" },
              { label: "Total SGST", value: `₹ ${summary?.totalSgst?.toLocaleString('en-IN') || 0}`, color: "pink" },
            ].map((card) => (
              <div
                key={card.label}
                className={`rounded-xl p-5 text-center border 
                  ${card.color === 'blue' ? 'bg-blue-50 border-blue-200' : ''}
                  ${card.color === 'purple' ? 'bg-purple-50 border-purple-200' : ''}
                  ${card.color === 'green' ? 'bg-green-50 border-green-200' : ''}
                  ${card.color === 'orange' ? 'bg-orange-50 border-orange-200' : ''}
                  ${card.color === 'pink' ? 'bg-pink-50 border-pink-200' : ''}`}
              >
                <div className="text-sm text-gray-600 mb-2 font-medium">{card.label}</div>
                <div className="text-3xl font-bold text-gray-800">{card.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Date Filter Dialog */}
        <Dialog open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
          <DialogContent className="w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Filter by Date</DialogTitle>
              <DialogDescription>Select a start and end date to view reports within that range.</DialogDescription>
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
              <Button variant="outline" onClick={() => setDateFilterOpen(false)}>Cancel</Button>
              <Button className="bg-[#E98C81] hover:bg-[#f48c83]" onClick={handleDateRangeApply}>Apply Filter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
