const board = [
  { name: 'Départ', type: 'start' },
  { name: 'Medina', type: 'property', price: 140, rent: 20 },
  { name: 'Souk', type: 'property', price: 160, rent: 24 },
  { name: 'Impôt', type: 'tax', amount: 120 },
  { name: 'Kasbah', type: 'property', price: 200, rent: 30 },
  { name: 'Chance', type: 'chance' },
  { name: 'Palmeraie', type: 'property', price: 220, rent: 34 },
  { name: 'Riad', type: 'property', price: 240, rent: 38 },
  { name: 'Bonus', type: 'special', amount: 100 },
  { name: 'Avenue Atlas', type: 'property', price: 260, rent: 42 },
  { name: 'Chance', type: 'chance' },
  { name: 'Place Or', type: 'property', price: 300, rent: 48 },
  { name: 'Taxe Luxe', type: 'tax', amount: 160 },
  { name: 'Tour Royale', type: 'property', price: 340, rent: 56 },
  { name: 'Festival', type: 'special', amount: 150 },
  { name: 'Palais', type: 'property', price: 380, rent: 64 }
];

const START_BONUS = 200;
const MAX_TURNS = 50;
const MIN_RESERVE_BALANCE = 200;

const initialPlayers = () => [
  { id: 'a', name: 'Joueur A', money: 1500, pos: 0, properties: [] },
  { id: 'b', name: 'Joueur B', money: 1500, pos: 0, properties: [] }
];

let players = initialPlayers();
let turn = 0;
let turnsPlayed = 0;
let owners = Array(board.length).fill(null);
let gameOver = false;

const boardEl = document.getElementById('board');
const playerAEl = document.getElementById('playerA');
const playerBEl = document.getElementById('playerB');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const rollBtn = document.getElementById('rollBtn');
const restartBtn = document.getElementById('restartBtn');

function log(message) {
  const li = document.createElement('li');
  li.textContent = message;
  logEl.prepend(li);
}

function formatMoney(n) {
  return `${n}₵`;
}

function renderPlayers() {
  const active = players[turn];
  playerAEl.classList.toggle('active', active.id === 'a');
  playerBEl.classList.toggle('active', active.id === 'b');

  playerAEl.innerHTML = `<strong>${players[0].name}</strong><br>Argent: ${formatMoney(players[0].money)}<br>Terrains: ${players[0].properties.length}`;
  playerBEl.innerHTML = `<strong>${players[1].name}</strong><br>Argent: ${formatMoney(players[1].money)}<br>Terrains: ${players[1].properties.length}`;
}

function tileClass(type) {
  if (type === 'property') return 'property';
  if (type === 'tax') return 'tax';
  if (type === 'chance') return 'chance';
  if (type === 'start') return 'start';
  return 'special';
}

function getTileMeta(tile, index) {
  if (tile.type === 'property') {
    const owner = owners[index];
    const ownerText = owner === null ? 'Libre' : `Propriétaire: ${players[owner].name}`;
    return `Prix: ${formatMoney(tile.price)} | Loyer: ${formatMoney(tile.rent)} | ${ownerText}`;
  }

  if (tile.type === 'tax') {
    return `Taxe: ${formatMoney(tile.amount)}`;
  }

  if (tile.type === 'special') {
    return `Bonus: ${formatMoney(tile.amount)}`;
  }

  if (tile.type === 'chance') {
    return 'Carte aléatoire';
  }

  return `Passe = +${formatMoney(START_BONUS)}`;
}

function renderBoard() {
  boardEl.innerHTML = '';
  board.forEach((tile, index) => {
    const cell = document.createElement('div');
    cell.className = `tile ${tileClass(tile.type)}`;

    cell.innerHTML = `
      <div>
        <strong>${index}. ${tile.name}</strong>
        <div class="price">${getTileMeta(tile, index)}</div>
      </div>
    `;

    const tokens = document.createElement('div');
    tokens.className = 'tokens';

    players.forEach((player) => {
      if (player.pos === index) {
        const t = document.createElement('span');
        t.className = `token ${player.id}`;
        tokens.appendChild(t);
      }
    });

    cell.appendChild(tokens);
    boardEl.appendChild(cell);
  });
}

function nextTurn() {
  turn = turn === 0 ? 1 : 0;
  turnsPlayed += 1;
}

function clampMoney() {
  players.forEach((p) => {
    if (p.money < 0) p.money = 0;
  });
}

function randomChance(player) {
  const events = [
    { text: 'Prime journalière +120', value: 120 },
    { text: 'Amende de circulation -90', value: -90 },
    { text: 'Contrat commercial +180', value: 180 },
    { text: 'Dépenses imprévues -140', value: -140 }
  ];

  const event = events[Math.floor(Math.random() * events.length)];
  player.money += event.value;
  log(`${player.name} tire une carte Chance: ${event.text}`);
}

function handleLanding(player) {
  const tile = board[player.pos];

  if (tile.type === 'property') {
    const owner = owners[player.pos];

    if (owner === null) {
      if (player.money >= tile.price + MIN_RESERVE_BALANCE) {
        player.money -= tile.price;
        owners[player.pos] = players.indexOf(player);
        player.properties.push(player.pos);
        log(`${player.name} achète ${tile.name} pour ${formatMoney(tile.price)}.`);
      } else {
        log(`${player.name} garde une réserve et n'achète pas ${tile.name}.`);
      }
      return;
    }

    if (owner !== players.indexOf(player)) {
      player.money -= tile.rent;
      players[owner].money += tile.rent;
      log(`${player.name} paie ${formatMoney(tile.rent)} à ${players[owner].name} pour ${tile.name}.`);
    }
    return;
  }

  if (tile.type === 'tax') {
    player.money -= tile.amount;
    log(`${player.name} paie une taxe de ${formatMoney(tile.amount)}.`);
    return;
  }

  if (tile.type === 'chance') {
    randomChance(player);
    return;
  }

  if (tile.type === 'special') {
    player.money += tile.amount;
    log(`${player.name} gagne un bonus de ${formatMoney(tile.amount)}.`);
  }
}

function moveCurrentPlayer() {
  if (gameOver) return;

  const player = players[turn];
  const diceRoll = Math.floor(Math.random() * 6) + 1;
  const previousPos = player.pos;
  player.pos = (player.pos + diceRoll) % board.length;

  if (player.pos < previousPos) {
    player.money += START_BONUS;
    log(`${player.name} passe par Départ et gagne ${formatMoney(START_BONUS)}.`);
  }

  log(`${player.name} lance ${diceRoll} et arrive sur ${board[player.pos].name}.`);
  handleLanding(player);
  clampMoney();

  const bankrupt = players.find((p) => p.money <= 0);
  if (bankrupt) {
    gameOver = true;
    const winner = players[0] === bankrupt ? players[1] : players[0];
    statusEl.textContent = `${bankrupt.name} est ruiné. ${winner.name} gagne !`;
    rollBtn.disabled = true;
  } else if (turnsPlayed >= MAX_TURNS) {
    gameOver = true;
    let winner = null;
    if (players[0].money > players[1].money) {
      winner = players[0];
    } else if (players[1].money > players[0].money) {
      winner = players[1];
    }
    statusEl.textContent = winner
      ? `Fin de partie: ${winner.name} gagne avec ${formatMoney(winner.money)}.`
      : `Fin de partie: égalité parfaite.`;
    rollBtn.disabled = true;
  } else {
    nextTurn();
    statusEl.textContent = `Tour de ${players[turn].name}`;
  }

  renderPlayers();
  renderBoard();
}

function resetGame() {
  players = initialPlayers();
  turn = 0;
  turnsPlayed = 0;
  owners = Array(board.length).fill(null);
  gameOver = false;
  logEl.innerHTML = '';
  rollBtn.disabled = false;
  statusEl.textContent = `Tour de ${players[turn].name}`;
  renderPlayers();
  renderBoard();
  log('Nouvelle partie démarrée.');
}

rollBtn.addEventListener('click', moveCurrentPlayer);
restartBtn.addEventListener('click', resetGame);

resetGame();
