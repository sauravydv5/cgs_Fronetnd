import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { getDashboardData } from "@/adminApi/dashboardApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [stats, setStats] = useState([
    { label: "Total Sale", value: "Rs. 0", color: "bg-[#FFDCDC]" },
    { label: "Total Order", value: "0", color: "bg-[#EEDCFF]" },
    { label: "Active Customer", value: "0", color: "bg-[#C9F5EE]" },
    { label: "Low Stock", value: "0", color: "bg-[#FFE6B2]" },
  ]);

  const [salesData, setSalesData] = useState<any[]>([]);

  // product performance graph — Y-axis limited to 50
  const [productPerformance, setProductPerformance] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getDashboardData();
        if (response && response.success && response.data) {
          const { cards, charts } = response.data;

          // Update Stats
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

          // Update Sales Chart (FIXED)
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
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8">
        {/* ---- Top Stats ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((item, index) => (
            <Card
              key={index}
              className={`${item.color} border-0 shadow-md rounded-xl`}
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
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={false} axisLine={false} />
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
    </AdminLayout>
  );
}
