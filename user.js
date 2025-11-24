import { db, collection, getDoc, getDocs, setDoc, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from './firebase-init.js';

// Real-time update for current lottery

export { buyTicket, loadHistory };
window.buyTicket = buyTicket;
window.loadHistory = loadHistory;
function renderCurrentLottery(lottery) {
    const statusText = document.getElementById("statusText");
    if (!lottery || !lottery.roundName) {
        document.getElementById("roundName").innerText = "No active round";
        document.getElementById("ticketPrice").innerText = "";
        if (statusText) statusText.innerHTML = "<span style='color:#888'>Status: <b>Not Started</b></span>";
        if (document.getElementById("winningNum")) document.getElementById("winningNum").innerText = "";
        return;
    }
    document.getElementById("roundName").innerText = "Round: " + lottery.roundName;
    document.getElementById("ticketPrice").innerText = "Ticket Price: " + lottery.ticketPrice + " birr";
    let statusLabel = '';
    if (lottery.status === 'open') {
        statusLabel = "<span style='color:#00cc66;font-weight:bold;'>Status: <b>Started</b> 🚦</span>";
    } else if (lottery.status === 'closed') {
        statusLabel = "<span style='color:#ff6666;font-weight:bold;'>Status: <b>Stopped</b> ⏹️</span>";
    } else {
        statusLabel = "<span style='color:#888'>Status: <b>Not Started</b></span>";
    }
    if (statusText) statusText.innerHTML = statusLabel;
    if (document.getElementById("winningNum") && lottery.winningNumber !== null && lottery.winningNumber !== undefined) {
        document.getElementById("winningNum").innerText = lottery.winningNumber;
    }
    try { initCountdown(); } catch (e) { /* ignore if init not available yet */ }
}

// Listen for real-time changes
onSnapshot(doc(db, 'lottery', 'current'), (docSnap) => {
    renderCurrentLottery(docSnap.exists() ? docSnap.data() : {});
});


// Buy ticket
async function buyTicket() {
    let user = document.getElementById("username").value.trim();
    let phone = document.getElementById("phone") ? document.getElementById("phone").value.trim() : '';
    let number = Number(document.getElementById("number").value);
    let paymentMethod = document.getElementById("paymentMethod") ? document.getElementById("paymentMethod").value : '';
    let paymentFileInput = document.getElementById("paymentFile");
    let paymentFile = paymentFileInput && paymentFileInput.files && paymentFileInput.files[0] ? paymentFileInput.files[0] : null;

    if (!user || !phone || isNaN(number)) {
        showStyledAlert("Please fill in your name, phone, and number!");
        return;
    }
    if (!paymentMethod) {
        showStyledAlert("Please select a payment method!");
        return;
    }
    if (!paymentFile) {
        showStyledAlert("Please upload your payment proof!");
        return;
    }

    // Read payment file as base64
    const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    let paymentProofBase64 = await readFileAsBase64(paymentFile);

    const lotterySnap = await getDoc(doc(db, 'lottery', 'current'));
    let lottery = lotterySnap.exists() ? lotterySnap.data() : null;

    if (!lottery || lottery.status !== "open") {
        showStyledAlert("Lottery is not open!");
        return;
    }

    let ticket = {
        user: user,
        phone: phone,
        number: number,
        time: new Date().toLocaleString(),
        paymentMethod: paymentMethod,
        paymentProof: paymentProofBase64
    };

    await addDoc(collection(db, 'lottery', 'current', 'tickets'), ticket);
    await saveHistory(user, ticket);
    // Remember user name for future
    localStorage.setItem('currentUserName', user);

    // Clear input fields
    document.getElementById("username").value = "";
    if (document.getElementById("phone")) document.getElementById("phone").value = "";
    document.getElementById("number").value = "";
    if (paymentFileInput) paymentFileInput.value = "";

    showStyledAlert("🎟️ Ticket purchased! Good luck!");
}

// Custom styled alert for user page (moved to top level)
function showStyledAlert(message) {
    let modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = '#222';
    modal.style.color = '#fff';
    modal.style.padding = '32px 48px';
    modal.style.borderRadius = '16px';
    modal.style.boxShadow = '0 4px 32px #0008';
    modal.style.fontSize = '1.3rem';
    modal.style.zIndex = 9999;
    modal.style.textAlign = 'center';
    modal.innerHTML = `<div style="margin-bottom:12px;">${message}</div><button style="padding:8px 24px;border:none;background:#00ffcc;color:#222;border-radius:8px;font-size:1rem;cursor:pointer;">OK</button>`;
    modal.querySelector('button').onclick = () => document.body.removeChild(modal);
    document.body.appendChild(modal);
}


// Load user tickets only
async function loadHistory() {

    // Try to get user name from localStorage first
    let user = localStorage.getItem('currentUserName') || document.getElementById("username").value.trim();
    if (!user) {
        showStyledAlert("Please buy a ticket first so we know who you are!");
        return;
    }

    const ticketsSnap = await getDocs(collection(db, 'lottery', 'current', 'tickets'));
    let myTickets = [];
    ticketsSnap.forEach(docSnap => {
        let t = docSnap.data();
        if (t.user === user) myTickets.push(t);
    });

    const historyList = document.getElementById("historyList");
    if (myTickets.length === 0) {
        historyList.innerHTML = '<span style="color:#888">No tickets found for this round.</span>';
        return;
    }

    // Build a nice HTML list
    let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
    myTickets.forEach((t) => {
        html += `<div style=\"background:#181f2a;padding:12px 18px;border-radius:10px;box-shadow:0 2px 8px #0003;\">
            <div style=\"font-size:1.1em;color:#00ffcc;font-weight:600;\">Ticket #${t.number}</div>
            <div><b>Name:</b> <span style=\"color:#fff;\">${t.user}</span></div>
            <div><b>Number:</b> <span style=\"color:#ffd700;\">${t.number}</span></div>
            <div><b>Time:</b> <span style=\"color:#aaa;\">${t.time}</span></div>
        </div>`;
    });
    html += '</div>';
    historyList.innerHTML = html;
}


// Save purchase history
async function saveHistory(user, ticket) {
    await addDoc(collection(db, 'users', user, 'history'), ticket);
}


// Helpers
async function getLottery() {
    const lotterySnap = await getDoc(doc(db, 'lottery', 'current'));
    return lotterySnap.exists() ? lotterySnap.data() : {};
}

async function save(data) {
    await setDoc(doc(db, 'lottery', 'current'), data);
}
// holds the last uploaded image dataURL (resized) so it can be attached to a ticket
let currentUploadData = null;
// IMAGE DROPZONE LOGIC
const dropzoneArea = document.getElementById('dropzoneArea');
const userImageInput = document.getElementById('userImage');
const imagePreview = document.getElementById('imagePreview');
const dropzoneText = document.getElementById('dropzoneText');

if (dropzoneArea && userImageInput && imagePreview) {
    dropzoneArea.addEventListener('click', () => {
        userImageInput.click();
    });
    dropzoneArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            userImageInput.click();
        }
    });
    dropzoneArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzoneArea.style.borderColor = '#00ffcc';
    });
    dropzoneArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzoneArea.style.borderColor = '#00ff66';
    });
    dropzoneArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzoneArea.style.borderColor = '#00ff66';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            userImageInput.files = e.dataTransfer.files;
            handleImagePreview(e.dataTransfer.files[0]);
        }
    });
    userImageInput.addEventListener('change', (e) => {
        if (userImageInput.files && userImageInput.files[0]) {
            handleImagePreview(userImageInput.files[0]);
        }
    });
}

function resizeAndCompressImage(file, maxWidth, maxHeight, quality, cb) {
    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
            let w = img.width;
            let h = img.height;
            const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            // optional: fill with a dark background for better contrast
            ctx.fillStyle = '#0b0b0b';
            ctx.fillRect(0,0,w,h);
            ctx.drawImage(img, 0, 0, w, h);
            try {
                const dataURL = canvas.toDataURL('image/jpeg', quality || 0.8);
                cb(null, dataURL);
            } catch (err) {
                cb(err);
            }
        };
        img.onerror = function(err){ cb(err || new Error('image load error')) };
        img.src = evt.target.result;
    };
    reader.onerror = function(e){ cb(e) };
    reader.readAsDataURL(file);
}

function handleImagePreview(file) {
    // resize to reasonable thumbnail to avoid huge localStorage usage
    resizeAndCompressImage(file, 420, 420, 0.78, function(err, dataUrl){
        if (err) {
            // fallback to direct dataURL read
            const fr = new FileReader();
            fr.onload = function(e){
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
                dropzoneText.style.display = 'none';
                currentUploadData = e.target.result;
            };
            fr.readAsDataURL(file);
            return;
        }
        imagePreview.src = dataUrl;
        imagePreview.style.display = 'block';
        dropzoneText.style.display = 'none';
        currentUploadData = dataUrl;
    });
}

// ===== PUBLISHER (demo WebRTC using localStorage signaling) =====
// Elements on user.html: #publishBtn and #publishPreview
const publishBtn = document.getElementById('publishBtn');
const publishPreview = document.getElementById('publishPreview');
let pubPc = null;
let pubStream = null;
let pubId = null;

function pushIceArray(key, cand) {
    try {
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        arr.push(cand);
        localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) { console.error('pushIceArray', e); }
}

if (publishBtn) {
    publishBtn.addEventListener('click', async () => {
        if (!pubStream) {
            try {
                pubStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (publishPreview) { publishPreview.srcObject = pubStream; publishPreview.style.display = 'block'; }

                pubPc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
                // send local ICE candidates to localStorage
                pubPc.onicecandidate = (e) => { if (e.candidate) pushIceArray('webrtc_ice_pub_' + pubId, e.candidate); };
                pubStream.getTracks().forEach(t => pubPc.addTrack(t, pubStream));

                pubId = 'pub_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
                const userName = (document.getElementById('username') && document.getElementById('username').value) || ('User-' + pubId);

                const offer = await pubPc.createOffer();
                await pubPc.setLocalDescription(offer);

                const payload = { id: pubId, name: userName, sdp: offer.sdp, type: offer.type, avatar: currentUploadData || null };
                localStorage.setItem('webrtc_offer_' + pubId, JSON.stringify(payload));

                // listen for answer and ICE from live page
                const onStorage = (ev) => {
                    try {
                        if (!ev.key) return;
                        if (ev.key === ('webrtc_answer_' + pubId) && ev.newValue) {
                            const ans = JSON.parse(ev.newValue);
                            if (ans && ans.sdp) pubPc.setRemoteDescription({ type: ans.type || 'answer', sdp: ans.sdp }).catch(console.error);
                        }
                        if (ev.key === ('webrtc_ice_answer_' + pubId) && ev.newValue) {
                            const cands = JSON.parse(ev.newValue || '[]');
                            for (const c of cands) try { pubPc.addIceCandidate(c).catch(()=>{}); } catch(e){}
                        }
                    } catch (e) { }
                };
                window.addEventListener('storage', onStorage);

                publishBtn.textContent = 'Stop Publishing';
            } catch (err) {
                console.error('publish start failed', err);
                alert('Unable to access camera/microphone.');
                if (pubStream) { pubStream.getTracks().forEach(t => t.stop()); pubStream = null; }
            }
        } else {
            // stop publishing
            try { if (pubStream) { pubStream.getTracks().forEach(t => t.stop()); } } catch(e){}
            if (publishPreview) { publishPreview.srcObject = null; publishPreview.style.display = 'none'; }
            try { if (pubPc) pubPc.close(); } catch(e){}
            if (pubId) { try { localStorage.removeItem('webrtc_offer_' + pubId); localStorage.removeItem('webrtc_ice_pub_' + pubId); } catch(e){} }
            pubStream = null; pubPc = null; pubId = null;
            publishBtn.textContent = 'Start Publishing';
        }
    });
}

/* ===== COUNTDOWN & LIVE NAVIGATION ===== */
function pad(n) { return n.toString().padStart(2, '0'); }

function initCountdown() {
    const countdownEl = document.getElementById('countdownTimer');
    const liveBtn = document.getElementById('liveBtn');
    if (!countdownEl || !liveBtn) return;

    // when live button clicked, navigate to live page
    liveBtn.addEventListener('click', () => {
        // prefer navigation so state resets
        window.location.href = 'live.html';
    });

    // Determine countdown end time from stored lottery data
    let lottery = getLottery();
    let end = null;
    if (lottery.countdownEnd) {
        end = Number(lottery.countdownEnd);
    } else if (lottery.countdownSeconds) {
        end = Date.now() + Number(lottery.countdownSeconds) * 1000;
        lottery.countdownEnd = end;
        save(lottery);
    }

    if (!end) {
        // no countdown configured — show placeholder
        countdownEl.innerText = '--:--:--';
        return;
    }

    // start interval
    let done = false;
    const tick = () => {
        const now = Date.now();
        let diff = Math.max(0, end - now);
        if (diff <= 0 && !done) {
            done = true;
            countdownEl.innerText = '00:00:00';
            // auto-click the live button and navigate as fallback
            try { liveBtn.click(); } catch (e) {}
            setTimeout(() => { window.location.href = 'live.html'; }, 200);
            return;
        }
        const s = Math.floor(diff / 1000);
        const hh = Math.floor(s / 3600);
        const mm = Math.floor((s % 3600) / 60);
        const ss = s % 60;
        countdownEl.innerText = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
    };

    // initial render and interval
    tick();
    const intervalId = setInterval(() => {
        if (done) { clearInterval(intervalId); return; }
        tick();
    }, 500);
}