import re

with open("orders.html", "r", encoding="utf-8") as f:
    orders = f.read()

# Replace the entire block dynamically using regex
pattern = re.compile(r'<div style="margin-bottom: 25px;">\s*<h2 style="margin: 0 0 6px 0; color: var\(--text-main\); font-size: 26px; font-weight: 800;">My Orders[^<]*</h2>\s*<p style="font-size: 13px; color: var\(--text-muted\); margin: 0;">Need help\? <a href="mailto:vyaparsync.support@gmail.com" style="color: var\(--primary\); font-weight: 600;">vyaparsync.support@gmail.com</a></p>\s*</div>')

new_orders_div = """<div style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h2 style="margin: 0 0 6px 0; color: var(--text-main); font-size: 26px; font-weight: 800;">My Orders &#128230;</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Need help? <a href="mailto:vyaparsync.support@gmail.com" style="color: var(--primary); font-weight: 600;">vyaparsync.support@gmail.com</a></p>
      </div>
      <button onclick="window.location.href='index.html'" style="background: var(--nav-bg); color: var(--text-main); border: 1px solid rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">&#8592; Go Back</button>
    </div>"""

orders = pattern.sub(new_orders_div, orders)

with open("orders.html", "w", encoding="utf-8") as f:
    f.write(orders)

print("Updated orders.html")
