import { db, collection, getDoc, getDocs, setDoc, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from './firebase-init.js';

// Custom styled alert
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

// Create new round
export async function createRound() {
    let name = document.getElementById("roundName").value || "Round";
    let price = Number(document.getElementById("ticketPrice").value);

    if (!price) {
        alert("Enter a ticket price!");
        return;
    }

    let lottery = {
        roundName: name,
        ticketPrice: price,
        status: "not_started",
        winningNumber: null,
        winners: []
    };

    await setDoc(doc(db, 'lottery', 'current'), lottery);
    document.getElementById("roundName").value = "";
    document.getElementById("ticketPrice").value = "";
    showStyledAlert('🎉 New Round Created!');
}

// Expose to window for inline HTML event handlers
window.createRound = createRound;


// Start the lottery
export async function startLottery() {
    let lottery = await getLottery();
    lottery.status = "open";
    await save(lottery);
    showStyledAlert('🚦 Lottery Started!');
}
window.startLottery = startLottery;


// Stop lottery (no more selling)
export async function stopLottery() {
    let lottery = await getLottery();
    lottery.status = "closed";
    await save(lottery);
    showStyledAlert('⏹️ Lottery Stopped!');
}
window.stopLottery = stopLottery;


// Set winning number
async function setWinningNumber() {
    let number = Number(document.getElementById("winningNumber").value);
    let lottery = await getLottery();

    if (isNaN(number)) {
        showStyledAlert("Enter a number!");
        return;
    }

    lottery.winningNumber = number;

    // Find winners from Firestore tickets
    const ticketsSnap = await getDocs(collection(db, 'lottery', 'current', 'tickets'));
    let winners = [];
    ticketsSnap.forEach(docSnap => {
        let t = docSnap.data();
        if (t.number == number) winners.push(t);
    });
    lottery.winners = winners;

    await save(lottery);

    document.getElementById("winnerText").innerText =
        "Winning Number: " + number + 
        " | Winners: " + lottery.winners.length;

    showStyledAlert("🏆 Winner Declared!");
}


// View buyers
async function viewBuyers() {
    const ticketsSnap = await getDocs(collection(db, 'lottery', 'current', 'tickets'));
    let tickets = [];
    ticketsSnap.forEach(docSnap => tickets.push(docSnap.data()));
    document.getElementById("buyerList").textContent = JSON.stringify(tickets, null, 4);
}


// View winners
async function viewWinners() {
    let lottery = await getLottery();
    document.getElementById("winnerList").textContent = JSON.stringify(lottery.winners, null, 4);
}


// Helper: load lottery
async function getLottery() {
    const lotterySnap = await getDoc(doc(db, 'lottery', 'current'));
    return lotterySnap.exists() ? lotterySnap.data() : {};
}

// Helper: save lottery
async function save(data) {
    await setDoc(doc(db, 'lottery', 'current'), data);
}

// Set countdown end time (from admin datetime-local input)
async function setCountdown() {
    const input = document.getElementById('countdownAt');
    if (!input || !input.value) {
        showStyledAlert('Choose a date and time first');
        return;
    }

    const dt = new Date(input.value);
    if (isNaN(dt.getTime())) {
        showStyledAlert('Invalid date/time');
        return;
    }

    const lottery = await getLottery();
    lottery.countdownEnd = dt.getTime();
    await save(lottery);
    showStyledAlert('Live time set for: ' + dt.toString());
    showCountdownInfo();
}

async function clearCountdown() {
    const lottery = await getLottery();
    delete lottery.countdownEnd;
    delete lottery.countdownSeconds;
    await save(lottery);
    showStyledAlert('Live time cleared');
    showCountdownInfo();
}

function showCountdownInfo() {
    const info = document.getElementById('countdownInfo');
    const input = document.getElementById('countdownAt');
    const lottery = getLottery();
    if (!info) return;
    if (lottery.countdownEnd) {
        const dt = new Date(Number(lottery.countdownEnd));
        info.innerText = 'Configured live time: ' + dt.toString();
        if (input) {
            // set input to the configured value in local time (datetime-local expects yyyy-mm-ddThh:mm)
            const pad = (n) => n.toString().padStart(2, '0');
            const yyyy = dt.getFullYear();
            const mm = pad(dt.getMonth()+1);
            const dd = pad(dt.getDate());
            const hh = pad(dt.getHours());
            const min = pad(dt.getMinutes());
            input.value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
        }
    } else if (lottery.countdownSeconds) {
        info.innerText = 'Configured countdown (seconds): ' + lottery.countdownSeconds;
    } else {
        info.innerText = 'No live time configured.';
        if (input) input.value = '';
    }
}

// show existing countdown info on load
document.addEventListener('DOMContentLoaded', () => {
    showCountdownInfo();
});

// Reset any existing draw/winner (admin control)
function resetDraw() {
    try {
        localStorage.removeItem('liveWinner');
        // also broadcast the reset so any open live pages can react
        localStorage.setItem('liveWinnerReset', JSON.stringify({ k: Math.random(), t: Date.now() }));
    showStyledAlert('Draw reset — winner cleared.');
    } catch (e) {
    showStyledAlert('Failed to reset draw: ' + e);
    }
}
