// public/repository/js/document-workflow.js

window.loadDocumentWorkflow = async function() {
    try {
        const res = await fetch(`/api/repo/documents/${docId}/workflow`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        currentUserInfo = data.user;
        currentWfState = data.workflow;
        
        wfStatusVal.innerText = currentWfState.status;
        wfOwnerVal.innerText = currentWfState.current_owner_role;
        
        const isOwner = currentWfState.current_owner_role === currentUserInfo.role;
        
        wfCommentsInput.value = '';
        wfCommentsInput.style.display = isOwner ? 'block' : 'none';
        
        if (isOwner) {
            wfBtnSubmit.style.display = 'block';
            wfBtnSubmit.innerText = currentUserInfo.role === 'ADDN_CDA' ? 'Approve' : 'Forward';
            
            if (currentUserInfo.role !== 'ADDN_CDA') {
                wfForwardSelectorWrap.style.display = 'flex';
                populateForwardTargets(currentUserInfo.role);
                
                // Populate page selection checklist
                wfPageSelectorWrap.style.display = 'flex';
                wfPageCheckboxes.innerHTML = '';
                allPages.forEach((p, idx) => {
                    const label = document.createElement('label');
                    label.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer; margin-bottom: 2px;';
                    label.innerHTML = `<input type="checkbox" class="wf-page-chk" value="${p.id}" checked style="cursor:pointer;"> <span>Page ${idx + 1}: ${p.title || 'Untitled'}</span>`;
                    wfPageCheckboxes.appendChild(label);
                });
            } else {
                wfForwardSelectorWrap.style.display = 'none';
                wfPageSelectorWrap.style.display = 'none';
            }
            
            if (currentWfState.current_owner_role !== 'AUDITOR') {
                wfBtnRollback.style.display = 'block';
                wfReturnSelectorWrap.style.display = 'flex';
                populateReturnTargets(currentWfState.current_owner_role);
            } else {
                wfBtnRollback.style.display = 'none';
                wfReturnSelectorWrap.style.display = 'none';
            }
        } else {
            wfBtnSubmit.style.display = 'none';
            wfBtnRollback.style.display = 'none';
            wfReturnSelectorWrap.style.display = 'none';
            wfForwardSelectorWrap.style.display = 'none';
            wfPageSelectorWrap.style.display = 'none';
        }

        if (!isOwner) {
            wfBtnTakeover.style.display = 'block';
            
            const roleRanks = { 'AUDITOR': 8, 'AAO': 6, 'SAO': 5, 'GO': 4, 'ADDN_CDA': 3 };
            const currentOwnerRank = roleRanks[currentWfState.current_owner_role] || 99;
            const requesterRank = roleRanks[currentUserInfo.role] || 99;
            const isLowerRank = requesterRank > currentOwnerRank;
            
            const activeLocks = data.active_locks || [];
            wfBtnTakeover.onclick = async () => {
                let msg = "Are you sure you want to take over ownership of this document? This will transfer all editing and routing control to you.";
                if (isLowerRank) {
                    msg = `Warning: You are taking over ownership of this document from a higher authority (${currentWfState.current_owner_role}). Are you sure you want to proceed?`;
                }
                if (activeLocks.length > 0) {
                    msg += `\n\nAdditionally, this document has active page edit locks held by: ${activeLocks.map(l => l.holder_name).join(', ')}. Taking over will force-release these locks.`;
                }
                if (!confirm(msg)) return;
                
                try {
                    const res = await fetch(`/api/repo/documents/${docId}/workflow/action`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ action: 'takeover' })
                    });
                    const responseData = await res.json();
                    if (res.ok) {
                        alert(responseData.message);
                        window.location.reload();
                    } else {
                        alert('Takeover Error: ' + responseData.message);
                    }
                } catch (err) {
                    console.error('Takeover failed:', err);
                    alert('Error executing takeover action');
                }
            };
        } else {
            wfBtnTakeover.style.display = 'none';
        }

        const pullBackRules = {
            'AUDITOR': 'Submitted to AAO',
            'AAO': 'Submitted to SAO',
            'SAO': 'Submitted to GO',
            'GO': 'Submitted to Addl CDA'
        };
        const expectedPullBackStatus = pullBackRules[currentUserInfo.role];
        if (expectedPullBackStatus && currentWfState.status === expectedPullBackStatus) {
            wfBtnPullback.style.display = 'block';
        } else {
            wfBtnPullback.style.display = 'none';
        }
        
        renderAuditLog(currentWfState.comments);
        
        const comments = currentWfState.comments || [];
        const seenCountKey = 'seen_wf_comments_' + docId;
        const wfPanel = document.getElementById('workflow-panel');
        
        if (wfPanel && wfPanel.style.display === 'flex') {
            localStorage.setItem(seenCountKey, comments.length);
            document.getElementById('wf-badge-count').style.display = 'none';
        } else {
            const seenCount = parseInt(localStorage.getItem(seenCountKey) || '0', 10);
            const newCount = Math.max(0, comments.length - seenCount);
            const badgeEl = document.getElementById('wf-badge-count');
            if (badgeEl) {
                if (newCount > 0) {
                    badgeEl.innerText = newCount;
                    badgeEl.style.display = 'inline-block';
                } else {
                    badgeEl.style.display = 'none';
                }
            }
        }
    } catch(e) {
        console.error('Failed to load document workflow', e);
    }
};

window.markWorkflowCommentsAsSeen = function() {
    if (currentWfState && currentWfState.comments) {
        const seenCountKey = 'seen_wf_comments_' + docId;
        localStorage.setItem(seenCountKey, currentWfState.comments.length);
        const badgeEl = document.getElementById('wf-badge-count');
        if (badgeEl) badgeEl.style.display = 'none';
    }
};

function populateReturnTargets(currentRole) {
    const roles = ['AUDITOR', 'AAO', 'SAO', 'GO', 'ADDN_CDA'];
    const currentIndex = roles.indexOf(currentRole);
    
    wfReturnTarget.innerHTML = '';
    for (let i = 0; i < currentIndex; i++) {
        const opt = document.createElement('option');
        opt.value = roles[i];
        opt.innerText = roles[i] === 'AUDITOR' ? 'Auditor' : roles[i];
        wfReturnTarget.appendChild(opt);
    }
}

async function populateForwardTargets(currentRole) {
    const roles = ['AUDITOR', 'AAO', 'SAO', 'GO', 'ADDN_CDA'];
    const currentIndex = roles.indexOf(currentRole);
    if (currentIndex === -1 || currentIndex >= roles.length - 1) {
        wfForwardSelectorWrap.style.display = 'none';
        return;
    }
    const nextRole = roles[currentIndex + 1];
    wfForwardSelectorWrap.style.display = 'flex';
    wfForwardTarget.innerHTML = '<option value="">Loading officers...</option>';
    
    try {
        const res = await fetch(`/api/repo/users/role/${nextRole}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        wfForwardTarget.innerHTML = '';
        if (!data.users || data.users.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.innerText = `No active ${nextRole === 'ADDN_CDA' ? 'Addl CDA' : nextRole} officers found`;
            wfForwardTarget.appendChild(opt);
            return;
        }
        
        data.users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = `${u.name} (${u.designation || nextRole})`;
            opt.innerText = `${u.name} (${u.designation || nextRole})`;
            wfForwardTarget.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to load forward targets:', err);
        wfForwardTarget.innerHTML = '<option value="">Failed to load officers</option>';
    }
}

function renderAuditLog(comments) {
    wfCommentsFeed.innerHTML = '';
    if (!comments || comments.length === 0) {
        wfCommentsFeed.innerHTML = '<div style="font-size: 11px; color: #64748b; font-style: italic;">No actions logged yet.</div>';
        return;
    }
    
    const reversed = [...comments].reverse();
    reversed.forEach(c => {
        const dateStr = new Date(c.date).toLocaleDateString() + ' ' + new Date(c.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let actionColor = '#10b981'; 
        if (c.action === 'Return') actionColor = '#ef4444'; 
        if (c.action === 'Pull Back') actionColor = '#f59e0b'; 

        const div = document.createElement('div');
        div.style.cssText = 'background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); font-size: 11px; margin-bottom: 6px;';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-weight:700; color:white;">
                <span>${c.user} (${c.role === 'AUDITOR' ? 'Auditor' : c.role})</span>
                <span style="color:${actionColor}">${c.action}</span>
            </div>
            <div style="font-size:10px; color:#64748b; margin-top:2px;">${dateStr}</div>
            ${c.text ? `<div style="color:#cbd5e1; margin-top:4px; font-style:italic;">"${c.text}"</div>` : ''}
        `;
        wfCommentsFeed.appendChild(div);
    });
}

async function submitWorkflowAction(action, extraData = {}) {
    const comments = wfCommentsInput.value.trim();
    if (action === 'rollback' && !comments) {
        alert('Comments are required when returning a document.');
        return;
    }
    
    try {
        const res = await fetch(`/api/repo/documents/${docId}/workflow/action`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action,
                comments,
                ...extraData
            })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            window.loadDocumentWorkflow();
        } else {
            alert('Workflow Error: ' + data.message);
        }
    } catch(e) {
        console.error(e);
        alert('Error executing workflow action');
    }
}

wfBtnSubmit.onclick = async () => {
    let target_user_name = '';
    if (currentUserInfo && currentUserInfo.role !== 'ADDN_CDA') {
        target_user_name = wfForwardTarget.value;
        if (!target_user_name) {
            alert('Please select a forward officer recipient.');
            return;
        }
    }
    
    const checkedChks = Array.from(document.querySelectorAll('.wf-page-chk:checked'));
    const checkedPageIds = checkedChks.map(el => parseInt(el.value));
    if (checkedPageIds.length === 0) {
        alert('Please select at least one page to forward.');
        return;
    }
    
    const comments = wfCommentsInput.value.trim();
    try {
        const res = await fetch(`/api/repo/documents/${docId}/workflow/action`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'submit',
                comments,
                target_user_name,
                selected_page_ids: checkedPageIds
            })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            if (data.split) {
                window.location.reload();
            } else {
                window.loadDocumentWorkflow();
            }
        } else {
            alert('Workflow Error: ' + data.message);
        }
    } catch(e) {
        console.error(e);
        alert('Error executing workflow action');
    }
};

wfBtnRollback.onclick = () => {
    const target = wfReturnTarget.value;
    if (!target) return;
    submitWorkflowAction('rollback', { target_role: target });
};

wfBtnPullback.onclick = () => submitWorkflowAction('pullback');
