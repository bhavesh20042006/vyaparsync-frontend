const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend');

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }
    
    files.forEach((file) => {
        if (file.endsWith('.html')) {
            const filePath = path.join(directoryPath, file);
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;
            
            // Bump script version
            content = content.replace(/script\.js\?v=\d+/g, 'script.js?v=6');
            
            // Bump style version
            content = content.replace(/style\.css\?v=\d+/g, 'style.css?v=6');
            
            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Updated versions in ${file}`);
            }
        }
    });
});
