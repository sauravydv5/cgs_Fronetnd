import adminInstance from "./adminInstance";

// Get all orders
export const getAllOrders = (params?: any) => adminInstance.get('/orders/admin', { params });

// Update order status
export const updateOrderStatus = (orderId: string, data: {
  status: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
}) => adminInstance.put(`/orders/admin/${orderId}/status`, data);

// Get orders by date range
export const getOrdersByDateRange = (startDate: string, endDate: string) => 
  adminInstance.get('/orders/date-range', { params: { startDate, endDate } });