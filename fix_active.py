import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for filename in html_files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Reset all active classes first to avoid duplicates
    content = re.sub(r'class="bottom-nav-item\s*active"', 'class="bottom-nav-item"', content)

    # Now add active class to the one that matches the current filename
    # E.g. href="index.html" in index.html
    pattern = r'(<a\s+href="(' + re.escape(filename) + r'|#)"\s+class=")bottom-nav-item(")'
    content = re.sub(pattern, r'\g<1>bottom-nav-item active\g<3>', content)

    # For shop.html, it might use index.html's active tab or something else.
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
print('Updated active classes.')
