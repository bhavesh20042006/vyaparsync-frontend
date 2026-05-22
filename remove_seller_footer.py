import re

with open("seller-dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()

# Remove site-footer
html = re.sub(r'<footer class="site-footer">.*?</footer>', '', html, flags=re.DOTALL)

# Remove bottom-nav
html = re.sub(r'<!-- \?\? App-Like Bottom Navigation -->.*?<nav class="bottom-nav">.*?</nav>', '', html, flags=re.DOTALL)

with open("seller-dashboard.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Removed footer and bottom nav from seller-dashboard")
