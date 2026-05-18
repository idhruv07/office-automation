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

                    const tbody = document.getElementById('dependents-table');
                    tbody.innerHTML = '';
                    if (user.dependents && user.dependents.length > 0) {
                        user.dependents.forEach(dep => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${dep.name}</td>
                                <td>${dep.relationship}</td>
                                <td>${dep.cghs_ben_id || '-'}</td>
                                <td>${dep.dob ? new Date(dep.dob).toLocaleDateString() : '-'}</td>
                                <td>
                                    <button type="button" class="btn-small" onclick='editDependent(${JSON.stringify(dep)})'>Edit</button>
                                    <button type="button" class="btn-small" style="background:#dc3545;" onclick="deleteDependent(${dep.id})">Del</button>
                                </td>
                            `;
                            tbody.appendChild(tr);
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
                        basic_pay: document.getElementById('prof_basic_pay').value
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

            loadProfile();
        });