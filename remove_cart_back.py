import re

with open("cart.html", "r", encoding="utf-8") as f:
    cart = f.read()

# We need to replace the current cart-header
old_header_pattern = re.compile(r'<div class="cart-header">\s*<div>\s*<h2 style="margin: 0; font-size: 24px;">Your Shopping Cart &#128722;</h2>\s*<span id="itemCount" style="color: var\(--text-muted\); font-weight: 600; display: block; margin-top: 5px;">0 Items</span>\s*</div>\s*<button onclick="window\.location\.href=\'index\.html\'" style="background: var\(--primary\); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 5px rgba\(0,0,0,0\.1\);">&#8592; Go Back</button>\s*</div>')

new_header = """<div class="cart-header">
        <h2 style="margin: 0; font-size: 20px;">Your Shopping Cart &#128722;</h2>
        <span id="itemCount" style="color: var(--text-muted); font-weight: 600;">0 Items</span>
      </div>"""

cart = old_header_pattern.sub(new_header, cart)

with open("cart.html", "w", encoding="utf-8") as f:
    f.write(cart)

print("Updated cart.html")
