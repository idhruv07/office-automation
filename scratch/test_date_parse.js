// Import the parseDateToISO function or recreate it here to test
function parseDateToISO(dateStr) {
    if (!dateStr || String(dateStr).trim() === '') {
        return null;
    }
    const cleanStr = String(dateStr).trim();

    // 1. If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        return cleanStr;
    }

    // 2. If it's DD/MM/YYYY or DD-MM-YYYY
    const matchFull = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (matchFull) {
        const day = matchFull[1].padStart(2, '0');
        const month = matchFull[2].padStart(2, '0');
        const year = matchFull[3];
        return `${year}-${month}-${day}`;
    }

    // 3. If it's DD/MM/YY or DD-MM-YY
    const matchShort = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    if (matchShort) {
        const day = matchShort[1].padStart(2, '0');
        const month = matchShort[2].padStart(2, '0');
        const year = '20' + matchShort[3]; // Assume 20xx
        return `${year}-${month}-${day}`;
    }

    // 4. Try parsing with standard Date constructor as fallback
    const parsed = new Date(cleanStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    return null;
}

// Test cases
const tests = [
    { input: '24/07/2026', expected: '2026-07-24' },
    { input: '24-07-2026', expected: '2026-07-24' },
    { input: '24/07/26', expected: '2026-07-24' },
    { input: '24-07-26', expected: '2026-07-24' },
    { input: '2026-07-24', expected: '2026-07-24' },
    { input: '5/7/2026', expected: '2026-07-05' },
    { input: '05/07/2026', expected: '2026-07-05' },
    { input: '5/7/26', expected: '2026-07-05' },
    { input: '', expected: null },
    { input: '   ', expected: null },
    { input: null, expected: null },
    { input: undefined, expected: null },
    { input: 'garbage', expected: null }
];

let failed = 0;
for (const t of tests) {
    const output = parseDateToISO(t.input);
    if (output !== t.expected) {
        console.error(`FAIL: input='${t.input}' expected='${t.expected}' got='${output}'`);
        failed++;
    } else {
        console.log(`PASS: input='${t.input}' -> '${output}'`);
    }
}

if (failed === 0) {
    console.log('All date parsing unit tests passed!');
    process.exit(0);
} else {
    console.error(`${failed} tests failed.`);
    process.exit(1);
}
