import adminInstance from "./adminInstance";

// Add a new customer
export const addCustomer = (data: any) =>
  adminInstance.post("/customers", data);

// Get all customers
export const getAllCustomers = (params?: any) => adminInstance.get("/customers", { params });
export const getCustomers = getAllCustomers;

// Filter customers by date range
export const getCustomersByDateRange = (startDate: string, endDate: string) =>
  adminInstance.get(`/customers/date-range?startDate=${startDate}&endDate=${endDate}`);

// Delete a customer by ID
export const deleteCustomer = (customerId: string) =>
  adminInstance.delete(`/customers/${customerId}`);

// Update customer status by ID
export const updateCustomerStatus = (customerId: string, isBlocked: boolean) =>
  adminInstance.patch(`/customers/${customerId}/status`, { status: isBlocked });

// Update customer rating by ID
export const updateCustomerRating = (customerId: string, rating: number) =>
  adminInstance.patch(`/customers/${customerId}/rating`, { rating });

//save customer rating settings
export const saveCustomerRatingSettings = (data: {
  star1: number;
  star2: number;
  star3: number;
  star4: number;
  star5: number;
}) =>
  adminInstance.post("/customers/rating-settings", data);

// Get customer rating settings
export const getCustomerRatingSettings = () =>
  adminInstance.get("/customers/rating-settings");