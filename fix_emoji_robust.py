import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    html = re.sub(r'>[^<]*VyaparSync</h1', '>&#128717;&#65039; VyaparSync</h1', html)
    html = re.sub(r'>[^<]*VyaparSync</h2', '>&#128717;&#65039; VyaparSync</h2', html)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Done fixing emoji with robust regex")
