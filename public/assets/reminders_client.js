(function () {
    let currentTab = 'upcoming';
    let currentUser = null;

    document.addEventListener('DOMContentLoaded', () => {
        initPage();
    });

    let allAssignees = [];
    const selectedAssignees = new Set();

    async function initPage() {
        // Move modals to body root to ensure they occupy the complete viewport and cover the header/sidebar
        const createModal = document.getElementById('modal-create-reminder');
        const assigneesModal = document.getElementById('modal-select-assignees');
        if (createModal) document.body.appendChild(createModal);
        if (assigneesModal) document.body.appendChild(assigneesModal);

        await fetchCurrentUser();
        await loadUserDropdown();
        setupEventListeners();
        loadReminders(currentTab);
    }

    async function fetchCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                currentUser = await res.json();
            }
        } catch (e) {
            console.error('Failed to fetch current user:', e);
        }
    }

    async function loadUserDropdown() {
        const listEl = document.getElementById('assignees-checkbox-list');
        if (!listEl) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/reminders/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                allAssignees = await res.json();
                renderAssignees(allAssignees);
            }
        } catch (e) {
            console.error('Failed to load user list:', e);
        }
    }

    function renderAssignees(list) {
        const listEl = document.getElementById('assignees-checkbox-list');
        if (!listEl) return;
        listEl.innerHTML = list.map(u => {
            const isChecked = selectedAssignees.has(String(u.id)) ? 'checked' : '';
            return `
                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-main); cursor: pointer; padding: 4px 0; border-bottom: 1px solid var(--border-light);">
                    <input type="checkbox" value="${u.id}" class="assignee-checkbox" ${isChecked} style="cursor: pointer; width: 16px; height: 16px;">
                    <span>${u.label}</span>
                </label>
            `;
        }).join('');

        // Attach listener to checkboxes
        listEl.querySelectorAll('.assignee-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = String(e.target.value);
                if (e.target.checked) {
                    selectedAssignees.add(id);
                } else {
                    selectedAssignees.delete(id);
                }
                updateAssigneeSummary();
            });
        });
    }

    function updateAssigneeSummary() {
        const summaryText = document.getElementById('assignee-summary-text');
        if (!summaryText) return;

        if (selectedAssignees.size === 0) {
            summaryText.textContent = 'Selected: Self';
            return;
        }

        const selectedNames = [];
        allAssignees.forEach(u => {
            if (selectedAssignees.has(String(u.id))) {
                selectedNames.push(u.name);
            }
        });

        summaryText.textContent = `Selected: ${selectedNames.join(', ')}`;
    }

    function setupEventListeners() {
        // Modal toggles
        const modal = document.getElementById('modal-create-reminder');
        const openBtn = document.getElementById('btn-open-create-modal');
        const closeBtn = document.getElementById('btn-close-create-modal');
        const cancelBtn = document.getElementById('btn-cancel-create');

        if (openBtn) openBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
        if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
        if (cancelBtn) cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });

        // Close modal when clicking on the backdrop overlay
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Assignees Popup Toggles
        const assigneesModal = document.getElementById('modal-select-assignees');
        const openAssigneesBtn = document.getElementById('btn-select-assignees');
        const closeAssigneesBtn = document.getElementById('btn-close-assignees-modal');
        const confirmAssigneesBtn = document.getElementById('btn-confirm-assignees');

        if (openAssigneesBtn) openAssigneesBtn.addEventListener('click', () => { assigneesModal.style.display = 'flex'; });
        if (closeAssigneesBtn) closeAssigneesBtn.addEventListener('click', () => { assigneesModal.style.display = 'none'; });
        if (confirmAssigneesBtn) confirmAssigneesBtn.addEventListener('click', () => { assigneesModal.style.display = 'none'; });

        // Close assignee modal when clicking on the backdrop overlay
        if (assigneesModal) {
            assigneesModal.addEventListener('click', (e) => {
                if (e.target === assigneesModal) {
                    assigneesModal.style.display = 'none';
                }
            });
        }

        // Search filter for assignees
        const searchInput = document.getElementById('assignee-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allAssignees.filter(u => u.label.toLowerCase().includes(term));
                renderAssignees(filtered);
            });
        }

        // Recurrence controls
        const recType = document.getElementById('rec-type');
        const intervalWrap = document.getElementById('rec-interval-wrap');
        const monthlyWrap = document.getElementById('rec-monthly-wrap');
        const endWrap = document.getElementById('rec-end-wrap');

        recType.addEventListener('change', () => {
            const val = recType.value;
            const unitLabel = document.getElementById('rec-unit-label');
            
            if (val === 'none') {
                intervalWrap.style.display = 'none';
                monthlyWrap.style.display = 'none';
                endWrap.style.display = 'none';
            } else {
                intervalWrap.style.display = 'flex';
                endWrap.style.display = 'block';
                monthlyWrap.style.display = 'none';
                
                if (val === 'daily') {
                    unitLabel.textContent = 'days';
                } else if (val === 'weekly') {
                    unitLabel.textContent = 'weeks';
                } else if (val === 'monthly') {
                    unitLabel.textContent = 'months';
                    monthlyWrap.style.display = 'block';
                }
            }
        });

        const recEndType = document.getElementById('rec-end-type');
        const recEndDate = document.getElementById('rec-end-date');
        const recEndCountWrap = document.getElementById('rec-end-count-wrap');

        recEndType.addEventListener('change', () => {
            const val = recEndType.value;
            recEndDate.style.display = (val === 'until_date') ? 'block' : 'none';
            recEndCountWrap.style.display = (val === 'count') ? 'flex' : 'none';
        });

        // Tabs switching
        const tabBtns = document.querySelectorAll('.reminder-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'transparent';
                    b.style.color = 'var(--text-muted)';
                });
                btn.classList.add('active');
                btn.style.background = 'var(--primary-color)';
                btn.style.color = 'white';
                currentTab = btn.getAttribute('data-tab');
                loadReminders(currentTab);
            });
        });

        // Initialize active tab styling
        const activeTab = document.querySelector('.reminder-tab-btn.active');
        if (activeTab) {
            activeTab.style.background = 'var(--primary-color)';
            activeTab.style.color = 'white';
        }

        // Form submission
        const form = document.getElementById('form-create-reminder');
        form.addEventListener('submit', handleCreateReminder);
    }

    async function handleCreateReminder(e) {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const formData = new FormData();

        const title = document.getElementById('rem-title').value;
        const description = document.getElementById('rem-description').value;
        const dueDate = document.getElementById('rem-due-date').value;
        const urgency = document.getElementById('rem-urgency').value;

        // Assignees
        const selectedAssigneeIds = Array.from(selectedAssignees);
        if (selectedAssigneeIds.length === 0) {
            // If none explicitly selected from tracking, grab current selections in dropdown
            const selectEl = document.getElementById('rem-assignees');
            Array.from(selectEl.selectedOptions).forEach(opt => selectedAssigneeIds.push(opt.value));
        }

        // Recurrence
        const recTypeVal = document.getElementById('rec-type').value;
        let recurrenceRule = null;
        let endCondition = null;

        if (recTypeVal !== 'none') {
            recurrenceRule = {
                type: recTypeVal,
                interval: parseInt(document.getElementById('rec-interval').value || 1),
                relativeRule: document.getElementById('rec-monthly-rule').value
            };

            const endTypeVal = document.getElementById('rec-end-type').value;
            endCondition = {
                type: endTypeVal,
                date: document.getElementById('rec-end-date').value,
                remaining: parseInt(document.getElementById('rec-end-count').value || 1)
            };
        }

        formData.append('title', title);
        formData.append('description', description);
        formData.append('due_date', new Date(dueDate).toISOString());
        formData.append('urgency', urgency);
        formData.append('assignees', JSON.stringify(selectedAssigneeIds));
        if (recurrenceRule) formData.append('recurrence_rule', JSON.stringify(recurrenceRule));
        if (endCondition) formData.append('end_condition', JSON.stringify(endCondition));

        // Files
        const fileInput = document.getElementById('rem-files');
        if (fileInput.files.length > 0) {
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('attachments', fileInput.files[i]);
            }
        }

        try {
            const res = await fetch('/api/reminders', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                alert('Reminder created successfully!');
                document.getElementById('modal-create-reminder').style.display = 'none';
                document.getElementById('form-create-reminder').reset();
                loadReminders(currentTab);
            } else {
                const err = await res.json();
                alert(`Error: ${err.error || 'Failed to create reminder'}`);
            }
        } catch (err) {
            console.error('Error saving reminder:', err);
            alert('Failed to connect to server');
        }
    }

    async function loadReminders(tab) {
        const container = document.getElementById('reminders-list-container');
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Loading reminders...</div>';

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/reminders?tab=${tab}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to load reminders');

            const reminders = await res.json();

            if (reminders.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: white; border-radius: 16px; border: 1px solid var(--border-color); color: var(--text-muted);">
                        <p style="font-size: 16px; margin: 0; font-weight: 600;">No reminders found under ${tab}.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = reminders.map(r => renderReminderCard(r)).join('');

            // Attach event listeners for status toggle & delete
            container.querySelectorAll('.btn-toggle-status').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const newStatus = e.target.getAttribute('data-next-status');
                    toggleStatus(id, newStatus);
                });
            });

            container.querySelectorAll('.btn-delete-rem').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this reminder?')) {
                        deleteReminder(id);
                    }
                });
            });

        } catch (err) {
            console.error('Error loading reminders:', err);
            container.innerHTML = '<div style="color: var(--danger-color); text-align: center; padding: 20px;">Failed to load reminders.</div>';
        }
    }

    function renderReminderCard(rem) {
        const dueDate = new Date(rem.due_date);
        const formattedDate = dueDate.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        }) + ' IST';

        let urgencyBadge = '<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;">🟢 Low</span>';
        if (rem.urgency === 'Medium') {
            urgencyBadge = '<span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;">🟡 Medium</span>';
        } else if (rem.urgency === 'High') {
            urgencyBadge = '<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;">🔴 High</span>';
        }

        let recBadge = '';
        if (rem.recurrence_rule && rem.recurrence_rule.type !== 'none') {
            recBadge = `<span style="background: rgba(79, 70, 229, 0.1); color: var(--primary-color); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-left: 6px;">🔄 ${rem.recurrence_rule.type}</span>`;
        }

        const assigneesList = (rem.assignees && rem.assignees.length > 0)
            ? rem.assignees.map(a => `${a.designation ? a.designation + ' ' : ''}${a.name}`).join(', ')
            : 'Self';

        const attachmentLinks = (rem.attachments && rem.attachments.length > 0)
            ? rem.attachments.map(att => `<a href="${att.file_path}" target="_blank" style="color: var(--primary-color); font-size: 12px; font-weight: 600; text-decoration: underline; margin-right: 12px;">📎 ${att.original_name}</a>`).join('')
            : '<span style="color: var(--text-muted); font-size: 12px;">None</span>';

        const isCompleted = rem.status === 'Completed';
        const nextStatus = isCompleted ? 'Pending' : 'Completed';
        const statusBtnText = isCompleted ? '🔄 Reopen' : '✅ Mark Complete';

        const canDelete = currentUser && (currentUser.id === rem.created_by || currentUser.role === 'Admin');

        return `
            <div style="background: white; border-radius: 16px; border: 1px solid var(--border-color); padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: var(--text-main);">${rem.title}</h3>
                            ${urgencyBadge}
                            ${recBadge}
                        </div>
                        <p style="margin: 0; font-size: 13px; color: var(--text-muted);">${rem.description || 'No additional details provided.'}</p>
                    </div>
                    <div style="font-size: 12px; text-align: right; color: var(--text-muted); font-weight: 600;">
                        📅 Due: <span style="color: var(--text-main); font-weight: 700;">${formattedDate}</span>
                    </div>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border-light); padding-top: 10px;">
                    <div>👤 <strong>Created By:</strong> ${rem.creator_name || 'System'}</div>
                    <div>👥 <strong>Assignees:</strong> ${assigneesList}</div>
                    <div>📁 <strong>Attachments:</strong> ${attachmentLinks}</div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;">
                    <button class="btn btn-toggle-status" data-id="${rem.id}" data-next-status="${nextStatus}" style="background: ${isCompleted ? 'var(--bg-main)' : 'var(--success-color)'}; color: ${isCompleted ? 'var(--text-main)' : 'white'}; border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                        ${statusBtnText}
                    </button>
                    ${canDelete ? `
                        <button class="btn btn-delete-rem" data-id="${rem.id}" style="background: rgba(239, 68, 68, 0.1); color: var(--danger-color); border: 1px solid rgba(239, 68, 68, 0.2); padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                            🗑️ Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async function toggleStatus(id, nextStatus) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/reminders/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: nextStatus })
            });

            if (res.ok) {
                loadReminders(currentTab);
            } else {
                alert('Failed to update status');
            }
        } catch (e) {
            console.error('Status update failed:', e);
        }
    }

    async function deleteReminder(id) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/reminders/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                loadReminders(currentTab);
            } else {
                alert('Failed to delete reminder');
            }
        } catch (e) {
            console.error('Delete reminder failed:', e);
        }
    }
})();
