import { useState } from 'react';
import { Trash2, Plus, Minus, User, Percent, FileText, ShoppingCart } from 'lucide-react';
import { CartItem, Customer } from '../../types';
import { useApp } from '../../context/SupabaseAppContext';
import { formatCurrency } from '../../lib/currency';

interface CartProps {
  onCheckout: () => void;
  onSaveDraft: () => void;
  onClose?: () => void;
}

export function Cart({ onCheckout, onSaveDraft, onClose }: CartProps) {
  const { state, dispatch } = useApp();
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const isTouchMode = state.settings.interfaceMode === 'touch';

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: index });
    } else {
      const item = state.cart[index];
      const price = item.product.isWeightBased 
        ? (item.product.pricePerUnit || 0) * (item.weight || 1)
        : item.product.price;
      const grossAmount = price * newQuantity;
      const discount = item.discountValue !== undefined
        ? item.discountType === 'percentage'
          ? grossAmount * Math.min(item.discountValue, 100) / 100
          : Math.min(item.discountValue, grossAmount)
        : Math.min(item.discount || 0, grossAmount);
      const updatedItem = {
        ...item,
        quantity: newQuantity,
        discount,
        subtotal: grossAmount - discount
      };
      dispatch({ type: 'UPDATE_CART_ITEM', payload: { index, item: updatedItem } });
    }
  };

  const removeFromCart = (index: number) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: index });
  };

  const applyDiscount = (index: number, discount: number, discountType: 'percentage' | 'fixed') => {
    const item = state.cart[index];
    const price = item.product.isWeightBased 
      ? (item.product.pricePerUnit || 0) * (item.weight || 1)
      : item.product.price;
    const grossAmount = price * item.quantity;
    const discountValue = discountType === 'percentage'
      ? Math.min(discount, 100)
      : Math.min(discount, grossAmount);
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
      discountAmount = (grossAmount * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }

    const updatedItem = {
      ...item,
      discount: discountAmount,
      discountValue,
      discountType,
      subtotal: grossAmount - discountAmount
    };
    
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { index, item: updatedItem } });
  };

  const selectCustomer = (customer: Customer) => {
    dispatch({ type: 'SET_SELECTED_CUSTOMER', payload: customer });
    setShowCustomerSearch(false);
    setCustomerSearch('');
  };

  const filteredCustomers = state.customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone.includes(customerSearch)
  );

  const subtotal = state.cart.reduce((sum, item) => {
    const price = item.product.isWeightBased 
      ? (item.product.pricePerUnit || 0) * (item.weight || 1)
      : item.product.price;
    return sum + (price * item.quantity);
  }, 0);
  const totalDiscount = Math.min(
    subtotal,
    state.cart.reduce((sum, item) => sum + Math.max(0, item.discount || 0), 0)
  );
  const total = subtotal - totalDiscount;

  return (
    <div className={`flex h-full min-h-0 w-full max-w-full flex-col bg-white xl:border-l xl:border-gray-100 ${
      isTouchMode ? 'xl:w-96' : 'xl:w-80'
    }`}>
      {/* Cart Header */}
      <div className="p-4 lg:p-6 border-b border-gray-100 flex-shrink-0">
        <div className="mb-4 flex items-center justify-between gap-2 sm:mb-6">
          <h2 className={`font-bold text-gray-900 ${isTouchMode ? 'text-xl' : 'text-lg'}`}>
            Shopping Cart
          </h2>
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-gray-400" />
            <span className="badge badge-info">
              {state.cart.length} items
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close cart"
              className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 xl:hidden"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>

        {/* Customer Selection */}
        <div className="relative">
          {state.selectedCustomer ? (
            <div className="card p-4 border-green-200 bg-green-50">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className={`font-medium text-green-800 truncate ${isTouchMode ? 'text-base' : 'text-sm'}`}>
                    {state.selectedCustomer.name}
                  </p>
                  <p className={`text-green-600 truncate ${isTouchMode ? 'text-sm' : 'text-xs'}`}>
                    {state.selectedCustomer.email}
                  </p>
                </div>
                <button
                  onClick={() => dispatch({ type: 'SET_SELECTED_CUSTOMER', payload: null })}
                  className="text-green-600 hover:text-green-800 p-1 rounded-lg hover:bg-green-100 transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomerSearch(true)}
              className={`btn btn-secondary w-full ${
                isTouchMode ? 'btn-lg touch-friendly' : 'btn-md'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Select Customer</span>
            </button>
          )}

          {/* Customer Search Dropdown */}
          {showCustomerSearch && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-64 overflow-hidden animate-slide-up">
              <div className="p-4">
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="input input-sm"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className="w-full text-left p-4 hover:bg-gray-50 border-t border-gray-100 transition-colors"
                  >
                    <p className="font-medium text-sm truncate">{customer.name}</p>
                    <p className="text-xs text-gray-600 truncate">{customer.email}</p>
                  </button>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No customers found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#d1d5db #f3f4f6'
      }}>
        {state.cart.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 p-6 rounded-3xl inline-block mb-4">
              <ShoppingCart className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Cart is empty</p>
            <p className="text-gray-400 text-sm mt-1">Add products to get started</p>
          </div>
        ) : (
          state.cart.map((item, index) => (
            <CartItemCard
              key={`${item.product.id}-${index}`}
              item={item}
              index={index}
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
              onApplyDiscount={applyDiscount}
              isTouchMode={isTouchMode}
            />
          ))
        )}
      </div>

      {/* Cart Summary */}
      {state.cart.length > 0 && (
        <div className="border-t border-gray-100 p-4 lg:p-6 space-y-6 bg-gray-50 flex-shrink-0">
          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span className="font-medium">-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-200">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onCheckout}
              disabled={state.cart.length === 0}
              className={`btn btn-success w-full ${
                isTouchMode ? 'btn-lg touch-friendly' : 'btn-lg'
              }`}
            >
              Checkout
            </button>
            
            <button
              onClick={onSaveDraft}
              disabled={state.cart.length === 0}
              className={`btn btn-secondary w-full ${
                isTouchMode ? 'btn-md touch-friendly' : 'btn-md'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Save Draft</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CartItemCardProps {
  item: CartItem;
  index: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onApplyDiscount: (index: number, discount: number, type: 'percentage' | 'fixed') => void;
  isTouchMode: boolean;
}

function CartItemCard({ item, index, onUpdateQuantity, onRemove, onApplyDiscount, isTouchMode }: CartItemCardProps) {
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');

  const handleDiscountSubmit = () => {
    const value = parseFloat(discountValue);
    const price = item.product.isWeightBased
      ? (item.product.pricePerUnit || 0) * (item.weight || 1)
      : item.product.price;
    const grossAmount = price * item.quantity;
    const maximumDiscount = discountType === 'percentage' ? 100 : grossAmount;
    if (Number.isFinite(value) && value > 0 && value <= maximumDiscount) {
      onApplyDiscount(index, value, discountType);
      setShowDiscountInput(false);
      setDiscountValue('');
    }
  };

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium text-gray-900 truncate ${isTouchMode ? 'text-base' : 'text-sm'}`}>
            {item.product.name}
          </h4>
          <p className={`text-gray-600 ${isTouchMode ? 'text-sm' : 'text-xs'}`}>
            {item.product.isWeightBased ? (
              <>
                {formatCurrency(item.product.pricePerUnit || 0)} per {item.product.unit}
                {item.weight && <span className="ml-2">({item.weight} {item.product.unit})</span>}
              </>
            ) : (
              <>{formatCurrency(item.product.price)} each</>
            )}
          </p>
          {item.discount > 0 && (
            <p className="text-green-600 text-xs font-medium">
              Discount: {item.discountType === 'percentage' && item.discountValue !== undefined
                ? `${item.discountValue}% (${formatCurrency(item.discount)})`
                : formatCurrency(item.discount)}
            </p>
          )}
        </div>
        <button
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onUpdateQuantity(index, item.quantity - 1)}
            className={`btn btn-secondary ${
              isTouchMode ? 'touch-friendly' : 'w-8 h-8'
            } flex items-center justify-center`}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className={`font-medium min-w-[2rem] text-center ${
            isTouchMode ? 'text-lg' : 'text-base'
          }`}>
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(index, item.quantity + 1)}
            className={`btn btn-secondary ${
              isTouchMode ? 'touch-friendly' : 'w-8 h-8'
            } flex items-center justify-center`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowDiscountInput(!showDiscountInput)}
            className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Percent className="h-4 w-4" />
          </button>
          <span className={`font-semibold ${isTouchMode ? 'text-base' : 'text-sm'}`}>
            {formatCurrency(item.subtotal)}
          </span>
        </div>
      </div>

      {showDiscountInput && (
        <div className="flex items-center space-x-2 pt-3 border-t border-gray-200 animate-slide-up">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
            className="select text-xs w-20"
          >
            <option value="percentage">%</option>
            <option value="fixed">Rs.</option>
          </select>
          <input
            type="number"
            placeholder="Discount"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            min="0"
            max={discountType === 'percentage' ? 100 : (
              (item.product.isWeightBased
                ? (item.product.pricePerUnit || 0) * (item.weight || 1)
                : item.product.price) * item.quantity
            )}
            step="0.01"
            className="input input-sm flex-1"
          />
          <button
            onClick={handleDiscountSubmit}
            className="btn btn-primary btn-sm"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}