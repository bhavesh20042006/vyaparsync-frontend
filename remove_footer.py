import re

with open("admin-dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()

# Remove site-footer
html = re.sub(r'<footer class="site-footer">.*?</footer>', '', html, flags=re.DOTALL)

# Remove bottom-nav
html = re.sub(r'<!-- \?\? App-Like Bottom Navigation -->.*?<nav class="bottom-nav">.*?</nav>', '', html, flags=re.DOTALL)

# Remove the link to style.css to keep it completely independent again
html = html.replace('<link rel="stylesheet" href="style.css">', '')

with open("admin-dashboard.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Removed footer and bottom nav from admin-dashboard")
