import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/SupabaseAppContext';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/layout/Header';
import { POSTerminal } from './components/pos/POSTerminal';
import { TransactionsManager } from './components/transactions/TransactionsManager';
import { InventoryManager } from './components/inventory/InventoryManager';
import { CustomerManager } from './components/customers/CustomerManager';
import { ReportsManager } from './components/reports/ReportsManager';
import { Settings } from './components/settings/Settings';
import { DiscountManager } from './components/discounts/DiscountManager';
import { UserManager } from './components/users/UserManager';


function AppContent() {
  const { user, loading } = useAuth();
  const { state, reloadData } = useApp();
  const [currentView, setCurrentView] = useState('pos');

  // Show loading spinner while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show login page if no user is authenticated
  if (!user || !state.currentUser) {
    return <LoginPage />;
  }

  const renderCurrentView = () => {
    const userRole = state.currentUser?.role;
    
    // Restrict cashiers to POS only
    if (userRole === 'cashier' && currentView !== 'pos') {
      setCurrentView('pos');
      return <POSTerminal />;
    }
    
    switch (currentView) {
      case 'pos':
        return <POSTerminal />;
      case 'transactions':
        // Only allow admin and manager to access transactions
        if (userRole === 'admin' || userRole === 'manager') {
          return <TransactionsManager />;
        }
        setCurrentView('pos');
        return <POSTerminal />;
      case 'inventory':
        // Only allow admin and manager to access inventory
        if (userRole === 'admin' || userRole === 'manager') {
          return <InventoryManager />;
        }
        setCurrentView('pos');
        return <POSTerminal />;
      case 'customers':
        // Only allow admin and manager to access customers
        if (userRole === 'admin' || userRole === 'manager') {
          return <CustomerManager />;
        }
        setCurrentView('pos');
        return <POSTerminal />;
      case 'reports':
        // Only allow admin and manager to access reports
        if (userRole === 'admin' || userRole === 'manager') {
          return <ReportsManager />;
        }
        setCurrentView('pos');
        return <POSTerminal />;
      case 'discounts':
        // Only allow admin and manager to access discounts
        if (userRole === 'admin' || userRole === 'manager') {
          return <DiscountManager />;
        }
        setCurrentView('pos');
        return <POSTerminal />;
      case 'users':
        // Only allow admin to access users
        if (userRole === 'admin') {
          return <UserManager />;
        }
        setCurrentView('pos');
        return <POSTerminal />;
      case 'settings':
        return <Settings />;
      default:
        return <POSTerminal />;
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 min-h-0 overflow-auto xl:overflow-hidden">
        {state.loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {state.error && (
              <section
                role="alert"
                className="m-4 rounded-lg border border-red-200 bg-red-50 p-6 text-red-900 lg:m-6"
              >
                <h1 className="text-xl font-semibold">
                  Some store data could not be loaded
                </h1>
                <p className="mt-2">
                  Successfully loaded data remains available. Failed sections
                  may be incomplete until the database request succeeds.
                </p>
                <p className="mt-3 whitespace-pre-line break-words font-mono text-sm">
                  {state.error}
                </p>
                <button
                  type="button"
                  onClick={() => void reloadData()}
                  className="mt-4 rounded-md bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800"
                >
                  Retry loading data
                </button>
              </section>
            )}
            {renderCurrentView()}
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;