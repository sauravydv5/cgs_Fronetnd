import adminInstance from "./adminInstance";

// Add a new customer
export const addCustomer = (data: any) =>
  adminInstance.post("/customers", data);

// Get all customers
export const getAllCustomers = () => adminInstance.get("/customers");
export const getCustomers = getAllCustomers;

// Filter customers by rating
export const getCustomersByRating = (rating: number) =>
  adminInstance.get(`/customers/rating?rating=${rating}`);

// Filter customers by date range
export const getCustomersByDateRange = (startDate: string, endDate: string) =>
  adminInstance.get(`/customers/date-range?startDate=${startDate}&endDate=${endDate}`);

// Delete a customer by ID
export const deleteCustomer = (customerId: string) =>
  adminInstance.delete(`/customers/${customerId}`);

// Update customer status by ID
export const updateCustomerStatus = (customerId: string, isBlocked: boolean) =>
  adminInstance.patch(`/customers/${customerId}/status`, { status: isBlocked });