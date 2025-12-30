import adminInstance from "./adminInstance";
/**
 * Retrieves all reports.
 */
export const getAllReports = async () => {
  try {
    const response = await adminInstance.get("/reports/all");
    return response.data;
  } catch (error) {
    console.error("Error fetching all reports:", error);
    throw error;
  }
};
