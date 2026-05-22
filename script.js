const hostname = window.location.hostname;
const API_URL = (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || window.location.protocol === "file:")
    ? `http://${hostname}:5000`
    : "https://vyaparsync.onrender.com";

// 🔥 KEEP-ALIVE PING: Prevents Render free-tier cold starts (pings every 9 min)
(function keepBackendAwake() {
    const ping = () => fetch(`${API_URL}/products?limit=1&_ping=1`).catch(() => {});
    ping(); // immediate ping on page load
    setInterval(ping, 9 * 60 * 1000); // then every 9 minutes
})();

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

    const existing = container.querySelectorAll(".toast");
    if (existing.length >= 3) existing[0].remove();

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

// =======================================================
// 💀 SKELETON LOADING HELPERS
// =======================================================
function getProductSkeletons(count = 6) {
    let html = "";
    for (let i = 0; i < count; i++) {
        html += `
        <div class="product skeleton" style="border: 1px solid rgba(0,0,0,0.05); min-width: 0;">
            <div class="skeleton-img shimmer"></div>
            <div class="skeleton-text skeleton-title shimmer" style="margin-top:15px;"></div>
            <div class="skeleton-text skeleton-subtitle shimmer" style="margin-top:5px;"></div>
            <div class="skeleton-text skeleton-price shimmer" style="margin-top:15px; height: 20px;"></div>
            <div class="skeleton-btn shimmer" style="margin-top:auto;"></div>
        </div>`;
    }
    return html;
}

function getMarketSkeletons(count = 4) {
    let html = "";
    for (let i = 0; i < count; i++) {
        html += `
        <div class="market-card skeleton" style="border: 1px solid rgba(0,0,0,0.05); height: 60px; min-width: 140px; display:flex; align-items:center; justify-content:center; border-radius: var(--border-radius);">
            <div class="skeleton-text shimmer" style="width: 70%; height: 20px; margin:0;"></div>
        </div>`;
    }
    return html;
}

function getShopSkeletons(count = 4) {
    let html = "";
    for (let i = 0; i < count; i++) {
        html += `
        <div class="skeleton" style="padding: 25px; border-radius: var(--border-radius); background: var(--card-bg); text-align: center; box-shadow: var(--shadow); display: flex; flex-direction: column; align-items: center;">
            <div class="skeleton-text shimmer" style="width: 60%; height: 24px; margin-bottom: 15px;"></div>
            <div class="skeleton-text shimmer" style="width: 40%; height: 16px;"></div>
        </div>`;
    }
    return html;
}

let isFetchingHome = false;
function loadHome() {
    if (isFetchingHome) return;
    isFetchingHome = true;
    const container = document.getElementById("products") || document.getElementById("wishlist-container") || document.getElementById("customerOrdersList") || document.querySelector("main");
    if (!container) {
        isFetchingHome = false;
        return;
    }

    container.innerHTML = `
    <div id="current-view" data-view="home"></div>
    <div style="margin-bottom: 40px;">
        <h2 style="margin-bottom: 15px; font-size: 24px;">🌍 Explore Local Markets</h2>
        <div id="markets-grid">
            ${getMarketSkeletons(8)}
        </div>
    </div>
    <div>
        <h2 style="margin-bottom: 15px; font-size: 24px; font-weight: 700; text-align: center;">Trending Today</h2>
        <div id="products-grid" class="horizontal-scroll-grid">
            ${getProductSkeletons(6)}
        </div>
    </div>
  `;

    // 🗺️ GPS OR DEFAULT ROUTING
    const savedLat = localStorage.getItem("userLat");
    const savedLng = localStorage.getItem("userLng");

    if (savedLat && savedLng) {
        fetchNearbyMarkets(savedLat, savedLng);
        // Auto-update location text if available
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${savedLat}&lon=${savedLng}`)
            .then(res => res.json())
            .then(data => {
                const area = data.address.suburb || data.address.city_district || data.address.city || "Current Location";
                const disp = document.getElementById("userLocationDisplay");
                if (disp) disp.innerText = `${area} 🟢`;
            }).catch(() => {
                const disp = document.getElementById("userLocationDisplay");
                if (disp) disp.innerText = "GPS Active 🟢";
            });
    } else {
        getUserLocation(); // Auto-detect on load
    }

    fetch(`${API_URL}/products`)
        .then(res => res.json())
        .then(products => {
            currentProducts = products;
            const grid = document.getElementById("products-grid");
            if (!grid) {
                isFetchingHome = false;
                return;
            }
            grid.innerHTML = "";
            if (products.length === 0) {
                grid.innerHTML = `<div style="text-align: center; padding: 40px 20px; width: 100%;">
              <h3 style="color: var(--text-muted); font-size: 18px;">🛒 No products available in your area right now.</h3>
              <p style="color: var(--text-muted); font-size: 14px;">Check back later or try exploring different markets!</p>
          </div>`;
            }
            else {
                products.forEach(p => {
                    grid.innerHTML += createProductHTML(p);
                });
            }
            isFetchingHome = false;
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            isFetchingHome = false;
            const grid = document.getElementById("products-grid");
            if (grid) {
                grid.innerHTML = `
                    <div class="error-state" style="width: 100%;">
                        <div class="error-state-icon">📡</div>
                        <h3 class="error-state-title">Could not load products</h3>
                        <p class="error-state-msg">Check your internet connection and try again.</p>
                        <button class="error-state-btn" onclick="isFetchingHome=false; loadHome()">🔄 Try Again</button>
                    </div>`;
            }
        });
}


// =======================================================
// 🌍 GEOSPATIAL ENGINE (Location & Distances)
// =======================================================

function getUserLocation() {
    document.getElementById("userLocationDisplay").innerText = "Locating... 🛰️";
    
    // Silent IP-based location fetch first
    fetch("http://ip-api.com/json/")
      .then(res => res.json())
      .then(data => {
          if(data.status === "success") {
              localStorage.setItem("userLat", data.lat);
              localStorage.setItem("userLng", data.lon);
              const disp = document.getElementById("userLocationDisplay");
              if (disp) disp.innerText = `${data.city} (IP) 🟢`;
              showToast(`Location detected: ${data.city}`, "success");
              fetchNearbyMarkets(data.lat, data.lon);
          } else {
              fallbackToGPS();
          }
      })
      .catch(() => fallbackToGPS());
}

function fallbackToGPS() {
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
                showToast("Location access denied or timed out. Showing all markets.", "error");
                document.getElementById("userLocationDisplay").innerText = "Delhi, India (default) 📍";
                console.warn("Geolocation denied:", error.message);
                fetchAllMarkets();
            },
            { timeout: 8000 }
        );
    } else {
        showToast("Geolocation is not supported by your browser.", "error");
        document.getElementById("userLocationDisplay").innerText = "Delhi, India (default) 📍";
        fetchAllMarkets();
    }
}

function fetchNearbyMarkets(lat, lng) {
    // Fetch markets within 50km (50000 meters)
    fetch(`${API_URL}/products/markets/nearby?lat=${lat}&lng=${lng}&radius=50000`)
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
            const formatted = markets.map(m => typeof m === 'string' ? { name: m } : m);
            renderMarketGrid(formatted, false);
        });
}

function renderMarketGrid(markets, isNearby) {
    const grid = document.getElementById("markets-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (markets.length === 0) {
        grid.innerHTML = `<p style="padding: 20px; color: var(--text-muted);">No markets found within 50km. Try exploring other areas!</p>`;
        return;
    }

    markets.forEach(market => {
        let distanceText = market.distance ? `<span class="market-distance">${market.distance.toFixed(1)} km</span>` : "";
        let badge = isNearby ? `<span class="market-nearby-badge">📍</span>` : "";

        grid.innerHTML += `
            <div class="market-card" onclick="loadShops('${escapeAttr(market.name)}')">
              ${badge}
              <span class="market-name">${sanitizeHTML(market.name)}</span>
              ${distanceText}
            </div>
        `;
    });
}

function loadShops(marketName) {
    currentMarketName = marketName;
    const container = document.getElementById("products") || document.getElementById("wishlist-container") || document.getElementById("customerOrdersList") || document.querySelector("main");
    container.innerHTML = `
    <div id="current-view" data-view="markets"></div>
    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
        <button onclick="loadHome()" style="background: var(--card-bg); color: var(--text-main); border: 1px solid #ddd; border-radius: 8px; width: auto; display: inline-block;">⬅ Back to Home</button>
        <h2 style="font-size: 24px; font-weight: 700; margin: 0;">🏪 Shops in ${marketName}</h2>
    </div>
    <div id="grid" class="product-grid">
        ${getShopSkeletons(6)}
    </div>
  `;

    fetch(`${API_URL}/products/markets/${marketName}/shops`)
        .then(res => res.json())
        .then(shops => {
            const grid = document.getElementById("grid");
            grid.innerHTML = "";
            if (shops.length === 0) grid.innerHTML = "<p>No shops in this market yet.</p>";
            shops.forEach(shop => {
                grid.innerHTML += `
          <div style="border: 1px solid transparent; padding: 25px; border-radius: var(--border-radius); cursor: pointer; background: var(--card-bg); text-align: center; box-shadow: var(--shadow); transition: var(--transition);" onmouseover="this.style.transform='translateY(-8px)'; this.style.borderColor='var(--primary)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='transparent'" onclick="loadProducts('${escapeAttr(shop)}')">
            <h3 style="margin-bottom: 10px; font-size: 20px; font-weight: 700;">🏬 ${sanitizeHTML(shop)}</h3>
            <span style="color: var(--primary); font-weight: bold;">View Menu ➔</span>
          </div>
        `;
            });
        });
}

function loadProducts(shopName) {
    const container = document.getElementById("products") || document.getElementById("wishlist-container") || document.getElementById("customerOrdersList") || document.querySelector("main");
    container.innerHTML = `
    <div id="current-view" data-view="shop" data-shop="${shopName}"></div>
    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
        <button onclick="loadShops('${currentMarketName}')" style="background: var(--card-bg); color: var(--text-main); border: 1px solid #ddd; border-radius: 8px; width: auto; display: inline-block;">⬅ Back to Shops</button>
        <h2 style="font-size: 24px; font-weight: 700; margin: 0;">🍔 ${shopName} Menu</h2>
    </div>
    <div id="grid" class="product-grid">
        ${getProductSkeletons(8)}
    </div>
  `;

    fetch(`${API_URL}/products/shops/${shopName}`)
        .then(res => res.json())
        .then(productsData => {
            const products = Array.isArray(productsData) ? productsData : (productsData.products || []);
            currentProducts = products;
            const grid = document.getElementById("grid");
            if (grid) {
                grid.innerHTML = "";
                if (products.length === 0) grid.innerHTML = "<p>This shop hasn't added any products yet.</p>";
                products.forEach(p => {
                    grid.innerHTML += createProductHTML(p);
                });
            }
        })
        .catch(err => console.error("Fetch Error:", err));
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
    const NO_IMG_SVG = `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='42%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48px'%3E📷%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16px' fill='%23999'%3ENo Photo Yet%3C/text%3E%3C/svg%3E`;
    let imageSrc = p.image
        ? p.image.replace('/upload/', '/upload/w_400,q_auto,f_auto/')
        : NO_IMG_SVG;
    if (imageSrc && !imageSrc.startsWith('http')) {
        imageSrc = `${API_URL}/${imageSrc.replace(/^\\+|^\/+/g, '').replace(/\\/g, '/')}`;
    }
    const safeImage = escapeAttr(imageSrc);
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

    const shareUrl = encodeURIComponent(`${window.location.origin}/?q=${encodeURIComponent(p.name)}`);
    const shareText = encodeURIComponent(`Check out ${p.name} for ₹${p.price} on VyaparSync!`);
    const waLink = `https://wa.me/?text=${shareText}%20${shareUrl}`;
    
    let stockText = "";
    if (p.stock > 0 && p.stock <= 5) stockText = `<span style="color: #e67e22; font-weight: bold; font-size: 13px;">Only ${p.stock} left!</span>`;
    else if (p.stock > 5) stockText = `<span style="color: #27ae60; font-weight: bold; font-size: 13px;">In Stock</span>`;
    else stockText = `<span style="color: #e74c3c; font-weight: bold; font-size: 13px;">Out of Stock</span>`;
    
    let cartBtnDisabled = p.stock < 1 ? "disabled" : "";

    return `
      <div class="product" style="position: relative; cursor: pointer;" onclick="loadProductDetails('${p._id}')">
        <a href="${waLink}" target="_blank" onclick="event.stopPropagation();" style="position: absolute; top: 50px; right: 10px; background: #25D366; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 16px; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform 0.2s;">📤</a>
        <button onclick="event.stopPropagation(); toggleWishlist('${p._id}', this)" style="position: absolute; top: 10px; right: 10px; background: white; border: none; border-radius: 50%; width: 35px; height: 35px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; color: ${heartColor}; z-index: 10; padding: 0; margin: 0; transition: transform 0.2s;">
            ♥
        </button>
        <img src="${safeImage}" alt="${attrName}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect width=%22200%22 height=%22200%22 fill=%22%23eeeeee%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2216px%22 fill=%22%23999999%22%3ENo Image%3C/text%3E%3C/svg%3E';">
        <h3>${safeName}</h3>
        <p style="cursor: pointer; margin-bottom: 5px;" onclick="event.stopPropagation(); window.location.href='seller-profile.html?shop=' + encodeURIComponent('${safeShopName}')">
            🏬 ${safeShopName} ${badgeHtml} | 🏙️ ${safeMarket}
        </p>
        ${trustScoreHtml}
        
        <div style="margin: 5px 0; font-size: 14px; color: var(--text-muted);">
            ${starsHtml} <span style="font-weight: bold; color: var(--text-main);">${rating}</span> (${p.totalReviews || 0} reviews)
        </div>

        <p>${stockText}</p>
        <p class="price">₹${p.price}</p>
        
        <div style="margin-top: auto; display: flex; flex-direction: column; width: 100%;">
            ${p.reviews && p.reviews.length > 0 ? `
                <div class="review-box" style="height: 55px; margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.02); border-radius: 8px; font-size: 12px; text-align: left; border-left: 3px solid #f1c40f; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; box-sizing: border-box;">
                    <b style="color: var(--text-main);">${sanitizeHTML(p.reviews[p.reviews.length - 1].customerName)}</b> 
                    <span style="color: #27ae60; font-weight: bold; font-size: 10px;">✅ Verified</span><br>
                    <i style="color: var(--text-muted);">"${sanitizeHTML(p.reviews[p.reviews.length - 1].comment)}"</i>
                </div>
            ` : `
                <div class="review-box" style="height: 55px; margin-top: 10px; padding: 10px; font-size: 12px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); box-sizing: border-box;">
                    <i>No reviews yet</i>
                </div>
            `}

            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px; width: 100%;">
                <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart('${p._id}')" ${cartBtnDisabled} style="margin-top: 0; background: #f1c40f; color: #333; flex: 1;">🛒 Add</button>
                <button class="buy-now-btn" onclick="event.stopPropagation(); buy('${p._id}')" ${cartBtnDisabled} style="margin-top: 0; flex: 1;">⚡ Buy</button>
            </div>
        </div>
      </div>
    `;
}

function loadProductDetails(productId) {
    const product = currentProducts.find(p => p._id === productId);
    if (!product) return;

    const container = document.getElementById("products") || document.getElementById("wishlist-container") || document.getElementById("customerOrdersList") || document.querySelector("main");

    const NO_IMG_SVG_LARGE = `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Crect width='600' height='600' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='42%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='72px'%3E📷%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20px' fill='%23999'%3ENo Photo Yet%3C/text%3E%3C/svg%3E`;
    let imageSrc = product.image
        ? product.image.replace('/upload/', '/upload/w_600,q_auto,f_auto/')
        : NO_IMG_SVG_LARGE;
    if (imageSrc && !imageSrc.startsWith('http')) {
        imageSrc = `${API_URL}/${imageSrc.replace(/^\\+|^\/+/g, '').replace(/\\/g, '/')}`;
    }
    const safeImage = escapeAttr(imageSrc);

    let sizesHtml = "";
    if (product.sizes && product.sizes.length > 0) {
        sizesHtml = `
            <div style="margin: 20px 0;">
                <b style="display: block; margin-bottom: 8px; color: var(--text-main);">Available Sizes:</b>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${product.sizes.map(size => `<button class="size-btn" onclick="selectSize(this)" style="padding: 10px 15px; border: 2px solid rgba(0,0,0,0.1); background: transparent; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s;">${sanitizeHTML(size)}</button>`).join('')}
                </div>
                <input type="hidden" id="selectedSize" value="">
            </div>
        `;
    }

    let starsHtml = "";
    const rating = product.averageRating || 0;
    for (let i = 1; i <= 5; i++) {
        starsHtml += i <= Math.round(rating) ? '<span style="color: #f1c40f;">★</span>' : '<span style="color: #ddd;">★</span>';
    }

    container.innerHTML = `
        <div id="current-view" data-view="product-details"></div>
        <div style="margin-bottom: 25px;">
            <button onclick="loadHome()" style="background: var(--card-bg); color: var(--text-main); border: 1px solid #ddd; border-radius: 8px; padding: 10px 20px; cursor: pointer;">⬅ Back</button>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 40px; background: var(--card-bg); padding: 40px; border-radius: var(--border-radius); box-shadow: var(--shadow);">
            
            <div style="flex: 1; min-width: 300px; max-width: 500px;">
                <img src="${safeImage}" loading="lazy" style="width: 100%; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
            </div>
            
            <div style="flex: 2; min-width: 300px;">
                <h1 style="margin-top: 0; margin-bottom: 10px; color: var(--text-main); font-size: 32px;">${sanitizeHTML(product.name)}</h1>
                
                <div style="font-size: 16px; color: var(--text-muted); margin-bottom: 15px;">
                    ${starsHtml} <span style="font-weight: bold; color: var(--text-main);">${rating}</span> (${product.totalReviews || 0} verified reviews)
                </div>

                <div style="padding: 10px 15px; background: rgba(0,0,0,0.03); border-radius: 8px; display: inline-block; margin-bottom: 20px;">
                    Sold by <b>${sanitizeHTML(product.shopName)}</b> | 🏙️ ${sanitizeHTML(product.market)}
                    <div style="font-size: 12px; margin-top: 5px;">Category: <span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 10px;">${sanitizeHTML(product.category || 'General')}</span></div>
                </div>

                <div style="font-size: 36px; font-weight: bold; color: var(--primary); margin-bottom: 15px;">
                    ₹${product.price}
                </div>
                
                <div style="margin-bottom: 20px;">
                    ${product.stock > 0 ? `<span style="color: #27ae60; font-weight: bold;">In Stock (${product.stock} available)</span>` : `<span style="color: #e74c3c; font-weight: bold;">Out of Stock</span>`}
                </div>

                ${sizesHtml}

                <div style="margin: 30px 0;">
                    <b style="display: block; margin-bottom: 10px; font-size: 18px; color: var(--text-main);">Product Details:</b>
                    <p style="color: var(--text-muted); line-height: 1.6; white-space: pre-wrap;">${sanitizeHTML(product.description || "No description provided.")}</p>
                </div>

                <div style="display: flex; gap: 15px; margin-top: 30px;">
                    <button onclick="addToCartWithSize('${product._id}')" style="flex: 1; padding: 15px; background: #f1c40f; color: #111; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.2s;">🛒 Add to Cart</button>
                    <button onclick="buyWithSize('${product._id}')" style="flex: 1; padding: 15px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.2s;">⚡ Buy Now</button>
                    <button onclick="toggleWishlist('${product._id}', this)" style="flex: 1; padding: 15px; background: rgba(0,0,0,0.05); color: var(--text-main); border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.2s;">?? Wishlist</button>
                </div>
            </div>
            
        </div>
    `;
}

function selectSize(btn) {
    document.querySelectorAll('.size-btn').forEach(b => {
        b.style.borderColor = 'rgba(0,0,0,0.1)';
        b.style.background = 'transparent';
        b.style.color = 'var(--text-main)';
    });
    btn.style.borderColor = 'var(--primary)';
    btn.style.background = 'var(--primary)';
    btn.style.color = 'white';
    document.getElementById('selectedSize').value = btn.innerText;
}

function addToCartWithSize(id) {
    const sizeInput = document.getElementById('selectedSize');
    let size = "";
    if (sizeInput && document.querySelector('.size-btn')) { // If there are sizes to choose from
        size = sizeInput.value;
        if (!size) {
            return showToast("Please select a size first!", "error");
        }
    }

    // Modification of addToCart logic to include size
    const product = currentProducts.find(p => p._id === id);
    if (!product) return;
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem("cart")) || [];
    } catch (e) {
        cart = [];
    }

    // We append size to id in the cart so different sizes of same product are separate items
    const cartItemId = size ? `${id}_${size}` : id;

    const existingItem = cart.find(item => item.id === cartItemId);
    if (existingItem) {
        if (existingItem.quantity >= product.stock) return showToast(`Only ${product.stock} units available!`, "error");
        existingItem.quantity += 1;
    } else {
        if (product.stock < 1) return showToast("Out of stock!", "error");
        cart.push({ id: cartItemId, originalId: id, name: product.name + (size ? ` (${size})` : ""), price: product.price, quantity: 1, stock: product.stock, image: product.image, market: product.market });
    }

    localStorage.setItem("cart", JSON.stringify(cart)); updateCartBadge();
    showToast(`${product.name} ${size ? `(${size})` : ''} added to cart!`, "success");
}

function buyWithSize(id) {
    const sizeInput = document.getElementById('selectedSize');
    if (sizeInput && document.querySelector('.size-btn') && !sizeInput.value) {
        return showToast("Please select a size first!", "error");
    }
    addToCartWithSize(id);
    setTimeout(() => { window.location.href = "cart.html"; }, 500);
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
    const mainInput = document.getElementById("mainSearchInput");
    let query = mainInput ? mainInput.value.trim() : "";

    const category = document.getElementById("filterCategory") ? document.getElementById("filterCategory").value : "All";
    const minPrice = document.getElementById("minPrice") ? document.getElementById("minPrice").value : "";
    const maxPrice = document.getElementById("maxPrice") ? document.getElementById("maxPrice").value : "";
    const inStock = document.getElementById("inStockToggle") ? document.getElementById("inStockToggle").checked : false;
    const sort = document.getElementById("sortFilter") ? document.getElementById("sortFilter").value : "newest";

    if (query === "" && category === "All" && (minPrice === "" || minPrice === "0") && (maxPrice === "" || maxPrice === "10000") && !inStock && sort === "newest") {
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

    const container = document.getElementById("products") || document.getElementById("wishlist-container") || document.getElementById("customerOrdersList") || document.querySelector("main");
    const isSearchActive = document.getElementById("current-view") && document.getElementById("current-view").getAttribute("data-view") === "search";

    if (!isSearchActive) {
        container.innerHTML = `
          <div id="current-view" data-view="search"></div>
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
              <button onclick="clearSearch()" style="background: var(--card-bg); color: var(--text-main); border: 1px solid #ddd; border-radius: 8px; width: auto; display: inline-block;">⬅ Clear Filters</button>
              <h2 style="font-size: 24px; margin: 0;" id="searchTitle">🔍 Search Results</h2>
          </div>
          <div id="grid" class="product-grid">
              ${getProductSkeletons(8)}
          </div>
        `;
    } else {
        const st = document.getElementById("searchTitle");
        if (st) st.innerText = query ? `🔍 Results for "${query}"` : `🔍 Filtered Results`;
        const grid = document.getElementById("grid");
        if (grid) grid.innerHTML = getProductSkeletons(8);
    }

    fetch(fetchUrl)
        .then(res => res.json())
        .then(products => {
            currentProducts = products;
            const grid = document.getElementById("grid");
            if (grid) grid.innerHTML = "";

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
    if (document.getElementById("minPrice")) document.getElementById("minPrice").value = "0";
    if (document.getElementById("maxPrice")) document.getElementById("maxPrice").value = "10000";
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
    if (existingItem) {
        if (existingItem.quantity >= product.stock) return showToast(`Only ${product.stock} units available!`, "error");
        existingItem.quantity += 1;
    } else {
        if (product.stock < 1) return showToast("Out of stock!", "error");
        cart.push({ id: product._id, name: product.name, price: product.price, quantity: 1, stock: product.stock, image: product.image, market: product.market });
    }
    localStorage.setItem("cart", JSON.stringify(cart)); updateCartBadge();
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
    const liveBtn = document.getElementById("live-stream-btn");

    if (user && user.role === "retailer") {
        if (liveBtn) liveBtn.style.setProperty("display", "none", "important");
    } else {
        if (liveBtn) liveBtn.style.setProperty("display", "inline-flex", "important");
    }

    if (!userSection) return;

    const btnStyle = "display: inline-flex; align-items: center; justify-content: center; height: 38px; padding: 0 16px; border-radius: 8px; font-weight: bold; font-size: 14px; text-decoration: none; box-sizing: border-box; cursor: pointer; transition: 0.2s;";

    if (user) {
        let dashboardLink = "";
        if (user.role === "retailer") {
            dashboardLink = `<a href="seller-dashboard.html" class="nav-btn premium-btn">Seller Hub</a>`;
        } else if (user.role === "admin") {
            dashboardLink = `<a href="admin-dashboard.html" class="nav-btn premium-btn">CEO Cmd</a>`;
        }

        userSection.innerHTML = `
        ${dashboardLink}
        <button onclick="logout()" class="nav-btn logout-btn">Logout</button>
    `;
    } else {
        userSection.innerHTML = `<a href="login.html" class="nav-btn premium-btn">Login</a>`;
    }
}

function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    showToast("Logged out successfully.", "info");
    setTimeout(() => { location.reload(); }, 1000);
}

// --- INITIALIZE THEME ---


function toggleDark() {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
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

    // Remove existing modal if any
    const existing = document.getElementById('reviewModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div id="reviewModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;padding:20px;box-sizing:border-box;">
            <div style="background:var(--card-bg);padding:30px;border-radius:16px;width:100%;max-width:420px;color:var(--text-main);box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                <h2 style="margin:0 0 5px 0;font-size:20px;">⭐ Write a Review</h2>
                <p style="margin:0 0 20px 0;color:var(--text-muted);font-size:14px;">for <b>${sanitizeHTML(productName)}</b></p>
                
                <p style="margin:0 0 10px 0;font-weight:600;">Your Rating:</p>
                <div id="starRow" style="display:flex;gap:10px;margin-bottom:20px;">
                    ${[1, 2, 3, 4, 5].map(n => `<span data-star="${n}" onclick="selectStar(${n})" style="font-size:36px;cursor:pointer;transition:transform 0.15s;" title="${n} star${n > 1 ? 's' : ''}">☆</span>`).join('')}
                </div>
                <input type="hidden" id="reviewRating" value="0">

                <p style="margin:0 0 8px 0;font-weight:600;">Your Comment:</p>
                <textarea id="reviewComment" placeholder="Tell others about your experience..." style="width:100%;box-sizing:border-box;padding:12px;border-radius:8px;border:1.5px solid rgba(0,0,0,0.15);background:var(--bg-color);color:var(--text-main);font-family:inherit;font-size:14px;resize:vertical;min-height:90px;"></textarea>

                <div style="display:flex;gap:10px;margin-top:20px;">
                    <button onclick="document.getElementById('reviewModal').remove()" style="flex:1;padding:12px;background:transparent;border:1.5px solid rgba(0,0,0,0.15);color:var(--text-muted);border-radius:8px;cursor:pointer;">Cancel</button>
                    <button onclick="submitReview('${escapeAttr(productId)}')" style="flex:2;padding:12px;background:var(--primary);color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Submit Review ⭐</button>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.selectStar = function (n) {
    document.getElementById('reviewRating').value = n;
    document.querySelectorAll('#starRow span').forEach((s, i) => {
        s.textContent = i < n ? '★' : '☆';
        s.style.color = i < n ? '#f1c40f' : 'var(--text-muted)';
        s.style.transform = i < n ? 'scale(1.2)' : 'scale(1)';
    });
};

window.submitReview = async function (productId) {
    const token = localStorage.getItem("token");
    const rating = parseInt(document.getElementById('reviewRating').value);
    const comment = document.getElementById('reviewComment').value.trim();

    if (!rating || rating < 1) return showToast("Please select a star rating!", "error");
    if (!comment) return showToast("Please write a comment.", "error");

    try {
        const res = await fetch(`${API_URL}/products/${productId}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ rating, comment })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        document.getElementById('reviewModal')?.remove();
        showToast("Review published! ⭐", "success");

        const viewType = document.getElementById("current-view")?.getAttribute("data-view");
        if (viewType === "home") loadHome();
        else if (viewType === "shop") loadProducts(document.getElementById("current-view").getAttribute("data-shop"));
        else if (viewType === "search") applyFilters();
    } catch (err) {
        showToast(err.message, "error");
    }
};

// =======================================================
// 🔐 PASSWORDLESS OTP LOGIC
// =======================================================

// --- CUSTOMER LOGIN/REGISTER LOGIC ---
async function requestOTP() {
    const email = document.getElementById("authEmail").value.trim();
    const btn = document.getElementById("sendBtn");

    if (!email || !email.includes("@")) return showToast("Please enter a valid email.", "error");

    btn.innerText = "Sending... 📩 Check your inbox in a moment";
    btn.disabled = true;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

        const res = await fetch(`${API_URL}/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

        // UI Transition
        document.getElementById("emailStep").style.display = "none";
        document.getElementById("otpStep").style.display = "block";
        document.getElementById("displayEmail").innerText = email;
        showToast("Code sent! Check your inbox.", "success");

    } catch (err) {
        if (err.name === 'AbortError') {
            showToast("Server took too long to respond. Please try again.", "error");
        } else {
            showToast(err.message || "Failed to connect to server.", "error");
        }
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
    const platformFeeRow = document.getElementById("platformFeeRow");
    const cartSummarySection = document.getElementById("cartSummarySection");
    const mobileFloatingCheckout = document.getElementById("mobileFloatingCheckout");

    if (cart.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 40px 0; font-size: 18px;">Your cart is empty! 🛒<br><a href="index.html" style="color:var(--primary); text-decoration:none; font-weight:bold; display:inline-block; margin-top:15px; border: 1px solid var(--primary); padding: 8px 20px; border-radius: 8px;">Start Shopping</a></p>`;
        if (subTotalContainer) subTotalContainer.innerText = "₹0";
        if (totalContainer) totalContainer.innerText = "₹0";
        if (platformFeeRow) platformFeeRow.style.display = "none";
        if (cartSummarySection) cartSummarySection.style.display = "none";
        if (mobileFloatingCheckout) mobileFloatingCheckout.style.display = "none";
        return;
    }
    if (cartSummarySection) cartSummarySection.style.display = "block";
    if (window.innerWidth <= 800 && mobileFloatingCheckout) {
        mobileFloatingCheckout.style.display = "flex";
    } else if (mobileFloatingCheckout) {
        mobileFloatingCheckout.style.display = "none";
    }

    // Re-check mobile layout on resize
    if (!window._resizeListenerAdded) {
        window.addEventListener('resize', () => {
            const mfc = document.getElementById("mobileFloatingCheckout");
            let currentCart = [];
            try { currentCart = JSON.parse(localStorage.getItem("cart")) || []; } catch (e) { }
            if (currentCart.length > 0 && mfc) {
                mfc.style.display = window.innerWidth <= 800 ? "flex" : "none";
            }
        });
        window._resizeListenerAdded = true;
    }

    if (platformFeeRow) platformFeeRow.style.display = "flex";
    // Group cart items by seller
    const groupedCart = cart.reduce((acc, item, index) => {
        const shopName = item.market || 'Vyaparsync';
        if (!acc[shopName]) acc[shopName] = [];
        acc[shopName].push({ ...item, originalIndex: index });
        return acc;
    }, {});

    for (const [shopName, items] of Object.entries(groupedCart)) {
        const groupDiv = document.createElement("div");
        groupDiv.className = "shop-group-card";
        groupDiv.style.marginBottom = "20px";
        groupDiv.style.padding = "15px";
        groupDiv.style.border = "1px solid rgba(0,0,0,0.1)";
        groupDiv.style.borderRadius = "10px";
        groupDiv.style.background = "var(--bg-color)";

        groupDiv.innerHTML = `<h3 style="margin-top:0; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 10px; color: var(--primary);">🏬 Sold by: ${sanitizeHTML(shopName)}</h3>`;

        let shopTotal = 0;

        items.forEach((item) => {
            let itemQty = item.quantity || 1;
            let itemPriceTotal = item.price * itemQty;
            shopTotal += itemPriceTotal;
            subTotal += itemPriceTotal;

            let itemImageSrc = item.image || 'https://via.placeholder.com/60';
            if (itemImageSrc && !itemImageSrc.startsWith('http')) {
                itemImageSrc = `${API_URL}/${itemImageSrc.replace(/^\\+|^\/+/g, '').replace(/\\/g, '/')}`;
            }
            const safeItemImage = escapeAttr(itemImageSrc);

            const div = document.createElement("div");
            div.className = "cart-item";
            div.innerHTML = `
            <img src="${safeItemImage}" alt="Product" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23eeeeee%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2210px%22 fill=%22%23999999%22%3ENo Image%3C/text%3E%3C/svg%3E';">
            <div class="cart-info">
              <h3>${sanitizeHTML(item.name)}</h3>
              <div class="qty-controls" style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                  <button style="background: var(--card-bg); border: 1px solid rgba(0,0,0,0.1); width: 25px; height: 25px; border-radius: 5px; cursor: pointer; color: var(--text-main);" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                  <span style="font-weight: bold; color: var(--text-main); font-size: 14px;">${itemQty}</span>
                  <button style="background: var(--card-bg); border: 1px solid rgba(0,0,0,0.1); width: 25px; height: 25px; border-radius: 5px; cursor: pointer; color: var(--text-main);" onclick="updateCartQuantity('${item.id}', 1)">+</button>
              </div>
            </div>
            <div class="cart-price">₹${itemPriceTotal}</div>
            <button class="btn-remove" onclick="removeFromCart(${item.originalIndex})">X</button>
          `;
            groupDiv.appendChild(div);
        });

        const shopTotalDiv = document.createElement("div");
        shopTotalDiv.style.textAlign = "right";
        shopTotalDiv.style.fontWeight = "bold";
        shopTotalDiv.style.marginTop = "10px";
        shopTotalDiv.style.color = "var(--text-muted)";
        shopTotalDiv.innerHTML = `Subtotal: ₹${shopTotal}`;
        groupDiv.appendChild(shopTotalDiv);

        listContainer.appendChild(groupDiv);
    }
    const platformFee = 0; // Calculated dynamically during checkout
    let finalTotal = subTotal + platformFee;

    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        if (cart.length === 0) {
            checkoutBtn.style.opacity = "0.5";
            checkoutBtn.style.pointerEvents = "none";
        } else {
            checkoutBtn.style.opacity = "1";
            checkoutBtn.style.pointerEvents = "auto";
        }
    }
    let walletUsed = 0;

    let user = null;
    try {
        user = JSON.parse(localStorage.getItem("user"));
    } catch (e) { }
    const walletRow = document.getElementById("walletDiscountRow");

    if (user && user.walletBalance > 0 && subTotal > 0) {
        if (walletRow) walletRow.style.display = "flex";
        walletUsed = Math.min(user.walletBalance, finalTotal - 1);
        const cartWalletDiscount = document.getElementById("cartWalletDiscount");
        if (cartWalletDiscount) cartWalletDiscount.innerText = `-₹${walletUsed}`;
        finalTotal -= walletUsed;
    } else {
        if (walletRow) walletRow.style.display = "none";
    }

    if (subTotalContainer) subTotalContainer.innerText = `₹${subTotal}`;
    if (totalContainer) totalContainer.innerText = `₹${finalTotal}`;

    const mobileCartTotal = document.getElementById("mobileCartTotal");
    if (mobileCartTotal) mobileCartTotal.innerText = `₹${finalTotal}`;

    const summaryItemCount = document.getElementById("summaryItemCount");
    if (summaryItemCount) summaryItemCount.innerText = cart.length;

    const platformFeeUI = document.getElementById("platformFeeDisplay");
    if (platformFeeUI) {
        platformFeeUI.innerText = subTotal > 0 ? "Calculated at checkout" : "₹0";
    }
}

window.removeFromCart = function (index) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart)); updateCartBadge();
    loadCart();
    showToast("Item removed from cart.", "info");
}

window.updateCartQuantity = function (id, change) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const index = cart.findIndex(i => i.id === id);
    if (index !== -1) {
        let newQty = (cart[index].quantity || 1) + change;
        if (change > 0 && cart[index].stock !== undefined && newQty > cart[index].stock) { showToast("Maximum available stock reached", "error"); return; }
        cart[index].quantity = newQty;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
            showToast("Item removed from cart.", "info");
        }
        localStorage.setItem("cart", JSON.stringify(cart)); updateCartBadge();
        loadCart();
    }
}

// =======================================================
// ❤️ WISHLIST ENGINE
// =======================================================

async function loadWishlist() {
    const container = document.getElementById("wishlist-container");
    if (!container) return;

    const token = localStorage.getItem("token");
    if (!token) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px">
                <p style="color:var(--text-muted);margin-bottom:16px">
                    Please log in to view your wishlist
                </p>
                <a href="login.html" style="background:var(--primary);color:white;
                    padding:12px 28px;border-radius:8px;text-decoration:none;
                    font-weight:600">Login to View Wishlist</a>
            </div>`;
        return;
    }

    try {
        const res = await fetch(`${API_URL}/products/my-wishlist`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            if (container) {
                container.innerHTML = `
                    <div style="text-align:center;padding:60px 20px;">
                        <h3 style="margin-bottom: 10px; color: var(--text-main);">Session Expired</h3>
                        <p style="color:var(--text-muted);margin-bottom:15px;">Please log in again to view your wishlist.</p>
                        <a href="login.html" style="background:var(--primary);color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Login</a>
                    </div>
                `;
            }
            return;
        }
        if (!res.ok) throw new Error("Failed to fetch wishlist");
        const products = await res.json();

        currentWishlist = products.map(p => p._id);

        container.innerHTML = `
            <div id="current-view" data-view="wishlist"></div>
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
                <button onclick="window.location.href='index.html'" style="background: var(--card-bg); color: var(--text-main); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; width: auto; display: inline-block;">⬅ Back to Home</button>
                <h2 style="font-size: 24px; font-weight: 700; margin: 0; color: var(--text-main);">❤️ My Wishlist</h2>
            </div>
            <div id="grid" class="product-grid"></div>
        `;

        const grid = document.getElementById("grid");
        if (!products || products.length === 0) {
            grid.innerHTML = `
                <div style="text-align:center;padding:40px 20px;grid-column: 1 / -1;">
                    <p style="color:var(--text-muted);margin-bottom:16px">Your wishlist is empty - browse markets to add items</p>
                    <a href="index.html" style="background:var(--primary);color:white;
                        padding:10px 24px;border-radius:8px;text-decoration:none;
                        font-weight:600;display:inline-block">Browse Markets</a>
                </div>`;
            return;
        }

        products.forEach(p => {
            grid.innerHTML += createProductHTML(p);
        });

    } catch (err) {
        showToast("Failed to load wishlist", "error");
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;">
                    <p style="color:var(--text-muted);margin-bottom:15px;">Could not load wishlist.</p>
                    <button onclick="loadWishlist()" style="background:var(--primary);color:white;padding:10px 24px;border-radius:8px;border:none;font-weight:600;cursor:pointer;">Retry</button>
                </div>
            `;
        }
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
                showToast("Invalid Pincode — please enter city & state manually.", "error");
                cityInput.value = ""; stateInput.value = "";
                cityInput.placeholder = "City";
                stateInput.placeholder = "State";
            }
        } catch (err) {
            console.error("Pincode API Error:", err);
            showToast("Pincode lookup failed — please enter city & state manually.", "error");
            cityInput.placeholder = "City";
            stateInput.placeholder = "State";
        }
    }
}

// 🛑 INTERCEPT THE CHECKOUT BUTTON
window.startCheckoutProcess = function () {
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

                <button type="button" onclick="getCurrentLocation()" style="width:100%; padding:10px; margin-bottom:15px; border-radius:8px; border:1px solid var(--primary); background:var(--card-bg); color:var(--primary); font-weight:bold; cursor:pointer;">
                    📍 Use My Current Location
                </button>

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
window.confirmAddressAndPay = async function () {
    const line1 = document.getElementById("addressLine1").value;
    const pincode = document.getElementById("addressPincode").value;
    const city = document.getElementById("addressCity").value;
    const state = document.getElementById("addressState").value;
    const phone = document.getElementById("addressPhone").value;

    if (!line1 || pincode.length !== 6 || !city || !state || phone.length !== 10) {
        return showToast("Please fill all required address fields correctly (and 10-digit phone).", "error");
    }

    // If GPS not selected, try to geocode from pincode/city
    if (!selectedLat || !selectedLng) {
        if (pincode.length === 6 && city) {
            try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(city + ' ' + pincode)}`);
                const geoData = await geoRes.json();
                if (geoData && geoData.length > 0) {
                    selectedLat = parseFloat(geoData[0].lat);
                    selectedLng = parseFloat(geoData[0].lon);
                } else {
                    // Use a generic India centre as fallback — delivery can still proceed
                    selectedLat = 20.5937;
                    selectedLng = 78.9629;
                }
            } catch (e) {
                selectedLat = 20.5937;
                selectedLng = 78.9629;
            }
        } else {
            // Minimal fallback — don't block the user
            selectedLat = 20.5937;
            selectedLng = 78.9629;
        }
        showToast("Tip: Use 'Current Location' for more accurate delivery estimates.", "info");
    }

    // Save snapshot to memory
    currentShippingAddress = {
        line1,
        line2: document.getElementById("addressLine2").value,
        city,
        state,
        pincode,
        phone,
        location: {
            lat: selectedLat,
            lng: selectedLng
        }
    };

    // Remove the modal
    document.getElementById('addressModal').remove();

    // 🚚 DYNAMIC DELIVERY CALCULATION
    showToast("Calculating delivery options...", "success");
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    try {
        const response = await fetch(`${API_URL}/orders/delivery-options`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cartItems: cart,
                buyerLocation: currentShippingAddress.location
            })
        });

        let selectedDeliveryId = "standard_delhivery";
        let deliveryFee = 10;

        if (response.ok) {
            const data = await response.json();
            if (data.options && data.options.length > 0) {
                // Auto-select the first option (Dunzo if available)
                const selectedOption = data.options[0];
                selectedDeliveryId = selectedOption.id;
                deliveryFee = selectedOption.fee;

                // Update Cart DOM
                const feeLabel = document.querySelector('.cart-summary div:nth-child(2) span:nth-child(1)');
                const feeValue = document.querySelector('.cart-summary div:nth-child(2) span:nth-child(2)');
                if (feeLabel && feeValue) {
                    feeLabel.innerText = selectedOption.name;
                    feeValue.innerText = `₹${deliveryFee}`;
                }

                // Update Final Total text based on updated subtotal + dynamic delivery fee
                const totalElem = document.getElementById("cartTotal");
                if (totalElem) {
                    let subTotal = 0;
                    cart.forEach(item => { subTotal += (item.price * (item.quantity || 1)); });
                    totalElem.innerText = `₹${subTotal + deliveryFee}`;
                }

                showToast(`Selected: ${selectedOption.name}`, "success");
            }
        }

        checkoutCart(selectedDeliveryId, deliveryFee);
    } catch (err) {
        console.error("Delivery Options Error:", err);
        checkoutCart("standard_delhivery", 10);
    }
}

// 🌍 OpenStreetMap Autocomplete Logic
let osmTimeout;
let selectedLat = null;
let selectedLng = null;

window.getCurrentLocation = function () {
    if (navigator.geolocation) {
        showToast("Fetching location...", "success");
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                selectedLat = position.coords.latitude;
                selectedLng = position.coords.longitude;

                try {
                    // Reverse Geocode
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedLat}&lon=${selectedLng}`);
                    const data = await response.json();
                    if (data && data.address) {
                        const addr = data.address;
                        const area = addr.suburb || addr.neighbourhood || addr.road || addr.county || '';
                        if (area) document.getElementById('addressLine2').value = area;

                        const city = addr.city || addr.town || addr.state_district || addr.county || '';
                        if (city) document.getElementById('addressCity').value = city;

                        if (addr.state) document.getElementById('addressState').value = addr.state;
                        if (addr.postcode) document.getElementById('addressPincode').value = addr.postcode.replace(/\s/g, '').substring(0, 6);

                        document.getElementById('osmSearch').value = "Current Location Selected";
                        showToast("Location Captured Successfully! 📍", "success");
                    }
                } catch (e) {
                    console.error("Reverse Geocoding Error:", e);
                    showToast("Coordinates captured, but failed to fetch address text.", "error");
                }
            },
            (error) => {
                showToast("Please allow location access for Hyperlocal Delivery.", "error");
            }
        );
    } else {
        showToast("Geolocation is not supported by this browser.", "error");
    }
};
window.searchOSMAddress = function () {
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

window.selectOSMAddress = function (place) {
    document.getElementById('osmSearch').value = place.display_name;
    document.getElementById('osmSuggestions').style.display = 'none';

    // Smart Autofill
    const addr = place.address;

    // Line 2 (Area/Road/Suburb)
    const area = addr.suburb || addr.neighbourhood || addr.road || addr.county || '';
    if (area) document.getElementById('addressLine2').value = area;

    // City
    const city = addr.city || addr.town || addr.state_district || addr.county || '';
    if (city) document.getElementById('addressCity').value = city;

    // State
    if (addr.state) document.getElementById('addressState').value = addr.state;

    // Pincode
    if (addr.postcode) {
        document.getElementById('addressPincode').value = addr.postcode.replace(/\s/g, '').substring(0, 6);
    }

    // NEW CODE: Secretly capture the coordinates
    selectedLat = parseFloat(place.lat);
    selectedLng = parseFloat(place.lon);

    showToast("Address Autofilled Successfully! 🌍", "success");
};

window.checkoutCart = async function (selectedDeliveryId = "standard_delhivery", deliveryFee = 10) {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cart.length === 0) return showToast("Your cart is empty!", "error");
    let subTotal = 0;
    cart.forEach(item => { subTotal += (item.price * (item.quantity || 1)); });
    const totalAmount = subTotal + deliveryFee;
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
            body: JSON.stringify({
                cartItems: cart.map(item => ({ ...item, id: item.originalId || item.id })),
                selectedDeliveryId: selectedDeliveryId,
                buyerLocation: currentShippingAddress.location
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server returned ${response.status}: ${errorText}`);
        }
        const rzpOrder = await response.json();
        if (!rzpOrder.keyId) throw new Error("Payment Gateway not configured properly.");
        const options = {
            "key": rzpOrder.keyId,
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
            "handler": async function (response) { await verifyAndPlaceOrders(response, selectedDeliveryId); },
            "prefill": {
                "name": JSON.parse(localStorage.getItem("user")).name || "",
                "email": JSON.parse(localStorage.getItem("user")).email || "",
                "contact": (currentShippingAddress && currentShippingAddress.phone) ? "91" + currentShippingAddress.phone : ""
            },
            "theme": { "color": "#ff6a00" } // VyaparSync brand orange
        };
        const rzp1 = new Razorpay(options);
        rzp1.open();
    } catch (err) { showToast("Checkout Error: " + err.message, "error"); }
}

async function verifyAndPlaceOrders(paymentProof, selectedDeliveryId) {
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
                shippingAddress: currentShippingAddress,
                selectedDeliveryId: selectedDeliveryId
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
    if (!token) {
        listContainer.innerHTML = `
      <div style="text-align:center;padding:60px 20px">
        <p style="color:var(--text-muted);margin-bottom:16px">
          Please log in to view your orders
        </p>
        <a href="login.html" style="background:var(--primary);color:white;
          padding:12px 28px;border-radius:8px;text-decoration:none;
          font-weight:600">Login to View Orders</a>
      </div>`;
        return;
    }

    // Show skeleton while loading
    listContainer.innerHTML = [1, 2, 3].map(() => `
    <div class="order-card" style="opacity:0.45;pointer-events:none;">
      <div class="order-info" style="flex:1;width:100%;">
        <div style="height:18px;background:rgba(128,128,128,0.2);border-radius:4px;width:60%;margin-bottom:10px;"></div>
        <div style="height:14px;background:rgba(128,128,128,0.15);border-radius:4px;width:40%;margin-bottom:8px;"></div>
        <div style="height:20px;background:rgba(255,106,0,0.15);border-radius:4px;width:20%;"></div>
      </div>
      <div style="width:80px;height:24px;background:rgba(128,128,128,0.2);border-radius:12px;"></div>
    </div>`).join('');

    fetch(`${API_URL}/orders/customer`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    })
        .then(async res => {
            if (res.status === 502 || res.status === 503) {
                 showToast("Servers are waking up, fetching orders...", "info");
                 return [];
            }
            if (!res.ok) {
                 if(res.status === 401 || res.status === 403) throw new Error("session_expired");
                 throw new Error("Failed to load orders");
            }
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

                // Determine badge class and text based on all possible statuses
                let badgeClass, statusText;
                if (order.status.includes("Delivered")) {
                    badgeClass = "status-delivered"; statusText = "Delivered ✅";
                } else if (order.status.includes("Shipped")) {
                    badgeClass = "status-shipped"; statusText = "Shipped 🚚";
                } else if (order.status.includes("Cancelled")) {
                    badgeClass = "status-cancelled"; statusText = "Cancelled ❌";
                } else if (order.status.includes("Rejected")) {
                    badgeClass = "status-cancelled"; statusText = "Rejected ❌";
                } else {
                    badgeClass = "status-pending"; statusText = "Pending 🕒";
                }

                // Build itemized product list
                let itemsHTML = "";
                if (order.items && order.items.length > 0) {
                    itemsHTML = `<ul style="margin:8px 0;padding-left:18px;font-size:13px;color:var(--text-muted);">` +
                        order.items.map(it => `<li>${sanitizeHTML(it.name)} &times; ${it.quantity || 1}</li>`).join('') +
                        `</ul>`;
                } else {
                    itemsHTML = `<h3>${sanitizeHTML(order.productName)}</h3>`;
                }

                // 🗺️ DYNAMIC LOGISTICS TICKET & LIVE MAP SIMULATION
                let trackingHTML = "";
                if (order.status.includes("Shipped")) {
                    trackingHTML = `
                <div style="margin-top: 15px; padding: 12px; background: rgba(0,0,0,0.02); border-radius: 8px; border: 1px dashed rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 10px; font-size: 13px;">
                        <span style="color: var(--text-main); font-weight: bold;">🚚 Dispatched from ${sanitizeHTML(order.market || 'seller')}. Arriving soon via local courier.</span>
                    </div>
                    <div id="map-${order._id}" style="height: 180px; width: 100%; border-radius: 8px; z-index: 1;"></div>
                    <div style="text-align: center; margin-top: 8px; font-size: 11px; color: #2ecc71; font-weight: bold;">
                        🟢 Local Courier Dispatched
                    </div>
                </div>
            `;
                }

                let actionHTML = "";
                if (!order.status.includes("Shipped") && !order.status.includes("Cancelled") && !order.status.includes("Rejected") && !order.status.includes("Delivered")) {
                    actionHTML = `<button onclick="cancelOrder('${order._id}')" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-top: 10px;">Cancel Order</button>`;
                }

                // 📝 REVIEW BUTTON — only for Delivered orders
                let reviewHTML = "";
                if (order.status.includes("Delivered")) {
                    if (order.items && order.items.length > 0) {
                        // Multi-item order: review button per item
                        reviewHTML = order.items.map(it => {
                            const pid = it.productId || it._id;
                            if (!pid) return "";
                            const escapedName = sanitizeHTML(it.name).replace(/'/g, "\\'");
                            return `<button class="order-review-btn" data-pid="${escapeAttr(pid)}"
                                onclick="openReviewPrompt('${escapeAttr(pid)}', '${escapedName}')"
                                style="margin-top:8px;padding:8px 14px;background:transparent;border:1px dashed #1abc9c;border-radius:8px;cursor:pointer;color:#1abc9c;font-size:12px;width:100%;">
                                📝 Review: ${sanitizeHTML(it.name)}
                            </button>`;
                        }).join('');
                    } else if (order.productId) {
                        // Single-item order
                        const escapedName = sanitizeHTML(order.productName || 'this product').replace(/'/g, "\\'");
                        reviewHTML = `<button class="order-review-btn" data-pid="${escapeAttr(order.productId)}"
                            onclick="openReviewPrompt('${escapeAttr(order.productId)}', '${escapedName}')"
                            style="margin-top:8px;padding:8px 14px;background:transparent;border:1px dashed #1abc9c;border-radius:8px;cursor:pointer;color:#1abc9c;font-size:12px;width:100%;">
                            📝 Write a Review
                        </button>`;
                    }
                }

                const div = document.createElement("div");
                div.className = "order-card";
                div.innerHTML = `
          <div class="order-info" style="flex: 1; width: 100%;">
            ${itemsHTML}
            <p><b>Date:</b> ${orderDate} | <b>Market:</b> ${sanitizeHTML(order.market || 'N/A')}</p>
            <p style="color: var(--primary); font-weight: bold; font-size: 16px; margin-top: 5px;">₹${order.price}</p>
            ${trackingHTML}
            ${actionHTML}
            ${reviewHTML}
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
        .catch(err => {
            console.error(err);
            const isAuth = err.message === "session_expired";
            listContainer.innerHTML = `
          <div style="text-align:center;padding:60px 20px">
            <p style="color:var(--text-muted);margin-bottom:16px">
              ${isAuth ? 'Session expired. Please log in again.' : 'Servers are waking up or failed to load orders. Please try again.'}
            </p>
            <a href="login.html" style="background:var(--primary);color:white;
              padding:12px 28px;border-radius:8px;text-decoration:none;
              font-weight:600">Login</a>
          </div>`;
        });
}

document.addEventListener("DOMContentLoaded", () => {
    // Only run loadHome if on a page with products container
    if (document.getElementById("products")) {
        loadHome();
    }
    loadCart();
    loadMyOrders();
    showUser(); // The newly upgraded VIP button function runs here
    fetchUserWishlist();
    checkLiveStreams(); // Show 🔴 button only if streams are active

    const token = localStorage.getItem("token");
    const declined = localStorage.getItem("notifPromptDeclined");
    // Only prompt if they haven't explicitly declined it recently
    if (token && 'Notification' in window && Notification.permission === 'default' && !declined) {
        setTimeout(() => {
            showNotificationBanner();
        }, 2000);
    }

    updateCartBadge();
});

// =======================================================
// 🔴 LIVE STREAM VISIBILITY CHECK
// =======================================================
async function checkLiveStreams() {
    const btn = document.getElementById('live-stream-btn');
    if (!btn) return;
    try {
        const res = await fetch(`${API_URL}/auth/active-streams`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json();
            if (data.count > 0) {
                btn.style.display = '';
                btn.textContent = `\ud83d\udd34 Live (${data.count})`;
            }
        }
    } catch (e) {
        // If the endpoint doesn't exist yet, keep button hidden
    }
}

// =======================================================
// 🛑 REFUND & CANCELLATION LOGIC
// =======================================================
async function cancelOrder(orderId) {
    if (!confirm("Are you sure you want to cancel this order? A full refund will be processed.")) return;

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
        window.liveMapAnimationId = requestAnimationFrame(animateMarker);
    }

    // Start the engine
    if (window.liveMapAnimationId) cancelAnimationFrame(window.liveMapAnimationId);
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
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/products/my-wishlist`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            currentWishlist = list.map(item => item._id || item); // Depends if populated or not
        }
    } catch (e) {
        console.error("Failed to load global wishlist", e);
    }
}

// Automatically fetch wishlist if token exists on load (merged into main listener)

// =======================================================
// 📱 PWA & WEB PUSH NOTIFICATIONS
// =======================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful:', registration.scope);
            })
            .catch((err) => {
                console.log('ServiceWorker registration failed:', err);
            });
    });
}

// Function to subscribe to push notifications
async function subscribeToNotifications() {
    if ('serviceWorker' in navigator && 'Notification' in window) {
        try {
            const register = await navigator.serviceWorker.ready;
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const token = localStorage.getItem("token");
                    if (!token) return;
                    const subscription = await register.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: "BFEMdN7XR9F70Rf3r0UFWlIISDl7cx1VeSsvlpUVILhTZ1V7NW_63D0Vx3VNCW7mUAb2Iq3Fdp_wKdesE4Az_uI"
                    });
                    await fetch(`${API_URL}/auth/save-subscription`, {
                        method: 'POST',
                        body: JSON.stringify(subscription),
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                    });
                    showToast("Notifications enabled successfully! 🔔", "success");
                }
            }
        } catch (err) {
            console.error("Subscription Error:", err);
        }
    }
}

// Auto-prompt notifications if user is logged in
// (merged into main listener)

// =======================================================
// 📱 PWA INSTALL & NOTIFICATION PROMPTS (User Gesture Required)
// =======================================================

let deferredPrompt;

// 1. Capture the PWA Install event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Show our custom install banner
    showPwaInstallBanner();
});

function showPwaInstallBanner() {
    // Only show if user is on mobile/app-like state
    if (document.getElementById('pwa-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-banner';
    banner.style = "position: fixed; bottom: 0; left: 0; width: 100%; box-sizing: border-box; background: var(--primary); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; z-index: 9999; box-shadow: 0 -4px 10px rgba(0,0,0,0.2);";
    banner.innerHTML = `
    <div style="font-size: 14px; font-weight: bold; flex: 1; margin-right: 10px; line-height: 1.4;">
      📱 Install VyaparSync App for a faster experience!
    </div>
    <div style="display: flex; gap: 10px; flex-shrink: 0; align-items: center;">
        <button id="installAppBtn" style="background: white; color: var(--primary); border: none; padding: 8px 15px; border-radius: 8px; font-weight: bold; cursor: pointer; white-space: nowrap;">Install</button>
        <button id="closeInstallBtn" style="background: transparent; color: white; border: 1px solid white; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">X</button>
    </div>
  `;
    document.body.appendChild(banner);

    document.getElementById('installAppBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'dismissed') {
                    showToast("Installation cancelled. You may need to clear site data to try again.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Installation blocked by browser. Try clearing browser cache.", "error");
            }
            deferredPrompt = null;
        }
        banner.remove();
    });

    document.getElementById('closeInstallBtn').addEventListener('click', () => {
        banner.remove();
    });
}

// 2. Custom Notification Banner (Requires user gesture)
// (merged into main listener)

function showNotificationBanner() {
    if (document.getElementById('notif-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'notif-banner';
    banner.style = "position: fixed; top: 20px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 400px; background: white; color: #333; padding: 15px; display: flex; flex-direction: column; gap: 10px; z-index: 9999; box-shadow: 0 5px 15px rgba(0,0,0,0.3); border-radius: 12px; border-left: 5px solid var(--primary);";
    banner.innerHTML = `
      <div style="font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
        🔔 Turn on live order updates?
      </div>
      <div style="font-size: 12px; color: #666;">Get instantly notified when your order is dispatched.</div>
      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 5px;">
          <button id="declineNotifBtn" style="background: #f1f1f1; color: #333; border: none; padding: 8px 15px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px;">Not Now</button>
          <button id="allowNotifBtn" style="background: var(--primary); color: white; border: none; padding: 8px 15px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px;">Allow</button>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('allowNotifBtn').addEventListener('click', () => {
        // This is a user gesture! The browser will allow the prompt.
        subscribeToNotifications();
        banner.remove();
    });

    document.getElementById('declineNotifBtn').addEventListener('click', () => {
        banner.remove();
        // Set a flag in localStorage so we don't bother them again today
        localStorage.setItem("notifPromptDeclined", Date.now());
    });
}

// =======================================================
// ?? CART BADGE UPDATER
// =======================================================
function updateCartBadge() {
    const cartBtns = document.querySelectorAll('.nav-btn.cart');
    if (!cartBtns || cartBtns.length === 0) return;
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem("cart")) || [];
    } catch (e) { }
    const totalItems = cart.reduce((s, i) => s + (i.quantity || 1), 0);
    cartBtns.forEach(btn => {
        if (totalItems > 0) {
            btn.innerHTML = '🛒 Cart <span style="background:#ff6a00;color:white;border-radius:50%;padding:0 6px;font-size:11px;margin-left:5px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">' + totalItems + '</span>';
        } else {
            btn.innerHTML = '🛒 Cart';
        }
    });
}
// Run on load (merged into main listener)
updateCartBadge();


// =======================================================
// =======================================================
// INITIALIZATION & UI/UX FEATURES
// =======================================================

function handleSearchInput(event) {
    const query = event.target.value.toLowerCase().trim();
    const dropdown = document.getElementById("search-autocomplete-dropdown");
    
    // URL Syncing feature on type
    const newUrl = new URL(window.location);
    if(query) {
        newUrl.searchParams.set('q', query);
    } else {
        newUrl.searchParams.delete('q');
    }
    window.history.pushState({}, '', newUrl);

    if (query.length < 2) {
        if(dropdown) dropdown.style.display = "none";
        delayFilter();
        return;
    }
    
    let suggestions = [];
    // Static smart suggestions
    const commonSearches = ["Silk saree", "Chandni Chowk", "Electronics", "Kurtis", "Shoes"];
    commonSearches.forEach(term => {
        if (term.toLowerCase().includes(query)) suggestions.push({text: term, type: 'search'});
    });
    
    // Dynamic from currentProducts
    const matchedProducts = currentProducts.filter(p => p.name.toLowerCase().includes(query)).slice(0, 3);
    matchedProducts.forEach(p => suggestions.push({text: p.name, type: 'product', id: p._id}));
    
    if(dropdown) {
        dropdown.innerHTML = "";
        if(suggestions.length > 0) {
            suggestions.forEach(s => {
                const div = document.createElement("div");
                div.style.padding = "10px 15px";
                div.style.cursor = "pointer";
                div.style.borderBottom = "1px solid rgba(0,0,0,0.05)";
                div.innerHTML = s.type === 'search' ? `🔍 ${s.text}` : `📦 ${s.text}`;
                div.onclick = () => {
                    document.getElementById("mainSearchInput").value = s.text;
                    dropdown.style.display = "none";
                    applyFilters();
                };
                dropdown.appendChild(div);
            });
            dropdown.style.display = "block";
        } else {
            dropdown.style.display = "none";
        }
    }
    
    delayFilter();
}

function initUIFeatures() {
    // (No more waking-up screen — keep-alive ping handles cold starts)
    
    // PWA Logic
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const banner = document.getElementById('pwa-install-banner');
        if(banner) banner.style.bottom = '20px';
    });
    
    const installBtn = document.getElementById('pwa-install-btn');
    if(installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                deferredPrompt = null;
                const banner = document.getElementById('pwa-install-banner');
                if(banner) banner.style.bottom = '-250px';
            }
        });
    }

    // URL Search Syncing - Initial Load
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q) {
        const searchInput = document.getElementById("mainSearchInput");
        if(searchInput) {
            searchInput.value = q;
            // Wait for products to load then filter
            setTimeout(() => { applyFilters(); }, 1000);
        }
    }
    
    // Back to top scroll listener
    window.addEventListener('scroll', () => {
        const btn = document.getElementById('back-to-top');
        if(btn) {
            if(window.scrollY > 300) btn.style.display = 'flex';
            else btn.style.display = 'none';
        }
    });

    const mainSearchInput = document.getElementById("mainSearchInput");
    if(mainSearchInput) {
        mainSearchInput.addEventListener("input", handleSearchInput);
    }
}

// =======================================================
// 🍔 HAMBURGER MOBILE NAV
// =======================================================
function toggleMobileNav() {
    const drawer = document.getElementById('mobileNavDrawer');
    const overlay = document.getElementById('mobileNavOverlay');
    const btn = document.getElementById('hamburgerBtn');
    const isOpen = drawer && drawer.classList.contains('open');
    if (isOpen) {
        drawer && drawer.classList.remove('open');
        overlay && overlay.classList.remove('open');
        btn && btn.classList.remove('active');
        btn && btn.setAttribute('aria-expanded', 'false');
    } else {
        // Sync user state in mobile drawer
        const mobileUser = document.getElementById('mobileUserSection');
        const desktopUser = document.getElementById('userSection');
        if (mobileUser && desktopUser) mobileUser.innerHTML = desktopUser.innerHTML;
        drawer && drawer.classList.add('open');
        overlay && overlay.classList.add('open');
        btn && btn.classList.add('active');
        btn && btn.setAttribute('aria-expanded', 'true');
    }
}
function closeMobileNav() {
    document.getElementById('mobileNavDrawer')?.classList.remove('open');
    document.getElementById('mobileNavOverlay')?.classList.remove('open');
    document.getElementById('hamburgerBtn')?.classList.remove('active');
}

// =======================================================
// 🌐 HINDI / ENGLISH LANGUAGE TOGGLE
// =======================================================
const translations = {
    en: {
        'heroTitle': "India's Local Markets, Delivered",
        'heroSubtitle': "Experience the authenticity of local bazaars without leaving your home. Real-time inventory straight from the shopkeeper's hands to yours.",
        'local-markets': 'Local Markets',
        'cities-live': 'Cities Live',
        'commission': 'Commission (Beta)',
        'live-commerce': 'Live Commerce',
        'step1-title': '1. Explore',
        'step1-desc': 'Find products from real shops across Indian markets.',
        'step2-title': '2. Connect',
        'step2-desc': 'Chat with sellers or watch them sell live.',
        'step3-title': '3. Secure Pay',
        'step3-desc': '100% Escrow protected Razorpay checkout.',
        'step4-title': '4. Fast Delivery',
        'step4-desc': 'ONDC logistics partner brings it to your door.',
        'join-sellers': 'Join 100+ Early Sellers on VyaparSync',
        'join-desc': "Be part of India's first bazaar live-commerce platform. 0% commission during beta. No subscription ever.",
        'beta-commission': 'Commission during Beta',
        'markets-count': 'Iconic Indian Markets',
        'live-feature': 'Live Stream Commerce',
        'start-shopping': '🛍️ Start Shopping',
        'become-seller': '🚀 Become a Seller — Free',
        'join-free': '🚀 Join Free',
        'langBtn': '🇮🇳 हिंदी'
    },
    hi: {
        'heroTitle': 'भारत के स्थानीय बाजार, आपके दरवाजे तक',
        'heroSubtitle': 'घर बैठे असली बाजार का अनुभव करें। दुकानदार से सीधे आप तक — रियल-टाइम इन्वेंटरी के साथ।',
        'local-markets': 'स्थानीय बाजार',
        'cities-live': 'शहर लाइव',
        'commission': 'कमीशन (बीटा)',
        'live-commerce': 'लाइव कॉमर्स',
        'step1-title': '1. खोजें',
        'step1-desc': 'भारतीय बाजारों में असली दुकानों के उत्पाद खोजें।',
        'step2-title': '2. जुड़ें',
        'step2-desc': 'विक्रेता से बात करें या उन्हें लाइव बेचते देखें।',
        'step3-title': '3. सुरक्षित भुगतान',
        'step3-desc': '100% एस्क्रो सुरक्षित रेजरपे चेकआउट।',
        'step4-title': '4. तेज डिलीवरी',
        'step4-desc': 'ONDC लॉजिस्टिक्स साझेदार आपके दरवाजे तक पहुंचाएगा।',
        'join-sellers': 'VyaparSync पर 100+ शुरुआती विक्रेताओं से जुड़ें',
        'join-desc': 'भारत के पहले बाजार लाइव-कॉमर्स प्लेटफॉर्म का हिस्सा बनें। बीटा में 0% कमीशन।',
        'beta-commission': 'बीटा में कमीशन',
        'markets-count': 'प्रसिद्ध भारतीय बाजार',
        'live-feature': 'लाइव स्ट्रीम कॉमर्स',
        'start-shopping': '🛍️ खरीदारी शुरू करें',
        'become-seller': '🚀 विक्रेता बनें — मुफ्त',
        'join-free': '🚀 मुफ्त जुड़ें',
        'langBtn': '🇺🇸 English'
    }
};

let currentLang = localStorage.getItem('lang') || 'en';

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'hi' : 'en';
    localStorage.setItem('lang', currentLang);
    applyLanguage();
}

function applyLanguage() {
    const t = translations[currentLang];
    document.documentElement.setAttribute('lang', currentLang);
    
    // Update text elements
    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle && t.heroTitle) heroTitle.textContent = t.heroTitle;
    
    const heroSubtitle = document.getElementById('heroSubtitle');
    if (heroSubtitle && t.heroSubtitle) heroSubtitle.textContent = t.heroSubtitle;
    
    // Update data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    
    // Update buttons
    document.querySelectorAll('[data-i18n-btn]').forEach(el => {
        const key = el.getAttribute('data-i18n-btn');
        if (t[key]) el.textContent = t[key];
    });
    
    // Update the toggle button itself
    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn && t.langBtn) langBtn.textContent = t.langBtn;
}

// =======================================================
// 📧 WAITLIST FORM
// =======================================================
function joinWaitlist() {
    const emailInput = document.getElementById('waitlistEmail');
    if (!emailInput) return;
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address.', 'error');
        return;
    }
    // Save to localStorage as fallback (and optionally ping backend)
    const existing = JSON.parse(localStorage.getItem('waitlist') || '[]');
    if (!existing.includes(email)) existing.push(email);
    localStorage.setItem('waitlist', JSON.stringify(existing));
    
    // Optimistic UI
    emailInput.value = '';
    showToast('🎉 You are on the waitlist! We will notify you soon.', 'success');
    
    // Try to ping backend silently
    fetch(`${API_URL}/auth/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    }).catch(() => {}); // fail silently
}

// =======================================================
// 🔄 ERROR STATE HELPERS (Retry Buttons)
// =======================================================
function showErrorState(containerId, message, retryFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
        <div class="error-state">
            <div class="error-state-icon">⚠️</div>
            <h3 class="error-state-title">Something went wrong</h3>
            <p class="error-state-msg">${message || 'Unable to load data. Please check your connection.'}</p>
            <button class="error-state-btn" onclick="${retryFn}()">🔄 Try Again</button>
        </div>
    `;
}

if (document.readyState === "interactive" || document.readyState === "complete") {
    if (document.getElementById("products")) loadHome();
    if (typeof loadCart === "function") loadCart();
    if (typeof loadMyOrders === "function") loadMyOrders();
    if (typeof showUser === "function") showUser(); 
    initUIFeatures();
    applyLanguage(); // Apply language on load
} else {
    document.addEventListener("DOMContentLoaded", () => {
        if(document.getElementById("products")) loadHome();
        if (typeof loadCart === "function") loadCart();
        if (typeof loadMyOrders === "function") loadMyOrders();
        if (typeof showUser === "function") showUser(); 
        initUIFeatures();
        applyLanguage(); // Apply language on load
    });
}
