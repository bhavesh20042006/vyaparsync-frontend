import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

# The corrupted emojis appear as exactly 2 question marks in the files if they were encoded poorly
# But wait, depending on how they were written, they might be '? ' or '?? ' or something.
# Let's use regex to find `<a href="live-buyer.html"...>...Live Stream</a>` and replace their inner text.
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Fix Live Stream
    html = re.sub(r'<a href="live-buyer\.html"([^>]*)>[^<]*Live Stream</a>', r'<a href="live-buyer.html"\1>&#128225; Live Stream</a>', html)
    # Fix Wishlist
    html = re.sub(r'<a href="wishlist\.html"([^>]*)>[^<]*Wishlist</a>', r'<a href="wishlist.html"\1>&#10084;&#65039; Wishlist</a>', html)
    # Fix My Orders
    html = re.sub(r'<a href="orders\.html"([^>]*)>[^<]*My Orders</a>', r'<a href="orders.html"\1>&#128230; My Orders</a>', html)
    # Fix Cart
    html = re.sub(r'<a href="cart\.html"([^>]*)>[^<]*Cart</a>', r'<a href="cart.html"\1>&#128722; Cart</a>', html)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

# Fix admin-dashboard.html styling
# Add <link rel="stylesheet" href="style.css">
with open('admin-dashboard.html', 'r', encoding='utf-8') as f:
    admin_html = f.read()

if 'href="style.css' not in admin_html:
    admin_html = admin_html.replace('<title>CEO Command Center | VyaparSync</title>', '<title>CEO Command Center | VyaparSync</title>\n  <link rel="stylesheet" href="style.css">')

with open('admin-dashboard.html', 'w', encoding='utf-8') as f:
    f.write(admin_html)

print("Fixes applied to all HTML files")
