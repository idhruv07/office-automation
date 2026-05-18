const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'public', 'claims', 'td', 'template.html');
let content1 = fs.readFileSync(file1, 'utf8');

// Replace inline styles with Tailwind classes
content1 = content1.replace(/style="text-align: center; margin-bottom: 20px;"/g, 'class="text-center mb-5"');
content1 = content1.replace(/style="margin-bottom: 15px;"/g, 'class="mb-4"');
content1 = content1.replace(/style="background-color: var\(--secondary-color\);"/g, 'class="bg-surface-container"');
content1 = content1.replace(/style="width: 100%; border-collapse: collapse; margin-top: 10px; border-radius: 12px; overflow: hidden;"/g, 'class="w-full border-collapse mt-2 rounded-xl overflow-hidden"');
content1 = content1.replace(/style="background: var\(--secondary-color\);"/g, 'class="bg-surface-container"');
content1 = content1.replace(/style="border: 1px solid var\(--border-color\); padding: 10px;"/g, 'class="border border-outline-variant p-2"');
content1 = content1.replace(/style="box-shadow: none;"/g, 'class="shadow-none"');
content1 = content1.replace(/style="margin-top: 25px; border-radius: 12px; border: 1px solid var\(--border-color\); padding: 15px; background: var\(--secondary-color\);"/g, 'class="mt-6 rounded-xl border border-outline-variant p-4 bg-surface-container"');
content1 = content1.replace(/style="margin-bottom: 10px;"/g, 'class="mb-2"');
fs.writeFileSync(file1, content1);

const file2 = path.join(__dirname, 'public', 'claims', 'medical', 'template.html');
let content2 = fs.readFileSync(file2, 'utf8');
content2 = content2.replace(/style="background-color: var\(--secondary-color\);"/g, 'class="bg-surface-container"');
content2 = content2.replace(/style="margin-top:20px;"/g, 'class="mt-5"');
fs.writeFileSync(file2, content2);

console.log("Replaced inline styles with Tailwind classes in TD and Medical templates.");
