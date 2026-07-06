document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const grid = document.getElementById('ref-grid');

    function showToast(msg, ok = true) {
        const t = document.getElementById('save-toast');
        t.textContent = (ok ? '✓ ' : '✗ ') + msg;
        t.style.background = ok ? '#1e293b' : '#b91c1c';
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }

    function formatDate(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    async function loadAll() {
        try {
            const res = await fetch('/api/admin/claim-ref-nos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const rows = await res.json();
            render(rows);
        } catch (e) {
            grid.innerHTML = '<p style="color:#e11d48;">Failed to load data.</p>';
        }
    }

    function render(rows) {
        grid.innerHTML = rows.map(row => `
            <div class="ref-card" id="card-${row.claim_type_id}">
                <div class="ref-card-header">
                    <span class="ref-type-name">${row.claim_type_name}</span>
                    <button class="btn-history" onclick="toggleHistory(${row.claim_type_id}, this)">
                        ⏱ History
                    </button>
                </div>
                <div class="ref-card-body">
                    <div class="ref-current-block">
                        <div class="ref-current-label">Current Reference No.</div>
                        ${row.ref_no
                            ? `<div class="ref-current-value">${row.ref_no}</div>
                               <div class="ref-valid-from">Valid from: ${formatDate(row.valid_from)} &nbsp;|&nbsp; Set by: ${row.set_by || 'Admin'}</div>`
                            : `<div class="ref-not-set">Not set — using global Office Settings default</div>`
                        }
                    </div>
                    <form class="ref-set-form" onsubmit="saveRefNo(event, ${row.claim_type_id})">
                        <input type="text" name="ref_no" placeholder="e.g. IT&SDC/Estt/LTC/Vol-II"
                               value="${row.ref_no || ''}" autocomplete="off" required>
                        <input type="date" name="valid_from" value="${new Date().toISOString().slice(0, 10)}" required>
                        <button type="submit" class="btn-set-ref">Set Now</button>
                    </form>
                </div>
                <div class="history-panel" id="hist-${row.claim_type_id}">
                    <p style="color:#94a3b8; font-size:0.78rem; padding:8px 0 4px;">Click History to load…</p>
                </div>
            </div>
        `).join('');
    }

    window.saveRefNo = async function(e, claimTypeId) {
        e.preventDefault();
        const form = e.target;
        const ref_no    = form.ref_no.value.trim();
        const valid_from = form.valid_from.value;

        if (!ref_no) return;

        try {
            const res = await fetch('/api/admin/claim-ref-nos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ claim_type_id: claimTypeId, ref_no, valid_from })
            });
            if (res.ok) {
                showToast('Reference number saved successfully');
                // Reload only the card affected
                const full = await fetch('/api/admin/claim-ref-nos', { headers: { 'Authorization': `Bearer ${token}` } });
                const rows = await full.json();
                render(rows);
            } else {
                const err = await res.json();
                showToast(err.message || 'Error saving', false);
            }
        } catch (err) {
            showToast('Network error', false);
        }
    };

    window.toggleHistory = async function(claimTypeId, btn) {
        const panel = document.getElementById(`hist-${claimTypeId}`);
        const isOpen = panel.classList.contains('open');

        if (isOpen) {
            panel.classList.remove('open');
            btn.textContent = '⏱ History';
            return;
        }

        btn.textContent = '⏱ Loading…';
        try {
            const res = await fetch(`/api/admin/claim-ref-nos/${claimTypeId}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const history = await res.json();

            if (history.length === 0) {
                panel.innerHTML = '<p style="color:#94a3b8; font-size:0.78rem; padding:8px 0;">No history yet.</p>';
            } else {
                panel.innerHTML = `
                    <table>
                        <thead>
                            <tr>
                                <th>Reference Number</th>
                                <th>Valid From</th>
                                <th>Set By</th>
                                <th>Recorded At</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${history.map((h, idx) => `
                                <tr>
                                    <td>${h.ref_no}</td>
                                    <td>${formatDate(h.valid_from)}</td>
                                    <td>${h.set_by || 'Admin'}</td>
                                    <td>${formatDate(h.created_at)}</td>
                                    <td>${idx === 0 ? '<span class="badge-active">ACTIVE</span>' : ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`;
            }

            panel.classList.add('open');
            btn.textContent = '✕ Close History';
        } catch (e) {
            panel.innerHTML = '<p style="color:#e11d48; font-size:0.78rem; padding:8px 0;">Failed to load history.</p>';
            panel.classList.add('open');
            btn.textContent = '✕ Close';
        }
    };

    await loadAll();
});
