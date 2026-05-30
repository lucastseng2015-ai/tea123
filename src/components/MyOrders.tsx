import React, { useState, useEffect } from "react";
import { Search, Hash, Clock, CheckCircle2, RotateCcw, MessageSquare, Phone } from "lucide-react";
import { collection, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { TeaOrder } from "../types";
import { motion, AnimatePresence } from "motion/react";

export default function MyOrders() {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [searched, setSearched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [orders, setOrders] = useState<TeaOrder[]>([]);

  // Load last typed phone number from localStorage for convenient retrieval
  useEffect(() => {
    const savedPhone = localStorage.getItem("tea_customer_phone");
    if (savedPhone) {
      setPhoneNumber(savedPhone);
    }
  }, []);

  // Set real-time listener if searched
  useEffect(() => {
    if (!searched || !phoneNumber) return;

    setLoading(true);
    // Secure query for matching phone number
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("customerPhone", "==", phoneNumber.trim()));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders: TeaOrder[] = [];
      snapshot.forEach((doc) => {
        fetchedOrders.push({ id: doc.id, ...doc.data() } as TeaOrder);
      });

      // Sort by createdAt descending
      fetchedOrders.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setOrders(fetchedOrders);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [searched, phoneNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    localStorage.setItem("tea_customer_phone", phoneNumber.trim());
    setSearched(true);
  };

  const statusMap = {
    pending: { label: "排單中", color: "text-gray-600 bg-gray-100 border-gray-200" },
    preparing: { label: "製作中", color: "text-blue-700 bg-blue-50 border-blue-200" },
    completed: { label: "已完成 (請取餐)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    cancelled: { label: "已取消", color: "text-rose-700 bg-rose-50 border-rose-200" }
  };

  return (
    <div className="space-y-6" id="my-orders">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
        <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">查詢訂單進度</h2>
      </div>

      {/* Query Search Panel */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 max-w-xl">
        <form onSubmit={handleSearch} className="space-y-4">
          <label className="text-sm font-semibold text-gray-700 block" htmlFor="phone-query">
            輸入訂單聯絡電話以查詢最新進度
          </label>
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <Phone size={18} className="absolute left-4 top-3.5 text-gray-400" />
              <input
                id="phone-query"
                type="tel"
                required
                placeholder="例如：0912345678"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setSearched(false);
                }}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-250 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm font-mono tracking-wider transition-all"
              />
            </div>
            <button
              type="submit"
              className="cursor-pointer bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white px-6 rounded-2xl font-bold text-sm tracking-wide shadow-sm flex items-center gap-2 transition-all"
            >
              <Search size={16} /> 查詢
            </button>
          </div>
        </form>
      </div>

      {/* Results Container */}
      <div className="space-y-4">
        {loading && (
          <div className="py-12 text-center text-gray-500 text-sm">
            <div className="w-8 h-8 rounded-full border-4 border-amber-300 border-t-amber-600 animate-spin mx-auto mb-4" />
            正在加載最新訂單資料...
          </div>
        )}

        {!loading && searched && orders.length === 0 && (
          <div className="bg-gray-50/50 rounded-2xl py-12 text-center border border-dashed border-gray-200">
            <p className="text-gray-500 text-sm font-medium">查無手機號碼為「{phoneNumber}」的有記錄訂單。</p>
            <p className="text-xs text-gray-400 mt-1">請確認電話號碼正確，或嘗試前往前台點選茶飲！</p>
          </div>
        )}

        {!loading && !searched && (
          <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-6 text-gray-600 text-sm max-w-xl">
            <p className="font-semibold text-amber-900">🔔 溫馨提示</p>
            <p className="mt-1.5 leading-relaxed text-amber-800 text-xs">
              點單成功後，為方便您追蹤進度，我們會對應您的電話號碼，您可以隨時用手機查詢製作狀態（排單中 ➔ 製作中 ➔ 已完成）。
              免去現場排隊，茶飲好了即可前往櫃檯取餐！
            </p>
          </div>
        )}

        {!loading && searched && orders.length > 0 && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
              查詢結果：找到 {orders.length} 筆訂單
            </h3>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {orders.map((order, idx) => {
                  const statusInfo = statusMap[order.status] || { label: order.status, color: "text-gray-600 bg-gray-100" };
                  const dateStr = order.createdAt?.seconds 
                    ? new Date(order.createdAt.seconds * 1000).toLocaleString("zh-TW", { hour12: false })
                    : "剛才";

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-4 hover:shadow-md transition-all duration-200"
                    >
                      {/* Top bar info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Hash size={14} className="text-emerald-700" />
                          <span className="text-xs font-mono font-bold text-gray-500">
                            {order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-300">|</span>
                          <span className="text-xs font-mono text-gray-400">{dateStr}</span>
                        </div>
                        <div className={`text-xs px-3 py-1 rounded-full font-bold border ${statusInfo.color} self-start`}>
                          ● {statusInfo.label}
                        </div>
                      </div>

                      {/* Items Ordered */}
                      <div className="divide-y divide-gray-50">
                        {order.items.map((item, i) => (
                          <div key={i} className="py-2.5 flex justify-between items-start text-sm">
                            <div className="space-y-1">
                              <p className="font-extrabold text-gray-800">
                                {item.product.name} <span className="text-xs text-gray-400">({item.size})</span>
                              </p>
                              <div className="flex flex-wrap gap-1.5 text-xs">
                                <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-md font-medium">
                                  {item.sweetness}
                                </span>
                                <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded-md font-medium">
                                  {item.ice}
                                </span>
                                {item.notes && (
                                  <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-md text-xs italic">
                                    註: {item.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-xs text-gray-500">x{item.quantity}</span>
                              <p className="font-bold text-gray-800 font-mono text-sm">${item.unitPrice * item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Total & Notes */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-gray-50/70 p-4 rounded-2xl text-xs text-gray-600">
                        {order.notes ? (
                          <div className="flex items-start gap-1">
                            <MessageSquare size={13} className="text-amber-600 mt-0.5 shrink-0" />
                            <p className="italic text-gray-500">
                              整單備註: {order.notes}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">無其它整單備註</span>
                        )}

                        <div className="text-right shrink-0 self-end">
                          <span className="text-gray-500 mr-2">顧客: <b className="text-gray-700">{order.customerName}</b></span>
                          <span className="text-gray-500 mr-2">/</span>
                          <span className="text-xs">
                            總實付: <strong className="text-emerald-800 font-mono text-base">${order.totalPrice}</strong>
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
