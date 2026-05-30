import React, { useState, useEffect } from "react";
// Wait! Sparkles or other icons are from "lucide-react" NOT "firebase/firestore" - Let's import correctly from lucide-react!
import { Coffee as CoffeeIcon, ShoppingBag as CartIcon, History as HistoryIcon, Sliders as AdminIcon, X as CloseIcon, Plus as PlusIcon, Minus as MinusIcon, ArrowRight as ArrowIcon, CheckCircle2 as CheckIcon, Loader as SpinnerIcon, Sparkles as SparklesIcon } from "lucide-react";
import { collection, doc, getDocs, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { TeaProduct, CartItem, TeaOrder } from "./types";
import { DEFAULT_PRODUCTS } from "./defaultData";
import OrderMenu from "./components/OrderMenu";
import MyOrders from "./components/MyOrders";
import AdminDashboard from "./components/AdminDashboard";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"menu" | "orders" | "admin">("menu");
  const [products, setProducts] = useState<TeaProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);

  // Shopping Cart States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  
  // Checkout Details
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutSuccessOrder, setCheckoutSuccessOrder] = useState<TeaOrder | null>(null);

  // Synchronize/Fetch products collection on mount
  const fetchProducts = () => {
    setProductsLoading(true);
    const prodRef = collection(db, "products");
    
    // Set up real-time listener so changes from backend propagate immediately
    const unsubscribe = onSnapshot(prodRef, async (snapshot) => {
      let fetchedProds: TeaProduct[] = [];
      snapshot.forEach(docSnap => {
        fetchedProds.push({ id: docSnap.id, ...docSnap.data() } as TeaProduct);
      });

      // If database catalog collection is completely empty, trigger initialization helper
      if (fetchedProds.length === 0) {
        console.log("No catalog found in Firebase, initializing default catalog...");
        try {
          for (const prod of DEFAULT_PRODUCTS) {
            await setDoc(doc(db, "products", prod.id), {
              ...prod,
              createdAt: serverTimestamp()
            });
          }
          // The onSnapshot will re-trigger, so no extra local state set needed here
          return;
        } catch (err) {
          console.error("Initialization of default catalog products failed:", err);
        }
      }

      setProducts(fetchedProds);
      setProductsLoading(false);
    }, (err) => {
      console.error("Failed to sync products from Firestore:", err);
      // Fallback to static defaults
      setProducts(DEFAULT_PRODUCTS);
      setProductsLoading(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsub = fetchProducts();
    
    // Recover user credentials for fast ordering if checkout has happened in this browser
    const storedName = localStorage.getItem("tea_customer_name");
    const storedPhone = localStorage.getItem("tea_customer_phone");
    if (storedName) setCustomerName(storedName);
    if (storedPhone) setCustomerPhone(storedPhone);

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Cart operations
  const handleAddToCart = (item: CartItem) => {
    setCart((prevCart) => {
      // Find matching item with same product, size, sweetness, and ice
      const matchIdx = prevCart.findIndex(
        (ci) =>
          ci.product.id === item.product.id &&
          ci.size === item.size &&
          ci.sweetness === item.sweetness &&
          ci.ice === item.ice
      );

      if (matchIdx > -1) {
        const updated = [...prevCart];
        updated[matchIdx].quantity += item.quantity;
        return updated;
      }
      return [...prevCart, item];
    });
  };

  const handleUpdateItemQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[idx].quantity += delta;
      if (updated[idx].quantity <= 0) {
        updated.splice(idx, 1);
      }
      return updated;
    });
  };

  const handleRemoveItem = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Place Order Checkout Submitter (saves to Firestore doc under '/orders')
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      alert("請完整輸入姓名與電話號碼！");
      return;
    }

    setIsSubmitting(true);
    const orderRef = doc(collection(db, "orders"));
    const orderPayload: TeaOrder = {
      id: orderRef.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items: cart,
      totalPrice: totalCartPrice,
      status: "pending",
      notes: orderNotes.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(orderRef, orderPayload);
      
      // Store checkout metadata locally for future convenience
      localStorage.setItem("tea_customer_name", customerName.trim());
      localStorage.setItem("tea_customer_phone", customerPhone.trim());

      // Setup success overlay object
      setCheckoutSuccessOrder(orderPayload);
      setCart([]);
      setOrderNotes("");
      setIsCartOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${orderRef.id}`);
      alert("下單失敗，請確認網路連線或資料庫權限設定！");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col font-sans text-gray-800 antialiased selection:bg-emerald-100">
      
      {/* GLOBAL HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <button 
            type="button"
            onClick={() => setActiveTab("menu")}
            className="cursor-pointer flex items-center gap-3 text-left focus:outline-none"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-800 flex items-center justify-center text-white shadow-md shadow-emerald-800/20">
              <CoffeeIcon size={22} className="text-yellow-100" />
            </div>
            <div>
              <span className="text-lg font-black bg-gradient-to-r from-emerald-800 to-teal-900 bg-clip-text text-transparent">
                鮮鮮茶屋
              </span>
              <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase font-mono mt-0.5">
                Elle & Vire Fresh Cream Blends
              </p>
            </div>
          </button>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-1 bg-gray-100/70 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab("menu")}
              className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "menu"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🍵 點歌飲品
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "orders"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <HistoryIcon size={14} className="text-amber-600" /> 訂單查詢
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "admin"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <AdminIcon size={14} /> 後台管理
            </button>
          </nav>

          {/* Cart Trigger Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="cursor-pointer relative w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:border-emerald-600 hover:text-emerald-800 transition shadow-sm bg-white"
          >
            <CartIcon size={18} />
            {totalCartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white font-mono font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* MAIN SCREEN WRAPPER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
        {productsLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <SpinnerIcon className="animate-spin mb-4" size={32} />
            <p className="text-sm font-medium">嚴選原夜優質茶飲品項載入中...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "menu" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <OrderMenu
                  products={products}
                  onAddToCart={handleAddToCart}
                  cartCount={totalCartCount}
                  onOpenCart={() => setIsCartOpen(true)}
                />
              </motion.div>
            )}

            {activeTab === "orders" && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <MyOrders />
              </motion.div>
            )}

            {activeTab === "admin" && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <AdminDashboard products={products} onRefreshProducts={fetchProducts} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© 2026 鮮鮮茶屋 頂級厚蓋特調版。 採用法國 Elle & Vire 鮮奶油風味絕倫。</p>
          <p>技術支援: Firebase Firestore NoSQL Real-time Cloud API Database.</p>
        </div>
      </footer>

      {/* SHOPPING CART DRAWER (SLIDEOUT RIGHT) */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-screen shadow-2xl flex flex-col justify-between border-l border-gray-100"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-white">
                <div className="flex items-center gap-2">
                  <CartIcon size={20} className="text-emerald-700" />
                  <h3 className="font-extrabold text-lg text-gray-800 leading-tight">購物車明細</h3>
                  <span className="text-xs font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {totalCartCount} 杯
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-150 text-gray-400 hover:text-gray-600 transition"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              {/* Drawer Items List (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-300">
                      <CartIcon size={28} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-500">購物車空空如也</p>
                      <p className="text-xs text-gray-400 mt-1">快去主頁挑選經典法國奶油霜蓋特調系列吧！</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 divide-y divide-gray-100">
                    {cart.map((item, idx) => (
                      <div key={idx} className={`pt-4 ${idx === 0 ? "pt-0 border-t-0" : ""}`}>
                        <div className="flex justify-between items-start text-sm">
                          <div className="space-y-1">
                            <span className="font-extrabold text-gray-800 block">{item.product.name}</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded">
                                杯型 {item.size}
                              </span>
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">
                                {item.sweetness}
                              </span>
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">
                                {item.ice}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-xs text-blue-700 italic font-medium">客製: {item.notes}</p>
                            )}
                          </div>

                          <div className="text-right flex flex-col items-end gap-2 shrink-0">
                            <span className="font-mono font-bold text-gray-800">${item.unitPrice * item.quantity}</span>
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-xs text-gray-400 hover:text-rose-600 transition underline cursor-pointer"
                            >
                              刪除
                            </button>
                          </div>
                        </div>

                        {/* Qty controller inside cart item */}
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-xl">
                          <span>單價: ${item.unitPrice} TWD</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateItemQty(idx, -1)}
                              className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-100"
                            >
                              <MinusIcon size={12} />
                            </button>
                            <span className="font-mono font-bold w-6 text-center text-gray-800">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateItemQty(idx, 1)}
                              className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-100"
                            >
                              <PlusIcon size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer & Checkout Form */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 space-y-4">
                  {/* Totals description */}
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-gray-600">總計金額</span>
                    <span className="text-2xl font-black text-emerald-800 tracking-tight font-mono">
                      ${totalCartPrice} <span className="text-xs font-sans font-normal text-gray-400">TWD</span>
                    </span>
                  </div>

                  {/* Customer Information inputs */}
                  <form onSubmit={handleCheckoutSubmit} className="space-y-3 text-xs text-gray-700">
                    <div className="space-y-1">
                      <label className="font-bold flex items-center gap-1" htmlFor="checkout-name">姓名 *</label>
                      <input
                        id="checkout-name"
                        type="text"
                        required
                        placeholder="請輸入訂單聯絡人姓名"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full border border-gray-250 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold flex items-center gap-1" htmlFor="checkout-phone">聯絡電話 (查詢進度用) *</label>
                      <input
                        id="checkout-phone"
                        type="tel"
                        required
                        placeholder="請輸入手機號碼（如：0912345678）"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full border border-gray-250 rounded-xl px-3 py-2 bg-white outline-none font-mono focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold block" htmlFor="checkout-notes">整單備註</label>
                      <input
                        id="checkout-notes"
                        type="text"
                        placeholder="選填，此筆訂單所有的特殊提醒註記（如：10分鐘後取杯、放門口）"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        className="w-full border border-gray-250 rounded-xl px-3 py-2 bg-white outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="cursor-pointer w-full bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-bold py-3 px-4 rounded-xl shadow-sm text-sm tracking-wide transition-all mt-3 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <SpinnerIcon size={16} className="animate-spin" /> 送出交易中...
                        </>
                      ) : (
                        <>
                          確認下單，建立茶飲製作 <ArrowIcon size={14} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHECKOUT SUCCESS MODAL */}
      <AnimatePresence>
        {checkoutSuccessOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 text-center space-y-6 flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center animate-bounce shadow-inner">
                <CheckIcon size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">🎉 訂單成功送出！</h3>
                <p className="text-xs text-gray-500 leading-relaxed px-2">
                  茶飲廚房已收到您的訂單安排。您可以隨時進入「訂單查詢」並輸入電話追蹤茶飲製作最新動態噢！
                </p>
              </div>

              {/* Order specifications summary */}
              <div className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-2.5 text-xs text-left">
                <div className="flex justify-between">
                  <span className="text-gray-400">訂單流水單號：</span>
                  <strong className="text-gray-800 font-mono text-[13px] uppercase">
                    #{checkoutSuccessOrder.id.slice(0, 8)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">顧客：</span>
                  <strong className="text-gray-850 font-medium">
                    {checkoutSuccessOrder.customerName} ({checkoutSuccessOrder.customerPhone})
                  </strong>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 text-sm">
                  <span className="text-emerald-800 font-semibold flex items-center gap-1">
                    <SparklesIcon size={12} /> 應付總額：
                  </span>
                  <strong className="text-emerald-800 font-black font-mono text-base">
                    ${checkoutSuccessOrder.totalPrice} TWD
                  </strong>
                </div>
              </div>

              <div className="flex gap-2.5 w-full">
                <button
                  onClick={() => {
                    setCheckoutSuccessOrder(null);
                    setActiveTab("menu");
                  }}
                  className="cursor-pointer flex-1 py-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                  回茶飲菜單
                </button>
                <button
                  onClick={() => {
                    setCheckoutSuccessOrder(null);
                    setActiveTab("orders");
                  }}
                  className="cursor-pointer flex-1 py-3 text-xs bg-emerald-800 hover:bg-emerald-950 text-white font-bold rounded-xl shadow-sm transition"
                >
                  去追蹤與查詢
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
