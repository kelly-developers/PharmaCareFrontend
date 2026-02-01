import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BusinessType, getTerminology } from '@/types/business';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Truck,
  DollarSign,
  BarChart3,
  Pill,
  UserCircle,
  ChevronLeft,
  ClipboardList,
  Receipt,
  Wallet,
  PlusCircle,
  Layers,
  FileBox,
  Building2,
  Store,
  Barcode,
  ShoppingBag,
  Shield,
  Activity,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  feature?: string; // Optional feature flag
}

// Super admin navigation items (only shown when logged in as super admin)
const superAdminNavItems: NavItem[] = [
  { to: '/super-admin', icon: LayoutDashboard, label: 'Platform Dashboard' },
  { to: '/businesses', icon: Building2, label: 'Business Management' },
];

// Base navigation items for all roles
const getNavItems = (businessType: BusinessType, isSuperAdmin: boolean) => {
  const terms = getTerminology(businessType);
  const isPharmacy = businessType === 'pharmacy';

  // Super admin only sees super admin routes (no business routes)
  if (isSuperAdmin) {
    return {
      admin: superAdminNavItems,
      manager: superAdminNavItems,
      pharmacist: superAdminNavItems,
      cashier: superAdminNavItems,
    };
  }

  const adminItems: NavItem[] = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pos', icon: ShoppingCart, label: 'Point of Sale' },
    { to: '/inventory', icon: Package, label: terms.stock },
    { to: '/categories', icon: Layers, label: terms.itemCategories },
    { to: '/create-item', icon: PlusCircle, label: terms.createItem },
    ...(isPharmacy ? [
      { to: '/prescriptions', icon: FileBox, label: 'Prescriptions' },
    ] : []),
    { to: '/suppliers', icon: Truck, label: terms.supplier + 's' },
    { to: '/orders', icon: ClipboardList, label: 'Purchase Orders' },
    { to: '/sales', icon: DollarSign, label: 'Sales' },
    { to: '/credit-sales', icon: Receipt, label: 'Credit Sales' },
    { to: '/expenses', icon: Wallet, label: 'Expenses' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/family-planning', icon: Activity, label: 'Family Planning' },
    { to: '/users', icon: UserCircle, label: 'User Management' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const managerItems: NavItem[] = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pos', icon: ShoppingCart, label: 'Point of Sale' },
    { to: '/inventory', icon: Package, label: terms.stock },
    { to: '/categories', icon: Layers, label: terms.itemCategories },
    { to: '/create-item', icon: PlusCircle, label: terms.createItem },
    ...(isPharmacy ? [
      { to: '/prescriptions', icon: FileBox, label: 'Prescriptions' },
    ] : []),
    { to: '/suppliers', icon: Truck, label: terms.supplier + 's' },
    { to: '/orders', icon: ClipboardList, label: 'Purchase Orders' },
    { to: '/sales', icon: DollarSign, label: 'Sales' },
    { to: '/credit-sales', icon: Receipt, label: 'Credit Sales' },
    { to: '/cashier-tracking', icon: Receipt, label: 'Cashier Tracking' },
    { to: '/expenses', icon: Wallet, label: 'Expenses' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/family-planning', icon: Activity, label: 'Family Planning' },
  ];

  const pharmacistItems: NavItem[] = isPharmacy ? [
    { to: '/categories', icon: Layers, label: terms.itemCategories },
    { to: '/create-item', icon: PlusCircle, label: terms.createItem },
    { to: '/pharmacist-items', icon: Package, label: `Available ${terms.items}` },
    { to: '/prescriptions', icon: FileBox, label: 'Prescriptions' },
  ] : [
    { to: '/categories', icon: Layers, label: terms.itemCategories },
    { to: '/create-item', icon: PlusCircle, label: terms.createItem },
  ];

  const cashierItems: NavItem[] = [
    { to: '/pos', icon: ShoppingCart, label: 'Point of Sale' },
    { to: '/my-sales', icon: DollarSign, label: 'My Sales' },
    { to: '/credit-sales', icon: Receipt, label: 'Credit Sales' },
    { to: '/family-planning', icon: Activity, label: 'Family Planning' },
  ];

  return {
    admin: adminItems,
    manager: managerItems,
    pharmacist: pharmacistItems,
    cashier: cashierItems,
  };
};

// Get icon for business type
const getBusinessIcon = (businessType: BusinessType) => {
  switch (businessType) {
    case 'pharmacy':
      return Pill;
    case 'supermarket':
      return ShoppingBag;
    case 'general':
      return Store;
    case 'retail':
      return Package;
    default:
      return Store;
  }
};

export function Sidebar() {
  const { user, business, businessType, isSuperAdmin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user) return null;

  const navItems = getNavItems(businessType, isSuperAdmin);
  const items = navItems[user.role] || [];
  
  // Super admin shows shield icon and platform name
  const BusinessIcon = isSuperAdmin ? Shield : getBusinessIcon(businessType);
  const businessName = isSuperAdmin ? 'Super Admin' : (business?.name || 'PharmaPOS');

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen bg-sidebar transition-all duration-300',
          isCollapsed ? 'w-20' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center w-full')}>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-glow",
                isSuperAdmin ? "bg-gradient-to-br from-amber-500 to-orange-600" : "gradient-primary"
              )}>
                <BusinessIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              {!isCollapsed && (
                <div className="animate-fade-in">
                  <h1 className="font-display font-bold text-sidebar-foreground truncate max-w-[140px]">
                    {businessName}
                  </h1>
                  <p className="text-xs text-sidebar-foreground/60 capitalize">
                    {isSuperAdmin ? 'Platform Admin' : businessType}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden lg:flex text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')} />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    isCollapsed && 'justify-center px-2'
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-sidebar-border">
            <div className={cn('flex items-center gap-3 px-3 py-2', isCollapsed && 'justify-center px-0')}>
              <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sm font-semibold text-sidebar-foreground">
                  {(user.name || user.email || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 animate-fade-in">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name || user.email}</p>
                  <p className="text-xs text-sidebar-foreground/60 capitalize">
                    {isSuperAdmin ? 'Super Admin' : user.role}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              className={cn(
                'w-full mt-2 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10',
                isCollapsed ? 'px-2' : 'justify-start'
              )}
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2">Logout</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
