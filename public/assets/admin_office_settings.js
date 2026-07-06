document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    function showToast(msg, ok = true) {
        const el = document.getElementById('oc-toast');
        el.textContent = msg;
        el.style.display = 'block';
        el.style.background = ok ? '#dcfce7' : '#fee2e2';
        el.style.color = ok ? '#15803d' : '#b91c1c';
        setTimeout(() => { el.style.display = 'none'; }, 4000);
    }

    // ── Load current config ───────────────────────────────────────────────────
    try {
        const res = await fetch('/api/admin/office-config', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const cfg = await res.json();
            document.getElementById('oc_office_name').value        = cfg.office_name        || '';
            document.getElementById('oc_office_address').value     = cfg.office_address     || '';
            document.getElementById('oc_office_sub_address').value = cfg.office_sub_address || '';
            document.getElementById('oc_city_state_pin').value     = cfg.city_state_pin     || '';
            document.getElementById('oc_phone').value              = cfg.phone              || '';
            document.getElementById('oc_email').value              = cfg.email              || '';
            document.getElementById('oc_fwd_ref_no').value         = cfg.fwd_ref_no         || '';
            document.getElementById('oc_signatory_name').value     = cfg.signatory_name     || '';
            document.getElementById('oc_signatory_dept').value     = cfg.signatory_dept     || '';
            document.getElementById('oc_logo_left_url').value      = cfg.logo_left_url      || '';
            document.getElementById('oc_logo_right_url').value     = cfg.logo_right_url     || '';
        }
    } catch (e) {
        console.error('Failed to load office config:', e);
    }

    // ── Save handler ──────────────────────────────────────────────────────────
    document.getElementById('office-config-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('oc-save-btn');
        btn.disabled = true;
        btn.textContent = 'Saving…';

        const payload = {
            office_name:        document.getElementById('oc_office_name').value.trim(),
            office_address:     document.getElementById('oc_office_address').value.trim(),
            office_sub_address: document.getElementById('oc_office_sub_address').value.trim(),
            city_state_pin:     document.getElementById('oc_city_state_pin').value.trim(),
            phone:              document.getElementById('oc_phone').value.trim(),
            email:              document.getElementById('oc_email').value.trim(),
            fwd_ref_no:         document.getElementById('oc_fwd_ref_no').value.trim(),
            signatory_name:     document.getElementById('oc_signatory_name').value.trim(),
            signatory_dept:     document.getElementById('oc_signatory_dept').value.trim(),
            logo_left_url:      document.getElementById('oc_logo_left_url').value.trim(),
            logo_right_url:     document.getElementById('oc_logo_right_url').value.trim(),
        };

        try {
            const res = await fetch('/api/admin/office-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                showToast('✓ ' + data.message, true);
            } else {
                showToast('✗ ' + (data.message || 'Error saving.'), false);
            }
        } catch (err) {
            showToast('✗ Network error. Please try again.', false);
            console.error(err);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Settings';
        }
    });
});
