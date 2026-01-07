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

export const getLedgerByDateRange = (startDate: string, endDate: string) => {
  return adminInstance.get("/ledger/date-range", { params: { startDate, endDate } });
};