"use client";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { getAllRoles } from "@/adminApi/roleApi";
import { addEmployee } from "@/adminApi/employeeApi";
import { Eye, EyeOff } from "lucide-react";

export default function AddEmployee() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "",
    zone: "",
    status: true,
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await getAllRoles();
        // Assuming the API returns an array of objects with a 'roleName' property
        if (Array.isArray(data)) {
          setRoles(data);
        }
      } catch (error) {
        console.error("Failed to fetch roles:", error);
      }
    };

    fetchRoles();
  }, []);

  const handleCreateEmployee = async () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First Name is required";
      isValid = false;
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last Name is required";
      isValid = false;
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
      isValid = false;
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone is required";
      isValid = false;
    } else if (!/^\d{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Phone number must be exactly 10 digits.";
      isValid = false;
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
      isValid = false;
    }
    if (!formData.role) {
      newErrors.role = "Role is required";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      toast.error("All fields are required");
      return;
    }

    try {
      await addEmployee(formData);
      toast.success("Employee created successfully");
      navigate("/employees");
    } catch (error) {
      console.error("Failed to create employee:", error);
      toast.error("Error", {
        description: "Failed to create employee",
      });
    }
  };

  return (
    <AdminLayout title="Employee Information">
      <div className="max-w-6xl mx-auto bg-white rounded-xl border p-8">

        {/* Sub heading */}
        <h1 className="font-bold">Employee Information</h1>
        <p className="text-sm text-gray-500 mb-6">
          Update the employee information and save changes.
        </p>

        {/* FORM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">

          {/* First Name */}
          <div>
            <Label>First Name</Label>
            <Input
              placeholder="Enter first name"
              value={formData.firstName}
              onChange={(e) => {
                setFormData({ ...formData, firstName: e.target.value });
                if (errors.firstName) setErrors({ ...errors, firstName: "" });
              }}
            />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
          </div>

          {/* Last Name */}
          <div>
            <Label>Last Name</Label>
            <Input
              placeholder="Enter last name"
              value={formData.lastName}
              onChange={(e) => {
                setFormData({ ...formData, lastName: e.target.value });
                if (errors.lastName) setErrors({ ...errors, lastName: "" });
              }}
            />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
          </div>

          {/* Email */}
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: "" });
              }}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <Label>Phone Number</Label>
            <Input
              type="tel"
              maxLength={10}
              placeholder="Enter phone number"
              value={formData.phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ""); // Only allow digits
                setFormData({ ...formData, phoneNumber: value });
                if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: "" });
              }}
            />
            {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
          </div>

          {/* Password */}
          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Password must be at least 8 characters
            </p>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Role */}
          <div>
            <Label>Role</Label>
            <Select onValueChange={(val) => {
              setFormData({ ...formData, role: val });
              if (errors.role) setErrors({ ...errors, role: "" });
            }}>
              <SelectTrigger className="border-orange-400 focus:ring-orange-400">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role._id} value={role._id}>
                    {role.roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
          </div>

          {/* Zone */}
          <div>
            <Label>Zone (Optional)</Label>
            <Select onValueChange={(val) => setFormData({ ...formData, zone: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a zone (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="north">North</SelectItem>
                <SelectItem value="south">South</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Card */}
          <div className="border rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-gray-500">
                Set the employee's active status
              </p>
            </div>
            <Switch
              checked={formData.status}
              onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
            />
          </div>

          {/* Profile Picture */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              No image
            </div>
            <Button variant="outline" size="sm">
              Change
            </Button>
          </div>
        </div>

        {/* FOOTER BUTTONS */}
        <div className="flex justify-end gap-4 mt-10">
          <Button variant="outline">Cancel</Button>
          <Button
            className="bg-[#E98C81] hover:bg-[#f7857b] text-white"
            onClick={handleCreateEmployee}
          >
            Create Employee
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
