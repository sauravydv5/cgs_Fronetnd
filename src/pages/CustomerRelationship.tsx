"use client";
import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { AdminLayout } from "@/components/AdminLayout";
import {
  getCustomers,
  deleteCustomer,
  updateCustomerStatus,
  addCustomer,
  getCustomersByRating,
  getCustomersByDateRange,
} from "@/adminApi/customerApi";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  MoreVertical,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";



export default function CustomerRelationship() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  // Only include the required fields in the newCustomer state
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    dateOfBirth: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const itemsPerPage = 8;

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCustomers();
      if (response.data && response.data.status) {
        const reversedCustomers = response.data.data.customers.reverse();
        const formattedCustomers = reversedCustomers.map((customer, index) => ({
          id: customer._id,
          sno: `CUST${String(index + 1).padStart(3, "0")}`,
          name:
            customer.firstName || customer.lastName
              ? `${customer.firstName} ${customer.lastName}`.trim()
              : "N/A",
          phone: customer.phoneNumber,
          email: customer.email || "N/A",
          dateOfBirth: customer.dateOfBirth || "N/A",
          maritalStatus: customer.maritalStatus || "N/A",
          anniversary: customer.anniversary || "N/A",
          gender: customer.gender || "N/A",
          scoreCode: "N/A",
          status: customer.isBlocked ? "Blocked" : "Active",
          rawData: customer,
        }));
        setCustomers(formattedCustomers);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterByRating = useCallback(async (rating: number | null) => {
    try {
      setLoading(true);
      setCurrentPage(1); // Reset to the first page on new filter
      const response =
        rating === null
          ? await getCustomers()
          : await getCustomersByRating(rating);

      if (response.data && response.data.status) {
        const customersData = response.data.data.customers || [];
        const reversedCustomers = [...customersData].reverse();
        const formattedCustomers = reversedCustomers.map((customer, index) => ({
          id: customer._id,
          sno: `CUST${String(index + 1).padStart(3, "0")}`,
          name:
            customer.firstName || customer.lastName
              ? `${customer.firstName} ${customer.lastName}`.trim()
              : "N/A",
          phone: customer.phoneNumber,
          email: customer.email || "N/A",
          dateOfBirth: customer.dateOfBirth || "N/A",
          maritalStatus: customer.maritalStatus || "N/A",
          anniversary: customer.anniversary || "N/A",
          gender: customer.gender || "N/A",
          scoreCode: "SC-102",
          status: customer.isBlocked ? "Blocked" : "Active",
          rawData: customer,
        }));
        setCustomers(formattedCustomers);
      }
    } catch (error) {
      console.error(`Failed to fetch customers for rating ${rating}:`, error);
      setCustomers([]); // Clear list on error
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDateRangeFilter = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.warning("Please select both a start and end date.");
      return;
    }

    try {
      setLoading(true);
      setCurrentPage(1);
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");
      const response = await getCustomersByDateRange(startDate, endDate);

      if (response.data && response.data.status) {
        const customersData = response.data.data.customers || [];
        const reversedCustomers = [...customersData].reverse();
        const formattedCustomers = reversedCustomers.map((customer, index) => ({
          id: customer._id,
          sno: `CUST${String(index + 1).padStart(3, "0")}`,
          name:
            customer.firstName || customer.lastName
              ? `${customer.firstName} ${customer.lastName}`.trim()
              : "N/A",
          phone: customer.phoneNumber,
          email: customer.email,
          status: customer.isBlocked ? "Blocked" : "Active",
          rawData: customer,
        }));
        setCustomers(formattedCustomers);
      }
    } catch (error) {
      console.error("Failed to fetch customers for date range:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDeleteCustomer = useCallback(
    async (customerId: string) => {
      if (window.confirm("Are you sure you want to delete this customer?")) {
        try {
          setDeleting(true);
          const response = await deleteCustomer(customerId);
          setCustomers(
            customers.filter((customer) => customer.id !== customerId)
          );
          toast.success(
            response.data?.message || "Customer deleted successfully!"
          );
        } catch (error: any) {
          console.error("Failed to delete customer:", error);
          toast.error("Failed to delete customer. Please try again.");
        } finally {
          setDeleting(false);
        }
      }
    },
    [customers]
  );

  const handleUpdateStatus = useCallback(
    async (customerId: string, shouldBlock: boolean) => {
      const action = shouldBlock ? "block" : "unblock";
      if (window.confirm(`Are you sure you want to ${action} this customer?`)) {
        try {
          setUpdatingStatus(true);
          const response = await updateCustomerStatus(customerId, shouldBlock);

          if (response.data && response.data.status) {
            setCustomers((prevCustomers) =>
              prevCustomers.map((customer) =>
                customer.id === customerId
                  ? { ...customer, status: shouldBlock ? "Blocked" : "Active" }
                  : customer
              )
            );
            toast.success(`Customer ${action}ed successfully!`);
          } else {
            toast.error(
              `Failed to ${action} customer: ${
                response.data?.message || "Unknown error"
              }`
            );
          }
        } catch (error: any) {
          console.error(`Failed to ${action} customer:`, error);
          toast.error(`Failed to ${action} customer: ${error.message}`);
        } finally {
          setUpdatingStatus(false);
        }
      }
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCustomer = async () => {
    // Basic validation
    if (
      !newCustomer.firstName ||
      !newCustomer.phoneNumber ||
      !newCustomer.email
    ) {
      toast.warning("Please fill in First Name, Mobile Number, and Email.");
      return;
    }

    // Email validation for '@'
    if (!newCustomer.email.includes("@")) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Construct the payload exactly as required by the API
      const payload: any = {
        firstName: newCustomer.firstName,
        lastName: newCustomer.lastName,
        email: newCustomer.email,
        phoneNumber: newCustomer.phoneNumber,
        dateOfBirth: newCustomer.dateOfBirth, // Matching payload key
        password: "SecurePass123", // Using default password as per payload example, consider making this dynamic or more secure
        profilePic: "https://example.com/profile.jpg", // Using default profile pic as per payload example, consider making this dynamic
      };
      await addCustomer(payload);
      toast.success("Customer added successfully!");
      setIsDrawerOpen(false); // Close the drawer
      setNewCustomer({
        // Reset form
        firstName: "",
        lastName: "",
        phoneNumber: "",
        email: "",
        dateOfBirth: "",
      });
      fetchCustomers(); // Refetch customers to show the new one
    } catch (error: any) {
      console.error("Failed to add customer:", error);
      toast.error(
        `Failed to add customer. ${
          error.response?.data?.message || "Please try again."
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (date) => {
    setNewCustomer((prev) => ({
      ...prev,
      dateOfBirth: format(date, "dd/MM/yyyy"),
    }));
  };

  const handleSelectChange = (name) => (value) => {
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return true;
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.phone.toLowerCase().includes(searchLower) ||
      customer.sno.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  return (
    <AdminLayout title="Customer Relationship">
      <div
        className="p-4 sm:p-6 space-y-6"
      >
        {/* Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-full bg-[#fdebe3] text-gray-700 hover:bg-[#f9e5dc] text-sm sm:text-base">
                  Filter by Rating ▼
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <DropdownMenuItem
                    key={rating}
                    onSelect={() => handleFilterByRating(rating)}
                  >
                    {rating} Star{rating > 1 ? "s" : ""}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleFilterByRating(null)}>
                  Show All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipProvider>
              <Tooltip>
                <Popover>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "rounded-full bg-[#fdebe3] text-gray-700 hover:bg-[#f9e5dc] text-sm sm:text-base border-none",
                          !dateRange && "text-gray-600"
                        )}
                      >
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Date Range ▼</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      onSelect={handleDateChange}
                      captionLayout="dropdown"
                      initialFocus
                      fromYear={new Date().getFullYear() - 100}
                      toYear={new Date().getFullYear()}
                      classNames={{
                        dropdown: "max-h-40 overflow-y-auto", // year dropdown scrollable
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <TooltipContent>
                  <p>Start Date - End Date</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by name"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 rounded-full bg-[#fdebe3] border-none focus-visible:ring-0 text-gray-700 placeholder:text-gray-600 w-full"
              />
            </div>
          </div>

          {/* Add Customer Drawer */}
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerTrigger asChild>
              <Button className="rounded-full bg-[#E98C81] hover:bg-[#d97a71] text-white px-5 w-full sm:w-auto">
                + Add Customer
              </Button>
            </DrawerTrigger>

            <DrawerContent className="fixed top-0 left-0 h-screen/10 w-full max-w-md bg-white shadow-2xl">
              <div className="flex flex-col h-full">
                <DrawerHeader className="border-b px-6 py-5">
                  <DrawerTitle className="text-xl font-semibold text-gray-900">
                    Add Customer
                  </DrawerTitle>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <div className="space-y-5">
                    <Input
                      name="firstName"
                      value={newCustomer.firstName}
                      onChange={handleInputChange}
                      placeholder="First Name *"
                      className="w-full h-12 bg-gray-50 border-gray-200 rounded-lg text-gray-600 placeholder:text-gray-400"
                    />
                    <Input
                      name="lastName"
                      value={newCustomer.lastName}
                      onChange={handleInputChange}
                      placeholder="Last Name"
                      className="w-full h-12 bg-gray-50 border-gray-200 rounded-lg text-gray-600 placeholder:text-gray-400"
                    />
                    <Input
                      name="phoneNumber"
                      value={newCustomer.phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and limit to 10 digits
                        if (/^\d*$/.test(value) && value.length <= 10) {
                          handleInputChange(e);
                        }
                      }}
                      placeholder="Mobile Number *"
                      className="w-full h-12 bg-gray-50 border-gray-200 rounded-lg text-gray-600 placeholder:text-gray-400"
                    />
                    <Input
                      name="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={handleInputChange}
                      placeholder="Email *"
                      className="w-full h-12 bg-gray-50 border-gray-200 rounded-lg text-gray-600 placeholder:text-gray-400"
                    />
                    <div className="relative">
                      <Input
                        name="dateOfBirth"
                        type="text"
                        value={newCustomer.dateOfBirth}
                        readOnly
                        placeholder="DD/MM/YYYY"
                        className="w-full h-12 bg-gray-50 border-gray-200 rounded-lg text-gray-600 placeholder:text-gray-400 pr-10 cursor-pointer"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 p-0 hover:bg-gray-200"
                          >
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            onSelect={handleDateChange}
                            initialFocus
                            captionLayout="dropdown-buttons"
                            fromYear={new Date().getFullYear() - 100}
                            toYear={new Date().getFullYear()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button
                      onClick={handleAddCustomer}
                      disabled={isSubmitting}
                      className="w-full h-12 text-white rounded-lg text-base font-medium"
                    >
                      {isSubmitting ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>

                <DrawerFooter className="px-6 py-6 space-y-3"></DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-[#fdebe3] text-gray-700 text-left">
                <th className="px-4 sm:px-6 py-3 font-medium">S.No</th>
                <th className="px-4 sm:px-6 py-3 font-medium">Customer Name</th>
                <th className="px-4 sm:px-6 py-3 font-medium">Phone Number</th>
                <th className="px-4 sm:px-6 py-3 font-medium">Score Code</th>
                <th className="px-4 sm:px-6 py-3 font-medium">Status</th>
                <th className="px-4 sm:px-6 py-3 font-medium text-center">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500">
                    Loading customers...
                  </td>
                </tr>
              ) : currentCustomers.length > 0 ? (
                  currentCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-t hover:bg-gray-50 transition text-gray-800"
                    >
                      <td className="px-4 sm:px-6 py-3">{customer.sno}</td>
                      <td className="px-4 sm:px-6 py-3">{customer.name}</td>
                      <td className="px-4 sm:px-6 py-3">{customer.phone}</td>
                      <td className="px-4 sm:px-6 py-3">
                        {customer.scoreCode}
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <span
                          className={`font-medium ${
                            customer.status === "Active"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>

                      <td className="px-4 sm:px-6 py-3 text-center">
                        <div className="flex justify-center gap-2 flex-wrap">
                          {customer.status === "Active" ? (
                            <Button
                              size="sm"
                              disabled={updatingStatus}
                              className="bg-red-600 text-white hover:bg-red-700 px-3 py-1 rounded-md w-[72px] justify-center"
                              onClick={() =>
                                handleUpdateStatus(customer.id, true)
                              }
                            >
                              Block
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={updatingStatus}
                              className="bg-gray-800 text-white hover:bg-gray-900 px-3 py-1 rounded-md w-[72px] justify-center"
                              onClick={() =>
                                handleUpdateStatus(customer.id, false)
                              }
                            >
                              Unblock
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                className="w-8 h-8 rounded-md border-gray-300"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(customer)}
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteCustomer(customer.id)
                                }
                                className="text-red-600 focus:text-red-600"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
                      No customers found
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {totalPages > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-full"
              >
                ‹
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(
                  Math.max(0, currentPage - 2),
                  Math.min(totalPages, currentPage + 1)
                )
                .map((page) => (
                  <Button
                    key={page}
                    size="sm"
                    variant={page === currentPage ? "default" : "outline"}
                    className={`rounded-full ${
                      page === currentPage
                        ? "bg-[#E98C81] text-white"
                        : "text-gray-700"
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-full"
              >
                ›
              </Button>
            </>
          )}
        </div>

        {/* Customer Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold text-gray-900">
                Customer Details
              </DialogTitle>
            </DialogHeader>

            {selectedCustomer && (
              <div className="space-y-6 py-4">
                {/* Customer ID Badge */}
                <div className="flex items-center justify-between pb-4 border-b">
                  <div>
                    <p className="text-sm text-gray-500">Customer ID</p>
                    <p className="text-lg font-semibold text-[#E98C81]">
                      {selectedCustomer.sno}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        selectedCustomer.status === "Active"
                          ? " text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {selectedCustomer.status}
                    </span>
                  </div>
                </div>

                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Full Name</p>
                      <p className="text-base font-medium text-gray-900">
                        {selectedCustomer.name}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                      <p className="text-base font-medium text-gray-900">
                        {selectedCustomer.phone}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">
                        Email Address
                      </p>
                      <p className="text-base font-medium text-gray-900">
                        {selectedCustomer.email}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Gender</p>
                      <p className="text-base font-medium text-gray-900 capitalize">
                        {selectedCustomer.gender}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">
                        Date of Birth
                      </p>
                      <p className="text-base font-medium text-gray-900">
                        {selectedCustomer.dateOfBirth}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">
                        Marital Status
                      </p>
                      <p className="text-base font-medium text-gray-900 capitalize">
                        {selectedCustomer.maritalStatus}
                      </p>
                    </div>

                    {selectedCustomer.anniversary !== "N/A" && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">
                          Anniversary
                        </p>
                        <p className="text-base font-medium text-gray-900">
                          {selectedCustomer.anniversary}
                        </p>
                      </div>
                    )}

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Score Code</p>
                      <p className="text-base font-medium text-gray-900">
                        {selectedCustomer.scoreCode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDetailsOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
