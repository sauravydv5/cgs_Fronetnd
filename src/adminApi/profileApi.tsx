import adminInstance from "./adminInstance";


export const getAdminProfile = async () => {
  const response = await adminInstance.get("/admin/profile");
  return response.data;
};

export const updateAdminProfile = async (data: any) => {
  const response = await adminInstance.put("/admin/profile", data);
  return response.data;
};