import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Appointments from "@/pages/Appointments";
import Customers from "@/pages/Customers";
import Staff from "@/pages/Staff";
import Services from "@/pages/Services";
import Inventory from "@/pages/Inventory";
import Billing from "@/pages/Billing";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/appointments" element={<AppLayout><Appointments /></AppLayout>} />
          <Route path="/customers" element={<AppLayout><Customers /></AppLayout>} />
          <Route path="/staff" element={<AppLayout><Staff /></AppLayout>} />
          <Route path="/services" element={<AppLayout><Services /></AppLayout>} />
          <Route path="/inventory" element={<AppLayout><Inventory /></AppLayout>} />
          <Route path="/billing" element={<AppLayout><Billing /></AppLayout>} />
          <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
