import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

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
const DICE_SIDES = 6;
const PATH_HALF_SIZE = 4;

const initialPlayers = () => [
  { id: 'a', name: 'Joueur A', money: 1500, pos: 0, properties: [] },
  { id: 'b', name: 'Joueur B', money: 1500, pos: 0, properties: [] }
];

let players = initialPlayers();
let turn = 0;
let turnsPlayed = 0;
let owners = Array(board.length).fill(null);
let gameOver = false;
let lastDiceRoll = null;

const playerAEl = document.getElementById('playerA');
const playerBEl = document.getElementById('playerB');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const rollBtn = document.getElementById('rollBtn');
const restartBtn = document.getElementById('restartBtn');
const sceneHostEl = document.getElementById('scene3d');
const overlayTurnEl = document.getElementById('overlayTurn');
const overlayDiceEl = document.getElementById('overlayDice');
const overlayTileEl = document.getElementById('overlayTile');
const overlayMoneyEl = document.getElementById('overlayMoney');

const sceneState = {
  scene: null,
  camera: null,
  renderer: null,
  boardGroup: null,
  playerMeshes: {},
  diceMesh: null,
  tilePositions: []
};

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

function tileHeight(tile) {
  if (tile.type === 'start') return 0.45;
  if (tile.type === 'property') return 0.35;
  if (tile.type === 'chance') return 0.3;
  if (tile.type === 'tax') return 0.28;
  return 0.32;
}

function tileColor(tile) {
  if (tile.type === 'start') return 0x3fb950;
  if (tile.type === 'property') return 0x1f6feb;
  if (tile.type === 'chance') return 0xd29922;
  if (tile.type === 'tax') return 0xf85149;
  return 0xa371f7;
}

function boardPathPosition(index) {
  const max = PATH_HALF_SIZE;
  const min = -PATH_HALF_SIZE;

  if (index <= 4) {
    return new THREE.Vector3(min + index * 2, 0, max);
  }

  if (index <= 7) {
    return new THREE.Vector3(max, 0, max - (index - 4) * 2);
  }

  if (index <= 12) {
    return new THREE.Vector3(max - (index - 8) * 2, 0, min);
  }

  return new THREE.Vector3(min, 0, min + (index - 12) * 2);
}

function buildBoardMesh() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(10.5, 0.24, 10.5),
    new THREE.MeshStandardMaterial({ color: 0x0e1723, roughness: 0.88 })
  );
  base.position.y = -0.22;
  group.add(base);

  sceneState.tilePositions = board.map((tile, index) => {
    const position = boardPathPosition(index);
    const tileMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, tileHeight(tile), 1.5),
      new THREE.MeshStandardMaterial({ color: tileColor(tile), roughness: 0.7, metalness: 0.12 })
    );
    tileMesh.position.set(position.x, tileHeight(tile) / 2, position.z);
    group.add(tileMesh);
    return position;
  });

  return group;
}

function createToken(color, initialPos) {
  const token = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 20, 20),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4 })
  );
  token.position.set(initialPos.x, 0.75, initialPos.z);
  return token;
}

function initThreeScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1622);

  const camera = new THREE.PerspectiveCamera(
    45,
    sceneHostEl.clientWidth / sceneHostEl.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 12, 11.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(sceneHostEl.clientWidth, sceneHostEl.clientHeight);
  sceneHostEl.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xa6d2ff, 0x1f2937, 1.05);
  scene.add(hemi);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(8, 12, 6);
  scene.add(keyLight);

  const boardGroup = buildBoardMesh();
  scene.add(boardGroup);

  const playerA = createToken(0x58a6ff, boardPathPosition(0));
  const playerB = createToken(0xf778ba, boardPathPosition(0));
  playerB.position.x += 0.35;
  scene.add(playerA, playerB);

  const dice = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.08 })
  );
  dice.position.set(0, 1.1, 0);
  scene.add(dice);

  sceneState.scene = scene;
  sceneState.camera = camera;
  sceneState.renderer = renderer;
  sceneState.boardGroup = boardGroup;
  sceneState.playerMeshes = { a: playerA, b: playerB };
  sceneState.diceMesh = dice;

  const animate = () => {
    sceneState.boardGroup.rotation.y += 0.0018;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();
}

function setTokenPosition(player, offsetX = 0) {
  const token = sceneState.playerMeshes[player.id];
  const tile = sceneState.tilePositions[player.pos];
  if (!token || !tile) return;
  token.position.set(tile.x + offsetX, 0.75, tile.z);
}

function updateDiceMesh(value) {
  if (!sceneState.diceMesh || value === null) return;
  sceneState.diceMesh.rotation.set(value * 0.45, value * 0.65, value * 0.38);
}

function renderThreeState() {
  setTokenPosition(players[0], -0.23);
  setTokenPosition(players[1], 0.23);
  updateDiceMesh(lastDiceRoll);
}

function renderOverlay() {
  const current = players[turn];
  overlayTurnEl.textContent = current.name;
  overlayDiceEl.textContent = lastDiceRoll === null ? '-' : String(lastDiceRoll);
  overlayTileEl.textContent = board[current.pos].name;
  overlayMoneyEl.textContent = formatMoney(current.money);
}

function nextTurn() {
  turn = (turn + 1) % players.length;
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
  const diceRoll = Math.floor(Math.random() * DICE_SIDES) + 1;
  lastDiceRoll = diceRoll;
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
  renderOverlay();
  renderThreeState();
}

function resetGame() {
  players = initialPlayers();
  turn = 0;
  turnsPlayed = 0;
  owners = Array(board.length).fill(null);
  gameOver = false;
  lastDiceRoll = null;
  logEl.innerHTML = '';
  rollBtn.disabled = false;
  statusEl.textContent = `Tour de ${players[turn].name}`;
  renderPlayers();
  renderOverlay();
  renderThreeState();
  log('Nouvelle partie démarrée.');
}

function onResize() {
  if (!sceneState.camera || !sceneState.renderer) return;
  const width = sceneHostEl.clientWidth;
  const height = sceneHostEl.clientHeight;
  sceneState.camera.aspect = width / height;
  sceneState.camera.updateProjectionMatrix();
  sceneState.renderer.setSize(width, height);
}

initThreeScene();
window.addEventListener('resize', onResize);
rollBtn.addEventListener('click', moveCurrentPlayer);
restartBtn.addEventListener('click', resetGame);
resetGame();
