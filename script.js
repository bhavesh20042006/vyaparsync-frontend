const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:")
  ? "http://localhost:5000"
  : "https://vyaparsync.onrender.com";  

// =======================================================
// 🛡️ SECURITY HELPERS (XSS PREVENTION)
// =======================================================
function sanitizeHTML(str) {
    if (typeof str !== 'string' && typeof str !== 'number') return str;
    if (typeof DOMPurify !== "undefined") {
        return DOMPurify.sanitize(String(str));
    }
    // Fallback: strictly escape HTML to guarantee XSS prevention if CDN fails
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function escapeAttr(str) {
    if (str == null) return "";
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 🔥 GLOBAL STATE
let cart = [];
try {
    cart = JSON.parse(localStorage.getItem("cart")) || [];
} catch (e) {
    cart = [];
}
let currentProducts = [];  
let currentMarketName = ""; 
let currentWishlist = [];

// 🤝 CAPTURE REFERRAL CODE FROM URL
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (refCode) {
    localStorage.setItem("referralCode", refCode);
    showToast("Special referral detected! Complete signup to claim rewards. 🎁", "info");
}

// 🔴 SOCKET.IO REAL-TIME CONNECTION (CRASH-PROOFED)
let socket;
if (typeof io !== "undefined") {
  socket = io(API_URL);

  socket.on("connect", () => {
    console.log("Connected to server 🔥");
  });

  socket.on("stockUpdated", (product) => {
    console.log("Stock updated 🔴", product);
    const viewType = document.getElementById("current-view")?.getAttribute("data-view");
    if (viewType === "home") loadHome();
    if (viewType === "shop") loadProducts(document.getElementById("current-view").getAttribute("data-shop"));
  });
} else {
  console.log("Socket.io not loaded on this page, skipping real-time connection.");
}

// =======================================================
// 🍞 CUSTOM TOAST NOTIFICATION SYSTEM
// =======================================================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return alert(message); 

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = '✅';
  if (type === "error") icon = '❌';
  if (type === "info") icon = 'ℹ️';

  toast.innerHTML = `<div style="display: flex; align-items: center; gap: 10px; font-size: 15px;">${icon} ${message}</div>`;
  
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add("show"), 10);
  
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// =======================================================
// 🍔 🛍️ HYBRID NAVIGATION UI (AMAZON + SWIGGY)
// =======================================================

function loadHome() {
  const container = document.getElementById("products");
  if (!container) return;

  container.innerHTML = `
    <div id="current-view" data-view="home"></div>
    
    <div style="margin-bottom: 40px; text-align: center; display: flex; justify-content: center;">
        <input type="text" id="searchInput" placeholder="Search for products, shops, or markets... 🔍" onkeyup="delayFilter()" style="width: 100%; max-width: 600px; padding: 18px 25px; font-size: 16px; border-radius: 30px; border: 2px solid rgba(255,106,0,0.2); background: var(--card-bg); color: var(--text-main); outline: none; box-shadow: var(--shadow); transition: var(--transition);" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='rgba(255,106,0,0.2)'">
    </div>

    <div style="margin-bottom: 40px;">
        <h2 style="margin-bottom: 15px; font-size: 24px;">🌍 Explore Local Markets</h2>
        <div id="markets-grid" style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 15px;"></div>
    </div>
    <div>
        <h2 style="margin-bottom: 15px; font-size: 24px; font-weight: 700; text-align: center;">Trending Today</h2>
        <div id="products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 30px;"></div>
    </div>
  `;

  // 🗺️ GPS OR DEFAULT ROUTING
  const savedLat = localStorage.getItem("userLat");
  const savedLng = localStorage.getItem("userLng");

  if (savedLat && savedLng) {
      fetchNearbyMarkets(savedLat, savedLng);
  } else {
      fetchAllMarkets(); // Fallback if they haven't given GPS permission yet
  }

  fetch(`${API_URL}/products`)
    .then(res => res.json())
    .then(products => {
      currentProducts = products; 
      const grid = document.getElementById("products-grid");
      if (!grid) return;
      grid.innerHTML = "";
      if (products.length === 0) grid.innerHTML = "<p>No products available yet.</p>";
      else {
        products.forEach(p => {
          grid.innerHTML += createProductHTML(p);
        });
      }
    });
}


// =======================================================
// 🌍 GEOSPATIAL ENGINE (Location & Distances)
// =======================================================

function getUserLocation() {
    if (navigator.geolocation) {
        document.getElementById("userLocationDisplay").innerText = "Locating satellite... 🛰️";
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Save to local storage so we don't ask every time
                localStorage.setItem("userLat", lat);
                localStorage.setItem("userLng", lng);

                // Reverse Geocode to get a readable street name (OpenStreetMap API)
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await res.json();
                    const area = data.address.suburb || data.address.city_district || data.address.city || "Current Location";
                    document.getElementById("userLocationDisplay").innerText = `${area} 🟢`;
                } catch (e) {
                    document.getElementById("userLocationDisplay").innerText = "GPS Active 🟢";
                }

                showToast("Location updated! Finding markets near you.", "success");
                fetchNearbyMarkets(lat, lng);
            },
            (error) => {
                showToast("Location access denied. Showing all markets.", "error");
                document.getElementById("userLocationDisplay").innerText = "Location Denied ❌";
                fetchAllMarkets();
            }
        );
    } else {
        showToast("Geolocation is not supported by your browser.", "error");
    }
}

function fetchNearbyMarkets(lat, lng) {
    // Fetch markets within 10km (10000 meters)
    fetch(`${API_URL}/products/markets/nearby?lat=${lat}&lng=${lng}&radius=10000`)
        .then(res => res.json())
        .then(markets => {
            renderMarketGrid(markets, true);
        });
}

function fetchAllMarkets() {
    // Old fallback route just grabs string names
    fetch(`${API_URL}/products/markets`)
        .then(res => res.json())
        .then(markets => {
            // Convert simple strings to object format so the renderer works for both
            const formatted = markets.map(m => typeof m === 'string' ? {name: m} : m);
            renderMarketGrid(formatted, false);
        });
}

function renderMarketGrid(markets, isNearby) {
    const grid = document.getElementById("markets-grid");
    if (!grid) return;
    grid.innerHTML = "";
    
    if (markets.length === 0) {
        grid.innerHTML = `<p style="padding: 20px; color: var(--text-muted);">No markets found within 10km. Try exploring other areas!</p>`;
        return;
    }
    
    markets.forEach(market => {
        let badge = isNearby ? `<span style="position:absolute; top:-10px; right:-10px; background:#2ecc71; color:white; padding:4px 8px; font-size:10px; border-radius:10px; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.2);">Nearby 📍</span>` : "";
        
        grid.innerHTML += `
            <div style="position: relative; min-width: 180px; padding: 20px 30px; background: var(--card-bg); color: var(--text-main); border-radius: var(--border-radius); text-align: center; box-shadow: var(--shadow); transition: var(--transition); border: 2px solid transparent; cursor: pointer;" onmouseover="this.style.transform='translateY(-8px)'; this.style.borderColor='var(--primary)'; this.style.color='var(--primary)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='transparent'; this.style.color='var(--text-main)'" onclick="loadShops('${market.name}')">
              ${badge}
              <h3 style="margin: 0; font-size: 18px; font-weight: 700;">${sanitizeHTML(market.name)}</h3>
            </div>
        `;
    });
}

function loadShops(marketName) {
  currentMarketName = marketName; 
  fetch(`${API_URL}/products/markets/${marketName}/shops`)
    .then(res => res.json())
    .then(shops => {
      const container = document.getElementById("products");
      container.innerHTML = `
        <div id="current-view" data-view="markets"></div>
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
            <button onclick="loadHome()" style="background: var(--card-bg); color: var(--text-main); border: 1px solid #ddd; border-radius: 8px; width: auto; display: inline-block;">⬅ Back to Home</button>
            <h2 style="font-size: 24px; font-weight: 700; margin: 0;">🏪 Shops in ${marketName}</h2>
        </div>
        <div id="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 30px;"></div>
      `;
      const grid = document.getElementById("grid");
      if (shops.length === 0) grid.innerHTML = "<p>No shops in this market yet.</p>";
      shops.forEach(shop => {
        grid.innerHTML += `
          <div style="border: 1px solid transparent; padding: 25px; border-radius: var(--border-radius); cursor: pointer; background: var(--card-bg); text-align: center; box-shadow: var(--shadow); transition: var(--transition);" onmouseover="this.style.transform='translateY(-8px)'; this.style.borderColor='var(--primary)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='transparent'" onclick="loadProducts('${shop}')">
            <h3 style="margin-bottom: 10px; font-size: 20px; font-weight: 700;">🏬 ${sanitizeHTML(shop)}</h3>
            <span style="color: var(--primary); font-weight: bold;">View Menu ➔</span>
          </div>
        `;
      });
    });
}

function loadProducts(shopName) {
  fetch(`${API_URL}/products/shops/${shopName}`)
    .then(res => res.json())
    .then(products => {
      currentProducts = products; 
      const container = document.getElementById("products");
      container.innerHTML = `
        <div id="current-view" data-view="shop" data-shop="${shopName}"></div>
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
            <button onclick="loadShops('${currentMarketName}')" style="background: var(--card-bg); color: var(--text-main); border: 1px solid #ddd; border-radius: 8px; width: auto; display: inline-block;">⬅ Back to Shops</button>
            <h2 style="font-size: 24px; font-weight: 700; margin: 0;">🍔 ${shopName} Menu</h2>
        </div>
        <div id="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 30px;"></div>
      `;
      const grid = document.getElementById("grid");
      if (products.length === 0) grid.innerHTML = "<p>This shop hasn't added any products yet.</p>";
      products.forEach(p => {
        grid.innerHTML += createProductHTML(p);
      });
    });
}

// ⭐ UPGRADED PRODUCT HTML WITH REVIEWS & RATING
function createProductHTML(p) {
    let starsHtml = "";
    const rating = p.averageRating || 0;
    for (let i = 1; i <= 5; i++) {
        starsHtml += i <= Math.round(rating) ? '<span style="color: #f1c40f;">★</span>' : '<span style="color: #ddd;">★</span>';
    }

    // Add this inside the relative container of the product card HTML
    // In a full implementation, you'd check this against the user's saved wishlist array 
    // Usually retrieved during login/session check. For now visual default.
    const isWishlisted = currentWishlist && currentWishlist.includes(p._id); 
    const heartColor = isWishlisted ? "#e74c3c" : "rgba(0,0,0,0.2)";
    const safeName = sanitizeHTML(p.name);
    const attrName = escapeAttr(p.name);
    const safeShopName = sanitizeHTML(p.shopName);
    const safeMarket = sanitizeHTML(p.market);
    const safeImage = escapeAttr(p.image) || 'https://via.placeholder.com/200';
    const escapedReviewName = escapeAttr(p.name.replace(/'/g, "\\'"));

    let badgeHtml = "";
    if (p.retailerId && p.retailerId.verificationTier === 'Premium') {
        badgeHtml = `<span title="Premium Seller" style="color: #f1c40f; font-size: 14px; margin-left: 5px;">💎</span>`;
    } else if (p.retailerId && p.retailerId.verificationTier === 'Verified') {
        badgeHtml = `<span title="Verified Seller" style="color: #3498db; font-size: 14px; margin-left: 5px;">✅</span>`;
    }

    let trustScoreHtml = "";
    if (p.retailerId && p.retailerId.trustScore > 0) {
        trustScoreHtml = `<div style="font-size: 11px; color: #27ae60; font-weight: bold; margin-bottom: 5px;">Trust Score: ${p.retailerId.trustScore}/100</div>`;
    }

    return `
      <div class="product" style="position: relative;">
        <button onclick="event.stopPropagation(); toggleWishlist('${p._id}', this)" style="position: absolute; top: 10px; right: 10px; background: white; border: none; border-radius: 50%; width: 35px; height: 35px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; color: ${heartColor}; z-index: 10; padding: 0; margin: 0; transition: transform 0.2s;">
            ♥
        </button>
        <img src="${safeImage}" alt="${attrName}">
        <h3>${safeName}</h3>
        <p style="cursor: pointer; margin-bottom: 5px;" onclick="loadShops('${safeMarket}')">
            🏬 ${safeShopName} ${badgeHtml} | 🏙️ ${safeMarket}
        </p>
        ${trustScoreHtml}
        
        <div style="margin: 5px 0; font-size: 14px; color: var(--text-muted);">
            ${starsHtml} <span style="font-weight: bold; color: var(--text-main);">${rating}</span> (${p.totalReviews || 0} reviews)
        </div>

        <p>Stock: <b>${p.stock}</b></p>
        <p class="price">₹${p.price}</p>
        
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
            <button class="add-to-cart-btn" onclick="addToCart('${p._id}')" style="margin-top: 0; background: #f1c40f; color: #333;">🛒 Add</button>
            <button class="buy-now-btn" onclick="buy('${p._id}')" style="margin-top: 0;">⚡ Buy</button>
        </div>

        <button onclick="openReviewPrompt('${p._id}', '${escapedReviewName}')" style="width: 100%; margin-top: 10px; background: transparent; border: 1px dashed rgba(0,0,0,0.2); padding: 8px; border-radius: 8px; cursor: pointer; color: var(--text-muted); font-size: 13px;">📝 Write a Review</button>
        
        ${p.reviews && p.reviews.length > 0 ? `
            <div style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.02); border-radius: 8px; font-size: 12px; text-align: left; border-left: 3px solid #f1c40f;">
                <b style="color: var(--text-main);">${sanitizeHTML(p.reviews[p.reviews.length - 1].customerName)}</b> 
                <span style="color: #27ae60; font-weight: bold; font-size: 10px;">✅ Verified</span><br>
                <i style="color: var(--text-muted);">"${sanitizeHTML(p.reviews[p.reviews.length - 1].comment)}"</i>
            </div>
        ` : ''}
      </div>
    `;
}

// =======================================================
// 🎛️ ADVANCED SEARCH & FILTER ENGINE
// =======================================================

let filterTimeout;

function delayFilter() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(applyFilters, 500); 
}

function applyFilters() {
    // Sync main input and inner input to avoid losing query state
    const mainInput = document.getElementById("mainSearchInput");
    const innerInput = document.getElementById("searchInput");
    
    let query = "";
    if (mainInput && document.activeElement === mainInput) {
        query = mainInput.value.trim();
        if (innerInput) innerInput.value = query;
    } else if (innerInput && document.activeElement === innerInput) {
        query = innerInput.value.trim();
        if (mainInput) mainInput.value = query;
    } else {
        query = mainInput ? mainInput.value.trim() : (innerInput ? innerInput.value.trim() : "");
    }
    
    const category = document.getElementById("filterCategory") ? document.getElementById("filterCategory").value : "All";
    const minPrice = document.getElementById("minPrice") ? document.getElementById("minPrice").value : "";
    const maxPrice = document.getElementById("maxPrice") ? document.getElementById("maxPrice").value : "";
    const inStock = document.getElementById("inStockToggle") ? document.getElementById("inStockToggle").checked : false;
    const sort = document.getElementById("sortFilter") ? document.getElementById("sortFilter").value : "newest";

    if (query === "" && category === "All" && minPrice === "" && maxPrice === "" && !inStock && sort === "newest") {
        const isSearchActive = document.getElementById("current-view") && document.getElementById("current-view").getAttribute("data-view") === "search";
        if (isSearchActive) {
            loadHome();
        }
        return;
    }

    let fetchUrl = `${API_URL}/products/search?`;
    if (query) fetchUrl += `q=${encodeURIComponent(query)}&`;
    if (category !== "All") fetchUrl += `category=${encodeURIComponent(category)}&`;
    if (minPrice) fetchUrl += `minPrice=${minPrice}&`;
    if (maxPrice) fetchUrl += `maxPrice=${maxPrice}&`;
    if (inStock) fetchUrl += `inStock=true&`;
    fetchUrl += `sort=${sort}`;

    fetch(fetchUrl)
        .then(res => res.json())
        .then(products => {
            currentProducts = products;
            
            const container = document.getElementById("products");
            const isSearchActive = document.getElementById("current-view") && document.getElementById("current-view").getAttribute("data-view") === "search";
            
            if (!isSearchActive) {
                container.innerHTML = `
                  <div id="current-view" data-view="search"></div>
                  
                  <div style="margin-bottom: 30px; text-align: center; display: flex; justify-content: center;">
                      <input type="text" id="searchInput" value="${query}" placeholder="Search for products, shops, or markets... 🔍" onkeyup="delayFilter()" autofocus style="width: 100%; max-width: 600px; padding: 18px 25px; font-size: 16px; border-radius: 30px; border: 2px solid var(--primary); background: var(--card-bg); color: var(--text-main); outline: none; box-shadow: var(--shadow);">
                  </div>

                  <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
                      <button onclick="clearSearch()" style="background: var(--card-bg); color: var(--text-main); border: 1px solid #ddd; border-radius: 8px; width: auto; display: inline-block;">⬅ Clear Filters</button>
                      <h2 style="font-size: 24px; margin: 0;" id="searchTitle">🔍 Search Results</h2>
                  </div>
                  
                  <div id="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 30px;"></div>
                `;
                
                const inputElement = document.getElementById("searchInput");
                if(inputElement && document.activeElement === innerInput) {
                    inputElement.focus();
                    inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
                }
            } else {
                const st = document.getElementById("searchTitle");
                if (st) st.innerText = query ? `🔍 Results for "${query}"` : `🔍 Filtered Results`;
            }
            
            const grid = document.getElementById("grid");
            if(grid) grid.innerHTML = "";
            
            if (products.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-size: 18px;">No products match your exact filters. Try adjusting them!</div>`;
            } else {
                products.forEach(p => { grid.innerHTML += createProductHTML(p); });
            }
        })
        .catch(err => console.error("Filter Error:", err));
}

function clearSearch() {
    if (document.getElementById("mainSearchInput")) document.getElementById("mainSearchInput").value = "";
    if (document.getElementById("filterCategory")) document.getElementById("filterCategory").value = "All";
    if (document.getElementById("minPrice")) document.getElementById("minPrice").value = "";
    if (document.getElementById("maxPrice")) document.getElementById("maxPrice").value = "";
    if (document.getElementById("inStockToggle")) document.getElementById("inStockToggle").checked = false;
    if (document.getElementById("sortFilter")) document.getElementById("sortFilter").value = "newest";
    loadHome();
}

// =======================================================
// 🛒 CORE FUNCTIONALITY
// =======================================================

function addToCart(id) {
  const product = currentProducts.find(p => p._id === id);
  if (!product) return;
  let cart = [];
  try {
      cart = JSON.parse(localStorage.getItem("cart")) || [];
  } catch (e) {
      cart = [];
  }
  const existingItem = cart.find(item => item.id === id);
  if (existingItem) existingItem.quantity += 1;
  else cart.push({ id: product._id, name: product.name, price: product.price, quantity: 1, image: product.image, market: product.market });
  localStorage.setItem("cart", JSON.stringify(cart));
  showToast(`${product.name} added to cart!`, "success");
}

function buy(id) {
  addToCart(id);
  setTimeout(() => { window.location.href = "cart.html"; }, 500);
}

function showUser() {
  let user = null;
  try {
      user = JSON.parse(localStorage.getItem("user"));
  } catch (e) {
      console.error("Failed to parse user from local storage");
      localStorage.removeItem("user");
  }
  const userSection = document.getElementById("userSection");
  if (!userSection) return;
  
  const btnStyle = "display: inline-flex; align-items: center; justify-content: center; height: 38px; padding: 0 16px; border-radius: 8px; font-weight: bold; font-size: 14px; text-decoration: none; box-sizing: border-box; cursor: pointer; transition: 0.2s;";
  
  if (user) {
    let dashboardLink = "";
    if (user.role === "retailer") {
        dashboardLink = `<a href="seller-dashboard.html" class="nav-btn premium-btn">Seller Hub</a>`;
    } else if (user.role === "admin") {
        dashboardLink = `<a href="admin-dashboard.html" class="nav-btn premium-btn">CEO Command</a>`;
    }
      
    userSection.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        ${dashboardLink}
        <button onclick="logout()" class="nav-btn" style="background: #e74c3c; box-shadow: 0 4px 10px rgba(231,76,60,0.2);">Logout</button>
      </div>
    `;
  } else {
    userSection.innerHTML = `<a href="login.html" class="nav-btn premium-btn" style="background: linear-gradient(135deg, var(--primary), #e67e22) !important;">Login / Sell with us</a>`;
  }
}

function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  showToast("Logged out successfully.", "info");
  setTimeout(() => { location.reload(); }, 1000);
}

// --- INITIALIZE THEME ---
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

function toggleDark() { 
    document.body.classList.toggle("dark"); 
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
}

// =======================================================
// ⭐ RATING & REVIEW SYSTEM
// =======================================================

async function openReviewPrompt(productId, productName) {
    const token = localStorage.getItem("token");
    if (!token) {
        showToast("Please login to leave a review!", "error");
        setTimeout(() => { window.location.href = "login.html"; }, 1500);
        return;
    }

    const ratingStr = prompt(`Rate "${productName}" from 1 to 5 stars:\n(1 = Poor, 5 = Excellent)`);
    if (!ratingStr) return; // User cancelled
    
    const rating = parseInt(ratingStr);
    if (isNaN(rating) || rating < 1 || rating > 5) {
        return showToast("Rating must be a number between 1 and 5.", "error");
    }

    const comment = prompt(`Write your review for "${productName}":`);
    if (!comment || comment.trim() === "") {
        return showToast("Review comment cannot be empty.", "error");
    }

    try {
        const res = await fetch(`${API_URL}/products/${productId}/reviews`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ rating, comment })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        showToast("Review published! ⭐", "success");
        
        // Refresh UI
        const viewType = document.getElementById("current-view")?.getAttribute("data-view");
        if (viewType === "home") loadHome();
        else if (viewType === "shop") loadProducts(document.getElementById("current-view").getAttribute("data-shop"));
        else if (viewType === "search") handleSearch();

    } catch (err) {
        showToast(err.message, "error");
    }
}

// =======================================================
// 🔐 PASSWORDLESS OTP LOGIC
// =======================================================

// --- CUSTOMER LOGIN/REGISTER LOGIC ---
async function requestOTP() {
    const email = document.getElementById("authEmail").value.trim();
    const btn = document.getElementById("sendBtn");
    
    if (!email || !email.includes("@")) return showToast("Please enter a valid email.", "error");

    btn.innerText = "Sending... ✉️";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message);

        // UI Transition
        document.getElementById("emailStep").style.display = "none";
        document.getElementById("otpStep").style.display = "block";
        document.getElementById("displayEmail").innerText = email;
        showToast("Code sent! Check your inbox.", "success");

    } catch (err) {
        showToast(err.message, "error");
        btn.innerText = "Send Secure Code";
        btn.disabled = false;
    }
}

async function verifyOTP() {
    const email = document.getElementById("authEmail").value.trim();
    const otp = document.getElementById("authOTP").value.trim();
    const btn = document.getElementById("verifyBtn");

    if (otp.length !== 6) return showToast("Please enter the 6-digit code.", "error");

    btn.innerText = "Verifying... 🛡️";
    btn.disabled = true;

    try {
        const storedRefCode = localStorage.getItem("referralCode");
        const res = await fetch(`${API_URL}/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp, loginRole: document.getElementById("btnRetailer")?.classList.contains("active") ? "retailer" : "customer", referralCode: storedRefCode })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message);

        // Success! Log them in.
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        showToast("Verified! Logging you in... 🚀", "success");
        
        // Route them based on role
        setTimeout(() => { 
            if (data.user.role === "retailer") window.location.href = "seller-dashboard.html";
            else window.location.href = "index.html"; 
        }, 1500);

    } catch (err) {
        showToast(err.message, "error");
        btn.innerText = "Verify & Login";
        btn.disabled = false;
    }
}

// --- SELLER ONBOARDING OTP LOGIC ---
async function requestSellerOTP() {
    const name = document.getElementById("sellerName").value.trim();
    const shop = document.getElementById("sellerShop").value.trim();
    const market = document.getElementById("sellerMarket").value.trim();
    const email = document.getElementById("sellerEmail").value.trim();
    const btn = document.getElementById("sendBtn");
    
    if (!name || !shop || !market || !email) {
        return showToast("Please fill in all business details.", "error");
    }

    btn.innerText = "Sending... ✉️";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        // Transition UI
        document.getElementById("detailsStep").style.display = "none";
        document.getElementById("otpStep").style.display = "block";
        document.getElementById("displayEmail").innerText = email;
        showToast("Code sent! Check your inbox.", "success");

    } catch (err) {
        showToast(err.message, "error");
        btn.innerText = "Verify Email & Create Account";
        btn.disabled = false;
    }
}

async function verifySellerOTP() {
    const name = document.getElementById("sellerName").value.trim();
    const shopName = document.getElementById("sellerShop").value.trim();
    const marketLocation = document.getElementById("sellerMarket").value.trim();
    const email = document.getElementById("sellerEmail").value.trim();
    const otp = document.getElementById("sellerOTP").value.trim();
    const btn = document.getElementById("verifyBtn");

    if (otp.length !== 6) return showToast("Please enter the 6-digit code.", "error");

    btn.innerText = "Verifying... 🛡️";
    btn.disabled = true;

    try {
        const storedRefCode = localStorage.getItem("referralCode");
        const res = await fetch(`${API_URL}/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp, role: "retailer", name, shopName, marketLocation, referralCode: storedRefCode })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message);

        // Success! Log them in.
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        showToast("Welcome Partner! Setting up your dashboard... 🚀", "success");
        setTimeout(() => { window.location.href = "seller-dashboard.html"; }, 1500);

    } catch (err) {
        showToast(err.message, "error");
        btn.innerText = "Verify & Open Dashboard 🚀";
        btn.disabled = false;
    }
}

// --- SELLER BANK ONBOARDING (RAZORPAY ROUTE) ---
async function connectBankAccount() {
    const accountName = document.getElementById('bankAccountName').value.trim();
    const ifsc = document.getElementById('bankIFSC').value.trim();
    const accountNumber = document.getElementById('bankAccountNumber').value.trim();
    const btn = document.getElementById('connectBankBtn');

    if (!accountName || !ifsc || !accountNumber) {
        return showToast('Please fill in all bank details.', 'error');
    }

    const token = localStorage.getItem('token');
    if (!token) return window.location.href = 'login.html';

    btn.innerText = 'Connecting... 🏦';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/connect-bank`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ accountName, ifsc, accountNumber })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message);

        showToast('Bank account successfully linked! 💸', 'success');
        
        document.getElementById('bankFormArea').innerHTML = `
            <div style="background: rgba(46, 204, 113, 0.1); padding: 20px; border-radius: 8px; border: 1px solid #2ecc71; text-align: center;">
                <h3 style="color: #2ecc71; margin: 0 0 10px 0;">✅ Account Connected Automatically</h3>
                <p style="color: var(--text-main); margin: 0; font-size: 14px;">Your linked Razorpay account ID is <b>${data.accountId}</b>. Escrow deposits will now automatically route here.</p>
            </div>
        `;

    } catch (err) {
        showToast(err.message, 'error');
        btn.innerText = 'Securely Connect Bank 🔗';
        btn.disabled = false;
    }
}

// =======================================================
// 🛒 CART & CHECKOUT LOGIC
// =======================================================

function loadCart() {
  const listContainer = document.getElementById("cartItemsList");
  if (!listContainer) return; 
  let cart = [];
  try {
      cart = JSON.parse(localStorage.getItem("cart")) || [];
  } catch (e) {
      cart = [];
  }
  const subTotalContainer = document.getElementById("cartSubtotal");
  const totalContainer = document.getElementById("cartTotal");
  const itemCount = document.getElementById("itemCount");
  listContainer.innerHTML = "";
  let subTotal = 0;
  if (itemCount) itemCount.innerText = `${cart.length} Items`;
  if (cart.length === 0) {
    listContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 40px 0;">Your cart is empty! 🛒</p>`;
    if(subTotalContainer) subTotalContainer.innerText = "₹0";
    if(totalContainer) totalContainer.innerText = "₹0";
    return;
  }
  cart.forEach((item, index) => {
    let itemQty = item.quantity || 1;
    let itemPriceTotal = item.price * itemQty;
    subTotal += itemPriceTotal;
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img src="${item.image || 'https://via.placeholder.com/60'}" alt="Product">
      <div class="cart-info">
        <h3>${sanitizeHTML(item.name)}</h3>
        <p>Sold by: <b>${sanitizeHTML(item.market || 'Vyaparsync')}</b></p>
        <p>Qty: ${itemQty}</p>
      </div>
      <div class="cart-price">₹${itemPriceTotal}</div>
      <button class="btn-remove" onclick="removeFromCart(${index})">X</button>
    `;
    listContainer.appendChild(div);
  });
  const platformFee = 10;
  let finalTotal = subTotal + platformFee;
  let walletUsed = 0;

  let user = null;
  try {
      user = JSON.parse(localStorage.getItem("user"));
  } catch (e) {}
  const walletRow = document.getElementById("walletDiscountRow");

  if (user && user.walletBalance > 0 && subTotal > 0) {
      if(walletRow) walletRow.style.display = "flex";
      walletUsed = Math.min(user.walletBalance, finalTotal - 1);
      const cartWalletDiscount = document.getElementById("cartWalletDiscount");
      if(cartWalletDiscount) cartWalletDiscount.innerText = `-₹${walletUsed}`;
      finalTotal -= walletUsed;
  } else {
      if(walletRow) walletRow.style.display = "none";
  }

  if(subTotalContainer) subTotalContainer.innerText = `₹${subTotal}`;
  if(totalContainer) totalContainer.innerText = `₹${finalTotal}`;
}

window.removeFromCart = function(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
  showToast("Item removed from cart.", "info");
}

// =======================================================
// ❤️ WISHLIST ENGINE
// =======================================================

async function loadWishlist() {
    const token = localStorage.getItem("token");
    if (!token) return showToast("Please login to view your wishlist", "error");

    try {
        const res = await fetch(`${API_URL}/products/my-wishlist`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const products = await res.json();
        
        const container = document.getElementById("products");
        if (!container) return;
        
        currentWishlist = products.map(p => p._id);
        
        container.innerHTML = `
            <div id="current-view" data-view="wishlist"></div>
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
                <button onclick="loadHome()" style="background: var(--card-bg); color: var(--text-main); border: 1px solid #ddd; border-radius: 8px; width: auto; display: inline-block;">⬅ Back to Home</button>
                <h2 style="font-size: 24px; font-weight: 700; margin: 0;">❤️ My Wishlist</h2>
            </div>
            <div id="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 30px;"></div>
        `;
        
        const grid = document.getElementById("grid");
        if (!products || products.length === 0) {
            grid.innerHTML = "<p>Your wishlist is empty! Go browse some markets.</p>";
            return;
        }
        
        products.forEach(p => {
            grid.innerHTML += createProductHTML(p);
        });
        
    } catch (err) {
        showToast("Failed to load wishlist", "error");
    }
}

// =======================================================
// 🚚 ADDRESS COLLECTION & PINCODE AUTO-FILL
// =======================================================

// Global variable to temporarily hold the address before payment
let currentShippingAddress = null;

async function autofillPincode() {
    const pincode = document.getElementById("addressPincode").value;
    const cityInput = document.getElementById("addressCity");
    const stateInput = document.getElementById("addressState");

    // Only fire if it's exactly 6 digits
    if (pincode.length === 6) {
        try {
            cityInput.placeholder = "Locating...";
            stateInput.placeholder = "Locating...";
            
            const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            const data = await res.json();

            if (data[0].Status === "Success") {
                cityInput.value = data[0].PostOffice[0].District;
                stateInput.value = data[0].PostOffice[0].State;
                showToast("📍 Location found automatically!", "success");
            } else {
                showToast("Invalid Pincode. Please enter manually.", "error");
                cityInput.value = ""; stateInput.value = "";
            }
        } catch (err) {
            console.error("Pincode API Error:", err);
        }
    }
}

// 🛑 INTERCEPT THE CHECKOUT BUTTON
window.startCheckoutProcess = function() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cart.length === 0) return showToast("Your cart is empty!", "error");
    
    const token = localStorage.getItem("token");
    if (!token) return window.location.href = "login.html";

    // Inject a quick modal into the body
    const modalHTML = `
        <div id="addressModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; justify-content:center; align-items:center;">
            <div style="background:var(--card-bg); padding:30px; border-radius:12px; width:90%; max-width:400px; color: var(--text-main);">
                <h2 style="margin-top:0;">📍 Delivery Details</h2>
                <div style="position:relative; margin-bottom:15px;">
                    <input type="text" id="osmSearch" placeholder="🌍 Search your address via GPS..." oninput="searchOSMAddress()" style="width:100%; box-sizing:border-box; padding:12px; border-radius:8px; border:2px solid var(--primary); background: rgba(255, 106, 0, 0.05); color: var(--text-main); font-weight:bold;" autocomplete="off">
                    <div id="osmSuggestions" style="position:absolute; top:100%; left:0; width:100%; background:var(--card-bg); border-radius:5px; box-shadow:0 4px 10px rgba(0,0,0,0.2); max-height:200px; overflow-y:auto; z-index:10000; border:1px solid rgba(0,0,0,0.1); display:none;"></div>
                </div>

                <input type="text" id="addressLine1" placeholder="House/Flat No. & Building" style="width:100%; box-sizing:border-box; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #ccc; background: var(--bg-color); color: var(--text-main);" required>
                <input type="text" id="addressLine2" placeholder="Street/Area Name (Autofills)" style="width:100%; box-sizing:border-box; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #ccc; background: var(--bg-color); color: var(--text-main);">
                
                <input type="tel" id="addressPhone" placeholder="10-digit WhatsApp Number" maxlength="10" style="width:100%; box-sizing:border-box; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #ccc; border-left: 4px solid #25D366; background: var(--bg-color); color: var(--text-main);" required>
                
                <input type="number" id="addressPincode" placeholder="6-digit Pincode" onkeyup="autofillPincode()" style="width:100%; box-sizing:border-box; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #ccc; background: var(--bg-color); color: var(--text-main);" required>
                
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <input type="text" id="addressCity" placeholder="City" style="width:50%; box-sizing:border-box; padding:10px; border-radius:5px; border:1px solid #ccc; background: var(--bg-color); color: var(--text-main);" required>
                    <input type="text" id="addressState" placeholder="State" style="width:50%; box-sizing:border-box; padding:10px; border-radius:5px; border:1px solid #ccc; background: var(--bg-color); color: var(--text-main);" required>
                </div>

                <div style="display:flex; gap:10px;">
                    <button onclick="document.getElementById('addressModal').remove()" style="flex:1; padding:10px; background:#e74c3c; color:white; border:none; border-radius:5px; cursor:pointer;">Cancel</button>
                    <button onclick="confirmAddressAndPay()" style="flex:1; padding:10px; background:#2ecc71; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">Proceed to Pay</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 🟢 STEP 2: Validate address, save to memory, open Razorpay
window.confirmAddressAndPay = function() {
    const line1 = document.getElementById("addressLine1").value;
    const pincode = document.getElementById("addressPincode").value;
    const city = document.getElementById("addressCity").value;
    const state = document.getElementById("addressState").value;
    const phone = document.getElementById("addressPhone").value;

    if (!line1 || pincode.length !== 6 || !city || !state || phone.length !== 10) {
        return showToast("Please fill all required address fields correctly (and 10-digit phone).", "error");
    }

    // Save snapshot to memory
    currentShippingAddress = {
        line1,
        line2: document.getElementById("addressLine2").value,
        city,
        state,
        pincode,
        phone
    };

    // Remove the modal and call your original checkout function
    document.getElementById('addressModal').remove();
    checkoutCart(); // Call your existing Razorpay function
}

// 🌍 OpenStreetMap Autocomplete Logic
let osmTimeout;
window.searchOSMAddress = function() {
    clearTimeout(osmTimeout);
    const query = document.getElementById('osmSearch').value;
    const suggestionBox = document.getElementById('osmSuggestions');
    
    if (query.length < 4) {
        suggestionBox.style.display = 'none';
        return;
    }

    // Debounce to prevent API spam
    osmTimeout = setTimeout(async () => {
        try {
            // Nominatim API: Free open-source maps. Locked to India for faster, accurate results.
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            suggestionBox.innerHTML = '';
            if (data.length > 0) {
                suggestionBox.style.display = 'block';
                data.slice(0, 5).forEach(place => {
                    const item = document.createElement('div');
                    item.innerHTML = `📍 ${place.display_name}`;
                    item.style.padding = '10px';
                    item.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
                    item.style.cursor = 'pointer';
                    item.style.fontSize = '12px';
                    item.style.color = 'var(--text-main)';
                    
                    item.onmouseover = () => item.style.background = 'rgba(255, 106, 0, 0.1)';
                    item.onmouseout = () => item.style.background = 'transparent';
                    
                    item.onclick = () => selectOSMAddress(place);
                    suggestionBox.appendChild(item);
                });
            } else {
                suggestionBox.style.display = 'none';
            }
        } catch (error) {
            console.error("OSM API Error:", error);
        }
    }, 500);
};

window.selectOSMAddress = function(place) {
    document.getElementById('osmSearch').value = place.display_name;
    document.getElementById('osmSuggestions').style.display = 'none';
    
    // Smart Autofill
    const addr = place.address;
    
    // Line 2 (Area/Road/Suburb)
    const area = addr.suburb || addr.neighbourhood || addr.road || addr.county || '';
    if(area) document.getElementById('addressLine2').value = area;
    
    // City
    const city = addr.city || addr.town || addr.state_district || addr.county || '';
    if(city) document.getElementById('addressCity').value = city;
    
    // State
    if(addr.state) document.getElementById('addressState').value = addr.state;
    
    // Pincode
    if(addr.postcode) {
        document.getElementById('addressPincode').value = addr.postcode.replace(/\s/g, '').substring(0,6);
    }
    
    showToast("Address Autofilled Successfully! 🌍", "success");
};

window.checkoutCart = async function() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (cart.length === 0) return showToast("Your cart is empty!", "error");
  let subTotal = 0;
  cart.forEach(item => { subTotal += (item.price * (item.quantity || 1)); });
  const platformFee = 10;
  const totalAmount = subTotal + platformFee;
  const token = localStorage.getItem("token");
  if (!token) {
    showToast("Please login to complete your purchase.", "error");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }
  try {
    const response = await fetch(`${API_URL}/orders/create-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ amount: totalAmount })
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    const rzpOrder = await response.json();
    const options = {
      "key": "rzp_test_SZtBFCjNICbNoE",
      "amount": rzpOrder.amount,
      "currency": "INR",
      "name": "Vyaparsync",
      "description": "Purchase from Local Markets",
      "order_id": rzpOrder.id,
      "config": {
          "display": {
              "blocks": {
                  "custom_upi": {
                      "name": "Pay via UPI",
                      "instruments": [
                          {
                              "method": "upi"
                          }
                      ]
                  }
              },
              "hide": [
                  { "method": "upi" }
              ],
              "sequence": ["block.custom_upi"],
              "preferences": {
                  "show_default_blocks": true
              }
          }
      },
      "handler": async function (response) { await verifyAndPlaceOrders(response); },
      "prefill": { 
          "name": JSON.parse(localStorage.getItem("user")).name,
          "email": JSON.parse(localStorage.getItem("user")).email || "user@example.com",
          "contact": "9999999999"  // Fallback for seamless UPI testing
      },
      "theme": { "color": "#2ecc71" } // Custom green color
    };
    const rzp1 = new Razorpay(options);
    rzp1.open();
  } catch (err) { showToast("Checkout Error: " + err.message, "error"); }
}

async function verifyAndPlaceOrders(paymentProof) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const token = localStorage.getItem("token"); 
  try {
    const res = await fetch(`${API_URL}/orders/verify-and-place`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ 
        razorpay_order_id: paymentProof.razorpay_order_id,
        razorpay_payment_id: paymentProof.razorpay_payment_id,
        razorpay_signature: paymentProof.razorpay_signature,
        cartItems: cart, 
        shippingAddress: currentShippingAddress // 🚚 This sends the snapshot to the database!
      })
    });
    if (!res.ok) throw new Error("Verification failed");
    localStorage.removeItem("cart");
    showToast("Payment Verified! 🛡️🎉", "success");
    setTimeout(() => { window.location.href = "orders.html"; }, 2000);
  } catch (err) { showToast("Verification Error: " + err.message, "error"); }
}

// =======================================================
// 🚚 CUSTOMER ORDER TRACKING (WITH LOGISTICS TICKET)
// =======================================================

function loadMyOrders() {
  const listContainer = document.getElementById("customerOrdersList");
  if (!listContainer) return; 
  const token = localStorage.getItem("token");
  if (!token) return;

  fetch(`${API_URL}/orders/customer`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  })
    .then(async res => {
      if (!res.ok) throw new Error("Failed to load orders");
      return res.json();
    })
    .then(orders => {
      listContainer.innerHTML = "";
      if (orders.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding: 40px 0;">No orders yet! 🛒</p>`;
        return;
      }
      orders.sort((a, b) => new Date(b.date) - new Date(a.date));

      orders.forEach(order => {
        const orderDate = new Date(order.date).toLocaleDateString();
        order.status = order.status || "Pending";
        const orderStatus = order.status || "Pending ðŸ•’";
        const isShipped = orderStatus.includes("Shipped");
        let badgeClass = isShipped ? "status-shipped" : "status-pending";
        let statusText = order.status.includes("Shipped") ? "Shipped 🚚" : "Pending 🕒";

        // 🗺️ DYNAMIC LOGISTICS TICKET & LIVE MAP SIMULATION
        let trackingHTML = "";
        if (order.status.includes("Shipped")) {
            trackingHTML = `
                <div style="margin-top: 15px; padding: 12px; background: rgba(0,0,0,0.02); border-radius: 8px; border: 1px dashed rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px;">
                        <span style="color: var(--text-muted);">Partner: <b style="color: var(--text-main);">${order.deliveryPartner || 'Vyapar Logistics'}</b></span>
                        <span style="color: var(--text-muted);">Tracking: <b style="color: var(--primary);">${order.trackingId || 'LIVE-SIM-01'}</b></span>
                    </div>
                    <div id="map-${order._id}" style="height: 180px; width: 100%; border-radius: 8px; z-index: 1;"></div>
                    <div style="text-align: center; margin-top: 8px; font-size: 11px; color: #2ecc71; font-weight: bold;">
                        🟢 Live GPS Active
                    </div>
                </div>
            `;
        }

        let actionHTML = "";
        if (!order.status.includes("Shipped") && !order.status.includes("Cancelled") && !order.status.includes("Rejected") && !order.status.includes("Delivered")) {
            actionHTML = `<button onclick="cancelOrder('${order._id}')" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-top: 10px;">Cancel Order</button>`;
        }

        const div = document.createElement("div");
        div.className = "order-card";
        div.innerHTML = `
          <div class="order-info" style="flex: 1; width: 100%;">
            <h3>${order.productName}</h3>
            <p><b>Date:</b> ${orderDate} | <b>Market:</b> ${order.market}</p>
            <p style="color: var(--primary); font-weight: bold; font-size: 16px; margin-top: 5px;">₹${order.price}</p>
            ${trackingHTML}
            ${actionHTML}
          </div>
          <div style="margin-left: 20px;">
            <span class="status-badge ${badgeClass}">${statusText}</span>
          </div>
        `;
        listContainer.appendChild(div);

        // 🚀 Initialize the map immediately after the HTML is injected into the DOM
        if (order.status.includes("Shipped")) {
            setTimeout(() => {
                initLiveTrackingMap(`map-${order._id}`);
            }, 100);
        }
      });
    })
    .catch(err => { console.error(err); });
}

document.addEventListener("DOMContentLoaded", () => {
    // Only run loadHome if on a page with products container
    if(document.getElementById("products")) {
        loadHome();
    }
    loadCart();
    loadMyOrders();
    showUser(); // The newly upgraded VIP button function runs here
});

// =======================================================
// 🛑 REFUND & CANCELLATION LOGIC
// =======================================================
async function cancelOrder(orderId) {
    if(!confirm("Are you sure you want to cancel this order? A full refund will be processed.")) return;
    
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        
        showToast("Refund Initiated successfully. 💸", "success");
        
        // Reload whichever view they are currently on
        if (window.location.pathname.includes("seller-dashboard")) {
            if (typeof loadOrders === "function") loadOrders();
        } else {
            if (typeof loadMyOrders === "function") loadMyOrders();
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}

// =======================================================
// 🗺️ LIVE ORDER TRACKING (DEMO ENGINE)
// =======================================================

function initLiveTrackingMap(mapContainerId) {
    if (typeof L === "undefined") {
        console.error("Leaflet is not loaded.");
        return;
    }

    // Prevent re-initializing the same map if the view reloads
    const container = document.getElementById(mapContainerId);
    if (!container || container._leaflet_id) return;

    // 1. Setup the Map centered on Delhi NCR
    const map = L.map(mapContainerId, {
        zoomControl: false, // Cleaner UI for small cards
        dragging: false     // Lock the map so the user focuses on the moving dot
    }).setView([28.5355, 77.1558], 11);

    // 2. Add the free OpenStreetMap tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // 3. Define the Route (Lajpat Nagar -> Gurugram)
    const startPoint = [28.5677, 77.2433]; // Lajpat Nagar
    const endPoint = [28.4595, 77.0266];   // Gurugram

    // Draw a subtle dashed line to show the planned route
    L.polyline([startPoint, endPoint], {
        color: '#ff6a00',
        dashArray: '5, 10',
        weight: 3,
        opacity: 0.5
    }).addTo(map);

    // Add a destination pin
    L.circleMarker(endPoint, {
        color: '#e74c3c', radius: 5, fillOpacity: 1
    }).addTo(map).bindPopup("Destination");

    // 4. Create the Delivery Partner Icon (A literal scooter!)
    const deliveryIcon = L.divIcon({
        html: '<div style="font-size: 24px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.3)); transform: scaleX(-1);">🛵</div>',
        className: 'custom-leaflet-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const marker = L.marker(startPoint, { icon: deliveryIcon }).addTo(map);

    // 5. The Movement Algorithm (Interpolation)
    let progress = 0;
    const frames = 1500; // How smooth/slow it moves
    
    function animateMarker() {
        progress++;
        if (progress > frames) {
            progress = 0; // Loop the demo back to the start for the presentation
        }

        // Calculate the exact lat/lng between start and end based on progress
        const currentLat = startPoint[0] + ((endPoint[0] - startPoint[0]) * (progress / frames));
        const currentLng = startPoint[1] + ((endPoint[1] - startPoint[1]) * (progress / frames));

        // Move the physical marker
        marker.setLatLng([currentLat, currentLng]);

        // Request the next frame (approx 60fps)
        requestAnimationFrame(animateMarker);
    }

    // Start the engine
    animateMarker();
}

// =======================================================
// ❤️ WISHLIST LOGIC
// =======================================================
async function toggleWishlist(productId, btnElement) {
    const token = localStorage.getItem("token");
    if (!token) {
        showToast("Please login to save items to your wishlist!", "error");
        setTimeout(() => window.location.href = "login.html", 1500);
        return;
    }

    // Small UI pop animation
    btnElement.style.transform = "scale(1.2)";
    setTimeout(() => btnElement.style.transform = "scale(1)", 200);

    try {
        const res = await fetch(`${API_URL}/products/${productId}/wishlist`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        // Update the global state
        currentWishlist = data.wishlist || [];

        // Visually toggle the heart color
        const isNowWishlisted = currentWishlist.includes(productId);
        btnElement.style.color = isNowWishlisted ? "#e74c3c" : "rgba(0,0,0,0.2)";
        
        showToast(isNowWishlisted ? "Added to Wishlist! ❤️" : "Removed from Wishlist 💔", "success");
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Optionally, add a function to fetch initial wishlist on load if user is logged in
async function fetchUserWishlist() {
    const token = localStorage.getItem("token");
    if(!token) return;
    try {
        const res = await fetch(`${API_URL}/products/my-wishlist`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if(res.ok) {
            const list = await res.json();
            currentWishlist = list.map(item => item._id || item); // Depends if populated or not
        }
    } catch(e) {
        console.error("Failed to load global wishlist", e);
    }
}

// Automatically fetch wishlist if token exists on load
document.addEventListener('DOMContentLoaded', () => {
    fetchUserWishlist();
});

