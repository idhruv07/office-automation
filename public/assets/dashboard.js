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



        // 2. Fetch colors designed for dark gradient charts integration
        const colorSubmitted = '#38bdf8'; // Sky blue glow
        const colorDrafts = '#34d399'; // Emerald glow
        const colorReturned = '#fb7185'; // Rose/Coral glow
        const textWhite = 'rgba(255, 255, 255, 0.95)';

        // 3. Render Status Doughnut Chart
        const statusCtx = document.getElementById('statusChart').getContext('2d');
        window.statusChartInstance = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Submitted', 'Drafts', 'Returned'],
                datasets: [{
                    data: [countSubmitted, countDrafts, countReturned],
                    backgroundColor: [
                        colorSubmitted,
                        colorDrafts,
                        colorReturned
                    ],
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.15)',
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
        const historyCtx = document.getElementById('historyChart').getContext('2d');
        window.historyChartInstance = new Chart(historyCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Claims Submitted',
                    data: monthlySubmissions,
                    backgroundColor: colorSubmitted,
                    borderRadius: 6,
                    borderWidth: 0,
                    barThickness: 20
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
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                family: 'Inter, sans-serif',
                                weight: '600'
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.15)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.8)',
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

    } catch (err) {
        console.error('Failed to load dashboard workspace metrics', err);
    }
});

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