const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const storageDir = path.join(__dirname, 'server', 'storage');

function findHtmlFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findHtmlFiles(filePath, fileList);
        } else if (filePath.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const htmlFiles = findHtmlFiles(storageDir);

htmlFiles.forEach(file => {
    let rawContent = fs.readFileSync(file, 'utf8');
    
    // Quick check if it's a TD Claim
    if (!rawContent.includes('TEMPORARY DUTY CLAIM') && !rawContent.includes('अस्थायी ड्यूटी दावा')) {
        return; // Skip non-TD claims
    }

    const $ = cheerio.load(rawContent);
    let modified = false;

    // Remove NO. and Fare/Person Headers
    $('th').each((i, el) => {
        const text = $(el).text().trim();
        if (text === 'Fare/Person' || text === 'No.') {
            $(el).remove();
            modified = true;
        }
        if (text === 'Ticket No.') {
            $(el).text('Remarks');
            modified = true;
        }
        if (text === 'Mode/Class' || text === 'Mode/\nClass') {
            $(el).html('Mode/<br>Class');
            $(el).css('width', '8%');
            modified = true;
        }
        if (text === 'Dist (KM)') {
            $(el).css('width', '7%');
            modified = true;
        }
    });

    // Process tbody rows of journey table
    $('#ltcFinalJourneyBody tr').each((i, tr) => {
        const tds = $(tr).find('td');
        // If there are exactly 11 columns, then the 7th and 8th are Fare and No.
        if (tds.length === 11) {
            $(tds[6]).remove(); // Fare
            $(tds[7]).remove(); // No
            modified = true;
        }

        // Fix Dates to DD/MM/YY
        $(tr).find('input[name^="journey_dep_date_"], input[name^="journey_arr_date_"]').each((j, inp) => {
            let val = $(inp).val() || '';
            val = val.trim();
            if (val.match(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/)) {
                const parts = val.split(/[\/\-\.]/);
                $(inp).val(`${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[2].slice(-2)}`);
                modified = true;
            }
        });

        // Convert Total Claim to div contenteditable if it's an input
        const totalClaimInp = $(tr).find('input.ltc-journey-total-amt[type="number"]');
        if (totalClaimInp.length > 0) {
            const name = totalClaimInp.attr('name');
            const val = totalClaimInp.val();
            const newHtml = `
                <div contenteditable="true" class="editable-td ltc-journey-total-amt font-bold ltc-calc-trigger ltc-station-sync" data-name="${name}">${val || ''}</div>
                <input type="hidden" name="${name}" value="${val || ''}">
            `;
            const parentTd = totalClaimInp.parent('td');
            parentTd.html(newHtml);
            modified = true;
        }

        // Convert Dist, Mode, and Ticket No to div contenteditable if they are inputs
        ['journey_dist_', 'journey_mode_', 'journey_ticket_no_'].forEach(prefix => {
            const inps = $(tr).find(`input[name^="${prefix}"]`);
            if (inps.length > 0 && inps.attr('type') !== 'hidden') {
                inps.each((j, inpEl) => {
                    const inp = $(inpEl);
                    const name = inp.attr('name');
                    const val = inp.val() || '';
                    const newHtml = `
                        <div contenteditable="true" class="editable-td ltc-station-sync" data-name="${name}">${val}</div>
                        <input type="hidden" name="${name}" value="${val}">
                    `;
                    inp.parent('td').html(newHtml);
                    modified = true;
                });
            }
        });
    });

    // Fix Total Journey Claim colspan
    const tfootTotalLabel = $('#ltcFinalJourneyTotal').parent().prev('td');
    if (tfootTotalLabel.length && tfootTotalLabel.attr('colspan') === '8') {
        tfootTotalLabel.attr('colspan', '6');
        modified = true;
    }

    if ($('style').length > 0) {
        let styleHtml = $('style').first().html() || '';
        // Add wrapping
        if (!styleHtml.includes('word-wrap: break-word !important;')) {
            $('style').first().append(`
                .editable-td { word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: pre-wrap !important; }
            `);
            modified = true;
        }
        // Remove fixed table layout if present
        if (styleHtml.includes('.journey-table { table-layout: fixed !important; }')) {
            styleHtml = styleHtml.replace(/\.journey-table\s*\{\s*table-layout:\s*fixed\s*!important;\s*\}/g, '');
            $('style').first().html(styleHtml);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(file, $.html(), 'utf8');
        console.log(`Updated: ${file}`);
    }
});
console.log('Done fixing TD Claims.');
