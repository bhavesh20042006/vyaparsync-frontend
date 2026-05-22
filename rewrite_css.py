import re

with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Remove the old .mobile-filter-bar and .filter-nav from top-level
css = re.sub(r'\.mobile-filter-bar\s*\{\s*display:\s*none;\s*\}', '', css)
css = re.sub(r'\.filter-nav-header,\s*\.filter-nav-footer\s*\{\s*display:\s*none;\s*\}', '', css)
css = re.sub(r'\.filter-nav\s*\{\s*background:\s*var\(--card-bg\);\s*border-bottom:[^}]+\}', '', css)

# We will inject the new CSS just before html.dark nav {
new_css = """
.sort-filter-bar {
  display: flex;
  justify-content: space-between;
  padding: 15px 5%;
  max-width: 1200px;
  margin: 0 auto;
  gap: 15px;
}

.sort-filter-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  border-radius: 25px;
  border: 1px solid var(--primary);
  background: rgba(255, 106, 0, 0.05);
  color: var(--primary);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sort-filter-btn:hover {
  background: var(--primary);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 106, 0, 0.25);
}

.sort-filter-btn:active {
  transform: translateY(0);
}

.filter-nav-header, .filter-nav-footer {
  display: flex !important;
  justify-content: space-between;
  align-items: center;
}

.filter-nav {
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  width: 450px;
  max-width: 90%;
  background: var(--card-bg);
  z-index: 2000;
  padding: 25px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  align-items: stretch;
  gap: 15px;
  box-sizing: border-box;
  opacity: 0;
  visibility: hidden;
  border: 1px solid rgba(0,0,0,0.1);
}

.filter-nav.active {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, -50%) scale(1);
}

.filter-nav-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
}

.filter-nav-header button {
  color: var(--text-main);
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  transition: transform 0.2s;
}

.filter-nav-header button:hover {
  transform: rotate(90deg);
  color: var(--primary);
}

.filter-nav-footer button {
  width: 100%;
  background: var(--primary);
  color: #fff;
  padding: 14px;
  border-radius: 10px;
  border: none;
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}
.filter-nav-footer button:hover {
  background: var(--primary-hover);
}

.filter-nav select, .filter-nav input[type="number"] {
  font-size: 15px !important;
  padding: 12px !important;
  height: 45px;
  width: 100% !important;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.1);
  background: var(--bg-color);
  color: var(--text-main);
}

.filter-nav > div {
  justify-content: space-between;
}

.filter-nav label {
  font-size: 15px !important;
  padding: 10px 0;
  color: var(--text-main);
}

.filter-nav select#sortFilter {
  margin-left: 0 !important;
}

"""
css = css.replace("html.dark nav {", new_css + "html.dark nav {")

# Now remove the stuff inside the media query
# We know it starts at .mobile-filter-bar around line 615 and goes down to #langBanner
import re
# We'll use a regex to match from .mobile-filter-bar { up to .filter-nav select#sortFilter { ... }
# Then we'll replace it with the mobile overrides for .filter-nav
mobile_override = """
  .filter-nav {
    top: auto;
    bottom: -100%;
    left: 0;
    width: 100%;
    transform: none;
    border-radius: 0;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    padding: 20px 4%;
    visibility: visible;
    opacity: 1;
  }
  .filter-nav.active {
    bottom: 0;
    transform: none;
  }
"""
css = re.sub(r'\.mobile-filter-bar\s*\{.*?(?=#langBanner)', mobile_override, css, flags=re.DOTALL)

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Updated style.css")
