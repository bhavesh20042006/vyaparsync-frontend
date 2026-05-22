import re

# 1. Fix style.css: Add box-sizing and overflow-x to the top
with open("style.css", "r", encoding="utf-8") as f:
    css = f.read()

css_prefix = """*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  overflow-x: hidden;
  width: 100%;
}

"""
if "box-sizing: border-box;" not in css[:200]:
    css = css_prefix + css

with open("style.css", "w", encoding="utf-8") as f:
    f.write(css)

# 2. Fix orders.html
with open("orders.html", "r", encoding="utf-8") as f:
    html = f.read()

# Replace /orders/my
html = html.replace("${API_URL_ORDERS}/orders/my", "${API_URL_ORDERS}/orders/customer")

# Add 401 handler if not present
if "res.status === 401" not in html:
    html = html.replace("if (!res.ok) throw new Error('Failed to load orders');", """if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                container.innerHTML = `
                    <div class="error-state" style="padding: 60px 20px;">
                        <div class="error-state-icon">??</div>
                        <h3 class="error-state-title">Session Expired</h3>
                        <p class="error-state-msg">Your session has expired. Please log in again.</p>
                        <a href="login.html" class="error-state-btn" style="text-decoration: none; display: inline-block; padding: 10px 24px;">Login</a>
                    </div>`;
                return;
            }
            if (!res.ok) throw new Error('Failed to load orders');""")

with open("orders.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Fixes applied successfully")
