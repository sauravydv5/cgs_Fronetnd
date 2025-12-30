"use client";
import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Camera, User } from "lucide-react";
import { toast } from "sonner";
import { getAdminProfile, updateAdminProfile } from "@/adminApi/profileApi";

function GeneralSettings() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dateofBirth: "",
    profilePic: "",
  });
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const fetchAndSetProfile = async () => {
      setLoading(true);
      const savedProfile = localStorage.getItem("adminProfile");

      const populateForm = (profileData) => {
        setFormData({
          firstName: profileData.firstName || "",
          lastName: profileData.lastName || "",
          email: profileData.email || "",
          phoneNumber: profileData.phoneNumber || "",
          dateofBirth: profileData.dateofBirth
            ? profileData.dateofBirth.split("T")[0]
            : "",
          profilePic: profileData.profilePic || "",
        });
        setProfileImagePreview(profileData.profilePic);
        setIsDataLoaded(true);
      };

      if (savedProfile) {
        populateForm(JSON.parse(savedProfile));
        setLoading(false);
      } else {
        setLoading(true); // Only show main loader if no cache
      }

      // Always fetch latest data in the background
      try {
        const response = await getAdminProfile();
        if (response.status) {
          const profileData = response.data;
          populateForm(profileData);
          localStorage.setItem("adminProfile", JSON.stringify(profileData));
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        if (!savedProfile) toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndSetProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phoneNumber") {
      const numericValue = value.replace(/\D/g, "");
      const limitedValue = numericValue.slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: limitedValue }));
    } else if (name === "dateofBirth") {
      const digits = value.replace(/\D/g, "").slice(0, 8);
      let formatted = digits;
      if (digits.length > 4) {
        formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
      }
      if (digits.length > 6) {
        formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(
          6,
          8
        )}`;
      }
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      setProfileImagePreview(imageURL);
      // In a real implementation, you would upload the file to a server
      // and get back a URL to store in formData.profilePic
      console.log("Selected image:", file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.phoneNumber && formData.phoneNumber.length < 10) {
      toast.warning("Incomplete phone number. Please enter a 10-digit number.");
      return;
    }

    try {
      setSaving(true);
      // Exclude email from the payload to prevent it from being updated
      const { email, ...updatePayload } = formData;

      const response = await updateAdminProfile(updatePayload);

      if (response.status) {
        const updatedData = response.data;
        setFormData({
          firstName: updatedData.firstName || "",
          lastName: updatedData.lastName || "",
          email: formData.email, // Keep the original email in the state
          phoneNumber: updatedData.phoneNumber || "",
          dateofBirth: updatedData.dateofBirth
            ? updatedData.dateofBirth.split("T")[0]
            : "",
          profilePic: updatedData.profilePic || "",
        });
        setProfileImagePreview(updatedData.profilePic || "");
        localStorage.setItem("adminProfile", JSON.stringify(updatedData));
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
      } else if (error.response) {
        toast.error(
          `Failed to update profile: ${
            error.response.data.message || "Please try again."
          }`
        );
      } else if (error.request) {
        toast.error("No response from server. Please check your connection.");
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !isDataLoaded) {
    return (
      <AdminLayout title="Settings > General Settings">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings > General Settings">
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm">
            {/* Profile Picture */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div
                  className="w-28 h-28 rounded-full bg-teal-100 text-teal-700 
border flex items-center justify-center overflow-hidden 
shadow-sm text-center text-4xl font-semibold leading-none"
                >
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt={formData.firstName?.charAt(0)?.toUpperCase() || "P"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-4xl font-semibold leading-none">
                      {formData.firstName?.charAt(0)?.toUpperCase() || "A"}
                    </span>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  id="profileImageInput"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {/* Camera Button */}
                <label
                  htmlFor="profileImageInput"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center hover:bg-teal-600 transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-white" />
                </label>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-black outline-none"
                  placeholder="First Name"
                />
              </div>

              <div>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-black outline-none"
                  placeholder="Last Name"
                />
              </div>

              <div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-500"
                  placeholder="Email"
                  disabled
                />
              </div>

              <div>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-black outline-none"
                  placeholder="Phone Number"
                />
              </div>

              <div>
                <input
                  type="date"
                  name="dateofBirth"
                  value={formData.dateofBirth}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.preventDefault()}
                  className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-black outline-none"
                  placeholder="Date of Birth"
                />
              </div>

              {/* Two Factor Authentication Toggle */}
              {/* <div className="flex items-center justify-between pt-2">
                <label className="text-sm font-medium text-gray-700">
                  Two Factor Authentication
                </label>
                <button
                  type="button"
                  onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    twoFactorAuth ? "bg-teal-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      twoFactorAuth ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div> */}

              {/* Save Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default GeneralSettings;
