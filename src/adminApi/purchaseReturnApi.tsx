import adminInstance from "./adminInstance";

// add a purchase return
export const addPurchaseReturn = async (returnData: any) => {
  try {
    const response = await adminInstance.post("/purchase-returns/add", returnData);
    return response.data;
  } catch (error) {
    console.error("Error adding purchase return:", error);
    throw error;
  }
};

// get purchase returns by date range
export const getPurchaseReturnsByDateRange = async (startDate: string, endDate: string) => {
  try {
    const response = await adminInstance.get("/purchase-returns/date-range", {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching purchase returns by date range:", error);
    throw error;
  }
};

// delete a purchase return by id
export const deletePurchaseReturn = async (id: string) => {
  try {
    const response = await adminInstance.delete(`/purchase-returns/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting purchase return with id ${id}:`, error);
    throw error;
  }
};

// update a purchase return by id
export const updatePurchaseReturn = async (id: string, returnData: any) => {
  try {
    const response = await adminInstance.put(`/purchase-returns/update/${id}`, returnData);
    return response.data;
  } catch (error) {
    console.error(`Error updating purchase return with id ${id}:`, error);
    throw error;
  }
};

// get all purchase returns
export const getAllPurchaseReturns = async () => {
  try {
    const response = await adminInstance.get("/purchase-returns/all");
    return response.data;
  } catch (error) {
    console.error("Error fetching all purchase returns:", error);
    throw error;
  }
};
