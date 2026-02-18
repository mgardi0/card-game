// game.js - مێشکی یاری (Logic & AI)

// --- ١. داتای یاری (Game State) ---
const state = {
    player: { hp: 100, maxHp: 100, mana: 5, maxMana: 10, hand: [] },
    bots: [
        { id: 'bot-1', name: 'تالیب', hp: 100, maxHp: 100, type: 'defensive' },
        { id: 'bot-2', name: 'شێرکۆ', hp: 150, maxHp: 150, type: 'boss' },
        { id: 'bot-3', name: 'ئاڵا', hp: 80, maxHp: 80, type: 'smart' }
    ],
    turn: 0, // 0=Player, 1=Bot1, 2=Bot2, 3=Bot3
    round: 1,
    isGameOver: false,
    timer: 30
};

// لیستی کارتەکان (Database)
const cardsDB = [
    { id: 1, name: "فەرهاد پیرباڵ", desc: "خارە هەموو شتێک تێک دەدات!", cost: 3, dmg: 20, type: "legendary", icon: "🦁" },
    { id: 2, name: "کویزی کتوپڕ", desc: "١٠ وزە لە هەمووان دەبات", cost: 2, dmg: 10, aoe: true, type: "attack", icon: "📝" },
    { id: 3, name: "شۆربای نیسک", desc: "+٢٠ وزە بۆ خۆت", cost: 1, heal: 20, type: "defense", icon: "🍲" },
    { id: 4, name: "غەیبەت", desc: "١٥ وزە لە یەک کەس دەبات", cost: 1, dmg: 15, type: "attack", icon: "🤫" },
    { id: 5, name: "نوێنەری قاعە", desc: "بۆ ماوەیەک پارێزراو دەبیت", cost: 2, shield: 15, type: "defense", icon: "🛡️" },
    { id: 6, name: "ئینزیبات", desc: "هێرشی بەهێز! ٣٠ وزە دەبات", cost: 4, dmg: 30, type: "special", icon: "👮" },
    { id: 7, name: "خەوتن", desc: "+١٠ وزە و +١ سەبر", cost: 0, heal: 10, mana: 1, type: "defense", icon: "😴" },
    { id: 8, name: "مەعاش هات", desc: "٢٥ وزە لە هەمووان دەبات", cost: 5, dmg: 25, aoe: true, type: "legendary", icon: "💰" },
    { id: 9, name: "چای کافتریا", desc: "+٥ وزە", cost: 0, heal: 5, type: "defense", icon: "☕" },
    { id: 10, name: "پێنوسی جاف", desc: "هێرشێکی سادە (٥ وزە)", cost: 0, dmg: 5, type: "attack", icon: "🖊️" }
];

// --- ٢. دەستپێکردن ---

window.onload = () => {
    // لابردنی شاشەی بارکردن دوای ٢ چرکە
    setTimeout(() => {
        document.getElementById('loader-screen').style.opacity = '0';
        setTimeout(() => document.getElementById('loader-screen').style.display = 'none', 1000);
    }, 2000);
};

function startGame() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-scene').classList.remove('hidden');
    
    // دابەشکردنی ٥ کارت
    for(let i=0; i<5; i++) drawCard();
    
    updateUI();
    startTimer();
}

// --- ٣. سیستەمی کارت (Card System) ---

function drawCard() {
    if (state.player.hand.length >= 7) return; // زۆرترین ژمارەی کارت
    const randomCard = cardsDB[Math.floor(Math.random() * cardsDB.length)];
    state.player.hand.push(randomCard);
    renderHand();
}

function renderHand() {
    const handDiv = document.getElementById('player-hand');
    handDiv.innerHTML = '';

    state.player.hand.forEach((card, index) => {
        const el = document.createElement('div');
        el.className = `card ${card.type}`;
        el.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-image">${card.icon}</div>
            <div class="card-title">${card.name}</div>
            <div class="card-desc">${card.desc}</div>
        `;
        
        // ئەنیمەیشنی هاتنە ناوەوە
        el.style.opacity = '0';
        el.style.transform = 'translateY(100px)';
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);

        el.onclick = () => playPlayerCard(index);
        handDiv.appendChild(el);
    });
}

// --- ٤. نۆرەی یاریزان (Player Logic) ---

function playPlayerCard(index) {
    if (state.turn !== 0) {
        showToast("⚠️ نۆرەی تۆ نییە! چاوەڕێ بکە...");
        return;
    }

    const card = state.player.hand[index];

    // پشکنینی وزە (Mana)
    if (state.player.mana < card.cost) {
        showToast("⚠️ سەبرت بەشی ئەم کارتە ناکات!");
        return;
    }

    // کەمکردنەوەی سەبر
    state.player.mana -= card.cost;

    // جێبەجێکردنی کارت
    executeCardEffect(card, 'player');

    // لابردنی کارت لە دەست
    state.player.hand.splice(index, 1);
    renderHand();

    // نیشاندانی کارتی فڕێدراو
    showPlayedCard(card);
    updateUI();

    // کۆتایی نۆرە
    nextTurn();
}

function executeCardEffect(card, source) {
    if (card.name === "فەرهاد پیرباڵ") {
        triggerFarhadEvent();
    } 
    else if (card.heal) {
        const target = source === 'player' ? state.player : state.bots.find(b => b.id === source);
        target.hp = Math.min(target.hp + card.heal, target.maxHp);
        showDamageText(source === 'player' ? 'player-hand' : source, `+${card.heal}`, 'green');
    } 
    else if (card.aoe) {
        // هێرش بۆ هەمووان
        if (source === 'player') {
            state.bots.forEach(bot => damageBot(bot, card.dmg));
        } else {
            damagePlayer(card.dmg);
            state.bots.filter(b => b.id !== source).forEach(b => damageBot(b, card.dmg / 2));
        }
    } 
    else {
        // هێرش بۆ یەک ئامانج
        if (source === 'player') {
            // بە ڕەمەکی لە بۆتێک دەدات
            const randomBot = state.bots[Math.floor(Math.random() * state.bots.length)];
            damageBot(randomBot, card.dmg);
        } else {
            damagePlayer(card.dmg);
        }
    }
}

function damageBot(bot, amount) {
    if (bot.hp <= 0) return;
    bot.hp = Math.max(bot.hp - amount, 0);
    
    // جووڵەی لەرینەوە (Shake Animation)
    const botEl = document.getElementById(bot.id);
    botEl.classList.add('damaged-anim');
    setTimeout(() => botEl.classList.remove('damaged-anim'), 500);
    
    showDamageText(bot.id, `-${amount}`, 'red');
}

function damagePlayer(amount) {
    state.player.hp = Math.max(state.player.hp - amount, 0);
    document.querySelector('.player-hud').classList.add('damaged-anim');
    setTimeout(() => document.querySelector('.player-hud').classList.remove('damaged-anim'), 500);
    showDamageText('player-hand', `-${amount}`, 'red');
}

// --- ٥. نۆرەی بۆتەکان (AI Logic) ---

function nextTurn() {
    checkGameOver();
    if (state.isGameOver) return;

    state.turn++;
    if (state.turn > 3) {
        state.turn = 0; // دەگەڕێتەوە بۆ یاریزان
        state.round++;
        state.player.mana = Math.min(state.player.mana + 3, state.player.maxMana); // پڕکردنەوەی سەبر
        drawCard(); // کارتێکی نوێ
        document.getElementById('turn-indicator').innerText = "نۆرەی تۆیە!";
        document.getElementById('turn-indicator').style.background = "#ffd700";
        return;
    }

    // گۆڕینی نیشاندەر
    const botNames = ["تالیب", "مامۆستا شێرکۆ", "ئاڵا"];
    document.getElementById('turn-indicator').innerText = `نۆرەی ${botNames[state.turn - 1]}...`;
    document.getElementById('turn-indicator').style.background = "#ccc";

    // AI یاریکردن (بە دواخستنەوە بۆ ئەوەی سروشتی دیار بێت)
    setTimeout(() => botPlay(state.turn), 1500);
}

function botPlay(turnIndex) {
    const bot = state.bots[turnIndex - 1];
    if (bot.hp <= 0) {
        nextTurn(); // ئەگەر مردبوو، نۆرەکەی دەفەوتێت
        return;
    }

    // دیاریکردنی بۆتەکە (Highlight)
    document.querySelectorAll('.opponent').forEach(el => el.classList.remove('active-turn'));
    document.getElementById(bot.id).classList.add('active-turn');

    // زیرەکی بۆت
    let actionType = Math.random();
    let cardToPlay;

    // لۆژیکی تایبەتی بۆتەکان
    if (bot.type === 'boss' && state.round % 3 === 0) {
        // بۆس هەموو ٣ گەڕ جارێک هێرشی بەهێز دەکات
        cardToPlay = cardsDB.find(c => c.name === "مەعاش هات");
    } else if (bot.hp < 30 && Math.random() > 0.3) {
        // ئەگەر خەریکە دەمرێت، خۆی چارەسەر دەکات
        cardToPlay = cardsDB.find(c => c.type === "defense");
    } else {
        // کارتێکی ڕەمەکی
        cardToPlay = cardsDB[Math.floor(Math.random() * cardsDB.length)];
    }

    // جێبەجێکردن
    showPlayedCard(cardToPlay);
    executeCardEffect(cardToPlay, bot.id);
    updateUI();

    // نۆرەی داهاتوو
    nextTurn();
}

// --- ٦. ڕووداوەکان و نوێکردنەوەکان (Events & UI) ---

function updateUI() {
    // Player Stats
    document.getElementById('player-hp-bar').style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
    document.getElementById('player-hp-text').innerText = state.player.hp;
    
    document.getElementById('player-mana-bar').style.width = `${(state.player.mana / state.player.maxMana) * 100}%`;

    // Bots Stats
    state.bots.forEach(bot => {
        const bar = document.getElementById(`hp-${bot.id}`);
        const text = document.getElementById(`text-${bot.id}`);
        const botEl = document.getElementById(bot.id);
        
        bar.style.width = `${(bot.hp / bot.maxHp) * 100}%`;
        text.innerText = `${bot.hp}%`;

        if (bot.hp <= 0) {
            botEl.style.opacity = '0.4';
            botEl.style.filter = 'grayscale(100%)';
        }
    });

    document.getElementById('round-num').innerText = state.round;
}

function showPlayedCard(card) {
    const zone = document.getElementById('play-zone');
    zone.innerHTML = ''; // پاککردنەوە

    const el = document.createElement('div');
    el.className = `card ${card.type} card-drop-anim`;
    el.style.transform = 'scale(0.8)'; // بچووکتر لەسەر مێز
    el.innerHTML = `
        <div class="card-image" style="font-size:2rem">${card.icon}</div>
        <div class="card-title" style="font-size:0.7rem">${card.name}</div>
    `;
    zone.appendChild(el);
}

function showToast(msg) {
    const box = document.getElementById('game-messages');
    box.innerHTML = `<div style="background:rgba(0,0,0,0.8); color:gold; padding:10px; border-radius:10px; margin-top:10px; animation:throwCard 0.3s">${msg}</div>`;
    setTimeout(() => box.innerHTML = '', 3000);
}

function showDamageText(targetId, text, color) {
    // نیشاندانی ژمارەکان لەسەر شاشە (Floating Text)
    // تێبینی: ئەمە پێویستی بە CSSی زیاترە، لێرە بە سادەیی Toast بەکار دەبەین
    // بەڵام دەتوانین پەرەی پێ بدەین
}

// --- ٧. ڕووداوی فەرهاد پیرباڵ ---
function triggerFarhadEvent() {
    document.getElementById('modal-farhad').classList.remove('hidden');
}

function resolveEvent(choice) {
    document.getElementById('modal-farhad').classList.add('hidden');
    if (choice === 'dance') {
        state.player.hp -= 10;
        showToast("💃 سەماکردن ماندووی کردی (-10 وزە)");
    } else if (choice === 'run') {
        showToast("🏃 ڕات کرد! نۆرەکەت سوتا.");
        state.turn++; // نۆرە دەپەڕێنێت
    } else {
        // Chaos
        state.bots.forEach(b => b.hp -= 10);
        state.player.hp -= 10;
        showToast("😵 هەمووان تووشی شۆک بوون (-10 بۆ هەمووان)");
    }
    updateUI();
}

// --- ٨. کۆتایی یاری ---
function checkGameOver() {
    if (state.player.hp <= 0) {
        endGame(false);
    } else if (state.bots.every(b => b.hp <= 0)) {
        endGame(true);
    }
}

function endGame(win) {
    state.isGameOver = true;
    document.getElementById('modal-gameover').classList.remove('hidden');
    document.getElementById('end-title').innerText = win ? "🎉 پیرۆزە دەرچوویت!" : "💀 کەوتیت (دۆڕان)!";
    document.getElementById('end-msg').innerText = win ? "هەموو تاقیکردنەوەکانت بڕی." : "وزەت نەما و مامۆستا دەری کردی.";
}

function startTimer() {
    setInterval(() => {
        if (!state.isGameOver) {
            state.timer++;
            let mins = Math.floor(state.timer / 60);
            let secs = state.timer % 60;
            document.getElementById('timer-display').innerText = 
                `${mins < 10 ? '0'+mins : mins}:${secs < 10 ? '0'+secs : secs}`;
        }
    }, 1000);
}
