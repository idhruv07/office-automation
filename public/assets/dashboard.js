document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Set dynamic date in hero
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-str').textContent = `Workspace Overview • ${new Date().toLocaleDateString('en-US', options)}`;

    // Fetch User Details to greet them professionally
    try {
        const resMe = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const user = await resMe.json();
        if (user && (user.name || user.username)) {
            document.getElementById('welcome-message').textContent = `Welcome back, ${user.name || user.username}! 👋`;
        }
        if (user && user.avatar_url) {
            const avatarImg = document.getElementById('dashboard-avatar');
            if (avatarImg) avatarImg.src = user.avatar_url;
        }
    } catch (err) {
        console.error('Failed to fetch profile info', err);
    }

    // Fetch Claims to populate charts, counters, and achievements
    try {
        const resClaims = await fetch('/api/claims?months=12', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const claims = await resClaims.json();

        // 1. Calculate counter values
        let countSubmitted = 0;
        let countDrafts = 0;
        let countReturned = 0;
        const categories = new Set();

        // Monthly data array (Jan = index 0 to Dec = index 11)
        const monthlySubmissions = new Array(12).fill(0);

        claims.forEach(c => {
            if (c.status === 'Draft') {
                countDrafts++;
            } else if (c.status === 'Returned') {
                countReturned++;
            } else {
                countSubmitted++;
            }

            if (c.type_name) {
                categories.add(c.type_name);
            }

            // Parse claim date to update monthly submission activity chart
            if (c.claim_date) {
                const dateObj = new Date(c.claim_date);
                if (!isNaN(dateObj.getTime())) {
                    const monthIndex = dateObj.getMonth();
                    monthlySubmissions[monthIndex]++;
                }
            }
        });

        // Set counters in DOM
        document.getElementById('val-submitted').textContent = countSubmitted;
        document.getElementById('val-drafts').textContent = countDrafts;
        document.getElementById('val-returned').textContent = countReturned;
        document.getElementById('val-categories').textContent = categories.size;

        // ── Calculate 6-Month Claims Completion Progress ──
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        let totalClaimsIn6Months = 0;
        let totalScore = 0;

        claims.forEach(c => {
            const claimDate = c.claim_date ? new Date(c.claim_date) : null;
            if (claimDate && claimDate >= sixMonthsAgo) {
                totalClaimsIn6Months++;
                if (c.status === 'Approved') {
                    totalScore += 1.0;
                } else if (c.status === 'Submitted' || c.status === 'Pending') {
                    totalScore += 0.75;
                } else if (c.status === 'Returned') {
                    totalScore += 0.50;
                } else if (c.status === 'Draft') {
                    totalScore += 0.25;
                }
                // Rejected counts as 0.0 towards progress
            }
        });

        const progressPct = totalClaimsIn6Months > 0 
            ? Math.round((totalScore / totalClaimsIn6Months) * 100) 
            : 0;

        // Update progress bar and text in DOM
        document.getElementById('xp-level-name').textContent = "Claims Completion Progress (Last 6 Months)";
        document.getElementById('xp-numbers').textContent = `${progressPct}%`;
        
        setTimeout(() => {
            const bar = document.getElementById('xp-bar-progress');
            if (bar) bar.style.width = `${progressPct}%`;
        }, 150);



        // 2. Create gradients for charts
        const statusCtx = document.getElementById('statusChart').getContext('2d');
        const historyCtx = document.getElementById('historyChart').getContext('2d');

        const gradSubmitted = statusCtx.createLinearGradient(0, 0, 0, 180);
        gradSubmitted.addColorStop(0, '#38bdf8');
        gradSubmitted.addColorStop(1, '#0284c7');
        
        const gradDrafts = statusCtx.createLinearGradient(0, 0, 0, 180);
        gradDrafts.addColorStop(0, '#34d399');
        gradDrafts.addColorStop(1, '#059669');
        
        const gradReturned = statusCtx.createLinearGradient(0, 0, 0, 180);
        gradReturned.addColorStop(0, '#fb7185');
        gradReturned.addColorStop(1, '#e11d48');

        const barGradient = historyCtx.createLinearGradient(0, 0, 0, 180);
        barGradient.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
        barGradient.addColorStop(1, 'rgba(79, 70, 229, 0.15)');

        const textWhite = 'rgba(255, 255, 255, 0.9)';

        // 3. Render Status Doughnut Chart
        window.statusChartInstance = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Submitted', 'Drafts', 'Returned'],
                datasets: [{
                    data: [countSubmitted, countDrafts, countReturned],
                    backgroundColor: [
                        gradSubmitted,
                        gradDrafts,
                        gradReturned
                    ],
                    borderWidth: 2,
                    borderColor: 'rgba(15, 23, 42, 0.5)',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textWhite,
                            font: {
                                family: 'Inter, sans-serif',
                                weight: '600',
                                size: 12
                            },
                            padding: 15
                        }
                    }
                },
                cutout: '70%'
            }
        });

        // 4. Render Monthly Activity Bar Chart
        window.historyChartInstance = new Chart(historyCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Claims Submitted',
                    data: monthlySubmissions,
                    backgroundColor: barGradient,
                    borderRadius: 6,
                    borderWidth: 0,
                    barThickness: 16
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            font: {
                                family: 'Inter, sans-serif',
                                weight: '600'
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            precision: 0,
                            font: {
                                family: 'Inter, sans-serif'
                            }
                        }
                    }
                }
            }
        });

        // Initialize Drag and Drop capability for all dashboard widget containers
        initDragAndDrop();

        // Load Report Reminders widget
        loadDashboardReminders(token);

    } catch (err) {
        console.error('Failed to load dashboard workspace metrics', err);
    }
});

async function loadDashboardReminders(token) {
    const listEl = document.getElementById('dashboard-reminders-list');
    if (!listEl) return;

    try {
        const res = await fetch('/api/reminders/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed');

        const reminders = await res.json();

        if (reminders.length === 0) {
            listEl.innerHTML = '<div style="color: rgba(255,255,255,0.7); font-size: 13px; text-align: center; padding: 12px;">🎉 No pending report reminders!</div>';
            return;
        }

        listEl.innerHTML = reminders.map(r => {
            const dueDate = new Date(r.due_date);
            const formatted = dueDate.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });

            const isOverdue = dueDate < new Date();
            const badgeColor = isOverdue ? '#ef4444' : (r.urgency === 'High' ? '#ef4444' : '#f59e0b');

            return `
                <div style="background: rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.12);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button class="btn-dashboard-complete-rem" data-id="${r.id}" title="Mark as Completed" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255,255,255,0.25); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: #10b981; cursor: pointer; font-size: 12px; font-weight: 900; transition: all 0.2s; outline: none; padding: 0;">✓</button>
                        <div>
                            <div style="font-weight: 700; color: #ffffff; font-size: 14px;">${r.title}</div>
                            <div style="font-size: 11px; color: rgba(255,255,255,0.6);">Assigned by: ${r.creator_name || 'System'}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: inline-block; background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 800;">
                            ${isOverdue ? 'OVERDUE' : r.urgency.toUpperCase()}
                        </span>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 2px;">${formatted}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach action handlers for marking complete
        listEl.querySelectorAll('.btn-dashboard-complete-rem').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                try {
                    const res = await fetch(`/api/reminders/${id}/status`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ status: 'Completed' })
                    });
                    if (res.ok) {
                        // Reload list dynamically
                        loadDashboardReminders(token);
                    } else {
                        alert('Failed to mark reminder as completed');
                    }
                } catch (err) {
                    console.error('Error toggling status from dashboard:', err);
                }
            });
        });
    } catch (e) {
        console.error('Failed to load dashboard reminders:', e);
        listEl.innerHTML = '<div style="color: rgba(255,255,255,0.6); font-size: 12px; text-align: center; padding: 10px;">Failed to load reminders</div>';
    }
}

function initDragAndDrop() {
    const container = document.getElementById('dashboard-widgets-container');
    const widgets = document.querySelectorAll('.draggable-widget');
    if (!container || widgets.length === 0) return;

    widgets.forEach(widget => {
        widget.addEventListener('dragstart', (e) => {
            const targetTag = e.target.tagName.toLowerCase();
            // Prevent drag if starting on canvas, buttons, links, or inputs
            if (targetTag === 'a' || targetTag === 'button' || targetTag === 'canvas' || 
                e.target.closest('a') || e.target.closest('button') || e.target.closest('canvas')) {
                e.preventDefault();
                return;
            }
            widget.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        widget.addEventListener('dragend', () => {
            widget.classList.remove('dragging');
            saveWidgetOrder();
        });
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        if (!draggingItem) return;

        const siblings = [...container.querySelectorAll('.draggable-widget:not(.dragging)')];

        const nextSibling = siblings.find(sibling => {
            const box = sibling.getBoundingClientRect();
            // Check vertical mid-point offset to allow insertion before or after
            const offset = e.clientY - box.top - box.height / 2;
            return offset < 0;
        });

        if (nextSibling) {
            container.insertBefore(draggingItem, nextSibling);
        } else {
            container.appendChild(draggingItem);
        }
    });

    restoreWidgetOrder();
}

function saveWidgetOrder() {
    const container = document.getElementById('dashboard-widgets-container');
    if (!container) return;
    const order = [...container.querySelectorAll('.draggable-widget')].map(el => el.getAttribute('data-widget-id'));
    localStorage.setItem('dashboard-widget-order', JSON.stringify(order));
}

function restoreWidgetOrder() {
    const orderStr = localStorage.getItem('dashboard-widget-order');
    if (!orderStr) return;
    try {
        const order = JSON.parse(orderStr);
        const container = document.getElementById('dashboard-widgets-container');
        if (!container) return;
        const widgetsMap = {};
        container.querySelectorAll('.draggable-widget').forEach(el => {
            widgetsMap[el.getAttribute('data-widget-id')] = el;
        });
        order.forEach(id => {
            if (widgetsMap[id]) {
                container.appendChild(widgetsMap[id]);
            }
        });
    } catch (e) {
        console.error('Failed to restore widget order', e);
    }
}