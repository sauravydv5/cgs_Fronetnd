import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import Dashboard from "./pages/Dashboard";
import ProductManagement from "./pages/ProductManagement";
import OrderManagement from "./pages/OrderManagement";
import InventoryTracking from "./pages/InventoryTracking";
import CustomerRelationship from "./pages/CustomerRelationship";
import BillGeneration from "./pages/BillGeneration";
import NotFound from "./pages/NotFound";
import Purchases from "./pages/Purchases";
import PurchasersDetail from "./pages/PurchasersDetail";
import PurchaseDetail from "./pages/PurchaseDetail";
import ReturnPurchase from "./pages/ReturnPurchase";
import PurchaseVoucher from "./pages/PurchaseVoucher";
import Ledger from "./pages/Ledger";
import Sale from "./pages/Sale";
import Reports from "./pages/Reports";
import HSN from "./pages/Reports/HSN";
import GSTReturn from "./pages/Reports/GSTReturn";
import BillWiseReport from "./pages/Reports/BillWiseReport";
import BillNumber from "./pages/Reports/BillNumber";
import SaleTaxRegister from "./pages/Reports/SaleTaxRegister";
import BillHSNWise from "./pages/Reports/BillHSNWise";
import ItemWiseSaleRegister from "./pages/Reports/ItemWiseSaleReport";
import SaleRegister from "./pages/Reports/SaleRegister";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import GeneralSettings from "./pages/GeneralSettings";
import Customers from "./pages/Customers";
import NewBill from "./pages/NewBill";
import BillDrafts from "./pages/BillDrafts";
import SaleReturn from "./pages/SaleReturn";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* <Toaster position="top-center" /> */}
      <Sonner position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="settings/forgot-password" element={<ForgotPassword />} />
          <Route path="/2fa" element={<TwoFactorAuth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<OrderManagement />} />
          <Route path="/inventory" element={<InventoryTracking />} />
          <Route path="/customers" element={<CustomerRelationship />} />
          <Route path="/bills" element={<BillGeneration />} />
          <Route path="/bills/sale" element={<Sale />} />
          <Route path="/bills/sale-return" element={<SaleReturn />} />
          <Route path="/bills/new-bill" element={<NewBill />} />
          <Route path="/bills/customers" element={<Customers />} />
          <Route path="/bills/drafts" element={<BillDrafts />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/purchases/purchasers-detail" element={<PurchasersDetail />} />
          <Route path="/purchases/purchase-detail" element={<PurchaseDetail/>} />
          <Route path="/purchases/return-purchases" element={<ReturnPurchase/>} />
          <Route path="/purchases/purchase-voucher" element={<PurchaseVoucher/>} />

          <Route path="/ledger" element={<Ledger />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/sale-tax-register" element={<SaleTaxRegister />} />
          <Route path="/reports/gst-return" element={<GSTReturn />} />
          <Route path="/reports/bill-wise-report" element={<BillWiseReport />} />
          <Route path="/reports/bill-hsn-wise" element={<BillHSNWise />} />
          <Route path="/reports/bill-number" element={<BillNumber />} />
          <Route path="/reports/hsn-wise" element={<HSN />} />
          <Route path="/reports/item-wise-sale-report" element={<ItemWiseSaleRegister />} />
          <Route path="/reports/sale-register" element={<SaleRegister />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/general-settings" element={<GeneralSettings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
