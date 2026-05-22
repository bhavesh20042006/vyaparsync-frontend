import re

# Fix orders.html
with open("orders.html", "r", encoding="utf-8") as f:
    html = f.read()

# Change /orders/my to /orders/customer
html = html.replace("`/orders/my`", "`/orders/customer`")

# Handle 401 in orders.html
orders_fetch = """            if (!res.ok) throw new Error('Failed to load orders');"""
orders_fetch_fixed = """            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                container.innerHTML = `
                    <div class="error-state" style="padding: 60px 20px;">
                        <div class="error-state-icon">??</div>
                        <h3 class="error-state-title">Session Expired</h3>
                        <p class="error-state-msg">Your session has expired. Please log in again.</p>
                        <a href="login.html" class="error-state-btn" style="text-decoration: none; display: inline-block; padding: 10px 24px;">Login</a>
                    </div>`;
                return;
            }
            if (!res.ok) throw new Error('Failed to load orders');"""
html = html.replace(orders_fetch, orders_fetch_fixed)

with open("orders.html", "w", encoding="utf-8") as f:
    f.write(html)

# Fix script.js wishlist 401 handling
with open("script.js", "r", encoding="utf-8") as f:
    js = f.read()

wishlist_fetch = """        const res = await fetch(`${API_URL}/products/my-wishlist`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const products = await res.json();"""

wishlist_fetch_fixed = """        const res = await fetch(`${API_URL}/products/my-wishlist`, {
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
        const products = await res.json();"""
js = js.replace(wishlist_fetch, wishlist_fetch_fixed)

# Add Wishlist button to product details modal
# Since emoji might differ, use regex to find the Buy Now button and insert the Wishlist button after it.
def add_wishlist_btn(match):
    original_buy_btn = match.group(0)
    wishlist_btn = """<button onclick="toggleWishlist('${product._id}', this)" style="flex: 1; padding: 15px; background: rgba(0,0,0,0.05); color: var(--text-main); border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.2s;">?? Wishlist</button>"""
    return original_buy_btn + '\n                    ' + wishlist_btn

js = re.sub(r'<button onclick="buyWithSize\([^>]+>[^<]+</button>', add_wishlist_btn, js)

with open("script.js", "w", encoding="utf-8") as f:
    f.write(js)

print("Updates successful")
