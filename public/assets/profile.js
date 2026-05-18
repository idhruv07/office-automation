document.addEventListener('DOMContentLoaded', async () => {
            const token = localStorage.getItem('token');
            if (!token) { window.location.href = '/'; return; }

            // ── Relationship → fruit CSS class ─────────────────────────────
            function fruitClass(rel) {
                const r = (rel || '').toLowerCase();
                if (r.includes('spouse') || r.includes('wife') || r.includes('husband')) return 'spouse-fruit';
                if (r.includes('son'))      return 'son-fruit';
                if (r.includes('daughter')) return 'daughter-fruit';
                if (r.includes('father') || r.includes('mother')) return 'parent-fruit';
                return '';
            }

            // ── Build a single fruit <li> ───────────────────────────────────
            function buildFruitLi(dep) {
                const fc = fruitClass(dep.relationship);
                const dobDisplay = dep.dob ? new Date(dep.dob).toLocaleDateString('en-IN') : '—';
                const dobValue   = dep.dob ? dep.dob.substring(0, 10) : '';

                const li = document.createElement('li');
                li.dataset.depId = dep.id;
                li.innerHTML = `
                    <div class="fruit-card family-tree-node ${fc}" style="min-width: 155px; padding: 14px 12px 12px; position: relative;">

                        <!-- ── VIEW MODE ── -->
                        <div class="fruit-view">
                            <div style="font-weight:800;color:rgba(255,255,255,0.7);font-size:8px;text-transform:uppercase;margin-bottom:3px;letter-spacing:0.06em;">Dependent</div>
                            <div class="fruit-name" style="font-weight:700;font-size:13px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.25);">${dep.name}</div>
                            <div class="fruit-rel" style="font-size:10px;font-weight:600;margin-top:2px;color:rgba(255,255,255,0.85);">${dep.relationship}</div>
                            <div class="fruit-dob" style="font-size:9px;margin-top:1px;color:rgba(255,255,255,0.7);">${dobDisplay}</div>
                            <div style="margin-top:10px;display:flex;justify-content:center;gap:8px;">
                                <button type="button" class="fruit-edit-btn" title="Edit" style="
                                    border:none;background:rgba(255,255,255,0.25);backdrop-filter:blur(4px);
                                    color:#fff;border-radius:8px;padding:4px 10px;font-size:11px;
                                    cursor:pointer;font-weight:600;transition:background 0.2s;
                                ">✎ Edit</button>
                                <button type="button" class="fruit-del-btn" title="Delete" style="
                                    border:none;background:rgba(0,0,0,0.2);backdrop-filter:blur(4px);
                                    color:#fff;border-radius:8px;padding:4px 10px;font-size:11px;
                                    cursor:pointer;font-weight:600;transition:background 0.2s;
                                ">✕</button>
                            </div>
                        </div>

                        <!-- ── EDIT MODE (hidden by default) ── -->
                        <div class="fruit-edit-mode" style="display:none; background:rgba(255,255,255,0.92); border-radius:16px; padding:12px 10px; margin-top:4px; backdrop-filter:blur(8px);">
                            <div style="font-size:8px;font-weight:800;color:#4f46e5;text-transform:uppercase;margin-bottom:8px;letter-spacing:0.06em;">✎ Edit Dependent</div>
                            <input type="text" class="fruit-edit-name" value="${dep.name}" placeholder="Name" style="
                                width:100%;border:none;border-bottom:1.5px solid #cbd5e1;
                                background:transparent;color:#1e293b;font-size:12px;font-weight:700;
                                padding:2px 0 5px;margin-bottom:7px;outline:none;box-sizing:border-box;
                            ">
                            <select class="fruit-edit-rel" style="
                                width:100%;border:none;border-bottom:1.5px solid #cbd5e1;
                                background:transparent;color:#1e293b;font-size:11px;
                                padding:2px 0 5px;margin-bottom:7px;outline:none;cursor:pointer;
                                appearance:none;-webkit-appearance:none;
                            ">
                                ${['Spouse','Husband','Wife','Son','Daughter','Father','Mother','Brother','Sister','Father-in-law','Mother-in-law']
                                    .map(r => `<option value="${r}" ${r === dep.relationship ? 'selected' : ''} style="color:#1e293b;">${r}</option>`).join('')}
                            </select>
                            <input type="text" class="fruit-edit-cghs" value="${dep.cghs_ben_id || ''}" placeholder="CGHS ID (optional)" style="
                                width:100%;border:none;border-bottom:1.5px solid #cbd5e1;
                                background:transparent;color:#1e293b;font-size:11px;
                                padding:2px 0 5px;margin-bottom:7px;outline:none;box-sizing:border-box;
                            ">
                            <input type="date" class="fruit-edit-dob" value="${dobValue}" style="
                                width:100%;border:none;border-bottom:1.5px solid #cbd5e1;
                                background:transparent;color:#1e293b;font-size:11px;
                                padding:2px 0 5px;margin-bottom:10px;outline:none;box-sizing:border-box;
                            ">
                            <div style="display:flex;gap:6px;justify-content:center;">
                                <button type="button" class="fruit-save-btn" style="
                                    border:none;background:#4f46e5;color:#fff;
                                    border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;
                                    cursor:pointer;flex:1;
                                ">✓ Save</button>
                                <button type="button" class="fruit-cancel-btn" style="
                                    border:none;background:#e2e8f0;color:#475569;
                                    border-radius:8px;padding:5px 10px;font-size:11px;font-weight:600;
                                    cursor:pointer;
                                ">✕</button>
                            </div>
                        </div>

                    </div>
                `;

                const card    = li.querySelector('.fruit-card');
                const viewEl  = li.querySelector('.fruit-view');
                const editEl  = li.querySelector('.fruit-edit-mode');

                // Edit button → flip to edit mode
                li.querySelector('.fruit-edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    viewEl.style.display = 'none';
                    editEl.style.display = 'block';
                    card.style.transform = 'none'; // disable hover lift while editing
                });

                // Cancel → flip back to view mode
                li.querySelector('.fruit-cancel-btn').addEventListener('click', () => {
                    editEl.style.display = 'none';
                    viewEl.style.display = 'block';
                });

                // Save → call API, refresh
                li.querySelector('.fruit-save-btn').addEventListener('click', async () => {
                    const saveBtn = li.querySelector('.fruit-save-btn');
                    saveBtn.textContent = '…';
                    saveBtn.disabled = true;
                    const payload = {
                        id:           dep.id,
                        name:         li.querySelector('.fruit-edit-name').value.trim(),
                        relationship: li.querySelector('.fruit-edit-rel').value,
                        cghs_ben_id:  li.querySelector('.fruit-edit-cghs').value.trim(),
                        dob:          li.querySelector('.fruit-edit-dob').value
                    };
                    try {
                        const res = await fetch('/api/auth/dependents', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify(payload)
                        });
                        if (res.ok) {
                            loadProfile();
                        } else {
                            saveBtn.textContent = '✓ Save';
                            saveBtn.disabled = false;
                            alert('Error saving. Please try again.');
                        }
                    } catch {
                        saveBtn.textContent = '✓ Save';
                        saveBtn.disabled = false;
                        alert('Network error.');
                    }
                });

                // Delete → inline confirmation
                li.querySelector('.fruit-del-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const delBtn = li.querySelector('.fruit-del-btn');
                    if (delBtn.dataset.confirming === 'true') {
                        // Second click — confirmed, do delete
                        delBtn.textContent = '…';
                        delBtn.disabled = true;
                        try {
                            const res = await fetch(`/api/auth/dependents/${dep.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (res.ok) { loadProfile(); }
                            else { alert('Error deleting.'); delBtn.textContent = '✕'; delBtn.disabled = false; }
                        } catch { alert('Network error.'); delBtn.textContent = '✕'; delBtn.disabled = false; }
                    } else {
                        // First click — ask for confirmation inline
                        delBtn.dataset.confirming = 'true';
                        delBtn.textContent = 'Sure?';
                        delBtn.style.background = 'rgba(239,68,68,0.5)';
                        setTimeout(() => {
                            if (delBtn.dataset.confirming === 'true') {
                                delBtn.dataset.confirming = '';
                                delBtn.textContent = '✕';
                                delBtn.style.background = 'rgba(0,0,0,0.2)';
                            }
                        }, 2500);
                    }
                });

                return li;
            }

            async function loadProfile() {
                try {
                    const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
                    const user = await res.json();
                    
                    document.getElementById('prof_name').value = user.name || '';
                    document.getElementById('prof_personal_no').value = user.personal_no || '';
                    document.getElementById('prof_email').value = user.email || '';
                    document.getElementById('prof_mobile_no').value = user.mobile_no || '';
                    document.getElementById('prof_address').value = user.address || '';
                    document.getElementById('prof_cghs_ben_id').value = user.cghs_ben_id || '';
                    document.getElementById('prof_pay_level').value = user.pay_level || '';
                    document.getElementById('prof_basic_pay').value = user.basic_pay || '';
                    document.getElementById('prof_gpf_ac_no').value = user.gpf_ac_no || '';

                    // ── Populate identity card chips ──
                    const setChip = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
                    setChip('hero-name', user.name);
                    setChip('hero-personal-no', user.personal_no ? `Personal No: ${user.personal_no}` : '');
                    setChip('chip-email', user.email);
                    setChip('chip-mobile', user.mobile_no);
                    setChip('chip-cghs', user.cghs_ben_id);
                    setChip('chip-pay', user.pay_level && user.basic_pay ? `L-${user.pay_level} / ₹${user.basic_pay}` : (user.pay_level || user.basic_pay || '—'));
                    setChip('chip-gpf', user.gpf_ac_no);
                    setChip('chip-address', user.address);
                    if (user.avatar_url) {
                        const avatarImg = document.getElementById('profile-avatar');
                        if (avatarImg) avatarImg.src = user.avatar_url;
                    }

                    const tbody = document.getElementById('dependents-table');
                    tbody.innerHTML = '';
                    
                    const treeList = document.getElementById('dependents-tree-list');
                    if (treeList) {
                        treeList.innerHTML = '';
                        document.getElementById('tree_self_name').textContent = user.name || 'Claimant';
                    }

                    if (user.dependents && user.dependents.length > 0) {
                        user.dependents.forEach(dep => {
                            // Populate Table Row
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${dep.name}</td>
                                <td>${dep.relationship}</td>
                                <td>${dep.cghs_ben_id || '-'}</td>
                                <td>${dep.dob ? new Date(dep.dob).toLocaleDateString() : '-'}</td>
                                <td>
                                    <button type="button" class="btn-small" onclick='editDependent(${JSON.stringify(dep)})'>Edit</button>
                                    <button type="button" class="btn-small btn-danger" onclick="deleteDependent(${dep.id})">Delete</button>
                                </td>
                            `;
                            tbody.appendChild(tr);

                            // Populate fruit tree node with inline edit/delete
                            if (treeList) {
                                treeList.appendChild(buildFruitLi(dep));
                            }
                        });
                    } else {
                        tbody.innerHTML = '<tr><td colspan="5">No dependents added.</td></tr>';
                    }
                } catch (e) {
                    console.error(e);
                }
            }




            // ── Identity card Edit toggle ──────────────────────────────────
            const editToggleBtn  = document.getElementById('profile-edit-toggle');
            const editPanel      = document.getElementById('profile-edit-panel');
            const editCancelBtn  = document.getElementById('profile-edit-cancel');

            if (editToggleBtn && editPanel) {
                editToggleBtn.addEventListener('click', () => {
                    const open = editPanel.style.display !== 'none';
                    editPanel.style.display = open ? 'none' : 'block';
                    editToggleBtn.textContent = open ? '✎ \u00a0Edit Details' : '✕ \u00a0Close Editor';
                });
            }

            if (editCancelBtn && editPanel) {
                editCancelBtn.addEventListener('click', () => {
                    editPanel.style.display = 'none';
                    if (editToggleBtn) editToggleBtn.textContent = '✎ \u00a0Edit Details';
                });
            }

            document.getElementById('profile-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const statusMsg = document.getElementById('profile-status-message');
                const submitBtn = e.target.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn ? submitBtn.innerHTML : '✓ Save Changes';
                
                if (submitBtn) { submitBtn.innerHTML = '⏳ Saving...'; submitBtn.disabled = true; }
                if (statusMsg) {
                    statusMsg.className = 'hidden';
                    statusMsg.textContent = '';
                }

                try {
                    const data = {
                        email: document.getElementById('prof_email').value,
                        mobile_no: document.getElementById('prof_mobile_no').value,
                        address: document.getElementById('prof_address').value,
                        cghs_ben_id: document.getElementById('prof_cghs_ben_id').value,
                        pay_level: document.getElementById('prof_pay_level').value,
                        basic_pay: document.getElementById('prof_basic_pay').value,
                        gpf_ac_no: document.getElementById('prof_gpf_ac_no').value
                    };
                    const res = await fetch('/api/auth/profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(data)
                    });

                    if (submitBtn) { submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false; }

                    if (res.ok) {
                        // Close panel and refresh
                        const editPanel = document.getElementById('profile-edit-panel');
                        const editToggleBtn = document.getElementById('profile-edit-toggle');
                        if (editPanel) editPanel.style.display = 'none';
                        if (editToggleBtn) editToggleBtn.textContent = '✎ \u00a0Edit Details';
                        
                        // Show custom success modal with user's attached meme image
                        let modal = document.getElementById('custom-success-modal');
                        if (!modal) {
                            modal = document.createElement('div');
                            modal.id = 'custom-success-modal';
                            modal.className = 'save-modal-overlay';
                            modal.style.cssText = `
                                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                                background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(8px);
                                display: flex; align-items: center; justify-content: center;
                                z-index: 9999; opacity: 0; transition: opacity 0.3s ease;
                            `;
                            modal.innerHTML = `
                                <div class="save-modal-content" style="
                                    background: white; padding: 32px; border-radius: 24px;
                                    text-align: center; max-width: 400px; width: 90%;
                                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                                    transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                                ">
                                    <div style="width: 72px; height: 72px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <h2 id="custom-modal-title" style="margin: 0 0 12px; color: #1e293b; font-size: 24px; font-weight: 800;">Profile Updated</h2>
                                    <p id="custom-modal-desc" style="color: #64748b; margin: 0 0 24px; font-size: 15px; line-height: 1.5;">Your personal details were saved successfully.</p>
                                    
                                    <div style="background: #f8fafc; border-radius: 16px; padding: 12px; margin-bottom: 24px; border: 2px dashed #cbd5e1;">
                                        <img id="custom-modal-img" src="/assets/profile_dp_joke.png" alt="Profile Joke" style="max-width: 100%; border-radius: 12px;">
                                    </div>

                                    <button id="custom-modal-close" style="
                                        background: #4f46e5; color: white; border: none;
                                        padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 16px;
                                        cursor: pointer; width: 100%; transition: background 0.2s;
                                    ">Got it, thanks!</button>
                                </div>
                            `;
                            document.body.appendChild(modal);

                            document.getElementById('custom-modal-close').onclick = () => {
                                modal.style.opacity = '0';
                                modal.querySelector('.save-modal-content').style.transform = 'scale(0.9)';
                                setTimeout(() => modal.style.setProperty('display', 'none', 'important'), 300);
                            };
                        }
                        
                        modal.style.setProperty('display', 'flex', 'important');
                        // Small delay to trigger animation
                        setTimeout(() => {
                            modal.style.opacity = '1';
                            modal.querySelector('.save-modal-content').style.transform = 'scale(1)';
                        }, 10);
                        
                        loadProfile();
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        const errMsg = errData.message || 'Error updating profile';
                        if (statusMsg) {
                            statusMsg.textContent = errMsg;
                            statusMsg.style.background = '#fee2e2';
                            statusMsg.style.color = '#b91c1c';
                            statusMsg.style.border = '1px solid #fecaca';
                            statusMsg.className = '';
                        }
                    }
                } catch (err) {
                    console.error('Failed to update profile:', err);
                    if (submitBtn) { submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false; }
                    if (statusMsg) {
                        statusMsg.textContent = 'Network error. Please try again.';
                        statusMsg.style.background = '#fee2e2';
                        statusMsg.style.color = '#b91c1c';
                        statusMsg.style.border = '1px solid #fecaca';
                        statusMsg.className = '';
                    }
                }
            });

            document.getElementById('dependent-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    id: document.getElementById('dep_id').value,
                    name: document.getElementById('dep_name').value,
                    relationship: document.getElementById('dep_relationship').value,
                    cghs_ben_id: document.getElementById('dep_cghs_id').value,
                    dob: document.getElementById('dep_dob').value
                };
                const res = await fetch('/api/auth/dependents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    alert('Dependent saved');
                    document.getElementById('dependent-form').reset();
                    document.getElementById('dep_id').value = '';
                    document.getElementById('btn-cancel-dep').style.display = 'none';
                    loadProfile();
                } else alert('Error saving dependent');
            });

            document.getElementById('btn-cancel-dep').addEventListener('click', () => {
                document.getElementById('dependent-form').reset();
                document.getElementById('dep_id').value = '';
                document.getElementById('btn-cancel-dep').style.display = 'none';
            });

            window.editDependent = function(dep) {
                document.getElementById('dep_id').value = dep.id;
                document.getElementById('dep_name').value = dep.name;
                document.getElementById('dep_relationship').value = dep.relationship;
                document.getElementById('dep_cghs_id').value = dep.cghs_ben_id || '';
                document.getElementById('dep_dob').value = dep.dob ? dep.dob.substring(0, 10) : '';
                document.getElementById('btn-cancel-dep').style.display = 'inline-block';
            };

            window.deleteDependent = async function(id) {
                if (!confirm('Are you sure?')) return;
                const res = await fetch(`/api/auth/dependents/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) loadProfile();
                else alert('Error deleting dependent');
            };

            const avatarInput = document.getElementById('avatar-input');
            const avatarStatus = document.getElementById('avatar-status');
            if (avatarInput) {
                avatarInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append('avatar', file);

                    avatarStatus.textContent = 'Uploading...';
                    avatarStatus.classList.remove('hidden');
                    avatarStatus.style.color = 'var(--text-muted)';

                    try {
                        const res = await fetch('/api/auth/avatar', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData
                        });

                        if (res.ok) {
                            avatarStatus.textContent = 'Upload successful!';
                            avatarStatus.style.color = 'var(--success-color)';
                            
                            // Refresh avatars seamlessly
                            const avatarUrl = URL.createObjectURL(file);
                            const profileAvatar = document.getElementById('profile-avatar');
                            const footerAvatar = document.getElementById('footer-avatar');
                            const sidebarAvatar = document.getElementById('sidebar-avatar');
                            if (profileAvatar) profileAvatar.src = avatarUrl;
                            if (footerAvatar) {
                                footerAvatar.src = avatarUrl;
                                footerAvatar.style.display = 'block';
                            }
                            if (sidebarAvatar) {
                                sidebarAvatar.src = avatarUrl;
                            }
                            
                            setTimeout(() => avatarStatus.classList.add('hidden'), 3000);
                        } else {
                            throw new Error('Upload failed');
                        }
                    } catch (err) {
                        avatarStatus.textContent = 'Failed to upload photo.';
                        avatarStatus.style.color = 'var(--danger-color)';
                    }
                });
            }

            loadProfile();
        });