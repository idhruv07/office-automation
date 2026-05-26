document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    let claimTypes = [];
    let currentUser = {};

    try {
        // Fetch user details for auto-fill
        const userRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userRes.status === 401 || userRes.status === 403) {
            localStorage.removeItem('token');
            window.location.href = '/';
            return;
        }
        if (!userRes.ok) throw new Error('Failed to fetch user details');
        currentUser = await userRes.json();

        // Auto-fill claim date
        const today = new Date().toISOString().split('T')[0];
        const claimDateEl = document.getElementById('claim_date');
        if (claimDateEl) claimDateEl.value = today;

        // Fetch claim types
        const typesRes = await fetch('/api/claims/types', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (typesRes.status === 401 || typesRes.status === 403) {
            localStorage.removeItem('token');
            window.location.href = '/';
            return;
        }
        if (!typesRes.ok) throw new Error('Failed to fetch claim types');
        claimTypes = await typesRes.json();

        if (!Array.isArray(claimTypes)) throw new Error('Invalid claim types response');

        const select = document.getElementById('claim_type');
        if (!select) throw new Error('claim_type element not found in DOM');

        const errEl = document.getElementById('claim-type-error');
        if (claimTypes.length === 0) {
            if (errEl) errEl.style.display = 'block';
            if (errEl) errEl.textContent = 'No active claim types found.';
        } else {
            if (errEl) errEl.style.display = 'none';
            claimTypes.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type.id;
                opt.dataset.folder = type.folder_name;
                opt.textContent = type.name;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('[claims_new] init error:', err);
        const errEl = document.getElementById('claim-type-error');
        if (errEl) {
            errEl.style.display = 'block';
            errEl.textContent = 'Unable to load claim types. Please refresh or log in again.';
        }
    }

    let editId = new URLSearchParams(window.location.search).get('edit_id');

    // ─── FIX 1: Define syncWidth ONCE at module scope so it's accessible
    //            everywhere (contingent calcExpTotal, container listener, etc.)
    // ─────────────────────────────────────────────────────────────────────
    const syncWidthCanvas = document.createElement('canvas');
    function syncWidth(el) {
        const context = syncWidthCanvas.getContext('2d');
        const style = getComputedStyle(el);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const text = el.value.length > 0 ? el.value : (el.placeholder || '');
        const metrics = context.measureText(text);
        el.style.width = Math.ceil(metrics.width + 12) + 'px';
        el.scrollLeft = 0;
    }

    async function loadTemplate(selectedOpt, preventNameOverride = false) {
        const folderName = selectedOpt.dataset.folder;
        const typeName = selectedOpt.textContent;

        // ─── FIX 2: Use a single consistent reference; never re-declare with
        //            `const container` inside this function (was shadowing this).
        // ─────────────────────────────────────────────────────────────────────
        const templateContainer = document.getElementById('dynamic-template-container');
        const todayStr = document.getElementById('claim_date').value || new Date().toISOString().split('T')[0];

        if (!preventNameOverride) {
            if (typeName && typeName !== 'Select Type...') {
                document.getElementById('claim_name').value = typeName + '_' + currentUser.name + '_' + todayStr;
            } else {
                document.getElementById('claim_name').value = '';
            }
        }

        if (!folderName) {
            templateContainer.innerHTML = '';
            return;
        }

        try {
            const res = await fetch(`/claims/${folderName}/template.html?v=${new Date().getTime()}`);

            if (!res.ok) {
                // ─── FIX 3: Log HTTP status for easier debugging
                console.error(`[loadTemplate] HTTP ${res.status} for /claims/${folderName}/template.html`);
                templateContainer.innerHTML = '<p style="color:red;">Template not found for this claim type. (HTTP ' + res.status + ')</p>';
                return;
            }

            const html = await res.text();

            if (html.includes('id="login-container"')) {
                templateContainer.innerHTML = '<p style="color:red;">Template not found for this claim type.</p>';
                return;
            }

            templateContainer.innerHTML = html;

            // ── Auto-fill common user fields ──────────────────────────────────
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            };

            setVal('ltc_personal_no', currentUser.personal_no);
            setVal('ltc_name', currentUser.name);
            setVal('ltc_designation', currentUser.designation);

            setVal('mrc_personal_no', currentUser.personal_no);
            setVal('mrc_name', currentUser.name);
            setVal('mrc_cghs_ben_id', currentUser.cghs_ben_id);
            setVal('mrc_full_address', currentUser.address);
            setVal('mrc_mobile_number', currentUser.mobile_no);
            setVal('mrc_email', currentUser.email);
            setVal('declaration_name_desig', (currentUser.name || '') + (currentUser.designation ? ', ' + currentUser.designation : ''));

            // Autofill for Advance of Pay/TA (IAF A-194)
            setVal('advance_name', currentUser.name);
            setVal('advance_rank', currentUser.designation);
            setVal('advance_basic_pay', currentUser.basic_pay);
            setVal('advance_grade_pay', currentUser.pay_level);
            setVal('advance_authority_no', currentUser.authority || currentUser.orders_for_move);
            if (currentUser.move_date) {
                try {
                    const d = new Date(currentUser.move_date);
                    if (!isNaN(d.getTime())) {
                        setVal('advance_authority_date', d.toISOString().split('T')[0]);
                    }
                } catch (e) {
                    console.error('[claims_new] move_date formatting error:', e);
                }
            }
            if (currentUser.dependents && Array.isArray(currentUser.dependents)) {
                const familyStr = currentUser.dependents.map(dep => {
                    let ageStr = '';
                    if (dep.dob) {
                        const dob = new Date(dep.dob);
                        if (!isNaN(dob.getTime())) {
                            const age = Math.abs(new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970);
                            ageStr = `, ${age} yrs`;
                        }
                    }
                    return `${dep.name} (${dep.relationship || 'Dependent'}${ageStr})`;
                }).join(', ');
                setVal('advance_family_details', familyStr);
            }

            // Real-time amount to words conversion for IAF A-194 Requisition
            const amtNumEl = document.getElementById('advance_amount_num');
            const amtWordsEl = document.getElementById('advance_amount_words');

            function convertNumberToWords(num) {
                const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
                    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
                    'Seventeen ', 'Eighteen ', 'Nineteen '];
                const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

                function convert(n) {
                    if (n < 20) return a[n];
                    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 > 0 ? '-' + a[n % 10] : '') + ' ';
                    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 > 0 ? 'and ' + convert(n % 100) : '');
                    return '';
                }

                let n = Math.floor(num);
                if (n === 0) return 'Zero';
                let str = '';
                const groups = [
                    { unit: 'Crore ', val: 10000000 },
                    { unit: 'Lakh ', val: 100000 },
                    { unit: 'Thousand ', val: 1000 },
                    { unit: 'Hundred ', val: 100 }
                ];
                for (const g of groups) {
                    const gVal = Math.floor(n / g.val);
                    if (gVal > 0) { str += convert(gVal) + g.unit; n %= g.val; }
                }
                if (n > 0) { if (str !== '') str += 'and '; str += convert(n); }
                const p = Math.round((num - Math.floor(num)) * 100);
                if (p > 0) str += 'and ' + convert(p) + 'Paisa ';
                return str.trim();
            }

            if (amtNumEl && amtWordsEl) {
                const handleAmtInput = () => {
                    const val = parseFloat(amtNumEl.value);
                    if (!isNaN(val) && val > 0) {
                        amtWordsEl.value = convertNumberToWords(val);
                    } else {
                        amtWordsEl.value = '';
                    }
                };
                amtNumEl.addEventListener('input', handleAmtInput);
                // Trigger once in case edit mode loads an existing number
                handleAmtInput();
            }

            const affidavitEl = document.getElementById('affidavitText');
            if (affidavitEl) {
                affidavitEl.dataset.templateText = affidavitEl.value;
                const updateAffidavit = () => {
                    const name = currentUser.name || '';
                    const address = document.getElementById('mrc_full_address')?.value || '';
                    let text = affidavitEl.dataset.templateText;
                    text = text.replace('[Your Name]', name);
                    text = text.replace('[Employee Name]', name);
                    text = text.replace('[Address]', address);
                    affidavitEl.value = text;
                };
                const addressInput = document.getElementById('mrc_full_address');
                if (addressInput) {
                    addressInput.addEventListener('input', updateAffidavit);
                }
                updateAffidavit();
            }

            // ── Date helpers ──────────────────────────────────────────────────
            function getTodayDDMMYYYY() {
                const d = new Date();
                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            }
            const todayFormatted = getTodayDDMMYYYY();

            setVal('declaration_date', todayFormatted);
            setVal('affidavit_date', todayFormatted);
            setVal('ltc_int_name', currentUser.name);
            setVal('ltc_int_designation', currentUser.designation);

            // ── LTC Final Template ────────────────────────────────────────────
            if (document.getElementById('ltc_final_personal_name')) {
                setVal('ltc_final_personal_name', currentUser.name);
                setVal('ltc_final_designation', currentUser.designation);
                setVal('ltc_final_personal_no', currentUser.personal_no);
                setVal('ltc_final_basic_pay', currentUser.basic_pay);

                document.querySelectorAll('.ltc_final_name_sync').forEach(el => el.value = currentUser.name || '');
                document.querySelectorAll('.ltc_final_pno_sync').forEach(el => el.value = currentUser.personal_no || '');
                document.querySelectorAll('.ltc_final_desig_sync').forEach(el => el.value = currentUser.designation || '');
                document.querySelectorAll('.ltc_final_date_sync').forEach(el => el.value = todayFormatted);
            }

            // ── TD (Temporary Duty) Template ──────────────────────────────────
            if (folderName === 'td') {
                setVal('td_orders_for_move', currentUser.orders_for_move);
                setVal('td_move_date', currentUser.move_date);
                setVal('td_authority', currentUser.authority);

                // Format: Basic Pay + Pay Level (e.g., 56100 + Level 8)
                const basicPay = currentUser.basic_pay || '';
                let payLevel = currentUser.pay_level || '';
                if (payLevel && !String(payLevel).toLowerCase().includes('level')) {
                    payLevel = 'Level ' + payLevel;
                }
                const payDisplay = payLevel ? `${basicPay} + ${payLevel}` : basicPay;
                setVal('ltc_final_basic_pay', payDisplay);
            }

            // ── Permanent Transfer Template ──────────────────────────────────
            if (folderName === 'permanent_transfer') {
                setVal('td_orders_for_move', currentUser.orders_for_move);
                setVal('td_move_date', currentUser.move_date);
                setVal('td_authority', currentUser.authority);

                const basicPay = currentUser.basic_pay || '';
                let payLevel = currentUser.pay_level || '';
                if (payLevel && !String(payLevel).toLowerCase().includes('level')) {
                    payLevel = 'Level ' + payLevel;
                }
                const payDisplay = payLevel ? `${basicPay} + ${payLevel}` : basicPay;
                setVal('ltc_final_basic_pay', payDisplay);
            }

            // ── Newspaper Template ────────────────────────────────────────────
            if (folderName === 'newspaper') {
                setVal('appName', currentUser.name);
                setVal('designation', currentUser.designation);
                setVal('sigName', currentUser.name);

                const payLevelEl = document.getElementById('payLevel');
                if (payLevelEl) {
                    let payVal = '';
                    if (currentUser.pay_level) payVal += 'Level ' + currentUser.pay_level;
                    if (currentUser.basic_pay) payVal += (payVal ? ', ' : '') + 'Rs. ' + currentUser.basic_pay;
                    payLevelEl.value = payVal;
                }

                const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                const d = new Date();
                setVal('dateField', d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear());

                const periodSel = document.getElementById('periodSel');
                if (periodSel) {
                    periodSel.addEventListener('change', function () {
                        const yearInput = document.getElementById('yearInput');
                        if (yearInput && !yearInput.value) {
                            yearInput.value = String(new Date().getFullYear()).slice(2);
                        }
                    });
                }

                const appNameEl = document.getElementById('appName');
                if (appNameEl) {
                    appNameEl.addEventListener('input', function () {
                        const sigName = document.getElementById('sigName');
                        if (sigName) sigName.value = this.value;
                    });
                }
            }

            // ── GPF Advance Template ──────────────────────────────────────────
            if (folderName === 'gpf_advance') {
                setVal('gpf_name', currentUser.name);
                setVal('gpf_designation', currentUser.designation);
                setVal('gpf_sig_name', currentUser.name);
                setVal('gpf_sig_desig', (currentUser.designation || '') + (currentUser.personal_no ? ' / ' + currentUser.personal_no : ''));
                setVal('gpf_account_no', currentUser.gpf_ac_no || currentUser.personal_no || '');

                // Format pay as "Basic Pay + Pay Level"
                const gpfBasicPay = currentUser.basic_pay || '';
                let gpfPayLevel = currentUser.pay_level || '';
                if (gpfPayLevel && !String(gpfPayLevel).toLowerCase().includes('level')) {
                    gpfPayLevel = 'Level ' + gpfPayLevel;
                }
                setVal('gpf_pay', gpfBasicPay ? `${gpfBasicPay}${gpfPayLevel ? ' (' + gpfPayLevel + ')' : ''}` : '');

                // Set today's date in dd/mm/yy format
                const d = new Date();
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yy = String(d.getFullYear()).slice(-2);
                setVal('gpf_date', `${dd}/${mm}/${yy}`);

                const recalcGPFAdvanceNet = () => {
                    const closing    = parseFloat(document.querySelector('[name="gpf_bal_closing"]')?.value.replace(/[^0-9.-]/g,'')) || 0;
                    const contrib    = parseFloat(document.querySelector('[name="gpf_bal_contrib"]')?.value.replace(/[^0-9.-]/g,'')) || 0;
                    const refunds    = parseFloat(document.querySelector('[name="gpf_bal_refund"]')?.value.replace(/[^0-9.-]/g,'')) || 0;
                    const withdrawal = parseFloat(document.querySelector('[name="gpf_bal_withdrawal"]')?.value.replace(/[^0-9.-]/g,'')) || 0;
                    const net = closing + contrib + refunds - withdrawal;
                    const display = document.getElementById('gpf_net_balance_display');
                    const hidden  = document.getElementById('gpf_net_balance');
                    if (display) display.textContent = '₹ ' + net.toLocaleString('en-IN');
                    if (hidden)  hidden.value = net;
                };

                const balanceFields = ['gpf_bal_closing', 'gpf_bal_contrib', 'gpf_bal_refund', 'gpf_bal_withdrawal'];
                balanceFields.forEach(n => {
                    const el = document.querySelector(`[name="${n}"]`);
                    if (el) el.addEventListener('input', recalcGPFAdvanceNet);
                });
                window.recalcGPFAdvanceNet = recalcGPFAdvanceNet;
                recalcGPFAdvanceNet();
            }

            // ── GPF Final Withdrawal Template ─────────────────────────────────
            if (folderName === 'gpf-final-withdrawl') {
                setVal('gpfno', currentUser.gpf_ac_no || currentUser.personal_no || '');
                setVal('name', currentUser.name);
                setVal('acno', currentUser.gpf_ac_no || currentUser.personal_no || '');
                setVal('desig', currentUser.designation);
                setVal('pay', currentUser.basic_pay || '');
                setVal('signame', (currentUser.name || '') + (currentUser.designation ? ' / ' + currentUser.designation : ''));
                setVal('siggpf', currentUser.gpf_ac_no || currentUser.personal_no || '');

                // Set today's date in dd/mm/yy format
                const d = new Date();
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yy = String(d.getFullYear()).slice(-2);
                setVal('dated', `${dd}/${mm}/${yy}`);

                const recalcGPFFinalNet = () => {
                    const closing    = parseFloat(document.querySelector('[name="gpf_bal_closing"]')?.value.replace(/[^0-9.-]/g,'')) || 0;
                    const contrib    = parseFloat(document.querySelector('[name="gpf_bal_contrib"]')?.value.replace(/[^0-9.-]/g,'')) || 0;
                    const refunds    = parseFloat(document.querySelector('[name="gpf_bal_refund"]')?.value.replace(/[^0-9.-]/g,'')) || 0;
                    const withdrawal = parseFloat(document.querySelector('[name="gpf_bal_withdrawal"]')?.value.replace(/[^0-9.-]/g,'')) || 0;
                    
                    const net = closing + contrib + refunds - withdrawal;
                    
                    const netDisplay = document.getElementById('gpf_final_net_balance_display');
                    const netHidden = document.getElementById('gpf_net_balance');
                    if (netDisplay) netDisplay.textContent = '₹ ' + net.toLocaleString('en-IN');
                    if (netHidden) netHidden.value = net;

                    const halfBal = document.getElementById('gpf_half_balance');
                    if (halfBal) halfBal.value = '₹ ' + Math.round(net / 2).toLocaleString('en-IN');

                    const threeQuarterBal = document.getElementById('gpf_three_quarter_balance');
                    if (threeQuarterBal) threeQuarterBal.value = '₹ ' + Math.round(net * 0.75).toLocaleString('en-IN');

                    // Robustly extract the first sequence of digits for the basic pay (ignores suffix/level strings like "Level 9")
                    const payStr = (document.getElementById('pay')?.value || '').trim();
                    const payMatch = payStr.match(/\d+/);
                    const payVal = payMatch ? parseFloat(payMatch[0]) : 0;
                    
                    const sixMonthsPay = document.getElementById('gpf_six_months_pay');
                    if (sixMonthsPay) sixMonthsPay.value = '₹ ' + Math.round(payVal * 6).toLocaleString('en-IN');
                };

                const balanceFields = ['gpf_bal_closing', 'gpf_bal_contrib', 'gpf_bal_refund', 'gpf_bal_withdrawal'];
                balanceFields.forEach(n => {
                    const el = document.querySelector(`[name="${n}"]`);
                    if (el) el.addEventListener('input', recalcGPFFinalNet);
                });
                
                const payEl = document.getElementById('pay');
                if (payEl) payEl.addEventListener('input', recalcGPFFinalNet);

                // Synchronize all three GPF A/C Number input fields in real-time
                const gpfTop = document.getElementById('gpfno');
                const gpfAcno = document.getElementById('acno');
                const gpfSig = document.getElementById('siggpf');

                const syncGPFAccount = (val) => {
                    if (gpfTop && gpfTop.value !== val) gpfTop.value = val;
                    if (gpfAcno && gpfAcno.value !== val) gpfAcno.value = val;
                    if (gpfSig && gpfSig.value !== val) gpfSig.value = val;
                };

                [gpfTop, gpfAcno, gpfSig].forEach(el => {
                    if (el) {
                        el.addEventListener('input', (e) => syncGPFAccount(e.target.value));
                    }
                });

                window.recalcGPFFinalNet = recalcGPFFinalNet;
                recalcGPFFinalNet();
            }

            // ── Contingent Bill Template ──────────────────────────────────────
            if (folderName === 'contingent') {
                const expBody = document.getElementById('cbExpBody');
                const addRowBtn = document.getElementById('cbAddRowBtn');

                function addExpRow(date = '', details = '', amount = '') {
                    if (!expBody) return;
                    const rowCount = expBody.rows.length + 1;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="cb-col-sno">${rowCount}</td>
                        <td class="cb-col-date"><input type="date" name="exp_date_${rowCount}" value="${date}"></td>
                        <td class="cb-col-det"><input type="text" name="exp_details_${rowCount}" value="${details}"></td>
                        <td class="cb-col-amt"><input type="text" name="exp_amount_${rowCount}" class="cb-row-amt" value="${amount}" style="text-align:right;"></td>
                        <td class="no-print" style="text-align:center;"><button type="button" class="cb-btn-rm">✕</button></td>
                    `;
                    expBody.appendChild(tr);
                }

                function renumberExpRows() {
                    const rows = expBody.rows;
                    for (let i = 0; i < rows.length; i++) {
                        const num = i + 1;
                        rows[i].cells[0].textContent = num;
                        rows[i].querySelectorAll('input').forEach(input => {
                            if (input.name) input.name = input.name.replace(/_\d+$/, '_' + num);
                        });
                    }
                }

                function numToWords(num) {
                    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
                        'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
                        'Seventeen ', 'Eighteen ', 'Nineteen '];
                    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

                    function convert(n) {
                        if (n < 20) return a[n];
                        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 > 0 ? '-' + a[n % 10] : '') + ' ';
                        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 > 0 ? 'and ' + convert(n % 100) : '');
                        return '';
                    }

                    let n = Math.floor(num);
                    if (n === 0) return 'Zero';
                    let str = '';
                    const groups = [
                        { unit: 'Crore ', val: 10000000 },
                        { unit: 'Lakh ', val: 100000 },
                        { unit: 'Thousand ', val: 1000 },
                        { unit: 'Hundred ', val: 100 }
                    ];
                    for (const g of groups) {
                        const gVal = Math.floor(n / g.val);
                        if (gVal > 0) { str += convert(gVal) + g.unit; n %= g.val; }
                    }
                    if (n > 0) { if (str !== '') str += 'and '; str += convert(n); }
                    const p = Math.round((num - Math.floor(num)) * 100);
                    if (p > 0) str += 'and ' + convert(p) + 'Paisa ';
                    return str.trim();
                }

                // ─── FIX 4: syncWidth is now in outer scope — safe to call here
                window.calcExpTotal = function () {
                    let sum = 0;
                    document.querySelectorAll('.cb-row-amt').forEach(inp => {
                        const val = parseFloat(inp.value);
                        if (!isNaN(val)) sum += val;
                    });
                    const totalField = document.getElementById('totalAmt');
                    if (totalField) totalField.value = sum.toFixed(2);

                    const wordsField = document.getElementById('amtWords');
                    if (wordsField) {
                        wordsField.value = sum > 0 ? numToWords(sum) : '';
                        syncWidth(wordsField); // safe — defined at module scope
                    }
                };

                if (addRowBtn) addRowBtn.addEventListener('click', addExpRow);

                if (expBody) {
                    expBody.addEventListener('click', (e) => {
                        if (e.target.classList.contains('cb-btn-rm')) {
                            e.target.closest('tr').remove();
                            renumberExpRows();
                            window.calcExpTotal();
                        }
                    });
                    expBody.addEventListener('input', (e) => {
                        if (e.target.classList.contains('cb-row-amt')) window.calcExpTotal();
                    });
                    if (expBody.rows.length === 0) addExpRow();
                }

                setVal('nameDesig', (currentUser.name || '') + ', ' + (currentUser.designation || ''));
                const billDateEl = document.getElementById('billDate');
                if (billDateEl) billDateEl.value = new Date().toISOString().split('T')[0];
            }

            // ── General dynamic-input width sync (uses module-scoped syncWidth)
            // ─── FIX 5: Renamed inner `container` → `templateContainer` (no shadow)
            templateContainer.addEventListener('input', (e) => {
                if (e.target.classList.contains('dynamic-input')) {
                    syncWidth(e.target);
                    e.target.scrollLeft = 0;
                }
                // Sync contenteditable stations → hidden inputs
                if (e.target.classList.contains('ltc-station-sync')) {
                    const name = e.target.dataset.name;
                    const hiddenInput = e.target.parentElement.querySelector(`input[name="${name}"]`);
                    if (hiddenInput) hiddenInput.value = e.target.innerText;
                }
            });

            // ── LTC calc listener (document-level, registered only once) ──────
            if (!window.ltcCalcInitialized) {
                document.addEventListener('input', (e) => {
                    const isLtcTrigger = e.target.classList.contains('ltc-calc-trigger');
                    const isPtTrigger = e.target.classList.contains('pt-calc-trigger');
                    if (!isLtcTrigger && !isPtTrigger) return;

                    const tr = e.target.closest('tr');
                    if (tr) {
                        // Journey row: Fare × Persons
                        const fareInp = tr.querySelector('input[name*="_fare_"]');
                        const persInp = tr.querySelector('input[name*="_persons_"]');
                        if (fareInp && persInp) {
                            const fare = parseFloat(fareInp.value) || 0;
                            const pers = parseFloat(persInp.value) || 0;
                            const rowTotal = tr.querySelector('.ltc-journey-total-amt');
                            if (rowTotal) rowTotal.value = (fare * pers) > 0 ? (fare * pers).toFixed(2) : '';
                        }

                        // Daily expense: Days × Rate
                        const inputName = e.target.name || e.target.getAttribute('name');
                        if (inputName && inputName.startsWith('td_')) {
                            const lastUnderscore = inputName.lastIndexOf('_');
                            if (lastUnderscore !== -1) {
                                const prefix = inputName.substring(0, lastUnderscore);
                                const daysInp = tr.querySelector(`input[name="${prefix}_days"]`);
                                const rateInp = tr.querySelector(`input[name="${prefix}_rate"]`);
                                const totalInp = tr.querySelector(`input[name="${prefix}_total"]`);
                                if (daysInp && rateInp && totalInp) {
                                    const days = parseFloat(daysInp.value) || 0;
                                    const rate = parseFloat(rateInp.value) || 0;
                                    totalInp.value = (days * rate) > 0 ? (days * rate).toFixed(2) : '';
                                }
                            }
                        }
                    }

                    if (typeof window.ltcFinalRecalcTotal === 'function') window.ltcFinalRecalcTotal();
                });
                window.ltcCalcInitialized = true;
            }

            // ── LTC Final detailed logic ──────────────────────────────────────
            if (document.getElementById('ltc_final_personal_name')) {

                function ltcFinalAddFamilyRow(name, age, relationship) {
                    const tbody = document.getElementById('ltcFinalFamilyBody');
                    if (!tbody) return;
                    const rowCount = tbody.rows.length + 1;
                    const tr = document.createElement('tr');
                    tr.innerHTML =
                        `<td style="text-align:center;">${rowCount}</td>` +
                        `<td><input type="text" name="family_name_${rowCount}" value="${name || ''}" class="no-border-input"></td>` +
                        `<td><input type="text" name="family_age_${rowCount}" value="${age || ''}" class="no-border-input"></td>` +
                        `<td><input type="text" name="family_relationship_${rowCount}" value="${relationship || ''}" class="no-border-input"></td>` +
                        `<td class="no-print"><button type="button" class="ltc-final-del-family" style="border:none;background:transparent;color:#ef4444;cursor:pointer;padding:0;width:100%;font-size:14px;">✕</button></td>`;
                    tbody.appendChild(tr);
                }

                function ltcFinalRenumberFamily() {
                    const tbody = document.getElementById('ltcFinalFamilyBody');
                    if (!tbody) return;
                    Array.from(tbody.rows).forEach((row, i) => {
                        const num = i + 1;
                        row.cells[0].textContent = num;
                        row.querySelectorAll('input').forEach(inp => {
                            if (inp.name) inp.name = inp.name.replace(/_\d+$/, '_' + num);
                        });
                    });
                }

                const addFamBtn = document.getElementById('ltcFinalAddFamilyBtn');
                if (addFamBtn) addFamBtn.addEventListener('click', () => ltcFinalAddFamilyRow('', '', ''));

                const famTable = document.getElementById('ltcFinalFamilyTable');
                if (famTable) {
                    famTable.addEventListener('click', (e) => {
                        if (e.target.classList.contains('ltc-final-del-family')) {
                            const tbody = document.getElementById('ltcFinalFamilyBody');
                            if (tbody && tbody.rows.length > 0) {
                                e.target.closest('tr').remove();
                                ltcFinalRenumberFamily();
                            }
                        }
                    });
                }

                let ltcJourneyCount = 1;

                window.ltcFinalRecalcTotal = function () {
                    let journeySum = 0;
                    document.querySelectorAll('.ltc-journey-total-amt').forEach(inp => {
                        const val = parseFloat(inp.value);
                        if (!isNaN(val)) journeySum += val;
                    });

                    // Check if we have Permanent Transfer relocation elements
                    const ptTotals = document.querySelectorAll('.pt-reloc-total');
                    if (ptTotals.length > 0) {
                        let relocSum = 0;
                        ptTotals.forEach(inp => {
                            const val = parseFloat(inp.value);
                            if (!isNaN(val)) relocSum += val;
                        });

                        const relocSubtotalInput = document.getElementById('pt_reloc_expenses_subtotal');
                        if (relocSubtotalInput) relocSubtotalInput.value = relocSum > 0 ? relocSum.toFixed(2) : '';

                        const totalJourneyField = document.getElementById('ltcFinalJourneyTotal');
                        if (totalJourneyField) totalJourneyField.value = journeySum > 0 ? journeySum.toFixed(2) : '';

                        const grandTotal = journeySum + relocSum;
                        const totalClaimed = document.getElementById('ltcFinalTotalClaimed');
                        if (totalClaimed) totalClaimed.value = grandTotal > 0 ? grandTotal.toFixed(2) : '';

                        const lessAdvance = parseFloat(document.getElementById('ltcFinalLessAdvance')?.value) || 0;
                        const balanceField = document.getElementById('ltcFinalBalanceDue');
                        if (balanceField) balanceField.value = (grandTotal - lessAdvance) !== 0 ? (grandTotal - lessAdvance).toFixed(2) : '';
                    } else {
                        let dailySum = 0;
                        document.querySelectorAll('.ltc-daily-total').forEach(inp => {
                            const val = parseFloat(inp.value);
                            if (!isNaN(val)) dailySum += val;
                        });

                        const totalJourneyField = document.getElementById('ltcFinalJourneyTotal');
                        if (totalJourneyField) totalJourneyField.value = journeySum > 0 ? journeySum.toFixed(2) : '';

                        const grandTotal = journeySum + dailySum;
                        const totalClaimed = document.getElementById('ltcFinalTotalClaimed');
                        if (totalClaimed) totalClaimed.value = grandTotal > 0 ? grandTotal.toFixed(2) : '';

                        const dailySubtotalSpan = document.getElementById('tdDailyExpensesSubtotal');
                        if (dailySubtotalSpan) dailySubtotalSpan.textContent = dailySum.toFixed(2);

                        const lessAdvance = parseFloat(document.getElementById('ltcFinalLessAdvance')?.value) || 0;
                        const balanceField = document.getElementById('ltcFinalBalanceDue');
                        if (balanceField) balanceField.value = (grandTotal - lessAdvance) !== 0 ? (grandTotal - lessAdvance).toFixed(2) : '';
                    }
                };

                function ltcFinalRecalcBalance() {
                    const totalClaimed = parseFloat(document.getElementById('ltcFinalTotalClaimed')?.value) || 0;
                    const lessAdvance = parseFloat(document.getElementById('ltcFinalLessAdvance')?.value) || 0;
                    const balanceField = document.getElementById('ltcFinalBalanceDue');
                    if (balanceField) balanceField.value = (totalClaimed - lessAdvance) !== 0 ? (totalClaimed - lessAdvance).toFixed(2) : '';
                }

                const advInput = document.getElementById('ltcFinalLessAdvance');
                if (advInput) advInput.addEventListener('input', ltcFinalRecalcBalance);

                function ltcFinalAddJourneyRow() {
                    const tbody = document.getElementById('ltcFinalJourneyBody');
                    if (!tbody) return;
                    ltcJourneyCount = tbody.rows.length + 1;
                    const n = ltcJourneyCount;
                    const tr = document.createElement('tr');
                    tr.innerHTML =
                        `<td><div contenteditable="true" class="editable-td ltc-station-sync" data-name="journey_dep_station_${n}"></div><input type="hidden" name="journey_dep_station_${n}"></td>` +
                        `<td><input type="text" name="journey_dep_date_${n}" class="no-border-input" placeholder="dd/mm/yy"><input type="time" name="journey_dep_time_${n}" class="no-border-input"></td>` +
                        `<td><div contenteditable="true" class="editable-td ltc-station-sync" data-name="journey_arr_station_${n}"></div><input type="hidden" name="journey_arr_station_${n}"></td>` +
                        `<td><input type="text" name="journey_arr_date_${n}" class="no-border-input" placeholder="dd/mm/yy"><input type="time" name="journey_arr_time_${n}" class="no-border-input"></td>` +
                        `<td><input type="text" name="journey_dist_${n}" class="no-border-input"></td>` +
                        `<td><input type="text" name="journey_mode_${n}" class="no-border-input"></td>` +
                        `<td><input type="number" name="journey_fare_${n}" class="no-border-input ltc-calc-trigger"></td>` +
                        `<td><input type="number" name="journey_persons_${n}" class="no-border-input ltc-calc-trigger"></td>` +
                        `<td><input type="number" name="journey_total_amt_${n}" class="no-border-input ltc-journey-total-amt font-bold"></td>` +
                        `<td><input type="text" name="journey_ticket_no_${n}" class="no-border-input"></td>` +
                        `<td class="no-print"><button type="button" class="ltc-final-del-row" style="border:none;background:transparent;color:#ef4444;cursor:pointer;padding:0;width:100%;font-size:14px;">✕</button></td>`;
                    tbody.appendChild(tr);
                }

                function ltcFinalRenumberJourney() {
                    const tbody = document.getElementById('ltcFinalJourneyBody');
                    if (!tbody) return;
                    Array.from(tbody.rows).forEach((row, i) => {
                        row.querySelectorAll('input').forEach(inp => {
                            if (inp.name) inp.name = inp.name.replace(/_\d+$/, '_' + (i + 1));
                        });
                    });
                }

                const addJourneyBtn = document.getElementById('ltcFinalAddJourneyBtn');
                if (addJourneyBtn) addJourneyBtn.addEventListener('click', ltcFinalAddJourneyRow);

                const journeyTable = document.getElementById('ltcFinalJourneyTable');
                if (journeyTable) {
                    journeyTable.addEventListener('click', (e) => {
                        if (e.target.classList.contains('ltc-final-del-row')) {
                            const tbody = document.getElementById('ltcFinalJourneyBody');
                            if (tbody && tbody.rows.length > 1) {
                                e.target.closest('tr').remove();
                                ltcFinalRenumberJourney();
                                window.ltcFinalRecalcTotal();
                            }
                        }
                    });
                    journeyTable.addEventListener('input', (e) => {
                        if (e.target.classList.contains('ltc-journey-total-amt')) window.ltcFinalRecalcTotal();
                    });
                    journeyTable.addEventListener('change', (e) => {
                        const name = e.target.name || '';
                        if (name.startsWith('journey_dep_date_') || name.startsWith('journey_arr_date_')) {
                            const num = name.split('_').pop();
                            const depInput = document.querySelector(`[name="journey_dep_date_${num}"]`);
                            const arrInput = document.querySelector(`[name="journey_arr_date_${num}"]`);
                            if (depInput && arrInput && depInput.value && arrInput.value) {
                                if (new Date(depInput.value) > new Date(arrInput.value)) {
                                    alert('Departure Date must be before or equal to Arrival Date.');
                                    arrInput.value = '';
                                }
                            }
                        }
                        if (name.startsWith('journey_dep_time_') || name.startsWith('journey_arr_time_')) {
                            const num = name.split('_').pop();
                            const depDate = document.querySelector(`[name="journey_dep_date_${num}"]`)?.value;
                            const arrDate = document.querySelector(`[name="journey_arr_date_${num}"]`)?.value;
                            const depTimeInp = document.querySelector(`[name="journey_dep_time_${num}"]`);
                            const arrTimeInp = document.querySelector(`[name="journey_arr_time_${num}"]`);
                            if (depDate && arrDate && depDate === arrDate && depTimeInp?.value && arrTimeInp?.value) {
                                if (depTimeInp.value >= arrTimeInp.value) {
                                    alert('Departure Time must be before Arrival Time on the same day.');
                                    arrTimeInp.value = '';
                                }
                            }
                        }
                    });
                }

                // Family dropdown for LTC Final
                const ltcFinalFamSelect = document.getElementById('ltc_final_family');
                if (ltcFinalFamSelect && currentUser.dependents) {
                    const selfOpt = document.createElement('option');
                    selfOpt.value = 'Self';
                    selfOpt.dataset.dob = '';
                    selfOpt.dataset.relationship = 'Self';
                    selfOpt.textContent = 'Self';
                    ltcFinalFamSelect.appendChild(selfOpt);

                    currentUser.dependents.forEach(dep => {
                        const opt = document.createElement('option');
                        opt.value = dep.name;
                        opt.dataset.dob = dep.dob || '';
                        opt.dataset.relationship = dep.relationship || '';
                        opt.textContent = dep.name + ' (' + dep.relationship + ')';
                        ltcFinalFamSelect.appendChild(opt);
                    });

                    ltcFinalFamSelect.addEventListener('change', () => {
                        const opt = ltcFinalFamSelect.options[ltcFinalFamSelect.selectedIndex];
                        if (!opt.value) return;

                        // Duplicate check
                        const tbody = document.getElementById('ltcFinalFamilyBody');
                        if (tbody) {
                            for (const row of tbody.rows) {
                                const inp = row.querySelector('input[name^="family_name_"]');
                                if (inp && inp.value === opt.value) {
                                    alert('This family member is already added.');
                                    ltcFinalFamSelect.selectedIndex = 0;
                                    return;
                                }
                            }
                        }

                        let age = '';
                        if (opt.dataset.dob) {
                            const dob = new Date(opt.dataset.dob);
                            if (!isNaN(dob.getTime())) {
                                age = Math.abs(new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970);
                            }
                        }
                        ltcFinalAddFamilyRow(opt.value, age, opt.dataset.relationship || 'Self');
                        ltcFinalFamSelect.selectedIndex = 0;
                    });
                }
            }

            // ── LTC Intimation Template ───────────────────────────────────────
            if (document.getElementById('ltc_int_from')) {
                setVal('ltc_int_from', currentUser.name);
                setVal('ltc_int_emp_name', currentUser.name);
                setVal('ltc_int_emp_grade', currentUser.designation);
                setVal('ltc_int_emp_ac', currentUser.personal_no);
                setVal('ltc_int_date', todayStr);

                const intFamBody = document.getElementById('ltc_int_family_body');
                const intAddBtn = document.getElementById('ltc_int_add_family_btn');

                function ltcIntUpdateFamilyOptions() {
                    const selects = document.querySelectorAll('.ltc-int-family-sel');
                    const selectedValues = Array.from(selects).map(s => s.value).filter(v => v !== '');
                    selects.forEach(sel => {
                        const currentVal = sel.value;
                        Array.from(sel.options).forEach(opt => {
                            if (!opt.value || opt.value === 'Select Member...') return;
                            opt.disabled = selectedValues.includes(opt.value) && opt.value !== currentVal;
                            opt.style.color = opt.disabled ? '#ccc' : '';
                        });
                    });
                }

                function ltcIntAddFamilyRow(name = '', rel = '', age = '') {
                    if (!intFamBody) return;
                    const rowCount = intFamBody.rows.length + 1;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="border border-gray-400 p-1">
                            <select name="ltc_int_family_member_${rowCount}" class="w-full border-0 ltc-int-family-sel">
                                <option value="">Select Member...</option>
                                <option value="Self" data-rel="Self" ${name === 'Self' ? 'selected' : ''}>Self</option>
                                ${(currentUser.dependents || []).map(dep => `
                                    <option value="${dep.name}" data-dob="${dep.dob || ''}" data-rel="${dep.relationship || ''}" ${name === dep.name ? 'selected' : ''}>
                                        ${dep.name}
                                    </option>`).join('')}
                            </select>
                        </td>
                        <td class="border border-gray-400 p-1">
                            <input type="text" name="ltc_int_family_rel_${rowCount}" class="w-full border-0 ltc-int-family-rel" value="${rel}" readonly placeholder="Auto">
                        </td>
                        <td class="border border-gray-400 p-1">
                            <input type="text" name="ltc_int_family_age_${rowCount}" class="w-full border-0 ltc-int-family-age" value="${age}" readonly placeholder="Auto">
                        </td>
                        <td class="border border-gray-400 p-1 text-center no-print" style="white-space: nowrap;">
                            <button type="button" class="ltc-int-add-family font-bold" style="font-size:12px;line-height:1;background:none;border:none;padding:2px 4px;cursor:pointer;color:var(--primary-color);margin-right:6px;" title="Add Member">＋</button>
                            <button type="button" class="ltc-int-del-family font-bold" style="font-size:12px;line-height:1;background:none;border:none;padding:2px 4px;cursor:pointer;color:var(--danger-color);" title="Remove Member">✕</button>
                        </td>
                    `;
                    intFamBody.appendChild(tr);
                    ltcIntUpdateFamilyOptions();
                }

                function ltcIntRenumberFamily() {
                    if (!intFamBody) return;
                    Array.from(intFamBody.rows).forEach((row, i) => {
                        const num = i + 1;
                        const sel = row.querySelector('select');
                        const inps = row.querySelectorAll('input');
                        if (sel) sel.name = `ltc_int_family_member_${num}`;
                        if (inps[0]) inps[0].name = `ltc_int_family_rel_${num}`;
                        if (inps[1]) inps[1].name = `ltc_int_family_age_${num}`;
                    });
                }

                // Row addition handled contextually inside action column buttons

                // Wire contextual action buttons → main buttons
                const actionBar = document.querySelector('.claim-action-bar');
                if (actionBar) actionBar.style.setProperty('display', 'none', 'important');

                const wireBtn = (ctxId, mainId) => {
                    const ctx = document.getElementById(ctxId);
                    const main = document.getElementById(mainId);
                    if (ctx && main) ctx.onclick = () => main.click();
                };
                wireBtn('ltc_int_btn_draft', 'btn-save-draft');
                wireBtn('ltc_int_btn_preview', 'btn-print-preview');
                wireBtn('ltc_int_btn_submit', 'btn-submit');

                if (intFamBody) {
                    intFamBody.addEventListener('click', (e) => {
                        if (e.target.classList.contains('ltc-int-del-family')) {
                            // Ensure we keep at least one row for validation and entry
                            if (intFamBody.rows.length > 1) {
                                e.target.closest('tr').remove();
                                ltcIntRenumberFamily();
                                ltcIntUpdateFamilyOptions();
                            } else {
                                alert('At least one family member/self row is required.');
                            }
                        } else if (e.target.classList.contains('ltc-int-add-family')) {
                            ltcIntAddFamilyRow();
                        }
                    });
                    intFamBody.addEventListener('change', (e) => {
                        if (e.target.classList.contains('ltc-int-family-sel')) {
                            const opt = e.target.options[e.target.selectedIndex];
                            const relInput = e.target.closest('tr').querySelector('.ltc-int-family-rel');
                            const ageInput = e.target.closest('tr').querySelector('.ltc-int-family-age');
                            if (relInput) relInput.value = opt.dataset.rel || '';
                            if (ageInput) {
                                if (opt.dataset.dob) {
                                    const dob = new Date(opt.dataset.dob);
                                    const age = new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970;
                                    ageInput.value = age >= 0 ? age : '0';
                                } else {
                                    ageInput.value = '';
                                }
                            }
                            ltcIntUpdateFamilyOptions();
                        }
                    });
                    if (intFamBody.rows.length === 0) ltcIntAddFamilyRow();
                }
            }

            // ── MRC Patient dropdown ──────────────────────────────────────────
            const patientSelect = document.getElementById('mrc_patient_name');
            if (patientSelect && currentUser.dependents) {
                currentUser.dependents.forEach(dep => {
                    const opt = document.createElement('option');
                    opt.value = dep.name;
                    opt.dataset.cghs = dep.cghs_ben_id || '';
                    opt.dataset.relation = dep.relationship || '';
                    opt.textContent = dep.name + ' (' + dep.relationship + ')';
                    patientSelect.appendChild(opt);
                });

                patientSelect.addEventListener('change', (ev) => {
                    const sel = ev.target;
                    const opt = sel.options[sel.selectedIndex];
                    const typeName = document.getElementById('claim_type').options[document.getElementById('claim_type').selectedIndex].textContent;
                    const dateStr = document.getElementById('claim_date').value || new Date().toISOString().split('T')[0];

                    const cghsEl = document.getElementById('mrc_patient_cghs');
                    const relEl = document.getElementById('mrc_patient_relation');
                    const nameEl = document.getElementById('claim_name');

                    if (sel.value === 'Self') {
                        if (cghsEl) cghsEl.value = currentUser.cghs_ben_id || '';
                        if (relEl) relEl.value = 'Self';
                        if (nameEl) nameEl.value = typeName + '_Self_' + currentUser.name + '_' + dateStr;
                    } else if (sel.value) {
                        if (cghsEl) cghsEl.value = opt.dataset.cghs || '';
                        if (relEl) relEl.value = opt.dataset.relation || '';
                        if (nameEl) nameEl.value = typeName + '_Dependent_' + sel.value + '_' + dateStr;
                    } else {
                        if (cghsEl) cghsEl.value = '';
                        if (relEl) relEl.value = '';
                        if (nameEl) nameEl.value = typeName + '_' + currentUser.name + '_' + dateStr;
                    }
                });
            }

            // ── Ward entitlement auto-set (dynamic DB rules) ──────────────────
            const wardSelect = document.querySelector('select[name="ward_entitlement"]');
            if (wardSelect) {
                const cleanPay = String(currentUser.basic_pay || '').replace(/,/g, '');
                const payMatch = cleanPay.match(/\d+/);
                const basicPay = payMatch ? parseInt(payMatch[0], 10) : 0;
                
                try {
                    // Fetch dynamic entitlement rules from database
                    const res = await fetch('/api/claims/ward-entitlements', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const rules = await res.json();
                        if (Array.isArray(rules) && rules.length > 0) {
                            const matchingRule = rules.find(rule => basicPay >= rule.min_pay && basicPay <= rule.max_pay);
                            if (matchingRule) {
                                wardSelect.value = matchingRule.ward_type;
                            }
                        } else {
                            // Fallback static rules if DB table is empty
                            wardSelect.value = basicPay <= 36500 ? 'General'
                                : basicPay <= 50500 ? 'Semi-Private'
                                : 'Private';
                        }
                    } else {
                        throw new Error(`HTTP ${res.status}`);
                    }
                } catch (err) {
                    console.error('Error fetching ward entitlements:', err);
                    // Fallback to static rule on network/API failure
                    wardSelect.value = basicPay <= 36500 ? 'General'
                        : basicPay <= 50500 ? 'Semi-Private'
                        : 'Private';
                }
            }

            // ── MRC auto-calculation ──────────────────────────────────────────
            const updateMRCTotal = () => {
                const opd = parseFloat(document.querySelector('input[name="opd_amount"]')?.value) || 0;
                const indoor = parseFloat(document.querySelector('input[name="indoor_amount"]')?.value) || 0;
                const test = parseFloat(document.querySelector('input[name="test_investigation_amount"]')?.value) || 0;
                const ins = parseFloat(document.querySelector('input[name="amount_claimed_received"]')?.value) || 0;
                const totalEl = document.getElementById('mrc_total_claimed');
                if (totalEl) totalEl.textContent = (opd + indoor + test - ins).toFixed(2);
            };
            ['opd_amount', 'indoor_amount', 'test_investigation_amount', 'amount_claimed_received'].forEach(n => {
                const el = document.querySelector(`input[name="${n}"]`);
                if (el) el.addEventListener('input', updateMRCTotal);
            });
            window.updateMRCTotal = updateMRCTotal;
            updateMRCTotal();

        } catch (err) {
            // ─── FIX 6: Show real error message in UI and console
            console.error('[loadTemplate] Unexpected error:', err);
            document.getElementById('dynamic-template-container').innerHTML =
                `<p style="color:red;">Error loading template: ${err.message}</p>`;
        }
    }

    function updatePageTitle(selectedOpt) {
        if (!selectedOpt) return;
        const h1 = document.querySelector('h1');
        if (!h1) return;
        
        // Hide the page heading for all selected templates to prevent duplicate headings
        h1.style.display = 'none';
    }

    // ── Claim type change handler ─────────────────────────────────────────────
    document.getElementById('claim_type').addEventListener('change', async (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        await loadTemplate(opt);
        updatePageTitle(opt);
    });

    const typeIdParam = new URLSearchParams(window.location.search).get('type_id');

    // ── Edit mode: load existing claim ───────────────────────────────────────
    if (editId) {
        try {
            const res = await fetch(`/api/claims/${editId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const claim = await res.json();
                const typeSelect = document.getElementById('claim_type');
                typeSelect.value = claim.type_id;

                const claimDateEl = document.getElementById('claim_date');
                if (claimDateEl) claimDateEl.value = new Date(claim.claim_date).toISOString().split('T')[0];

                // ─── FIX 7: Guard folder_name input — it may not exist
                const folderNameEl = document.getElementById('folder_name');
                if (folderNameEl) folderNameEl.value = claim.folder_name || '';

                await loadTemplate(typeSelect.options[typeSelect.selectedIndex], true);
                updatePageTitle(typeSelect.options[typeSelect.selectedIndex]);

                document.getElementById('claim_name').value = claim.claim_name;
                const remarksEl = document.getElementById('remarks');
                if (remarksEl) remarksEl.value = claim.remarks || '';

                const templateContainer = document.getElementById('dynamic-template-container');
                if (claim.data) {
                    // Reconstruct LTC Final dynamic rows
                    if (document.getElementById('ltc_final_personal_name')) {
                        let maxFam = 0;
                        Object.keys(claim.data).forEach(k => {
                            if (k.startsWith('family_name_')) {
                                const num = parseInt(k.split('_').pop());
                                if (num > maxFam) maxFam = num;
                            }
                        });
                        const famBody = document.getElementById('ltcFinalFamilyBody');
                        const addFamBtn = document.getElementById('ltcFinalAddFamilyBtn');
                        if (famBody && addFamBtn) {
                            while (famBody.rows.length < maxFam) addFamBtn.click();
                        }

                        let maxJourney = 0;
                        Object.keys(claim.data).forEach(k => {
                            if (k.startsWith('journey_dep_date_')) {
                                const num = parseInt(k.split('_').pop());
                                if (num > maxJourney) maxJourney = num;
                            }
                        });
                        const journeyBody = document.getElementById('ltcFinalJourneyBody');
                        const addJourneyBtn = document.getElementById('ltcFinalAddJourneyBtn');
                        if (journeyBody && addJourneyBtn) {
                            while (journeyBody.rows.length < maxJourney) addJourneyBtn.click();
                        }
                    }

                    // Reconstruct Contingent Bill rows
                    const cbExpBody = document.getElementById('cbExpBody');
                    if (cbExpBody) {
                        let maxExp = 0;
                        Object.keys(claim.data).forEach(k => {
                            if (k.startsWith('exp_date_')) {
                                const num = parseInt(k.split('_').pop());
                                if (num > maxExp) maxExp = num;
                            }
                        });
                        const addExpBtn = document.getElementById('cbAddRowBtn');
                        if (addExpBtn) {
                            while (cbExpBody.rows.length < maxExp) addExpBtn.click();
                        }
                    }

                    // Restore all field values
                    Object.keys(claim.data).forEach(key => {
                        const input = templateContainer.querySelector(`[name="${key}"]`);
                        if (!input) return;
                        if (input.type === 'checkbox' || input.type === 'radio') {
                            input.checked = (input.value === claim.data[key] || claim.data[key] === 'on' || claim.data[key] === true);
                        } else {
                            input.value = claim.data[key];
                        }
                    });

                    if (typeof window.ltcFinalRecalcTotal === 'function') window.ltcFinalRecalcTotal();
                    if (typeof window.calcExpTotal === 'function') window.calcExpTotal();
                    if (typeof window.updateMRCTotal === 'function') window.updateMRCTotal();
                    if (typeof window.recalcGPFAdvanceNet === 'function') window.recalcGPFAdvanceNet();
                    if (typeof window.recalcGPFFinalNet === 'function') window.recalcGPFFinalNet();
                }
            }
        } catch (e) {
            console.error('[claims_new] Error loading edit claim:', e);
        }

        // ── type_id param: pre-select type ───────────────────────────────────────
    } else if (typeIdParam) {
        const typeSelect = document.getElementById('claim_type');
        typeSelect.value = typeIdParam;
        if (typeSelect.selectedIndex > 0) {
            await loadTemplate(typeSelect.options[typeSelect.selectedIndex]);

            ['group-claim-type', 'group-claim-date', 'group-remarks', 'metadata-divider'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            const nameGroup = document.getElementById('group-claim-name');
            if (nameGroup) nameGroup.style.display = 'block';

            updatePageTitle(typeSelect.options[typeSelect.selectedIndex]);

            if (typeIdParam === '7') {
                const submitBtn = document.getElementById('btn-submit');
                const draftBtn = document.getElementById('btn-save-draft');
                if (submitBtn) submitBtn.style.display = 'none';
                if (draftBtn) draftBtn.textContent = 'Save & Finalize';
            }
        }
    }

    // ── Print preview ─────────────────────────────────────────────────────────
    document.getElementById('btn-print-preview').addEventListener('click', () => window.print());

    let pendingStatus = null;
    let pendingSaveMode = null;

    // ── Save claim ────────────────────────────────────────────────────────────
    async function saveClaim() {
        const type_id = document.getElementById('claim_type').value;
        const claim_name = document.getElementById('claim_name').value;
        const claim_date = document.getElementById('claim_date').value;
        const remarksEl = document.getElementById('remarks');
        const remarks = remarksEl ? remarksEl.value : '';

        // ─── FIX 8: folder_name is optional — don't crash if element missing
        const folderNameEl = document.getElementById('folder_name');
        const folder_name = folderNameEl ? folderNameEl.value : '';

        if (!type_id || !claim_name || !claim_date) {
            alert('Please fill out Claim Type, Name, and Date.');
            return;
        }

        const patientCghsInput = document.getElementById('mrc_patient_cghs');
        if (pendingStatus !== 'Draft' && patientCghsInput && !patientCghsInput.value.trim()) {
            const proceed = confirm("The patient's CGHS ID is missing. Continue without it? Click Cancel to update your profile.");
            if (!proceed) { window.location.href = '/profile.html'; return; }
        }

        const templateContainer = document.getElementById('dynamic-template-container');
        
        // Temporarily clear bank account and IFSC from the DOM before serializing to ensure they are NEVER saved/persisted on the server
        const bankAcctEl = templateContainer.querySelector('input[name="bank_account_no"]');
        const bankIfscEl = templateContainer.querySelector('input[name="bank_ifsc"]');
        let originalAcct = '';
        let originalIfsc = '';
        if (bankAcctEl) {
            originalAcct = bankAcctEl.value;
            bankAcctEl.value = '';
            bankAcctEl.removeAttribute('value');
        }
        if (bankIfscEl) {
            originalIfsc = bankIfscEl.value;
            bankIfscEl.value = '';
            bankIfscEl.removeAttribute('value');
        }

        const inputs = templateContainer.querySelectorAll('input, select, textarea');
        const formData = {};

        inputs.forEach(input => {
            if (input.name) {
                // Do not serialize bank details into the formData payload
                if (input.name === 'bank_account_no' || input.name === 'bank_ifsc') {
                    return;
                }
                formData[input.name] = input.value;
            }

            if (input.tagName === 'INPUT') {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    if (input.checked) input.setAttribute('checked', 'checked');
                    else input.removeAttribute('checked');
                } else {
                    input.setAttribute('value', input.value);
                }
            } else if (input.tagName === 'TEXTAREA') {
                input.textContent = input.value;
            } else if (input.tagName === 'SELECT') {
                Array.from(input.options).forEach(opt => {
                    if (opt.selected) opt.setAttribute('selected', 'selected');
                    else opt.removeAttribute('selected');
                });
            }
        });

        // Auto-save relevant profile fields
        const profileUpdate = {};
        const mrcCghsEl = document.getElementById('mrc_cghs_ben_id');
        if (mrcCghsEl) {
            profileUpdate.cghs_ben_id = mrcCghsEl.value;
            profileUpdate.address = document.getElementById('mrc_full_address')?.value || '';
            profileUpdate.mobile_no = document.getElementById('mrc_mobile_number')?.value || '';
            profileUpdate.email = document.getElementById('mrc_email')?.value || '';
        }

        if (Object.keys(profileUpdate).length > 0) {
            try {
                await fetch('/api/auth/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(profileUpdate)
                });
            } catch (e) {
                console.error('[saveClaim] Error auto-saving profile:', e);
            }
        }

        // Send raw innerHTML only — backend wraps with proper <title> and embedded CSS
        const htmlContent = templateContainer.innerHTML;

        // Restore bank account and IFSC details in the browser DOM so they remain visible for active view/printing
        if (bankAcctEl) bankAcctEl.value = originalAcct;
        if (bankIfscEl) bankIfscEl.value = originalIfsc;

        try {
            const payload = { type_id, claim_name, claim_date, remarks, folder_name, status: pendingStatus, formData, htmlContent };
            if (editId) {
                payload.parent_claim_id = editId;
                payload.save_mode = pendingSaveMode;
            }

            const res = await fetch('/api/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                if (pendingStatus === 'Draft') {
                    showCustomSuccessModal('draft');
                } else {
                    showCustomSuccessModal('submit');
                }
            } else {
                const data = await res.json();
                alert(data.message || 'Error saving claim');
            }
        } catch (err) {
            console.error('[saveClaim] Network error:', err);
            alert('Network error. Please try again.');
        }
    }

    function showCustomSuccessModal(type) {
        let modal = document.getElementById('custom-success-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-success-modal';
            modal.className = 'save-modal-overlay';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15, 23, 42, 0.6) !important;
                backdrop-filter: blur(12px) !important;
                display: none !important;
                align-items: center;
                justify-content: center;
                z-index: 99999 !important;
            `;
            modal.innerHTML = `
                <div class="save-modal-box" style="
                    background: white;
                    padding: 2.5rem;
                    border-radius: 24px;
                    max-width: 480px;
                    width: 90%;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                    text-align: center;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 56px;
                        height: 56px;
                        background: #ecfdf5;
                        border-radius: 50%;
                        margin: 0 auto 1.25rem auto;
                        border: 2px solid #a7f3d0;
                    ">
                        <svg style="width: 28px; height: 28px; color: #059669;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h3 id="success-modal-title" style="
                        color: #0f172a;
                        font-weight: 800;
                        font-size: 1.5rem;
                        margin: 0 0 0.25rem 0 !important;
                        font-family: 'Outfit', 'Inter', sans-serif;
                    ">Claim Saved</h3>
                    <p id="success-modal-desc" style="
                        color: #64748b;
                        font-size: 0.95rem;
                        margin: 0 0 1.5rem 0 !important;
                    ">Your claim has been successfully saved!</p>
                    <div style="
                        border-radius: 16px;
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                        margin-bottom: 1.75rem;
                        background: #f8fafc;
                        padding: 8px;
                    ">
                        <img id="success-modal-img" src="" alt="Claim Cartoon" style="
                            width: 100%;
                            height: auto;
                            display: block;
                            border-radius: 10px;
                        ">
                    </div>
                    <button id="success-modal-close-btn" class="btn" style="
                        background: var(--primary-color, #4f46e5);
                        color: white !important;
                        border: none;
                        padding: 0.85rem 2rem;
                        border-radius: 12px;
                        font-weight: 700;
                        width: 100%;
                        cursor: pointer;
                        font-size: 1rem;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
                    ">Got it, thanks!</button>
                </div>
            `;
            document.body.appendChild(modal);

            const closeBtn = document.getElementById('success-modal-close-btn');
            closeBtn.addEventListener('mouseover', () => {
                closeBtn.style.transform = 'translateY(-1px)';
                closeBtn.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.35)';
            });
            closeBtn.addEventListener('mouseout', () => {
                closeBtn.style.transform = 'none';
                closeBtn.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.2)';
            });
        }

        const titleEl = document.getElementById('success-modal-title');
        const descEl = document.getElementById('success-modal-desc');
        const imgEl = document.getElementById('success-modal-img');
        const closeBtn = document.getElementById('success-modal-close-btn');

        if (type === 'submit') {
            titleEl.textContent = 'Claim Submitted';
            descEl.textContent = 'Your claim has been successfully submitted for AN Section verification!';
            imgEl.src = '/assets/submit_joke.jpg';
            closeBtn.textContent = 'Awesome!';
            closeBtn.onclick = () => {
                modal.classList.remove('active');
                modal.style.setProperty('display', 'none', 'important');
                window.location.href = '/claims/my.html';
            };
        } else {
            titleEl.textContent = 'Claim Saved';
            descEl.textContent = 'Your claim has been successfully saved to drafts!';
            imgEl.src = '/assets/claim_joke.jpg';
            closeBtn.textContent = 'Got it, thanks!';
            closeBtn.onclick = () => {
                modal.classList.remove('active');
                modal.style.setProperty('display', 'none', 'important');
            };
        }
        
        modal.classList.add('active');
        modal.style.setProperty('display', 'flex', 'important');
    }

    function handleSaveClick(status) {
        pendingStatus = status;

        if (editId) {
            document.getElementById('save-modal').classList.add('active');
        } else {
            saveClaim();
        }
    }

    document.getElementById('btn-modal-savenew').addEventListener('click', () => {
        pendingSaveMode = 'save_as_new';
        document.getElementById('save-modal').classList.remove('active');
        saveClaim();
    });
    document.getElementById('btn-modal-overwrite').addEventListener('click', () => {
        pendingSaveMode = 'overwrite';
        document.getElementById('save-modal').classList.remove('active');
        saveClaim();
    });
    document.getElementById('btn-modal-cancel').addEventListener('click', () => {
        document.getElementById('save-modal').classList.remove('active');
    });

    document.getElementById('btn-save-draft').addEventListener('click', () => {
        const typeSelect = document.getElementById('claim_type');
        const isContingent = typeSelect && typeSelect.value === '7';
        handleSaveClick(isContingent ? 'Pending' : 'Draft');
    });
    document.getElementById('btn-submit').addEventListener('click', () => handleSaveClick('Pending'));
    document.getElementById('new-claim-form').addEventListener('submit', (e) => e.preventDefault());
});