import adminInstance from "./adminInstance";

export const addRole = async (data: { roleName: string; status: string; permissions: string[] }) => {
  try {
    const response = await adminInstance.post("/roles/add", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// get all roles
export const getAllRoles = async () => {
  try {
    const response = await adminInstance.get("/roles/all");
    return response.data;
  } catch (error) {
    throw error;
  }
};

// update role
export const updateRole = async (id: string, data: { roleName: string; status: string; permissions: string[] }) => {
  try {
    const response = await adminInstance.put(`/roles/update/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
