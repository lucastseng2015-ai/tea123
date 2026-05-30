import React, { useState, useEffect } from "react";
import { Lock, Unlock, Eye, EyeOff, ShieldCheck, CheckSquare, TrendingUp, DollarSign, RefreshCw, Clock, Layers, Edit, Check, Settings, Trash2, Sliders, ToggleLeft, ToggleRight, Loader } from "lucide-react";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { TeaOrder, TeaProduct } from "../types";
import { DEFAULT_PRODUCTS } from "../defaultData";
import { motion, AnimatePresence } from "motion/react";

interface AdminDashboardProps {
  products: TeaProduct[];
  onRefreshProducts: () => void;
}

export default function AdminDashboard({ products, onRefreshProducts }: AdminDashboardProps) {
  // Authentication states
  const [isAdminConfigured, setIsAdminConfigured] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");

  // Dashboard management states
  const [orders, setOrders] = useState<TeaOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"orders" | "catalog">("orders");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Catalog item editor states
  const [editingProduct, setEditingProduct] = useState<TeaProduct | null>(null);
  const [editPriceM, setEditPriceM] = useState<number>(0);
  const [editPriceL, setEditPriceL] = useState<number>(0);
  const [isSavingProduct, setIsSavingProduct] = useState<boolean>(false);

  // New product form states
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState<string>("");
  const [newProdDesc, setNewProdDesc] = useState<string>("");
  const [newProdPriceM, setNewProdPriceM] = useState<number>(50);
  const [newProdPriceL, setNewProdPriceL] = useState<string>(""); // can be empty
  const [newProdBadge, setNewProdBadge] = useState<string>("");

  // Step 1: Detect if Admin config is already defined on Firebase
  useEffect(() => {
    let active = true;
    async function checkAdminSetup() {
      try {
        const adminDocRef = doc(db, "system_config", "admin");
        const docSnap = await getDoc(adminDocRef);
        if (!active) return;
        if (docSnap.exists() && docSnap.data().passwordHash) {
          setIsAdminConfigured(true);
        } else {
          setIsAdminConfigured(false);
        }
      } catch (err) {
        console.error("Failed to check admin system status. Might be uninitialized.", err);
        if (active) setIsAdminConfigured(false);
      }
    }
    checkAdminSetup();
    return () => { active = false; };
  }, []);

  // Step 2: Set up real-time listener for orders if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    setOrdersLoading(true);
    const ordersRef = collection(db, "orders");
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const liveOrders: TeaOrder[] = [];
      snapshot.forEach((docSnap) => {
        liveOrders.push({ id: docSnap.id, ...docSnap.data() } as TeaOrder);
      });

      // Sort by original createdAt (newest first)
      liveOrders.sort((a, b) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t2 - t1;
      });

      setOrders(liveOrders);
      setOrdersLoading(false);
    }, (err) => {
      console.error("Error loading administration orders list", err);
      setOrdersLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Handle Initial Password Setup
  const handleRegisterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!password.trim()) {
      setAuthError("密碼不可為空！");
      return;
    }

    if (password !== confirmPassword) {
      setAuthError("兩次輸入的密碼不符，請重新確認！");
      return;
    }

    setIsSettingUp(true);
    try {
      // Store plain password/hashed representation in Firestore document
      const adminDocRef = doc(db, "system_config", "admin");
      await setDoc(adminDocRef, {
        passwordHash: password.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setIsAdminConfigured(true);
      setIsAuthenticated(true);
      // Auto-initialize catalog if it's completely empty on firebase
      await autoInitializeProducts();
    } catch (err) {
      console.error(err);
      setAuthError("密碼設定寫入資料庫失敗，請確認 Firebase 安全規則設定！");
    } finally {
      setIsSettingUp(false);
    }
  };

  // Helper: auto initialize default products in the collection
  const autoInitializeProducts = async () => {
    try {
      for (const prod of DEFAULT_PRODUCTS) {
        const prodDocRef = doc(db, "products", prod.id);
        const snap = await getDoc(prodDocRef);
        if (!snap.exists()) {
          await setDoc(prodDocRef, {
            ...prod,
            createdAt: serverTimestamp()
          });
        }
      }
      onRefreshProducts();
    } catch (err) {
      console.error("Auto initialize default products failed: ", err);
    }
  };

  // Handle Subsequent Password Authentication
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsVerifying(true);

    try {
      const adminDocRef = doc(db, "system_config", "admin");
      const docSnap = await getDoc(adminDocRef);

      if (docSnap.exists()) {
        const storedPassword = docSnap.data().passwordHash;
        if (storedPassword === password.trim()) {
          setIsAuthenticated(true);
        } else {
          setAuthError("密碼錯誤，請重新輸入！");
        }
      } else {
        // Fallback if settings was cleared
        setIsAdminConfigured(false);
      }
    } catch (err) {
      console.error(err);
      setAuthError("無法連接資料庫，請檢查 Firebase 配置！");
    } finally {
      setIsVerifying(false);
    }
  };

  // Update product price or specifications
  const handleUpdateProductPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSavingProduct(true);
    try {
      const docRef = doc(db, "products", editingProduct.id);
      await updateDoc(docRef, {
        priceM: editPriceM,
        priceL: editPriceL > 0 ? editPriceL : null
      });

      setEditingProduct(null);
      onRefreshProducts();
    } catch (err) {
      console.error(err);
      alert("儲存價格設定失敗，請檢查權限！");
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Toggle dynamic product availability state (in-stock / sold-out)
  const handleToggleAvailability = async (product: TeaProduct) => {
    try {
      const docRef = doc(db, "products", product.id);
      await updateDoc(docRef, {
        available: !product.available
      });
      onRefreshProducts();
    } catch (err) {
      console.error(err);
      alert("切換商品狀態失敗！");
    }
  };

  // Create customized custom product menu item
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    setIsSavingProduct(true);
    try {
      const generatedId = "custom_tea_" + Math.random().toString(36).substring(2, 9);
      const parsedPriceL = newProdPriceL.trim() ? parseInt(newProdPriceL) : null;

      const newProd: TeaProduct = {
        id: generatedId,
        name: newProdName.trim(),
        description: newProdDesc.trim() || "精選特調鮮乳、茶葉特製特製飲品。",
        priceM: newProdPriceM,
        priceL: parsedPriceL,
        iceConstraint: "僅供少冰",
        available: true,
        category: "蓋特調",
        badge: newProdBadge.trim() || undefined
      };

      const docRef = doc(db, "products", generatedId);
      await setDoc(docRef, newProd);

      // Reset form variables
      setNewProdName("");
      setNewProdDesc("");
      setNewProdPriceM(50);
      setNewProdPriceL("");
      setNewProdBadge("");
      setShowAddProductModal(false);
      onRefreshProducts();
    } catch (err) {
      console.error(err);
      alert("新增自訂商品失敗！");
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Update Order Status Tracker
  const handleUpdateOrderStatus = async (orderId: string, newStatus: TeaOrder["status"]) => {
    const ordersPath = `orders/${orderId}`;
    try {
      const docRef = doc(db, "orders", orderId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, ordersPath);
    }
  };

  // Delete Order completely from record
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("確定要徹底刪除 / 清除此筆選單訂單記錄嗎？（此動作無法復原）")) return;

    const ordersPath = `orders/${orderId}`;
    try {
      const docRef = doc(db, "orders", orderId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, ordersPath);
    }
  };

  // Delete dynamic product item
  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm("確定要刪除此款茶飲商品嗎？")) return;
    try {
      const docRef = doc(db, "products", prodId);
      await deleteDoc(docRef);
      onRefreshProducts();
    } catch (err) {
      console.error(err);
      alert("刪除商品失敗！");
    }
  };

  // Status statistics helper
  const getStats = () => {
    const totalOrderValue = orders
      .filter(o => o.status === "completed")
      .reduce((sum, o) => sum + o.totalPrice, 0);

    return {
      total: orders.length,
      pending: orders.filter(o => o.status === "pending").length,
      preparing: orders.filter(o => o.status === "preparing").length,
      completed: orders.filter(o => o.status === "completed").length,
      cancelled: orders.filter(o => o.status === "cancelled").length,
      revenue: totalOrderValue
    };
  };

  const stats = getStats();
  const filteredOrders = statusFilter === "all" 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  // Loading admin state overlay
  if (isAdminConfigured === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Loader className="animate-spin mb-4" size={32} />
        <p className="text-sm font-medium">連線安全性設定檢測中...</p>
      </div>
    );
  }

  // SCREEN A: FIRST TIME PASSWORD SETUP
  if (isAdminConfigured === false && !isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-150">
        <div className="p-8 bg-gradient-to-b from-orange-50 to-white text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center mx-auto shadow-inner">
            <Lock size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">🆕 首次設定管理者密碼</h2>
            <p className="text-xs text-orange-800 font-medium">
              偵測到系統首次運作，為防他人修改訂單，請為點單系統後台設置安全密碼。
            </p>
          </div>
        </div>

        <form onSubmit={handleRegisterPassword} className="p-8 space-y-5 border-t border-gray-100">
          <div className="space-y-2 text-sm text-gray-700">
            <label className="font-bold flex items-center gap-1.5" htmlFor="admin-pass">輸入新密碼</label>
            <div className="relative">
              <input
                id="admin-pass"
                type={showPassword ? "text" : "password"}
                required
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-250 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-700">
            <label className="font-bold flex items-center gap-1.5" htmlFor="admin-pass-confirm">確認新密碼</label>
            <input
              id="admin-pass-confirm"
              type="password"
              required
              placeholder="再次輸入密碼二度確認"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-250 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm text-gray-700"
            />
          </div>

          {authError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 font-medium leading-relaxed">
              ⚠️ {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSettingUp}
            className="cursor-pointer w-full bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-bold py-3.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2"
          >
            {isSettingUp ? <Loader size={18} className="animate-spin" /> : "建立並啟動系統"}
          </button>
        </form>
      </div>
    );
  }

  // SCREEN B: STANDARD PASSWORD VALIDATION LOGIN
  if (isAdminConfigured === true && !isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-150">
        <div className="p-8 bg-gradient-to-b from-emerald-50 to-white text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
            <Lock size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">🔒 後台安全密碼驗證</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              進入後台系統管理茶飲、訂單狀態與品項。本環境不需 OAuth，密碼為主要保護措施。
            </p>
          </div>
        </div>

        <form onSubmit={handleVerifyPassword} className="p-8 space-y-5 border-t border-gray-100">
          <div className="space-y-2 text-sm text-gray-700">
            <label className="font-bold flex items-center gap-1.5" htmlFor="verify-pass">管理者安全密碼</label>
            <div className="relative">
              <input
                id="verify-pass"
                type={showPassword ? "text" : "password"}
                required
                placeholder="輸入設定的密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-250 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500-custom outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {authError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 font-medium">
              ⚠️ {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="cursor-pointer w-full bg-emerald-800 hover:bg-emerald-950 active:scale-95 text-white font-bold py-3.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2"
          >
            {isVerifying ? <Loader size={18} className="animate-spin" /> : "安全登入後台"}
          </button>
        </form>
      </div>
    );
  }

  // SCREEN C: FULL AUTHORIZED DASHBOARD VIEW
  return (
    <div className="space-y-8" id="admin-panel">
      {/* Title Header with log out button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 pb-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-emerald-700" size={28} />
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">後台系統管理</h2>
            <p className="text-xs text-gray-500 font-medium">歡迎！您已成功驗證密碼，現可調整進度跟品項定價</p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsAuthenticated(false);
            setPassword("");
            setConfirmPassword("");
          }}
          className="cursor-pointer self-start sm:self-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl text-xs transition"
        >
          🔒 安全登出
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <RefreshCw size={20} className="animate-spin" style={{ animationDuration: "10s" }} />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">新單等待</span>
            <span className="text-2xl font-black text-gray-800 font-mono">{stats.pending}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">正在製作</span>
            <span className="text-2xl font-black text-gray-800 font-mono">{stats.preparing}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckSquare size={20} />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">已完取餐</span>
            <span className="text-2xl font-black text-gray-800 font-mono">{stats.completed}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">今天營業總額</span>
            <span className="text-2xl font-black text-emerald-800 font-mono">${stats.revenue} TWD</span>
          </div>
        </div>
      </div>

      {/* Section tab buttons switcher */}
      <div className="flex border-b border-gray-150">
        <button
          onClick={() => setActiveTab("orders")}
          className={`cursor-pointer px-6 py-3 font-bold text-sm border-b-2 transition ${
            activeTab === "orders" 
              ? "border-emerald-700 text-emerald-800" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📋 訂單管理 ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`cursor-pointer px-6 py-3 font-bold text-sm border-b-2 transition ${
            activeTab === "catalog"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          ⚙️ 菜單品項及價錢管理 ({products.length})
        </button>
      </div>

      {/* VIEW 1: ORDERS MANAGEMENT */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Status Filter buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "全部訂單", count: stats.total },
              { id: "pending", label: "排單中", count: stats.pending, color: "bg-gray-100" },
              { id: "preparing", label: "製作中", count: stats.preparing, color: "bg-blue-50 text-blue-700" },
              { id: "completed", label: "已完成 (待取)", count: stats.completed, color: "bg-emerald-50 text-emerald-700" },
              { id: "cancelled", label: "已取消", count: stats.cancelled, color: "bg-rose-50 text-rose-700" }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === filter.id
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-white hover:bg-gray-50 border border-gray-150 text-gray-600"
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>

          {/* Orders list */}
          {ordersLoading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              正在獲取系統最新交易記錄...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-gray-50/50 rounded-2xl py-12 text-center border border-dashed border-gray-200">
              <p className="text-gray-500 text-sm font-medium">目前查無符合該狀態篩選的訂單！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => {
                const dateStr = order.createdAt?.seconds 
                  ? new Date(order.createdAt.seconds * 1000).toLocaleString("zh-TW", { hour12: false })
                  : "剛才";

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-4 hover:border-gray-300 transition-all"
                  >
                    {/* Header info */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-gray-100">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md font-mono font-bold">
                            單號: {order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{dateStr}</span>
                          <span className="text-xs text-gray-300">|</span>
                          <span className="text-sm font-bold text-gray-800">
                            👤 {order.customerName} (<a href={`tel:${order.customerPhone}`} className="text-emerald-700 hover:underline">{order.customerPhone}</a>)
                          </span>
                        </div>
                      </div>

                      {/* Status selectors */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400 font-semibold mr-1">狀態控制:</span>
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border outline-none cursor-pointer ${
                            order.status === "pending" ? "bg-gray-50 border-gray-200 text-gray-700" :
                            order.status === "preparing" ? "bg-blue-50 border-blue-200 text-blue-700" :
                            order.status === "completed" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                            "bg-rose-50 border-rose-200 text-rose-700"
                          }`}
                        >
                          <option value="pending">排單中</option>
                          <option value="preparing">製作中</option>
                          <option value="completed">已完成 (通知取餐)</option>
                          <option value="cancelled">已取消</option>
                        </select>

                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="cursor-pointer text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                          title="永久除名記錄"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Order items lists */}
                    <div className="divide-y divide-gray-50">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-2.5 flex justify-between text-sm">
                          <div>
                            <span className="font-extrabold text-gray-800">{item.product.name}</span>
                            <span className="text-xs text-amber-600 font-bold ml-1.5 bg-amber-50 px-1.5 py-0.2 rounded">
                              {item.size}
                            </span>
                            <div className="flex gap-2 text-xs text-gray-500 mt-1">
                              <span>🍬 {item.sweetness}</span>
                              <span>•</span>
                              <span>❄️ {item.ice}</span>
                              {item.notes && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-800 font-medium italic">特別客製: {item.notes}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-400 text-xs mr-2">x{item.quantity}</span>
                            <span className="font-mono font-bold text-gray-800">${item.unitPrice * item.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary row */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                      <div>
                        {order.notes ? (
                          <span className="text-amber-700 font-medium italic">整單交代: {order.notes}</span>
                        ) : (
                          <span className="text-gray-300">沒整單註解</span>
                        )}
                      </div>
                      <div className="text-sm">
                        現折總付款: <strong className="font-mono text-base font-black text-emerald-800">${order.totalPrice} TWD</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PRODUCT CATALOG MANAGEMENT */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-150">
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              💡 <b>品項說明</b>：您可以直接在此點選編輯特定商品價格。
              或切換供應狀態。甚至亦可新增自訂茶飲。變更會立即同步給前台顧客。
            </p>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-sm shrink-0 flex items-center gap-1.5"
            >
              ➕ 新增自訂茶飲
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(prod => (
              <div
                key={prod.id}
                className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all ${
                  !prod.available ? "opacity-60 bg-gray-50/70" : ""
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      {prod.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleAvailability(prod)}
                        className="cursor-pointer text-xs flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                        title={prod.available ? "點選改為售完" : "點選改為上架"}
                      >
                        {prod.available ? (
                          <span className="flex items-center gap-1 text-emerald-700">
                            🟢 上架中 <ToggleRight size={22} className="text-emerald-600" />
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500">
                            🔴 售完/下架 <ToggleLeft size={22} className="text-gray-400" />
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-800">{prod.name}</h3>
                    <p className="text-xs text-amber-700 mt-1 font-medium bg-amber-50 inline-block px-1.5 py-0.2 rounded">
                      {prod.iceConstraint}
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-3">
                      {prod.description}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-4 flex items-center justify-between">
                  <div className="text-xs space-y-0.5">
                    <div className="text-gray-500">M價：<strong className="text-gray-800 font-mono">${prod.priceM}</strong></div>
                    <div className="text-gray-500">
                      L價：{prod.priceL ? <strong className="text-gray-800 font-mono">${prod.priceL}</strong> : <span className="text-gray-400">不提供</span>}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingProduct(prod);
                        setEditPriceM(prod.priceM);
                        setEditPriceL(prod.priceL || 0);
                      }}
                      className="cursor-pointer text-xs tracking-wide bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 transition"
                    >
                      <Edit size={12} /> 調整價格
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="cursor-pointer text-gray-400 hover:text-rose-600 p-1.5 rounded-lg"
                      title="刪除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL / DIALOGS: EDIT PRICE */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-5 z-10"
            >
              <h3 className="text-lg font-black text-gray-800">✍️ 調整大杯/中杯定價金額</h3>
              <p className="text-xs text-gray-500 italic">商品：{editingProduct.name}</p>

              <form onSubmit={handleUpdateProductPrice} className="space-y-4">
                <div className="space-y-1.5 text-xs text-gray-700">
                  <label className="font-bold block" htmlFor="edit-m">中杯價格 Price M ($)</label>
                  <input
                    id="edit-m"
                    type="number"
                    min={1}
                    required
                    value={editPriceM}
                    onChange={(e) => setEditPriceM(parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-250 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5 text-xs text-gray-700">
                  <label className="font-bold block" htmlFor="edit-l">大杯價格 Price L ($ - 輸入 0 表示 L杯不供應)</label>
                  <input
                    id="edit-l"
                    type="number"
                    min={0}
                    value={editPriceL}
                    onChange={(e) => setEditPriceL(parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-250 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="cursor-pointer flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="cursor-pointer flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                  >
                    {isSavingProduct ? <Loader size={12} className="animate-spin" /> : "確認儲存"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD CUSTOM PRODUCT */}
      <AnimatePresence>
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddProductModal(false)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 z-10"
            >
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <h3 className="text-lg font-black text-gray-800">➕ 新增鮮鮮茶屋新品項</h3>
                <button onClick={() => setShowAddProductModal(false)} className="text-gray-400 font-bold text-lg">&times;</button>
              </div>

              <form onSubmit={handleAddProductSubmit} className="space-y-3 text-xs text-gray-700">
                <div className="space-y-1">
                  <label className="font-bold block" htmlFor="prod-name">飲品名稱 *</label>
                  <input
                    id="prod-name"
                    type="text"
                    required
                    placeholder="請輸入茶飲品名。例如：海鹽奶蓋 珍珠青茶"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="w-full border border-gray-250 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold block" htmlFor="prod-desc">材料說明描述</label>
                  <textarea
                    id="prod-desc"
                    placeholder="例如：特調法國經典雙效鮮奶油霜，佐以頂級春採茶園原葉青茶..."
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    className="w-full border border-gray-250 rounded-xl px-3 py-2 outline-none h-14 resize-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold block" htmlFor="prod-price-m">中杯價格 M ($) *</label>
                    <input
                      id="prod-price-m"
                      type="number"
                      required
                      min={1}
                      value={newProdPriceM}
                      onChange={(e) => setNewProdPriceM(parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-250 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold block" htmlFor="prod-price-l">大杯價格 L ($ - 留空即無L)</label>
                    <input
                      id="prod-price-l"
                      type="number"
                      placeholder="留空表示無L款"
                      value={newProdPriceL}
                      onChange={(e) => setNewProdPriceL(e.target.value)}
                      className="w-full border border-gray-250 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold block" htmlFor="prod-badge">特色標章 (可留空)</label>
                  <input
                    id="prod-badge"
                    type="text"
                    placeholder="例如：推薦、熱銷、限定、新品"
                    value={newProdBadge}
                    onChange={(e) => setNewProdBadge(e.target.value)}
                    className="w-full border border-gray-250 rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(false)}
                    className="cursor-pointer flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="cursor-pointer flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    {isSavingProduct ? <Loader size={12} className="animate-spin" /> : "確認新增"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
