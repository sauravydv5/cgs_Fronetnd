import adminInstance from "./adminInstance";

export const getDashboardData = async (params?: any) => {
  const response = await adminInstance.get("/dashboard/get", { params });
  return response.data;
};

export const getDashboardDataByDateRange = async (startDate: string, endDate: string) => {
  const response = await adminInstance.get("/dashboard/date-range", {
    params: { startDate, endDate },
  });
  return response.data;
};
