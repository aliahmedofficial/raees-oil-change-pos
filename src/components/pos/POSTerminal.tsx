import { useState } from 'react';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { CheckoutModal } from './CheckoutModal';
import { SalesTabManager } from './SalesTabManager';
import { Product, Sale } from '../../types';
import { useApp } from '../../context/SupabaseAppContext';
import { useAuth } from '../../context/AuthContext';
import { salesService } from '../../lib/services';
import { swalConfig } from '../../lib/sweetAlert';
import { formatCurrency } from '../../lib/currency';
import { ShoppingCart } from 'lucide-react';

export function POSTerminal() {
  const { state, dispatch } = useApp();
  const { user } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const cartItemCount = state.cart.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = state.cart.reduce((total, item) => total + item.subtotal, 0);

  const addToCart = (product: Product, weight?: number) => {
    // Only check stock if inventory tracking is enabled
    if (product.trackInventory && product.stock <= 0) return;

    const existingItemIndex = state.cart.findIndex(item => 
      item.product.id === product.id && 
      (product.isWeightBased ? false : true) // For weight-based products, always add new item
    );
    
    if (existingItemIndex >= 0 && !product.isWeightBased) {
      const existingItem = state.cart[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;
      
      // Only check stock limits if inventory tracking is enabled
      if (!product.trackInventory || newQuantity <= product.stock) {
        const grossAmount = product.price * newQuantity;
        const discount = existingItem.discountValue !== undefined
          ? existingItem.discountType === 'percentage'
            ? grossAmount * Math.min(existingItem.discountValue, 100) / 100
            : Math.min(existingItem.discountValue, grossAmount)
          : Math.min(existingItem.discount || 0, grossAmount);
        const updatedItem = {
          ...existingItem,
          quantity: newQuantity,
          discount,
          subtotal: grossAmount - discount
        };
        dispatch({ type: 'UPDATE_CART_ITEM', payload: { index: existingItemIndex, item: updatedItem } });
      }
    } else {
      // For weight-based products or new items
      const quantity = product.isWeightBased ? 1 : 1;
      const itemWeight = weight || undefined;
      const price = product.isWeightBased ? (product.pricePerUnit || 0) * (weight || 1) : product.price;
      
      const newItem = {
        product,
        quantity,
        weight: itemWeight,
        discount: 0,
        discountType: 'percentage' as const,
        subtotal: price
      };
      dispatch({ type: 'ADD_TO_CART', payload: newItem });
    }

    // Update current sales tab
    if (state.activeSalesTab) {
      dispatch({
        type: 'UPDATE_SALES_TAB',
        payload: {
          id: state.activeSalesTab,
          updates: { cart: state.cart }
        }
      });
    }
  };

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  const handleCheckoutComplete = (sale: Sale) => {
    setLastSale(sale);
    setShowCheckout(false);
    
    // Clear current tab after successful checkout
    if (state.activeSalesTab) {
      dispatch({
        type: 'UPDATE_SALES_TAB',
        payload: {
          id: state.activeSalesTab,
          updates: { cart: [], selectedCustomer: null }
        }
      });
    }
  };

  const saveDraft = async () => {
    if (state.cart.length === 0) return;

    try {
      const subtotal = state.cart.reduce((sum, item) => {
        const price = item.product.isWeightBased 
          ? (item.product.pricePerUnit || 0) * (item.weight || 1)
          : item.product.price;
        return sum + (price * item.quantity);
      }, 0);
      const totalDiscount = Math.min(subtotal, state.cart.reduce((sum, item) => {
        const price = item.product.isWeightBased
          ? (item.product.pricePerUnit || 0) * (item.weight || 1)
          : item.product.price;
        return sum + Math.max(0, Math.min(item.discount || 0, price * item.quantity));
      }, 0));
      const taxAmount = 0;
      const total = subtotal - totalDiscount;

      const draftSale: Omit<Sale, 'id'> = {
        invoiceNumber: `DRAFT-${Date.now().toString().slice(-6)}`,
        customerId: state.selectedCustomer?.id,
        customerName: state.selectedCustomer?.name,
        items: state.cart,
        subtotal,
        discountAmount: totalDiscount,
        taxAmount,
        total,
        paymentMethod: 'cash',
        status: 'completed',
        cashier: user?.user_metadata?.full_name || user?.email || 'Unknown',
        timestamp: new Date(),
        receiptNumber: `DRAFT-${Date.now().toString().slice(-6)}`,
        notes: 'DRAFT_SALE - payment pending',
      };

      // Save to Supabase and update local state
      const savedDraft = await salesService.create(draftSale);
      dispatch({ type: 'ADD_SALE', payload: savedDraft });
      dispatch({ type: 'CLEAR_CART' });
      
      // Clear current tab
      if (state.activeSalesTab) {
        dispatch({
          type: 'UPDATE_SALES_TAB',
          payload: {
            id: state.activeSalesTab,
            updates: { cart: [], selectedCustomer: null }
          }
        });
      }

      swalConfig.success('Draft sale saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      swalConfig.error('Failed to save draft. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-gray-50 lg:min-h-[calc(100dvh-5rem)] xl:h-full xl:min-h-0 xl:flex-row xl:overflow-hidden">
      <div className="xl:hidden">
        <SalesTabManager orientation="horizontal" />
      </div>
      <div className="hidden xl:flex">
        <SalesTabManager />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row xl:overflow-hidden">
        <ProductGrid onAddToCart={addToCart} />
        <div className="hidden xl:flex">
          <Cart onCheckout={handleCheckout} onSaveDraft={saveDraft} />
        </div>
        {cartItemCount > 0 && (
          <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white p-3 shadow-lg xl:hidden">
            <button
              onClick={() => setShowMobileCart(true)}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-blue-600 px-4 py-3 text-left text-white"
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold">
                <ShoppingCart className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">Cart - {cartItemCount} items</span>
              </span>
              <span className="flex-shrink-0 font-bold">{formatCurrency(cartTotal)}</span>
            </button>
          </div>
        )}

        {showMobileCart && (
          <div className="fixed inset-0 z-[55] xl:hidden">
            <button
              onClick={() => setShowMobileCart(false)}
              className="absolute inset-0 h-full w-full bg-black/50"
              aria-label="Close cart"
            />
            <div className="absolute inset-y-0 right-0 h-[100dvh] w-[min(100%,28rem)] max-w-full bg-white shadow-2xl">
              <Cart
                onCheckout={() => {
                  setShowMobileCart(false);
                  handleCheckout();
                }}
                onSaveDraft={saveDraft}
                onClose={() => setShowMobileCart(false)}
              />
            </div>
          </div>
        )}
        
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          onComplete={handleCheckoutComplete}
        />
      </div>
    </div>
  );
}