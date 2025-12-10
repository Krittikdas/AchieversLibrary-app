import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Save, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Snack } from '../types';
import { generateReceiptSummary } from '../services/geminiService';

interface SnackShopProps {
  onSale: (amount: number, description: string, paymentMode: 'CASH' | 'UPI') => void;
}

export const SnackShop: React.FC<SnackShopProps> = ({ onSale }) => {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');


  React.useEffect(() => {
    fetchSnacks();
  }, []);

  const fetchSnacks = async () => {
    const { data, error } = await supabase
      .from('snacks')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) setSnacks(data);
  };

  const addToCart = (id: string) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 1) newCart[id]--;
      else delete newCart[id];
      return newCart;
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const item = snacks.find(s => s.id === id);
    return item ? { ...item, qty } : null;
  }).filter(Boolean) as { id: string; name: string; price: number; qty: number }[];

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCheckout = async () => {
    if (total === 0) return;
    setIsProcessing(true);

    const itemNames = cartItems.map(i => `${i.qty}x ${i.name}`);
    const description = `Snacks: ${itemNames.join(', ')}`;

    // Simulate AI Receipt/Processing
    // Even if we don't generate a QR code, we might still want to log/generate a summary internally or via AI
    await generateReceiptSummary(itemNames, total);

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 600));

    await new Promise(resolve => setTimeout(resolve, 600));

    onSale(total, description, paymentMode);
    setCart({});
    setIsProcessing(false);

    // Show success message
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
      {/* Success Toast */}
      {showSuccess && (
        <div className="absolute top-0 right-0 left-0 z-10 flex justify-center pointer-events-none">
          <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 animate-fade-in-up">
            <CheckCircle size={20} />
            <span className="font-medium">Sale Recorded Successfully</span>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="lg:col-span-2 order-2 lg:order-1">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 hidden lg:block">Snack Counter</h2>

          {/* Payment Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setPaymentMode('CASH')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${paymentMode === 'CASH'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-200'
                }`}
            >
              Cash
            </button>
            <button
              onClick={() => setPaymentMode('UPI')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${paymentMode === 'UPI'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-200'
                }`}
            >
              UPI
            </button>
          </div>
        </div>



        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {snacks.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-3">
                  <span className="font-bold text-lg">{item.name[0]}</span>
                </div>
                <h3 className="font-semibold text-slate-700 text-sm sm:text-base">{item.name}</h3>
                <p className="text-slate-500 text-sm">₹{item.price}</p>
              </div>
              <button
                onClick={() => addToCart(item.id)}
                className="mt-4 w-full py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg font-medium text-sm transition-colors flex items-center justify-center"
              >
                <Plus size={16} className="mr-1" /> Add
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="lg:col-span-1 order-1 lg:order-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-auto lg:h-[calc(100vh-140px)] lg:sticky lg:top-6">
          <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
            <h3 className="font-bold text-slate-700 flex items-center">
              <ShoppingCart size={18} className="mr-2" /> Current Order
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] lg:min-h-0">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8 lg:py-0">
                <ShoppingCart size={48} className="mb-2 opacity-20" />
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center group">
                  <div>
                    <p className="font-medium text-slate-700 text-sm">{item.name}</p>
                    <p className="text-slate-500 text-xs">₹{item.price} x {item.qty}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded">
                      {item.qty === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                    <button onClick={() => addToCart(item.id)} className="p-1 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-medium">Total</span>
              <span className="text-2xl font-bold text-slate-800">₹{total}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={total === 0 || isProcessing}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <Save size={18} className="mr-2" />
                  <span>Record Sale</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div >
  );
};