import adminInstance from "./adminInstance";

// add a new bill
export const addNewBill = async (billData: any) => {
  try {
    const response = await adminInstance.post("/bills/add", billData);
    return response.data;
  } catch (error) {
    console.error("Error adding new bill:", error);
    throw error;
  }
};

// get all new bills
export const getAllNewBills = async () => {
  try {
    const response = await adminInstance.get("/bills/all");
    return response.data;
  } catch (error) {
    console.error("Error getting all new bills:", error);
    throw error;
  }
};

// get bills by customer id
export const getBillsByCustomerId = async (customerId: string) => {
  try {
    const response = await adminInstance.get(`/bills/customer/${customerId}`);
    return response.data;
  } catch (error) {
    console.error("Error getting bills by customer id:", error);
    throw error;
  }
};

// generate a bill for a customer
export const generateBill = async (customerId: string) => {
  try {
    const response = await adminInstance.get(`/bills/generate/customer/${customerId}`);
    return response.data;
  } catch (error) {
    console.error("Error generating bill:", error);
    throw error;
  }
};

// get bill drafts
export const getBillDrafts = async () => {
  try {
    const response = await adminInstance.get("/bills/drafts");
    return response.data;
  } catch (error) {
    console.error("Error getting bill drafts:", error);
    throw error;
  }
};

// delete a bill by id
export const deleteBill = async (id: string) => {
  try {
    const response = await adminInstance.delete(`/bills/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting bill:", error);
    throw error;
  }
};

// get bills by date range
export const getBillsByDateRange = async (startDate: string, endDate: string) => {
  try {
    const response = await adminInstance.get("/bills/filter-by-date", {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting bills by date range:", error);
    throw error;
  }
};

// update bill payment status by id
export const updateBillPaymentStatus = async (id: string, paymentStatus: string) => {
  try {
    const response = await adminInstance.put(`/bills/status/${id}`, { paymentStatus });
    return response.data;
  } catch (error) {
    console.error("Error updating bill payment status:", error);
    throw error;
  }
};

// update a bill by id
export const updateBill = async (id: string, billData: any) => {
  try {
    const response = await adminInstance.put(`/bills/update/${id}`, billData);
    return response.data;
  } catch (error) {
    console.error("Error updating bill:", error);
    throw error;
  }
};