document.addEventListener('DOMContentLoaded', () => {
            const token = localStorage.getItem('token');
            const tbody = document.getElementById('types-table-body');

            async function loadTypes() {
                try {
                    const res = await fetch('/api/admin/claim-types', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const types = await res.json();
                    
                    if (types.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5">No types found.</td></tr>';
                        return;
                    }

                    tbody.innerHTML = types.map(t => `
                        <tr>
                            <td>${t.id}</td>
                            <td>${t.name}</td>
                            <td>${t.folder_name}</td>
                            <td><strong>${t.is_active ? 'Active' : 'Hidden'}</strong></td>
                            <td>
                                <button class="btn-sm" style="background: ${t.is_active ? '#6c757d' : '#28a745'};" onclick="toggleStatus(${t.id})">
                                    ${t.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                            </td>
                        </tr>
                    `).join('');
                } catch (err) {
                    tbody.innerHTML = '<tr><td colspan="5">Error loading types.</td></tr>';
                }
            }

            window.toggleStatus = async function(id) {
                try {
                    const res = await fetch(`/api/admin/claim-types/${id}/toggle`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        loadTypes();
                    } else {
                        alert('Error toggling status');
                    }
                } catch (err) {
                    alert('Network error');
                }
            };

            document.getElementById('new-type-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData();
                formData.append('name', document.getElementById('type_name').value);
                formData.append('is_active', document.getElementById('type_active').value);
                formData.append('templateFile', document.getElementById('type_template').files[0]);

                try {
                    const res = await fetch('/api/admin/claim-types', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });

                    if (res.ok) {
                        alert('Claim type created successfully!');
                        document.getElementById('new-type-form').reset();
                        loadTypes();
                    } else {
                        const data = await res.json();
                        alert(data.message || 'Error creating claim type');
                    }
                } catch (err) {
                    alert('Network error');
                }
            });

            loadTypes();
        });