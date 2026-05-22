import re

# 1. Update orders.html
with open("orders.html", "r", encoding="utf-8") as f:
    orders = f.read()

orders = orders.replace('My Orders ??', 'My Orders &#128230;')

old_orders_div = """<div style="margin-bottom: 25px;">
      <h2 style="margin: 0 0 6px 0; color: var(--text-main); font-size: 26px; font-weight: 800;">My Orders &#128230;</h2>
      <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Need help? <a href="mailto:vyaparsync.support@gmail.com" style="color: var(--primary); font-weight: 600;">vyaparsync.support@gmail.com</a></p>
    </div>"""

new_orders_div = """<div style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h2 style="margin: 0 0 6px 0; color: var(--text-main); font-size: 26px; font-weight: 800;">My Orders &#128230;</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Need help? <a href="mailto:vyaparsync.support@gmail.com" style="color: var(--primary); font-weight: 600;">vyaparsync.support@gmail.com</a></p>
      </div>
      <button onclick="window.location.href='index.html'" style="background: var(--nav-bg); color: var(--text-main); border: 1px solid rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">&#8592; Go Back</button>
    </div>"""

orders = orders.replace(old_orders_div, new_orders_div)
with open("orders.html", "w", encoding="utf-8") as f:
    f.write(orders)

# 2. Update cart.html
with open("cart.html", "r", encoding="utf-8") as f:
    cart = f.read()

cart = cart.replace('Your Shopping Cart ??', 'Your Shopping Cart &#128722;')

# Add back button next to Your Shopping Cart in cart-header
# .cart-header is flex, so we can just insert the button inside it
old_cart_header = """<div class="cart-header">
        <h2 style="margin: 0; font-size: 24px;">Your Shopping Cart &#128722;</h2>
        <span id="itemCount" style="color: var(--text-muted); font-weight: 600;">0 Items</span>
      </div>"""

new_cart_header = """<div class="cart-header">
        <div>
          <h2 style="margin: 0; font-size: 24px;">Your Shopping Cart &#128722;</h2>
          <span id="itemCount" style="color: var(--text-muted); font-weight: 600; display: block; margin-top: 5px;">0 Items</span>
        </div>
        <button onclick="window.location.href='index.html'" style="background: var(--nav-bg); color: var(--text-main); border: 1px solid rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">&#8592; Go Back</button>
      </div>"""

cart = cart.replace(old_cart_header, new_cart_header)
with open("cart.html", "w", encoding="utf-8") as f:
    f.write(cart)

# 3. Update script.js for wishlist header
with open("script.js", "r", encoding="utf-8") as f:
    js = f.read()

js = js.replace('?? My Wishlist', '&#10084;&#65039; My Wishlist')
js = js.replace('? Back to Home', '&#8592; Go Back')

with open("script.js", "w", encoding="utf-8") as f:
    f.write(js)

print("Done updates")
