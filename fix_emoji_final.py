import os

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Just replace "?? VyaparSync" globally
    html = html.replace('?? VyaparSync', '&#128717;&#65039; VyaparSync')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Done fixing emoji")
