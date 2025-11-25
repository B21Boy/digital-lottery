import { db, getDoc, setDoc, doc } from './firebase-init.js';

// Hash password using SHA-256
async function hashPassword(password) {
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function registerAdmin(username, password) {
    const uRef = doc(db, 'users', username);
    const snap = await getDoc(uRef);
    if (snap.exists()) throw new Error('Username already exists');
    const ph = await hashPassword(password);
    await setDoc(uRef, { username, role: 'admin', passwordHash: ph, createdAt: Date.now() });
}

async function loginAdmin(username, password) {
    const uRef = doc(db, 'users', username);
    const snap = await getDoc(uRef);
    if (!snap.exists()) throw new Error('No such user');
    const data = snap.data();
    if (!data || data.role !== 'admin') throw new Error('User is not an admin');
    const ph = await hashPassword(password);
    if (ph !== data.passwordHash) throw new Error('Invalid credentials');
}

// DOM helpers (support inline form on admin-register-login.html)
const loginBtn = document.getElementById('indexLoginBtn');
const registerBtn = document.getElementById('indexRegisterBtn');
const userInput = document.getElementById('indexAdminUser');
const passInput = document.getElementById('indexAdminPass');
const msgEl = document.getElementById('indexAuthMsg');

function showMsg(m, err) {
    if (!msgEl) return;
    msgEl.style.color = err ? '#ff6666' : '#9fb8c8';
    msgEl.innerText = m;
}

if (registerBtn) registerBtn.addEventListener('click', async () => {
    const u = (userInput.value || '').trim();
    const p = (passInput.value || '').trim();
    if (!u || !p) { showMsg('Enter username and password', true); return; }
    try {
        await registerAdmin(u, p);
        if (userInput) userInput.value = '';
        if (passInput) passInput.value = '';
        showMsg('Registered successfully. Now please login with your credentials.');
    } catch (e) { showMsg(e.message || String(e), true); }
});

if (loginBtn) loginBtn.addEventListener('click', async () => {
    const u = (userInput.value || '').trim();
    const p = (passInput.value || '').trim();
    if (!u || !p) { showMsg('Enter username and password', true); return; }
    try {
        await loginAdmin(u, p);
        localStorage.setItem('adminUser', u);
        showMsg('Login successful. Redirecting...');
        setTimeout(() => { window.location.href = 'admin.html'; }, 600);
    } catch (e) { showMsg(e.message || String(e), true); }
});

// allow Enter key to submit
if (userInput && passInput) {
    passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { if (loginBtn) loginBtn.click(); } });
}
