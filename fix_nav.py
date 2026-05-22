import re

# Fix style.css
with open("style.css", "r", encoding="utf-8") as f:
    css = f.read()

css = css.replace("padding-bottom: 80px;", "padding-bottom: 110px !important;")

if "#back-to-top {" not in css:
    css += """\n
#back-to-top {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1500;
}
@media (max-width: 768px) {
  #back-to-top {
    bottom: 100px !important;
  }
}
"""

with open("style.css", "w", encoding="utf-8") as f:
    f.write(css)

# Fix index.html inline styles
with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# remove position: fixed; bottom: 20px; right: 20px; z-index: 1000;
html = html.replace("position: fixed; bottom: 20px; right: 20px;", "")
html = html.replace("z-index: 1000;", "")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Fixed CSS and HTML")
