import React, { useState } from "react";
import { Coffee, ShoppingBag, Plus, Minus, Info, Sparkles, Check } from "lucide-react";
import { TeaProduct, CartItem } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface OrderMenuProps {
  products: TeaProduct[];
  onAddToCart: (item: CartItem) => void;
  cartCount: number;
  onOpenCart: () => void;
}

export default function OrderMenu({ products, onAddToCart, cartCount, onOpenCart }: OrderMenuProps) {
  const [selectedProduct, setSelectedProduct] = useState<TeaProduct | null>(null);
  const [size, setSize] = useState<"M" | "L">("M");
  const [sweetness, setSweetness] = useState<string>("微糖 (30%)");
  const [ice, setIce] = useState<string>("少冰 (固定)");
  const [quantity, setQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>("");
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [lastAddedName, setLastAddedName] = useState<string>("");

  const sweetnessOptions = [
    "正常糖 (100%)",
    "少糖 (70%)",
    "半糖 (50%)",
    "微糖 (30%)",
    "二分糖 (20%)",
    "無糖 (0%)"
  ];

  const handleOpenCustomize = (product: TeaProduct) => {
    setSelectedProduct(product);
    setSize("M");
    setSweetness("微糖 (30%)");
    setIce("少冰 (固定)");
    setQuantity(1);
    setItemNotes("");
  };

  const handleAddToCartClick = () => {
    if (!selectedProduct) return;

    const unitPrice = size === "M" ? selectedProduct.priceM : (selectedProduct.priceL || selectedProduct.priceM);
    const cartItem: CartItem = {
      product: selectedProduct,
      size,
      sweetness,
      ice,
      quantity,
      notes: itemNotes,
      unitPrice
    };

    onAddToCart(cartItem);
    setLastAddedName(selectedProduct.name);
    setSelectedProduct(null);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  // Group products by category (or just render them nicely in a section)
  const availableProducts = products.filter(p => p.available);

  return (
    <div className="space-y-8" id="order-menu">
      {/* Category Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-8 md:p-12 text-white shadow-xl">
        <div className="absolute top-0 right-0 -transtale-y-12 translate-x-12 opacity-10 pointer-events-none">
          <Coffee size={320} />
        </div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-700/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium text-emerald-100 tracking-wider">
            <Sparkles size={14} /> 法國 Elle & Vire 鮮奶油特調系列
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            醇厚極致・奶蓋饗宴
          </h1>
          <p className="text-emerald-100 text-sm md:text-base leading-relaxed">
            嚴選法國百年品牌 Elle & Vire 鮮奶油精心打發而成，奶蓋濃郁絲滑、溫潤綿密。
            搭配極品原葉茶，入口鹹甜交織，餘韻無窮。
            <strong className="block mt-2 text-yellow-300">💡 僅提供少冰，以呈現最佳風味品質。</strong>
          </p>
        </div>
      </div>

      {/* Product Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-6 bg-emerald-600 rounded-full"></span>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">經典蓋特調系列</h2>
          </div>
          <p className="text-xs text-gray-500 font-mono">共 {availableProducts.length} 款極品茶飲</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableProducts.map((product) => {
            return (
              <motion.div
                key={product.id}
                id={`product-${product.id}`}
                whileHover={{ y: -4, scale: 1.01 }}
                className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Badge & Info Header */}
                <div className="p-6 flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700">
                      {product.badge || "頂級"}
                    </span>
                    <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">
                      ❄️ {product.iceConstraint}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-800">{product.name}</h3>
                    <p className="text-xs text-gray-400 font-mono tracking-tight">{product.category}</p>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                      {product.description}
                    </p>
                  </div>
                </div>

                {/* Pricing & Order Trigger */}
                <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-baseline gap-3">
                    <div className="text-xs font-mono text-gray-400">
                      M <span className="text-base font-bold text-emerald-700">${product.priceM}</span>
                    </div>
                    {product.priceL ? (
                      <div className="text-xs font-mono text-gray-400">
                        L <span className="text-base font-bold text-teal-700">${product.priceL}</span>
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-gray-300">
                        L <span className="text-xs">不提供</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenCustomize(product)}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 transition-all shadow-sm"
                  >
                    點餐加入
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-900 border border-emerald-800 text-white px-5 py-4 rounded-xl shadow-2xl max-w-md"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-800/80 flex items-center justify-center text-emerald-300">
              <Check size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">成功加入購物車！</p>
              <p className="text-xs text-emerald-200 truncate">{lastAddedName}</p>
            </div>
            <button
              onClick={onOpenCart}
              className="ml-2 cursor-pointer text-xs font-bold text-yellow-300 hover:text-yellow-400 underline shrink-0"
            >
              檢視購物車 ({cartCount})
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customize Drink Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-b from-emerald-50 to-white border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 tracking-wider bg-emerald-100/60 px-2.5 py-1 rounded">
                      {selectedProduct.category}
                    </span>
                    <h3 className="text-xl font-black text-gray-800 mt-2">{selectedProduct.name}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-gray-400 hover:text-gray-600 font-bold text-2xl"
                  >
                    &times;
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{selectedProduct.description}</p>
              </div>

              {/* Form Options (Scrollable) */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm text-gray-700">
                {/* Size options */}
                <div className="space-y-3">
                  <span className="font-bold text-gray-800 block">📐 選擇規格 (容量)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSize("M")}
                      className={`cursor-pointer p-3.5 rounded-2xl border flex flex-col justify-between text-left transition ${
                        size === "M"
                          ? "border-emerald-600 bg-emerald-50/40 text-emerald-900"
                          : "border-gray-250 hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      <span className="font-bold block text-sm">中杯 M</span>
                      <span className="text-xs text-emerald-700 mt-1 font-semibold">${selectedProduct.priceM} TWD</span>
                    </button>

                    <button
                      type="button"
                      disabled={!selectedProduct.priceL}
                      onClick={() => {
                        if (selectedProduct.priceL) setSize("L");
                      }}
                      className={`cursor-pointer p-3.5 rounded-2xl border flex flex-col justify-between text-left transition ${
                        !selectedProduct.priceL
                          ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                          : size === "L"
                          ? "border-emerald-600 bg-emerald-50/40 text-emerald-900"
                          : "border-gray-250 hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      <span className="font-bold block text-sm">大杯 L</span>
                      <span className="text-xs text-emerald-700 mt-1 font-semibold">
                        {selectedProduct.priceL ? `$${selectedProduct.priceL} TWD` : "本品不提供"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sweetness options */}
                <div className="space-y-3">
                  <span className="font-bold text-gray-800 block">🍬 甜度選擇</span>
                  <div className="grid grid-cols-3 gap-2">
                    {sweetnessOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSweetness(opt)}
                        className={`cursor-pointer py-2.5 px-2 text-center rounded-xl text-xs font-medium transition ${
                          sweetness === opt
                            ? "bg-emerald-700 text-white font-bold"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        {opt.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ice level */}
                <div className="space-y-3">
                  <span className="font-bold text-gray-800 block">❄️ 冰量規格</span>
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-2.5">
                    <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-800">
                      <strong>僅供少冰</strong>：為確保產出極佳霜體以及極佳鹹甜特調風味，本茶類冰量鎖定為 <span className="font-bold underline">少冰</span>。
                    </p>
                  </div>
                  <div className="py-2 px-4 rounded-xl text-xs font-bold text-center border bg-gray-50 border-gray-150 text-gray-600">
                    少冰 (固定品質)
                  </div>
                </div>

                {/* Notes Input */}
                <div className="space-y-3">
                  <label className="font-bold text-gray-800 block" htmlFor="drink-notes">✍️ 客製化備註</label>
                  <textarea
                    id="drink-notes"
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="例如：奶蓋多一點、另外包包、或是送給特別心意... (限150字)"
                    maxLength={150}
                    className="w-full border border-gray-200 rounded-2xl p-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none h-16"
                  />
                </div>

                {/* Quantity selector */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-5 mt-4">
                  <span className="font-bold text-gray-800">🔢 選擇數量</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity(q => q - 1)}
                      className="cursor-pointer w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-mono font-bold text-lg text-gray-800 w-8 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 1)}
                      className="cursor-pointer w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">總計金額</span>
                  <span className="text-2xl font-black text-emerald-800 font-mono">
                    ${(size === "M" ? selectedProduct.priceM : (selectedProduct.priceL || selectedProduct.priceM)) * quantity} <span className="text-xs font-sans font-normal text-gray-500">TWD</span>
                  </span>
                </div>
                <button
                  onClick={handleAddToCartClick}
                  className="cursor-pointer px-6 py-3.5 bg-emerald-700 text-white rounded-2xl font-extrabold text-sm hover:bg-emerald-800 shadow-sm active:scale-95 transition-all flex items-center gap-2"
                >
                  <ShoppingBag size={16} /> 放入購物車
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
