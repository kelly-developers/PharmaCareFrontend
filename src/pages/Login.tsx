import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Eye, EyeOff, Loader2, Shield, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminPortal, setIsAdminPortal] = useState(false);
  const { login, isAuthenticated, isLoading, user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Check if admin portal mode from URL
  useEffect(() => {
    const portal = searchParams.get('portal');
    if (portal === 'admin') {
      setIsAdminPortal(true);
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      console.log('🔐 Auth redirect check - isSuperAdmin:', isSuperAdmin, 'role:', user.role, 'isAdminPortal:', isAdminPortal);
      
      // Super admin goes to business management (check both flag and role)
      const isSuper = isSuperAdmin || user.role === 'admin' && isAdminPortal;
      if (isSuper && isAdminPortal) {
        console.log('🏢 Redirecting to business management...');
        navigate('/businesses', { replace: true });
        return;
      }
      
      const redirectPath = user.role === 'cashier' 
        ? '/pos' 
        : user.role === 'pharmacist' 
          ? '/medicine-categories' 
          : '/dashboard';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, isLoading, isSuperAdmin, isAdminPortal, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast({
          title: 'Welcome back!',
          description: isAdminPortal ? 'Logged in to Admin Portal.' : 'You have been logged in successfully.',
        });
        // Navigation will happen via useEffect when isAuthenticated updates
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <div className="w-full max-w-md animate-scale-in">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-glow mb-4 ${isAdminPortal ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'gradient-primary'}`}>
              {isAdminPortal ? (
                <Shield className="h-8 w-8 text-white" />
              ) : (
                <Building2 className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isAdminPortal ? 'Super Admin Portal' : 'Business Portal'}
            </CardTitle>
            <CardDescription>
              {isAdminPortal 
                ? 'Manage all businesses and system settings' 
                : 'Sign in to manage your business'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Portal Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  {isAdminPortal ? (
                    <Shield className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Store className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {isAdminPortal ? 'Super Admin Mode' : 'Business Login'}
                  </span>
                </div>
                <Switch
                  checked={isAdminPortal}
                  onCheckedChange={setIsAdminPortal}
                  aria-label="Toggle admin portal"
                />
              </div>
              
              <Button 
                type="submit" 
                variant={isAdminPortal ? "default" : "hero"} 
                size="xl" 
                className={`w-full ${isAdminPortal ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    {isAdminPortal && <Shield className="h-4 w-4 mr-2" />}
                    {isAdminPortal ? 'Access Admin Portal' : 'Sign In'}
                  </>
                )}
              </Button>
            </form>
            
            {/* Hint text */}
            <p className="text-xs text-center text-muted-foreground mt-4">
              {isAdminPortal 
                ? 'Use your super admin credentials to access the admin portal.' 
                : 'Toggle the switch above for super admin access.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}