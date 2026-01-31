import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
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
import BusinessManagement from "./pages/BusinessManagement";
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
function ProtectedRoute({ children, allowedRoles, superAdminOnly = false }: { 
  children: React.ReactNode; 
  allowedRoles?: string[];
  superAdminOnly?: boolean;
}) {
  const { isAuthenticated, user, isLoading, isSuperAdmin, businessType } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super admin only routes
  if (superAdminOnly && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    if (user.role === 'cashier') return <Navigate to="/pos" replace />;
    if (user.role === 'pharmacist') {
      // Pharmacist only exists in pharmacy type
      return <Navigate to="/categories" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { isLoading, businessType } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Check if this is a pharmacy business (for prescription/medicine routes)
  const isPharmacy = businessType === 'pharmacy';
  
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      
      {/* Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Dashboard /></ProtectedRoute>} />
      
      {/* POS & Sales */}
      <Route path="/pos" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}><POS /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Sales /></ProtectedRoute>} />
      <Route path="/my-sales" element={<ProtectedRoute allowedRoles={['cashier']}><MySales /></ProtectedRoute>} />
      <Route path="/cashier-tracking" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><CashierTracking /></ProtectedRoute>} />
      
      {/* Inventory - mapped to both /inventory and /stock */}
      <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Inventory /></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><StockManagement /></ProtectedRoute>} />
      
      {/* Categories - works for both medicine categories and product categories */}
      <Route path="/categories" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'pharmacist']}><MedicineCategories /></ProtectedRoute>} />
      <Route path="/medicine-categories" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'pharmacist']}><MedicineCategories /></ProtectedRoute>} />
      
      {/* Create Item - works for both medicines and products */}
      <Route path="/create-item" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'pharmacist']}><CreateMedicine /></ProtectedRoute>} />
      <Route path="/create-medicine" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'pharmacist']}><CreateMedicine /></ProtectedRoute>} />
      
      {/* Pharmacist items */}
      <Route path="/pharmacist-items" element={<ProtectedRoute allowedRoles={['pharmacist']}><PharmacistMedicines /></ProtectedRoute>} />
      <Route path="/pharmacist-medicines" element={<ProtectedRoute allowedRoles={['pharmacist']}><PharmacistMedicines /></ProtectedRoute>} />
      
      {/* Prescriptions - only for pharmacy */}
      {isPharmacy && (
        <Route path="/prescriptions" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'pharmacist']}><Prescriptions /></ProtectedRoute>} />
      )}
      
      {/* Suppliers & Orders */}
      <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Suppliers /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
      
      {/* Expenses */}
      <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Expenses /></ProtectedRoute>} />
      <Route path="/my-expenses" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><CashierExpenses /></ProtectedRoute>} />
      
      {/* Reports */}
      <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Reports /></ProtectedRoute>} />
      
      {/* Employees & Payroll */}
      <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Employees /></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Payroll /></ProtectedRoute>} />
      
      {/* User Management */}
      <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
      
      {/* Settings */}
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
      
      {/* Business Management - Super Admin Only */}
      <Route path="/businesses" element={<ProtectedRoute superAdminOnly><BusinessManagement /></ProtectedRoute>} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantProvider>
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
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
