import adminInstance from "./adminInstance";

//add sale return
export const addSaleReturn = async (data: any) => {
  const response = await adminInstance.post("/sale-returns/add", data);
  return response.data;
};

//get all sale returns
export const getAllSaleReturns = async () => {
  const response = await adminInstance.get("/sale-returns/all");
  return response.data;
};

//update sale return status
export const updateReturnStatus = async (id: string, status: string) => {
  const response = await adminInstance.put(`/sale-returns/status/${id}`, { status });
  return response.data;
};

//delete sale return
export const deleteSaleReturn = async (id: string) => {
  const response = await adminInstance.delete(`/sale-returns/delete/${id}`);
  return response.data;
};
