import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StockProvider } from "@/contexts/StockContext";
import { SalesProvider } from "@/contexts/SalesContext";
import { CategoriesProvider } from "@/contexts/CategoriesContext";
import { ExpensesProvider } from "@/contexts/ExpensesContext";
import { PrescriptionsProvider } from "@/contexts/PrescriptionsContext";
import { Loader2 } from "lucide-react";
// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Suppliers from "./pages/Suppliers";
import PurchaseOrders from "./pages/PurchaseOrders";
import Sales from "./pages/Sales";
import MySales from "./pages/MySales";
import CashierTracking from "./pages/CashierTracking";
import Expenses from "./pages/Expenses";
import CashierExpenses from "./pages/CashierExpenses";
import Reports from "./pages/Reports";
import StockManagement from "./pages/StockManagement";
import Employees from "./pages/Employees";
import Payroll from "./pages/Payroll";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import MedicineCategories from "./pages/MedicineCategories";
import CreateMedicine from "./pages/CreateMedicine";
import Prescriptions from "./pages/Prescriptions";
import PharmacistMedicines from "./pages/PharmacistMedicines";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Protected Route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    if (user.role === 'cashier') return <Navigate to="/pos" replace />;
    if (user.role === 'pharmacist') return <Navigate to="/medicine-categories" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Dashboard /></ProtectedRoute>} />
      <Route path="/pos" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}><POS /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Inventory /></ProtectedRoute>} />
      <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Suppliers /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Sales /></ProtectedRoute>} />
      <Route path="/my-sales" element={<ProtectedRoute allowedRoles={['cashier']}><MySales /></ProtectedRoute>} />
      <Route path="/my-expenses" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><CashierExpenses /></ProtectedRoute>} />
      <Route path="/cashier-tracking" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><CashierTracking /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Expenses /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Reports /></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><StockManagement /></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Employees /></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Payroll /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
      <Route path="/medicine-categories" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'pharmacist']}><MedicineCategories /></ProtectedRoute>} />
      <Route path="/create-medicine" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'pharmacist']}><CreateMedicine /></ProtectedRoute>} />
      <Route path="/prescriptions" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'pharmacist']}><Prescriptions /></ProtectedRoute>} />
      <Route path="/pharmacist-medicines" element={<ProtectedRoute allowedRoles={['pharmacist']}><PharmacistMedicines /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StockProvider>
        <SalesProvider>
          <CategoriesProvider>
            <ExpensesProvider>
              <PrescriptionsProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <AppRoutes />
                  </BrowserRouter>
                </TooltipProvider>
              </PrescriptionsProvider>
            </ExpensesProvider>
          </CategoriesProvider>
        </SalesProvider>
      </StockProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
