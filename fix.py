import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

# Fix loadProductDetails crash
with open('script.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace('const container = document.getElementById("products");', 'const container = document.getElementById("products") || document.getElementById("wishlist-container") || document.getElementById("customerOrdersList") || document.querySelector("main");')

# Add Wishlist button to loadProductDetails
btn_html = """<button onclick="buyWithSize('${product._id}')" style="flex: 1; padding: 15px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.2s;">? Buy Now</button>
                    <button onclick="toggleWishlist('${product._id}', this)" style="flex: 1; padding: 15px; background: rgba(0,0,0,0.05); color: var(--text-main); border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.2s;">?? Wishlist</button>"""
js = js.replace("""<button onclick="buyWithSize('${product._id}')" style="flex: 1; padding: 15px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.2s;">? Buy Now</button>""", btn_html)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(js)

# Fix orders container CSS
with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()
css = re.sub(r'\.orders-container\s*\{[^}]*\}', '.orders-container {\n  max-width: 100%;\n  margin: 20px 0;\n  padding: 0 5%;\n}', css)
with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)

# Restore missing links in mobile nav drawer
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    if '<div class="mobile-nav-links" id="mobileNavLinks">' in html:
        links_html = """<div class="mobile-nav-links" id="mobileNavLinks">
    <a href="live-buyer.html" style="color: #e53e3e; animation: pulse 2s infinite;">?? Live Stream</a>
    <a href="wishlist.html">?? Wishlist</a>
    <a href="orders.html">?? My Orders</a>
    <a href="cart.html">?? Cart</a>"""
        html = html.replace('<div class="mobile-nav-links" id="mobileNavLinks">', links_html)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Done")
