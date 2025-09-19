const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Penguin properties
const penguin = {
  x: 250,
  y: canvas.height - 64 - 64 + 5, // Position just slightly above the snow block platform
  size: 64,
  color: '#111',
  vy: 0,
  jumpPower: -13,
  gravity: 0.6,
  onGround: true
};

// Background and platform scrolling
let backgroundOffset = 0;
let platformOffset = 0;

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

// Preload background and platform images
const backgroundImg = new Image();
backgroundImg.src = 'res/background/background.svg';

const platformImages = {
  starting: new Image(),
  middle: new Image(),
  ending: new Image()
};

platformImages.starting.src = 'res/background/snow_block_starting.svg';
platformImages.middle.src = 'res/background/snow_block_middle.svg';
platformImages.ending.src = 'res/background/snow_block_ending.svg';

// Penguin animation state
let penguinAnim = {
  state: 'walk', // walk, jump, die
  frame: 0,
  timer: 0
};

// Obstacle properties
// Ground obstacles (from ground folder)
const GROUND_OBSTACLES = ['obstacle_1', 'obstacle_2', 'obstacle_3', 'obstacle_4', 'obstacle_5', 'obstacle_6', 'snow_man'];
// Flying obstacles (from fly folder - animated)
const FLYING_OBSTACLES = ['snow_ball'];

// Calculate max jump height for penguin
const maxJumpHeight = (penguin.jumpPower * penguin.jumpPower) / (2 * penguin.gravity);

// Preload ground obstacle images
const groundObstacleImages = {};
GROUND_OBSTACLES.forEach(name => {
  groundObstacleImages[name] = new Image();
  groundObstacleImages[name].src = `res/obstacles/ground/${name}.svg`;
});

// Preload flying obstacle images (animated sequence)
const flyingObstacleImages = {};
FLYING_OBSTACLES.forEach(name => {
  flyingObstacleImages[name] = [];
  for (let i = 0; i <= 5; i++) {
    const img = new Image();
    img.src = `res/obstacles/fly/${name}_${i}.svg`;
    flyingObstacleImages[name].push(img);
  }
});

// Function to predict when a ground obstacle will be in front of the penguin
function willGroundObstacleBeInFrontOfPenguin(timeAhead = 2000) {
  const penguinX = penguin.x;
  const penguinWidth = penguin.size;
  
  // Check all active ground obstacles
  const groundObstacles = obstacles.filter(obs => obs.active && !obs.isFlying);
  
  for (let obs of groundObstacles) {
    // Calculate when this obstacle will be in front of penguin
    const distanceToPenguin = obs.x - penguinX;
    const obstacleSpeed = baseSpeed; // Ground obstacles move at baseSpeed
    const timeToReachPenguin = distanceToPenguin / obstacleSpeed;
    
    // Check if obstacle will be in front of penguin within the time window
    if (timeToReachPenguin >= 0 && timeToReachPenguin <= timeAhead) {
      // Calculate the time window when obstacle will be in front of penguin
      const timeWhenObstacleStarts = timeToReachPenguin;
      const timeWhenObstacleEnds = timeToReachPenguin + (obs.width / obstacleSpeed);
      
      return {
        willBeInFront: true,
        startTime: timeWhenObstacleStarts,
        endTime: timeWhenObstacleEnds,
        obstacle: obs
      };
    }
  }
  
  return { willBeInFront: false };
}

function createObstacle() {
  // Check what obstacles are currently on screen
  const activeObstacles = obstacles.filter(obs => obs.active);
  const hasFlyingObstacle = activeObstacles.some(obs => obs.isFlying);
  const hasGroundObstacle = activeObstacles.some(obs => !obs.isFlying);
  
  let isFlying;
  
  // Simplified obstacle selection - alternate between ground and flying
  if (hasFlyingObstacle && hasGroundObstacle) {
    // Both types on screen - don't spawn anything
    return null;
  } else if (hasFlyingObstacle) {
    // Only flying on screen - spawn ground next
    isFlying = false;
  } else if (hasGroundObstacle) {
    // Only ground on screen - spawn flying next (with some randomness)
    isFlying = Math.random() < 0.7; // 70% chance for flying after ground
  } else {
    // No obstacles on screen - start with ground
    isFlying = false;
  }
  
  let type, width, height, y, extra = {};
  
  if (isFlying) {
    // Flying obstacle
    type = FLYING_OBSTACLES[Math.floor(Math.random() * FLYING_OBSTACLES.length)];
    width = 64;
    height = 64;
    // Position flying obstacle above platform but within jump range
    const maxY = canvas.height - 64 - maxJumpHeight - height - 30;
    const minY = canvas.height - 64 - height - 50;
    y = minY + Math.random() * (maxY - minY);
    extra.animFrame = 0;
  } else {
    // Ground obstacle
    type = GROUND_OBSTACLES[Math.floor(Math.random() * GROUND_OBSTACLES.length)];
    width = 64;
    height = 64;
    // Ensure ground obstacles don't exceed max jump height
    const maxHeight = maxJumpHeight - 20; // Leave some margin
    height = Math.min(height, maxHeight);
    y = canvas.height - 64 - height + 5; // Position on platform
  }
  
  // Debug logging
  console.log(`Spawning ${isFlying ? 'flying' : 'ground'} obstacle. Has flying: ${hasFlyingObstacle}, Has ground: ${hasGroundObstacle}`);
  
  return {
    type,
    width,
    height,
    x: canvas.width + 60,
    y,
    active: true,
    isFlying,
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
  penguin.y = canvas.height - 64 - penguin.size + 5; // Position just slightly above platform
  penguin.vy = 0;
  penguin.onGround = true;
  obstacles = [];
  nextObstacleTime = 0;
  baseSpeed = 6;
  score = 0;
  gameOver = false;
  gameStarted = true;
  backgroundOffset = 0;
  platformOffset = 0;
}

// Handle jump and restart
function handleJump() {
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

// Keyboard controls
window.addEventListener('keydown', (e) => {
  if ((e.code === 'Space' || e.key === ' ')) {
    handleJump();
  }
});

// Mobile touch controls
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent scrolling on mobile
  handleJump();
});

// Also handle click for desktop users who might click
canvas.addEventListener('click', (e) => {
  handleJump();
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

// Draw scrolling background
function drawBackground() {
  if (backgroundImg.complete) {
    // Calculate background dimensions to fill canvas without stretching
    const bgAspectRatio = backgroundImg.width / backgroundImg.height;
    const canvasAspectRatio = canvas.width / canvas.height;
    
    let drawWidth, drawHeight, offsetY = 0;
    
    if (bgAspectRatio > canvasAspectRatio) {
      // Background is wider - fit height and crop width
      drawHeight = canvas.height;
      drawWidth = drawHeight * bgAspectRatio;
    } else {
      // Background is taller - fit width and crop height
      drawWidth = canvas.width;
      drawHeight = drawWidth / bgAspectRatio;
      offsetY = (canvas.height - drawHeight) / 2;
    }
    
    // Ensure we have enough copies to cover the screen with overlap
    const copiesNeeded = Math.ceil(canvas.width / drawWidth) + 2;
    
    for (let i = 0; i < copiesNeeded; i++) {
      const x = (i * drawWidth) - (backgroundOffset % drawWidth);
      
      // Only draw if the copy is visible on screen
      if (x > -drawWidth && x < canvas.width) {
        ctx.drawImage(backgroundImg, x, offsetY, drawWidth, drawHeight);
      }
    }
  } else {
    // Fallback gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#B7C7E8');
    gradient.addColorStop(1, '#E6EBF6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// Draw scrolling continuous platform using snow blocks
function drawPlatform() {
  const blockWidth = 64;
  const blockHeight = 64;
  const platformY = canvas.height - blockHeight;
  const blocksNeeded = Math.ceil(canvas.width / blockWidth) + 4; // Extra blocks for scrolling
  
  for (let i = -2; i < blocksNeeded; i++) {
    let x = (i * blockWidth) - (platformOffset % blockWidth);
    let img;
    
    // Determine which block type to use (based on position relative to scroll)
    const blockIndex = Math.floor(platformOffset / blockWidth) + i;
    if (blockIndex === 0) {
      img = platformImages.starting;
    } else {
      img = platformImages.middle; // Use middle for all blocks in scrolling mode
    }
    
    if (img.complete) {
      ctx.drawImage(img, x, platformY, blockWidth, blockHeight);
    } else {
      // Fallback snow block
      ctx.fillStyle = '#e8f4f8';
      ctx.fillRect(x, platformY, blockWidth, blockHeight);
    }
  }
}

// Draw obstacles with SVG images
function drawObstacle(obs, timestamp) {
  if (obs.isFlying) {
    // Flying obstacle with animation
    const imgArray = flyingObstacleImages[obs.type];
    if (imgArray && imgArray.length > 0) {
      obs.animFrame = (obs.animFrame || 0) + 0.1;
      const frameIndex = Math.floor(obs.animFrame) % imgArray.length;
      const img = imgArray[frameIndex];
      
      if (img.complete) {
        ctx.drawImage(img, obs.x, obs.y, obs.width, obs.height);
      } else {
        // Fallback for flying obstacle
        ctx.fillStyle = '#e8f4f8';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      }
    }
  } else {
    // Ground obstacle (static)
    const img = groundObstacleImages[obs.type];
    if (img && img.complete) {
      ctx.drawImage(img, obs.x, obs.y, obs.width, obs.height);
    } else {
      // Fallback for ground obstacle
      ctx.fillStyle = '#8fd6f9';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }
  }
}

function gameLoop(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update scrolling offsets
  backgroundOffset += baseSpeed * 0.2; // Background scrolls much slower for depth effect
  platformOffset += baseSpeed;

  // Draw background first
  drawBackground();
  
  // Draw platform
  drawPlatform();

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
  
  // Draw start message for mobile
  if (gameStarted && score === 0 && obstacles.length === 0) {
    ctx.save();
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText('Press SPACE or TAP to jump!', canvas.width/2, canvas.height/2 + 50);
    ctx.restore();
  }

  // Penguin physics
  penguin.y += penguin.vy;
  penguin.vy += penguin.gravity;

  // Ground collision (platform level)
  const platformLevel = canvas.height - 64; // Top of the snow block platform
  if (penguin.y + penguin.size >= platformLevel) {
    penguin.y = platformLevel - penguin.size;
    penguin.vy = 0;
    penguin.onGround = true;
  }

  // Obstacle logic
  let passed = false;
  for (let obs of obstacles) {
    if (!obs.active) continue;
    // Make snowballs move faster than other obstacles
    const speedMultiplier = obs.type === 'snow_ball' ? 2.0 : 1;
    obs.x -= baseSpeed * speedMultiplier;
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
    let minGap = 250 + Math.random() * 150 + (baseSpeed-6)*20; // larger gaps for platform jumping
    
    // Extra spacing if last obstacle was flying (snowball) since they're faster
    if (last && last.isFlying) {
      minGap += 100; // Extra space after flying obstacles
    }
    
    if (!last || (last.x + last.width < canvas.width - minGap)) {
      const newObstacle = createObstacle();
      if (newObstacle) {
        obstacles.push(newObstacle);
        // Next spawn timing based on obstacle type
        let nextSpawnDelay = 1000 + Math.random() * 1000; // 1-2 seconds base
        
        // If we just spawned a flying obstacle, wait longer before next spawn
        if (newObstacle.isFlying) {
          nextSpawnDelay += 500; // Extra delay after flying obstacles
        }
        
        nextObstacleTime = timestamp + nextSpawnDelay;
      } else {
        // Can't spawn now due to obstacle conflict, check again soon
        nextObstacleTime = timestamp + 200;
      }
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
    ctx.fillText('Press SPACE or TAP to restart', canvas.width/2, 140);
    ctx.restore();
    return;
  }

  requestAnimationFrame(gameLoop);
}

// Start game
resetGame();
requestAnimationFrame(gameLoop);