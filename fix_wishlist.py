import re

with open("script.js", "r", encoding="utf-8") as f:
    js = f.read()

# 1. Remove the Wishlist button from loadProductDetails modal
# It was added like this: 
# <button onclick="toggleWishlist('${product._id}', this)" style="flex: 1; padding: 15px; background: rgba(0,0,0,0.05); color: var(--text-main); border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.2s;">?? Wishlist</button>
# Since the emoji might be corrupted, let's use regex.
js = re.sub(r'<button onclick="toggleWishlist\([^>]+>[^<]*Wishlist</button>', '', js)

# 2. Fix the heart icon on the product cards.
# Search for: <button onclick="event.stopPropagation(); toggleWishlist('${p._id}', this)" style="position: absolute; top: 10px; right: 10px; ..."> corrupted text </button>
# Let's find it using regex.
btn_pattern = r'(<button onclick="event\.stopPropagation\(\);\s*toggleWishlist\(\'\$\{p\._id\}\',\s*this\)"[^>]*>)(.*?)(</button>)'

def fix_heart(match):
    start = match.group(1)
    # The heart symbol is &#10084;
    heart = '\n            &#10084;\n        '
    end = match.group(3)
    return start + heart + end

js = re.sub(btn_pattern, fix_heart, js, flags=re.DOTALL)

with open("script.js", "w", encoding="utf-8") as f:
    f.write(js)

print("Fixed wishlist buttons")
