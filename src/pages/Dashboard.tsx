import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { getDashboardData, getDashboardDataByDateRange } from "@/adminApi/dashboardApi";
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { label: "Total Sale", value: "Rs. 0", color: "bg-[#FFDCDC]" },
    { label: "Total Order", value: "0", color: "bg-[#EEDCFF]" },
    { label: "Active Customer", value: "0", color: "bg-[#C9F5EE]" },
    { label: "Low Stock", value: "0", color: "bg-[#FFE6B2]" },
  ]);

  const [salesData, setSalesData] = useState<any[]>([]);

  // product performance graph — Y-axis limited to 50
  const [productPerformance, setProductPerformance] = useState<any[]>([]);

  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  const todayObj = new Date();
  const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (startDate?: string, endDate?: string) => {
      try {
        let response;
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setUTCHours(23, 59, 59, 999);
          response = await getDashboardDataByDateRange(start.toISOString(), end.toISOString());
        } else {
          const currentYear = new Date().getFullYear();
          const start = new Date(Date.UTC(currentYear, 0, 1));
          const end = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
          response = await getDashboardDataByDateRange(start.toISOString(), end.toISOString());
        }

        if (response && response.success && response.data) {
          const { cards, charts } = response.data;

          // Update Stats (Check if cards exist)
          if (cards) {
            setStats([
              {
                label: "Total Sale",
                value: `Rs. ${cards.totalSalesAmount?.toLocaleString() || 0}`,
                color: "bg-[#FFDCDC]",
              },
              {
                label: "Total Order",
                value: (cards.totalOrders || 0).toString(),
                color: "bg-[#EEDCFF]",
              },
              {
                label: "Active Customer",
                value: (cards.activeCustomers || 0).toString(),
                color: "bg-[#C9F5EE]",
              },
              {
                label: "Low Stock",
                value: (cards.lowStockCount || 0).toString(),
                color: "bg-[#FFE6B2]",
              },
            ]);
          }

          if (charts) {
            // Update Sales Chart
            if (charts.salesChart) {
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];

              const fullYearSales = monthNames.map((month, index) => {
                const found = charts.salesChart.find(
                  (item: any) => item.month === index + 1
                );

                return {
                  month,
                  total: found ? Number(found.total.toFixed(2)) : 0,
                };
              });

              setSalesData(fullYearSales);
            }

            // Update Product Performance
            if (charts.productPerformance) {
              const colors = [
                "#8B5CF6",
                "#3B82F6",
                "#F97316",
                "#22C55E",
                "#EAB308",
                "#EC4899",
              ];
              const mappedPerformance = charts.productPerformance.map(
                (item: any, index: number) => ({
                  name: item.productName,
                  value: item.sold || 0,
                  color: colors[index % colors.length],
                })
              );
              setProductPerformance(mappedPerformance);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

  const handleApplyFilter = () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error("Please select both start and end dates");
      return;
    }
    fetchData(dateRange.start, dateRange.end);
    setDateFilterOpen(false);
  };

  const handleClearFilter = () => {
    setDateRange({ start: "", end: "" });
    fetchData();
    setDateFilterOpen(false);
  };

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-2">
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="flex items-center gap-1 h-8 text-xs rounded-full border-gray-300 text-gray-600 hover:bg-gray-100"
            onClick={() => setDateFilterOpen(true)}
          >
            <Calendar className="w-3.5 h-3.5" />
            {dateRange.start && dateRange.end ? `${dateRange.start} - ${dateRange.end}` : "Filter by Date"}
          </Button>
        </div>

        <div className="space-y-8">
        {/* ---- Top Stats ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((item, index) => (
            <Card
              key={index}
              className={`${item.color} border-0 shadow-md rounded-xl ${
                item.label === "Low Stock" ? "cursor-pointer hover:opacity-80" : ""
              }`}
              onClick={() => {
                if (item.label === "Low Stock") navigate("/inventory");
              }}
            >
              <CardContent className="p-6 text-center">
                <p className="text-sm font-medium text-gray-600">
                  {item.label}
                </p>
                <p className="text-3xl font-bold text-[#A62539] mt-2">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ---- Charts Section ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Line Chart */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot={{ r: 6 }}
                    activeDot={{ r: 8 }}
                    name="Total Sales"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Performance Bar Chart */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Product Performance</CardTitle>
            </CardHeader>
            <CardContent className="pb-10">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productPerformance} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  {/* 👇 Fix Y-axis to show up to 50 only */}
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {productPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>

      {/* Date Filter Dialog */}
      <Dialog open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter Dashboard Data</DialogTitle>
            <DialogDescription>
              Select a start and end date to filter the dashboard statistics.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right text-sm font-medium col-span-1">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.start}
                max={today}
                onChange={(e) => {
                  const val = e.target.value;
                  setDateRange({ ...dateRange, start: val, end: dateRange.end && val > dateRange.end ? "" : dateRange.end });
                }}
                onKeyDown={(e) => e.preventDefault()}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right text-sm font-medium col-span-1">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.end}
                min={dateRange.start}
                max={today}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                onKeyDown={(e) => e.preventDefault()}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClearFilter}>Clear Filter</Button>
            <Button onClick={handleApplyFilter} className="bg-[#E57373] hover:bg-[#d75a5a] text-white">Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
