import os
import re

files_to_update = ['orders.html', 'cart.html', 'script.js']

# We need to replace:
# background: var(--nav-bg); color: var(--text-main); border: 1px solid rgba(255,255,255,0.1);
# With:
# background: var(--primary); color: white; border: none;
# And change box-shadow slightly maybe, or just leave it.

for file in files_to_update:
    if not os.path.exists(file): continue
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will target the Go Back button specifically
    # Find: <button onclick="window.location.href='index.html'" style="background: var(--nav-bg); color: var(--text-main); border: 1px solid rgba(255,255,255,0.1);
    old_style = 'background: var(--nav-bg); color: var(--text-main); border: 1px solid rgba(255,255,255,0.1);'
    new_style = 'background: var(--primary); color: white; border: none;'
    
    content = content.replace(old_style, new_style)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated button colors to orange")
