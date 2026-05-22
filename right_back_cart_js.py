import re

with open("cart.html", "r", encoding="utf-8") as f:
    cart = f.read()

pattern = re.compile(r'<div class="cart-header">\s*<h2 style="margin: 0; font-size: 24px;">Your Shopping Cart[^<]*</h2>\s*<span id="itemCount" style="color: var\(--text-muted\); font-weight: 600;">0 Items</span>\s*</div>')

new_cart_header = """<div class="cart-header">
        <div>
          <h2 style="margin: 0; font-size: 24px;">Your Shopping Cart &#128722;</h2>
          <span id="itemCount" style="color: var(--text-muted); font-weight: 600; display: block; margin-top: 5px;">0 Items</span>
        </div>
        <button onclick="window.location.href='index.html'" style="background: var(--nav-bg); color: var(--text-main); border: 1px solid rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">&#8592; Go Back</button>
      </div>"""

cart = pattern.sub(new_cart_header, cart)

with open("cart.html", "w", encoding="utf-8") as f:
    f.write(cart)

print("Updated cart.html")

# Let's check script.js
with open("script.js", "r", encoding="utf-8") as f:
    js = f.read()

# We need to replace:
# <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
#   <button onclick="window.location.href='index.html'" style="background: var(--card-bg); color: var(--text-main); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; width: auto; display: inline-block;">? Back to Home</button>
#   <h2 style="font-size: 24px; font-weight: 700; margin: 0; color: var(--text-main);">?? My Wishlist</h2>
# </div>

pattern_js = re.compile(r'<div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">\s*<button onclick="window\.location\.href=\'index\.html\'" style="[^"]*">[^<]*Back to Home</button>\s*<h2 style="[^"]*">[^<]*My Wishlist</h2>\s*</div>')

new_js = """<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="font-size: 24px; font-weight: 700; margin: 0; color: var(--text-main);">&#10084;&#65039; My Wishlist</h2>
                <button onclick="window.location.href='index.html'" style="background: var(--nav-bg); color: var(--text-main); border: 1px solid rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">&#8592; Go Back</button>
            </div>"""

js = pattern_js.sub(new_js, js)

with open("script.js", "w", encoding="utf-8") as f:
    f.write(js)
print("Updated script.js")
