import adminInstance from "./adminInstance";

export const addLedgerEntry = (data: any) => {
  return adminInstance.post("/ledger/add", data);
};

export const getSupplierLedger = (params?: any) => {
  return adminInstance.get("/ledger/supplier", { params });
};

export const getCustomerLedger = (params?: any) => {
  return adminInstance.get("/ledger/customer", { params });
};