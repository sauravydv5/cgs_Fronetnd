import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import adminInstance from "@/adminApi/adminInstance";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function TwoFactorAuth() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits and limit to 10 characters
    if (/^\d{0,10}$/.test(value)) {
      setMobileNumber(value);
      setErrorMsg("");
    }
  };

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.length !== 10) {
      setErrorMsg("Mobile number must be exactly 10 digits");
      return;
    }
    setErrorMsg("");

    // Show toast for OTP sent
    toast.success("OTP sent successfully!");

    // Move to OTP step
    setStep("otp");
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) {
      setErrorMsg("Please enter a complete 4-digit OTP");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      // This is crucial for the API call to be authorized
      const tempToken = sessionStorage.getItem("tempToken");

      const response = await adminInstance.post("/admin/otp/verify", {
        phoneNumber: mobileNumber,
        otp: Number(otp),
      }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });

      if (response.data?.status === true && response.data?.data?.token) {
        const token = response.data.data.token;
        const user = response.data.data.user;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        sessionStorage.removeItem("tempToken");

        toast.success("OTP verified successfully!");
        navigate("/dashboard");
      } else {
        setErrorMsg(response.data?.message || "Invalid OTP");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "OTP verification failed. Please try again.";
      setErrorMsg(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const changeMobileNumber = () => {
    setOtp("");
    setErrorMsg("");
    setStep("mobile");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-[#ff4e8a] via-[#ffb86c] to-[#ff5fa2]">
      <div className="absolute top-0 left-0 w-full h-[200px] bg-gradient-to-b from-[#ff6fa5] to-transparent rounded-b-[80px]" />
      <div className="absolute bottom-0 right-0 w-full h-[200px] bg-gradient-to-t from-[#ff6fa5] to-transparent rounded-t-[80px]" />

      <div className="relative z-10 bg-[#ffeaea]/90 backdrop-blur-sm border border-[#ffd7d7] rounded-xl shadow-md p-8 w-[380px] text-center">
        <h2 className="text-lg md:text-xl font-semibold mb-2 text-gray-900">
          2 Step Authentication
        </h2>

        {step === "mobile" ? (
          <form onSubmit={handleMobileSubmit} className="space-y-6">
            <p className="text-sm text-gray-700 mb-6">
              We have sent a verification code to the mobile number whenever you
              Login in your account.
            </p>
            <div className="space-y-2">
              <Input
                id="mobile"
                type="tel"
                value={mobileNumber}
                onChange={handleMobileChange}
                className="h-11 bg-white text-gray-800 placeholder:text-gray-500 rounded-md border border-gray-300 text-center"
                placeholder="Enter 10 digit mobile number"
                maxLength={10}
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                {mobileNumber.length}/10 digits
              </p>
            </div>
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm text-center">
                  {errorMsg}
                </p>
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-black text-white hover:bg-gray-800 rounded-md disabled:opacity-50"
            >
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-700">
                Enter the verification code we have sent to <br />
                <span className="font-medium text-green-600">+91 {mobileNumber}</span>
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={otp}
                onChange={setOtp}
                disabled={loading}
              >
                <InputOTPGroup>
                  {[...Array(4)].map((_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="w-12 h-12 text-xl bg-white border-gray-300 rounded-md focus:ring-2 focus:ring-pink-400"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm text-center">
                  {errorMsg}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || otp.length !== 4}
              className="w-full h-11 bg-black text-white hover:bg-gray-800 rounded-md disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the OTP?
              </p>
              <button
                type="button"
                onClick={changeMobileNumber}
                className="text-xs text-pink-600 hover:underline font-semibold"
              >
                Change mobile number
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}