import { useEffect, useState } from 'react';
import { 
  User, Settings, LogOut, ShoppingCart, Monitor, Smartphone, Bell, Menu, X, Percent,
  Receipt, Package, Users, BarChart3
} from 'lucide-react';
import { useApp } from '../../context/SupabaseAppContext';
import { useAuth } from '../../context/AuthContext';
import { swalConfig } from '../../lib/sweetAlert';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  const { state, dispatch } = useApp();
  const { signOut } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    if (!showMobileMenu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowMobileMenu(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showMobileMenu]);

  const toggleInterfaceMode = () => {
    const newMode = state.settings.interfaceMode === 'touch' ? 'traditional' : 'touch';
    dispatch({ type: 'SET_SETTINGS', payload: { interfaceMode: newMode } });
  };

  const handleLogout = async () => {
    const result = await swalConfig.confirm(
      'Sign Out Confirmation',
      'Are you sure you want to sign out? You will be logged out of the system.',
      'Sign Out'
    );
    
    if (result.isConfirmed) {
      try {
        await signOut();
      } catch (error) {
        console.error('Error signing out:', error);
        swalConfig.error('Failed to sign out. Please try again.');
      }
    }
  };

  const cartItemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  // Role-based navigation with proper permissions
  const getNavigationItems = () => {
    const role = state.currentUser?.role;
    const items = [];

    // POS - All roles can access
    items.push({ id: 'pos', label: 'POS', icon: ShoppingCart, color: 'text-blue-600' });

    // Sales/Transactions - Manager and Admin only (Cashiers should only have POS access)
    if (role === 'admin' || role === 'manager') {
      items.push({ id: 'transactions', label: 'Sales', icon: Receipt, color: 'text-green-600' });
    }

    // Inventory - Manager and Admin can access
    if (role === 'admin' || role === 'manager') {
      items.push({ id: 'inventory', label: 'Inventory', icon: Package, color: 'text-purple-600' });
    }

    // Customers - Manager and Admin can access
    if (role === 'admin' || role === 'manager') {
      items.push({ id: 'customers', label: 'Customers', icon: Users, color: 'text-orange-600' });
    }

    // Discounts - Manager and Admin can access
    if (role === 'admin' || role === 'manager') {
      items.push({ id: 'discounts', label: 'Discounts', icon: Percent, color: 'text-pink-600' });
    }

    // Reports - Manager and Admin can access
    if (role === 'admin' || role === 'manager') {
      items.push({ id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-red-600' });
    }

    // Users - Admin only
    if (role === 'admin') {
      items.push({ id: 'users', label: 'Users', icon: User, color: 'text-indigo-600' });
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  return (
    <header className={`bg-white border-b border-gray-100 sticky top-0 ${showMobileMenu ? 'z-[70]' : 'z-40'}`}>
      <div className="px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo and Store Name */}
          <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-3">
              {state.settings.storeLogo ? (
                <img 
                  src={state.settings.storeLogo} 
                  alt="Store Logo" 
                  className="h-8 w-8 lg:h-10 lg:w-10 object-contain rounded-lg"
                />
              ) : (
                <div className="h-8 w-8 lg:h-10 lg:w-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="max-w-[8rem] truncate text-sm font-bold text-gray-900 sm:max-w-48 sm:text-lg lg:text-xl">
                  {state.settings.storeName}
                </h1>
                <p className="text-xs text-gray-500 hidden lg:block">Point of Sale</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden 2xl:flex space-x-1 ml-4 2xl:ml-8">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${currentView === item.id ? 'text-blue-600' : item.color}`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Right Side Controls */}
          <div className="flex flex-shrink-0 items-center space-x-1 sm:space-x-2 lg:space-x-4">
            {/* Interface Mode Toggle - Hidden on mobile */}
            <button
              onClick={toggleInterfaceMode}
              className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
              title={`Switch to ${state.settings.interfaceMode === 'touch' ? 'Traditional' : 'Touch'} Mode`}
            >
              {state.settings.interfaceMode === 'touch' ? (
                <Monitor className="h-4 w-4" />
              ) : (
                <Smartphone className="h-4 w-4" />
              )}
              <span className="hidden lg:block">
                {state.settings.interfaceMode === 'touch' ? 'Touch' : 'Traditional'}
              </span>
            </button>

            {/* Cart Indicator */}
            {currentView === 'pos' && cartItemCount > 0 && (
              <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700">
                <ShoppingCart className="h-4 w-4" />
                <span className="font-semibold text-sm">{cartItemCount}</span>
              </div>
            )}

            {/* Notifications */}
            <button aria-label="Notifications" className="hidden sm:inline-flex p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="hidden lg:block text-right">
                <p className="text-sm font-semibold text-gray-900 truncate max-w-32">
                  {state.currentUser?.name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {state.currentUser?.role}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 lg:h-9 lg:w-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                </div>
                
                <div className="hidden md:flex items-center space-x-1">
                  <button
                    onClick={() => onViewChange('settings')}
                    className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label={showMobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={showMobileMenu}
              className="2xl:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <>
            <button
              className="mobile-nav-backdrop"
              onClick={() => setShowMobileMenu(false)}
              aria-label="Dismiss navigation menu"
            />
            <nav className="mobile-nav-drawer animate-slide-up" aria-label="Mobile navigation">
              <div className="mb-3 flex items-center justify-between border-b border-gray-100 px-4 pb-3">
                <span className="font-semibold text-gray-900">Navigation</span>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  aria-label="Close navigation menu"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${currentView === item.id ? 'text-blue-600' : item.color}`} />
                  <span>{item.label}</span>
                </button>
              ))}
              
              <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                <button
                  onClick={() => {
                    onViewChange('settings');
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
                >
                  <Settings className="h-5 w-5 text-gray-500" />
                  <span>Settings</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
              </div>
            </nav>
          </>
        )}
      </div>
    </header>
  );
}