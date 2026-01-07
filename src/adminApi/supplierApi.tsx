import adminInstance from "./adminInstance";

// get all suppliers
export const getAllSuppliers = async () => {
  try {
    const response = await adminInstance.get("/suppliers/get/all");
    return response.data;
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    throw error;
  }
};

// get suppliers by date range
export const getSuppliersByDateRange = async (startDate: string, endDate: string) => {
  try {
    const response = await adminInstance.get("/suppliers/date-range", {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching suppliers by date range:", error);
    throw error;
  }
};

// add a new supplier
export const addSupplier = async (supplierData: any) => {
  try {
    const response = await adminInstance.post("/suppliers/add", supplierData);
    return response.data;
  } catch (error) {
    console.error("Error adding supplier:", error);
    throw error;
  }
};

// update a supplier by id
export const updateSupplier = async (id: string, supplierData: any) => {
  try {
    const response = await adminInstance.put(`/suppliers/update/${id}`, supplierData);
    return response.data;
  } catch (error) {
    console.error(`Error updating supplier with id ${id}:`, error);
    throw error;
  }
};

// get suppliers summary
export const getSuppliersSummary = async () => {
  try {
    const response = await adminInstance.get("/suppliers/summary");
    return response.data;
  } catch (error) {
    console.error("Error fetching suppliers summary:", error);
    throw error;
  }
};

// delete a supplier by id
export const deleteSupplier = async (id: string) => {
  try {
    const response = await adminInstance.delete(`/suppliers/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting supplier with id ${id}:`, error);
    throw error;
  }
};
