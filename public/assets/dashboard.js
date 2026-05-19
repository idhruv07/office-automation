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

        // ── Gamification System ──
        // Calculate XP
        const xpForSubmitted = countSubmitted * 100;
        const xpForDrafts = countDrafts * 25;
        const xpForReturned = countReturned * 50;
        const totalXp = xpForSubmitted + xpForDrafts + xpForReturned;

        // Level thresholds
        let level = 1;
        let levelName = 'Claim Cadet';
        let xpNeededForNext = 100;

        if (totalXp >= 1000) {
            level = 5;
            levelName = 'Office Legend';
            xpNeededForNext = 2000;
        } else if (totalXp >= 500) {
            level = 4;
            levelName = 'Claim Master';
            xpNeededForNext = 1000;
        } else if (totalXp >= 250) {
            level = 3;
            levelName = 'Senior Analyst';
            xpNeededForNext = 500;
        } else if (totalXp >= 100) {
            level = 2;
            levelName = 'Claim Specialist';
            xpNeededForNext = 250;
        }

        // Calculate progress percentage
        let minXpForLevel = 0;
        if (level === 2) minXpForLevel = 100;
        else if (level === 3) minXpForLevel = 250;
        else if (level === 4) minXpForLevel = 500;
        else if (level === 5) minXpForLevel = 1000;

        const range = xpNeededForNext - minXpForLevel;
        const earnedInLevel = totalXp - minXpForLevel;
        const progressPct = Math.min(100, Math.max(0, Math.floor((earnedInLevel / range) * 100)));

        // Update rank, level name and bar in DOM
        document.getElementById('dash-rank').textContent = levelName;
        document.getElementById('xp-level-name').textContent = `Level ${level} (${levelName})`;
        document.getElementById('xp-numbers').textContent = `${totalXp} / ${xpNeededForNext} XP`;
        
        setTimeout(() => {
            const bar = document.getElementById('xp-bar-progress');
            if (bar) bar.style.width = `${progressPct}%`;
        }, 150);

        // Populate dynamic badges as fruits (matching profile styles)
        const badgeContainer = document.getElementById('badge-container');
        if (badgeContainer) {
            badgeContainer.innerHTML = '';
            
            const badgesList = [
                {
                    emoji: '🍇',
                    title: 'First Step',
                    desc: 'Created your first record in the system.',
                    fruitClass: 'root-node',
                    unlocked: (countSubmitted + countDrafts + countReturned) > 0
                },
                {
                    emoji: '🍑',
                    title: 'Draft Pioneer',
                    desc: 'Saved a claim as draft for later review.',
                    fruitClass: 'spouse-fruit',
                    unlocked: countDrafts > 0
                },
                {
                    emoji: '🥭',
                    title: 'Active Submitter',
                    desc: 'Successfully submitted 3 or more claims.',
                    fruitClass: 'daughter-fruit',
                    unlocked: countSubmitted >= 3
                },
                {
                    emoji: '🍏',
                    title: 'Multi-Tasker',
                    desc: 'Submitted claims in 2+ categories.',
                    fruitClass: 'parent-fruit',
                    unlocked: categories.size >= 2
                },
                {
                    emoji: '🫐',
                    title: 'Returned Survivor',
                    desc: 'Had at least one claim returned for action.',
                    fruitClass: 'son-fruit',
                    unlocked: countReturned > 0
                }
            ];

            badgesList.forEach(b => {
                const badgeEl = document.createElement('div');
                badgeEl.className = `family-tree-node ${b.fruitClass}`;
                badgeEl.style.cssText = `
                    min-width: 140px; 
                    padding: 16px 10px 12px; 
                    text-align: center;
                    opacity: ${b.unlocked ? '1' : '0.25'};
                    filter: ${b.unlocked ? 'none' : 'grayscale(100%) brightness(0.7)'};
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                `;
                
                badgeEl.innerHTML = `
                    <div style="font-size: 26px; margin-bottom: 5px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));">${b.emoji}</div>
                    <div style="font-weight: 800; color: #fff; font-size: 11px; text-shadow: 0 1px 3px rgba(0,0,0,0.3); line-height: 1.1;">${b.title}</div>
                    <div style="font-size: 8px; color: rgba(255,255,255,0.85); margin-top: 3px; font-weight: 600; line-height: 1.2; padding: 0 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 20px;">${b.desc}</div>
                    <div style="font-size: 8px; font-weight: 800; color: ${b.unlocked ? '#ffe4e6' : '#cbd5e1'}; text-transform: uppercase; margin-top: 8px; letter-spacing: 0.05em;">
                        ${b.unlocked ? '★ Unlocked' : 'Locked'}
                    </div>
                `;
                badgeContainer.appendChild(badgeEl);
            });
        }

        // 2. Fetch computed CSS theme colors dynamically for native integration
        const getThemeColor = (varName, fallback) => {
            return getComputedStyle(document.body).getPropertyValue(varName).trim() || fallback;
        };

        const primaryColor = getThemeColor('--primary-color', '#4f46e5');
        const accentColor = getThemeColor('--accent-color', '#0d9488');
        const dangerColor = getThemeColor('--danger-color', '#ef4444');
        const warningColor = getThemeColor('--warning-color', '#f59e0b');
        const textMain = getThemeColor('--text-main', '#1e293b');

        // 3. Render Status Doughnut Chart
        const statusCtx = document.getElementById('statusChart').getContext('2d');
        window.statusChartInstance = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Submitted', 'Drafts', 'Returned'],
                datasets: [{
                    data: [countSubmitted, countDrafts, countReturned],
                    backgroundColor: [
                        primaryColor,
                        accentColor,
                        dangerColor
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textMain,
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
                    backgroundColor: primaryColor,
                    borderRadius: 6,
                    borderWidth: 0,
                    barThickness: 24
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
                            color: textMain,
                            font: {
                                family: 'Inter, sans-serif',
                                weight: '600'
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(226, 232, 240, 0.6)'
                        },
                        ticks: {
                            color: textMain,
                            precision: 0,
                            font: {
                                family: 'Inter, sans-serif'
                            }
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error('Failed to load dashboard workspace metrics', err);
    }
});