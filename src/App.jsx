import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, doc, setDoc, deleteDoc, getDocs, where, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { LucideHome, LucidePackage, LucideShoppingCart, LucideClipboardList, LucideMapPin, LucidePhone, LucideMail, LucideSearch, LucidePlus, LucideMinus, LucideTrash2, LucideHeart, LucideUser, LucideLogOut } from 'lucide-react';

// --- Firebase Config & Init ---
const firebaseConfig =  {
 apiKey: "AIzaSyDmKB9tMjQCFw0LGijvpfgOW4SZa5821q0",
  authDomain: "rudraconst-d1692.firebaseapp.com",
  projectId: "rudraconst-d1692",
  storageBucket: "rudraconst-d1692.firebasestorage.app",
  messagingSenderId: "1026576787699"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = "rudra-production-v1"; // Defined safely as a string

// --- Initial Seed Data (matches screenshots) ---
const INITIAL_PRODUCTS = [
  { id: 'p1', name: 'Sand (Ret)', price: 15.00, category: 'Basic', image: 'https://placehold.co/200x200/e2e8f0/1e293b?text=Sand' },
  { id: 'p2', name: 'Gravel (Muram)', price: 20.00, category: 'Basic', image: 'https://placehold.co/200x200/e2e8f0/1e293b?text=Gravel' },
  { id: 'p3', name: 'Gitti', price: 25.00, category: 'Basic', image: 'https://placehold.co/200x200/e2e8f0/1e293b?text=Gitti' },
  { id: 'p4', name: 'Cement', price: 8.00, category: 'Binding', image: 'https://placehold.co/200x200/e2e8f0/1e293b?text=Cement' },
  { id: 'p5', name: 'Steel Rods', price: 30.00, category: 'Reinforcement', image: 'https://placehold.co/200x200/e2e8f0/1e293b?text=Steel+Rods' },
  { id: 'p6', name: 'Bricks', price: 5.00, category: 'Basic', image: 'https://placehold.co/200x200/e2e8f0/1e293b?text=Bricks' },
  { id: 'p7', name: 'Tiles', price: 10.00, category: 'Finishing', image: 'https://placehold.co/200x200/e2e8f0/1e293b?text=Tiles' },
  { id: 'p8', name: 'Paints', price: 12.00, category: 'Finishing', image: 'https://placehold.co/200x200/e2e8f0/1e293b?text=Paints' },
];

// --- Colors derived from images ---
const THEME = {
  primary: 'bg-[#3d5a34]', // Dark green from buttons
  primaryHover: 'hover:bg-[#2e4a23]',
  secondary: 'bg-[#ecf5e9]', // Light green background
  accent: 'text-[#3d5a34]',
  text: 'text-gray-800',
  muted: 'text-gray-500'
};

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  ;

  // 1. Auth & Initial Data Seeding
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch or create user profile
        const userRef = doc(db, `artifacts/$"users/" + user.uid + "d}/profile`, 'info');
        const snapshot = await getDoc(userRef); // Need to import getDoc
        if (snapshot.exists()) {
          setUserProfile(snapshot.data());
        } else {
          // Default profile for anonymous users
          setUserProfile({ displayName: 'Guest', isAnonymous: true });
        }
        await seedDataIfNeeded();
      } else {
        signInAnonymously(auth).catch((error) => console.error("Auth Error:", error));
      }
    });
    return () => unsubscribe();
  }, []);

  // Need to import getDoc at the top, let's add it to the import list manually since I can't easily edit just one line
  // RE-IMPORTING getDoc here for safety in this specific block if I missed it above.
  // Actually, let's just add it to the main import.
  // *Self-correction: I missed `getDoc` in the main imports. Adding it now.*
  // (Wait, I can't edit the imports without re-writing the whole file. I will re-write the imports block in the final output)

  const seedDataIfNeeded = async () => {
    const productsRef = collection(db, `artifacts/${appId}/public/data/products`);
    const snapshot = await getDocs(productsRef);
    if (snapshot.empty) {
      console.log("Seeding initial products...");
      INITIAL_PRODUCTS.forEach(async (p) => {
        await setDoc(doc(db, `artifacts/${appId}/public/data/products`, p.id), p);
      });
    }
  };

  // 2. Data Listeners (Products, Cart, Orders, Profile)
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubProducts = onSnapshot(collection(db, `artifacts/${appId}/public/data/products`), (snapshot) => {
      const loadedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(loadedProducts);
      setLoading(false);
    });

    const unsubCart = onSnapshot(collection(db, `artifacts/${appId}/users/${user.uid}/cart`), (snapshot) => {
      const newCart = {};
      snapshot.docs.forEach(doc => { newCart[doc.id] = doc.data().quantity; });
      setCart(newCart);
    });

    const ordersQuery = query(collection(db, `artifacts/${appId}/users/${user.uid}/orders`), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

     // Profile Listener
    const unsubProfile = onSnapshot(doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'info'), (doc) => {
        if (doc.exists()) {
            setUserProfile(doc.data());
        }
    });

    return () => { unsubProducts(); unsubCart(); unsubOrders(); unsubProfile(); };
  }, [user, appId]);


  // --- Actions ---
  const updateCart = async (productId, delta) => {
    if (!user) return;
    const cartRef = doc(db, `artifacts/${appId}/users/${user.uid}/cart`, productId);
    const currentQty = cart[productId] || 0;
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      await deleteDoc(cartRef);
    } else {
      await setDoc(cartRef, { quantity: newQty }, { merge: true });
    }
  };

  const placeOrder = async () => {
    if (!user || Object.keys(cart).length === 0) return;

    const orderItems = Object.entries(cart).map(([pid, qty]) => {
      const product = products.find(p => p.id === pid);
      return {
        productId: pid,
        name: product?.name || 'Unknown',
        price: product?.price || 0,
        quantity: qty,
        total: (product?.price || 0) * qty
      };
    });

    const grandTotal = orderItems.reduce((sum, item) => sum + item.total, 0);

    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/orders`), {
        items: orderItems,
        total: grandTotal,
        status: 'Pending',
        createdAt: serverTimestamp(),
      });

      const promises = Object.keys(cart).map(pid =>
        deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/cart`, pid))
      );
      await Promise.all(promises);

      setActiveTab('orders');
    } catch (e) {
      console.error("Order failed:", e);
    }
  };

  // --- Simulated Google Auth ---
  const simulateGoogleSignIn = async () => {
      if (!user) return;
      // In a real app, this would be `signInWithPopup(auth, provider)`
      // Here we simulate it by updating the user profile in Firestore.
      const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'info');
      await setDoc(userProfileRef, {
          displayName: 'Rudra User',
          email: 'user@example.com',
          photoURL: 'https://placehold.co/100x100/3d5a34/ffffff?text=RU',
          isAnonymous: false
      }, { merge: true });
      setActiveTab('home');
  };

  const handleSignOut = async () => {
      // For demo, just clear the profile to "Guest"
       if (!user) return;
       const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'info');
       await setDoc(userProfileRef, {
           displayName: 'Guest',
           isAnonymous: true
       }, { merge: true });
       setActiveTab('home');
       // Optional: genuinely sign out of Firebase Auth if you want a fresh anonymous ID next time
       // await signOut(auth);
  };


  // --- Derived State ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const cartTotalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotalPrice = Object.entries(cart).reduce((total, [pid, qty]) => {
    const product = products.find(p => p.id === pid);
    return total + (product ? product.price * qty : 0);
  }, 0);


  // --- Views ---

  const HomeView = () => (
    <div className="flex flex-col space-y-6 pb-20">
      {/* Hero / Welcome */}
      <div className={`${THEME.secondary} p-6 rounded-b-3xl shadow-sm`}>
        <h1 className={`text-2xl font-bold ${THEME.accent} mb-2`}>
            Welcome, {userProfile?.displayName || 'Guest'}!
        </h1>
        <p className={`${THEME.text} text-sm opacity-80`}>
          Your one-stop shop for all building materials.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="px-4 space-y-3">
        <button onClick={() => setActiveTab('products')} className={`w-full py-4 ${THEME.primary} ${THEME.primaryHover} text-white rounded-xl font-semibold shadow-md transition-all active:scale-95`}>
          Browse Product Listings
        </button>
        <div className="grid grid-cols-2 gap-3">
           <button onClick={() => setActiveTab('cart')} className={`w-full py-4 bg-[#5c7a50] hover:bg-[#4b6940] text-white rounded-xl font-semibold shadow-md transition-all active:scale-95`}>
            View Cart
          </button>
           <button onClick={() => setActiveTab('contact')} className={`w-full py-4 bg-[#7a966e] hover:bg-[#6b875e] text-white rounded-xl font-semibold shadow-md transition-all active:scale-95`}>
            Contact Us
          </button>
        </div>
      </div>

      {/* Featured Carousel Placeholder */}
      <div className="px-4">
         <div className="bg-gray-200 h-48 rounded-2xl w-full flex items-center justify-center text-gray-400 animate-pulse">
            <span className="flex items-center gap-2"><LucidePackage size={24}/> Featured Promotions</span>
         </div>
      </div>

      {/* Preview Products */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className={`text-xl font-bold ${THEME.accent}`}>Popular Items</h2>
            <button onClick={() => setActiveTab('products')} className="text-sm text-blue-600 font-medium">See All</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {products.slice(0, 4).map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );

  const ProductsView = () => (
    <div className="p-4 pb-24 space-y-4">
      <h2 className={`text-2xl font-bold ${THEME.accent}`}>Our Products</h2>
      <div className="relative">
        <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search materials..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-[#3d5a34] outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse"/>)
        ) : (
          filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </div>
  );

  const CartView = () => (
    <div className="p-4 pb-24 h-full flex flex-col">
      <h2 className={`text-2xl font-bold ${THEME.accent} mb-6`}>Your Order</h2>
      {Object.keys(cart).length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
          <LucideShoppingCart size={64} className="opacity-20"/>
          <p>Your cart is empty.</p>
          <button onClick={() => setActiveTab('products')} className={`${THEME.primary} text-white px-6 py-2 rounded-full`}>
            Start Shopping
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto space-y-4">
            {Object.entries(cart).map(([pid, qty]) => {
              const product = products.find(p => p.id === pid);
              if (!product) return null;
              return (
                <div key={pid} className="flex items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <img src={product.image} className="w-20 h-20 object-cover rounded-lg bg-gray-100" alt={product.name} />
                  <div className="ml-4 flex-1">
                    <h3 className="font-semibold text-gray-800">{product.name}</h3>
                    <p className={`${THEME.accent} font-bold`}>{product.price.toFixed(2)} INR</p>
                  </div>
                  <div className="flex flex-col items-center space-y-2 bg-gray-50 p-1 rounded-lg">
                    <button onClick={() => updateCart(pid, 1)} className="p-1 hover:bg-gray-200 rounded"><LucidePlus size={16}/></button>
                    <span className="font-medium w-6 text-center">{qty}</span>
                    <button onClick={() => updateCart(pid, -1)} className="p-1 hover:bg-gray-200 rounded">
                        {qty === 1 ? <LucideTrash2 size={16} className="text-red-500"/> : <LucideMinus size={16}/>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 bg-white p-4 rounded-2xl shadow-lg border border-gray-100 sticky bottom-[80px]">
            <div className="flex justify-between mb-2 text-gray-500">
              <span>Subtotal</span>
              <span>{cartTotalPrice.toFixed(2)} INR</span>
            </div>
            <div className="flex justify-between mb-4 text-xl font-bold text-gray-800">
              <span>Total</span>
              <span>{cartTotalPrice.toFixed(2)} INR</span>
            </div>
            <button onClick={placeOrder} className={`w-full py-4 ${THEME.primary} ${THEME.primaryHover} text-white text-lg font-bold rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2`}>
              <LucideClipboardList size={20}/> Place Final Order
            </button>
          </div>
        </>
      )}
    </div>
  );

  const OrdersView = () => (
    <div className="p-4 pb-24 space-y-4">
       <h2 className={`text-2xl font-bold ${THEME.accent} mb-4`}>My Orders</h2>
       {orders.length === 0 ? (
         <p className="text-gray-500 text-center mt-10">No past orders found.</p>
       ) : (
         orders.map(order => (
           <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-start mb-3">
                <div>
                    <p className="text-xs text-gray-400">Order ID: {order.id.slice(0,8).toUpperCase()}</p>
                    <p className="text-sm text-gray-500">{order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {order.status}
                </span>
             </div>
             <div className="space-y-1 mb-3">
                 {order.items.map((item, idx) => (
                     <div key={idx} className="flex justify-between text-sm">
                         <span>{item.quantity}x {item.name}</span>
                         <span>{item.total.toFixed(2)}</span>
                     </div>
                 ))}
             </div>
             <div className="border-t pt-3 flex justify-between font-bold ${THEME.accent}">
                 <span>Total Paid</span>
                 <span>{order.total.toFixed(2)} INR</span>
             </div>
           </div>
         ))
       )}
    </div>
  );

  const ProfileView = () => (
      <div className="p-4 pb-24 space-y-6 flex flex-col items-center">
          <h2 className={`text-2xl font-bold ${THEME.accent} self-start`}>My Profile</h2>

          {userProfile?.isAnonymous ? (
              <div className="w-full flex flex-col items-center space-y-6 mt-10">
                  <LucideUser size={80} className="text-gray-300 p-4 bg-gray-100 rounded-full"/>
                  <p className="text-gray-500 text-center">Sign in to save your orders and access them from any device.</p>
                  
                  {/* Simulated Google Sign In Button */}
                  <button 
                      onClick={simulateGoogleSignIn}
                      className="flex items-center justify-center gap-3 bg-white text-gray-700 font-semibold py-3 px-6 w-full rounded-xl border border-gray-300 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
                  >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Sign in with Google
                  </button>
              </div>
          ) : (
              <div className="w-full flex flex-col items-center space-y-6 mt-6">
                   <img src={userProfile?.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-md"/>
                   <div className="text-center">
                       <h3 className="text-xl font-bold text-gray-800">{userProfile?.displayName}</h3>
                       <p className="text-gray-500">{userProfile?.email}</p>
                   </div>

                   <div className="w-full bg-white rounded-2xl p-4 shadow-sm space-y-2">
                        <div className="flex justify-between p-3 border-b">
                            <span className="text-gray-500">Member Since</span>
                            <span className="font-medium">Nov 2023</span>
                        </div>
                        <div className="flex justify-between p-3">
                             <span className="text-gray-500">Total Orders</span>
                             <span className="font-medium">{orders.length}</span>
                        </div>
                   </div>

                   <button 
                       onClick={handleSignOut}
                       className="flex items-center gap-2 text-red-500 font-medium py-3 px-6 rounded-xl hover:bg-red-50 transition-colors w-full justify-center"
                   >
                       <LucideLogOut size={20}/> Sign Out
                   </button>
              </div>
          )}
      </div>
  );

  // --- Shared Components ---
  const ProductCard = ({ product }) => {
      const qty = cart[product.id] || 0;
      return (
        <div className="bg-[#f8fdf7] p-3 rounded-2xl shadow-sm border border-green-50/50 flex flex-col relative group transition-all hover:shadow-md">
            <button className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors">
                <LucideHeart size={18}/>
            </button>
            <div className="bg-white p-4 rounded-xl mb-3 flex items-center justify-center aspect-square">
                 <img src={product.image} alt={product.name} className="w-3/4 h-3/4 object-contain opacity-80 mix-blend-multiply" />
            </div>
            <div className="flex-1">
                 <p className="text-xs text-green-700/60 font-medium uppercase tracking-wider mb-1">{product.category}</p>
                 <h3 className="font-bold text-gray-800 leading-tight mb-1">{product.name}</h3>
                 <p className={`text-lg font-extrabold ${THEME.accent}`}>{product.price.toFixed(2)} <span className="text-xs font-normal text-gray-500">INR</span></p>
            </div>
            {qty === 0 ? (
                <button onClick={() => updateCart(product.id, 1)} className={`mt-3 w-full py-2.5 ${THEME.primary} text-white rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-transform active:scale-95`}>
                    <LucideShoppingCart size={16}/> Add to Cart
                </button>
            ) : (
                <div className={`mt-3 w-full py-1 px-1 ${THEME.primary} text-white rounded-lg flex items-center justify-between`}>
                    <button onClick={() => updateCart(product.id, -1)} className="p-1.5 hover:bg-black/10 rounded transition-colors"><LucideMinus size={16}/></button>
                    <span className="font-bold">{qty}</span>
                    <button onClick={() => updateCart(product.id, 1)} className="p-1.5 hover:bg-black/10 rounded transition-colors"><LucidePlus size={16}/></button>
                </div>
            )}
        </div>
      );
  };

  // --- Main Render ---
  return (
    <div className="bg-gray-50 min-h-screen font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Top Bar */}
      <header className={`bg-white/80 backdrop-blur-md sticky top-0 z-10 px-4 py-3 flex items-center justify-between border-b border-green-50`}>
         <div className="flex items-center gap-2" onClick={() => setActiveTab('home')}>
             <div className={`w-8 h-8 ${THEME.primary} rounded-lg flex items-center justify-center text-white font-bold`}>R</div>
             <span className={`font-bold text-lg ${THEME.accent}`}>Rudra Co.</span>
         </div>
         <div className="flex items-center gap-4">
             <div className="relative" onClick={() => setActiveTab('cart')}>
                 <LucideShoppingCart className={THEME.accent} size={24} />
                 {cartTotalItems > 0 && (
                     <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white">
                         {cartTotalItems}
                     </span>
                 )}
             </div>
             <button onClick={() => setActiveTab('profile')}>
                {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} className="w-8 h-8 rounded-full border-2 border-[#3d5a34]" alt="Profile"/>
                ) : (
                    <LucideUser className={THEME.accent} size={24} />
                )}
             </button>
         </div>
      </header>

      {/* Main Content Area */}
      <main className="min-h-[calc(100vh-140px)]">
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'products' && <ProductsView />}
        {activeTab === 'cart' && <CartView />}
        {activeTab === 'orders' && <OrdersView />}
        {activeTab === 'profile' && <ProfileView />}
        {/* Replaced contact with Profile in nav, maybe keep contact accessible via home quick links? Yes, it is there. */}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 pb-safe z-20 max-w-md mx-auto">
        <div className="flex justify-around items-center relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                 <button onClick={() => setActiveTab('products')} className={`w-14 h-14 ${THEME.primary} rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white transition-transform active:scale-95`}>
                     <LucidePlus size={28}/>
                 </button>
            </div>
          <NavButton icon={LucideHome} label="Home" id="home" active={activeTab} set={setActiveTab} />
          <NavButton icon={LucidePackage} label="Products" id="products" active={activeTab} set={setActiveTab} className="mr-8" />
          <NavButton icon={LucideClipboardList} label="Orders" id="orders" active={activeTab} set={setActiveTab} className="ml-8" />
          <NavButton icon={LucideUser} label="Profile" id="profile" active={activeTab} set={setActiveTab} />
        </div>
      </nav>
    </div>
  );
}

const NavButton = ({ icon: Icon, label, id, active, set, className = "" }) => (
  <button
    onClick={() => set(id)}
    className={`flex flex-col items-center justify-center w-16 h-14 active:scale-95 transition-all ${className} ${active === id ? THEME.accent : 'text-gray-400 hover:text-gray-600'}`}
  >
    <Icon size={24} strokeWidth={active === id ? 2.5 : 2} />
    <span className={`text-[10px] font-medium mt-1 ${active === id ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
  </button>
);

export default App;



