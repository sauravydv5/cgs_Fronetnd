import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import image from "@/images/password-recovery-image.png";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(
        "http://51.20.132.233:5000/api/auth/admin/forgot-password",
        { email }
      );

      if (response.data.status) {
        toast.success(response.data.message || "Password reset link sent!");
        // You can navigate to a confirmation page or back to login
        navigate("/login");
      }
    } catch (error: any) {
      console.error("Forgot password error:", error);
      toast.error(
        error.response?.data?.message || "Failed to send reset link. Please try again."
      );
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
        <div className="rounded-xl flex items-center justify-center bg-white p-10">
          <img
            src={image}
            alt="forgot password illustration"
            className="w-full h-auto"
          />
        </div>

        {/* Forgot Password Form */}
        <div className="flex flex-col justify-center px-10 py-12 bg-transparent backdrop-blur-sm">
          <h2 className="text-2xl font-semibold text-center mb-8 text-gray-800">
            Forgot Password?
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm mb-2 font-medium text-gray-700">
                Enter your Recovery Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="border border-gray-300 h-11 rounded-md focus:ring-2 focus:ring-pink-400"
              />
            </div>

            {/* Recover Password Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base bg-black text-white hover:bg-gray-800 rounded-md disabled:bg-gray-400"
            >
              {loading ? "Sending..." : "Recover Password"}
            </Button>

            {/* Back to Login */}
            <p className="text-center text-sm text-gray-700">
              Remember your password?{" "}
              <Link
                to="/login"
                className="font-semibold text-pink-600 hover:underline"
              >
                Log In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}