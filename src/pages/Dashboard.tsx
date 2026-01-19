import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import {
  getDashboardData,
  getDashboardDataByDateRange,
} from "@/adminApi/dashboardApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,  
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();

  /* =======================
     STATES
  ======================= */
  const [stats, setStats] = useState([
    { label: "Total Sale", value: "Rs. 0", color: "bg-[#FFDCDC]" },
    { label: "Total Order", value: "0", color: "bg-[#EEDCFF]" },
    { label: "Active Customer", value: "0", color: "bg-[#C9F5EE]" },
    { label: "Low Stock", value: "0", color: "bg-[#FFE6B2]" },
  ]);

  const [salesData, setSalesData] = useState<any[]>([]);
  const [productPerformance, setProductPerformance] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [graphDateRange, setGraphDateRange] = useState("");

  const today = new Date().toISOString().split("T")[0];

  /* =======================
     INITIAL LOAD
  ======================= */
  useEffect(() => {
    loadDashboard();
  }, []);

  /* =======================
     API HANDLER
  ======================= */
  const loadDashboard = async (startDate?: string, endDate?: string) => {
    try {
      let response;

      if (startDate && endDate) {
        response = await getDashboardDataByDateRange(startDate, endDate);
      } else {
        response = await getDashboardData();
      }

      if (!response?.success) return;

      const { cards, charts } = response.data;

      /* ---------- Cards ---------- */
      setStats([
        {
          label: "Total Sale",
          value: `Rs. ${cards.totalSalesAmount.toLocaleString()}`,
          color: "bg-[#FFDCDC]",
        },
        {
          label: "Total Order",
          value: cards.totalOrders.toString(),
          color: "bg-[#EEDCFF]",
        },
        {
          label: "Active Customer",
          value: cards.activeCustomers.toString(),
          color: "bg-[#C9F5EE]",
        },
        {
          label: "Low Stock",
          value: cards.lowStockCount.toString(),
          color: "bg-[#FFE6B2]",
        },
      ]);

      /* ---------- Sales Chart ---------- */
      let mappedSales = [];
      const salesChartData = Array.isArray(charts?.salesChart) ? charts.salesChart : [];

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        setGraphDateRange(`${format(start, "dd MMM yyyy")} - ${format(end, "dd MMM yyyy")}`);

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 60) {
          const months = [];
          const s = new Date(start);
          s.setDate(1);
          const e = new Date(end);
          e.setDate(1);

          while (s <= e) {
            months.push(new Date(s));
            s.setMonth(s.getMonth() + 1);
          }

          mappedSales = months.map((m) => {
            const mStr = format(m, "yyyy-MM");
            const total = salesChartData.reduce((acc: number, item: any) => {
              const itemDate = item.date || item._id;
              if (itemDate && (typeof itemDate === "string" || itemDate instanceof Date)) {
                try {
                  if (format(new Date(itemDate), "yyyy-MM") === mStr) {
                    return acc + (Number(item.total) || 0);
                  }
                } catch {}
              }
              if (item.month && item.year) {
                const itemMStr = `${item.year}-${String(item.month).padStart(2, "0")}`;
                if (itemMStr === mStr) return acc + (Number(item.total) || 0);
              }
              return acc;
            }, 0);
            return { label: format(m, "MMM yyyy"), total };
          });
        } else {
          const days = [];
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
          }

          mappedSales = days.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const total = salesChartData.reduce((acc: number, item: any) => {
              const itemDate = item.date || item._id;
              if (!itemDate) return acc;
              let match = false;
              if (String(itemDate).startsWith(dateStr)) match = true;
              else {
                try { if (format(new Date(itemDate), "yyyy-MM-dd") === dateStr) match = true; } catch {}
              }
              if (match) return acc + (Number(item.total) || 0);
              return acc;
            }, 0);
            return { label: format(date, "dd MMM"), total };
          });
        }
      } else {
        const monthNames = [
          "Jan","Feb","Mar","Apr","May","Jun",
          "Jul","Aug","Sep","Oct","Nov","Dec",
        ];
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const currentFullYear = new Date().getFullYear();
        setGraphDateRange(`Jan ${currentFullYear} - Dec ${currentFullYear}`);

        mappedSales = monthNames.map((month, index) => {
          const found = salesChartData.find(
            (item: any) => item.month === index + 1 && item.year === currentFullYear
          );
          return {
            label: `${month} ${currentYear}`,
            total: found?.total || 0,
          };
        });
      }

      setSalesData(mappedSales);

      /* ---------- Product Performance ---------- */
      const colors = ["#8B5CF6","#3B82F6","#F97316","#22C55E","#EAB308","#EC4899"];

      setProductPerformance(
        charts.productPerformance.map((item: any, index: number) => ({
          name: item.productName,
          value: item.sold,
          color: colors[index % colors.length],
        }))
      );
    } catch (err) {
      console.error("Dashboard Error:", err);
    }
  };

  /* =======================
     FILTER HANDLERS
  ======================= */
  const handleApplyFilter = () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error("Please select both dates");
      return;
    }
    loadDashboard(dateRange.start, dateRange.end);
    setDateFilterOpen(false);
  };

  const handleClearFilter = () => {
    setDateRange({ start: "", end: "" });
    loadDashboard();
    setDateFilterOpen(false);
  };

  /* =======================
     UI
  ======================= */
  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="flex items-center gap-1 h-8 text-xs rounded-full"
            onClick={() => setDateFilterOpen(true)}
          >
            <Calendar className="w-4 h-4" />
            {dateRange.start && dateRange.end
              ? `${dateRange.start} - ${dateRange.end}`
              : "Filter by Date"}
          </Button>
        </div>

        {/* ---- CARDS ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((item, i) => (
            <Card
              key={i}
              className={`${item.color} border-0 rounded-xl cursor-pointer`}
              onClick={() =>
                item.label === "Low Stock" && navigate("/inventory")
              }
            >
              <CardContent className="p-6 text-center">
                <p className="text-sm text-gray-600">{item.label}</p>
                <p className="text-3xl font-bold mt-2 text-[#A62539]">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ---- CHARTS ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Sales
                {graphDateRange && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({graphDateRange})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    dataKey="total"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer height={300}>
                <BarChart data={productPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {productPerformance.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ---- DATE FILTER MODAL ---- */}
      <Dialog open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Dashboard</DialogTitle>
            <DialogDescription>
              Select date range to filter dashboard data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                max={today}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                min={dateRange.start}
                max={today}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClearFilter}>
              Clear
            </Button>
            <Button onClick={handleApplyFilter}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
