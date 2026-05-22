import re

# 1. Fix script.js (add wishlist-btn class)
with open("script.js", "r", encoding="utf-8") as f:
    js = f.read()

js = js.replace('<button onclick="event.stopPropagation(); toggleWishlist', '<button class="wishlist-btn" onclick="event.stopPropagation(); toggleWishlist')

with open("script.js", "w", encoding="utf-8") as f:
    f.write(js)

# 2. Fix style.css (footer padding, body padding, and product>button display)
with open("style.css", "r", encoding="utf-8") as f:
    css = f.read()

# Change horizontal-scroll-grid button hiding
css = css.replace('.horizontal-scroll-grid .product>button {', '.horizontal-scroll-grid .product>button:not(.wishlist-btn) {')

# Remove huge footer padding and add body padding instead
css = css.replace('.site-footer {\n    padding-bottom: 110px !important;\n  }', '.site-footer {\n    padding: 15px 5%;\n  }\n  body {\n    padding-bottom: 85px !important;\n  }')

# remove previous body padding-bottom 0
css = css.replace('body { padding-bottom: 0; }', 'body { padding-bottom: 85px !important; }')

with open("style.css", "w", encoding="utf-8") as f:
    f.write(css)

# 3. Fix cart.html (mobile checkout position)
with open("cart.html", "r", encoding="utf-8") as f:
    cart_html = f.read()

cart_html = cart_html.replace('bottom: 0;', 'bottom: 65px;')
# specifically inside .mobile-floating-checkout CSS

with open("cart.html", "w", encoding="utf-8") as f:
    f.write(cart_html)

print("Fixes applied")
