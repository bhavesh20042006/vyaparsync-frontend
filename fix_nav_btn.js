const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

css = css.replace(
  '.nav-btn {\n  display: inline-flex !important;\n  align-items: center;\n  justify-content: center;\n  gap: 5px;\n  background: linear-gradient(135deg, #3498db, #2980b9);\n  color: white !important;\n  min-width: auto !important; /* Fixed short buttons min-width */\n  width: auto !important; /* Allows long buttons to expand safely */\n  padding: 0 10px !important;\n  margin: 0 !important; /* Fixes vertical alignment between button and a tags */\n  height: 42px !important; /* Exact uniform height */\n  box-sizing: border-box !important;',
  '.nav-btn {\n  display: inline-flex !important;\n  align-items: center;\n  justify-content: center;\n  gap: 5px;\n  background: linear-gradient(135deg, #3498db, #2980b9);\n  color: white !important;\n  min-width: 145px !important;\n  width: 145px !important;\n  padding: 0 10px !important;\n  margin: 0 !important;\n  height: 42px !important;\n  box-sizing: border-box !important;\n  flex-shrink: 0 !important;'
);

css = css.replace(
  '.nav-buttons {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  justify-content: flex-end;\n  flex: 2 1 auto;\n}',
  '.nav-buttons {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  justify-content: flex-start;\n  flex: 2 1 auto;\n  overflow-x: auto;\n  flex-wrap: nowrap;\n  scrollbar-width: none;\n  padding-bottom: 5px;\n}\n.nav-buttons::-webkit-scrollbar {\n  display: none;\n}'
);

fs.writeFileSync('style.css', css);
console.log('Fixed nav-buttons CSS');
