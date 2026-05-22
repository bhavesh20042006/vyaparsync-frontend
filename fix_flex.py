with open("admin-dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()

html = html.replace("body { display: flex;", "body { display: flex; flex-direction: row;")

with open("admin-dashboard.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Added flex-direction: row to admin-dashboard.html body")
