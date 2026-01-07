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

/**
 * Retrieves reports by date range.
 */
export const getReportsByDateRange = async (startDate: string, endDate: string) => {
  try {
    const response = await adminInstance.get("/reports/date-range", {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching reports by date range:", error);
    throw error;
  }
};
