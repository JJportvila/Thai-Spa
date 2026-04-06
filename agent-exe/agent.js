#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn, execFile } = require('node:child_process');

const APP_NAME = 'StretPOS-Agent';
const DATA_DIR = path.join(process.env.ProgramData || 'C:\\ProgramData', APP_NAME);
const LOG_DIR = path.join(DATA_DIR, 'logs');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const STATE_PATH = path.join(DATA_DIR, 'state.json');
const LOCAL_ORDERS_PATH = path.join(DATA_DIR, 'local-orders.json');
const LOCAL_PRODUCTS_PATH = path.join(DATA_DIR, 'local-products.json');
const APP_WEB_DIR = path.join(__dirname, 'app-web');
const UI_PORT = 9195;
const RTSP_PROXY_PORT = 9194;

const defaultConfig = {
  accountId: '',
  apiBase: 'https://essvu.com',
  enrollToken: '',
  apiKey: '',
  rtspUrl: '',
  vendor: 'GENERIC',
  heartbeatSeconds: 30,
};

const state = {
  startedAt: new Date().toISOString(),
  tunnelUrl: '',
  lastHeartbeatAt: '',
  lastSyncAt: '',
  syncPendingCount: 0,
  syncFailedCount: 0,
  lastError: '',
  cloudflared: false,
  loop: 'idle',
};

const INLINE_HTML = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>StretPOS Agent</title>
  <style>
    body{font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;padding:24px}
    .card{max-width:1080px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    label{font-size:12px;color:#334155;display:block;margin-bottom:6px}
    input,select{height:36px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px;background:#fff}
    input{width:100%}
    .actions{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}
    button{height:36px;border:0;border-radius:8px;padding:0 14px;color:#fff;background:#0284c7;font-weight:700;cursor:pointer}
    .secondary{background:#0f172a}
    .ghost{background:#475569}
    pre{background:#0f172a;color:#fff;padding:12px;border-radius:8px;font-size:12px;font-family:monospace;overflow:auto}
    .hint{font-size:12px;color:#64748b}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{border-bottom:1px solid #e2e8f0;padding:8px 6px;text-align:left;vertical-align:top}
    .mono{font-family:ui-monospace,Consolas,monospace}
    .thumb{width:84px;height:56px;object-fit:cover;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer}
    .preview{max-width:100%;max-height:70vh;border:1px solid #cbd5e1;border-radius:8px}
    #viewer{position:fixed;inset:0;background:rgba(2,6,23,.75);display:none;align-items:center;justify-content:center;padding:24px}
    .pos-grid{display:grid;grid-template-columns:2fr 1fr;gap:14px}
    .box{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#fff}
    .keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .key{height:46px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;border-radius:8px;font-weight:700;cursor:pointer}
    .pay-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .pay-btn{height:36px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font-weight:700}
    .pay-btn.active{background:#0ea5e9;color:#fff;border-color:#0284c7}
  </style>
</head>
<body>
  <div class="card">
    <h2>StretPOS Agent Local Settings</h2>
    <p class="hint">All camera/sync parameters are edited in EXE. Web only receives synced results.</p>
    <div class="grid">
      <div><label>Account ID</label><input id="accountId" /></div>
      <div><label>API Base</label><input id="apiBase" /></div>
      <div><label>Enroll Token</label><input id="enrollToken" /></div>
      <div><label>API Key (optional)</label><input id="apiKey" /></div>
      <div><label>RTSP URL</label><input id="rtspUrl" /></div>
      <div><label>Vendor</label><input id="vendor" /></div>
      <div><label>Heartbeat Seconds</label><input id="heartbeatSeconds" type="number" min="10" /></div>
    </div>
    <div class="actions">
      <button id="saveBtn">Save Settings</button>
      <button id="startupBtn" class="secondary">Enable Auto Start</button>
      <button id="refreshBtn" class="ghost">Refresh</button>
    </div>
    <p class="hint">Status API: <a href="http://127.0.0.1:${UI_PORT}/api/status" target="_blank">/api/status</a></p>
    <pre id="status">loading...</pre>
  </div>

  <div class="card">
    <h2>Receipt Image Lookup</h2>
    <p class="hint">Search by receipt/cashier text. Click thumbnail to open full image.</p>
    <div class="actions">
      <input id="queryKeyword" placeholder="keyword / receipt number" style="max-width:320px" />
      <button id="queryBtn">Search</button>
      <button id="queryImageOnlyBtn" class="secondary">Image Only</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Receipt No</th>
          <th>Time</th>
          <th>Amount</th>
          <th>Capture</th>
          <th>Image</th>
        </tr>
      </thead>
      <tbody id="ordersBody">
        <tr><td colspan="5" class="hint">No data</td></tr>
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>Offline Checkout (Test)</h2>
    <p class="hint">Local-first POS: add products, collect payment, capture image, then auto-sync when online.</p>
    <div class="pos-grid">
      <div class="box">
        <div class="actions">
          <input id="productSearch" placeholder="Search product / barcode" style="max-width:260px" />
          <button id="refreshProductsBtn" class="ghost">Refresh Products</button>
          <input id="saleTitle" placeholder="Product name" style="max-width:260px" />
          <input id="saleCode" placeholder="Code" style="max-width:120px" />
          <input id="salePrice" type="number" min="0" step="0.01" placeholder="Price VT" style="max-width:130px" />
          <input id="saleQty" type="number" min="1" step="1" value="1" style="max-width:90px" />
          <select id="salePay" style="display:none">
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="CHECK">Check</option>
            <option value="STRET_PAY">E-Pay</option>
          </select>
          <button id="addCartBtn">Add Item</button>
          <button id="clearCartBtn" class="ghost">Clear Cart</button>
        </div>
        <table>
          <thead>
            <tr><th>Code</th><th>Name</th><th>Price</th><th></th></tr>
          </thead>
          <tbody id="productResultsBody">
            <tr><td colspan="4" class="hint">No products</td></tr>
          </tbody>
        </table>
        <table>
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr>
          </thead>
          <tbody id="cartBody">
            <tr><td colspan="5" class="hint">Cart is empty</td></tr>
          </tbody>
        </table>
        <div class="hint" id="cartSummary">Cart Total: 0 VT</div>
      </div>
      <div class="box">
        <div class="hint">Payment Method</div>
        <div class="pay-row" style="margin-top:8px">
          <button id="payCash" class="pay-btn active">Cash</button>
          <button id="payCard" class="pay-btn">Card</button>
          <button id="payCheck" class="pay-btn">Check</button>
          <button id="payEpay" class="pay-btn">E-Pay</button>
        </div>
        <div style="margin-top:12px" class="hint">Received Amount</div>
        <input id="tenderedInput" value="0" readonly />
        <div class="hint" id="changeSummary" style="margin-top:8px">Change: 0 VT</div>
        <div class="keypad" style="margin-top:10px">
          <button class="key" data-key="1">1</button><button class="key" data-key="2">2</button><button class="key" data-key="3">3</button>
          <button class="key" data-key="4">4</button><button class="key" data-key="5">5</button><button class="key" data-key="6">6</button>
          <button class="key" data-key="7">7</button><button class="key" data-key="8">8</button><button class="key" data-key="9">9</button>
          <button class="key" data-key="00">00</button><button class="key" data-key="0">0</button><button class="key" data-key="del">鈱?/button>
          <button class="key" data-key="clear">C</button><button id="saleBtn" class="key" style="grid-column:span 2;background:#0284c7;color:#fff">Checkout</button>
        </div>
        <button id="syncBtn" class="secondary" style="margin-top:10px;width:100%">Sync Now</button>
      </div>
    </div>
    <table style="margin-top:12px">
      <thead>
        <tr><th>Receipt No</th><th>Amount</th><th>Capture</th><th>Sync</th><th>Next Retry</th><th>Error</th><th>Action</th></tr>
      </thead>
      <tbody id="localOrdersBody">
        <tr><td colspan="7" class="hint">No local order</td></tr>
      </tbody>
    </table>
    <div class="actions">
      <input id="refundReceiptInput" placeholder="Receipt No for refund" style="max-width:220px" />
      <button id="refundBtn" class="ghost">Refund by Receipt</button>
    </div>
  </div>

  <div id="viewer" onclick="hideViewer()">
    <img id="viewerImage" class="preview" alt="preview" />
  </div>

  <script>
    const fields=['accountId','apiBase','enrollToken','apiKey','rtspUrl','vendor','heartbeatSeconds'];
    function fill(cfg){fields.forEach((k)=>{const el=document.getElementById(k);if(el)el.value=cfg&&cfg[k]!=null?cfg[k]:'';});}
    function read(){const data={};fields.forEach((k)=>{const el=document.getElementById(k);data[k]=el?el.value:'';});return data;}
    function vt(v){const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString()+' VT':'0 VT'}
    function esc(v){return String(v||'').replace(/[&<>'"]/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
    function showViewer(src){const root=document.getElementById('viewer');const img=document.getElementById('viewerImage');img.src=src;root.style.display='flex';}
    function hideViewer(){const root=document.getElementById('viewer');const img=document.getElementById('viewerImage');img.src='';root.style.display='none';}
    window.hideViewer = hideViewer;
    let productCatalog = [];
    async function loadProducts(){
      const res = await fetch('/api/local/products?limit=2000');
      const data = await res.json();
      if(data && data.ok && Array.isArray(data.products) && data.products.length){
        productCatalog = data.products;
      }else if(!productCatalog.length){
        productCatalog = [
          { code:'P-001', barcode:'678123456789', title:'Vanuatu Water 500ml', price:200, stock:240 },
          { code:'P-002', barcode:'678987654321', title:'Biscuits 100g', price:180, stock:120 },
          { code:'P-003', barcode:'678555444333', title:'Tusker Beer', price:350, stock:500 }
        ];
      }
      renderProducts();
    }
    async function refreshProducts(){
      const res = await fetch('/api/local/products/refresh', { method:'POST' });
      const data = await res.json();
      if(!data.ok){ alert(data.message || 'Refresh products failed'); return; }
      productCatalog = Array.isArray(data.products) ? data.products : [];
      renderProducts();
    }
    const cart = [];
    let tenderedText = '0';
    let selectedPayment = 'CASH';
    function cartTotal(){ return cart.reduce((s,i)=>s + Number(i.price||0) * Number(i.quantity||0), 0); }
    function getTendered(){ return Math.max(0, Number(tenderedText || 0)); }
    function updateChange(){
      const total = cartTotal();
      const tendered = getTendered();
      const change = Math.max(0, tendered - total);
      const summary = selectedPayment === 'CASH'
        ? ('Change: ' + vt(change))
        : ('To Charge: ' + vt(total));
      document.getElementById('tenderedInput').value = vt(tendered).replace(' VT','');
      document.getElementById('changeSummary').textContent = summary;
    }
    function setPayment(method){
      selectedPayment = method;
      document.getElementById('salePay').value = method;
      ['payCash','payCard','payCheck','payEpay'].forEach((id)=>document.getElementById(id).classList.remove('active'));
      if(method==='CASH') document.getElementById('payCash').classList.add('active');
      if(method==='CARD') document.getElementById('payCard').classList.add('active');
      if(method==='CHECK') document.getElementById('payCheck').classList.add('active');
      if(method==='STRET_PAY') document.getElementById('payEpay').classList.add('active');
      updateChange();
    }
    function onKeypad(key){
      if(key==='clear'){ tenderedText='0'; updateChange(); return; }
      if(key==='del'){
        tenderedText = tenderedText.length <= 1 ? '0' : tenderedText.slice(0,-1);
        updateChange();
        return;
      }
      if(tenderedText==='0') tenderedText = '';
      tenderedText += key;
      const n = Number(tenderedText);
      tenderedText = Number.isFinite(n) ? String(n) : '0';
      updateChange();
    }
    function renderProducts(){
      const body = document.getElementById('productResultsBody');
      const q = String(document.getElementById('productSearch').value || '').trim().toLowerCase();
      const rows = productCatalog
        .filter((p)=> !q || p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || String(p.barcode||'').toLowerCase().includes(q))
        .slice(0,10);
      if(!rows.length){ body.innerHTML='<tr><td colspan="4" class="hint">No products</td></tr>'; return; }
      body.innerHTML = rows.map((p)=>'<tr>'
        + '<td class="mono">'+esc(p.code)+'<div class="hint">'+esc(p.barcode||'')+'</div></td>'
        + '<td>'+esc(p.title)+'<div class="hint">Stock: '+Number(p.stock||0)+'</div></td>'
        + '<td>'+vt(p.price)+'</td>'
        + '<td><button data-pick=\"'+esc(p.code)+'\" class=\"ghost\" style=\"height:28px;padding:0 10px\">Add</button></td>'
        + '</tr>').join('');
      body.querySelectorAll('button[data-pick]').forEach((btn)=>{
        btn.addEventListener('click',()=>{
          const code = btn.getAttribute('data-pick') || '';
          const item = productCatalog.find((x)=>x.code===code);
          if(!item) return;
          document.getElementById('saleCode').value = item.code || '';
          document.getElementById('saleTitle').value = item.title;
          document.getElementById('salePrice').value = String(item.price);
          document.getElementById('saleQty').value = '1';
          addItemToCart();
        });
      });
    }
    function renderCart(){
      const body=document.getElementById('cartBody');
      if(!cart.length){
        body.innerHTML='<tr><td colspan="5" class="hint">Cart is empty</td></tr>';
      }else{
        body.innerHTML=cart.map((r,idx)=>{
          const line=Number(r.price||0)*Number(r.quantity||0);
          return '<tr>'
            + '<td>'+esc(r.title)+'</td>'
            + '<td>'+Number(r.quantity||0)+'</td>'
            + '<td>'+vt(r.price)+'</td>'
            + '<td>'+vt(line)+'</td>'
            + '<td><button data-remove=\"'+idx+'\" class=\"ghost\" style=\"height:28px;padding:0 10px\">Remove</button></td>'
            + '</tr>';
        }).join('');
        body.querySelectorAll('button[data-remove]').forEach((btn)=>{
          btn.addEventListener('click',()=>{ const i=Number(btn.getAttribute('data-remove')||'-1'); if(i>=0){ cart.splice(i,1); renderCart(); }});
        });
      }
      document.getElementById('cartSummary').textContent='Cart Total: '+vt(cartTotal());
      updateChange();
    }
    function addItemToCart(){
      const code=(document.getElementById('saleCode').value||'').trim();
      const title=(document.getElementById('saleTitle').value||'').trim() || 'ITEM';
      const price=Math.max(0, Number(document.getElementById('salePrice').value || 0));
      const qty=Math.max(1, Number(document.getElementById('saleQty').value || 1));
      const found=cart.find((x)=>(code && x.code===code) || (x.title.toLowerCase()===title.toLowerCase() && Number(x.price||0)===price));
      if(found){ found.quantity += qty; }
      else{
        const source = productCatalog.find((x)=> (code && x.code===code) || x.title.toLowerCase()===title.toLowerCase());
        cart.push({
          id:(source && source.code) || ('LOCAL-ITEM-'+Date.now()),
          code:(source && source.code) || code || '',
          barcode:(source && source.barcode) || '',
          title,
          quantity: qty,
          price
        });
      }
      renderCart();
    }
    function clearCart(){ cart.splice(0,cart.length); tenderedText='0'; renderCart(); }

    async function refresh(){
      const res=await fetch('/api/status');
      const data=await res.json();
      fill(data.config||{});
      document.getElementById('status').textContent=JSON.stringify(data,null,2);
    }

    async function queryOrders(withImage){
      const keyword = (document.getElementById('queryKeyword').value || '').trim();
      const qs = new URLSearchParams({ limit:'50' });
      if (keyword) qs.set('keyword', keyword);
      if (withImage) qs.set('withImage', 'true');
      const body=document.getElementById('ordersBody');
      body.innerHTML='<tr><td colspan="5" class="hint">Loading...</td></tr>';
      const res = await fetch('/api/order-images?'+qs.toString());
      const data = await res.json();
      if(!data.ok){ body.innerHTML='<tr><td colspan="5" class="hint">'+esc(data.message||'Query failed')+'</td></tr>'; return; }
      const rows = Array.isArray(data.records) ? data.records : [];
      if(!rows.length){ body.innerHTML='<tr><td colspan="5" class="hint">No records</td></tr>'; return; }
      body.innerHTML = rows.map((r)=>{
        const img = r.nvrPhotoDataUrl ? '<img class="thumb" src="'+esc(r.nvrPhotoDataUrl)+'" data-img="'+esc(r.nvrPhotoDataUrl)+'" />' : '<span class="hint">No image</span>';
        return '<tr>'
          + '<td class="mono">'+esc(r.receiptNo)+'</td>'
          + '<td>'+esc((r.printedAt||'').replace('T',' ').slice(0,19))+'</td>'
          + '<td>'+vt(r.total)+'</td>'
          + '<td>'+esc(r.nvrCaptureStatus||'-')+'</td>'
          + '<td>'+img+'</td>'
          + '</tr>';
      }).join('');
      body.querySelectorAll('img.thumb[data-img]').forEach((el)=>{el.addEventListener('click',(e)=>{e.stopPropagation();showViewer(el.getAttribute('data-img')||'');});});
    }

    async function loadLocalOrders(){
      const body=document.getElementById('localOrdersBody');
      body.innerHTML='<tr><td colspan="7" class="hint">Loading...</td></tr>';
      const res=await fetch('/api/local/orders?limit=80');
      const data=await res.json();
      if(!data.ok){ body.innerHTML='<tr><td colspan="7" class="hint">'+esc(data.message||'Load failed')+'</td></tr>'; return; }
      const rows=Array.isArray(data.orders)?data.orders:[];
      if(!rows.length){ body.innerHTML='<tr><td colspan="7" class="hint">No local order</td></tr>'; return; }
      body.innerHTML=rows.map((r)=>{
        const err = r.lastSyncError ? esc(r.lastSyncError).slice(0,80) : '-';
        const retryAt = r.syncStatus === 'SYNCED' ? '-' : esc(String(r.nextRetryAt || '').replace('T',' ').slice(0,19) || '-');
        const canRefund = r.kind !== 'REFUND' && !r.refunded;
        const action = canRefund
          ? '<button data-refund=\"'+esc(r.receiptNo||'')+'\" class=\"ghost\" style=\"height:28px;padding:0 10px\">Refund</button>'
          : '<span class=\"hint\">'+(r.kind==='REFUND'?'Refund':'-')+'</span>';
        return '<tr>'
          + '<td class="mono">'+esc(r.receiptNo||'')+'</td>'
          + '<td>'+vt(r.total)+'</td>'
          + '<td>'+esc(r.nvrCaptureStatus||'-')+'</td>'
          + '<td>'+esc(r.syncStatus||'-')+'</td>'
          + '<td>'+retryAt+'</td>'
          + '<td>'+err+'</td>'
          + '<td>'+action+'</td>'
          + '</tr>';
      }).join('');
      body.querySelectorAll('button[data-refund]').forEach((btn)=>{
        btn.addEventListener('click',()=>refundReceipt(btn.getAttribute('data-refund')||''));
      });
    }

    async function createSale(){
      if(!cart.length){ addItemToCart(); }
      if(!cart.length){ alert('Cart is empty'); return; }
      const paymentMethod=(document.getElementById('salePay').value||'CASH');
      const totalAmount = cartTotal();
      const tendered = getTendered();
      if(paymentMethod==='CASH' && tendered < totalAmount){
        alert('Received amount is less than total.');
        return;
      }
      const totalQty=cart.reduce((s,i)=>s+Number(i.quantity||0),0);
      const payload={ items:[...cart], itemCount: totalQty, total: totalAmount, paymentMethod, paidAmount: tendered, changeAmount: Math.max(0, tendered-totalAmount) };
      const res=await fetch('/api/local/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await res.json();
      if(!data.ok){ alert(data.message||'Create failed'); return; }
      clearCart();
      await loadProducts();
      await loadLocalOrders();
      await queryOrders(false);
      await refresh();
    }

    async function syncNow(){
      const res=await fetch('/api/local/sync-now',{method:'POST'});
      const data=await res.json();
      if(!data.ok){ alert(data.message||'Sync failed'); return; }
      try{ await refreshProducts(); }catch{}
      await loadLocalOrders();
      await queryOrders(false);
      await refresh();
    }

    async function refundReceipt(receiptNo){
      const target = String(receiptNo || document.getElementById('refundReceiptInput').value || '').trim();
      if(!target){ alert('Please input receipt no'); return; }
      const res=await fetch('/api/local/refund',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ receiptNo: target })});
      const data=await res.json();
      if(!data.ok){ alert(data.message||'Refund failed'); return; }
      document.getElementById('refundReceiptInput').value='';
      await loadProducts();
      await loadLocalOrders();
      await queryOrders(false);
      await refresh();
    }

    document.getElementById('saveBtn').onclick=async()=>{ await fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(read())}); await refresh(); };
    document.getElementById('startupBtn').onclick=async()=>{ await fetch('/api/startup',{method:'POST'}); await refresh(); };
    document.getElementById('refreshBtn').onclick=refresh;
    document.getElementById('queryBtn').onclick=()=>queryOrders(false);
    document.getElementById('queryImageOnlyBtn').onclick=()=>queryOrders(true);
    document.getElementById('addCartBtn').onclick=addItemToCart;
    document.getElementById('saleBtn').onclick=createSale;
    document.getElementById('clearCartBtn').onclick=clearCart;
    document.getElementById('syncBtn').onclick=syncNow;
    document.getElementById('refundBtn').onclick=()=>refundReceipt('');
    document.getElementById('payCash').onclick=()=>setPayment('CASH');
    document.getElementById('payCard').onclick=()=>setPayment('CARD');
    document.getElementById('payCheck').onclick=()=>setPayment('CHECK');
    document.getElementById('payEpay').onclick=()=>setPayment('STRET_PAY');
    document.querySelectorAll('.key[data-key]').forEach((btn)=>btn.addEventListener('click',()=>onKeypad(btn.getAttribute('data-key')||'')));
    document.getElementById('productSearch').addEventListener('input',renderProducts);
    document.getElementById('refreshProductsBtn').onclick=refreshProducts;
    document.getElementById('queryKeyword').addEventListener('keydown',(e)=>{ if(e.key==='Enter') queryOrders(false); });
    document.getElementById('refundReceiptInput').addEventListener('keydown',(e)=>{ if(e.key==='Enter') refundReceipt(''); });

    loadProducts();
    setPayment('CASH');
    renderCart();
    refresh();
    queryOrders(false);
    loadLocalOrders();
    setInterval(refresh,4000);
    setInterval(loadLocalOrders,7000);
    setInterval(loadProducts,30000);
  </script>
</body>
</html>`;
const LOG_PATH = path.join(DATA_DIR, 'agent.log');
const logLine = (msg) => {
  try {
    fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`, 'utf8');
  } catch {}
};

const ensureDirs = () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });
};

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

const writeJson = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
};

const readLocalOrders = () => readJson(LOCAL_ORDERS_PATH, []);
const readLocalProducts = () => readJson(LOCAL_PRODUCTS_PATH, []);

const saveLocalOrders = (orders) => {
  writeJson(LOCAL_ORDERS_PATH, Array.isArray(orders) ? orders.slice(0, 2000) : []);
  refreshSyncStats();
};

const saveLocalProducts = (products) => {
  writeJson(LOCAL_PRODUCTS_PATH, Array.isArray(products) ? products.slice(0, 5000) : []);
};

const listLocalOrders = (limit = 100) => {
  const n = Math.min(500, Math.max(1, Number(limit || 100)));
  return readLocalOrders()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, n);
};

const listLocalProducts = (limit = 2000) => {
  const n = Math.min(5000, Math.max(1, Number(limit || 2000)));
  return readLocalProducts().slice(0, n);
};

const applyLocalStockChange = (items, direction = 'SALE') => {
  const sourceItems = Array.isArray(items) ? items : [];
  if (sourceItems.length === 0) return;
  const products = readLocalProducts().map((p) => ({ ...p }));
  const matchProduct = (item) =>
    products.find((p) => {
      const code = String(item.code || item.productId || item.id || '').trim().toLowerCase();
      const barcode = String(item.barcode || '').trim().toLowerCase();
      const title = String(item.title || item.name || '').trim().toLowerCase();
      return (
        (code && String(p.code || p.id || '').trim().toLowerCase() === code) ||
        (barcode && String(p.barcode || '').trim().toLowerCase() === barcode) ||
        (title && String(p.title || p.name || '').trim().toLowerCase() === title)
      );
    });
  for (const item of sourceItems) {
    const qty = Math.max(0, Number(item.quantity || 0));
    if (qty <= 0) continue;
    const matched = matchProduct(item);
    if (!matched) continue;
    if (direction === 'REFUND') {
      matched.stock = Math.max(0, Number(matched.stock || 0) + qty);
    } else {
      matched.stock = Math.max(0, Number(matched.stock || 0) - qty);
    }
  }
  saveLocalProducts(products);
};

const nextLocalOrderId = () => {
  localOrderIdSeed += 1;
  return `LO-${localOrderIdSeed}`;
};

const normalizePaymentMethod = (v) => {
  const x = String(v || '').toUpperCase();
  if (x === 'CARD' || x === 'CHECK' || x === 'STRET_PAY') return x;
  return 'CASH';
};

const buildLocalReceiptNo = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const ymd = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const hms = `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `LX-${ymd}-${hms}`;
};

const calcSyncStats = () => {
  const orders = readLocalOrders();
  const pending = orders.filter((item) => item.syncStatus !== 'SYNCED').length;
  const failed = orders.filter((item) => item.syncStatus === 'FAILED').length;
  return { pending, failed };
};

const refreshSyncStats = () => {
  const stats = calcSyncStats();
  updateState({
    syncPendingCount: stats.pending,
    syncFailedCount: stats.failed,
  });
};

let config = defaultConfig;
let rtspProc = null;
let tunnelProc = null;
let localOrderIdSeed = Date.now();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const p = execFile(cmd, args, { windowsHide: true, ...opts }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
        return;
      }
      resolve(String(stdout || '').trim());
    });
    p.unref?.();
  });

const now = () => new Date().toISOString();

const updateState = (patch) => {
  Object.assign(state, patch);
  writeJson(STATE_PATH, state);
  if (patch.lastError) logLine(String(patch.lastError));
};

const postJson = async (url, headers, body, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text().catch(() => '');
    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    return text;
  } finally {
    clearTimeout(timer);
  }
};

const getJson = async (url, headers, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await response.text().catch(() => '');
    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timer);
  }
};

const captureRtspFrame = (rtspUrl) =>
  new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-rtsp_transport',
      'tcp',
      '-i',
      rtspUrl,
      '-frames:v',
      '1',
      '-f',
      'image2',
      '-vcodec',
      'mjpeg',
      'pipe:1',
    ], { windowsHide: true });
    const chunks = [];
    const errs = [];
    const timer = setTimeout(() => {
      try { ff.kill('SIGKILL'); } catch {}
      reject(new Error('capture timeout'));
    }, 12000);
    ff.stdout.on('data', (c) => chunks.push(c));
    ff.stderr.on('data', (c) => errs.push(String(c)));
    ff.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    ff.on('close', (code) => {
      clearTimeout(timer);
      const buffer = Buffer.concat(chunks);
      if (code === 0 && buffer.length > 16) {
        resolve(buffer);
        return;
      }
      reject(new Error(errs.join(' ') || `ffmpeg exit ${code}`));
    });
  });

const ensureRtspProxy = () => {
  if (rtspProc && !rtspProc.killed) return;
  const out = fs.openSync(path.join(LOG_DIR, 'rtsp-proxy.out.log'), 'a');
  const err = fs.openSync(path.join(LOG_DIR, 'rtsp-proxy.err.log'), 'a');
  rtspProc = spawn('ffmpeg', ['-version'], { windowsHide: true });
  rtspProc.on('error', () => {
    updateState({ lastError: 'ffmpeg not found' });
  });
  rtspProc.on('close', () => {});

  const proxyScript = `
const http = require('http');
const { spawn } = require('child_process');
const HOST='127.0.0.1', PORT=${RTSP_PROXY_PORT};
const send=(res,s,b)=>{res.writeHead(s,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(JSON.stringify(b));};
const cap=(u)=>new Promise((ok,ng)=>{const ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-rtsp_transport','tcp','-i',u,'-frames:v','1','-f','image2','-vcodec','mjpeg','pipe:1']);const ch=[];const er=[];const t=setTimeout(()=>{try{ff.kill('SIGKILL')}catch{};ng(new Error('timeout'))},10000);ff.stdout.on('data',d=>ch.push(d));ff.stderr.on('data',d=>er.push(String(d)));ff.on('close',c=>{clearTimeout(t);const b=Buffer.concat(ch);if(c===0&&b.length>16)ok(b);else ng(new Error(er.join(' ')||('ffmpeg '+c)));});ff.on('error',ng);});
http.createServer(async(req,res)=>{if(!req.url){send(res,400,{ok:false});return;}const u=new URL(req.url,'http://127.0.0.1:${RTSP_PROXY_PORT}');if(u.pathname==='/health'){send(res,200,{ok:true,at:new Date().toISOString()});return;}if(u.pathname!=='/snapshot'){send(res,404,{ok:false});return;}const rtsp=(u.searchParams.get('rtsp')||'').trim();if(!/^rtsp:\\/\\//i.test(rtsp)){send(res,400,{ok:false,message:'invalid rtsp'});return;}try{const jpg=await cap(rtsp);res.writeHead(200,{'Content-Type':'image/jpeg','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(jpg);}catch(e){send(res,502,{ok:false,message:String(e.message||e)});}}).listen(PORT,HOST);
`;
  const runner = path.join(DATA_DIR, 'rtsp-proxy-inline.cjs');
  fs.writeFileSync(runner, proxyScript, 'utf8');
  rtspProc = spawn('node', [runner], { detached: false, stdio: ['ignore', out, err], windowsHide: true });
  rtspProc.on('error', (e) => updateState({ lastError: `rtsp-proxy start failed: ${e.message}` }));
};

const stopTunnel = () => {
  if (!tunnelProc) return;
  try {
    tunnelProc.kill();
  } catch {}
  tunnelProc = null;
};

const stopRtspProxy = () => {
  if (!rtspProc) return;
  try {
    rtspProc.kill();
  } catch {}
  rtspProc = null;
};

const startTunnel = async () => {
  stopTunnel();
  const outPath = path.join(LOG_DIR, 'tunnel.out.log');
  const errPath = path.join(LOG_DIR, 'tunnel.err.log');
  fs.writeFileSync(outPath, '', 'utf8');
  fs.writeFileSync(errPath, '', 'utf8');
  const out = fs.openSync(outPath, 'a');
  const err = fs.openSync(errPath, 'a');

  let cmd = 'cloudflared';
  let args = ['tunnel', '--url', `http://127.0.0.1:${RTSP_PROXY_PORT}`, '--no-autoupdate'];
  let pattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
  try {
    await run('cloudflared', ['--version']);
    updateState({ cloudflared: true });
  } catch {
    cmd = 'cmd.exe';
    args = ['/c', 'npx -y localtunnel --port 9194 --subdomain bright-comics-shop'];
    pattern = /https:\/\/[a-z0-9-]+\.loca\.lt/i;
    updateState({ cloudflared: false });
  }

  tunnelProc = spawn(cmd, args, { detached: false, stdio: ['ignore', out, err], windowsHide: true });
  for (let i = 0; i < 50; i++) {
    await sleep(1000);
    const log = `${fs.readFileSync(outPath, 'utf8')}\n${fs.readFileSync(errPath, 'utf8')}`;
    const match = log.match(pattern);
    if (match && match[0]) {
      updateState({ tunnelUrl: match[0], lastError: '' });
      return match[0];
    }
    if (tunnelProc.exitCode != null) break;
  }
  throw new Error('tunnel url not detected');
};

const pushHeartbeat = async (mode) => {
  if (!config.accountId || !config.apiBase || !state.tunnelUrl) return;
  const headers = {};
  if (config.apiKey) headers['x-api-key'] = config.apiKey;
  else if (config.enrollToken) headers['x-enroll-token'] = config.enrollToken;
  else throw new Error('Missing apiKey or enrollToken');

  await postJson(
    `${String(config.apiBase).replace(/\/$/, '')}/api/merchant-proxy`,
    headers,
    {
      mode,
      accountId: String(config.accountId).toUpperCase(),
      proxyUrl: state.tunnelUrl,
      rtspUrl: config.rtspUrl || '',
      source: 'NVR',
      vendor: config.vendor || 'GENERIC',
      host: os.hostname(),
      agentId: `${os.hostname()}-${process.pid}`,
    }
  );
  updateState({ lastHeartbeatAt: now(), lastError: '' });
};

let loopRunning = false;
const startLoop = async () => {
  if (loopRunning) return;
  loopRunning = true;
  while (true) {
    try {
      updateState({ loop: 'starting' });
      ensureRtspProxy();
      const url = await startTunnel();
      updateState({ loop: 'running', tunnelUrl: url });
      await pushHeartbeat('register');
      while (true) {
        await sleep(Math.max(10, Number(config.heartbeatSeconds || 30)) * 1000);
        if (!tunnelProc || tunnelProc.exitCode != null) break;
        await pushHeartbeat('heartbeat');
      }
    } catch (error) {
      updateState({ loop: 'error', lastError: String(error.message || error) });
      await sleep(3000);
    }
  }
};

const buildAgentHeaders = () => {
  const headers = {};
  if (config.apiKey) headers['x-api-key'] = config.apiKey;
  else if (config.enrollToken) headers['x-enroll-token'] = config.enrollToken;
  return headers;
};

let taskWorkerRunning = false;
const startCaptureTaskWorker = async () => {
  if (taskWorkerRunning) return;
  taskWorkerRunning = true;
  while (true) {
    try {
      if (!config.accountId || !config.apiBase || !config.rtspUrl) {
        await sleep(3000);
        continue;
      }
      const headers = buildAgentHeaders();
      if (!headers['x-api-key'] && !headers['x-enroll-token']) {
        await sleep(3000);
        continue;
      }
      const apiBase = String(config.apiBase).replace(/\/$/, '');
      const accountId = String(config.accountId).toUpperCase();
      const next = await getJson(`${apiBase}/api/capture-task?accountId=${encodeURIComponent(accountId)}`, headers, 10000);
      const job = next && next.job ? next.job : null;
      if (!job || !job.id || !job.receiptNo) {
        await sleep(1500);
        continue;
      }
      let success = false;
      let message = '';
      let imageDataUrl = '';
      try {
        const jpeg = await captureRtspFrame(String(config.rtspUrl));
        imageDataUrl = `data:image/jpeg;base64,${Buffer.from(jpeg).toString('base64')}`;
        success = true;
        message = 'captured by local exe';
      } catch (e) {
        success = false;
        message = `capture failed in local exe: ${String(e.message || e)}`;
      }
      await postJson(
        `${apiBase}/api/capture-task`,
        headers,
        {
          accountId,
          jobId: String(job.id),
          receiptNo: String(job.receiptNo),
          success,
          message,
          imageDataUrl,
        },
        20000
      );
      if (success) {
        updateState({ lastError: '', lastHeartbeatAt: now() });
      } else {
        updateState({ lastError: message });
      }
      await sleep(500);
    } catch (error) {
      updateState({ lastError: `task worker: ${String(error.message || error)}` });
      await sleep(3000);
    }
  }
};

const installStartup = async () => {
  const exePath = process.execPath.endsWith('.exe') ? process.execPath : null;
  const cmd = exePath ? `"${exePath}"` : `"${process.execPath}" "${__filename}"`;
  const taskName = `${APP_NAME}-${String(config.accountId || 'default').toUpperCase()}`;
  await run('schtasks', ['/Delete', '/TN', taskName, '/F']).catch(() => '');
  await run('schtasks', ['/Create', '/TN', taskName, '/SC', 'ONLOGON', '/RL', 'HIGHEST', '/TR', cmd, '/F']);
  return taskName;
};

const send = (res, code, payload, type = 'application/json; charset=utf-8') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.includes('json') ? JSON.stringify(payload) : payload);
};

const parseBody = (req) =>
  new Promise((resolve) => {
    let buf = '';
    req.on('data', (c) => (buf += c));
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        resolve({});
      }
    });
  });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const sendFile = (res, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
    res.end(data);
    return true;
  } catch {
    return false;
  }
};

const fetchOrderImages = async ({ keyword, withImage, limit }) => {
  if (!config.accountId || !config.apiBase) throw new Error('Missing accountId or apiBase');
  const headers = buildAgentHeaders();
  if (!headers['x-api-key'] && !headers['x-enroll-token']) throw new Error('Missing apiKey or enrollToken');
  const params = new URLSearchParams({
    accountId: String(config.accountId).toUpperCase(),
    mode: 'records',
    limit: String(Math.min(100, Math.max(1, Number(limit || 50)))),
  });
  if (keyword) params.set('keyword', String(keyword));
  if (withImage) params.set('withImage', 'true');
  const apiBase = String(config.apiBase).replace(/\/$/, '');
  const result = await getJson(`${apiBase}/api/capture-task?${params.toString()}`, headers, 20000);
  return Array.isArray(result?.records) ? result.records : [];
};

const normalizeCatalog = (list) =>
  (Array.isArray(list) ? list : [])
    .map((item) => ({
      code: String(item.code || item.id || '').trim(),
      barcode: String(item.barcode || '').trim(),
      title: String(item.title || item.name || '').trim(),
      price: Math.max(0, Number(item.price || 0)),
      stock: Math.max(0, Number(item.stock || 0)),
    }))
    .filter((item) => item.code && item.title);

const fetchCloudProducts = async () => {
  if (!config.accountId || !config.apiBase) throw new Error('Missing accountId or apiBase');
  const headers = buildAgentHeaders();
  if (!headers['x-api-key'] && !headers['x-enroll-token']) throw new Error('Missing apiKey or enrollToken');
  const apiBase = String(config.apiBase).replace(/\/$/, '');
  const accountId = String(config.accountId).toUpperCase();
  const result = await getJson(
    `${apiBase}/api/retail-products?accountId=${encodeURIComponent(accountId)}`,
    headers,
    20000
  );
  return normalizeCatalog(result?.products || []);
};

const refreshProductsFromCloud = async () => {
  const products = await fetchCloudProducts();
  if (products.length > 0) {
    saveLocalProducts(products);
  }
  return listLocalProducts(2000);
};

const syncOrderToCloud = async (order) => {
  if (!config.accountId || !config.apiBase) throw new Error('Missing accountId or apiBase');
  const headers = buildAgentHeaders();
  if (!headers['x-api-key'] && !headers['x-enroll-token']) throw new Error('Missing apiKey or enrollToken');
  const apiBase = String(config.apiBase).replace(/\/$/, '');
  await postJson(
    `${apiBase}/api/retail-sync`,
    headers,
    {
      accountId: String(config.accountId).toUpperCase(),
      receiptNo: order.receiptNo,
      printedAt: order.createdAt,
      paymentMethod: normalizePaymentMethod(order.paymentMethod),
      total: Number(order.total || 0),
      itemCount: Number(order.itemCount || 0),
      items: Array.isArray(order.items) ? order.items : [],
      kind: order.kind === 'REFUND' ? 'REFUND' : 'SALE',
      status: 'NORMAL',
      nvrPhotoDataUrl: String(order.nvrPhotoDataUrl || ''),
      nvrCaptureStatus: order.nvrCaptureStatus || 'FAILED',
      nvrCaptureMessage: order.nvrCaptureMessage || '',
      nvrCaptureSource: 'NVR',
      nvrCaptureAt: order.captureAt || order.createdAt,
    },
    30000
  );
  await postJson(
    `${apiBase}/api/retail-stock-sync`,
    headers,
    {
      accountId: String(config.accountId).toUpperCase(),
      receiptNo: order.receiptNo,
      mode: order.kind === 'REFUND' ? 'REFUND' : 'SALE',
      items: Array.isArray(order.items) ? order.items : [],
    },
    30000
  );
};

const patchLocalOrder = (localOrderId, patch) => {
  const orders = readLocalOrders();
  const next = orders.map((item) => (item.localOrderId === localOrderId ? { ...item, ...patch } : item));
  saveLocalOrders(next);
  return next.find((x) => x.localOrderId === localOrderId) || null;
};

const createLocalOrder = async (payload) => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const total = Math.max(0, Number(payload.total || 0));
  const itemCount = Math.max(0, Number(payload.itemCount || items.length || 0));
  const nowAt = now();
  const localOrderId = nextLocalOrderId();
  const receiptNo = String(payload.receiptNo || '').trim() || buildLocalReceiptNo();
  const order = {
    localOrderId,
    receiptNo,
    createdAt: nowAt,
    paymentMethod: normalizePaymentMethod(payload.paymentMethod),
    total,
    itemCount,
    items,
    kind: payload.kind === 'REFUND' ? 'REFUND' : 'SALE',
    sourceReceiptNo: String(payload.sourceReceiptNo || ''),
    nvrPhotoDataUrl: '',
    nvrCaptureStatus: 'PENDING',
    nvrCaptureMessage: 'waiting capture',
    captureAt: '',
    syncStatus: 'PENDING',
    lastSyncError: '',
    syncedAt: '',
    retryCount: 0,
    nextRetryAt: nowAt,
  };
  const all = [order, ...readLocalOrders()];
  saveLocalOrders(all);
  applyLocalStockChange(items, order.kind);

  if (config.rtspUrl) {
    try {
      const jpeg = await captureRtspFrame(String(config.rtspUrl));
      const imageDataUrl = `data:image/jpeg;base64,${Buffer.from(jpeg).toString('base64')}`;
      patchLocalOrder(localOrderId, {
        nvrPhotoDataUrl: imageDataUrl,
        nvrCaptureStatus: 'SUCCESS',
        nvrCaptureMessage: 'captured by local exe',
        captureAt: now(),
      });
    } catch (error) {
      patchLocalOrder(localOrderId, {
        nvrCaptureStatus: 'FAILED',
        nvrCaptureMessage: String(error.message || error),
        captureAt: now(),
      });
    }
  } else {
    patchLocalOrder(localOrderId, {
      nvrCaptureStatus: 'FAILED',
      nvrCaptureMessage: 'rtspUrl not configured',
      captureAt: now(),
    });
  }
  return readLocalOrders().find((x) => x.localOrderId === localOrderId) || order;
};

const createLocalRefundByReceiptNo = async (receiptNo) => {
  const targetReceiptNo = String(receiptNo || '').trim();
  if (!targetReceiptNo) throw new Error('Missing receiptNo');
  const orders = readLocalOrders();
  const source = orders.find((item) => item.receiptNo === targetReceiptNo && item.kind !== 'REFUND');
  if (!source) throw new Error('Source receipt not found');
  const alreadyRefunded = orders.some(
    (item) => item.kind === 'REFUND' && String(item.sourceReceiptNo || '') === targetReceiptNo
  );
  if (alreadyRefunded) throw new Error('Receipt already refunded');
  const refundReceiptNo = `RF-${targetReceiptNo}-${Date.now().toString().slice(-4)}`;
  const refundOrder = await createLocalOrder({
    kind: 'REFUND',
    sourceReceiptNo: targetReceiptNo,
    receiptNo: refundReceiptNo,
    items: Array.isArray(source.items) ? source.items : [],
    total: Number(source.total || 0),
    itemCount: Number(source.itemCount || 0),
    paymentMethod: 'CASH',
  });
  patchLocalOrder(source.localOrderId, { refunded: true, refundedByReceiptNo: refundReceiptNo });
  return refundOrder;
};

let localSyncRunning = false;
const startLocalSyncWorker = async () => {
  if (localSyncRunning) return;
  localSyncRunning = true;
  while (true) {
    try {
      const nowMs = Date.now();
      const pending = readLocalOrders()
        .filter((item) => {
          if (!item || item.syncStatus === 'SYNCED') return false;
          const dueMs = Date.parse(item.nextRetryAt || item.createdAt || '');
          return !Number.isFinite(dueMs) || dueMs <= nowMs;
        })
        .slice(0, 3);
      if (pending.length === 0) {
        await sleep(2000);
        continue;
      }
      for (const item of pending) {
        try {
          patchLocalOrder(item.localOrderId, { syncStatus: 'SYNCING', lastSyncError: '' });
          await syncOrderToCloud(item);
          patchLocalOrder(item.localOrderId, {
            syncStatus: 'SYNCED',
            lastSyncError: '',
            syncedAt: now(),
            lastSyncAt: now(),
          });
          updateState({ lastSyncAt: now() });
        } catch (error) {
          const retryCount = Math.max(0, Number(item.retryCount || 0)) + 1;
          const backoffMs = Math.min(10 * 60 * 1000, Math.pow(2, retryCount) * 1000);
          patchLocalOrder(item.localOrderId, {
            syncStatus: 'FAILED',
            lastSyncError: String(error.message || error),
            retryCount,
            nextRetryAt: new Date(Date.now() + backoffMs).toISOString(),
          });
        }
      }
      await sleep(1200);
    } catch (error) {
      updateState({ lastError: `local sync: ${String(error.message || error)}` });
      await sleep(2500);
    }
  }
};

const runLocalSyncOnce = async () => {
  const pending = readLocalOrders().filter((item) => item.syncStatus !== 'SYNCED').slice(0, 10);
  let success = 0;
  let failed = 0;
  for (const item of pending) {
    try {
      patchLocalOrder(item.localOrderId, { syncStatus: 'SYNCING', lastSyncError: '' });
      await syncOrderToCloud(item);
      patchLocalOrder(item.localOrderId, {
        syncStatus: 'SYNCED',
        lastSyncError: '',
        syncedAt: now(),
        lastSyncAt: now(),
      });
      updateState({ lastSyncAt: now() });
      success += 1;
    } catch (error) {
      const retryCount = Math.max(0, Number(item.retryCount || 0)) + 1;
      patchLocalOrder(item.localOrderId, {
        syncStatus: 'FAILED',
        lastSyncError: String(error.message || error),
        retryCount,
        nextRetryAt: new Date(Date.now() + 3000).toISOString(),
      });
      failed += 1;
    }
  }
  return { ok: true, success, failed, pendingBefore: pending.length };
};

const startUiServer = () => {
  const html = INLINE_HTML;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${UI_PORT}`);
    if (url.pathname === '/agent') return send(res, 200, html, 'text/html; charset=utf-8');
    if (url.pathname === '/' || url.pathname === '/app' || url.pathname.startsWith('/app/')) {
      const entry = path.join(APP_WEB_DIR, 'index.html');
      if (fs.existsSync(entry)) {
        return sendFile(res, entry) || send(res, 500, { ok: false, message: 'app index load failed' });
      }
      return send(res, 404, { ok: false, message: 'app web missing' });
    }
    if (url.pathname.startsWith('/assets/')) {
      const target = path.join(APP_WEB_DIR, url.pathname.replace(/^\//, ''));
      if (target.startsWith(APP_WEB_DIR) && fs.existsSync(target)) {
        return sendFile(res, target) || send(res, 404, { ok: false, message: 'asset missing' });
      }
      return send(res, 404, { ok: false, message: 'asset missing' });
    }
    if (url.pathname === '/api/status') {
      return send(res, 200, {
        ok: true,
        config: { ...defaultConfig, ...config },
        state,
      });
    }
    if (url.pathname === '/api/order-images' && req.method === 'GET') {
      try {
        const records = await fetchOrderImages({
          keyword: url.searchParams.get('keyword') || '',
          withImage: url.searchParams.get('withImage') === 'true',
          limit: Number(url.searchParams.get('limit') || 50),
        });
        return send(res, 200, { ok: true, records });
      } catch (error) {
        return send(res, 500, { ok: false, message: String(error.message || error) });
      }
    }
    if (url.pathname === '/api/local/orders' && req.method === 'GET') {
      const limit = Number(url.searchParams.get('limit') || 100);
      return send(res, 200, { ok: true, orders: listLocalOrders(limit) });
    }
    if (url.pathname === '/api/local/products' && req.method === 'GET') {
      const limit = Number(url.searchParams.get('limit') || 2000);
      return send(res, 200, { ok: true, products: listLocalProducts(limit) });
    }
    if (url.pathname === '/api/local/products/refresh' && req.method === 'POST') {
      try {
        const products = await refreshProductsFromCloud();
        return send(res, 200, { ok: true, products, count: products.length });
      } catch (error) {
        return send(res, 500, { ok: false, message: String(error.message || error) });
      }
    }
    if (url.pathname === '/api/local/checkout' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const order = await createLocalOrder(body || {});
        return send(res, 200, { ok: true, order });
      } catch (error) {
        return send(res, 500, { ok: false, message: String(error.message || error) });
      }
    }
    if (url.pathname === '/api/local/refund' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const order = await createLocalRefundByReceiptNo(String(body.receiptNo || ''));
        return send(res, 200, { ok: true, order });
      } catch (error) {
        return send(res, 500, { ok: false, message: String(error.message || error) });
      }
    }
    if (url.pathname === '/api/local/sync-now' && req.method === 'POST') {
      try {
        const result = await runLocalSyncOnce();
        return send(res, 200, result);
      } catch (error) {
        return send(res, 500, { ok: false, message: String(error.message || error) });
      }
    }
    if (url.pathname === '/api/config' && req.method === 'POST') {
      const body = await parseBody(req);
      config = {
        ...defaultConfig,
        ...config,
        ...body,
        heartbeatSeconds: Math.max(10, Number(body.heartbeatSeconds || config.heartbeatSeconds || 30)),
      };
      writeJson(CONFIG_PATH, config);
      updateState({ lastError: '', loop: 'restarting' });
      stopTunnel();
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/api/startup' && req.method === 'POST') {
      try {
        const taskName = await installStartup();
        return send(res, 200, { ok: true, taskName });
      } catch (error) {
        return send(res, 500, { ok: false, message: String(error.message || error) });
      }
    }
    if (!url.pathname.startsWith('/api/')) {
      const maybeFile = path.join(APP_WEB_DIR, url.pathname.replace(/^\//, ''));
      if (maybeFile.startsWith(APP_WEB_DIR) && fs.existsSync(maybeFile) && fs.statSync(maybeFile).isFile()) {
        return sendFile(res, maybeFile) || send(res, 404, { ok: false, message: 'file missing' });
      }
    }
    return send(res, 404, { ok: false, message: 'Not found' });
  });
  server.listen(UI_PORT, '127.0.0.1', () => {
    const uiUrl = `http://127.0.0.1:${UI_PORT}`;
    logLine(`UI ready ${uiUrl}`);
  });
  server.on('error', (e) => {
    updateState({ lastError: `ui server error: ${String(e.message || e)}` });
  });
};

const bootstrap = () => {
  try {
    ensureDirs();
    config = { ...defaultConfig, ...readJson(CONFIG_PATH, {}) };
    writeJson(CONFIG_PATH, config);
    writeJson(STATE_PATH, state);
    if (!fs.existsSync(LOCAL_ORDERS_PATH)) writeJson(LOCAL_ORDERS_PATH, []);
    if (!fs.existsSync(LOCAL_PRODUCTS_PATH)) {
      writeJson(LOCAL_PRODUCTS_PATH, [
        { code: 'P-001', barcode: '678123456789', title: 'Vanuatu Water 500ml', price: 200, stock: 240 },
        { code: 'P-002', barcode: '678987654321', title: 'Biscuits 100g', price: 180, stock: 120 },
        { code: 'P-003', barcode: '678555444333', title: 'Tusker Beer', price: 350, stock: 500 },
      ]);
    }
    refreshSyncStats();
    startUiServer();
    refreshProductsFromCloud().catch(() => {});
    // Local-first mode: NVR capture and compose are handled directly in EXE.
    // We no longer start tunnel/rtsp-proxy side workers by default.
    updateState({ loop: 'local-only', tunnelUrl: '', cloudflared: false });
    startLocalSyncWorker().catch((e) => updateState({ lastError: String(e.message || e) }));
  } catch (e) {
    updateState({ lastError: `bootstrap failed: ${String(e.message || e)}` });
    setTimeout(() => bootstrap(), 3000);
  }
};

process.on('uncaughtException', (e) => {
  updateState({ lastError: `uncaughtException: ${String(e.message || e)}` });
});
process.on('unhandledRejection', (e) => {
  updateState({ lastError: `unhandledRejection: ${String(e && e.message ? e.message : e)}` });
});

process.on('SIGTERM', () => {
  stopTunnel();
  stopRtspProxy();
  process.exit(0);
});

process.on('SIGINT', () => {
  stopTunnel();
  stopRtspProxy();
  process.exit(0);
});

if (require.main === module) {
  bootstrap();
}

module.exports = { bootstrap };


