document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    // ── Helpers ───────────────────────────────────────────────────────────────
    function showImageModal(title, msg, type) {
        const modal = document.getElementById('ft-success-modal');
        const img = document.getElementById('ft-success-img');
        document.getElementById('ft-success-title').textContent = title;
        document.getElementById('ft-success-msg').textContent = msg;
        
        if (type === 'overwrite') {
            img.src = '/admin/images/overwrite.webp';
        } else {
            img.src = '/admin/images/new.webp';
        }
        
        modal.style.display = 'flex';
    }

    function showToast(msg, ok = true) {
        const el = document.getElementById('ft-toast');
        el.textContent = msg;
        el.style.display = 'block';
        el.style.background = ok ? '#dcfce7' : '#fee2e2';
        el.style.color = ok ? '#15803d' : '#b91c1c';
        setTimeout(() => { el.style.display = 'none'; }, 4000);
    }

    function fmtDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // ── 0. Move modals to body to fix positioning context ─────────────────────
    const viewModal = document.getElementById('ft-view-modal');
    const successModal = document.getElementById('ft-success-modal');
    if (viewModal) document.body.appendChild(viewModal);
    if (successModal) document.body.appendChild(successModal);

    // ── 1. Fetch & inject office config into the letterhead preview ────────────
    let officeConfig = {};
    try {
        const res = await fetch('/api/admin/office-config', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) officeConfig = await res.json();
    } catch (e) { /* use defaults */ }

    const today = new Date();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('ft-date').textContent = today.getDate() + ' ' + months[today.getMonth()] + ' ' + today.getFullYear();

    if (officeConfig.office_name)        document.getElementById('ft-office-name').textContent    = officeConfig.office_name;
    if (officeConfig.office_address)     document.getElementById('ft-office-address').textContent  = officeConfig.office_address;
    if (officeConfig.office_sub_address) document.getElementById('ft-office-sub').textContent      = officeConfig.office_sub_address;
    if (officeConfig.city_state_pin)     document.getElementById('ft-office-city').textContent     = officeConfig.city_state_pin;
    if (officeConfig.phone)              document.getElementById('ft-office-phone').textContent    = 'Phone: ' + officeConfig.phone;
    if (officeConfig.email)              document.getElementById('ft-office-email').textContent    = 'Email: ' + officeConfig.email;
    if (officeConfig.fwd_ref_no)         document.getElementById('ft-fwd-ref').textContent        = officeConfig.fwd_ref_no;
    if (officeConfig.signatory_name)     document.getElementById('ft-sig-name').textContent       = officeConfig.signatory_name;
    if (officeConfig.signatory_dept)     document.getElementById('ft-sig-dept').textContent       = officeConfig.signatory_dept;
    if (officeConfig.logo_left_url)      document.getElementById('ft-logo-left').src              = officeConfig.logo_left_url;
    if (officeConfig.logo_right_url)     document.getElementById('ft-logo-right').src             = officeConfig.logo_right_url;

    // ── 2. Build HTML snapshot ────────────────────────────────────────────────
    function buildHTMLSnapshot() {
        const oName    = document.getElementById('ft-office-name').textContent.trim();
        const oAddr    = document.getElementById('ft-office-address').textContent.trim();
        const oSub     = document.getElementById('ft-office-sub').textContent.trim();
        const oCity    = document.getElementById('ft-office-city').textContent.trim();
        const oPhone   = document.getElementById('ft-office-phone').textContent.trim();
        const oEmail   = document.getElementById('ft-office-email').textContent.trim();
        const oRef     = document.getElementById('ft-fwd-ref').textContent.trim();
        const oSigN    = document.getElementById('ft-sig-name').textContent.trim();
        const oSigD    = document.getElementById('ft-sig-dept').textContent.trim();
        const logoL    = document.getElementById('ft-logo-left').src;
        const logoR    = document.getElementById('ft-logo-right').src;
        const dateStr  = document.getElementById('ft-date').textContent.trim();
        const subject  = document.getElementById('ft-subject').textContent.trim();
        const bodyPara = document.getElementById('ft-body-para').innerHTML;

        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Forwarding Note</title><link rel="stylesheet" href="/assets/style.css"><style>body{padding:28px 36px 40px!important;background:#fff;}</style></head><body>
<div class="fwd-letterhead">
  <div class="fwd-lh-img"><img src="${logoL}" style="height:64px;" alt="Emblem"></div>
  <div class="fwd-lh-center" style="text-align:center;flex:1;">
    <div class="fwd-lh-title">${oName}</div>
    <div class="fwd-lh-sub">${oAddr}</div>
    ${oSub  ? `<div class="fwd-lh-sub">${oSub}</div>`  : ''}
    ${oCity ? `<div class="fwd-lh-sub">${oCity}</div>` : ''}
    ${oEmail ? `<div class="fwd-lh-email">${oEmail}</div>` : ''}
    ${oPhone ? `<div class="fwd-lh-phone">${oPhone}</div>` : ''}
  </div>
  <div class="fwd-lh-img"><img src="${logoR}" style="height:64px;" alt="Logo"></div>
</div>
<div class="fwd-meta-row"><span>No. ${oRef}</span><span>Date: ${dateStr}</span></div>
<div class="fwd-to-block">To<br>The Officer in charge<br>Admin-Pay<br>O/o the CDA Secunderabad<br>No. 1 Staff Road, Secunderabad-09</div>
<div class="fwd-sub-block">Sub : <span class="fwd-subject-inner">${subject}</span></div>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:0.75rem 0;">
<div class="fwd-body-para">${bodyPara}</div>
<div class="fwd-sig-block">${oSigN}<br>${oSigD}</div>
</body></html>`;
    }

    // ── 3. Save template ──────────────────────────────────────────────────────
    async function saveTemplate(isNew) {
        const name = document.getElementById('ft-name').value.trim();
        if (!name) { showToast('✗ Template name is required.', false); return; }
        
        let templateId = document.getElementById('ft-id').value;
        if (isNew) templateId = ''; // Save as New clears the ID

        const isOverwrite = !!templateId;

        const bodyData = {
            template_name: name,
            folder_name: document.getElementById('ft-folder').value.trim(),
            description: document.getElementById('ft-desc').value.trim(),
            htmlContent: buildHTMLSnapshot()
        };
        if (isOverwrite) bodyData.template_id = templateId;

        try {
            const res = await fetch('/api/admin/fwd-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(bodyData)
            });
            const data = await res.json();
            if (res.ok) {
                showImageModal('Success', data.message, isOverwrite ? 'overwrite' : 'new');
                resetForm();
                loadTemplates();
            } else {
                showToast('✗ ' + (data.message || 'Error saving.'), false);
            }
        } catch (e) {
            showToast('✗ Network error.', false);
        }
    }

    document.getElementById('ft-save-btn').addEventListener('click', () => saveTemplate(false));
    document.getElementById('ft-save-new-btn').addEventListener('click', () => saveTemplate(true));

    // ── 4. Clear form ─────────────────────────────────────────────────────────
    function resetForm() {
        document.getElementById('ft-id').value = '';
        document.getElementById('ft-name').value = '';
        document.getElementById('ft-folder').value = '';
        document.getElementById('ft-desc').value = '';
        document.getElementById('ft-subject').textContent = 'Medical claim in r/o [Name] – Reg.';
        document.getElementById('ft-body-para').innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Medical reimbursement claim in r/o [Name], [Designation]/[Personal No.] is forwarded herewith for further necessary action at your end please.';
        document.getElementById('ft-form-title').textContent = 'Compose New Template';
        document.getElementById('ft-save-btn').textContent = 'Save Template';
        document.getElementById('ft-save-new-btn').style.display = 'none';
    }

    document.getElementById('ft-clear-btn').addEventListener('click', resetForm);

    // ── 5. Load and render templates list ────────────────────────────────────
    let cachedTemplates = [];

    async function loadTemplates() {
        const container = document.getElementById('ft-list-container');
        container.innerHTML = '<p style="color:var(--text-muted);">Loading…</p>';
        try {
            const res = await fetch('/api/admin/fwd-templates', { headers: { 'Authorization': `Bearer ${token}` } });
            cachedTemplates = await res.json();
            const templates = cachedTemplates;
            document.getElementById('ft-count').textContent = templates.length + ' template' + (templates.length !== 1 ? 's' : '');

            if (!templates.length) {
                container.innerHTML = '<p style="color:var(--text-muted); padding: 1rem 0;">No templates saved yet.</p>';
                return;
            }

            // Populate datalist with unique folders
            const uniqueFolders = new Set(templates.map(t => t.folder_name).filter(Boolean));
            document.getElementById('ft-folder-list').innerHTML = Array.from(uniqueFolders).map(f => `<option value="${f}">`).join('');

            // Group templates by folder
            const foldersMap = {};
            templates.forEach(t => {
                const fn = t.folder_name || 'General';
                if(!foldersMap[fn]) foldersMap[fn] = [];
                foldersMap[fn].push(t);
            });

            // Build grouped HTML structure
            let htmlStr = '';
            // Sort folder names alphabetically
            const sortedFolders = Object.keys(foldersMap).sort();
            
            for(const folder of sortedFolders) {
                const items = foldersMap[folder];
                const rows = items.map(t => `
                    <tr>
                        <td style="font-weight:600;">${t.template_name}</td>
                        <td style="color:var(--text-muted); font-size:0.875rem;">${t.description || '—'}</td>
                        <td style="color:var(--text-muted); font-size:0.875rem;">${fmtDate(t.created_at)}</td>
                        <td style="white-space:nowrap; text-align:right;">
                            <button class="btn-small" data-view="${t.id}" style="margin-right:4px;">👁 View</button>
                            <button class="btn-small" data-edit="${t.id}" style="margin-right:4px; background:var(--secondary-color); color:#fff; border:none;">✏️ Edit</button>
                            <button class="btn-small btn-danger" data-delete="${t.id}">✕</button>
                        </td>
                    </tr>`).join('');

                htmlStr += `
                    <div style="margin-bottom: 2rem; background: #fafafa; border-radius: 8px; padding: 1rem; border: 1px solid var(--border-color);">
                        <h3 style="display:flex; align-items:center; gap:0.5rem; margin-top: 0; margin-bottom: 0.75rem; color: #1e293b; font-size: 1.1rem;">
                            <span style="font-size:1.25rem;">📁</span> ${folder}
                            <span style="font-size:0.75rem; background:#e2e8f0; padding:0.15rem 0.5rem; border-radius:12px; color:#475569; font-weight:normal;">${items.length} items</span>
                        </h3>
                        <div class="table-container" style="background: #fff; margin:0; border-radius: 6px;">
                            <table style="margin:0;">
                                <thead><tr>
                                    <th>Template Name</th>
                                    <th>Description</th>
                                    <th>Date</th>
                                    <th style="text-align:right;">Actions</th>
                                </tr></thead>
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = htmlStr;

            // View button
            container.querySelectorAll('[data-view]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.view;
                    try {
                        const r = await fetch(`/api/admin/fwd-templates/${id}/file`, { headers: { 'Authorization': `Bearer ${token}` } });
                        const html = await r.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        document.getElementById('ft-modal-body').innerHTML = doc.body.innerHTML;
                        document.getElementById('ft-view-modal').style.display = 'block';
                    } catch (e) {
                        alert('Could not load template file.');
                    }
                });
            });

            // Edit button
            container.querySelectorAll('[data-edit]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.edit;
                    const t = cachedTemplates.find(x => x.id == id);
                    if(!t) return;
                    
                    try {
                        // Fetch html to extract body
                        const r = await fetch(`/api/admin/fwd-templates/${id}/file`, { headers: { 'Authorization': `Bearer ${token}` } });
                        const html = await r.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        
                        const subBlock = doc.querySelector('.fwd-subject-inner');
                        const bodyPara = doc.querySelector('.fwd-body-para');
                        
                        if(subBlock) document.getElementById('ft-subject').innerHTML = subBlock.innerHTML;
                        else if(doc.querySelector('.fwd-sub-block')) {
                           let text = doc.querySelector('.fwd-sub-block').textContent;
                           document.getElementById('ft-subject').textContent = text.replace(/^Sub\s*:\s*/, '');
                        }
                        
                        if(bodyPara) document.getElementById('ft-body-para').innerHTML = bodyPara.innerHTML;

                        // Set form fields
                        document.getElementById('ft-id').value = t.id;
                        document.getElementById('ft-name').value = t.template_name;
                        document.getElementById('ft-folder').value = t.folder_name || '';
                        document.getElementById('ft-desc').value = t.description || '';
                        
                        document.getElementById('ft-form-title').textContent = 'Editing Template: ' + t.template_name;
                        document.getElementById('ft-save-btn').textContent = 'Overwrite';
                        document.getElementById('ft-save-new-btn').style.display = 'inline-block';
                        
                        // Scroll to top
                        window.scrollTo({ top: 0, behavior: 'smooth' });

                    } catch(e) {
                        showToast('✗ Error loading template into editor.', false);
                    }
                });
            });

            // Delete button
            container.querySelectorAll('[data-delete]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('Delete this template? This cannot be undone.')) return;
                    const id = btn.dataset.delete;
                    try {
                        const r = await fetch(`/api/admin/fwd-templates/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await r.json();
                        if (r.ok) { showToast('✓ ' + data.message, true); loadTemplates(); }
                        else showToast('✗ ' + (data.message || 'Error deleting.'), false);
                    } catch (e) {
                        showToast('✗ Network error.', false);
                    }
                });
            });

        } catch (e) {
            container.innerHTML = '<p style="color:red;">Failed to load templates.</p>';
            console.error(e);
        }
    }

    // ── 6. Modal close ────────────────────────────────────────────────────────
    document.getElementById('ft-close-modal').addEventListener('click', () => {
        document.getElementById('ft-view-modal').style.display = 'none';
        document.getElementById('ft-modal-body').innerHTML = '';
    });
    document.getElementById('ft-view-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('ft-view-modal')) {
            document.getElementById('ft-view-modal').style.display = 'none';
        }
    });

    loadTemplates();
});
