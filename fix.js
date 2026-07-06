const fs = require('fs');
const path = require('path');
const dir = 'api/repo';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
for (const f of files) {
    let content = fs.readFileSync(path.join(dir, f), 'utf8');
    content = content.replace(/require\(['"]\.\.\/\.\.\/config\/db['"]\)/g, 'require(\'../../config/repo_db\')');
    fs.writeFileSync(path.join(dir, f), content, 'utf8');
}
console.log('Replaced config/db with config/repo_db in api/repo routes');
