document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const tbody = document.getElementById('forwardings-tbody');
    const countSpan = document.getElementById('forwardings-count');

    try {
        const res = await fetch('/api/admin/forwardings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="5" class="fwd-table-empty">Failed to load forwarding letters.</td></tr>`;
            return;
        }

        const data = await res.json();
        countSpan.textContent = `${data.length} Results`;

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="fwd-table-empty">No forwarding letters generated yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(item => {
            const formattedDate = new Date(item.generated_at).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <tr>
                    <td class="fwd-cell-id">#${item.id}</td>
                    <td>
                        <div class="fwd-cell-bold">${item.user_name}</div>
                        <div class="fwd-cell-sub">${item.designation || '—'} (@${item.username})</div>
                    </td>
                    <td>
                        <div class="fwd-cell-bold">${item.claim_name}</div>
                        <div><span class="fwd-badge">${item.type_name}</span></div>
                    </td>
                    <td class="fwd-cell-sub">${formattedDate}</td>
                    <td>
                        <a href="${item.file_url}" target="_blank" class="fwd-btn-view">
                            View / Print Note
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5" class="fwd-table-empty">An error occurred while fetching forwarding letters.</td></tr>`;
    }
});
