const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Penguin properties
const penguin = {
  x: 50,
  y: canvas.height - 50,
  size: 40,
  color: '#111',
  vy: 0,
  jumpPower: -13,
  gravity: 0.6,
  onGround: true
};

// Penguin animation state
let penguinAnim = { wing: 0, wingDir: 1, eye: 0, eyeTimer: 0 };

// Obstacle properties
// Obstacle types (fix: add this definition)
const OBSTACLE_TYPES = ['iceTall', 'iceShort', 'snowball', 'slidingIce'];
function createObstacle() {
  const type = OBSTACLE_TYPES[Math.floor(Math.random()*OBSTACLE_TYPES.length)];
  let width = 30, height = 50, y = canvas.height - 50, extra = {};
  if (type === 'iceShort') { height = 30; y = canvas.height - 30; }
  if (type === 'snowball') { width = 32; height = 32; y = canvas.height - 32; extra.angle = 0; }
  if (type === 'slidingIce') { height = 40; y = canvas.height - 80; extra.baseY = y; extra.dir = Math.random()<0.5?-1:1; }
  return {
    type,
    width,
    height,
    x: canvas.width + 60,
    y,
    active: true,
    ...extra
  };
}

let obstacles = [];
let nextObstacleTime = 0;
let baseSpeed = 6;
let score = 0;
let gameOver = false;
let gameStarted = false;

function resetGame() {
  penguin.y = canvas.height - penguin.size;
  penguin.vy = 0;
  penguin.onGround = true;
  obstacles = [];
  nextObstacleTime = 0;
  baseSpeed = 6;
  score = 0;
  gameOver = false;
  gameStarted = true;
}

// Handle jump and restart
window.addEventListener('keydown', (e) => {
  if ((e.code === 'Space' || e.key === ' ')) {
    if (gameOver) {
      resetGame();
      requestAnimationFrame(gameLoop);
      return;
    }
    if (penguin.onGround && !gameOver) {
      penguin.vy = penguin.jumpPower;
      penguin.onGround = false;
    }
  }
});

// Collision detection
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.size > b.x &&
    a.y < b.y + b.height &&
    a.y + a.size > b.y
  );
}

// Draw penguin with animation
function drawPenguin(x, y, size, anim) {
  ctx.save();
  ctx.translate(x + size/2, y + size/2);
  ctx.scale(size/40, size/40);
  // Body (black)
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 20, 0, 0, Math.PI*2);
  ctx.fillStyle = '#222';
  ctx.fill();
  // Belly (white)
  ctx.beginPath();
  ctx.ellipse(0, 4, 11, 13, 0, 0, Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  // Left wing (flap)
  ctx.save();
  ctx.rotate(-0.3 - anim.wing*0.15);
  ctx.beginPath();
  ctx.ellipse(-15, 0, 5, 13, 0, 0, Math.PI*2);
  ctx.fillStyle = '#111';
  ctx.fill();
  ctx.restore();
  // Right wing (flap)
  ctx.save();
  ctx.rotate(0.3 + anim.wing*0.15);
  ctx.beginPath();
  ctx.ellipse(15, 0, 5, 13, 0, 0, Math.PI*2);
  ctx.fillStyle = '#111';
  ctx.fill();
  ctx.restore();
  // Beak
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(0, -15);
  ctx.lineTo(5, -10);
  ctx.closePath();
  ctx.fillStyle = '#ffb347';
  ctx.fill();
  // Feet
  ctx.beginPath();
  ctx.ellipse(-6, 20, 4, 2, 0, 0, Math.PI*2);
  ctx.ellipse(6, 20, 4, 2, 0, 0, Math.PI*2);
  ctx.fillStyle = '#ffb347';
  ctx.fill();
  // Eyes (blink)
  ctx.beginPath();
  ctx.arc(-5, -5, 2, 0, Math.PI*2);
  ctx.arc(5, -5, 2, 0, Math.PI*2);
  ctx.fillStyle = anim.eye ? '#222' : '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-5, -5, 1, 0, Math.PI*2);
  ctx.arc(5, -5, 1, 0, Math.PI*2);
  ctx.fillStyle = '#222';
  ctx.fill();
  ctx.restore();
}

// Draw obstacles with animation
function drawObstacle(obs, timestamp) {
  if (obs.type === 'iceTall' || obs.type === 'iceShort') {
    // Ice block
    ctx.save();
    ctx.beginPath();
    ctx.rect(obs.x, obs.y, obs.width, obs.height);
    ctx.fillStyle = '#8fd6f9';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y);
    ctx.lineTo(obs.x + obs.width, obs.y);
    ctx.lineTo(obs.x + obs.width - 6, obs.y + 8);
    ctx.lineTo(obs.x + 6, obs.y + 8);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  } else if (obs.type === 'snowball') {
    // Rolling snowball
    ctx.save();
    ctx.translate(obs.x + obs.width/2, obs.y + obs.height/2);
    obs.angle = (obs.angle || 0) + 0.15;
    ctx.rotate(obs.angle);
    ctx.beginPath();
    ctx.arc(0, 0, obs.width/2, 0, Math.PI*2);
    ctx.fillStyle = '#eaf6fb';
    ctx.fill();
    // Snowball shadow
    ctx.beginPath();
    ctx.arc(0, obs.width/4, obs.width/4, 0, Math.PI*2);
    ctx.fillStyle = '#b3d6e7';
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (obs.type === 'slidingIce') {
    // Sliding ice block (moves up/down)
    ctx.save();
    let t = (timestamp/400) % (Math.PI*2);
    obs.y = obs.baseY + Math.sin(t) * 20 * obs.dir;
    ctx.beginPath();
    ctx.rect(obs.x, obs.y, obs.width, obs.height);
    ctx.fillStyle = '#b0e0e6';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y);
    ctx.lineTo(obs.x + obs.width, obs.y);
    ctx.lineTo(obs.x + obs.width - 6, obs.y + 8);
    ctx.lineTo(obs.x + 6, obs.y + 8);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  }
}

function gameLoop(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Animate penguin
  penguinAnim.wing += penguinAnim.wingDir * 0.12;
  if (penguinAnim.wing > 1) { penguinAnim.wing = 1; penguinAnim.wingDir = -1; }
  if (penguinAnim.wing < 0) { penguinAnim.wing = 0; penguinAnim.wingDir = 1; }
  penguinAnim.eyeTimer -= 1;
  if (penguinAnim.eyeTimer < 0) {
    penguinAnim.eye = Math.random() < 0.1 ? 1 : 0;
    penguinAnim.eyeTimer = 20 + Math.random()*40;
  }

  // Draw penguin
  drawPenguin(penguin.x, penguin.y, penguin.size, penguinAnim);

  // Draw obstacles
  for (let obs of obstacles) {
    if (obs.active) drawObstacle(obs, timestamp);
  }

  // Draw score
  ctx.fillStyle = '#fff';
  ctx.font = '20px Arial';
  ctx.fillText('Score: ' + score, 10, 30);

  // Penguin physics
  penguin.y += penguin.vy;
  penguin.vy += penguin.gravity;

  // Ground collision
  if (penguin.y + penguin.size >= canvas.height) {
    penguin.y = canvas.height - penguin.size;
    penguin.vy = 0;
    penguin.onGround = true;
  }

  // Obstacle logic
  let passed = false;
  for (let obs of obstacles) {
    if (!obs.active) continue;
    obs.x -= baseSpeed;
    // Check collision
    if (isColliding(
      { x: penguin.x, y: penguin.y, size: penguin.size, width: penguin.size, height: penguin.size },
      { x: obs.x, y: obs.y, width: obs.width, height: obs.height }
    )) {
      gameOver = true;
    }
    // Score if passed
    if (!obs.scored && obs.x + obs.width < penguin.x) {
      obs.scored = true;
      score++;
      // Increase speed every 5 points
      if (score % 5 === 0) baseSpeed += 1.2;
      passed = true;
    }
    // Deactivate if off screen
    if (obs.x + obs.width < 0) obs.active = false;
  }
  // Remove inactive obstacles
  obstacles = obstacles.filter(o => o.active);

  // Spawn new obstacles
  if (!gameOver && timestamp > nextObstacleTime) {
    // Ensure minimum distance from last obstacle
    let last = obstacles.length ? obstacles[obstacles.length - 1] : null;
    let minGap = 120 + Math.random() * 80 + (baseSpeed-6)*10; // scale gap with speed
    if (!last || (last.x + last.width < canvas.width - minGap)) {
      obstacles.push(createObstacle()); // no speed argument
      // Next spawn in 0.8-1.7s
      nextObstacleTime = timestamp + 800 + Math.random() * 900;
    } else {
      nextObstacleTime = timestamp + 100; // check again soon
    }
  }

  // Game over message
  if (gameOver) {
    ctx.save();
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fillText('GAME OVER', canvas.width/2, 90);
    ctx.font = '24px Arial';
    ctx.shadowBlur = 0;
    ctx.fillText('Press SPACE to restart', canvas.width/2, 140);
    ctx.restore();
    return;
  }

  requestAnimationFrame(gameLoop);
}

// Start game
resetGame();
requestAnimationFrame(gameLoop);