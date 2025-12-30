import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import adminInstance from "@/adminApi/adminInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast"; // Using the existing toast system for consistency
import { Eye, EyeOff } from "lucide-react";
import loginImage from "@/images/login-bg.png";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await adminInstance.post("/admin/login", {
        email,
        password,
      });

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
        navigate("/2fa");
      } else {
        toast({
          title: "Login Failed",
          description: response.data?.message || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Login API Error:", err); // Add this line for detailed error logging
      toast({
        title: "Login Failed",
        description: err.response?.data?.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
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