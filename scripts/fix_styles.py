import re
import os

files = ['frontend/login.html', 'frontend/customer-register.html', 'frontend/retailer-register.html']

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Update body style
    content = re.sub(r'<body[^>]*>', '<body style="display: flex; flex-direction: column; min-height: 100dvh; margin: 0; padding: 0; box-sizing: border-box;">', content)
    
    # Cache bust css
    content = re.sub(r'href="style\.css(\?v=\d+)?"', 'href="style.css?v=6"', content)
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

# Update style.css
css_path = 'frontend/style.css'
with open(css_path, 'r', encoding='utf-8') as file:
    css = file.read()

# Remove old body:has(.auth-wrapper)
css = re.sub(r'body:has\(\.auth-wrapper\) \{[\s\S]*?body:has\(\.auth-wrapper\) footer \{[\s\S]*?\}\s*', '', css)

# Update auth-wrapper and footer
auth_wrapper_regex = r'\.auth-wrapper \{[\s\S]*?box-sizing: border-box;\n\}'
replacement = '''.auth-wrapper {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255,106,0,0.05) 0%, rgba(255,255,255,0) 100%);
  padding: 20px;
  box-sizing: border-box;
}

.auth-wrapper ~ footer {
  margin-top: auto !important;
}'''

css = re.sub(auth_wrapper_regex, replacement, css)

with open(css_path, 'w', encoding='utf-8') as file:
    file.write(css)

print("Updates completed successfully.")
