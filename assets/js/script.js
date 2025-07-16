document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const livesElement = document.getElementById('lives');
    const startBtn = document.getElementById('startBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const restartBtn = document.getElementById('restartBtn');
    const mainMenuBtn = document.getElementById('mainMenuBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const exitBtn = document.getElementById('exitBtn');
    const pauseMenu = document.getElementById('pauseMenu');
    const pauseResumeBtn = document.getElementById('pauseResumeBtn');
    const pauseRestartBtn = document.getElementById('pauseRestartBtn');
    const pauseMainMenuBtn = document.getElementById('pauseMainMenuBtn');
    const pauseSettingsBtn = document.getElementById('pauseSettingsBtn');
    const pauseExitBtn = document.getElementById('pauseExitBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const enableSoundBtn = document.getElementById('enableSoundBtn');
    const disableSoundBtn = document.getElementById('disableSoundBtn');
    const settingsBackBtn = document.getElementById('settingsBackBtn');
    
    // Audio setup
    const backgroundMusic = new Audio('assets/sound/the_deep.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;
    console.log('Audio initialized with source:', backgroundMusic.src);
    
    backgroundMusic.addEventListener('canplaythrough', () => {
        console.log('Audio file loaded successfully');
    });
    backgroundMusic.addEventListener('error', (e) => {
        console.error('Audio loading error:', e);
    });
    
    let audioContextUnlocked = false;
    function unlockAudioContext() {
        if (!audioContextUnlocked) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContext();
            audioContext.resume().then(() => {
                console.log('Audio context unlocked');
                audioContextUnlocked = true;
            }).catch(e => console.error('Audio context unlock failed:', e));
        }
    }
    
    canvas.width = 800;
    canvas.height = 600;
    
    let score = 0;
    let lives = 3;
    let gameRunning = false;
    let gamePaused = false;
    let animationId;
    let time = 0;
    let soundEnabled = true;
    
    const paddle = {
        width: 100,
        height: 15,
        x: canvas.width / 2 - 50,
        y: canvas.height - 30,
        speed: 10,
        dx: 0,
        baseColor: '#4CAF50',
        scale: 1,
        scaleDirection: 1
    };
    
    const ball = {
        radius: 10,
        x: canvas.width / 2,
        y: canvas.height / 2,
        speed: 5,
        dx: 5 * (Math.random() > 0.5 ? 1 : -1),
        dy: -5,
        baseColor: '#FF5252',
        trail: []
    };
    
    const brick = {
        rowCount: 5,
        colCount: 9,
        width: 75,
        height: 20,
        padding: 10,
        offsetTop: 10,
        offsetLeft: 30
    };
    
    let bricks = [];
    
    const powerUps = [];
    const powerUpTypes = [
        { type: 'expand', color: '#FFD700', effect: () => paddle.width *= 1.5 },
        { type: 'speed', color: '#FF4500', effect: () => ball.speed *= 1.2 },
        { type: 'life', color: '#00FF00', effect: () => lives++ }
    ];
    
    function initBricks() {
        bricks = [];
        for (let r = 0; r < brick.rowCount; r++) {
            bricks[r] = [];
            for (let c = 0; c < brick.colCount; c++) {
                bricks[r][c] = { 
                    x: 0, 
                    y: 0, 
                    status: 1,
                    color: `hsl(${r * 60}, 70%, 50%)`
                };
            }
        }
    }
    
    function drawBackground() {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, `hsla(${time % 360}, 50%, 20%, 0.3)`);
        gradient.addColorStop(1, `hsla(${(time + 180) % 360}, 50%, 20%, 0.3)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    function drawPaddle() {
        paddle.scale += paddle.scaleDirection * 0.01;
        if (paddle.scale > 1.1 || paddle.scale < 0.9) paddle.scaleDirection *= -1;
        
        ctx.beginPath();
        ctx.roundRect(
            paddle.x, 
            paddle.y, 
            paddle.width * paddle.scale, 
            paddle.height, 
            5
        );
        
        const hue = (time % 360 + 120) % 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.closePath();
    }
    
    function drawBall() {
        ball.trail.push({ x: ball.x, y: ball.y, life: 20 });
        if (ball.trail.length > 20) ball.trail.shift();
        
        ball.trail.forEach((point, i) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, ball.radius * (point.life / 20), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(time + i * 10) % 360}, 70%, 50%, ${point.life / 20})`;
            ctx.fill();
            ctx.closePath();
            point.life--;
        });
        ball.trail = ball.trail.filter(p => p.life > 0);
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${(time + 60) % 360}, 70%, 50%)`;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.closePath();
    }
    
    function drawBricks() {
        for (let r = 0; r < brick.rowCount; r++) {
            for (let c = 0; c < brick.colCount; c++) {
                const b = bricks[r][c];
                if (b.status === 1) {
                    const brickX = c * (brick.width + brick.padding) + brick.offsetLeft;
                    const brickY = r * (brick.height + brick.padding) + brick.offsetTop;
                    b.x = brickX;
                    b.y = brickY;
                    
                    ctx.beginPath();
                    ctx.roundRect(brickX, brickY, brick.width, brick.height, 3);
                    ctx.fillStyle = b.color;
                    ctx.shadowColor = b.color;
                    ctx.shadowBlur = 8;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.closePath();
                }
            }
        }
    }
    
    function createPowerUp(x, y) {
        if (Math.random() < 0.2) {
            const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            powerUps.push({
                x: x,
                y: y,
                width: 20,
                height: 20,
                speedY: 2,
                type: type.type,
                color: type.color,
                effect: type.effect,
                spin: 0
            });
        }
    }
    
    function updatePowerUps() {
        powerUps.forEach((p, i) => {
            p.y += p.speedY;
            p.spin += 0.1;
            
            if (
                p.y + p.height > paddle.y &&
                p.y < paddle.y + paddle.height &&
                p.x + p.width > paddle.x &&
                p.x < paddle.x + paddle.width
            ) {
                p.effect();
                powerUps.splice(i, 1);
                createParticles(p.x, p.y, p.color);
                return;
            }
            
            if (p.y > canvas.height) {
                powerUps.splice(i, 1);
            }
        });
    }
    
    function drawPowerUps() {
        powerUps.forEach(p => {
            ctx.save();
            ctx.translate(p.x + p.width/2, p.y + p.height/2);
            ctx.rotate(p.spin);
            ctx.beginPath();
            ctx.rect(-p.width/2, -p.height/2, p.width, p.height);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.restore();
        });
    }
    
    const particles = [];
    
    function createParticles(x, y, color) {
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const shape = Math.random() > 0.5 ? 'circle' : 'square';
            particles.push({
                x: x,
                y: y,
                size: Math.random() * 4 + 2,
                speedX: Math.random() * 8 - 4,
                speedY: Math.random() * 8 - 4,
                color: color,
                life: 40,
                shape: shape,
                rotation: Math.random() * Math.PI * 2
            });
        }
    }
    
    function updateParticles() {
        for (let i = 0; i < particles.length; i++) {
            particles[i].x += particles[i].speedX;
            particles[i].y += particles[i].speedY;
            particles[i].life--;
            particles[i].rotation += 0.1;
            
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
                i--;
            }
        }
    }
    
    function drawParticles() {
        for (const p of particles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.beginPath();
            if (p.shape === 'circle') {
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            } else {
                ctx.rect(-p.size/2, -p.size/2, p.size, p.size);
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 40;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }
    
    function collisionDetection() {
        for (let r = 0; r < brick.rowCount; r++) {
            for (let c = 0; c < brick.colCount; c++) {
                const b = bricks[r][c];
                if (b.status === 1) {
                    if (
                        ball.x + ball.radius > b.x &&
                        ball.x - ball.radius < b.x + brick.width &&
                        ball.y + ball.radius > b.y &&
                        ball.y - ball.radius < b.y + brick.height
                    ) {
                        ball.dy = -ball.dy;
                        b.status = 0;
                        score += 10;
                        scoreElement.textContent = score;
                        
                        createParticles(b.x + brick.width/2, b.y + brick.height/2, b.color);
                        createPowerUp(b.x + brick.width/2, b.y + brick.height/2);
                        
                        ball.speed += 0.1;
                        
                        if (score === brick.rowCount * brick.colCount * 10) {
                            gameWin();
                        }
                    }
                }
            }
        }
    }
    
    function update() {
        if (gamePaused) return;
        
        time++;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        drawBackground();
        drawBricks();
        drawPaddle();
        drawBall();
        drawParticles();
        drawPowerUps();
        
        collisionDetection();
        
        if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
            ball.dx = -ball.dx;
            createParticles(ball.x, ball.y, ball.baseColor);
        }
        
        if (ball.y + ball.dy < ball.radius) {
            ball.dy = -ball.dy;
            createParticles(ball.x, ball.y, ball.baseColor);
        }
        
        if (
            ball.y + ball.dy > paddle.y - ball.radius &&
            ball.y + ball.dy < paddle.y + paddle.height - ball.radius &&
            ball.x > paddle.x &&
            ball.x < paddle.x + paddle.width
        ) {
            const hitPosition = (ball.x - (paddle.x + paddle.width/2)) / (paddle.width/2);
            ball.dx = hitPosition * 5;
            ball.dy = -Math.abs(ball.dy);
            createParticles(ball.x, ball.y, paddle.baseColor);
        }
        
        if (ball.y + ball.dy > canvas.height - ball.radius) {
            if (lives > 1) {
                lives--;
                livesElement.textContent = lives;
                resetBall();
            } else {
                gameOver();
            }
        }
        
        paddle.x += paddle.dx;
        
        if (paddle.x < 0) {
            paddle.x = 0;
        } else if (paddle.x + paddle.width > canvas.width) {
            paddle.x = canvas.width - paddle.width;
        }
        
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        updateParticles();
        updatePowerUps();
        
        if (gameRunning) {
            animationId = requestAnimationFrame(update);
        }
    }
    
    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.dx = 5 * (Math.random() > 0.5 ? 1 : -1);
        ball.dy = -5;
        ball.speed = 5;
        ball.trail = [];
        paddle.width = 100;
        paddle.x = canvas.width / 2 - paddle.width / 2;
        paddle.y = canvas.height - 30;
        
        gameRunning = false;
        setTimeout(() => {
            if (!gamePaused) {
                gameRunning = true;
                animationId = requestAnimationFrame(update);
            }
        }, 1000);
    }
    
    function gameOver() {
        gameRunning = false;
        cancelAnimationFrame(animationId);
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        ctx.font = '40px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        startBtn.textContent = 'Play Again';
        startBtn.style.display = 'block';
        resumeBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
        restartBtn.style.display = 'block';
        mainMenuBtn.style.display = 'block';
        settingsBtn.style.display = 'block';
        exitBtn.style.display = 'block';
        settingsMenu.style.display = 'none';
    }
    
    function gameWin() {
        gameRunning = false;
        cancelAnimationFrame(animationId);
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        ctx.font = '40px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2);
        startBtn.textContent = 'Play Again';
        startBtn.style.display = 'block';
        resumeBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
        restartBtn.style.display = 'block';
        mainMenuBtn.style.display = 'block';
        settingsBtn.style.display = 'block';
        exitBtn.style.display = 'block';
        settingsMenu.style.display = 'none';
    }
    
    function pauseGame() {
        if (gameRunning && !gamePaused) {
            gamePaused = true;
            cancelAnimationFrame(animationId);
            backgroundMusic.pause();
            pauseMenu.style.display = 'flex';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'block';
            settingsMenu.style.display = 'none';
        }
    }
    
    function resumeGame() {
        if (gamePaused) {
            gamePaused = false;
            pauseMenu.style.display = 'none';
            resumeBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
            settingsMenu.style.display = 'none';
            if (gameRunning && soundEnabled) {
                console.log('Attempting to resume music');
                backgroundMusic.currentTime = 0;
                backgroundMusic.play().catch(e => {
                    console.error('Resume audio failed:', e);
                });
            }
            if (gameRunning) {
                animationId = requestAnimationFrame(update);
            }
        }
    }
    
    function restartGame() {
        score = 0;
        lives = 3;
        scoreElement.textContent = score;
        livesElement.textContent = lives;
        initBricks();
        resetBall();
        powerUps.length = 0;
        gameRunning = true;
        gamePaused = false;
        pauseMenu.style.display = 'none';
        settingsMenu.style.display = 'none';
        startBtn.textContent = 'Start Game';
        startBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
        pauseBtn.style.display = 'block';
        restartBtn.style.display = 'block';
        mainMenuBtn.style.display = 'block';
        settingsBtn.style.display = 'block';
        exitBtn.style.display = 'block';
        if (soundEnabled) {
            console.log('Attempting to play music on restart');
            backgroundMusic.currentTime = 0;
            backgroundMusic.play().catch(e => {
                console.error('Restart audio failed:', e);
            });
        } else {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        }
        animationId = requestAnimationFrame(update);
    }
    
    function mainMenu() {
        gameRunning = false;
        gamePaused = false;
        cancelAnimationFrame(animationId);
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '40px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('BREAKOUT', canvas.width / 2, canvas.height / 2);
        pauseMenu.style.display = 'none';
        settingsMenu.style.display = 'none';
        startBtn.textContent = 'Start Game';
        startBtn.style.display = 'block';
        resumeBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
        restartBtn.style.display = 'block';
        mainMenuBtn.style.display = 'none';
        settingsBtn.style.display = 'block';
        exitBtn.style.display = 'block';
    }
    
    function showSettings() {
        settingsMenu.style.display = 'flex';
        pauseMenu.style.display = 'none';
        updateSoundButtonStates();
    }
    
    function hideSettings() {
        settingsMenu.style.display = 'none';
        if (gamePaused) {
            pauseMenu.style.display = 'flex';
        }
    }
    
    function enableSound() {
        if (!soundEnabled) {
            soundEnabled = true;
            if (gameRunning && !gamePaused) {
                console.log('Sound enabled, attempting to play music');
                backgroundMusic.currentTime = 0;
                backgroundMusic.play().catch(e => {
                    console.error('Settings audio play failed:', e);
                });
            }
            updateSoundButtonStates();
        }
    }
    
    function disableSound() {
        if (soundEnabled) {
            soundEnabled = false;
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
            console.log('Sound disabled, music paused');
            updateSoundButtonStates();
        }
    }
    
    function updateSoundButtonStates() {
        enableSoundBtn.disabled = soundEnabled;
        disableSoundBtn.disabled = !soundEnabled;
    }
    
    function exitGame() {
        gameRunning = false;
        gamePaused = false;
        cancelAnimationFrame(animationId);
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '40px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('THANKS FOR PLAYING!', canvas.width / 2, canvas.height / 2);
        pauseMenu.style.display = 'none';
        settingsMenu.style.display = 'none';
        startBtn.style.display = 'block';
        resumeBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
        restartBtn.style.display = 'none';
        mainMenuBtn.style.display = 'none';
        settingsBtn.style.display = 'none';
        exitBtn.style.display = 'none';
    }
    
    function startGame() {
        score = 0;
        lives = 3;
        scoreElement.textContent = score;
        livesElement.textContent = lives;
        initBricks();
        resetBall();
        powerUps.length = 0;
        gameRunning = true;
        gamePaused = false;
        startBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
        pauseBtn.style.display = 'block';
        restartBtn.style.display = 'block';
        mainMenuBtn.style.display = 'block';
        settingsBtn.style.display = 'block';
        exitBtn.style.display = 'block';
        pauseMenu.style.display = 'none';
        settingsMenu.style.display = 'none';
        unlockAudioContext();
        if (soundEnabled) {
            console.log('Attempting to play music on start');
            backgroundMusic.currentTime = 0;
            backgroundMusic.play().catch(e => {
                console.error('Start audio failed:', e);
            });
        }
        animationId = requestAnimationFrame(update);
    }
    
    function keyDown(e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            paddle.dx = paddle.speed;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            paddle.dx = -paddle.speed;
        } else if (e.key === 'Escape' && gameRunning && !gamePaused) {
            pauseGame();
        }
    }
    
    function keyUp(e) {
        if (
            e.key === 'Right' ||
            e.key === 'ArrowRight' ||
            e.key === 'Left' ||
            e.key === 'ArrowLeft'
        ) {
            paddle.dx = 0;
        }
    }
    
    function mouseMove(e) {
        const relativeX = e.clientX - canvas.offsetLeft;
        if (relativeX > 0 && relativeX < canvas.width) {
            paddle.x = relativeX - paddle.width / 2;
        }
    }
    
    function touchMove(e) {
        e.preventDefault();
        const touch = e.touches[0] || e.changedTouches[0];
        const relativeX = touch.clientX - canvas.offsetLeft;
        if (relativeX > 0 && relativeX < canvas.width) {
            paddle.x = relativeX - paddle.width / 2;
        }
    }
    
    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);
    canvas.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('touchmove', touchMove, { passive: false });
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    pauseBtn.addEventListener('click', pauseGame);
    restartBtn.addEventListener('click', restartGame);
    mainMenuBtn.addEventListener('click', mainMenu);
    settingsBtn.addEventListener('click', showSettings);
    exitBtn.addEventListener('click', exitGame);
    pauseResumeBtn.addEventListener('click', resumeGame);
    pauseRestartBtn.addEventListener('click', restartGame);
    pauseMainMenuBtn.addEventListener('click', mainMenu);
    pauseSettingsBtn.addEventListener('click', showSettings);
    pauseExitBtn.addEventListener('click', exitGame);
    enableSoundBtn.addEventListener('click', enableSound);
    disableSoundBtn.addEventListener('click', disableSound);
    settingsBackBtn.addEventListener('click', hideSettings);
    
    initBricks();
    ctx.font = '40px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('BREAKOUT', canvas.width / 2, canvas.height / 2);
    updateSoundButtonStates();
});