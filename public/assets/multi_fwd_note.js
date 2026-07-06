document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    // ── 1. FETCH & INJECT OFFICE CONFIG ─────────────────────────────────────────
    let officeConfig = {};
    try {
        const configRes = await fetch('/api/admin/office-config', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (configRes.ok) officeConfig = await configRes.json();
    } catch (e) { console.warn('Could not load office config.'); }

    if (officeConfig.office_name)        document.getElementById('officeName').textContent      = officeConfig.office_name;
    if (officeConfig.office_address)     document.getElementById('officeAddress').textContent   = officeConfig.office_address;
    if (officeConfig.office_sub_address) document.getElementById('officeSubAddr').textContent   = officeConfig.office_sub_address;
    if (officeConfig.city_state_pin)     document.getElementById('officeCityPin').textContent   = officeConfig.city_state_pin;
    if (officeConfig.phone)              document.getElementById('officePhone').textContent      = officeConfig.phone;
    if (officeConfig.email)              document.getElementById('officeEmail').textContent      = officeConfig.email;
    if (officeConfig.fwd_ref_no)         document.getElementById('fwdRefNo').textContent        = officeConfig.fwd_ref_no;
    if (officeConfig.signatory_name)     document.getElementById('signatoryName').textContent   = officeConfig.signatory_name;
    if (officeConfig.signatory_dept)     document.getElementById('signatoryDept').textContent   = officeConfig.signatory_dept;
    if (officeConfig.logo_left_url)  { const img = document.getElementById('logoLeft');  if (img) img.src = officeConfig.logo_left_url; }
    if (officeConfig.logo_right_url) { const img = document.getElementById('logoRight'); if (img) img.src = officeConfig.logo_right_url; }

    // ── 2. DEFAULT DATE ──────────────────────────────────────────────────────────
    document.getElementById('letterDate').valueAsDate = new Date();

    // ── 3. READ SESSION DATA ─────────────────────────────────────────────────────
    let sessionData = null;
    try {
        sessionData = JSON.parse(sessionStorage.getItem('multiFwdNote') || 'null');
    } catch(e) {}

    if (!sessionData || !sessionData.individuals || sessionData.individuals.length === 0) {
        document.getElementById('individualsBody').innerHTML =
            '<tr><td colspan="3" style="padding:10px;color:#e11d48;">No individuals loaded. Please go back and select claims.</td></tr>';
        return;
    }

    const { typeName, individuals, claimIds } = sessionData;

    // ── 4. AUTO-FILL CLAIM TYPE ──────────────────────────────────────────────────
    const typeLower = (typeName || '').toLowerCase();
    let subClaimString  = typeName + ' claim';
    let bodyClaimString = typeName + ' claim';

    if (typeLower.includes('medical')) {
        subClaimString  = 'Medical claim';
        bodyClaimString = 'Medical reimbursement claim';
    } else if (typeLower.includes('ltc final')) {
        subClaimString = bodyClaimString = 'LTC Final claim';
    } else if (typeLower.includes('ltc intimation')) {
        subClaimString = bodyClaimString = 'LTC Intimation';
    } else if (typeLower.includes('temporary duty') || typeLower.includes('td claim')) {
        subClaimString = bodyClaimString = 'Temporary Duty claim';
    } else if (typeLower.includes('newspaper')) {
        subClaimString = bodyClaimString = 'Newspaper bill';
    } else {
        let clean = typeName.replace(/claim/i, '').trim();
        subClaimString = bodyClaimString = clean + ' claim';
    }

    document.getElementById('subClaimType').textContent  = subClaimString;
    document.getElementById('bodyClaimType').textContent = bodyClaimString;

    // Two-way sync between sub and body claim type
    function wireText(srcId, dstId) {
        const src = document.getElementById(srcId);
        const dst = document.getElementById(dstId);
        if (!src || !dst) return;
        src.addEventListener('input', () => { dst.textContent = src.textContent; });
        dst.addEventListener('input', () => { src.textContent = dst.textContent; });
    }
    wireText('subClaimType', 'bodyClaimType');

    // ── Fetch claim-type-specific ref no and override fwdRefNo if set ────────
    if (claimIds && claimIds.length > 0) {
        // We need the type_id — fetch it from the first claim
        try {
            const claimRes = await fetch(`/api/admin/claims`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (claimRes.ok) {
                const allClaims = await claimRes.json();
                const firstClaim = allClaims.find(c => String(c.id) === String(claimIds[0]));
                if (firstClaim && firstClaim.type_id) {
                    const refRes = await fetch(`/api/admin/claim-ref-nos/${firstClaim.type_id}/current`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (refRes.ok) {
                        const refData = await refRes.json();
                        if (refData && refData.ref_no) {
                            const refEl = document.getElementById('fwdRefNo');
                            if (refEl) refEl.textContent = refData.ref_no;
                        }
                    }
                }
            }
        } catch (e) { console.warn('Could not fetch claim-type ref no', e); }
    }


    // ── 5. POPULATE TABLE ────────────────────────────────────────────────────────
    const tbody = document.getElementById('individualsBody');
    tbody.innerHTML = individuals.map((person, idx) => {
        const salutation = (person.gender && person.gender.toLowerCase() === 'female') ? 'Smt.' : 'Shri.';
        const desigPno = (person.desig || '') + (person.desig && person.pno ? '/' : '') + (person.pno || '');
        return `<tr>
            <td style="border:1px solid #333; padding:5px 8px;">${idx + 1}.</td>
            <td style="border:1px solid #333; padding:5px 8px;">${salutation} ${person.name},</td>
            <td style="border:1px solid #333; padding:5px 8px;">${desigPno}</td>
        </tr>`;
    }).join('');

    // ── 6. BUILD SNAPSHOT HTML ───────────────────────────────────────────────────
    function formatDate(val) {
        if (!val) return '';
        var p = val.split('-');
        var m = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December'];
        return p[2] + ' ' + m[parseInt(p[1], 10) - 1] + ' ' + p[0];
    }

    function buildBody() {
        const claimType     = document.getElementById('subClaimType').textContent.trim();
        const bodyClaimType = document.getElementById('bodyClaimType').textContent.trim();
        const date          = formatDate(document.getElementById('letterDate').value);
        const oName         = document.getElementById('officeName').textContent.trim();
        const oAddr         = document.getElementById('officeAddress').textContent.trim();
        const oSub          = document.getElementById('officeSubAddr').textContent.trim();
        const oCity         = document.getElementById('officeCityPin').textContent.trim();
        const oPhone        = document.getElementById('officePhone').textContent.trim();
        const oEmail        = document.getElementById('officeEmail').textContent.trim();
        const oRef          = document.getElementById('fwdRefNo').textContent.trim();
        const oSigName      = document.getElementById('signatoryName').textContent.trim();
        const oSigDept      = document.getElementById('signatoryDept').textContent.trim();
        const logoLeftSrc   = document.getElementById('logoLeft')  ? document.getElementById('logoLeft').src  : '';
        const logoRightSrc  = document.getElementById('logoRight') ? document.getElementById('logoRight').src : '';

        const rows = individuals.map((person, idx) => {
            const salutation = (person.gender && person.gender.toLowerCase() === 'female') ? 'Smt.' : 'Shri.';
            const desigPno = (person.desig || '') + (person.desig && person.pno ? '/' : '') + (person.pno || '');
            return `<tr>
                <td style="border:1px solid #333; padding:5px 8px;">${idx + 1}.</td>
                <td style="border:1px solid #333; padding:5px 8px;">${salutation} ${person.name},</td>
                <td style="border:1px solid #333; padding:5px 8px;">${desigPno}</td>
            </tr>`;
        }).join('');

        return `
        <div class="fwd-letterhead">
          <div class="fwd-lh-img"><img src="${logoLeftSrc}" alt="Emblem"></div>
          <div class="fwd-lh-center">
            <div class="fwd-lh-title">${oName}</div>
            <div class="fwd-lh-sub">${oAddr}</div>
            ${oSub  ? `<div class="fwd-lh-sub">${oSub}</div>` : ''}
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
          Sub : Submission of ${claimType} &ndash; Reg.
        </div>
        <div class="fwd-divider">&lt;&lt;&lt;&gt;&gt;&gt;</div>
        <div class="fwd-body-para">
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${bodyClaimType} in r/o of the individuals mentioned below is forwarded herewith for further necessary action at your end please:
        </div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:30px; font-size:13px;">
          <thead>
            <tr>
              <th style="border:1px solid #333; padding:6px 8px; background:#f9f9f9; width:8%;">Sr. No.</th>
              <th style="border:1px solid #333; padding:6px 8px; background:#f9f9f9; width:52%;">Name</th>
              <th style="border:1px solid #333; padding:6px 8px; background:#f9f9f9; width:40%;">Post/Personal Number</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="fwd-sig-block">${oSigName}<br>${oSigDept}</div>
        `;
    }

    // ── 7. SAVE & PREVIEW ────────────────────────────────────────────────────────
    document.getElementById('btnPreview').addEventListener('click', async () => {
        const content = buildBody();
        const htmlToSave = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Multi-Forwarding Note</title><link rel="stylesheet" href="/assets/style.css"><style>body { padding:28px 36px 40px !important; background: #fff; }</style></head><body>${content}</body></html>`;

        // Save to all selected individuals
        try {
            const res = await fetch('/api/admin/claims/multi-fwd-note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ claimIds, htmlContent: htmlToSave })
            });

            if (res.ok) {
                document.getElementById('previewContent').innerHTML = content;
                document.getElementById('previewModal').classList.add('active');
                document.body.classList.add('modal-active');
                sessionStorage.removeItem('multiFwdNote'); // clean up
            } else {
                alert('Error saving forwarding note to server.');
            }
        } catch(err) {
            alert('Network error while saving forwarding note.');
            console.error(err);
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
