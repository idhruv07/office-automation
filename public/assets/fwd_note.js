document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const claimId = urlParams.get('id');
    const token = localStorage.getItem('token');
    let isContingentGlobal = false;

    function getClaimAmount(claim) {
        if (!claim || !claim.data) return null;
        const data = claim.data;

        // Check specific fields based on type
        const typeLower = (claim.type_name || '').toLowerCase();
        if (typeLower.includes('contingent')) {
            return data.total_amount || data.totalAmt || null;
        }
        if (typeLower.includes('medical')) {
            const opd = parseFloat(data.opd_amount) || 0;
            const indoor = parseFloat(data.indoor_amount) || 0;
            const test = parseFloat(data.test_investigation_amount) || 0;
            const ins = parseFloat(data.amount_claimed_received) || 0;
            return (opd + indoor + test - ins).toFixed(2);
        }
        if (typeLower.includes('gpf')) {
            return data.gpf_advance_req || data.gpf_consolidated || null;
        }
        if (typeLower.includes('newspaper')) {
            return data.amount || null;
        }
        
        // Fallbacks for LTC, TD, Permanent Transfer, etc.
        return data.total_amount_claimed || data.balance_due || null;
    }

    function formatCommas(amt) {
        if (amt === null || amt === undefined || amt === '') return '...';
        let clean = String(amt).replace(/[₹\-\/]/g, '').trim();
        const num = parseFloat(clean);
        if (isNaN(num)) return amt;
        return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ── 1. FETCH & INJECT OFFICE CONFIG ────────────────────────────────────────
    let officeConfig = {};
    try {
        const configRes = await fetch('/api/admin/office-config', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (configRes.ok) officeConfig = await configRes.json();
    } catch (e) { console.warn('Could not load office config, using HTML defaults.'); }

    // Inject into letterhead DOM elements (fall back to existing HTML text if config missing)
    if (officeConfig.office_name)      document.getElementById('officeName').textContent      = officeConfig.office_name;
    if (officeConfig.office_address)   document.getElementById('officeAddress').textContent   = officeConfig.office_address;
    if (officeConfig.office_sub_address) document.getElementById('officeSubAddr').textContent = officeConfig.office_sub_address;
    if (officeConfig.city_state_pin)   document.getElementById('officeCityPin').textContent   = officeConfig.city_state_pin;
    if (officeConfig.phone)            document.getElementById('officePhone').textContent      = officeConfig.phone;
    if (officeConfig.email)            document.getElementById('officeEmail').textContent      = officeConfig.email;
    if (officeConfig.fwd_ref_no)       document.getElementById('fwdRefNo').textContent        = officeConfig.fwd_ref_no;
    if (officeConfig.signatory_name)   document.getElementById('signatoryName').textContent   = officeConfig.signatory_name;
    if (officeConfig.signatory_dept)   document.getElementById('signatoryDept').textContent   = officeConfig.signatory_dept;
    if (officeConfig.logo_left_url)  { const img = document.getElementById('logoLeft');  if (img) img.src = officeConfig.logo_left_url; }
    if (officeConfig.logo_right_url) { const img = document.getElementById('logoRight'); if (img) img.src = officeConfig.logo_right_url; }

    // ── 2. DEFAULT DATE ─────────────────────────────────────────────────────────
    document.getElementById('letterDate').valueAsDate = new Date();

    // ── 3. FETCH CLAIM DATA & AUTO-FILL ────────────────────────────────────────
    if (claimId) {
        Promise.all([
            fetch('/api/admin/claims?months=60', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
            fetch('/api/admin/claims?type_id=7&months=60', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
        ])
        .then(([claims, contingentClaims]) => {
            const allClaims = [...claims, ...contingentClaims];
            const claim = allClaims.find(c => String(c.id) === claimId);
            if (claim) {
                document.getElementById('subName').textContent = claim.user_name || '';
                document.getElementById('bodyName').textContent = claim.user_name || '';
                document.getElementById('subDesig').textContent = claim.designation || '';
                document.getElementById('bodyDesig').textContent = claim.designation || '';
                if (claim.personal_no) {
                    document.getElementById('subPno').textContent = claim.personal_no;
                    document.getElementById('bodyPno').textContent = claim.personal_no;
                }
                
                // Set Salutation based on gender
                const subSalutation = document.getElementById('subSalutation');
                const bodySalutationText = document.getElementById('bodySalutationText');
                if (claim.gender === 'Female') {
                    subSalutation.textContent = 'Smt.';
                    bodySalutationText.textContent = 'Smt.';
                } else {
                    subSalutation.textContent = 'Shri.';
                    bodySalutationText.textContent = 'Shri.';
                }

                // Auto-fill claim type cleanly
                const typeName = claim.type_name || 'Medical';
                document.title = `${typeName} Claim Forwarding – CDA IT&SDC`;
                const topBarTitle = document.getElementById('top-bar-title');
                if (topBarTitle) topBarTitle.textContent = document.title;
                
                let bodyClaimString = typeName + ' claim';
                let subClaimString = typeName + ' claim';
                
                const typeLower = typeName.toLowerCase();
                isContingentGlobal = typeLower.includes('contingent');

                if (isContingentGlobal) {
                    (async function() {
                        let expAccountVal = '...';
                        let totalAmtVal = '...';
                        let amtWordsVal = '...';
                        let duringVal = '...';

                        if (claim.file_path) {
                            try {
                                const htmlRes = await fetch('/' + claim.file_path);
                                if (htmlRes.ok) {
                                    const htmlText = await htmlRes.text();
                                    const parser = new DOMParser();
                                    const doc = parser.parseFromString(htmlText, 'text/html');
                                    const expEl = doc.getElementById('expAccount');
                                    const totEl = doc.getElementById('totalAmt');
                                    const amtWEl = doc.getElementById('amtWords');
                                    const durEl = doc.getElementById('during');
                                    
                                    if (expEl && expEl.value) expAccountVal = expEl.value;
                                    else if (expEl && expEl.getAttribute('value')) expAccountVal = expEl.getAttribute('value');
                                    
                                    if (totEl && totEl.value) totalAmtVal = totEl.value;
                                    else if (totEl && totEl.getAttribute('value')) totalAmtVal = totEl.getAttribute('value');
                                    
                                    if (amtWEl && amtWEl.value) amtWordsVal = amtWEl.value;
                                    else if (amtWEl && amtWEl.getAttribute('value')) amtWordsVal = amtWEl.getAttribute('value');
                                    
                                    if (durEl && durEl.value) duringVal = durEl.value;
                                    else if (durEl && durEl.getAttribute('value')) duringVal = durEl.getAttribute('value');
                                }
                            } catch(e) { console.warn("Could not fetch claim HTML", e); }
                        }

                        let codeheadOptions = '<option value="">-- Select Codehead --</option>';
                        try {
                            const chRes = await fetch('/api/admin/codeheads', { headers: { 'Authorization': `Bearer ${token}` } });
                            if (chRes.ok) {
                                const chData = await chRes.json();
                                chData.forEach(ch => {
                                    codeheadOptions += `<option value="${ch.code_head}">${ch.code_head} - ${ch.description}</option>`;
                                });
                            }
                        } catch(e) { console.warn("Could not load codeheads", e); }

                        const amtPart = totalAmtVal !== '...' ? ` (Rs. ${formatCommas(totalAmtVal)}/-)` : '';
                        document.querySelector('.fwd-sub-block').innerHTML = `<div class="fwd-sub-line">
                            Sub&nbsp;:&nbsp;Forwarding of Contingent Bill${amtPart} in R/o <span class="fwd-ghost" id="contExpAccount" contenteditable="true" spellcheck="false" style="font-weight:bold;">${expAccountVal}</span> &ndash; Reg.
                        </div>`;

                        document.querySelector('.fwd-body-para').innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Contingent Bill for Rs. <span class="fwd-ghost" id="contTotalAmt" contenteditable="true" spellcheck="false" style="font-weight:bold;">${totalAmtVal}</span>/- (Rs. <span class="fwd-ghost" id="contAmtWords" contenteditable="true" spellcheck="false" style="font-weight:bold;">${amtWordsVal}</span>) towards <span class="fwd-ghost" id="contExpAccount2" contenteditable="true" spellcheck="false" style="font-weight:bold;">${expAccountVal}</span> for the period <span class="fwd-ghost" id="contDuring" contenteditable="true" spellcheck="false" style="font-weight:bold;">${duringVal}</span> in the O/o CDA (IT&amp;SDC), Secunderabad is forwarded herewith along with the Satisfactory Certificate for payment. The expenditure may please be booked to the head <select id="contCodehead" class="fwd-ghost fwd-select">${codeheadOptions}</select> and the payment may be credited to the account of M/s. <span class="fwd-ghost" id="contMs" contenteditable="true" spellcheck="false" style="border-bottom: 1px dashed #666; min-width: 150px; display: inline-block; text-align: center; font-weight:bold;" data-ph="[Write name here]"></span>`;

                        wire('contExpAccount', 'contExpAccount2');

                        // Dynamically resize the dropdown to match the selected text width
                        const sel = document.getElementById('contCodehead');
                        if (sel) {
                            function resizeSelect() {
                                let span = document.createElement('span');
                                const style = window.getComputedStyle(sel);
                                span.style.fontFamily = style.fontFamily;
                                span.style.fontSize = style.fontSize;
                                span.style.fontWeight = style.fontWeight;
                                span.style.fontStyle = style.fontStyle;
                                span.style.fontVariant = style.fontVariant;
                                span.style.visibility = 'hidden';
                                span.style.position = 'absolute';
                                span.style.whiteSpace = 'pre';
                                span.textContent = sel.options[sel.selectedIndex].text;
                                document.body.appendChild(span);
                                sel.style.width = (span.clientWidth + 45) + 'px';
                                document.body.removeChild(span);
                            }
                            sel.addEventListener('change', resizeSelect);
                            resizeSelect(); // Initialize
                        }

                        const recipientContainer = document.getElementById('fwdRecipientContainer');
                        if (recipientContainer) {
                            recipientContainer.innerHTML = `
                                <select id="fwdRecipientSelect" class="fwd-ghost fwd-select fwd-select-bold">
                                    <option value="Admin Pay">Admin Pay</option>
                                    <option value="Admin I">Admin I</option>
                                    <option value="Admin II">Admin II</option>
                                    <option value="Admin III">Admin III</option>
                                    <option value="Other">Other</option>
                                </select>
                                <span id="fwdRecipientCustom" class="fwd-ghost fwd-custom-input" contenteditable="true" spellcheck="false" style="display: none;" data-ph="[Specify recipient]"></span>
                            `;

                            const selectEl = document.getElementById('fwdRecipientSelect');
                            const customEl = document.getElementById('fwdRecipientCustom');

                            function resizeRecipientSelect() {
                                let span = document.createElement('span');
                                const style = window.getComputedStyle(selectEl);
                                span.style.fontFamily = style.fontFamily;
                                span.style.fontSize = style.fontSize;
                                span.style.fontWeight = style.fontWeight;
                                span.style.fontStyle = style.fontStyle;
                                span.style.fontVariant = style.fontVariant;
                                span.style.visibility = 'hidden';
                                span.style.position = 'absolute';
                                span.style.whiteSpace = 'pre';
                                span.textContent = selectEl.options[selectEl.selectedIndex].text;
                                document.body.appendChild(span);
                                selectEl.style.width = (span.clientWidth + 45) + 'px';
                                document.body.removeChild(span);
                            }

                            function handleSelectChange() {
                                resizeRecipientSelect();
                                if (selectEl.value === 'Other') {
                                    customEl.style.display = 'inline-block';
                                } else {
                                    customEl.style.display = 'none';
                                    customEl.textContent = '';
                                }
                            }

                            selectEl.addEventListener('change', handleSelectChange);

                            // Restore state if saved
                            if (claim.fwd_recipient) {
                                const standardOptions = ['Admin Pay', 'Admin I', 'Admin II', 'Admin III'];
                                if (standardOptions.includes(claim.fwd_recipient)) {
                                    selectEl.value = claim.fwd_recipient;
                                } else {
                                    selectEl.value = 'Other';
                                    customEl.style.display = 'inline-block';
                                    customEl.textContent = claim.fwd_recipient;
                                }
                            }
                            handleSelectChange(); // Set initial visibility & width
                        }
                    })();
                } else {
                    if (typeLower.includes('medical')) {
                        bodyClaimString = 'Medical reimbursement claim';
                        subClaimString = 'Medical claim';
                    } else if (typeLower.includes('ltc final')) {
                        bodyClaimString = 'LTC Final claim';
                        subClaimString = 'LTC Final claim';
                    } else if (typeLower.includes('ltc intimation')) {
                        bodyClaimString = 'LTC Intimation';
                        subClaimString = 'LTC Intimation';
                    } else if (typeLower.includes('temporary duty')) {
                        bodyClaimString = 'Temporary Duty claim';
                        subClaimString = 'Temporary Duty claim';
                    } else {
                        let cleanType = typeName.replace(/claim/i, '').trim();
                        bodyClaimString = cleanType + ' claim';
                        subClaimString = cleanType + ' claim';
                    }

                    document.getElementById('subClaimType').textContent = subClaimString;
                    document.getElementById('bodyClaimType').textContent = bodyClaimString;

                    const amt = getClaimAmount(claim);
                    if (amt) {
                        const amtContainer = document.getElementById('bodyClaimAmtContainer');
                        const amtEl = document.getElementById('bodyClaimAmt');
                        if (amtContainer && amtEl) {
                            amtEl.textContent = `Rs. ${formatCommas(amt)}`;
                            amtContainer.style.display = 'inline';
                        }
                    }
                }
                
                // ── Fetch claim-type-specific ref no and override if set ──────
                if (claim.type_id) {
                    fetch(`/api/admin/claim-ref-nos/${claim.type_id}/current`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (data && data.ref_no) {
                            const refEl = document.getElementById('fwdRefNo');
                            if (refEl) refEl.textContent = data.ref_no;
                        }
                    })
                    .catch(() => {});
                }

                updateSeps();
            }
        })
        .catch(err => console.error("Error fetching claim data:", err));
    }


    // ── 4. TWO-WAY FIELD SYNC ───────────────────────────────────────────────────
    function wire(srcId, dstId) {
        var src = document.getElementById(srcId);
        var dst = document.getElementById(dstId);
        if(!src || !dst) return;
        src.addEventListener('input', function() { if(dst.textContent !== src.textContent) dst.textContent = src.textContent; updateSeps(); });
        dst.addEventListener('input', function() { if(src.textContent !== dst.textContent) src.textContent = dst.textContent; updateSeps(); });
    }
    wire('subName','bodyName');
    wire('subDesig','bodyDesig');
    wire('subPno','bodyPno');
    wire('subClaimType','bodyClaimType');
    wire('subSalutation','bodySalutationText');

    function updateSeps() {
        var name  = document.getElementById('subName').textContent.trim();
        var desig = document.getElementById('subDesig').textContent.trim();
        var pno   = document.getElementById('subPno').textContent.trim();
        document.getElementById('sepComma').style.display  = (name && desig) ? 'inline' : 'none';
        document.getElementById('sepSlash').style.display  = ((name||desig) && pno) ? 'inline' : 'none';
        document.getElementById('bSepComma').style.display = (name && desig) ? 'inline' : 'none';
        document.getElementById('bSepSlash').style.display = ((name||desig) && pno) ? 'inline' : 'none';
    }

    document.querySelectorAll('.fwd-ghost').forEach(function(el) {
        el.addEventListener('keydown', function(e) { if(e.key==='Enter') e.preventDefault(); });
        el.addEventListener('input', updateSeps);
    });

    // ── 5. BUILD HTML SNAPSHOT ──────────────────────────────────────────────────
    function formatDate(val) {
        if(!val) return '';
        var p = val.split('-');
        var m = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December'];
        return p[2]+' '+m[parseInt(p[1],10)-1]+' '+p[0];
    }

    var base = window.location.href.replace(/\/[^\/]*$/, '/');

    function buildBody() {
        var date         = formatDate(document.getElementById('letterDate').value);

        // Use live DOM values (already set from officeConfig)
        var oName    = document.getElementById('officeName').textContent.trim();
        var oAddr    = document.getElementById('officeAddress').textContent.trim();
        var oSub     = document.getElementById('officeSubAddr').textContent.trim();
        var oCity    = document.getElementById('officeCityPin').textContent.trim();
        var oPhone   = document.getElementById('officePhone').textContent.trim();
        var oEmail   = document.getElementById('officeEmail').textContent.trim();
        var oRef     = document.getElementById('fwdRefNo').textContent.trim();
        var oSigName = document.getElementById('signatoryName').textContent.trim();
        const oSigDept      = document.getElementById('signatoryDept').textContent.trim();
        const logoLeftSrc   = document.getElementById('logoLeft')  ? document.getElementById('logoLeft').src  : (base + 'images/emblem.png');
        const logoRightSrc  = document.getElementById('logoRight') ? document.getElementById('logoRight').src : (base + 'images/azadi.png');

        let recipientStr = 'Admin-Pay';
        if (isContingentGlobal) {
            const selectEl = document.getElementById('fwdRecipientSelect');
            const customEl = document.getElementById('fwdRecipientCustom');
            if (selectEl) {
                if (selectEl.value === 'Other') {
                    recipientStr = customEl.textContent.trim() || 'Admin-Pay';
                } else {
                    recipientStr = selectEl.value;
                }
            }
        }

        if (isContingentGlobal) {
            var subHtml = document.querySelector('.fwd-sub-block').innerHTML;
            var bodyHtml = document.querySelector('.fwd-body-para').innerHTML;
            
            const codeHeadSelect = document.getElementById('contCodehead');
            let selectedCodeheadText = '';
            if (codeHeadSelect && codeHeadSelect.selectedIndex > -1) {
                selectedCodeheadText = codeHeadSelect.options[codeHeadSelect.selectedIndex].text;
            }
            bodyHtml = bodyHtml.replace(/<select\b[^>]*>[\s\S]*?<\/select>/i, `<span style="font-weight:bold;">${selectedCodeheadText}</span>`);

            return `
            <div class="fwd-letterhead">
              <div class="fwd-lh-img"><img src="${logoLeftSrc}" alt="Emblem"></div>
              <div class="fwd-lh-center">
                <div class="fwd-lh-title">${oName}</div>
                <div class="fwd-lh-sub">${oAddr}</div>
                ${oSub  ? `<div class="fwd-lh-sub">${oSub}</div>`   : ''}
                ${oCity ? `<div class="fwd-lh-sub">${oCity}</div>` : ''}
                ${oEmail ? `<div class="fwd-lh-email">Email: ${oEmail}</div>` : ''}
                ${oPhone ? `<div class="fwd-lh-phone">Phone/ Fax No: ${oPhone}</div>` : ''}
              </div>
              <div class="fwd-lh-img"><img src="${logoRightSrc}" alt="Logo Right"></div>
            </div>
            <div class="fwd-meta-row">
              <span>No. ${oRef}</span>
              <span>Date: ${date}</span>
            </div>
            <div class="fwd-to-block">
              To<br>The Officer in charge<br>${recipientStr}<br>
              O/o the CDA Secunderabad<br>No. 1 Staff Road<br>Secunderabad-09
            </div>
            <div class="fwd-sub-block">
              ${subHtml}
            </div>
            <div class="fwd-divider">&lt;&lt;&lt;&gt;&gt;&gt;</div>
            <div class="fwd-body-para">
              ${bodyHtml}
            </div>
            <div class="fwd-sig-block">${oSigName}<br>${oSigDept}</div>
            `;
        }

        var claimType    = document.getElementById('subClaimType').textContent.trim();
        var salutation   = document.getElementById('subSalutation').textContent.trim();
        var name         = document.getElementById('subName').textContent.trim();
        var desig        = document.getElementById('subDesig').textContent.trim();
        var pno          = document.getElementById('subPno').textContent.trim();
        var refStr       = salutation + ' ' + name + (name&&desig?', ':'') + desig + ((name||desig)&&pno?'/':'') + pno;
        var bodyClaimType= document.getElementById('bodyClaimType').textContent.trim();

        const amtContainer = document.getElementById('bodyClaimAmtContainer');
        const amtStr = (amtContainer && amtContainer.style.display !== 'none') ? ` for ${document.getElementById('bodyClaimAmt').textContent.trim()}/-` : '';

        return `
        <div class="fwd-letterhead">
          <div class="fwd-lh-img"><img src="${logoLeftSrc}" alt="Emblem"></div>
          <div class="fwd-lh-center">
            <div class="fwd-lh-title">${oName}</div>
            <div class="fwd-lh-sub">${oAddr}</div>
            ${oSub  ? `<div class="fwd-lh-sub">${oSub}</div>`   : ''}
            ${oCity ? `<div class="fwd-lh-sub">${oCity}</div>` : ''}
            ${oEmail ? `<div class="fwd-lh-email">Email: ${oEmail}</div>` : ''}
            ${oPhone ? `<div class="fwd-lh-phone">Phone/ Fax No: ${oPhone}</div>` : ''}
          </div>
          <div class="fwd-lh-img"><img src="${logoRightSrc}" alt="Logo Right"></div>
        </div>
        <div class="fwd-meta-row">
          <span>No. ${oRef}</span>
          <span>Date: ${date}</span>
        </div>
        <div class="fwd-to-block">
          To<br>The Officer in charge<br>Admin-Pay<br>
          O/o the CDA Secunderabad<br>No. 1 Staff Road<br>Secunderabad-09
        </div>
        <div class="fwd-sub-block">
          Sub : ${claimType} in r/o ${refStr} &ndash; Reg.
        </div>
        <div class="fwd-divider">&lt;&lt;&lt;&gt;&gt;&gt;</div>
        <div class="fwd-body-para">
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${bodyClaimType}${amtStr} in r/o ${refStr} is forwarded herewith for further necessary action at your end please.
        </div>
        <div class="fwd-sig-block">${oSigName}<br>${oSigDept}</div>
        `;
    }

    // ── 6. SAVE & PREVIEW ───────────────────────────────────────────────────────
    document.getElementById('btnPreview').addEventListener('click', () => {
        const content = buildBody();
        const htmlToSave = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Forwarding Note</title><link rel="stylesheet" href="/assets/style.css"><style>body { padding:28px 36px 40px !important; background: #fff; }</style></head><body>${content}</body></html>`;
        
        let fwdRecipient = undefined;
        if (isContingentGlobal) {
            const selectEl = document.getElementById('fwdRecipientSelect');
            const customEl = document.getElementById('fwdRecipientCustom');
            if (selectEl) {
                if (selectEl.value === 'Other') {
                    fwdRecipient = customEl.textContent.trim();
                } else {
                    fwdRecipient = selectEl.value;
                }
            }
        }

        if (claimId) {
            // Save to backend
            fetch(`/api/admin/claims/${claimId}/fwd-note`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    htmlContent: htmlToSave,
                    fwdRecipient: fwdRecipient
                })
            })
            .then(res => res.json())
            .then(data => {
                console.log(data.message);
                document.getElementById('previewContent').innerHTML = content;
                document.getElementById('previewModal').classList.add('active');
                document.body.classList.add('modal-active');
            })
            .catch(err => {
                alert('Error saving forwarding note.');
                console.error(err);
            });
        } else {
            document.getElementById('previewContent').innerHTML = content;
            document.getElementById('previewModal').classList.add('active');
            document.body.classList.add('modal-active');
        }
    });

    document.getElementById('btnClosePreview').addEventListener('click', () => {
        document.getElementById('previewModal').classList.remove('active');
        document.body.classList.remove('modal-active');
    });

    document.getElementById('btnDoPrint').addEventListener('click', () => {
        window.print();
    });
});
