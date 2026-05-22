import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

# 1. Fix the logo emoji everywhere
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    html = re.sub(r'>\?\?\s*VyaparSync<', r'>&#128717;&#65039; VyaparSync<', html)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

# 2. Add back button to specific secondary pages
pages_to_add_back = ['orders.html', 'wishlist.html', 'cart.html', 'seller-profile.html']
back_button_html = r'<div style="display: flex; align-items: center;"><button onclick="window.location.href=\'index.html\'" style="background:none; border:none; color:var(--text-main); font-size:24px; cursor:pointer; margin-right:10px; padding:0; display:flex; align-items:center;">&#8592;</button>\1</div>'

for file in pages_to_add_back:
    if not os.path.exists(file): continue
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # If already has back button, skip
    if '&#8592;' in html: continue
    
    # Wrap the h1/h2 containing VyaparSync
    html = re.sub(r'(<h[12][^>]*>&#128717;&#65039; VyaparSync</h[12]>)', back_button_html, html)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Added back buttons and fixed logo emoji")
