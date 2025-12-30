import adminInstance from "./adminInstance";

export const getDashboardData = async () => {
  const response = await adminInstance.get("/dashboard/get");
  return response.data;
};
