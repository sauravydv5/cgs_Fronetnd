import adminInstance from "./adminInstance";


// Add new category
export const addCategory = (data: { name: string; description: string; parent: string | null }) => {
  return adminInstance.post("/categories", data);
};

// Add Sub category
export const addSubCategory = (data: { name: string; description: string; parent: string }) => {
  return adminInstance.post("/categories", data);
};

// Get all categories (supports optional query params like { limit })
export const getAllCategories = (params?: any) => {
  return adminInstance.get("/categories", { params });
};