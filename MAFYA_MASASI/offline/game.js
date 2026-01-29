// ========================================
// MAFYA ELEMENT - FULL GAME v2
// ========================================

const botNamesPool = [
    "Mevel", "Andy", "Jonh", "Thomas", "Mary", "Susan", 
    "Karen", "Charles", "Richard", "Michael", "William", 
    "James", "Patricia", "Linda"
];

const bgMusic = document.getElementById("bgMusic");
const cardSound = document.getElementById('cardSound');
const flipSound = document.getElementById('flipSound');
const correctSound = document.getElementById('correctSound');
const wrongSound = document.getElementById('wrongSound');

let activeSFXCount = 0;
let players = [];
let deck = [];
let mafiaCard = "";
let currentTurnPlayer = 0;
let centerPile = [];
let gameActive = true;
let discardPile = [];

// Ses Yönetimi
function playSFX(sfxIdOrElement) {
  let sfx = sfxIdOrElement;
  if(typeof sfxIdOrElement === 'string'){
    sfx = document.getElementById(sfxIdOrElement);
  }
  if(!sfx) return;
  
  if(activeSFXCount === 0){
    try{ bgMusic.pause(); }catch(e){}
  }
  activeSFXCount++;

  try{ sfx.currentTime = 0; }catch(e){}
  
  // Önceki onended handler'ı temizle
  sfx.onended = null;
  
  sfx.play().catch(e => {});

  sfx.onended = () => {
    activeSFXCount--;
    if(activeSFXCount <= 0){
      activeSFXCount = 0;
      try{ bgMusic.play().catch(e => {}); }catch(e){}
    }
  };
}

// ========== UI KONTROLÜ ==========

const startBtn = document.getElementById("start-btn");
const startScreen = document.getElementById("start-screen");
const gameContainer = document.getElementById("game-container");

// Bot seçim ekranını HTML'ye ekle
function initBotSelectScreen() {
  startScreen.innerHTML = `
    <div style="background: rgba(0,0,0,0.7); padding: 40px; border-radius: 15px; max-width: 400px;">
      <h1>Mafya Element</h1>
      <p style="margin: 20px 0; font-size: 18px;">Kaç bot ile oynamak istiyorsunuz?</p>
      <input type="number" id="botCountInput" min="1" max="10" value="3" style="padding: 10px; font-size: 16px; width: 100%; margin: 20px 0; border: none; border-radius: 5px;">
      <button id="botSelectBtn" style="width: 100%; padding: 15px; font-size: 18px;">Oyunu Başlat</button>
    </div>
  `;
  
  document.getElementById("botSelectBtn").addEventListener("click", () => {
    const count = parseInt(document.getElementById("botCountInput").value);
    if(count >= 1 && count <= 10) {
      startScreen.style.display = "none";
      gameContainer.style.display = "block";
      bgMusic.play().catch(e => {});
      initGame(count);
    }
  });
}

if(startBtn){
  startBtn.addEventListener("click", () => {
    initBotSelectScreen();
  });
}

// ========== OYUNU BAŞLAT ==========

function initGame(botCount) {
    console.log(`${botCount} bot ile oyun başlatılıyor`);
    
    players = [{ 
        name: "Siz", 
        hand: [], 
        isBot: false, 
        alive: true,
        lastPlayedCard: null
    }];
    
    let shuffledNames = [...botNamesPool].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < botCount; i++) {
        players.push({ 
            name: shuffledNames[i] || `Bot ${i+1}`, 
            hand: [], 
            isBot: true, 
            alive: true,
            lastPlayedCard: null,
            suspicionLevel: Math.random() * 0.5 // Bot'un şüphe düzeyi (strateji için)
        });
    }

    setupDeck();
    
    // Mafya kartını belirle
    const mafiaCards = ['AY', 'GUNES', 'YILDIZ'];
    mafiaCard = mafiaCards[Math.floor(Math.random() * 3)];
    console.log("Mafya kartı:", mafiaCard);
    
    centerPile = [];
    currentTurnPlayer = 0;
    gameActive = true;
    
    renderUI();
    
    // Botlar sırası gelince hamle yapsın
    if(players[currentTurnPlayer].isBot) {
        setTimeout(() => botPlayCard(), 1500);
    }
}

// ========== DESTE OLUŞTUR ==========

function setupDeck() {
    const types = ['AY', 'GUNES', 'YILDIZ', 'JOKER'];
    let deckTemp = [];

    // Her tür için eşit olasılık: daha büyük destede her birinden 25 adet
    types.forEach(t => {
        for(let i=0; i<25; i++) {
            deckTemp.push({ type: t, img: `assets/cards/${t}.png` });
        }
    });

    // Güvenilir karıştırma (Fisher-Yates)
    shuffle(deckTemp);
    
    // Her oyuncuya 4 kart dağıt (güncelleme)
    players.forEach(p => {
        for(let i=0; i<4; i++) {
            if(deckTemp.length > 0) {
                p.hand.push(deckTemp.pop());
            }
        }
    });
    
    deck = deckTemp;
    // Debug: destede tür dağılımını konsola yaz
    const counts = deck.reduce((acc,c)=>{acc[c.type]=(acc[c.type]||0)+1;return acc;},{})
    console.log('Deck dağılımı:', counts);
}

// Basit Fisher-Yates karıştırma
function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// Deste azaldığında ortaya konmuş kartları toplayıp herkese 4 karta tamamla
function refillDeckAndDealIfNeeded(){
    const alivePlayers = players.filter(p=>p.alive);
    const neededPerPlayer = 4;
    const totalNeeded = alivePlayers.length * neededPerPlayer;
    // Eğer hiçbir oyuncunun eli boş değilse ve destede kart varsa, hiçbir şey yapma
    const someoneEmpty = alivePlayers.some(p => p.hand.length === 0);
    if(!someoneEmpty && deck.length > 0) return;

    // Desti yetersiz veya birinin eli boş: ortaya konmuş kartları desteye ekle (varsa)
    if(centerPile.length > 0){
        const reclaimed = centerPile.map(e=> e.card ? e.card : e);
        centerPile = [];
        deck = deck.concat(reclaimed);
        shuffle(deck);
    }

    // Her oyuncunun elini 4 karta tamamla (sadece yaşayanlara)
    alivePlayers.forEach(p=>{
        while(p.hand.length < neededPerPlayer && deck.length>0){
            p.hand.push(deck.pop());
        }
    });

    renderUI();
}

// ========== KART OYNAMA ==========

function playCard(cardIndex) {
    if(!gameActive) return;
    
    const player = players[currentTurnPlayer];
    if(player.isBot || !player.alive) return;
    
    const card = player.hand[cardIndex];
    if(!card) return;
    
    player.hand.splice(cardIndex, 1);
    player.lastPlayedCard = card;
    // Ortaya arka yüz ile ekle (reveal edilene kadar ARKA.png gösterilecek)
    centerPile.push({ card: card, owner: currentTurnPlayer, revealed: false });
    
    // Kart atma anındaki flip sesi
    playSFX('flipSound');
    
    console.log(`${player.name} oynadı: ${card.type}`);
    
    renderUI();
    
    // Sonraki oyuncuya sıra
    setTimeout(() => {
        nextTurn();
        // Deste biterse yeniden dağıt
        refillDeckAndDealIfNeeded();
    }, 500);
}

// Bot kartını oynasın
function botPlayCard() {
    if(!gameActive) return;
    
    const bot = players[currentTurnPlayer];
    if(!bot.isBot || !bot.alive) {
        nextTurn();
        return;
    }
    
    // Bot stratejisi: Mafya kartını sakla, başka kartı oyna
    let cardToPlay = null;
    const mafiaIndex = bot.hand.findIndex(c => c.type === mafiaCard);
    
    if(mafiaIndex !== -1 && Math.random() > 0.3) {
        // Mafya kartını %70 oasla sakla
        cardToPlay = bot.hand[Math.floor(Math.random() * bot.hand.length)];
        if(cardToPlay.type === mafiaCard) {
            // Başka bir kart seç
            const others = bot.hand.filter(c => c.type !== mafiaCard);
            if(others.length > 0) {
                cardToPlay = others[Math.floor(Math.random() * others.length)];
            }
        }
    } else if(mafiaIndex !== -1) {
        // Mafya kartını oynat (cesur bot veya riskli)
        cardToPlay = bot.hand[mafiaIndex];
    } else {
        // Rastgele bir kart oyna
        cardToPlay = bot.hand[Math.floor(Math.random() * bot.hand.length)];
    }
    
    if(cardToPlay) {
        bot.hand.splice(bot.hand.indexOf(cardToPlay), 1);
        bot.lastPlayedCard = cardToPlay;
        // Ortaya arka yüz ile ekle
        centerPile.push({ card: cardToPlay, owner: currentTurnPlayer, revealed: false });
        
        // Bot kartını ortaya koyma sesi (flip)
        playSFX('flipSound');
        console.log(`${bot.name} oynadı: ${cardToPlay.type}`);
    }
    
    renderUI();
    
    setTimeout(() => {
        nextTurn();
        refillDeckAndDealIfNeeded();
    }, 1500);
}

// Sıra değişimi
function nextTurn() {
    currentTurnPlayer++;
    if(currentTurnPlayer >= players.length) {
        currentTurnPlayer = 0;
    }
    
    // Ölü oyuncu varsa atla
    if(!players[currentTurnPlayer].alive) {
        nextTurn();
        return;
    }
    
    // Sırada insan varsa dur, bot varsa önce itiraz şansı ver, sonra oynamasını sağla
    if(players[currentTurnPlayer].isBot) {
        // Eğer bot itiraz ettiyse hamle yapmayacak, itiraz işleminden sonra sıra devam edecektir
        const didObject = botMakeObjection();
        if(!didObject) setTimeout(() => botPlayCard(), 800);
    }
    
    renderUI();
}

// ========== İTİRAZ SİSTEMİ ==========

function openObjectionMenu() {
    if(!gameActive || centerPile.length === 0) return;
    
    const objectionDiv = document.createElement('div');
    objectionDiv.id = 'objectionMenu';
    objectionDiv.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: #1a1a1a; padding: 30px; border-radius: 10px;
        max-width: 500px; text-align: center; border: 2px solid #e74c3c;
    `;
    
    content.innerHTML = '<h2 style="margin-bottom: 20px;">Kimin Kartına İtiraz Edeceksiniz?</h2>';
    
    // Son oynayan oyuncuları listele (ortaya atılan kartlar)
    const playedPlayers = [...new Set(
        players.filter(p => p.lastPlayedCard && p.alive && p !== players[0])
    )];
    
    if(playedPlayers.length === 0) {
        content.innerHTML += '<p>İtiraz edecek kimse yok!</p>';
        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Kapat';
        closeBtn.onclick = () => objectionDiv.remove();
        content.appendChild(closeBtn);
        objectionDiv.appendChild(content);
        document.body.appendChild(objectionDiv);
        return;
    }
    
    playedPlayers.forEach(player => {
        const btn = document.createElement('button');
        btn.innerText = `${player.name}`;
        btn.style.cssText = 'margin: 10px; padding: 10px 20px; font-size: 16px;';
        btn.onclick = () => {
            objectionDiv.remove();
            // İnsan itirazı: objector = players[0]
            handleObjection(player, () => {
                renderUI();
                checkGameEnd();
            }, players[0]);
        };
        content.appendChild(btn);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'İptal';
    cancelBtn.style.cssText = 'margin: 10px; padding: 10px 20px; background: #666;';
    cancelBtn.onclick = () => objectionDiv.remove();
    content.appendChild(cancelBtn);
    
    objectionDiv.appendChild(content);
    document.body.appendChild(objectionDiv);
}

function handleObjection(targetPlayer, afterCallback, objector) {
    if(!targetPlayer.lastPlayedCard) return;
    // Determine objector: explicit param > current turn player > human fallback
    if(!objector) {
        if(players[currentTurnPlayer] && players[currentTurnPlayer].isBot) objector = players[currentTurnPlayer];
        else objector = players[0];
    }
    
    const card = targetPlayer.lastPlayedCard;
    // Yeni kural: Eğer hedef mafya kartı veya JOKER atmadıysa itiraz DOĞRU kabul edilsin.
    // Yani doğru itiraz = hedefin attığı kart NE JOKER NE DE mafyaCard ise.
    const isObjectionCorrect = (card.type !== mafiaCard && card.type !== 'JOKER');
    
    // Müzik durmuş olabilir, tüm ses sayacını sıfırla
    activeSFXCount = 0;
    
    // Ortadaki ilgili kartı aç (reveal) ve açılma sesi çal
    const entry = centerPile.find(e => e.card === card && !e.revealed);
    if(entry){
        entry.revealed = true;
        // Bot kartı açılıyorsa veya insan kartı açılıyorsa card.mp3 çal
        playSFX('cardSound');
        renderUI();
    }

    // Kartı ayrıca büyük göster (overlay)
    const cardDisplay = document.createElement('div');
    cardDisplay.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 2000; background: white; padding: 30px; border-radius: 10px;
    `;
    cardDisplay.innerHTML = `<img src="${card.img}" style="width: 150px; height: 225px; border-radius: 5px;">`;
    document.body.appendChild(cardDisplay);

    setTimeout(() => {
        cardDisplay.remove();

        if(isObjectionCorrect) {
            // Doğru itiraz (hedef mafya/JOKER atmamış)
            playSFX('correctSound');

            const message = document.createElement('div');
            message.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                z-index: 2000; background: #27ae60; color: white; padding: 30px;
                border-radius: 10px; font-size: 20px; text-align: center;
            `;
            message.innerHTML = `<h2>DOĞRU İTİRAZ! ✓</h2>`;
            document.body.appendChild(message);

            setTimeout(() => {
                message.remove();

                // %50 şans ile hedef oyuncu eleniyor
                if(Math.random() < 0.5) {
                    targetPlayer.alive = false;
                    alert(`${targetPlayer.name} elendi!`);
                    if(players[currentTurnPlayer] === targetPlayer) {
                        nextTurn();
                    }
                } else {
                    alert('Doğru ama ceza yok!');
                }

                renderUI();
                
                // Sonunda müzik başlat
                activeSFXCount = 0;
                bgMusic.play().catch(e => {});
                
                if(typeof afterCallback === 'function') afterCallback();
            }, 1500);
        } else {
            // Yanlış itiraz (hedef JOKER veya gerçek mafya kartı atmış)
            playSFX('wrongSound');

            const message = document.createElement('div');
            message.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                z-index: 2000; background: #e74c3c; color: white; padding: 30px;
                border-radius: 10px; font-size: 20px; text-align: center;
            `;
            message.innerHTML = `<h2>YANLIŞ İTİRAZ! ✗</h2>`;
            document.body.appendChild(message);

            setTimeout(() => {
                message.remove();

                // %50 şans ile itiraz eden elenir
                if(Math.random() < 0.5) {
                    objector.alive = false;
                    if(objector === players[0]) alert('Siz elendi!');
                    else alert(`${objector.name} elendi!`);
                    checkGameEnd();
                } else {
                    alert('Yanlış ama ceza yok!');
                }

                renderUI();
                
                // Sonunda müzik başlat
                activeSFXCount = 0;
                bgMusic.play().catch(e => {});
                
                if(typeof afterCallback === 'function') afterCallback();
            }, 1500);
        }
    }, 2000);
}

// Bot'un itiraz yapma kararı
function botMakeObjection() {
    if(!gameActive || centerPile.length === 0) return;
    
    // Botlar her zaman itiraz etmezler, stratejiyle karar verirler
    const bot = players[currentTurnPlayer];
    if(!bot.isBot) return;
    
    // Başka bir oyuncu oynamış mı?
    const otherPlayers = players.filter(p => p !== bot && p.alive && p.lastPlayedCard);
    if(otherPlayers.length === 0) return;
    
    // İtiraz etme şansı sabitlendi: %10 olasılık
    if(Math.random() > 0.1) return false;

    // Rastgele bir oyuncuya itiraz et
    const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
    console.log(`${bot.name} ${target.name}'a itiraz etti`);
    
    setTimeout(() => {
        handleObjection(target, () => {
            // After a bot's objection resolves, advance the turn
            nextTurn();
            refillDeckAndDealIfNeeded();
            renderUI();
        }, bot);
    }, 800);
    return true;
}

// Oyun bitişini kontrol et
function checkGameEnd() {
    const alivePlayers = players.filter(p => p.alive);
    
    if(alivePlayers.length === 1) {
        gameActive = false;
        alert(`Oyun bitti! ${alivePlayers[0].name} kazandı!`);
        location.reload();
    }
}

// ========== UI RENDER ==========

function renderUI() {
    const playerHandDiv = document.getElementById("player-hand");
    const botHandsDiv = document.getElementById("bot-hands");
    const mafiaDisplay = document.getElementById("mafia-card-display");
    const centerPileDiv = document.getElementById("center-pile");
    
    // Oyuncu Eline
    if(playerHandDiv) {
        playerHandDiv.innerHTML = "";
        const humanPlayer = players.find(p => !p.isBot);
        if(humanPlayer) {
            humanPlayer.hand.forEach((card, idx) => {
                const img = document.createElement("img");
                img.src = card.img;
                img.style.width = "80px";
                img.style.height = "120px";
                img.style.margin = "5px";
                img.style.cursor = "pointer";
                img.style.borderRadius = "5px";
                
                // Sıra insan oyuncudaysa tıklanabilir
                if(currentTurnPlayer === 0 && humanPlayer.alive) {
                    img.onclick = () => playCard(idx);
                    img.style.opacity = "1";
                } else {
                    img.style.opacity = "0.6";
                }
                
                playerHandDiv.appendChild(img);
            });
        }
    }
    
    // Bot Elleri
    if(botHandsDiv) {
        botHandsDiv.innerHTML = "";
        players.forEach((p, idx) => {
            if(p.isBot) {
                const div = document.createElement("div");
                div.style.cssText = `
                    margin: 10px; padding: 15px; background: ${p.alive ? '#333' : '#666'};
                    border-radius: 5px; border: 2px solid ${p.alive ? '#e74c3c' : '#999'};
                    min-width: 120px; opacity: ${p.alive ? '1' : '0.5'};
                `;
                div.innerHTML = `
                    <strong>${p.name}</strong><br>
                    ${p.hand.length} Kart
                    ${idx === currentTurnPlayer && p.alive ? '<br><em style="color: #f39c12;">Sırası...</em>' : ''}
                `;
                botHandsDiv.appendChild(div);
            }
        });
    }
    
    // Ortaya atılan kartlar (arka yüz/ön yüz gösterimi)
    if(centerPileDiv) {
        centerPileDiv.innerHTML = "";
        centerPile.forEach(entry => {
            const img = document.createElement("img");
            const src = entry.revealed ? entry.card.img : 'assets/cards/ARKA.png';
            img.src = src;
            img.style.cssText = 'width: 80px; height: 120px; margin: 5px; border-radius: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);';
            centerPileDiv.appendChild(img);
        });
    }

    // Deck pile (sol üst köşe) gösterimi
    const deckPileDiv = document.getElementById("deck-pile");
    if(deckPileDiv){
        deckPileDiv.innerHTML = "";
        const count = deck.length;
        const show = Math.min(4, Math.max(1, count));
        for(let i=0;i<show;i++){
            const dimg = document.createElement('img');
            dimg.src = 'assets/cards/ARKA.png';
            dimg.style.cssText = `width:48px;height:72px;position:relative;left:${i*2}px;top:${-i*2}px;box-shadow:0 2px 6px rgba(0,0,0,0.4);border-radius:4px;`;
            deckPileDiv.appendChild(dimg);
        }
        // gösterilecek sayı etiketi
        const label = document.createElement('div');
        label.innerText = `${count}`;
        label.style.cssText = 'color:#fff;margin-top:6px;font-weight:bold;text-shadow:1px 1px 2px rgba(0,0,0,0.5);';
        deckPileDiv.appendChild(label);
    }
    
    // Mafya kartı
    if(mafiaDisplay) {
        mafiaDisplay.innerText = `Mafya Kartı: ${mafiaCard}`;
    }
}

// ========== İTİRAZ BUTONU ==========

function addObjectionButton() {
    let objBtn = document.getElementById("objectionBtn");
    
    if(!objBtn) {
        objBtn = document.createElement('button');
        objBtn.id = "objectionBtn";
        objBtn.innerText = 'İTİRAZ ET';
        objBtn.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            padding: 15px 40px; font-size: 18px; background: #e74c3c;
            color: white; border: none; border-radius: 10px;
            cursor: pointer; z-index: 100; font-weight: bold;
        `;
        objBtn.onclick = openObjectionMenu;
        document.body.appendChild(objBtn);
    }
}

// Sayfa yüklendiğinde butonu ekle
setTimeout(() => {
    addObjectionButton();
}, 100);

console.log("Game.js v2 yüklendi");
