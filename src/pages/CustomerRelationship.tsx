"use client";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import {
  getCustomers,
  deleteCustomer,
  updateCustomerStatus,
  addCustomer,
  getCustomersByRating,
  getCustomersByDateRange,
  updateCustomerRating,
} from "@/adminApi/customerApi";
import { getBillsByCustomerId } from "@/adminApi/billApi";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  MoreVertical,
  X,
  Calendar as CalendarIcon,
  CalendarDays,
  Star,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  DialogFooter,
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
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [customerBills, setCustomerBills] = useState<any[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  // Only include the required fields in the newCustomer state
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    gender: "",
    dateOfBirth: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  const itemsPerPage = 8;

  const todayObj = new Date();
  const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCustomers({ limit: 10000 });
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
          scoreCode: customer.scoreCode || "N/A",
          rating: customer.rating || 0,
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
          ? await getCustomers({ limit: 10000 })
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
          scoreCode: customer.scoreCode || "N/A",
          rating: customer.rating || 0,
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
    if (!dateRange.start || !dateRange.end) {
      toast.warning("Please select both a start and end date.");
      return;
    }

    try {
      setLoading(true);
      setCurrentPage(1);
      const response = await getCustomersByDateRange(dateRange.start, dateRange.end);

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
          scoreCode: customer.scoreCode || "N/A",
          rating: customer.rating || 0,
          status: customer.isBlocked ? "Blocked" : "Active",
          rawData: customer,
        }));
        setCustomers(formattedCustomers);
        setDateFilterOpen(false);
      }
    } catch (error) {
      console.error("Failed to fetch customers for date range:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const handleClearFilter = () => {
    setDateRange({ start: "", end: "" });
    setDateFilterOpen(false);
    fetchCustomers();
  };

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

  const handleRatingUpdate = async (customerId: string, newRating: number) => {
    try {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, rating: newRating } : c
        )
      );
      await updateCustomerRating(customerId, newRating);
      toast.success("Rating updated successfully");
    } catch (error) {
      console.error("Failed to update rating:", error);
      toast.error("Failed to update rating");
      fetchCustomers();
    }
  };

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
    // Email validation for '@'
    if (newCustomer.email && !newCustomer.email.includes("@")) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Format date from YYYY-MM-DD to DD/MM/YYYY
      let formattedDob = newCustomer.dateOfBirth;
      if (formattedDob && formattedDob.includes("-")) {
        const [year, month, day] = formattedDob.split("-");
        formattedDob = `${day}/${month}/${year}`;
      }

      // Construct the payload exactly as required by the API
      const payload: any = {
        firstName: newCustomer.firstName,
        lastName: newCustomer.lastName,
        email: newCustomer.email,
        phoneNumber: newCustomer.phoneNumber,
        dateOfBirth: formattedDob, // Matching payload key
        gender: newCustomer.gender,
        password: "SecurePass123", // Using default password as per payload example, consider making this dynamic or more secure
        profilePic: "https://example.com/profile.jpg", // Using default profile pic as per payload example, consider making this dynamic
      };
      const response = await addCustomer(payload);
      toast.success("Customer added successfully!");
      setIsDrawerOpen(false); // Close the drawer
      setNewCustomer({
        // Reset form
        firstName: "",
        lastName: "",
        phoneNumber: "",
        email: "",
        gender: "",
        dateOfBirth: "",
      });

      const createdCustomer =
        response.data?.data || response.data?.customer || response.data;
      if (createdCustomer && (createdCustomer._id || createdCustomer.id)) {
        const customerId = createdCustomer._id || createdCustomer.id;
        const name =
          createdCustomer.firstName || createdCustomer.lastName
            ? `${createdCustomer.firstName} ${createdCustomer.lastName}`.trim()
            : "N/A";
        const code = createdCustomer.customerCode || `CUST${String(customers.length + 1).padStart(3, '0')}`;
        navigate(`/bills/new-bill?id=${customerId}`, {
          state: { openAddProductModal: true, customerName: name, customerCode: code },
        });
      } else {
        fetchCustomers();
      }
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

  const handleSelectChange = (name) => (value) => {
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const fetchCustomerBills = async (customerId: string) => {
    setLoadingBills(true);
    try {
      const response = await getBillsByCustomerId(customerId);
      if (response.success && Array.isArray(response.bills)) {
        setCustomerBills(response.bills);
      } else {
        setCustomerBills([]);
      }
    } catch (error) {
      console.error("Failed to fetch customer bills:", error);
      setCustomerBills([]);
    } finally {
      setLoadingBills(false);
    }
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
    fetchCustomerBills(customer.id);
  };

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return true;
    return (
      (customer.name || "").toLowerCase().includes(searchLower) ||
      (String(customer.phone || "")).toLowerCase().includes(searchLower) ||
      (customer.sno || "").toLowerCase().includes(searchLower) ||
      (customer.email || "").toLowerCase().includes(searchLower)
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
                <Button className="rounded-full bg-[#FEEEE5] text-gray-700 hover:bg-[#f9e5dc] text-sm sm:text-base">
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

            <button 
              onClick={() => setDateFilterOpen(true)}
              title="Filter by Date Range"
              className="focus:outline-none"
            >
              <CalendarDays className="w-6 h-6 text-[#f48c83] cursor-pointer hover:text-[#d16b62] transition-colors" />
            </button>

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
                className="pl-9 rounded-full bg-[#FEEEE5] border-none focus-visible:ring-0 text-gray-700 placeholder:text-gray-600 w-full"
              />
            </div>
          </div>

          {/* Add Customer Sheet */}
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <Button className="rounded-full bg-[#E98C81] hover:bg-[#d97a71] text-white px-5 w-full sm:w-auto" onClick={() => {}}>
                + Add Customer
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-full max-w-md bg-white shadow-2xl p-0">
              <div className="flex flex-col h-full">
                <SheetHeader className="border-b px-6 py-5">
                  <SheetTitle className="text-xl font-semibold text-gray-900">
                    Add Customer
                  </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <div className="flex flex-col justify-center min-h-full">
                    <div className="space-y-5">
                    <Input
                      name="firstName"
                      value={newCustomer.firstName}
                      onChange={handleInputChange}
                      placeholder="First Name"
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
                      placeholder="Mobile Number"
                      className="w-full h-12 bg-gray-50 border-gray-200 rounded-lg text-gray-600 placeholder:text-gray-400"
                    />
                    <Input
                      name="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={handleInputChange}
                      placeholder="Email"
                      className="w-full h-12 bg-gray-50 border-gray-200 rounded-lg text-gray-600 placeholder:text-gray-400"
                    />
                    <Select
                      value={newCustomer.gender}
                      onValueChange={(value) =>
                        setNewCustomer((prev) => ({ ...prev, gender: value }))
                      }
                    >
                      <SelectTrigger className="w-full h-12 bg-gray-50 border-gray-200 rounded-lg text-gray-600">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Input
                        name="dateOfBirth"
                        type="date"
                        value={newCustomer.dateOfBirth}
                        max={today}
                        onChange={handleInputChange}
                        onKeyDown={(e) => e.preventDefault()}
                        onClick={(e) => e.currentTarget.showPicker()}
                        className="w-full h-12 bg-gray-50 border-gray-200 rounded-lg text-gray-600 placeholder:text-gray-400 cursor-pointer pr-10"
                      />
                      <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
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
                </div>

                <SheetFooter className="px-6 py-6 space-y-3"></SheetFooter>
              </div>
            </SheetContent>
          </Sheet>
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
                      <td className="px-4 sm:px-6 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.name}</span>
                          <div className="flex items-center mt-1 space-x-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRatingUpdate(customer.id, i + 1);
                                }}
                                className={cn(
                                  "w-3 h-3 cursor-pointer hover:scale-125 transition-transform",
                                  i < Math.round(customer.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </td>
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
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-8 h-8 rounded-md border-gray-300"
                            onClick={() => {
                              if (customer.status === "Blocked") {
                                toast.error("This customer is blocked. Please unblock to view bills.");
                                return;
                              }
                              navigate(`/bills/new-bill?id=${customer.id}`, { state: { customerName: customer.name, customerCode: customer.sno } });
                            }}
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </Button>
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
                  </div>
                </div>

                {/* Bill Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-6">
                    Bill Details
                  </h3>
                  {loadingBills ? (
                    <div className="text-center py-4 text-gray-500">Loading bills...</div>
                  ) : customerBills.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                          <tr>
                            <th className="px-4 py-2">Bill No</th>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2 text-right">Amount</th>
                            <th className="px-4 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {customerBills.map((bill) => (
                            <tr key={bill._id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium">{bill.billNo}</td>
                              <td className="px-4 py-2">
                                {new Date(bill.billDate || bill.date || bill.createdAt).toLocaleDateString("en-GB")}
                              </td>
                              <td className="px-4 py-2 text-right">
                                ₹{bill.netAmount?.toLocaleString("en-IN")}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium",
                                    bill.paymentStatus === "Paid"
                                      ? "bg-green-100 text-green-800"
                                      : bill.paymentStatus === "Unpaid"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  )}
                                >
                                  {bill.paymentStatus || "Draft"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No bills found for this customer.</p>
                  )}
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

        {/* Date Range Filter Dialog */}
        <Dialog open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
          <DialogContent className="w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Filter Customers by Date</DialogTitle>
              <DialogDescription>
                Select a start and end date to view customers registered within that range.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.start}
                  max={today}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDateRange({ ...dateRange, start: val, end: dateRange.end && val > dateRange.end ? "" : dateRange.end });
                  }}
                  onKeyDown={(e) => e.preventDefault()}
                  onClick={(e) => e.currentTarget.showPicker()}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.end}
                  min={dateRange.start}
                  max={today}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  onKeyDown={(e) => e.preventDefault()}
                  onClick={(e) => e.currentTarget.showPicker()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClearFilter}>
                Clear Filter
              </Button>
              <Button variant="outline" onClick={() => setDateFilterOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-[#E98C81] hover:bg-[#f48c83]"
                onClick={handleDateRangeFilter}
              >
                Apply Filter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
