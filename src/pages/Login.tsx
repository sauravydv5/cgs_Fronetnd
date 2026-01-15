import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import adminInstance from "@/adminApi/adminInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import loginImage from "@/images/login-bg.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loginEmployee } from "@/adminApi/employeeApi";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState("admin");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (userType === "employee") {
        const data = await loginEmployee({ email, password });
        response = { data }; // Wrapping to match existing response structure
      } else {
        response = await adminInstance.post("/admin/login", {
          email,
          password,
        });
      }

      // Handle Direct Login Success (If token is returned immediately without OTP)
      if (response.data?.token || (response.data?.status && response.data?.data?.token && !response.data?.data?.otp)) {
        const token = response.data.token || response.data.data.token;
        const user = response.data.user || response.data.data.user;
        
        localStorage.setItem("token", token);
        if (user) localStorage.setItem("user", JSON.stringify(user));
        
        toast.success("Login Successful");
        // Force reload to ensure axios instance picks up the new token and permissions apply
        window.location.href = "/dashboard";
        return;
      }

      // Logic from your new code: Check for status and OTP presence
      if (response.data?.status && response.data?.data?.otp) {
        // Save the temporary token needed for 2FA verification
        const tempToken = response.data?.data?.token;
        if (tempToken) {
          sessionStorage.setItem("tempToken", tempToken);
        }
        // Safely handle the 'isNew' property
        if (response.data.data.isNew !== undefined) {
          localStorage.setItem("isNewUser", response.data.data.isNew.toString());
        }
        sessionStorage.setItem("userType", userType);
        navigate("/2fa");
      } else {
        toast.error(response.data?.message || "An unknown error occurred.");
      }
    } catch (err: any) {
      console.error("Login API Error:", err); // Add this line for detailed error logging

      const backendMessage = String(err.response?.data?.message || "");
      if (backendMessage.toLowerCase().includes("password")) {
        toast.error("Invalid Password");
      } else if (backendMessage.toLowerCase().includes("found") || backendMessage.toLowerCase().includes("email")) {
        toast.error("Invalid Email");
      } else {
        toast.error(backendMessage || "Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-orange-300 to-yellow-100"></div>

      {/* Main container */}
      <div className="relative z-10 bg-transparent w-full max-w-6xl grid md:grid-cols-2 rounded-3xl overflow-hidden">
        {/* Illustration Side */}
        <div className="flex items-center justify-center bg-white p-10 rounded-3xl">
          <img
            src={loginImage}
            alt="illustration"
            className="w-full h-auto"
          />
        </div>

        {/* Login Form */}
        <div className="flex flex-col justify-center px-10 py-12 bg-transparent backdrop-blur-sm">
          <h2 className="text-2xl font-semibold text-center mb-8 text-gray-800">
            Log In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Type Selection */}
            <div>
              <label className="block text-sm mb-2 font-medium text-gray-700">
                Login As
              </label>
              <Select value={userType} onValueChange={setUserType}>
                <SelectTrigger className="w-full border-gray-300 h-11 rounded-md focus:ring-2 focus:ring-pink-400">
                  <SelectValue placeholder="Select User Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm mb-2 font-medium text-gray-700">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border border-gray-300 h-11 rounded-md focus:ring-2 focus:ring-pink-400"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm mb-2 font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border border-gray-300 h-11 rounded-md focus:ring-2 focus:ring-pink-400 pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
                >
                  {showPassword ? (
                    <EyeOff size={18} className="text-gray-600" />
                  ) : (
                    <Eye size={18} className="text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Keep Logged In + Forgot */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="keep-logged-in"
                  checked={keepLoggedIn}
                  onCheckedChange={(checked) => setKeepLoggedIn(checked as boolean)}
                />
                <label htmlFor="keep-logged-in" className="cursor-pointer">
                  Keep me logged in
                </label>
              </div>
              <Link
                to="/settings/forgot-password"
                className="hover:underline text-gray-800 font-medium"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base bg-black text-white hover:bg-gray-800 rounded-md"
            >
              {loading ? "Logging in..." : "Log In"}
            </Button>

            {/* Sign Up
            <p className="text-center text-sm text-gray-700">
              Didn't Have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-pink-600 hover:underline"
              >
                Sign Up
              </Link>
            </p> */}
          </form>
        </div>
      </div>
    </div>
  );
}