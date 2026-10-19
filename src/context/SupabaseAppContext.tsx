import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import {
  Product, Customer, Sale, User, Discount, CartItem, AppSettings, SalesTab, AppliedDiscount, CardDetails
} from '../types';
import { useAuth } from './AuthContext';
import {
  generateNextInvoiceNumber,
  getNextInvoiceNumber,
} from '../lib/invoiceUtils';
import {
  productsService,
  customersService,
  salesService,
  discountsService,
  settingsService,
  usersService,
  salesTabsService,
  getSafeErrorInfo,
  logDatabaseRequest,
} from '../lib/services';

interface AppState {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  users: User[];
  discounts: Discount[];
  cart: CartItem[];
  currentUser: User | null;
  settings: AppSettings;
  selectedCustomer: Customer | null;
  salesTabs: SalesTab[];
  activeSalesTab: string;
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_CUSTOMERS'; payload: Customer[] }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'UPDATE_CART_ITEM'; payload: { index: number; item: CartItem } }
  | { type: 'REMOVE_FROM_CART'; payload: number }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'SET_SELECTED_CUSTOMER'; payload: Customer | null }
  | { type: 'SET_SALES'; payload: Sale[] }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'DELETE_SALE'; payload: string }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'INCREMENT_INVOICE_COUNTER'; payload: number }
  | { type: 'SET_DISCOUNTS'; payload: Discount[] }
  | { type: 'ADD_DISCOUNT'; payload: Discount }
  | { type: 'UPDATE_DISCOUNT'; payload: Discount }
  | { type: 'DELETE_DISCOUNT'; payload: string }
  | { type: 'ADD_SALES_TAB'; payload: SalesTab }
  | { type: 'UPDATE_SALES_TAB'; payload: { id: string; updates: Partial<SalesTab> } }
  | { type: 'REMOVE_SALES_TAB'; payload: string }
  | { type: 'SET_ACTIVE_SALES_TAB'; payload: string }
  | { type: 'SET_SALES_TABS'; payload: SalesTab[] };

const initialState: AppState = {
  products: [],
  customers: [],
  sales: [],
  users: [],
  discounts: [],
  cart: [],
  currentUser: null,
  selectedCustomer: null,
  settings: {
    storeName: 'Raees Oil Change',
    storeAddress: '',
    storePhone: '',
    storeEmail: '',
    taxRate: 0,
    currency: 'PKR',
    interfaceMode: 'touch',
    autoBackup: true,
    receiptPrinter: true,
    theme: 'light',
    invoicePrefix: 'INV',
    invoiceCounter: 1000,
  },
  salesTabs: [],
  activeSalesTab: '',
  loading: false,
  error: null,
};

type LoadOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; error: unknown };

async function loadRequest<T>(
  name: string,
  request: () => Promise<T>
): Promise<LoadOutcome<T>> {
  try {
    return { ok: true, data: await logDatabaseRequest(name, request) };
  } catch (error) {
    return { ok: false, error };
  }
}

function applyLoadResult<T>(
  service: string,
  outcome: LoadOutcome<T>,
  apply: (data: T) => void,
  failures: string[]
): void {
  if (outcome.ok) {
    apply(outcome.data);
  } else {
    failures.push(`${service}: ${formatLoadError(outcome.error)}`);
  }
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => p.id === action.payload.id ? action.payload : p),
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload),
      };
    case 'SET_CUSTOMERS':
      return { ...state, customers: action.payload };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };
    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c),
      };
    case 'DELETE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.filter(c => c.id !== action.payload),
      };
    case 'SET_CART':
      return { ...state, cart: action.payload };
    case 'ADD_TO_CART':
      return { ...state, cart: [...state.cart, action.payload] };
    case 'UPDATE_CART_ITEM':
      return {
        ...state,
        cart: state.cart.map((item, index) => 
          index === action.payload.index ? action.payload.item : item
        ),
      };
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter((_, index) => index !== action.payload),
      };
    case 'CLEAR_CART':
      return { ...state, cart: [], selectedCustomer: null };
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_SELECTED_CUSTOMER':
      return { ...state, selectedCustomer: action.payload };
    case 'SET_SALES':
      return { ...state, sales: action.payload };
    case 'ADD_SALE':
      return { 
        ...state, 
        sales: [...state.sales, action.payload],
      };
    case 'DELETE_SALE':
      return {
        ...state,
        sales: state.sales.filter(sale => sale.id !== action.payload),
      };
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'INCREMENT_INVOICE_COUNTER':
      return { 
        ...state, 
        settings: { 
          ...state.settings, 
          invoiceCounter: action.payload 
        } 
      };
    case 'SET_DISCOUNTS':
      return { ...state, discounts: action.payload };
    case 'ADD_DISCOUNT':
      return { ...state, discounts: [...state.discounts, action.payload] };
    case 'UPDATE_DISCOUNT':
      return {
        ...state,
        discounts: state.discounts.map(d => d.id === action.payload.id ? action.payload : d),
      };
    case 'DELETE_DISCOUNT':
      return {
        ...state,
        discounts: state.discounts.filter(d => d.id !== action.payload),
      };
    case 'ADD_SALES_TAB':
      return { 
        ...state, 
        salesTabs: [...state.salesTabs, action.payload],
        activeSalesTab: action.payload.id,
        cart: action.payload.cart || [],
        selectedCustomer: action.payload.selectedCustomer || null,
      };
    case 'UPDATE_SALES_TAB':
      return {
        ...state,
        salesTabs: state.salesTabs.map(tab => 
          tab.id === action.payload.id ? { ...tab, ...action.payload.updates } : tab
        ),
      };
    case 'REMOVE_SALES_TAB':
      const remainingTabs = state.salesTabs.filter(tab => tab.id !== action.payload);
      return {
        ...state,
        salesTabs: remainingTabs,
        activeSalesTab: remainingTabs.length > 0 ? remainingTabs[0].id : '',
      };
    case 'SET_ACTIVE_SALES_TAB':
      const activeTab = state.salesTabs.find(tab => tab.id === action.payload);
      return {
        ...state,
        activeSalesTab: action.payload,
        cart: activeTab?.cart || [],
        selectedCustomer: activeTab?.selectedCustomer || null,
      };
    case 'SET_SALES_TABS':
      return { ...state, salesTabs: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  reloadData: () => Promise<void>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user, profile } = useAuth();
  const [initialized, setInitialized] = useState(false);

  // Load data from Supabase when user is authenticated
  useEffect(() => {
    if (user && profile && !initialized) {
      loadData();
      setInitialized(true);
    } else if (!user) {
      // Reset state when user logs out
      dispatch({ type: 'SET_PRODUCTS', payload: [] });
      dispatch({ type: 'SET_CUSTOMERS', payload: [] });
      dispatch({ type: 'SET_SALES', payload: [] });
      dispatch({ type: 'SET_USERS', payload: [] });
      dispatch({ type: 'SET_DISCOUNTS', payload: [] });
      dispatch({ type: 'SET_SALES_TABS', payload: [] });
      dispatch({ type: 'CLEAR_CART' });
      dispatch({ type: 'SET_CURRENT_USER', payload: null });
      setInitialized(false);
    }
  }, [user, profile, initialized]);

  // Set current user from auth profile
  useEffect(() => {
    if (profile) {
      dispatch({ type: 'SET_CURRENT_USER', payload: profile });
    }
  }, [profile]);

  async function loadData() {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const failures: string[] = [];
      const [
        productsResult,
        customersResult,
        salesResult,
        discountsResult,
        settingsResult,
        usersResult,
        salesTabsResult,
      ] = await Promise.all([
        loadRequest('loadData.products', () =>
          productsService.getAll((error) => {
            failures.push(`product batches: ${formatLoadError(error)}`);
          })
        ),
        loadRequest('loadData.customers', () => customersService.getAll()),
        loadRequest('loadData.sales', () => salesService.getAll()),
        loadRequest('loadData.discounts', () => discountsService.getAll()),
        loadRequest('loadData.settings', () => settingsService.get()),
        loadRequest('loadData.users', () => usersService.getAll()),
        user
          ? loadRequest('loadData.salesTabs', () =>
              salesTabsService.getByUserId(user.id)
            )
          : Promise.resolve<LoadOutcome<SalesTab[]>>({
              ok: true,
              data: [],
            }),
      ]);

      applyLoadResult(
        'products',
        productsResult,
        (data) => dispatch({ type: 'SET_PRODUCTS', payload: data }),
        failures
      );
      applyLoadResult(
        'customers',
        customersResult,
        (data) => dispatch({ type: 'SET_CUSTOMERS', payload: data }),
        failures
      );
      applyLoadResult(
        'sales',
        salesResult,
        (data) => dispatch({ type: 'SET_SALES', payload: data }),
        failures
      );
      applyLoadResult(
        'discounts',
        discountsResult,
        (data) => dispatch({ type: 'SET_DISCOUNTS', payload: data }),
        failures
      );
      applyLoadResult(
        'settings',
        settingsResult,
        (data) => dispatch({ type: 'SET_SETTINGS', payload: data }),
        failures
      );
      applyLoadResult(
        'users',
        usersResult,
        (data) => dispatch({ type: 'SET_USERS', payload: data }),
        failures
      );
      applyLoadResult(
        'sales tabs',
        salesTabsResult,
        (data) => dispatch({ type: 'SET_SALES_TABS', payload: data }),
        failures
      );

      // Create initial sales tab if none exist
      if (salesTabsResult.ok && salesTabsResult.data.length === 0 && user) {
        const initialTab: Omit<SalesTab, 'id' | 'createdAt'> = {
          name: 'Sale 1',
          cart: [],
          selectedCustomer: null,
        };
        const initialTabResult = await loadRequest(
          'loadData.salesTabs.createInitial',
          () => salesTabsService.create(user.id, initialTab)
        );
        applyLoadResult(
          'initial sales tab',
          initialTabResult,
          (data) => dispatch({ type: 'ADD_SALES_TAB', payload: data }),
          failures
        );
      }

      dispatch({
        type: 'SET_ERROR',
        payload: failures.length > 0 ? failures.join('\n') : null,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  return (
    <AppContext.Provider value={{ state, dispatch, reloadData: loadData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

function formatLoadError(error: unknown): string {
  const info = getSafeErrorInfo(error);
  const code = info.code ? ` (code ${info.code})` : '';
  const details = info.details ? ` Details: ${info.details}` : '';
  const hint = info.hint ? ` Hint: ${info.hint}` : '';

  return `${info.message}${code}${details}${hint}`;
}

// Generate invoice number and automatically update counter in state
export function useInvoiceGeneration() {
  const { state, dispatch } = useApp();
  
  return async () => {
    const { invoiceNumber, newCounter } = generateNextInvoiceNumber(state.settings);
    
    // Update settings in Supabase
    try {
      await settingsService.update({ invoiceCounter: newCounter });
      dispatch({ type: 'INCREMENT_INVOICE_COUNTER', payload: newCounter });
    } catch (error) {
      console.error('Error updating invoice counter:', error);
    }
    
    return invoiceNumber;
  };
}

// Hook for invoice statistics
export function useInvoiceStats() {
  const { state } = useApp();
  
  return () => {
    const totalInvoices = state.sales.length;
    const currentCounter = state.settings.invoiceCounter;
    const prefix = state.settings.invoicePrefix;
    const nextInvoiceNumber = getNextInvoiceNumber(state.settings);
    
    return {
      totalInvoices,
      currentCounter,
      prefix,
      nextInvoiceNumber,
    };
  };
}
