import adminInstance from "./adminInstance";

// Get all orders
export const getAllOrders = () => adminInstance.get('/orders/admin');

// Update order status
export const updateOrderStatus = (orderId: string, data: {
  status: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
}) => adminInstance.put(`/orders/admin/${orderId}/status`, data);