import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Bell, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
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
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getAllOrders, updateOrderStatus } from "@/adminApi/orderApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialColumns = [
  { id: "orderId", label: "Order ID" },
  { id: "customer", label: "Customer" },
  { id: "date", label: "Date" },
  { id: "payment", label: "Payment" },
  { id: "status", label: "Status" },
  { id: "total", label: "Total" },
  { id: "action", label: "Action" },
  { id: "returnRate", label: "Return Rate" },
];

const SortableHeader = ({
  column,
}: {
  column: { id: string; label: string };
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: column.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`py-3 px-6 cursor-grab ${
        column.id === "action" ? "text-center" : "text-left"
      }`}
    >
      {column.label}
    </th>
  );
};

export default function OrderManagement() {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  const [activeTab, setActiveTab] = useState(""); // Empty string for "All"
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const [statusForm, setStatusForm] = useState({
    status: "",
    trackingNumber: "",
    carrier: "",
    estimatedDelivery: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const [columns, setColumns] = useState(() => {
    const savedOrder = localStorage.getItem("orderTableColumnOrder");
    if (savedOrder) {
      try {
        return JSON.parse(savedOrder);
      } catch (e) {
        return initialColumns;
      }
    }
    return initialColumns;
  });

  const itemsPerPage = 10;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchOrders = useCallback(
    async (page: number, status: string, search: string) => {
      setLoading(true);
      try {
        // Pass status to API - if status is empty string, API should return all orders
        const params: any = { page, limit: itemsPerPage };

        // Only add search if it's not empty
        if (search && search.trim() !== "") {
          params.search = search.trim();
        }

        // Only add status to params if it's not empty (not "All")
        if (status !== "") {
          params.status = status;
        }

        console.log("🔍 Fetching orders with params:", params);

        // @ts-ignore
        const response = await getAllOrders(params);

        let orderData = [];
        let count = 0;

        // Enhanced response parsing
        if (
          response.data?.data?.rows &&
          Array.isArray(response.data.data.rows)
        ) {
          orderData = response.data.data.rows;
          count = response.data.data.count || orderData.length;
        } else if (
          response.data?.orders &&
          Array.isArray(response.data.orders)
        ) {
          orderData = response.data.orders;
          count = response.data.total || orderData.length;
        } else if (response.data?.rows && Array.isArray(response.data.rows)) {
          orderData = response.data.rows;
          count = response.data.count || orderData.length;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          orderData = response.data.data;
          count = response.data.count || orderData.length;
        } else if (Array.isArray(response.data)) {
          orderData = response.data;
          count = orderData.length;
        } else if (
          response.data?.result &&
          Array.isArray(response.data.result)
        ) {
          orderData = response.data.result;
          count = response.data.total || orderData.length;
        } else if (response.data?.items && Array.isArray(response.data.items)) {
          orderData = response.data.items;
          count = response.data.total || orderData.length;
        } else {
          console.error("❌ COULD NOT FIND ORDERS IN RESPONSE!");
          console.error(
            "Available keys in response.data:",
            Object.keys(response.data || {})
          );
          toast.error(
            "Could not find orders in API response. Check console for details."
          );
        }

        console.log(`✅ Found ${orderData.length} orders`);

        // Filter on frontend if API doesn't support status filtering
        if (status !== "" && orderData.length > 0) {
          const filteredOrders = orderData.filter(
            (order: any) => order.status?.toLowerCase() === status.toLowerCase()
          );

          // Only use filtered data if API returned all orders
          if (filteredOrders.length < orderData.length) {
            orderData = filteredOrders;
            count = filteredOrders.length;
          }
        }

        // Client-side search fallback if API doesn't support search
        if (search && search.trim() !== "" && orderData.length > 0) {
          const searchLower = search.toLowerCase().trim();
          const searchFiltered = orderData.filter((order: any) => {
            const customerName = order.user?.name?.toLowerCase() || "";
            const orderId = (order.orderId || order._id || "").toLowerCase();
            return customerName.includes(searchLower) || orderId.includes(searchLower);
          });

          // Only use filtered data if it seems like API didn't filter
          if (searchFiltered.length < orderData.length) {
            orderData = searchFiltered;
            count = searchFiltered.length;
          }
        }

        setOrders(orderData);
        setTotalOrders(count);
        setTotalPages(Math.ceil(count / itemsPerPage));
      } catch (error: any) {
        console.error("❌ Failed to fetch orders:", error);
        toast.error(error.response?.data?.message || "Failed to fetch orders.");
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage]
  );

  // Fetch orders whenever page, status, or DEBOUNCED search changes
  useEffect(() => {
    fetchOrders(currentPage, activeTab, debouncedSearchQuery);
  }, [currentPage, activeTab, debouncedSearchQuery, fetchOrders]);

  useEffect(() => {
    localStorage.setItem("orderTableColumnOrder", JSON.stringify(columns));
  }, [columns]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !statusForm.status) {
      toast.error("Please select a status");
      return;
    }

    setUpdating(true);
    try {
      const payload: any = {
        status: statusForm.status,
      };

      if (statusForm.trackingNumber) {
        payload.trackingNumber = statusForm.trackingNumber;
      }
      if (statusForm.carrier) {
        payload.carrier = statusForm.carrier;
      }
      if (statusForm.estimatedDelivery) {
        payload.estimatedDelivery = new Date(
          statusForm.estimatedDelivery
        ).toISOString();
      }

      // @ts-ignore
      await updateOrderStatus(selectedOrder._id, payload);

      // Refresh the orders list to show updated data
      await fetchOrders(currentPage, activeTab, debouncedSearchQuery);

      toast.success("Order status updated successfully!");
      setUpdateDialogOpen(false);

      setStatusForm({
        status: "",
        trackingNumber: "",
        carrier: "",
        estimatedDelivery: "",
      });
    } catch (error: any) {
      console.error("Failed to update order status:", error);
      toast.error(
        error?.response?.data?.message || "Failed to update order status"
      );
    } finally {
      setUpdating(false);
    }
  };

  const renderCell = (order: any, columnId: string) => {
    switch (columnId) {
      case "orderId":
        return (
          <td className="py-3 px-6 text-sm font-medium text-gray-900">
            #{order.orderId || order._id.slice(-6)}
          </td>
        );
      case "customer":
        return (
          <td className="py-3 px-6 text-sm text-gray-700">
            {order.user?.name || "N/A"}
          </td>
        );
      case "date":
        return (
          <td className="py-3 px-6 text-sm text-gray-700">
            {new Date(order.createdAt).toLocaleDateString()}
          </td>
        );
      case "payment":
        return (
          <td className="py-3 px-6 text-sm text-gray-700">
            {order.paymentMethod}
          </td>
        );
      case "status":
        return (
          <td className="py-3 px-6 text-sm">
            <Badge className={getStatusColor(order.status)}>
              {order.status}
            </Badge>
          </td>
        );
      case "total":
        return (
          <td className="py-3 px-6 text-sm text-gray-800 font-medium">
            ₹{order.totalPrice?.toFixed(2) || "0.00"}
          </td>
        );
      case "action":
        const openUpdateDialog = (order: any) => {
          setSelectedOrder(order);
          setStatusForm({
            status: order.status || "",
            trackingNumber: order.trackingNumber || "",
            carrier: order.carrier || "",
            estimatedDelivery: order.estimatedDelivery
              ? new Date(order.estimatedDelivery).toISOString().slice(0, 16)
              : "",
          });
          setUpdateDialogOpen(true);
        };
        return (
          <td className="py-3 px-6 text-center">
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedOrder(order);
                  setViewDialogOpen(true);
                }}
              >
                View
              </Button>
              <Button
                size="sm"
                className="bg-[#E98C81] hover:bg-[#dc5383] text-white"
                onClick={() => openUpdateDialog(order)}
              >
                Update Status
              </Button>
            </div>
          </td>
        );
      case "returnRate":
        return (
          <td className="py-3 px-6 text-sm text-gray-700">
            {order.returnRate || "0%"}
          </td>
        );
      default:
        return <td key={columnId} className="py-3 px-6"></td>;
    }
  };

  return (
    <AdminLayout title="Order Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="grid grid-cols-3 items-center gap-4 mb-4">
          <div className="col-span-1">
            <h1 className="text-2xl font-semibold text-[#003049]">
              {/* Order Management */}
            </h1>
          </div>

          <div className="col-span-1 flex justify-center items-center gap-4">
            <div className="relative">
              <Input
                placeholder="Search by name or order ID"
                className="pl-10 pr-4 rounded-full bg-[#FDEBE6] text-sm w-64 border-0 focus:ring-2 focus:ring-[#f48c83]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#f48c83]" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <CalendarDays className="w-6 h-6 text-[#f48c83] cursor-pointer" />

            <div className="relative">
              <Bell className="w-6 h-6 text-[#003049]" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#f48c83]" />
            </div>
          </div>

          <div className="col-span-1"></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 border-b border-gray-200">
          {[
            { label: "All", value: "" },
            { label: "Pending", value: "Pending" },
            { label: "Processing", value: "Processing" },
            { label: "Shipped", value: "Shipped" },
            { label: "Delivered", value: "Delivered" },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => handleTabClick(tab.value)}
              className={`px-6 py-2 rounded-t-lg text-sm font-medium transition-colors duration-200 ${
                activeTab === tab.value
                  ? "bg-[#f48c83] text-white shadow-md"
                  : "text-gray-500 hover:text-[#f48c83]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search indicator */}
        {debouncedSearchQuery && (
          <div className="text-sm text-gray-600">
            Searching for: <span className="font-medium">{debouncedSearchQuery}</span>
            {" "}({totalOrders} result{totalOrders !== 1 ? 's' : ''})
          </div>
        )}

        {/* TABLE */}
        {(() => {
          const handleDragEnd = (event: DragEndEvent) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
              setColumns((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
              });
            }
          };

          const columnIds = columns.map((c) => c.id);

          return (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <table className="w-full">
                <thead>
                  <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={columnIds}
                      strategy={horizontalListSortingStrategy}
                    >
                      <tr className="bg-[#FDEBE6] text-left text-sm text-[#4B5563]">
                        {columns.map((column) => (
                          <SortableHeader key={column.id} column={column} />
                        ))}
                      </tr>
                    </SortableContext>
                  </DndContext>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="text-center py-10"
                      >
                        Loading orders...
                      </td>
                    </tr>
                  ) : orders.length > 0 ? (
                    orders.map((order) => (
                      <tr
                        key={order._id}
                        className="border-t border-gray-100 hover:bg-[#fff4f3] transition"
                      >
                        {columns.map((col) => renderCell(order, col.id))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        {debouncedSearchQuery 
                          ? `No orders found matching "${debouncedSearchQuery}"`
                          : "No orders found for this status."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="text-gray-500 hover:text-[#f48c83]"
            >
              &lt; Previous
            </Button>

            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="text-gray-500 hover:text-[#E98C81]"
            >
              Next &gt;
            </Button>
          </div>
        )}
      </div>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              #{selectedOrder?.orderId || selectedOrder?._id?.slice(-6)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">
                  {selectedOrder?.user?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {selectedOrder?.createdAt
                    ? new Date(selectedOrder.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Payment</p>
                <p className="font-medium">
                  {selectedOrder?.paymentMethod || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium">
                  Rs. {selectedOrder?.totalPrice || "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={getStatusColor(selectedOrder?.status || "")}>
                  {selectedOrder?.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Return Rate</p>
                <p className="font-medium">
                  {selectedOrder?.returnRate || "0%"}
                </p>
              </div>
            </div>

            {selectedOrder?.trackingNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Tracking Number</p>
                <p className="font-medium">{selectedOrder.trackingNumber}</p>
              </div>
            )}

            {selectedOrder?.carrier && (
              <div>
                <p className="text-sm text-muted-foreground">Carrier</p>
                <p className="font-medium">{selectedOrder.carrier}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderId || selectedOrder?._id?.slice(-6)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={statusForm.status}
                onValueChange={(value) =>
                  setStatusForm({ ...statusForm, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                placeholder="TRACK123456789"
                value={statusForm.trackingNumber}
                onChange={(e) =>
                  setStatusForm({
                    ...statusForm,
                    trackingNumber: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="carrier">Carrier</Label>
              <Input
                id="carrier"
                placeholder="FedEx, UPS, DHL, etc."
                value={statusForm.carrier}
                onChange={(e) =>
                  setStatusForm({ ...statusForm, carrier: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estimatedDelivery">Estimated Delivery</Label>
              <Input
                id="estimatedDelivery"
                type="datetime-local"
                value={statusForm.estimatedDelivery}
                onChange={(e) =>
                  setStatusForm({
                    ...statusForm,
                    estimatedDelivery: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>

            <Button
              className="bg-[#E98C81] hover:bg-[#f48c83]"
              onClick={handleUpdateStatus}
              disabled={updating || !statusForm.status}
            >
              {updating ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-800",
    Shipped: "bg-blue-100 text-blue-800",
    Delivered: "bg-green-100 text-green-800",
    Processing: "bg-purple-100 text-purple-800",
    Cancelled: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};