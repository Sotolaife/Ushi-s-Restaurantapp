/* ── CONFIG ─────────────────────────────────────────────────── */
const SUPABASE_URL  = "https://ojltltbqrevuvhhtsfeb.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbHRsdGJxcmV2dXZoaHRzZmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTM4NTgsImV4cCI6MjA5MzIyOTg1OH0.ovpXXOsR_SAmyDIQUX8XJlxnCjGBt2SZ7KcHoV6oWvs";
const PAYSTACK_KEY  = "pk_test_e870c2deb42ecedd0ccadebe0ac271b163ba2c29";
const ADMIN_PIN     = "2727";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzwbUUHv_WeZnntIDXeDHvDWQ0Vp639O3z8P-cRKt0gEaU_Cu9pXcBpSm_HTckHRLKW/exec";

const { useState, useEffect, useRef, useCallback } = React;

const sb = {
  headers: {
    "apikey": SUPABASE_ANON,
    "Authorization": `Bearer ${SUPABASE_ANON}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  },
  authHeaders: (token) => ({
    "apikey": SUPABASE_ANON,
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  }),
  async query(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: this.headers, ...options });
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  },
  async authQuery(path, token, options = {}) {
    if (!token) throw new Error("No token");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: this.authHeaders(token), ...options });
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  },
  async signUp(email, password, fullName) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST", headers: this.headers,
      body: JSON.stringify({ email, password, data: { full_name: fullName } }),
    });
    return res.json();
  },
  async signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: this.headers,
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
  async signOut(token) {
    if (!token) return;
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: this.authHeaders(token) });
  },
  async createProfile(userId, email, fullName) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify({ id: userId, email, full_name: fullName, wallet: 0, is_admin: false }),
      });
      if (!res.ok) { const err = await res.text(); if (err.includes("duplicate")) return; throw new Error(err); }
    } catch(e) { if (!e.message?.includes("duplicate")) throw e; }
  },
};

async function trackLogin(email, name) {
  try { await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name, action: 'login' }) }); } catch(e) {}
}

const C = { bg: "#0E0C09", surface: "#181510", card: "#211E18", border: "#2E2A22", gold: "#F0A500", goldL: "#F5C842", white: "#F7F3EC", muted: "#7A7368", dim: "#3D3830", green: "#2ECC71", red: "#E74C3C", blue: "#3498DB" };
const fmt = (n) => { const num = Number(n); if (isNaN(num)) return "₦0.00"; return `₦${num.toLocaleString()}`; };

function openPaystack({ email, amount, onSuccess, onClose }) {
  if (!email) { onClose?.(); return; }
  const script = document.createElement("script");
  script.src = "https://js.paystack.co/v1/inline.js";
  script.onload = () => {
    const handler = window.PaystackPop.setup({ key: PAYSTACK_KEY, email, amount: Math.round(amount * 100), currency: "NGN", ref: `ushis_${Date.now()}`, callback: (r) => onSuccess(r.reference), onClose });
    handler.openIframe();
  };
  document.head.appendChild(script);
}

function Splash({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, [onDone]);
  return React.createElement("div", { style: { position:"fixed",inset:0,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",zIndex:9999 } },
    React.createElement("div", { style: { fontSize:64,fontWeight:900,color:C.white,fontFamily:"Georgia,serif",letterSpacing:"-2px" } },
      React.createElement("span", { style: {color:C.gold} }, "U"), "shi's"
    ),
    React.createElement("div", { style: { fontSize:10,color:C.muted,fontFamily:"Courier New,monospace",letterSpacing:"4px",marginTop:8 } }, "UNILORIN · CAMPUS KITCHEN")
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) return setError("Fill in all fields.");
    if (mode==="signup" && !name.trim()) return setError("Enter your name.");
    if (password.length < 6) return setError("Password: min 6 characters.");
    setLoading(true);
    try {
      if (mode === "signup") {
        const signUpRes = await sb.signUp(email.trim(), password, name.trim());
        if (signUpRes.error) throw new Error(signUpRes.error.message);
        if (!signUpRes.user?.id) throw new Error("Signup failed.");
        await sb.createProfile(signUpRes.user.id, email.trim(), name.trim());
        trackLogin(email.trim(), name.trim());
        await new Promise(r => setTimeout(r, 1000));
        const signInRes = await sb.signIn(email.trim(), password);
        if (signInRes.error) { setMode("login"); throw new Error("Account created! Please log in."); }
        onAuth({ token: signInRes.access_token, user: signInRes.user });
      } else {
        const res = await sb.signIn(email.trim(), password);
        if (res.error) throw new Error(res.error.message || "Invalid credentials");
        if (!res.access_token) throw new Error("Login failed.");
        trackLogin(email.trim(), res.user?.user_metadata?.full_name || email.trim());
        onAuth({ token: res.access_token, user: res.user });
      }
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const is = { width:"100%",boxSizing:"border-box",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",color:C.white,fontSize:15,fontFamily:"Georgia,serif",outline:"none",marginBottom:12 };

  return React.createElement("div", { style: { minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px" } },
    React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:44,fontWeight:900,color:C.white,letterSpacing:"-2px",marginBottom:4 } },
      React.createElement("span", { style: {color:C.gold} }, "U"), "shi's"
    ),
    React.createElement("div", { style: { fontFamily:"Courier New,monospace",fontSize:10,color:C.muted,letterSpacing:"4px",marginBottom:36 } }, "CAMPUS KITCHEN"),
    React.createElement("form", { onSubmit: submit, style: { width:"100%",maxWidth:360 } },
      mode==="signup" && React.createElement("input", { type:"text", placeholder:"Full name", value:name, onChange:e=>setName(e.target.value), style:is }),
      React.createElement("input", { type:"email", placeholder:"Email address", value:email, onChange:e=>setEmail(e.target.value), style:is }),
      React.createElement("input", { type:"password", placeholder:"Password", value:password, onChange:e=>setPass(e.target.value), style:is }),
      error && React.createElement("div", { style: { background:`${C.red}18`,border:`1px solid ${C.red}44`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:C.red,fontFamily:"Courier New,monospace" } }, error),
      React.createElement("button", { type:"submit", disabled:loading, style: { width:"100%",padding:16,background:`linear-gradient(135deg,${C.gold},${C.goldL})`,border:"none",borderRadius:14,fontFamily:"Georgia,serif",fontSize:17,fontWeight:900,color:C.bg,cursor:"pointer",opacity:loading?0.6:1,marginBottom:16 } }, loading?"Please wait…":mode==="login"?"Log In":"Create Account"),
      React.createElement("div", { style: { textAlign:"center",fontFamily:"Courier New,monospace",fontSize:12,color:C.muted } },
        mode==="login"?"New here? ":"Already have an account? ",
        React.createElement("span", { onClick:()=>{setMode(mode==="login"?"signup":"login");setError("");}, style: { color:C.gold,cursor:"pointer",textDecoration:"underline" } }, mode==="login"?"Create account":"Log in")
      )
    )
  );
}

function FoodCard({ item, onAdd, qty }) {
  const savings = item.old_price ? item.old_price - item.price : null;
  return React.createElement("div", { style: { background:C.card,borderRadius:16,border:`1.5px solid ${qty>0?C.gold:C.border}`,overflow:"hidden",boxShadow:qty>0?`0 0 20px ${C.gold}20`:"0 2px 8px rgba(0,0,0,0.3)" } },
    React.createElement("div", { style: { height:110,position:"relative",overflow:"hidden",background:`linear-gradient(160deg,${item.color||C.dim}22,${item.color||C.dim}08)`,display:"flex",alignItems:"center",justifyContent:"center" } },
      React.createElement("div", { style: { fontSize:46,filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.5))" } }, item.emoji||"🍽️"),
      item.badge && React.createElement("div", { style: { position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.75)",borderRadius:12,padding:"3px 8px",fontSize:9,color:C.white,fontFamily:"Courier New,monospace" } }, item.badge),
      qty>0 && React.createElement("div", { style: { position:"absolute",top:8,right:8,background:C.gold,color:C.bg,borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900 } }, qty)
    ),
    React.createElement("div", { style: { padding:"10px 12px 12px" } },
      React.createElement("div", { style: { fontSize:13,fontWeight:800,color:C.white,fontFamily:"Georgia,serif",marginBottom:6 } }, item.name),
      React.createElement("div", { style: { display:"flex",justifyContent:"space-between",alignItems:"flex-end" } },
        React.createElement("div", null,
          React.createElement("div", { style: { fontSize:16,fontWeight:900,color:C.gold,fontFamily:"Georgia,serif" } }, fmt(item.price)),
          savings && React.createElement("span", { style: { fontSize:9,color:C.muted,textDecoration:"line-through" } }, fmt(item.old_price))
        ),
        React.createElement("button", { onClick:(e)=>{e.stopPropagation();onAdd(item);}, style: { width:32,height:32,borderRadius:10,background:qty>0?C.gold:C.dim,border:"none",color:qty>0?C.bg:C.white,fontSize:qty>0?12:18,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" } }, qty>0?qty:"+")
      ),
      savings && React.createElement("div", { style: { marginTop:6,background:`${C.green}18`,border:`1px solid ${C.green}44`,borderRadius:4,padding:"2px 6px",display:"inline-block",fontSize:8,color:C.green,fontFamily:"Courier New,monospace" } }, "Save "+fmt(savings))
    )
  );
}

function CartSheet({ cart, setCart, profile, token, onSuccess, onClose }) {
  const [payMethod, setPayMethod] = useState("pickup");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const wb = Number(profile?.wallet||0);
  const upd = (id,d) => setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+d)}:i).filter(i=>i.qty>0));
  const placeOrder = async (ref=null) => {
    setLoading(true);setErr("");
    try {
      const [order] = await sb.authQuery("orders",token,{method:"POST",body:JSON.stringify({user_id:profile.id,customer_name:profile.full_name||profile.email||"Customer",customer_email:profile.email||"",items:cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty,emoji:i.emoji||"🍽️"})),total,payment_method:payMethod,payment_ref:ref||null,status:"pending"})});
      if(payMethod==="wallet") await sb.authQuery(`profiles?id=eq.${profile.id}`,token,{method:"PATCH",body:JSON.stringify({wallet:wb-total})});
      onSuccess(order.order_number);
    } catch(e) { setErr("Something went wrong."); }
    setLoading(false);
  };

  return React.createElement(React.Fragment, null,
    React.createElement("div", { onClick:onClose, style: { position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:200,backdropFilter:"blur(4px)" } }),
    React.createElement("div", { style: { position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderRadius:"24px 24px 0 0",zIndex:201,maxHeight:"80vh",display:"flex",flexDirection:"column",border:`1px solid ${C.border}`,borderBottom:"none",maxWidth:430,margin:"0 auto" } },
      React.createElement("div", { style: { display:"flex",justifyContent:"center",padding:"12px 0" } }, React.createElement("div", { style: { width:40,height:4,borderRadius:2,background:C.border } })),
      React.createElement("div", { style: { padding:"8px 20px 12px",display:"flex",justifyContent:"space-between",alignItems:"center" } },
        React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:18,fontWeight:800,color:C.white } }, "Your Order"),
        React.createElement("button", { onClick:onClose, style: { background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer" } }, "✕")
      ),
      React.createElement("div", { style: { overflowY:"auto",padding:"0 20px",flex:1 } },
        cart.map(item=>React.createElement("div", { key:item.id, style: { display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}` } },
          React.createElement("div", { style: { fontSize:26 } }, item.emoji||"🍽️"),
          React.createElement("div", { style: { flex:1 } },
            React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:13,fontWeight:700,color:C.white } }, item.name),
            React.createElement("div", { style: { fontSize:12,color:C.gold,fontWeight:700 } }, fmt(item.price))
          ),
          React.createElement("div", { style: { display:"flex",alignItems:"center",gap:8 } },
            React.createElement("button", { onClick:()=>upd(item.id,-1), style: { width:26,height:26,borderRadius:8,background:C.dim,border:"none",color:C.white,fontSize:14,cursor:"pointer" } }, "−"),
            React.createElement("span", { style: { color:C.white,fontWeight:800,fontSize:13,minWidth:14,textAlign:"center" } }, item.qty),
            React.createElement("button", { onClick:()=>upd(item.id,1), style: { width:26,height:26,borderRadius:8,background:C.gold,border:"none",color:C.bg,fontSize:14,fontWeight:900,cursor:"pointer" } }, "+")
          )
        )),
        React.createElement("div", { style: { marginTop:14 } },
          React.createElement("div", { style: { fontFamily:"Courier New,monospace",fontSize:9,color:C.muted,letterSpacing:"2px",marginBottom:10 } }, "PAYMENT METHOD"),
          React.createElement("div", { style: { display:"flex",gap:8 } },
            React.createElement("button", { onClick:()=>{setPayMethod("pickup");setErr("");}, style: { flex:1,padding:"10px",borderRadius:12,cursor:"pointer",border:`1.5px solid ${payMethod==="pickup"?C.gold:C.border}`,background:payMethod==="pickup"?`${C.gold}10`:C.card,color:payMethod==="pickup"?C.gold:C.muted,fontFamily:"Courier New,monospace",fontSize:10 } }, "🤝 Pay on Pickup"),
            React.createElement("button", { onClick:()=>{setPayMethod("wallet");setErr("");}, style: { flex:1,padding:"10px",borderRadius:12,cursor:"pointer",border:`1.5px solid ${payMethod==="wallet"?C.gold:C.border}`,background:payMethod==="wallet"?`${C.gold}10`:C.card,color:payMethod==="wallet"?C.gold:C.muted,fontFamily:"Courier New,monospace",fontSize:10 } }, "💳 Wallet "+fmt(wb))
          )
        )
      ),
      React.createElement("div", { style: { padding:"14px 20px 24px",borderTop:`1px solid ${C.border}` } },
        err&&React.createElement("div", { style: { background:`${C.red}15`,border:`1px solid ${C.red}33`,borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:C.red,fontFamily:"Courier New,monospace" } }, err),
        React.createElement("div", { style: { display:"flex",justifyContent:"space-between",marginBottom:12,alignItems:"center" } },
          React.createElement("span", { style: { fontFamily:"Courier New,monospace",fontSize:11,color:C.muted } }, "TOTAL"),
          React.createElement("span", { style: { fontFamily:"Georgia,serif",fontSize:22,fontWeight:900,color:C.gold } }, fmt(total))
        ),
        React.createElement("button", { onClick:()=>{if(payMethod==="wallet"&&wb<total) return setErr(`Insufficient balance.`);payMethod==="pickup"?openPaystack({email:profile?.email||"",amount:total,onSuccess:async(ref)=>{await placeOrder(ref);},onClose:()=>setErr("Payment cancelled.")}):placeOrder();}, disabled:loading, style: { width:"100%",padding:14,background:loading?C.dim:`linear-gradient(135deg,${C.gold},${C.goldL})`,border:"none",borderRadius:14,fontFamily:"Georgia,serif",fontSize:16,fontWeight:900,color:C.bg,cursor:loading?"not-allowed":"pointer" } }, loading?"Processing…":payMethod==="pickup"?"Confirm Order":"Place Order")
      )
    )
  );
}

function Success({ orderNum, onBack }) {
  return React.createElement("div", { style: { minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,textAlign:"center",color:C.white } },
    React.createElement("div", { style: { fontSize:48,marginBottom:16 } }, "✅"),
    React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:26,fontWeight:900,marginBottom:8 } }, "Order Confirmed!"),
    React.createElement("div", { style: { color:C.muted,fontSize:12,fontFamily:"Courier New,monospace",marginBottom:24 } }, "Order #"+String(orderNum).padStart(4,"0")),
    React.createElement("button", { onClick:onBack, style: { background:C.gold,border:"none",borderRadius:14,padding:"14px 36px",color:C.bg,fontFamily:"Georgia,serif",fontSize:16,fontWeight:800,cursor:"pointer" } }, "Order Again")
  );
}

function HomeScreen({ session, profile, setProfile }) {
  const [menu, setMenu] = useState([]);
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderNum, setOrderNum] = useState(null);
  const [ml, setMl] = useState(true);
  useEffect(()=>{ (async()=>{ setMl(true); try { const d = await sb.query("menu_items?available=eq.true&order=sort_order"); setMenu(Array.isArray(d)?d:[]); } catch(e){} setMl(false); })(); },[]);
  const cats = ["All",...new Set(menu.map(m=>m.category).filter(Boolean))];
  const items = cat==="All"?menu:menu.filter(m=>m.category===cat);
  const cc = cart.reduce((s,i)=>s+i.qty,0);
  const ct = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const gq = (id)=>cart.find(i=>i.id===id)?.qty||0;
  const add = useCallback((item)=>setCart(c=>{const ex=c.find(x=>x.id===item.id);return ex?c.map(x=>x.id===item.id?{...x,qty:x.qty+1}:x):[...c,{...item,qty:1}];}),[]);
  if(orderNum) return React.createElement(Success, { orderNum, onBack:()=>{setOrderNum(null);setCart([]);} });

  return React.createElement("div", { style: { background:C.bg,minHeight:"100vh",paddingBottom:100 } },
    React.createElement("div", { style: { padding:"20px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center" } },
      React.createElement("div", null,
        React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:28,fontWeight:900,color:C.white,letterSpacing:"-0.5px" } }, React.createElement("span", { style: {color:C.gold} }, "U"), "shi's"),
        React.createElement("div", { style: { fontSize:10,color:C.muted,fontFamily:"Courier New,monospace",letterSpacing:"2px",marginTop:2 } }, "UNILORIN CAMPUS")
      ),
      React.createElement("div", { style: { background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"8px 14px",display:"flex",alignItems:"center",gap:8 } },
        React.createElement("span", null, "💳"),
        React.createElement("div", null,
          React.createElement("div", { style: { fontSize:8,color:C.muted,fontFamily:"Courier New,monospace" } }, "WALLET"),
          React.createElement("div", { style: { fontSize:13,fontWeight:800,color:C.white,fontFamily:"Georgia,serif" } }, fmt(Number(profile?.wallet||0)))
        )
      )
    ),
    React.createElement("div", { style: { padding:"16px 20px 14px" } },
      React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:14,fontWeight:700,color:C.muted } }, "Hey "+(profile?.full_name?.split(" ")[0]||"there")+" 👋 — what are you feeling today?")
    ),
    React.createElement("div", { style: { marginBottom:16 } },
      React.createElement("div", { style: { display:"flex",gap:8,padding:"0 20px",overflowX:"auto",scrollbarWidth:"none" } },
        cats.map(c=>React.createElement("button", { key:c, onClick:()=>setCat(c), style: { padding:"8px 18px",borderRadius:20,border:"none",background:cat===c?C.gold:C.card,color:cat===c?C.bg:C.muted,fontFamily:"Georgia,serif",fontSize:13,fontWeight:cat===c?800:500,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0 } }, c))
      )
    ),
    React.createElement("div", { style: { padding:"0 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 } },
      ml?React.createElement("div", { style: { gridColumn:"1/-1",textAlign:"center",padding:40,color:C.muted } }, "Loading menu…"):
      items.length===0?React.createElement("div", { style: { gridColumn:"1/-1",textAlign:"center",padding:60,color:C.muted } }, React.createElement("div", { style: {fontSize:48,marginBottom:12} }, "🍽️"), "No items yet."):
      items.map(item=>React.createElement(FoodCard, { key:item.id, item, onAdd:add, qty:gq(item.id) }))
    ),
    cc>0&&React.createElement("div", { onClick:()=>setCartOpen(true), style: { position:"fixed",bottom:80,left:20,right:20,maxWidth:390,margin:"0 auto",background:C.gold,borderRadius:16,padding:"14px 20px",zIndex:150,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:`0 8px 32px ${C.gold}55`,cursor:"pointer" } },
      React.createElement("div", { style: { display:"flex",alignItems:"center",gap:10 } },
        React.createElement("div", { style: { background:C.bg,color:C.gold,borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900 } }, cc),
        React.createElement("span", { style: { fontFamily:"Georgia,serif",fontWeight:800,fontSize:14,color:C.bg } }, "View Order")
      ),
      React.createElement("span", { style: { fontFamily:"Georgia,serif",fontWeight:900,fontSize:16,color:C.bg } }, fmt(ct))
    ),
    cartOpen&&React.createElement(CartSheet, { cart, setCart, profile, token:session.token, onSuccess:(num)=>{setCartOpen(false);setOrderNum(num);setProfile(p=>({...p,wallet:Number(p.wallet||0)-ct}));}, onClose:()=>setCartOpen(false) })
  );
}

function WalletScreen({ session, profile, setProfile }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const topUp = (amt) => {
    if(!amt||amt<100) return;
    setLoading(true);
    openPaystack({ email:profile?.email||"", amount:amt, onSuccess:async()=>{ const nb = Number(profile?.wallet||0)+Number(amt); await sb.authQuery(`profiles?id=eq.${profile.id}`,session.token,{method:"PATCH",body:JSON.stringify({wallet:nb})}); setProfile(p=>({...p,wallet:nb}));setDone(true);setAmount("");setTimeout(()=>setDone(false),3000);setLoading(false); }, onClose:()=>setLoading(false) });
  };
  return React.createElement("div", { style: { background:C.bg,minHeight:"100vh",paddingBottom:90,color:C.white } },
    React.createElement("div", { style: { padding:"24px 20px 20px" } }, React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:26,fontWeight:900 } }, "Top Up Wallet")),
    React.createElement("div", { style: { margin:"0 20px 24px",background:`${C.gold}15`,border:`1px solid ${C.gold}33`,borderRadius:18,padding:22 } },
      React.createElement("div", { style: { fontFamily:"Courier New,monospace",fontSize:10,color:C.gold,letterSpacing:"2px",marginBottom:8 } }, "CURRENT BALANCE"),
      React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:40,fontWeight:900 } }, fmt(Number(profile?.wallet||0)))
    ),
    done&&React.createElement("div", { style: { margin:"0 20px 20px",background:`${C.green}15`,border:`1px solid ${C.green}33`,borderRadius:12,padding:"14px 18px",fontFamily:"Courier New,monospace",fontSize:13,color:C.green } }, "✓ Wallet topped up!"),
    React.createElement("div", { style: { padding:"0 20px",marginBottom:16 } },
      React.createElement("div", { style: { fontFamily:"Courier New,monospace",fontSize:10,color:C.muted,letterSpacing:"2px",marginBottom:12 } }, "QUICK AMOUNTS"),
      React.createElement("div", { style: { display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 } },
        [1000,2000,5000,10000].map(p=>React.createElement("button", { key:p, onClick:()=>topUp(p), style: { padding:"14px",background:C.card,border:`1px solid ${C.border}`,borderRadius:14,fontFamily:"Georgia,serif",fontSize:16,fontWeight:800,color:C.white,cursor:"pointer" } }, fmt(p)))
      )
    ),
    React.createElement("div", { style: { padding:"0 20px" } },
      React.createElement("div", { style: { fontFamily:"Courier New,monospace",fontSize:10,color:C.muted,letterSpacing:"2px",marginBottom:12 } }, "CUSTOM AMOUNT"),
      React.createElement("div", { style: { display:"flex",gap:10 } },
        React.createElement("input", { type:"number", placeholder:"Enter amount", value:amount, onChange:e=>setAmount(e.target.value), style: { flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px",color:C.white,fontSize:15,fontFamily:"Georgia,serif",outline:"none" } }),
        React.createElement("button", { onClick:()=>topUp(Number(amount)), disabled:loading, style: { background:loading?C.dim:C.gold,border:"none",borderRadius:14,padding:"16px 24px",color:C.bg,fontFamily:"Georgia,serif",fontSize:16,fontWeight:800,cursor:"pointer" } }, loading?"…":"Pay")
      )
    )
  );
}

function OrdersScreen({ session }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ (async()=>{ setLoading(true); try { const d = await sb.authQuery("orders?order=created_at.desc&limit=20",session.token); setOrders(Array.isArray(d)?d:[]); } catch(e){} setLoading(false); })(); },[]);
  const SC = { pending:C.gold,preparing:C.blue,ready:C.green,picked_up:C.muted };
  return React.createElement("div", { style: { background:C.bg,minHeight:"100vh",paddingBottom:90,color:C.white } },
    React.createElement("div", { style: { padding:"24px 20px 20px" } }, React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:26,fontWeight:900 } }, "Past Orders")),
    React.createElement("div", { style: { padding:"0 20px",display:"flex",flexDirection:"column",gap:12 } },
      loading?React.createElement("div", { style: { textAlign:"center",padding:40,color:C.muted } }, "Loading…"):
      orders.length===0?React.createElement("div", { style: { textAlign:"center",padding:60 } }, React.createElement("div", { style: {fontSize:48,marginBottom:12} }, "🍽️"), React.createElement("div", { style: {fontFamily:"Courier New,monospace",fontSize:12,color:C.muted} }, "No orders yet")):
      orders.map(o=>React.createElement("div", { key:o.id, style: { background:C.card,borderRadius:16,padding:16,border:`1px solid ${C.border}`,display:"flex",gap:12,alignItems:"center" } },
        React.createElement("div", { style: { width:48,height:48,background:C.surface,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 } }, o.items?.[0]?.emoji||"🍛"),
        React.createElement("div", { style: {flex:1} },
          React.createElement("div", { style: { fontFamily:"Courier New,monospace",fontSize:9,color:C.muted } }, "#"+String(o.order_number).padStart(4,"0")),
          React.createElement("div", { style: { fontFamily:"Georgia,serif",fontWeight:800,fontSize:13,color:C.white,marginTop:2 } }, o.items?.map(i=>i.name).join(", ")),
          React.createElement("div", { style: { fontSize:13,color:C.gold,fontWeight:700 } }, fmt(o.total))
        ),
        React.createElement("div", { style: { background:`${(SC[o.status]||C.muted)}15`,border:`1px solid ${(SC[o.status]||C.muted)}33`,borderRadius:8,padding:"4px 10px",fontSize:9,color:SC[o.status]||C.muted,fontFamily:"Courier New,monospace",textTransform:"capitalize" } }, o.status?.replace(/_/g," "))
      ))
    )
  );
}

function ProfileScreen({ profile, onSignOut }) {
  return React.createElement("div", { style: { background:C.bg,minHeight:"100vh",paddingBottom:90,color:C.white } },
    React.createElement("div", { style: { padding:"24px 20px 0" } }, React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:26,fontWeight:900 } }, "Account")),
    React.createElement("div", { style: { margin:"18px 20px",background:C.card,borderRadius:18,padding:18,border:`1px solid ${C.border}`,display:"flex",gap:14,alignItems:"center" } },
      React.createElement("div", { style: { width:52,height:52,borderRadius:16,background:`linear-gradient(135deg,${C.gold}88,${C.gold}44)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 } }, "👤"),
      React.createElement("div", null,
        React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:16,fontWeight:800 } }, profile?.full_name||"User"),
        React.createElement("div", { style: { fontFamily:"Courier New,monospace",fontSize:10,color:C.muted,marginTop:3 } }, profile?.email||"—")
      )
    ),
    React.createElement("div", { style: { margin:"0 20px 18px",background:`${C.gold}15`,border:`1px solid ${C.gold}33`,borderRadius:18,padding:18 } },
      React.createElement("div", { style: { fontFamily:"Courier New,monospace",fontSize:10,color:C.gold,letterSpacing:"2px",marginBottom:6 } }, "WALLET BALANCE"),
      React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:34,fontWeight:900 } }, fmt(Number(profile?.wallet||0)))
    ),
    React.createElement("div", { style: { padding:"0 20px" } },
      React.createElement("div", { onClick:()=>alert("Notifications coming soon!"), style: { background:C.card,borderRadius:14,padding:"14px 18px",marginBottom:8,border:`1px solid ${C.border}`,cursor:"pointer" } }, "🔔 Notifications"),
      React.createElement("div", { onClick:()=>alert("Contact us: sotolaifeoluwa@gmail.com"), style: { background:C.card,borderRadius:14,padding:"14px 18px",marginBottom:8,border:`1px solid ${C.border}`,cursor:"pointer" } }, "❓ Help & Support"),
      React.createElement("div", { onClick:onSignOut, style: { background:`${C.red}08`,borderRadius:14,padding:"14px 18px",border:`1px solid ${C.red}22`,cursor:"pointer" } },
        "🚪 ", React.createElement("span", { style: {color:C.red,fontWeight:700} }, "Log Out")
      )
    )
  );
}

function AdminScreen({ session }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ (async()=>{ setLoading(true); try { const d = await sb.authQuery("orders?order=created_at.desc&limit=50",session.token); setOrders(Array.isArray(d)?d:[]); } catch(e){} setLoading(false); })(); },[]);
  const updateStatus = async (id,s) => { await sb.authQuery(`orders?id=eq.${id}`,session.token,{method:"PATCH",body:JSON.stringify({status:s})}); setOrders(o=>o.map(x=>x.id===id?{...x,status:s}:x)); };
  const SC = { pending:C.gold,preparing:C.blue,ready:C.green,picked_up:C.muted };
  return React.createElement("div", { style: { background:C.bg,minHeight:"100vh",paddingBottom:90,color:C.white } },
    React.createElement("div", { style: { padding:"24px 20px 16px" } }, React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:22,fontWeight:900,color:C.gold } }, "⚙ Admin")),
    loading?React.createElement("div", { style: { textAlign:"center",padding:40,color:C.muted } }, "Loading…"):
    orders.length===0?React.createElement("div", { style: { textAlign:"center",padding:40,color:C.muted } }, "No orders yet."):
    orders.map(o=>React.createElement("div", { key:o.id, style: { margin:"0 20px 12px",background:C.card,borderRadius:16,padding:16,border:`1px solid ${C.border}` } },
      React.createElement("div", { style: { display:"flex",justifyContent:"space-between",marginBottom:8 } },
        React.createElement("span", { style: { fontFamily:"Courier New,monospace",fontSize:10,color:C.muted } }, "#"+String(o.order_number).padStart(4,"0")),
        React.createElement("span", { style: { fontSize:10,color:SC[o.status]||C.muted,textTransform:"capitalize" } }, o.status?.replace(/_/g," "))
      ),
      React.createElement("div", { style: { fontFamily:"Georgia,serif",fontWeight:800,fontSize:14,marginBottom:4 } }, o.customer_name),
      React.createElement("div", { style: { fontFamily:"Courier New,monospace",fontSize:10,color:C.muted,marginBottom:8 } }, o.items?.map(i=>`${i.emoji||"🍽️"} ${i.name} ×${i.qty}`).join(" · ")),
      React.createElement("div", { style: { display:"flex",justifyContent:"space-between",alignItems:"center" } },
        React.createElement("span", { style: { fontFamily:"Georgia,serif",color:C.gold,fontWeight:800 } }, fmt(o.total)),
        React.createElement("div", { style: { display:"flex",gap:6 } },
          ["pending","preparing","ready","picked_up"].filter(s=>s!==o.status).slice(0,2).map(s=>React.createElement("button", { key:s, onClick:()=>updateStatus(o.id,s), style: { padding:"5px 10px",borderRadius:8,border:`1px solid ${SC[s]||C.border}`,background:"transparent",color:SC[s]||C.muted,fontFamily:"Courier New,monospace",fontSize:9,cursor:"pointer",textTransform:"capitalize" } }, "→ "+s.replace(/_/g," ")))
        )
      )
    ))
  );
}

function AdminGate({ onUnlock }) {
  const [pin, setPin] = useState(""); const [err, setErr] = useState(false);
  const check = (v) => { if(v.length<4) return; v===ADMIN_PIN?onUnlock():(setErr(true),setTimeout(()=>{setErr(false);setPin("");},800)); };
  return React.createElement("div", { style: { minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,color:C.white } },
    React.createElement("div", { style: { fontSize:36,marginBottom:16 } }, "🔐"),
    React.createElement("div", { style: { fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,marginBottom:8 } }, "Admin Access"),
    React.createElement("div", { style: { fontFamily:"Courier New,monospace",fontSize:11,color:C.muted,marginBottom:32 } }, "Enter PIN"),
    React.createElement("div", { style: { display:"flex",gap:14,marginBottom:32 } },
      [0,1,2,3].map(i=>React.createElement("div", { key:i, style: { width:16,height:16,borderRadius:"50%",background:pin.length>i?(err?C.red:C.gold):C.dim } }))
    ),
    React.createElement("div", { style: { display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,maxWidth:260,width:"100%" } },
      [1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>React.createElement("button", { key:i, onClick:()=>d==="⌫"?setPin(p=>p.slice(0,-1)):d!==""&&check(pin+String(d)), disabled:d==="", style: { padding:"18px",borderRadius:14,border:`1px solid ${C.border}`,background:C.card,color:C.white,fontFamily:"Georgia,serif",fontSize:22,fontWeight:800,cursor:d===""?"default":"pointer" } }, d))
    )
  );
}

function App() {
  const [splash, setSplash] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [pl, setPl] = useState(true);
  const [tab, setTab] = useState("home");
  const [ao, setAo] = useState(false);
  const [au, setAu] = useState(false);
  useEffect(()=>{ const saved=localStorage.getItem("ushis_session"); if(saved){ try{ const s=JSON.parse(saved); if(s?.token&&s?.user?.id){ setSession(s); (async(s2,a)=>{ if(!s2?.token||!s2?.user?.id){setPl(false);return;} if(a===1)setPl(true); try{ const d=await sb.authQuery(`profiles?id=eq.${s2.user.id}`,s2.token); if(d&&d.length>0){setProfile(d[0]);setPl(false);} else if(a<5){setTimeout(()=>arguments.callee(s2,a+1),2000);} else{setPl(false);} }catch(e){ if(a<5)setTimeout(()=>arguments.callee(s2,a+1),2000); else setPl(false); } })(s,1); trackLogin(s.user.email,s.user.user_metadata?.full_name||'User'); } else{localStorage.removeItem("ushis_session");setPl(false);} }catch(e){localStorage.removeItem("ushis_session");setPl(false);} } else{setPl(false);} },[]);
  const ha = (s)=>{ if(!s?.token||!s?.user?.id) return; setSession(s); localStorage.setItem("ushis_session",JSON.stringify(s)); trackLogin(s.user.email,s.user.user_metadata?.full_name||'User'); (async(s2,a)=>{ if(!s2?.token||!s2?.user?.id){setPl(false);return;} if(a===1)setPl(true); try{ const d=await sb.authQuery(`profiles?id=eq.${s2.user.id}`,s2.token); if(d&&d.length>0){setProfile(d[0]);setPl(false);} else if(a<5){setTimeout(()=>arguments.callee(s2,a+1),2000);} else{setPl(false);} }catch(e){ if(a<5)setTimeout(()=>arguments.callee(s2,a+1),2000); else setPl(false); } })(s,1); };
  const hs = async ()=>{ try{await sb.signOut(session?.token);}catch(e){} setSession(null);setProfile(null);setPl(false);localStorage.removeItem("ushis_session"); };
  const lp = useRef();
  if(splash) return React.createElement(Splash, { onDone:()=>setSplash(false) });
  if(!session) return React.createElement(AuthScreen, { onAuth:ha });
  if(ao){ if(!au) return React.createElement(AdminGate, { onUnlock:()=>setAu(true) }); return React.createElement("div", { style: { maxWidth:430,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column",background:C.bg } }, React.createElement("div", { style: { flex:1,overflowY:"auto" } }, React.createElement(AdminScreen, { session })), React.createElement("button", { onClick:()=>{setAo(false);setAu(false);}, style: { background:C.dim,border:"none",padding:"12px",color:C.muted,fontFamily:"Courier New,monospace",fontSize:11,cursor:"pointer" } }, "← BACK TO APP")); }
  return React.createElement("div", { style: { maxWidth:430,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"Georgia,serif" } },
    React.createElement("div", { style: { flex:1,overflowY:"auto" } },
      pl?React.createElement("div", { style: { display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" } }, React.createElement("div", { style: { color:C.muted,fontFamily:"Courier New,monospace",fontSize:13 } }, "Loading…")):
      React.createElement(React.Fragment, null,
        tab==="home"&&React.createElement(HomeScreen, { session, profile, setProfile }),
        tab==="wallet"&&React.createElement(WalletScreen, { session, profile, setProfile }),
        tab==="orders"&&React.createElement(OrdersScreen, { session }),
        tab==="profile"&&React.createElement(ProfileScreen, { profile, onSignOut:hs })
      )
    ),
    React.createElement("div", { style: { background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",padding:"6px 0 18px" } },
      [{id:"home",label:"Home",icon:"🏠"},{id:"wallet",label:"Wallet",icon:"💳"},{id:"orders",label:"Orders",icon:"🕐"},{id:"profile",label:"Account",icon:"👤"}].map(t=>React.createElement("button", { key:t.id, onClick:()=>setTab(t.id), onMouseDown:t.id==="home"?()=>{lp.current=setTimeout(()=>setAo(true),1500)}:undefined, onMouseUp:t.id==="home"?()=>clearTimeout(lp.current):undefined, onTouchStart:t.id==="home"?()=>{lp.current=setTimeout(()=>setAo(true),1500)}:undefined, onTouchEnd:t.id==="home"?()=>clearTimeout(lp.current):undefined, style: { flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4 } },
        React.createElement("span", { style: { fontSize:20,filter:tab===t.id?"none":"grayscale(1) opacity(0.4)" } }, t.icon),
        React.createElement("span", { style: { fontSize:9,color:tab===t.id?C.gold:C.muted,fontFamily:"Courier New,monospace" } }, t.label)
      ))
    )
  );
}

window.App = App;
