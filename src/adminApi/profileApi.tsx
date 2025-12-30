import adminInstance from "./adminInstance";


export const getAdminProfile = async () => {
  const response = await adminInstance.get("/profile/admin");
  return response.data;
};

export const updateAdminProfile = async (data: any) => {
  const response = await adminInstance.put("/profile/admin", data);
  return response.data;
};