import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { getAllEmployees, updateEmployee } from "@/adminApi/employeeApi";
import { getAllRoles } from "@/adminApi/roleApi";
import { History, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "",
    zone: "",
    status: true,
  });

  useEffect(() => {
    loadEmployees();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await getAllRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await getAllEmployees();
      console.log("Fetched employees:", data); // Check console to see actual data structure
      // Ensure data is an array before setting state
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (emp: any) => {
    setEditingEmployee(emp);
    setEditFormData({
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      email: emp.email || "",
      phoneNumber: emp.phoneNumber || "",
      role: typeof emp.role === "object" && emp.role ? emp.role._id : emp.role,
      zone: emp.zone || "",
      status: emp.status,
    });
  };

  const handleUpdateSave = async () => {
    if (!editingEmployee) return;
    try {
      await updateEmployee(editingEmployee._id, editFormData);
      toast.success("Employee updated successfully");
      setEditingEmployee(null);
      loadEmployees(); // Refresh list
    } catch (error: any) {
      console.error("Failed to update employee:", error);
      toast.error("Error", {
        description: error.response?.data?.message || "Failed to update employee",
      });
    }
  };

  return (
    <AdminLayout title="Employee Management">
      <>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-bold text-xl">Employee List</h1>
            <p className="text-sm text-gray-500">
              View and manage all registered employees.
            </p>
          </div>
          <Button
            className="bg-[#E98C81] hover:bg-[#f7857b] text-white"
            onClick={() => navigate("/employees/add")}
          >
            Add Employee
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border rounded-lg">
            <thead className="bg-gray-50 border-b text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Phone Number</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Zone</th>
                <th className="px-6 py-3">Status</th>
                {/* <th className="px-6 py-3">Active Hours</th> */}
                <th className="px-6 py-3">Update</th>
                {/* <th className="px-6 py-3">History</th> */}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No employees found.
                  </td>
                </tr>
              ) : (
                employees.map((emp: any, index: number) => {
                  if (!emp) return null; // Safety check to prevent crash if an item is null
                  return (
                  <tr key={emp._id || index} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td className="px-6 py-4">{emp.email}</td>
                    <td className="px-6 py-4">{emp.phoneNumber}</td>
                    <td className="px-6 py-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded cursor-pointer">
                              {/* Fix: Handle if role is an object (populated) or string */}
                              {typeof emp.role === "object" && emp.role !== null
                                ? emp.role.roleName || emp.role.name || "N/A"
                                : emp.role}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-[200px]">
                              <p className="font-semibold mb-1 text-xs">Permissions:</p>
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  let perms: string[] = [];
                                  // 1. Use populated role permissions if available directly in employee data
                                  if (emp.role && typeof emp.role === "object" && emp.role.permissions) {
                                    perms = emp.role.permissions;
                                  } else {
                                    // 2. Fallback to roles list lookup
                                    const roleId = typeof emp.role === "object" && emp.role ? emp.role._id : emp.role;
                                    const roleObj = roles.find((r) => r._id === roleId);
                                    perms = roleObj?.permissions || [];
                                  }
                                  
                                  if (!perms || perms.length === 0) return <span className="text-xs text-gray-500">None</span>;
                                  return perms.map((p: string) => <span key={p} className="text-[10px] bg-gray-100 px-1 rounded border text-black">{p}</span>);
                                })()}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-6 py-4">{emp.zone || "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          emp.status
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {emp.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {/* <td className="px-6 py-4">
                      09:00 AM - 06:00 PM
                    </td> */}
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Update Employee"
                        onClick={() => handleEditClick(emp)}
                      >
                        <Edit className="h-4 w-4 text-gray-600" />
                      </Button>
                    </td>
                    {/* <td className="px-6 py-4">
                      <Button variant="ghost" size="icon" title="View History">
                        <History className="h-4 w-4 text-gray-600" />
                      </Button>
                    </td> */}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Edit Employee Modal */}
        {editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl border max-h-[90vh] overflow-y-auto">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Edit Employee</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input 
                    value={editFormData.firstName} 
                    onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})} 
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input 
                    value={editFormData.lastName} 
                    onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})} 
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={editFormData.email} 
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} 
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input 
                    type="tel"
                    maxLength={10}
                    value={editFormData.phoneNumber} 
                    onChange={(e) => setEditFormData({...editFormData, phoneNumber: e.target.value.replace(/\D/g, "")})} 
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select 
                    value={editFormData.role} 
                    onValueChange={(val) => setEditFormData({ ...editFormData, role: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r: any) => (
                        <SelectItem key={r._id} value={r._id}>{r.roleName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Zone</Label>
                  <Select 
                    value={editFormData.zone} 
                    onValueChange={(val) => setEditFormData({...editFormData, zone: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north">North</SelectItem>
                      <SelectItem value="south">South</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between border p-3 rounded md:col-span-2">
                  <div>
                    <p className="font-medium">Status</p>
                    <p className="text-sm text-gray-500">Active or Inactive</p>
                  </div>
                  <Switch 
                    checked={editFormData.status} 
                    onCheckedChange={(checked) => setEditFormData({...editFormData, status: checked})} 
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
                <Button className="bg-[#E98C81] hover:bg-[#f7857b] text-white" onClick={handleUpdateSave}>Update</Button>
              </div>
            </div>
          </div>
        )}
      </>
    </AdminLayout>
  );
}
