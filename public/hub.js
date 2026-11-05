// 100+ Games Dynamic Hub Controller
const gamesGrid = document.getElementById('gamesGrid');
const catPills = document.querySelectorAll('.cat-pill');
const catSelectItems = document.querySelectorAll('.cat-select-item');
const gameSearchInput = document.getElementById('gameSearchInput');
const totalGameCount = document.getElementById('totalGameCount');

const openMenuBtn = document.getElementById('openMenuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuModal = document.getElementById('menuModal');

const openReviewBtn = document.getElementById('openReviewBtn');
const closeReviewBtn = document.getElementById('closeReviewBtn');
const reviewModal = document.getElementById('reviewModal');

const submitReviewBtn = document.getElementById('submitReviewBtn');
const reviewTextInput = document.getElementById('reviewTextInput');
const reviewsFeed = document.getElementById('reviewsFeed');
const starContainer = document.getElementById('starContainer');

let activeCategory = 'all';
let searchQuery = '';
let selectedRating = 5;

if (totalGameCount && window.GAMES_CATALOG) {
  totalGameCount.textContent = window.GAMES_CATALOG.length;
}

function renderGames() {
  if (!gamesGrid || !window.GAMES_CATALOG) return;

  const filtered = window.GAMES_CATALOG.filter(game => {
    const matchCat = activeCategory === 'all' || game.cat === activeCategory;
    const matchSearch = game.title.toLowerCase().includes(searchQuery) ||
                        game.desc.toLowerCase().includes(searchQuery);
    return matchCat && matchSearch;
  });

  gamesGrid.innerHTML = '';

  if (filtered.length === 0) {
    gamesGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">
        <h3>No mini games found matching "${searchQuery}"</h3>
        <p>Try searching another keyword or click 'All Games'</p>
      </div>
    `;
    return;
  }

  filtered.forEach(game => {
    const isReady = !!game.url;
    const card = document.createElement(isReady ? 'a' : 'div');
    if (isReady) {
      card.href = game.url;
      card.className = `game-box ${game.badge && game.badge.includes('HOT') ? 'featured' : ''}`;
    } else {
      card.className = `game-box coming-soon`;
      card.onclick = () => {
        alert(`🚧 "${game.title}" is currently under active development and Coming Soon in the next update! Play any of the 25+ live games.`);
      };
    }

    card.innerHTML = `
      <div class="game-box-badge">${isReady ? (game.badge || 'PLAY') : 'COMING SOON 🔒'}</div>
      <div class="game-box-icon">${game.icon}</div>
      <h3 class="game-box-title">${game.title}</h3>
      <p class="game-box-desc">${game.desc}</p>
      <span class="game-box-play">${isReady ? 'PLAY NOW →' : 'COMING SOON'}</span>
    `;
    gamesGrid.appendChild(card);
  });
}

function setCategory(cat) {
  activeCategory = cat;

  catPills.forEach(pill => {
    if (pill.getAttribute('data-cat') === cat) pill.classList.add('active');
    else pill.classList.remove('active');
  });

  renderGames();
}

catPills.forEach(pill => {
  pill.addEventListener('click', () => {
    setCategory(pill.getAttribute('data-cat'));
  });
});

catSelectItems.forEach(item => {
  item.addEventListener('click', () => {
    setCategory(item.getAttribute('data-cat'));
    menuModal.classList.add('hidden');
  });
});

if (gameSearchInput) {
  gameSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderGames();
  });
}

// Modal Dialogs
openMenuBtn.onclick = () => menuModal.classList.remove('hidden');
closeMenuBtn.onclick = () => menuModal.classList.add('hidden');

openReviewBtn.onclick = () => reviewModal.classList.remove('hidden');
closeReviewBtn.onclick = () => reviewModal.classList.add('hidden');

// Universal 1v1 Room Dialog
const openRoomModalBtn = document.getElementById('openRoomModalBtn');
const closeRoomModalBtn = document.getElementById('closeRoomModalBtn');
const roomModal = document.getElementById('roomModal');
const uniGameSelect = document.getElementById('uniGameSelect');
const uniRoomInput = document.getElementById('uniRoomInput');
const uniRandomRoomBtn = document.getElementById('uniRandomRoomBtn');
const uniPlayerName = document.getElementById('uniPlayerName');
const startUniversalRoomBtn = document.getElementById('startUniversalRoomBtn');

if (uniGameSelect && window.GAMES_CATALOG) {
  // Only list games that are 100% completed and playable in 1v1 Room
  const playableGames = window.GAMES_CATALOG.filter(g => !!g.url);
  uniGameSelect.innerHTML = playableGames.map(g => `<option value="${g.id}">${g.icon} ${g.title} (${g.cat.toUpperCase()})</option>`).join('');
}

if (openRoomModalBtn && roomModal) {
  openRoomModalBtn.onclick = () => roomModal.classList.remove('hidden');
}
if (closeRoomModalBtn && roomModal) {
  closeRoomModalBtn.onclick = () => roomModal.classList.add('hidden');
}
if (uniRandomRoomBtn) {
  uniRandomRoomBtn.onclick = () => {
    const code = 'DUEL' + Math.floor(100 + Math.random() * 900);
    uniRoomInput.value = code;
  };
}

if (startUniversalRoomBtn) {
  startUniversalRoomBtn.onclick = () => {
    const selectedGameId = uniGameSelect.value || 'pen-fight';
    const roomCode = (uniRoomInput.value || 'DUEL7').trim().toUpperCase();
    const name = (uniPlayerName.value || 'Player 1').trim();

    // Check if game has a standalone page or engine page
    const foundGame = window.GAMES_CATALOG.find(g => g.id === selectedGameId);
    let targetUrl = '';
    if (foundGame && foundGame.url) {
      targetUrl = `${foundGame.url}?room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(name)}&mode=pvp`;
    } else {
      targetUrl = `/games/engine/?id=${selectedGameId}&room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(name)}&mode=pvp`;
    }
    window.location.href = targetUrl;
  };
}

window.onclick = (e) => {
  if (e.target === menuModal) menuModal.classList.add('hidden');
  if (e.target === reviewModal) reviewModal.classList.add('hidden');
  if (e.target === roomModal) roomModal.classList.add('hidden');
};

// Rating stars selection
if (starContainer) {
  const stars = starContainer.querySelectorAll('.star');
  stars.forEach(star => {
    star.onclick = () => {
      selectedRating = parseInt(star.getAttribute('data-v'));
      stars.forEach(s => {
        const v = parseInt(s.getAttribute('data-v'));
        s.style.opacity = v <= selectedRating ? '1' : '0.3';
      });
    };
  });
}

// Submit review
if (submitReviewBtn) {
  submitReviewBtn.onclick = () => {
    const text = reviewTextInput.value.trim();
    if (!text) {
      alert('Please enter your review text!');
      return;
    }
    const starStr = '⭐'.repeat(selectedRating);
    const div = document.createElement('div');
    div.className = 'review-bubble';
    div.innerHTML = `<strong>You:</strong> "${text}" ${starStr}`;
    reviewsFeed.prepend(div);
    reviewTextInput.value = '';
    alert('Thank you for rating Harshit\'s Game Hub!');
  };
}

// Initial render
renderGames();
