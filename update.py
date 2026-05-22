import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

footer_css = """
/* ?? SITE FOOTER */
.site-footer {
  background: var(--nav-bg);
  color: white;
  text-align: center;
  padding: 15px 5%;
  margin-top: auto;
}
.site-footer p {
  margin: 0 0 5px 0;
  font-size: 12px;
  opacity: 0.8;
}
.site-footer .footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 0;
}
.site-footer a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 11px;
}
@media (max-width: 768px) {
  .site-footer {
    padding-bottom: 80px;
  }
}
"""

with open('style.css', 'a', encoding='utf-8') as f:
    f.write(footer_css)

# Remove body padding-bottom from style.css
with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()
css = re.sub(r'body\s*\{\s*padding-bottom:\s*75px\s*!important;\s*\}', 'body { padding-bottom: 0; }', css)
with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)

# Update HTML files
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Replace old footer with new compact footer
    new_footer = """<footer class="site-footer">
  <p>&copy; 2026 VyaparSync</p>
  <div class="footer-links">
    <a href="about.html">About</a>
    <a href="pricing.html">Pricing</a>
    <a href="terms.html">Terms</a>
    <a href="privacy.html">Privacy</a>
    <a href="refund.html">Refunds</a>
    <a href="support.html">Support</a>
  </div>
</footer>"""
    
    html = re.sub(r'<footer.*?</footer>', new_footer, html, flags=re.DOTALL)
    
    # Fix orders-container padding
    if file == 'orders.html':
        html = html.replace('padding: 0 20px;', 'padding: 0 5%;')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

# Fix script.js wishlist catch block
with open('script.js', 'r', encoding='utf-8') as f:
    js = f.read()

js_catch_old = """    } catch (err) {
        showToast("Failed to load wishlist", "error");
    }"""
js_catch_new = """    } catch (err) {
        showToast("Failed to load wishlist", "error");
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;">
                    <p style="color:var(--text-muted);margin-bottom:15px;">Could not load wishlist.</p>
                    <button onclick="loadWishlist()" style="background:var(--primary);color:white;padding:10px 24px;border-radius:8px;border:none;font-weight:600;cursor:pointer;">Retry</button>
                </div>
            `;
        }
    }"""
js = js.replace(js_catch_old, js_catch_new)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Done updates")
