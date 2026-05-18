const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const assetsDir = path.join(publicDir, 'assets');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let scriptMatch;
            const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
            
            let modified = false;
            let counter = 1;

            while ((scriptMatch = scriptRegex.exec(content)) !== null) {
                const scriptContent = scriptMatch[1].trim();
                if (scriptContent.length > 0) {
                    const baseName = path.basename(fullPath, '.html');
                    // Add prefix based on subfolder if not in root
                    const relPath = path.relative(publicDir, dir);
                    const prefix = relPath ? relPath.replace(/[\/\\]/g, '_') + '_' : '';
                    const jsFileName = `${prefix}${baseName}${counter === 1 ? '' : '_' + counter}.js`;
                    const jsFilePath = path.join(assetsDir, jsFileName);
                    
                    fs.writeFileSync(jsFilePath, scriptContent);
                    
                    const replacement = `<script src="/assets/${jsFileName}"></script>`;
                    content = content.replace(scriptMatch[0], replacement);
                    modified = true;
                    counter++;
                    // reset regex index because we modified the string
                    scriptRegex.lastIndex = 0;
                }
            }
            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Extracted scripts from ${fullPath}`);
            }
        }
    }
}

processDir(publicDir);
