import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    html = re.sub(r'>\?\? Live<', r'>&#128225; Live<', html)
    html = re.sub(r'>\?\? Orders<', r'>&#128230; Orders<', html)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Fixed main nav emojis")
