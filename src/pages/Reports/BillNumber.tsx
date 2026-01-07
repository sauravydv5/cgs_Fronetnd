"use client";
import { AdminLayout } from "@/components/AdminLayout";
import { getAllReports, getReportsByDateRange } from "@/adminApi/reportApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Search } from "lucide-react";
import React, { useState } from "react";

export default function BillNumber() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!billNumber.trim()) {
      setError("Please enter a bill number to search.");
      return;
    }
    setLoading(true);
    setError(null);
    setSearchResult(null);
    try {
      let response;
      if (fromDate && toDate) {
        response = await getReportsByDateRange(fromDate, toDate);
      } else {
        response = await getAllReports();
      }
      if (response.success && Array.isArray(response.bills)) {
        const foundBill = response.bills.find(
          (bill: any) => bill.billNo?.toLowerCase().includes(billNumber.trim().toLowerCase())
        );
        if (foundBill) {
          setSearchResult(foundBill);
        } else {
          if (fromDate && toDate) {
            setError(`Bill with number "${billNumber}" not found within the selected date range.`);
          } else {
            setError(`Bill with number "${billNumber}" not found.`);
          }
        }
      } else {
        setError("Failed to fetch report data.");
      }
    } catch (err) {
      setError("An error occurred while searching for the bill.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Report > Bill Number">
      <div className="flex flex-col items-center justify-center gap-10">
        {/* Date Section */}
        <div className="flex flex-wrap justify-center gap-6">
          {/* From Date */}
          <div className="flex flex-col items-center">
            <label className="text-sm text-gray-700 mb-1">From Date</label>
            <div className="relative">
              <Input
                type="date"
                className="w-40 h-10 rounded-md bg-[#F4F4F4] pl-8 border border-gray-200 text-gray-600 focus:ring-0"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
              />
              <Calendar
                className="absolute left-2.5 top-2.5 text-gray-500"
                size={16}
              />
            </div>
          </div>

          {/* To Date */}
          <div className="flex flex-col items-center">
            <label className="text-sm text-gray-700 mb-1">To Date</label>
            <div className="relative">
              <Input
                type="date"
                className="w-40 h-10 rounded-md bg-[#F4F4F4] pl-8 border border-gray-200 text-gray-600 focus:ring-0"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
              />
              <Calendar
                className="absolute left-2.5 top-2.5 text-gray-500"
                size={16}
              />
            </div>
          </div>
        </div>

        <div className="flex items-start justify-start mt-9 gap-2">
          <Input
            type="text"
            placeholder="Enter Bill Number"
            className="w-[380px] h-11 rounded-full bg-gray-100 placeholder:text-gray-500 px-5 border border-gray-300 focus:ring-0 focus:outline-none"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <Button
            className="rounded-full bg-[#E98C81] hover:bg-[#e57b70] text-white w-11 h-11 flex items-center justify-center"
            onClick={handleSearch}
            disabled={loading}
          >
            <Search size={18} />
          </Button>
        </div>

        {/* Result Section */}
        <div className="w-full max-w-4xl mt-8">
          {loading && <div className="text-center">Searching...</div>}
          {error && <div className="text-center text-red-500">{error}</div>}
          {searchResult && (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    Bill Details
                  </h3>
                  <p className="text-base text-gray-600 mt-1">
                    Bill ID: <span className="font-semibold text-gray-800">{searchResult.billNo}</span>
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-gray-700">Date: {new Date(searchResult.billDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <p className={`font-semibold ${searchResult.status === 'PAID' ? 'text-green-600' : 'text-red-600'}`}>
                    {searchResult.status}
                  </p>
                </div>
              </div>

              <p className="text-base mb-6 font-semibold text-gray-800">Party: <span className="font-normal text-gray-700">{searchResult.customerName || searchResult.customerId?.name || "N/A"}</span></p>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="p-3 font-semibold">S.No</th>
                      <th className="p-3 font-semibold">Item Name</th>
                      <th className="p-3 font-semibold text-center">Qty</th>
                      <th className="p-3 font-semibold text-right">MRP (₹)</th>
                      <th className="p-3 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {searchResult.items?.map((item: any, index: number) => (
                      <tr key={item._id || index} className="border-t">
                        <td className="p-3 text-gray-700">{index + 1}</td>
                        <td className="p-3 font-medium text-gray-800 whitespace-nowrap">{item.itemName}</td>
                        <td className="p-3 text-center text-gray-700">{item.qty}</td>
                        <td className="p-3 text-right text-gray-700">{item.rate?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right">₹{item.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 flex justify-end">
                <div className="w-full max-w-xs space-y-3 text-sm text-gray-700">
                  <div className="flex justify-between"><span>Subtotal:</span> <span className="font-medium">₹{searchResult.grossAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between"><span>Discount:</span> <span className="text-red-500 font-medium">- ₹{searchResult.totalDiscount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between"><span>Tax (CGST+SGST):</span> <span className="font-medium">+ ₹{(searchResult.totalCGST + searchResult.totalSGST + searchResult.totalIGST)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  <div className="border-t border-gray-300 pt-3 mt-3"></div>
                  <div className="flex justify-between font-bold text-lg text-gray-900"><span>Grand Total:</span> <span>₹{searchResult.netAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
