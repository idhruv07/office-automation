const fs = require('fs-extra');
const path = require('path');

const storageRoot = path.join(__dirname, 'server', 'storage');
const cssPath = path.join(__dirname, 'public', 'assets', 'style.css');

async function fixHtmlFiles() {
    try {
        const css = await fs.readFile(cssPath, 'utf8');
        const users = await fs.readdir(storageRoot);

        for (const user of users) {
            const claimsPath = path.join(storageRoot, user, 'claims');
            if (!(await fs.pathExists(claimsPath))) continue;

            const files = await getFiles(claimsPath);
            for (const file of files) {
                if (!file.endsWith('.html')) continue;

                let content = await fs.readFile(file, 'utf8');
                
                // Replace the entire <style> block or wrap the content
                if (content.includes('<style>')) {
                    // Replace content between <style> and </style>
                    const start = content.indexOf('<style>') + 7;
                    const end = content.indexOf('</style>');
                    content = content.substring(0, start) + "\n" + css + "\n" + content.substring(end);
                } else if (!content.includes('<!DOCTYPE html>')) {
                    content = `
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <style>${css}</style>
                        </head>
                        <body style="background: #f1f5f9; padding: 40px; display: flex; justify-content: center;">
                            <div class="printable-area" style="background: white; padding: 40px; width: 210mm; min-height: 297mm; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin: 0 auto;">
                                ${content}
                            </div>
                        </body>
                        </html>
                    `;
                }

                await fs.writeFile(file, content);
                console.log(`Updated Styles: ${file}`);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

async function getFiles(dir) {
    const subdirs = await fs.readdir(dir);
    const files = await Promise.all(subdirs.map(async (subdir) => {
        const res = path.resolve(dir, subdir);
        return (await fs.stat(res)).isDirectory() ? getFiles(res) : res;
    }));
    return files.reduce((a, f) => a.concat(f), []);
}

fixHtmlFiles();
