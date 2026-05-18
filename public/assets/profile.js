document.addEventListener('DOMContentLoaded', async () => {
            const token = localStorage.getItem('token');
            if (!token) { window.location.href = '/'; return; }

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

                            // Populate Family Tree Node
                            if (treeList) {
                                const li = document.createElement('li');
                                li.innerHTML = `
                                    <div class="family-tree-node" style="min-width: 130px; padding: 12px 10px;">
                                        <div style="font-weight: 800; color: #64748b; font-size: 8px; text-transform: uppercase; margin-bottom: 2px;">Dependent</div>
                                        <div style="font-weight: 700; font-size: 12px; color: #1e293b;">${dep.name}</div>
                                        <div style="color: var(--primary-color, #4f46e5); font-size: 10px; font-weight: 600; margin-top: 2px;">${dep.relationship}</div>
                                        <div style="margin-top: 8px; display: flex; justify-content: center; gap: 8px;">
                                            <button type="button" style="border: none; background: #f1f5f9; color: #475569; border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick='editDependent(${JSON.stringify(dep)})'>✎</button>
                                            <button type="button" style="border: none; background: #fee2e2; color: #ef4444; border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="deleteDependent(${dep.id})">✕</button>
                                        </div>
                                    </div>
                                `;
                                treeList.appendChild(li);
                            }
                        });
                    } else {
                        tbody.innerHTML = '<tr><td colspan="5">No dependents added.</td></tr>';
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            document.getElementById('profile-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const statusMsg = document.getElementById('profile-status-message');
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

                    if (res.ok) {
                        if (statusMsg) {
                            statusMsg.textContent = 'Profile updated successfully!';
                            statusMsg.style.background = '#dcfce7';
                            statusMsg.style.color = '#15803d';
                            statusMsg.style.border = '1px solid #bbf7d0';
                            statusMsg.className = '';
                        }
                        alert('Profile updated');
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
                        alert(errMsg);
                    }
                } catch (err) {
                    console.error('Failed to update profile:', err);
                    if (statusMsg) {
                        statusMsg.textContent = 'Network error. Please try again.';
                        statusMsg.style.background = '#fee2e2';
                        statusMsg.style.color = '#b91c1c';
                        statusMsg.style.border = '1px solid #fecaca';
                        statusMsg.className = '';
                    }
                    alert('Network error. Please try again.');
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