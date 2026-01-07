import adminInstance from "./adminInstance";

export const addEmployee = async (data: any) => {
  try {
    const response = await adminInstance.post("/employees/add", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update employee
export const updateEmployee = async (id: string, data: any) => {
  try {
    const response = await adminInstance.put(`/employees/update/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get all employees
export const getAllEmployees = async () => {
  try {
    const response = await adminInstance.get("/employees/all");
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Verify OTP
export const verifyEmployeeOtp = async (data: any) => {
  try {
    const response = await adminInstance.post("/employees/otp/verify", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Login employee
export const loginEmployee = async (data: any) => {
  try {
    const response = await adminInstance.post("/employees/login", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
