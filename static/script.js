
let config = {};
let prayerTimes = {};
let bgInterval;

// Audio Context for beeps
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Prayer keys matching ID and API keys loosely
const prayerMap = {
    'Fajr': 'subuh',
    'Sunrise': 'terbit',
    'Dhuhr': 'dzuhur',
    'Asr': 'ashar',
    'Maghrib': 'maghrib',
    'Isha': 'isya',
    'Imsak': 'imsak'
};

document.addEventListener('DOMContentLoaded', async () => {
    // Unlock audio on first interaction if needed, but for Kiosk usually auto-play works if flagged
    document.body.addEventListener('click', () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
    });

    await loadConfig();
    await fetchSchedule();

    // Init Clock
    setInterval(updateClock, 1000);
    // Init Background Rotation
    startBackgroundRotation();
});

async function loadConfig() {
    try {
        const res = await fetch('/api/config');
        config = await res.json();

        document.getElementById('mosque-name').innerText = config.mosque_name || "Masjid Jasma";
        document.getElementById('mosque-address').innerText = config.mosque_address || "";
        document.getElementById('mosque-phone').innerText = config.mosque_phone || "";

        const marquee = document.getElementById('running-text');
        if (Array.isArray(config.running_text)) {
            marquee.innerText = config.running_text.join('  ***  ');
        } else {
            marquee.innerText = config.running_text || "Selamat Datang";
        }

    } catch (e) {
        console.error("Config load failed", e);
    }
}

async function fetchSchedule() {
    try {
        const response = await fetch('/api/schedule');
        const result = await response.json();
        if (result.status === 'success') {
            prayerTimes = result.data;
            updateScheduleUI();
        }
    } catch (error) {
        console.error('Error fetching schedule:', error);
    }
}

function updateScheduleUI() {
    for (const [apiKey, uiKey] of Object.entries(prayerMap)) {
        if (prayerTimes[apiKey]) {
            const el = document.getElementById(`prayer-${uiKey}`);
            if (el) {
                el.querySelector('.p-time').innerText = prayerTimes[apiKey];
            }
        }
    }

    // Fake Hijri for display
    const date = new Date();
    const hijri = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    document.getElementById('hijri-date').innerText = hijri;
}

function updateClock() {
    const now = new Date();

    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('clock').innerText = timeStr;

    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('gregorian-date').innerText = now.toLocaleDateString('id-ID', dateOptions);

    checkPrayerTime(now);
}

function startBackgroundRotation() {
    const interval = (config.background_interval || 10) * 1000;
    const bgs = document.querySelectorAll('.bg-image');
    let activeIndex = 0;

    setInterval(() => {
        bgs[activeIndex].classList.remove('active');
        activeIndex = (activeIndex + 1) % bgs.length;
        bgs[activeIndex].classList.add('active');
    }, interval);
}

// Logic for States
let currentState = 'NORMAL'; // NORMAL, PRE_ADHAN, ADHAN, IQOMAH, SHOLAT
let targetTime = null; // Used for various countdowns

function checkPrayerTime(now) {
    if (currentState === 'SHOLAT') return; // Stuck in Sholat until timeout reset

    // Determine upcoming prayer
    // Simplified logic: Check if we are exactly at -10 mins or 0 mins (Adhan)

    // We iterate all prayers
    for (const [apiKey, timeStr] of Object.entries(prayerTimes)) {
        if (['Sunrise', 'Imsak', 'Sunset', 'Midnight', 'Firstthird', 'Lastthird'].includes(apiKey)) continue;

        const [h, m] = timeStr.split(':').map(Number);
        const prayerDate = new Date();
        prayerDate.setHours(h, m, 0, 0);

        const diffMs = prayerDate - now;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor(diffMs / 1000);

        // PRE ADHAN (-10 mins, e.g., 600 seconds)
        // If we startup/refresh within the 10 min window (e.g. 5 mins left), we should still show it.
        if (diffSecs <= 600 && diffSecs > 0 && currentState === 'NORMAL') {
            triggerPreAdhan(apiKey, prayerDate);
        }

        // ADHAN (0 mins)
        // Range: between -1 and 1 sec
        if (diffSecs === 0 && (currentState === 'NORMAL' || currentState === 'PRE_ADHAN')) {
            triggerAdhan(apiKey);
        }
    }

    if (currentState === 'PRE_ADHAN') updatePreAdhanCountdown(now);
    if (currentState === 'IQOMAH') updateIqomahCountdown(now);
}

// --- Audio ---
function beep(duration, frequency, count) {
    if (count <= 0) return;

    if (audioCtx.state === 'suspended') audioCtx.resume();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'square';
    oscillator.frequency.value = frequency; // Hz
    gainNode.gain.value = 0.1; // Volume

    oscillator.start();

    setTimeout(() => {
        oscillator.stop();
        if (count > 1) {
            setTimeout(() => beep(duration, frequency, count - 1), 200); // 200ms pause
        }
    }, duration);
}


// --- Triggers ---

function triggerPreAdhan(prayerName, prayerDate) {
    currentState = 'PRE_ADHAN';
    targetTime = prayerDate;

    // Beep 1x
    beep(500, 880, 1);

    // UI
    document.getElementById('pre-adhan-name').innerText = prayerName.toUpperCase(); // Or map to indo
    document.getElementById('pre-adhan-overlay').classList.remove('hidden');
}

function updatePreAdhanCountdown(now) {
    const diff = targetTime - now;
    if (diff <= 0) return; // Wait for Adhan trigger

    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    document.getElementById('pre-adhan-timer').innerText = `${min}:${sec.toString().padStart(2, '0')}`;
}

function triggerAdhan(prayerName) {
    console.log(`Adhan for ${prayerName}`);
    currentState = 'ADHAN';

    // Beep continuous-ish (3x long)
    beep(1000, 440, 3);

    // UI
    document.getElementById('pre-adhan-overlay').classList.add('hidden');
    document.getElementById('adhan-overlay').classList.remove('hidden');
    document.getElementById('adhan-name').innerText = prayerName.toUpperCase();

    // Highlight Prayer Stick
    const uiKey = prayerMap[prayerName];
    if (uiKey) {
        document.querySelectorAll('.prayer-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`prayer-${uiKey}`).classList.add('active');
    }

    // Wait for Adhan Duration (e.g., 4 mins) -> Then Iqomah
    setTimeout(() => {
        startIqomahSequence();
    }, 4 * 60 * 1000); // 4 minutes adhan duration
}

function startIqomahSequence() {
    currentState = 'IQOMAH';
    const delayMin = config.iqomah_delay_minutes || 10;
    const now = new Date();
    targetTime = new Date(now.getTime() + delayMin * 60000);

    // Beep 2x
    beep(500, 660, 2);

    document.getElementById('adhan-overlay').classList.add('hidden');
    document.getElementById('iqomah-overlay').classList.remove('hidden');
}

function updateIqomahCountdown(now) {
    const diff = targetTime - now;

    if (diff <= 0) {
        enterSholatMode();
    } else {
        const min = Math.floor(diff / 60000);
        const sec = Math.floor((diff % 60000) / 1000);
        document.getElementById('iqomah-timer').innerText = `-${min}:${sec.toString().padStart(2, '0')}`;
    }
}

function enterSholatMode() {
    currentState = 'SHOLAT';
    // Beep Long
    beep(2000, 300, 1);

    document.getElementById('iqomah-overlay').classList.add('hidden');
    document.getElementById('sholat-overlay').classList.remove('hidden');

    // Hide others
    document.querySelector('.top-bar').style.opacity = '0';
    document.querySelector('.prayer-strip').style.opacity = '0';
    document.querySelector('.footer-marquee').style.opacity = '0';

    // Stay in Sholat mode for 10 mins
    setTimeout(() => {
        resetToNormal();
    }, 10 * 60 * 1000);
}

function resetToNormal() {
    currentState = 'NORMAL';
    document.getElementById('sholat-overlay').classList.add('hidden');

    // Restore UI
    document.querySelector('.top-bar').style.opacity = '1';
    document.querySelector('.prayer-strip').style.opacity = '1';
    document.querySelector('.footer-marquee').style.opacity = '1';

    document.querySelectorAll('.prayer-item').forEach(el => el.classList.remove('active'));
}
