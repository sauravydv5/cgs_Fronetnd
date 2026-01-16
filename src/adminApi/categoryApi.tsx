import adminInstance from "./adminInstance";


// Add new category
export const addCategory = (data: { name: string; description?: string; parent?: string | null }) => {
  return adminInstance.post("/categories/add", data);
};

// Add Sub category
export const addSubCategory = (data: { name: string; description?: string; category: string }) => {
  return adminInstance.post("/subcategories/add", data);
};

// Get all categories (supports optional query params like { limit })
export const getAllCategories = (params?: any) => {
  return adminInstance.get("/categories/get", { params });
};

// Get all subcategories
export const getAllSubCategories = (params?: any) => {
  return adminInstance.get("/subcategories/get", { params });
};