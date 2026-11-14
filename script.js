/* =========================================
   ExpenseX - JavaScript Logic
   Data is stored in browser LocalStorage.
   ========================================= */

'use strict';

// DOM Selectors
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// Categories
const EXP = [
    'Food',
    'Shopping',
    'Transportation',
    'Education',
    'Entertainment',
    'Healthcare',
    'Bills',
    'Other'
];

const INC = [
    'Salary',
    'Freelance',
    'Other'
];

const PAY = [
    'Cash',
    'UPI',
    'Card',
    'Net Banking'
];

// Currency Settings
const CUR = {
    INR: ['₹', 'en-IN'],
    USD: ['$', 'en-US'],
    EUR: ['€', 'de-DE'],
    GBP: ['£', 'en-GB']
};

// Chart Colors
const PAL = [
    '#10B981',
    '#3B82F6',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#EF4444',
    '#94A3B8'
];

// Escape HTML
const esc = s =>
    String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));


/* =========================================
   1. STORAGE
   ========================================= */

const read = (k, d, ok) => {
    try {
        const v = JSON.parse(localStorage.getItem(k));
        return v && ok(v) ? v : d;
    } catch (e) {
        return d;
    }
};

const ymd = d =>
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');

const ago = n => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return ymd(d);
};

const monthDay = (back, day) => {
    const d = new Date();

    return ymd(
        new Date(
            d.getFullYear(),
            d.getMonth() - back,
            day
        )
    );
};

const uid = () =>
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 6);

const validTx = t =>
    t &&
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    t.amount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
    (t.type === 'income' || t.type === 'expense');


// Sample Transactions
function sample() {
    const r = [
        ['Monthly Salary', 45000, 'income', 'Salary', monthDay(0, 1), 'Net Banking'],
        ['Freelance Project', 8000, 'income', 'Freelance', monthDay(0, 3), 'UPI'],
        ['Grocery Shopping', 2400, 'expense', 'Food', ago(1), 'UPI'],
        ['Metro Card Recharge', 600, 'expense', 'Transportation', ago(2), 'UPI'],
        ['Netflix', 499, 'expense', 'Entertainment', ago(4), 'Card'],
        ['Electricity Bill', 1850, 'expense', 'Bills', ago(5), 'Net Banking'],
        ['Textbooks', 1200, 'expense', 'Education', ago(7), 'Cash'],
        ['Pharmacy', 450, 'expense', 'Healthcare', ago(9), 'Cash'],
        ['Sneakers', 2999, 'expense', 'Shopping', ago(12), 'Card']
    ];

    for (let b = 1; b <= 4; b++) {
        r.push(
            ['Monthly Salary', 45000, 'income', 'Salary', monthDay(b, 1), 'Net Banking'],
            ['Food & Dining', 4000 + b * 300, 'expense', 'Food', monthDay(b, 10), 'UPI'],
            ['Bills', 2500 + b * 100, 'expense', 'Bills', monthDay(b, 15), 'Net Banking'],
            ['Shopping', 1500 + b * 400, 'expense', 'Shopping', monthDay(b, 20), 'Card']
        );
    }

    return r.map(([title, amount, type, category, date, pay]) => ({
        id: uid(),
        title,
        amount,
        type,
        category,
        date,
        pay,
        desc: '',
        sample: true
    }));
}


// Load Stored Data
let tx = localStorage.getItem('ex_tx') === null
    ? sample()
    : read('ex_tx', [], Array.isArray).filter(validTx);

let bud = read(
    'ex_bud',
    { monthly: 0, cats: {} },
    o => typeof o === 'object' && o.cats
);

let st = Object.assign(
    { cur: 'INR', theme: 'dark' },
    read('ex_set', {}, o => typeof o === 'object')
);

if (!CUR[st.cur]) {
    st.cur = 'INR';
}


// Save Data
function save() {
    try {
        localStorage.setItem('ex_tx', JSON.stringify(tx));
        localStorage.setItem('ex_bud', JSON.stringify(bud));
        localStorage.setItem('ex_set', JSON.stringify(st));
    } catch (e) {
        toast('Could not save – browser storage is blocked or full', 'err');
    }
}


/* =========================================
   2. HELPER FUNCTIONS
   ========================================= */

// Format Currency
const money = n => {
    const [c, l] = CUR[st.cur];

    return c + Number(n).toLocaleString(l, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Format Date
const fdate = d =>
    new Date(d + 'T00:00').toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

// Calculate Sum
const sum = a =>
    a.reduce((s, x) => s + x.amount, 0);

// Filter by Type
const ofType = (a, t) =>
    a.filter(x => x.type === t);

// Current Month
const curM = () =>
    ymd(new Date()).slice(0, 7);

// Transactions in a Month
const inM = m =>
    tx.filter(x => x.date.startsWith(m));

// Group Expenses by Category
const byCat = list => {
    const m = {};

    ofType(list, 'expense').forEach(x => {
        m[x.category] = (m[x.category] || 0) + x.amount;
    });

    return m;
};

// Last N Months
const lastMonths = n => {
    const a = [];

    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);

        a.push(ymd(d).slice(0, 7));
    }

    return a;
};

// Month Label
const mlabel = m =>
    new Date(m + '-01T00:00').toLocaleDateString('en-GB', {
        month: 'short',
        year: '2-digit'
    });


// Toast Notification
function toast(msg, type) {
    const t = document.createElement('div');

    t.className = 't ' + (type || '');
    t.textContent = msg;

    $('#toasts').append(t);

    setTimeout(() => t.remove(), 3000);
}


// Confirmation Dialog
function ask(msg) {
    $('#cfMsg').textContent = msg;

    const d = $('#cf');
    d.returnValue = '';
    d.showModal();

    return new Promise(r => {
        d.addEventListener(
            'close',
            () => r(d.returnValue === 'yes'),
            { once: true }
        );
    });
}


// Download File
function download(name, text, mime) {
    const a = document.createElement('a');

    a.href = URL.createObjectURL(
        new Blob([text], { type: mime })
    );

    a.download = name;

    document.body.append(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(a.href), 500);
}


/* =========================================
   3. CHARTS
   ========================================= */

const ch = {};

function draw(id, type, data, opts) {
    const c = $('#' + id);

    if (!c || typeof Chart === 'undefined') {
        return;
    }

    if (ch[id]) {
        ch[id].destroy();
    }

    ch[id] = new Chart(c, {
        type,
        data,
        options: Object.assign(
            {
                responsive: true,
                maintainAspectRatio: false
            },
            opts
        )
    });
}


// Doughnut Chart
const donut = (id, list) => {
    const m = byCat(list);
    const k = Object.keys(m);

    draw(
        id,
        'doughnut',
        {
            labels: k,
            datasets: [{
                data: k.map(x => m[x]),
                backgroundColor: PAL,
                borderWidth: 0
            }]
        },
        {
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    );
};


// Bar Chart
const bars = (id, n) => {
    const ms = lastMonths(n);

    draw(
        id,
        'bar',
        {
            labels: ms.map(mlabel),
            datasets: [
                {
                    label: 'Income',
                    data: ms.map(m =>
                        sum(ofType(inM(m), 'income'))
                    ),
                    backgroundColor: '#10B981',
                    borderRadius: 4
                },
                {
                    label: 'Expenses',
                    data: ms.map(m =>
                        sum(ofType(inM(m), 'expense'))
                    ),
                    backgroundColor: '#EF4444',
                    borderRadius: 4
                }
            ]
        },
        {
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    );
};


/* =========================================
   4. RENDERERS
   ========================================= */

// Dashboard
function renderDash() {
    const inc = sum(ofType(tx, 'income'));
    const exp = sum(ofType(tx, 'expense'));
    const m = inM(curM());

    $('#sBal').textContent = money(inc - exp);
    $('#sInc').textContent = money(inc);
    $('#sExp').textContent = money(exp);

    $('#sSav').textContent = money(
        sum(ofType(m, 'income')) -
        sum(ofType(m, 'expense'))
    );

    const rec = [...tx]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

    $('#recent').innerHTML = rec.length
        ? rec.map(t => `
            <div class="li">
                <div>
                    ${esc(t.title)}
                    <small>
                        ${esc(t.category)} · ${fdate(t.date)}
                    </small>
                </div>

                <b class="${t.type === 'income' ? 'g' : 'r'}">
                    ${t.type === 'income' ? '+' : '−'}${money(t.amount)}
                </b>
            </div>
        `).join('')
        : '<div class="empty">No transactions yet. Use “Add transaction” to start.</div>';

    const spent = sum(ofType(m, 'expense'));
    const pm = lastMonths(2)[0];
    const prev = sum(ofType(inM(pm), 'expense'));
    const cats = byCat(m);

    const top = Object.keys(cats)
        .sort((a, b) => cats[b] - cats[a])[0];

    const chg = prev
        ? Math.round((spent - prev) / prev * 100)
        : null;

    $('#msum').innerHTML = `
        <div class="li">
            <span>Spent this month</span>
            <b>${money(spent)}</b>
        </div>

        <div class="li">
            <span>Spent last month</span>
            <b>${money(prev)}</b>
        </div>

        <div class="li">
            <span>Change</span>
            <b class="${chg > 0 ? 'r' : 'g'}">
                ${chg === null ? '–' : (chg > 0 ? '+' : '') + chg + '%'}
            </b>
        </div>

        <div class="li">
            <span>Top category</span>
            <b>${top ? esc(top) : '–'}</b>
        </div>

        <div class="li">
            <span>Transactions this month</span>
            <b>${m.length}</b>
        </div>
    `;

    bars('cBar', 6);
    donut('cDon', m);
}


// Transaction Filters
function filtered() {
    const q = $('#q').value.trim().toLowerCase();
    const c = $('#fc').value;
    const t = $('#ft').value;
    const d = $('#fd').value;
    const s = $('#fs').value;

    return tx.filter(x =>
        (!q || (x.title + ' ' + (x.desc || '')).toLowerCase().includes(q)) &&
        (!c || x.category === c) &&
        (!t || x.type === t) &&
        (!d || x.date.startsWith(d))
    ).sort((a, b) =>
        s === 'old'
            ? a.date.localeCompare(b.date)
            : b.date.localeCompare(a.date)
    );
}


// Transaction Table
function renderTable() {
    const l = filtered();

    $('#tb').innerHTML = l.map(t => `
        <tr>
            <td data-l="Title">
                <b>${esc(t.title)}</b>
            </td>

            <td data-l="Category">
                ${esc(t.category)}
            </td>

            <td data-l="Date">
                ${fdate(t.date)}
            </td>

            <td data-l="Payment">
                ${esc(t.pay)}
            </td>

            <td data-l="Amount" class="n ${t.type === 'income' ? 'g' : 'r'}">
                <b>
                    ${t.type === 'income' ? '+' : '−'}${money(t.amount)}
                </b>
            </td>

            <td class="n">
                <button class="act" data-a="edit" data-id="${t.id}">
                    Edit
                </button>

                <button class="act" data-a="del" data-id="${t.id}">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');

    const e = $('#empty');

    e.hidden = l.length > 0;

    e.textContent = tx.length
        ? 'No transactions match your filters.'
        : 'No transactions yet. Add your first one to see it here.';

    $('table').hidden = !l.length;
}


// Analytics
function renderAnalytics() {
    const m = inM(curM());

    const inc = sum(ofType(m, 'income'));
    const exp = sum(ofType(m, 'expense'));

    const all = byCat(tx);

    const top = Object.keys(all)
        .sort((a, b) => all[b] - all[a])[0];

    const day = new Date().getDate();

    const total =
        sum(ofType(tx, 'income')) -
        sum(ofType(tx, 'expense'));

    const S = [
        ['Monthly Income', money(inc), 'g'],
        ['Monthly Expenses', money(exp), 'r'],
        ['Total Savings', money(total), ''],
        [
            'Highest Spending Category',
            top ? `${esc(top)} (${money(all[top])})` : '–',
            ''
        ],
        ['Average Daily Spending', money(exp / day), '']
    ];

    $('#astats').innerHTML = S.map(([a, b, c]) => `
        <div class="card stat">
            <small>${a}</small>
            <strong class="${c}" style="font-size:1.2rem">
                ${b}
            </strong>
        </div>
    `).join('');

    donut('aDon', tx);
    bars('aBar', 6);

    const days = [...Array(30)].map((_, i) => ago(29 - i));

    draw(
        'aLine',
        'line',
        {
            labels: days.map(d => d.slice(5)),
            datasets: [{
                label: 'Spending',
                data: days.map(d =>
                    sum(
                        ofType(
                            tx.filter(x => x.date === d),
                            'expense'
                        )
                    )
                ),
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239,68,68,.12)',
                fill: true,
                tension: 0.3,
                pointRadius: 2
            }]
        },
        {
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    );
}


// Budget Usage
function usage() {
    // Budget rows: [label, spent, limit]

    const spent = byCat(inM(curM()));
    const rows = [];

    if (bud.monthly > 0) {
        rows.push([
            'Overall monthly budget',
            sum(ofType(inM(curM()), 'expense')),
            bud.monthly
        ]);
    }

    EXP.forEach(c => {
        if (bud.cats[c] > 0) {
            rows.push([
                c,
                spent[c] || 0,
                bud.cats[c]
            ]);
        }
    });

    return rows;
}


// Budget Renderer
function renderBudget() {
    $('#bMonthly').value = bud.monthly || '';

    $('#bInputs').innerHTML = EXP.map(c => `
        <label>
            ${c} budget

            <input
                type="number"
                min="0"
                step="1"
                data-c="${c}"
                value="${bud.cats[c] || ''}"
                placeholder="0 = no limit"
            >
        </label>
    `).join('');

    const rows = usage();

    $('#bUse').innerHTML = rows.length
        ? rows.map(([n, s, l]) => {
            const p = s / l * 100;

            const k = p >= 100
                ? 'over'
                : p >= 80
                    ? 'warn'
                    : '';

            return `
                <div class="bu">
                    <p>
                        <b>${esc(n)}</b>
                        <span>${money(s)} / ${money(l)}</span>
                    </p>

                    <div class="bar ${k}">
                        <i style="width:${Math.min(p, 100)}%"></i>
                    </div>

                    <span class="msg ${k}">
                        ${
                            p >= 100
                                ? 'Budget exceeded by ' + money(s - l)
                                : p >= 80
                                    ? 'Warning: ' + Math.round(p) + '% used. ' + money(l - s) + ' left'
                                    : money(l - s) + ' remaining (' + Math.round(p) + '% used)'
                        }
                    </span>
                </div>
            `;
        }).join('')
        : '<div class="empty">No budgets set. Enter an amount and save to start tracking.</div>';

    $('#dot').hidden = !rows.some(r => r[1] / r[2] >= 0.8);
}


// Settings Renderer
function renderSettings() {
    $('#sCur').value = st.cur;
    $('#sTheme').value = st.theme;
}


// Apply Theme
function applyTheme() {
    document.documentElement.dataset.theme = st.theme;

    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = st.theme === 'dark'
            ? '#94a3b8'
            : '#475569';
    }
}


// Main Renderer
function render() {
    const p = currentPage();

    renderBudget();

    if (p === 'dashboard') {
        renderDash();
    }

    if (p === 'transactions') {
        renderTable();
    }

    if (p === 'analytics') {
        renderAnalytics();
    }

    if (p === 'settings') {
        renderSettings();
    }
}


/* =========================================
   5. NAVIGATION
   ========================================= */

const PAGES = [
    'dashboard',
    'transactions',
    'analytics',
    'budget',
    'settings'
];

const currentPage = () => {
    const p = location.hash.slice(1);

    return PAGES.includes(p)
        ? p
        : 'dashboard';
};


// Route Handler
function route() {
    const p = currentPage();

    $$('.page').forEach(s => {
        s.hidden = s.id !== p;
    });

    $$('nav a').forEach(a => {
        a.classList.toggle('on', a.hash === '#' + p);
    });

    closeSide();
    render();

    window.scrollTo(0, 0);
}


// Close Sidebar
const closeSide = () => {
    $('#side').classList.remove('open');
    $('#scrim').classList.remove('open');
};


// Navigation Events
window.addEventListener('hashchange', route);

$('#menu').onclick = () => {
    $('#side').classList.add('open');
    $('#scrim').classList.add('open');
};

$('#scrim').onclick = closeSide;


// Notification Button
$('#bell').onclick = () => {
    const n = usage().filter(r => r[1] / r[2] >= 0.8);

    if (n.length) {
        toast(n.length + ' budget(s) need attention', 'err');
        location.hash = '#budget';
    } else {
        toast('All budgets are on track');
    }
};


/* =========================================
   6. ADD / EDIT TRANSACTION FORM
   ========================================= */

let editId = null;


// Create Select Options
const opts = a =>
    a.map(x => `<option>${x}</option>`).join('');


// Set Categories
const setCats = sel => {
    $('#fCat').innerHTML = opts(
        $('#fType').value === 'income'
            ? INC
            : EXP
    );

    if (sel) {
        $('#fCat').value = sel;
    }
};


// Open Transaction Form
function openForm(t) {
    editId = t ? t.id : null;

    $('#dt').textContent = t
        ? 'Edit transaction'
        : 'Add transaction';

    $('#ferr').textContent = '';

    $('#fTitle').value = t ? t.title : '';
    $('#fAmt').value = t ? t.amount : '';

    $('#fType').value = t
        ? t.type
        : 'expense';

    setCats(t && t.category);

    $('#fDate').value = t
        ? t.date
        : ymd(new Date());

    $('#fPay').value = t
        ? t.pay
        : 'UPI';

    $('#fDesc').value = t
        ? t.desc || ''
        : '';

    $('#dlg').showModal();
}


// Form Events
$('#fType').onchange = () => setCats();

$('#fCancel').onclick = () => {
    $('#dlg').close();
};


// Submit Transaction Form
$('#f').onsubmit = e => {
    e.preventDefault();

    const title = $('#fTitle').value.trim();
    const amount = parseFloat($('#fAmt').value);
    const date = $('#fDate').value;
    const err = $('#ferr');

    if (!title) {
        return err.textContent = 'Enter a title.';
    }

    if (!$('#fAmt').value || isNaN(amount) || amount <= 0) {
        return err.textContent = 'Enter an amount greater than 0.';
    }

    if (amount > 1e9) {
        return err.textContent = 'Amount is too large.';
    }

    if (!date) {
        return err.textContent = 'Choose a date.';
    }

    const rec = {
        id: editId || uid(),
        title,
        amount: Math.round(amount * 100) / 100,
        type: $('#fType').value,
        category: $('#fCat').value,
        date,
        pay: $('#fPay').value,
        desc: $('#fDesc').value.trim()
    };

    if (editId) {
        tx = tx.map(t => t.id === editId ? rec : t);
        toast('Transaction updated');
    } else {
        tx.push(rec);
        toast('Transaction added');
    }

    save();
    $('#dlg').close();
    render();
};


// Handle Edit, Delete and Add Buttons
document.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]');

    if (!b) {
        return;
    }

    const t = tx.find(x => x.id === b.dataset.id);

    if (b.dataset.a === 'add') {
        openForm();
    }

    if (b.dataset.a === 'edit' && t) {
        openForm(t);
    }

    if (
        b.dataset.a === 'del' &&
        t &&
        await ask(`Delete “${t.title}”? This cannot be undone.`)
    ) {
        tx = tx.filter(x => x.id !== t.id);

        save();
        render();

        toast('Transaction deleted');
    }
});


/* =========================================
   7. TRANSACTION FILTERS
   ========================================= */

$('#fc').innerHTML =
    '<option value="">All categories</option>' +
    opts([...new Set([...EXP, ...INC])]);

['#q', '#fc', '#ft', '#fd', '#fs'].forEach(s => {
    $(s).addEventListener('input', renderTable);
});


// Clear Filters
$('#clr').onclick = () => {
    $('#q').value = '';
    $('#fc').value = '';
    $('#ft').value = '';
    $('#fd').value = '';
    $('#fs').value = 'new';

    renderTable();
};


/* =========================================
   8. BUDGETS
   ========================================= */

$('#bf').onsubmit = e => {
    e.preventDefault();

    const m = parseFloat($('#bMonthly').value || 0);
    const cats = {};

    let bad = isNaN(m) || m < 0;

    $$('#bInputs input').forEach(i => {
        const v = parseFloat(i.value || 0);

        if (isNaN(v) || v < 0) {
            bad = true;
        } else if (v > 0) {
            cats[i.dataset.c] = v;
        }
    });

    if (bad) {
        return toast('Budgets must be 0 or more', 'err');
    }

    bud = {
        monthly: m,
        cats
    };

    save();
    render();

    toast('Budgets saved');
};


/* =========================================
   9. SETTINGS AND EXPORT
   ========================================= */

// Currency Setting
$('#sCur').onchange = e => {
    st.cur = e.target.value;

    save();
    render();

    toast('Currency updated');
};


// Theme Setting
$('#sTheme').onchange = e => {
    st.theme = e.target.value;

    save();
    applyTheme();
    render();
};


// CSV Escape Helper
const q = v =>
    '"' + String(v ?? '').replace(/"/g, '""') + '"';


// Export CSV
$('#bCsv').onclick = () => {
    if (!tx.length) {
        return toast('No transactions to export', 'err');
    }

    const rows = [
        [
            'Date',
            'Title',
            'Type',
            'Category',
            'Payment',
            'Amount',
            'Description'
        ],

        ...tx.map(t => [
            t.date,
            t.title,
            t.type,
            t.category,
            t.pay,
            t.amount,
            t.desc
        ])
    ];

    download(
        'expensex-transactions.csv',
        rows.map(r => r.map(q).join(',')).join('\n'),
        'text/csv'
    );

    toast('CSV downloaded');
};


// Export Monthly Report
$('#bRep').onclick = () => {
    const m = curM();
    const l = inM(m);
    const c = byCat(l);

    const inc = sum(ofType(l, 'income'));
    const exp = sum(ofType(l, 'expense'));

    const txt = `
EXPENSEX MONTHLY REPORT – ${mlabel(m)}

Income:   ${money(inc)}
Expenses: ${money(exp)}
Savings:  ${money(inc - exp)}

Spending by category
` +
        (
            Object.keys(c)
                .map(k => `  ${k}: ${money(c[k])}`)
                .join('\n') || '  (none)'
        ) +
        `

Transactions
` +
        (
            l.sort((a, b) => a.date.localeCompare(b.date))
                .map(t =>
                    `  ${t.date}  ${t.type === 'income' ? '+' : '-'}${money(t.amount)}  ${t.title} (${t.category})`
                )
                .join('\n') || '  (none)'
        );

    download(
        'expensex-report-' + m + '.txt',
        txt,
        'text/plain'
    );

    toast('Report downloaded');
};


// Remove Sample Data
$('#bSample').onclick = async () => {
    if (!tx.some(t => t.sample)) {
        return toast('No sample data found');
    }

    if (await ask('Remove the demo transactions? Your own entries stay.')) {
        tx = tx.filter(t => !t.sample);

        save();
        render();

        toast('Sample data cleared');
    }
};


// Reset Settings
$('#bReset').onclick = async () => {
    if (await ask('Reset currency, theme and budgets to defaults? Transactions are kept.')) {
        st = {
            cur: 'INR',
            theme: 'dark'
        };

        bud = {
            monthly: 0,
            cats: {}
        };

        save();
        applyTheme();
        render();

        toast('Settings reset');
    }
};


// Clear All Transactions
$('#bClear').onclick = async () => {
    if (await ask('Delete ALL transactions? This cannot be undone.')) {
        tx = [];

        save();
        render();

        toast('All data cleared');
    }
};


/* =========================================
   10. START APPLICATION
   ========================================= */

$('#fPay').innerHTML = opts(PAY);

$('#today').textContent = new Date().toLocaleDateString(
    'en-GB',
    {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }
);

applyTheme();
save();
route();