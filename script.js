const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Penguin properties
const penguin = {
  x: 50,
  y: canvas.height - 64,
  size: 64,
  color: '#111',
  vy: 0,
  jumpPower: -13,
  gravity: 0.6,
  onGround: true
};

// Penguin animation frames
const penguinFrames = {
  walk: [
    'res/Penguin-images-2/Animations/penguin_walk01@2x.png',
    'res/Penguin-images-2/Animations/penguin_walk02@2x.png',
    'res/Penguin-images-2/Animations/penguin_walk03@2x.png',
    'res/Penguin-images-2/Animations/penguin_walk04@2x.png',
  ],
  jump: [
    'res/Penguin-images-2/Animations/penguin_jump01@2x.png',
    'res/Penguin-images-2/Animations/penguin_jump02@2x.png',
    'res/Penguin-images-2/Animations/penguin_jump03@2x.png',
  ],
  die: [
    'res/Penguin-images-2/Animations/penguin_die01@2x.png',
    'res/Penguin-images-2/Animations/penguin_die02@2x.png',
    'res/Penguin-images-2/Animations/penguin_die03@2x.png',
    'res/Penguin-images-2/Animations/penguin_die04@2x.png',
  ]
};

// Preload penguin images
const penguinImages = {};
for (const key in penguinFrames) {
  penguinImages[key] = penguinFrames[key].map(src => {
    const img = new Image();
    img.src = src;
    return img;
  });
}

// Penguin animation state
let penguinAnim = {
  state: 'walk', // walk, jump, die
  frame: 0,
  timer: 0
};

// Obstacle properties
// Obstacle types (fix: add this definition)
const OBSTACLE_TYPES = ['iceTall', 'iceShort', 'snowball', 'slidingIce'];

// Calculate max jump height for penguin
const maxJumpHeight = (penguin.jumpPower * penguin.jumpPower) / (2 * penguin.gravity);

function createObstacle() {
  const type = OBSTACLE_TYPES[Math.floor(Math.random()*OBSTACLE_TYPES.length)];
  let width = 45, height = 75, y = canvas.height - 75, extra = {};
  if (type === 'iceShort') { height = 45; y = canvas.height - 45; }
  if (type === 'snowball') { width = 48; height = 48; y = canvas.height - 48; extra.angle = 0; }
  if (type === 'slidingIce') { 
    height = 60; 
    // Position sliding ice so penguin can always jump over it
    // Never place it at ground level (where penguin walks)
    let maxY = canvas.height - maxJumpHeight - height - 30;
    let minY = canvas.height - height - 50; // Keep above ground level
    extra.baseY = minY + Math.random() * (maxY - minY);
    y = extra.baseY;
    extra.dir = Math.random()<0.5?-1:1;
  }
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

function drawPenguinSprite(x, y, size, anim) {
  let arr = penguinImages[anim.state];
  let frame = Math.floor(anim.frame) % arr.length;
  let img = arr[frame];
  ctx.drawImage(img, x, y, size, size);
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
  if (gameOver) {
    penguinAnim.state = 'die';
    penguinAnim.timer += 1;
    if (penguinAnim.timer > 6) {
      penguinAnim.frame += 0.15;
    }
  } else if (!penguin.onGround) {
    penguinAnim.state = 'jump';
    penguinAnim.frame += 0.15;
  } else {
    penguinAnim.state = 'walk';
    penguinAnim.frame += 0.18;
  }
  if (penguinAnim.frame >= penguinImages[penguinAnim.state].length) penguinAnim.frame = 0;

  // Draw penguin
  drawPenguinSprite(penguin.x, penguin.y, penguin.size, penguinAnim);

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
    let minGap = 200 + Math.random() * 100 + (baseSpeed-6)*15; // larger gaps for platform jumping
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