import adminInstance from "./adminInstance";

// add a new purchase detail
export const addPurchaseDetail = async (purchaseData: any) => {
  try {
    const response = await adminInstance.post("/purchases/add", purchaseData);
    return response.data;
  } catch (error) {
    console.error("Error adding purchase detail:", error);
    throw error;
  }
};

// get all purchase details
export const getAllPurchaseDetails = async () => {
  try {
    const response = await adminInstance.get("/purchases/all");
    return response.data;
  } catch (error) {
    console.error("Error fetching all purchase details:", error);
    throw error;
  }
};

// update a purchase detail by id
export const updatePurchaseDetail = async (id: string, purchaseData: any) => {
  try {
    const response = await adminInstance.put(`/purchases/update/${id}`, purchaseData);
    return response.data;
  } catch (error) {
    console.error(`Error updating purchase detail with id ${id}:`, error);
    throw error;
  }
};

// get purchase voucher
export const getPurchaseVouchers = async () => {
  try {
    const response = await adminInstance.get("/purchases/vouchers");
    return response.data;
  } catch (error) {
    console.error("Error fetching purchase voucher:", error);
    throw error;
  }
};

// add a purchase voucher
export const addPurchaseVoucher = async (voucherData: any) => {
  try {
    const response = await adminInstance.post("/purchases/voucher", voucherData);
    return response.data;
  } catch (error) {
    console.error("Error adding purchase voucher:", error);
    throw error;
  }
};

// delete a purchase detail by id
export const deletePurchaseDetail = async (id: string) => {
  try {
    const response = await adminInstance.delete(`/purchases/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting purchase detail with id ${id}:`, error);
    throw error;
  }
};

// get purchase details by date range
export const getPurchaseByDateRange = async (startDate: string, endDate: string) => {
  try {
    const response = await adminInstance.get("/purchases/date-range", {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching purchase details by date range:", error);
    throw error;
  }
};
