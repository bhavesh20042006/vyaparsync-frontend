import os

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

# We'll use basic string replacement since regex was flaky for this specific pattern
# We want to replace exactly ">?? VyaparSync<" and also the back button if it's not there.
# Let's just find "VyaparSync</h" and prepend the back button if not index.html
pages_to_add_back = ['orders.html', 'wishlist.html', 'cart.html', 'seller-profile.html', 'live-buyer.html']
back_button_html = '<button onclick="window.location.href=\'index.html\'" style="background:none; border:none; color:var(--text-main); font-size:24px; cursor:pointer; margin-right:15px; padding:0; display:flex; align-items:center;">&#8592;</button>'

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Replace the corrupted emoji
    html = html.replace('>?? VyaparSync</h1', '>&#128717;&#65039; VyaparSync</h1')
    html = html.replace('>?? VyaparSync</h2', '>&#128717;&#65039; VyaparSync</h2')
    
    # Replace any other weird logo formats
    html = html.replace('??? VyaparSync', '&#128717;&#65039; VyaparSync')

    # Add back button if it's one of the target pages
    if file in pages_to_add_back and '&#8592;' not in html:
        # It's an h1
        if '<h1' in html and 'VyaparSync</h1>' in html:
            # find the opening h1 tag
            import re
            html = re.sub(r'(<h1[^>]*>.*?VyaparSync</h1>)', r'<div style="display: flex; align-items: center;">' + back_button_html + r'\1</div>', html)
        elif '<h2' in html and 'VyaparSync</h2>' in html:
            import re
            html = re.sub(r'(<h2[^>]*>.*?VyaparSync</h2>)', r'<div style="display: flex; align-items: center;">' + back_button_html + r'\1</div>', html)
            
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Done replacing")
