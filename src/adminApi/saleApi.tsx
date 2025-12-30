import adminInstance from "./adminInstance";

export const getAllBills = async () => {
  try {
    const response = await adminInstance.get("/bills/all");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const filterBillsByDate = async (startDate: string, endDate: string) => {
  try {
    const response = await adminInstance.get(
      `/bills/filter-by-date?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addBill = async (billData: any) => {
  try {
    const response = await adminInstance.post("/bills/add", billData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updatePaymentStatus = async (id: string, status: string) => {
  try {
    const response = await adminInstance.put(`/bills/status/${id}`, {
      paymentStatus: status,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteBillById = async (id: string) => {
  try {
    const response = await adminInstance.delete(`/bills/delete/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getBillById = async (id: string) => {
  try {
    const response = await adminInstance.get(`/bills/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
