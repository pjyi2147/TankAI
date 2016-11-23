//Simple Tank Arean By: nulldev (Andy Bao)
(function(){
console.log("Setting up API...");

console.log("Setting up ticker...");
createjs.Ticker.framerate = 60;
createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
createjs.Ticker.addEventListener("tick", tick);

console.log("Setting up canvas...");
$('#magic').attr("height",$(window).height());
$('#magic').attr("width",$(window).width());
var stage = new createjs.Stage("magic");

console.log("Setting up graphics...");
var spriteScaling = 0.5;
var blocksize = 84 * spriteScaling;
var sheet = new createjs.SpriteSheet({
	images: ["tanks.png"],
	frames: {
		width: 84,
		height: 84,
		regX: 0,
		regY: 0,
		spacing: 0,
		margin: 0
	},
	animations: {
		idleGreen: 1,
		idleBlue: 9,
		moveGreen: [1, 8, "idleGreen", 0.3],
		moveBlue: [9, 16, "idleBlue", 0.3],
		ground: 0,
		explode: [17, 19, 0.1],
		rocket: 20,
		bullet: 21,
		icon: 22,
		trophy: 23,
		wallLeft: 24,
		wallRight: 25,
		wallHoriz: 26,
		wallTop: 27,
		wallVert: 28,
		wallBtm: 29,
		wallEdgeHoriz: 30,
		wallEdgeVert: 31
	}
	});

function setupSprite(spr) {
	spr.scaleX = spriteScaling;
	spr.scaleY = spriteScaling;
	return spr;
}

console.log("Setting up playing field..");
var walls = [];
function createWall(type, x, y) {
	let wall = setupSprite(new createjs.Sprite(sheet, type));
	wall.x = x;
	wall.y = y;
	stage.addChild(wall);
	walls.push(wall);
}
function createGround(x, y) {
	let ground = setupSprite(new createjs.Sprite(sheet, "ground"));
	ground.x = x;
	ground.y = y;
	stage.addChild(ground);
}
let extraWidth = stage.canvas.width % blocksize;
let widthBlocks = (stage.canvas.width - extraWidth) / blocksize;
let extraHeight = stage.canvas.height % blocksize;
let heightBlocks = (stage.canvas.height - extraHeight) / blocksize;
console.log("Stage is: " + widthBlocks + " x " + heightBlocks + "!");

let stageAnimSpeed = 1;
let lastStageAnim = 0;
function animateStageSetup(operation) {
	setTimeout(function() {
		operation();
	}, stageAnimSpeed * lastStageAnim);
	lastStageAnim++;
}
//Code to draw stage
animateStageSetup(function() {
	createWall("wallEdgeHoriz", 0, 0);
});
for(let x = 1; x < widthBlocks - 1; x++) {
	animateStageSetup(function() {
		createWall("wallHoriz", x * blocksize, 0);
	});
}
animateStageSetup(function() {
	createWall("wallEdgeHoriz", (widthBlocks - 1) * blocksize, 0);
});
for(let y = 1; y < heightBlocks - 1; y++) {
	animateStageSetup(function() {
		createWall("wallVert", (widthBlocks - 1) * blocksize, y * blocksize);
	});
}
animateStageSetup(function() {
	createWall("wallEdgeHoriz", (widthBlocks - 1) * blocksize, (heightBlocks - 1) * blocksize);
});
for(let x = widthBlocks - 2; x >= 1 ; x--) {
	animateStageSetup(function() {
		createWall("wallHoriz", x * blocksize, (heightBlocks - 1) * blocksize);
	});
}
animateStageSetup(function() {
	createWall("wallEdgeHoriz", 0, (heightBlocks - 1) * blocksize);
});
for(let y = heightBlocks - 2; y >= 1 ; y--) {
	animateStageSetup(function() {
		createWall("wallVert", 0, y * blocksize);
	});
}
for(let x = 1; x < widthBlocks - 1; x++) {
	for(let y = 1; y < heightBlocks - 1; y++) {
		animateStageSetup(function() {
			createGround(x * blocksize, y * blocksize);
		});
	}
}

console.log("Setting up tanks!");
var bulletShootSpeed = 25;
var rocketShootSpeed = 50;
var teamTanks = 10;
var closeRange = 300;
var mediumRange = 600;
var longRange = 900;
var movementSpeed = 10;

var startingHealth = 100;
var healRate = 8;

var bulletDamage = 5;
var bulletSpeed = 20;
var bulletDamageDecrease = bulletDamage/(longRange/bulletSpeed);

var tanks = [];
var friendlyTanks = [];
var enemyTanks = [];

function castTank(tank) {
	if(tank.friendly) {
		return tank;
	} else if(tank._original !== undefined && tank._original !== null) {
		return tank._original;
	} else {
		return tank;
	}
}

function arenaCoord(coord) {
	return coord - blocksize;
}
function tankCoord(coord) {
	return coord - (blocksize / 2);
}
function makeTankCoord(coord) {
	return coord + (blocksize / 2);
}

let publicApis = ["location", "distanceTo", "alive", "health", "lowHealth", "mediumHealth"];
function createTank(team, friendly) {
	let theTank = setupSprite(new createjs.Sprite(sheet, "idle" + team));
	let closeRangeSprite = setupSprite(new createjs.Shape());
	closeRangeSprite.graphics.setStrokeStyle(2).beginStroke("#ff0000").drawCircle(0, 0, closeRange);
	closeRangeSprite.alpha = 0.25;
	let mediumRangeSprite = setupSprite(new createjs.Shape());
	mediumRangeSprite.graphics.setStrokeStyle(2).beginStroke("#00ff00").drawCircle(0, 0, mediumRange);
	mediumRangeSprite.alpha = 0.25;
	let longRangeSprite = setupSprite(new createjs.Shape());
	longRangeSprite.graphics.setStrokeStyle(2).beginStroke("#0000ff").drawCircle(0, 0, longRange);
	longRangeSprite.alpha = 0.25;
	
	let healthBarOutline = new createjs.Shape();
	healthBarOutline.graphics.beginStroke(2).beginStroke("#ffffff").drawRect(-blocksize/2, -blocksize/2, startingHealth * spriteScaling, 10 * spriteScaling);
	let healthBar = new createjs.Shape();
	healthBar.alpha = 0.5;
	
	let tankId;
	if(friendly) {
		tankId = friendlyTanks.length + 1;
	} else {
		tankId = enemyTanks.length + 1;
	}
	let tankObj = {
		_sprite: theTank,
		_closeRangeSprite: closeRangeSprite,
		_mediumRangeSprite: mediumRangeSprite,
		_longRangeSprite: longRangeSprite,
		_healthBarOutline: healthBarOutline,
		_healthBar: healthBar,
		id: tankId,
		_ticksUntilNextBullet: bulletShootSpeed,
		_ticksUntilNextRocket: rocketShootSpeed,
		_ticksUntilNextHeal: healRate,
		_actionQueue: {
			move: false,
			shoot: false
		},
		_health: startingHealth,
		health: function() {
			return this._health;
		},
		alive: function() {
			return this.health() > 0;
		},
		//Get closest enemy
		closestEnemy: function() {
			let us = this;
			let smallestDistance = Number.MAX_VALUE;
			let closestTank = null;
			for(let enemy of enemyTankArray(this.friendly)) {
				let dist = us.distanceTo(enemy);
				if(enemy.alive() && dist < smallestDistance) {
					closestTank = enemy;
					smallestDistance = dist;
				}
			}
			return closestTank;
		},
		closestFriend: function() {
			let us = this;
			let smallestDistance = Number.MAX_VALUE;
			let closestTank = null;
			for(let friendly of enemyTankArray(!this.friendly)) {
				let dist = us.distanceTo(friendly);
				if(castTank(friendly) != us && friendly.alive() && dist < smallestDistance) {
					closestTank = friendly;
					smallestDistance = dist;
				}
			}
			return closestTank;
		},
		//Get weakest enemy
		weakestEnemy: function() {
			let us = this;
			let smallestHealth = Number.MAX_VALUE;
			let weakestTank = null;
			for(let enemy of enemyTankArray(this.friendly)) {
				if(enemy.alive() && enemy.health() < smallestHealth) {
					weakestTank = enemy;
					smallestHealth = enemy.health();
				}
			}
			return weakestTank;
		},
		weakestFriend: function() {
			let us = this;
			let smallestHealth = Number.MAX_VALUE;
			let weakestTank = null;
			for(let friendly of enemyTankArray(!this.friendly)) {
				if(castTank(friendly) != us && friendly.alive() && friendly.health() < smallestHealth) {
					weakestTank = friendly;
					smallestDistance = friendly.health();
				}
			}
			return weakestTank;
		},
		inShortRange: function(tank) {
			return this.inCloseRange(tank);
		},
		inCloseRange: function(tank) {
			if(tank === null || tank === undefined) return false;
			return this.distanceTo(tank) <= closeRange * spriteScaling;
		},
		inMediumRange: function(tank) {
			if(tank === null || tank === undefined) return false;
			return this.distanceTo(tank) <= mediumRange * spriteScaling;
		},
		inLongRange: function(tank) {
			if(tank === null || tank === undefined) return false;
			return this.distanceTo(tank) <= longRange * spriteScaling;
		},
		outOfRange: function(tank) {
			if(tank === null || tank === undefined) return false;
			return this.distanceTo(tank) > longRange * spriteScaling;
		},
		//Distance to any type of tank
		distanceTo: function(otherTank) {
			let ourLocation = this.location();
			let theirLocation = otherTank.location();
			return distanceBetween(ourLocation.x, ourLocation.y, theirLocation.x, theirLocation.y);
		},
		//Get the location of a tank
		location: function() {
			let us = this;
			return {
					x: tankCoord(arenaCoord(us._sprite.x)),
					y: tankCoord(arenaCoord(us._sprite.y))
				};
		},
		//Look at coordinates
		lookAtCoords: function(x, y) {
			this._sprite.rotation = angleCoords(this._sprite.x, this._sprite.y, x, y) + 90;
			this.syncCoords();
		},
		//Look at a tank
		lookAt: function(tank) {
			if(tank === null || tank === undefined) return;
			let castedTank = castTank(tank);
			this.lookAtCoords(castedTank._sprite.x, castedTank._sprite.y);
		},
		lookat: function(tank) {
			return this.lookAt(tank);
		},
		moveTowards: function(tank) {
			this.lookAt(tank);
			this.move();
		},
		driveTowards: function(tank) {
			this.moveTowards(tank);
		},
		driveTo: function(tank) {
			this.moveTowards(tank);
		},
		moveTo: function() {
			this.moveTowards(tank);
		},
		retreatFrom: function(tank) {
			this.lookAt(tank);
			this._sprite.rotation += 180;
			this.move();
		},
		fleeFrom: function(tank) {
			this.retreatFrom(tank);
		},
		runFrom: function(tank) {
			this.retreatFrom(tank);
		},
		move: function() {
			this._actionQueue.move = true;
		},
		shootAt: function(tank) {
			this.lookAt(tank);
			this.shoot();
		},
		fireAt: function(tank) {
			this.shootAt(tank);
		},
		shoot: function() {
			this._actionQueue.shoot = true;
		},
		lowHealth: function() {
			return this.health() <= 25;
		},
		mediumHealth: function() {
			return this.health() > 25 && this.health() <= 75;
		},
		
		friendly: friendly,
		syncCoords: function() {
			this._closeRangeSprite.x = this._sprite.x;
			this._closeRangeSprite.y = this._sprite.y;
			this._mediumRangeSprite.x = this._sprite.x;
			this._mediumRangeSprite.y = this._sprite.y;
			this._longRangeSprite.x = this._sprite.x;
			this._longRangeSprite.y = this._sprite.y;
			this._healthBarOutline.x = this._sprite.x;
			this._healthBarOutline.y = this._sprite.y;
			this._healthBar.x = this._sprite.x;
			this._healthBar.y = this._sprite.y;
		},
		_performActions: function() {
			if(this._actionQueue.move) {
				this._actionQueue.move = false;
				//TODO Check can move
				let velocity = findVelocity(this._sprite.rotation, movementSpeed);
				let newX = this._sprite.x + velocity.x;
				let newY = this._sprite.y + velocity.y;
				let hnewX = newX - (blocksize/2);
				let hnewY = newY - (blocksize/2);
				let canMove = true;
				for(let wall of walls) {
					if(wall.x < hnewX + blocksize &&
						wall.x + blocksize > hnewX &&
						wall.y < hnewY + blocksize &&
						blocksize + wall.y > hnewY) {
							canMove = false;
							break;
					}
				}
				if(canMove) {
					this._sprite.x = newX;
					this._sprite.y = newY;
				}
			}
			if(this._actionQueue.shoot) {
				if(this._ticksUntilNextBullet <= 0) {
					spawnBullet(this);
					this._ticksUntilNextBullet = bulletShootSpeed;
				}
				this._actionQueue.shoot = false;
			}
			//Heal
			if(this.alive() && this._health < startingHealth && this._ticksUntilNextHeal <= 0) {
				this._health += 1;
				this._updateHealthBar();
				this._ticksUntilNextHeal = healRate;
			}
			this.syncCoords();
		},
		_updateHealthBar: function() {
			let fillColor = "#00FF00";
			if(this.lowHealth()) {
				fillColor = "#ff0000";
			} else if(this.mediumHealth()) {
				fillColor = "#FFFF00";
			}
			this._healthBar.graphics.clear().beginFill(fillColor).drawRect(-blocksize/2, -blocksize/2, this._health * spriteScaling, 10 * spriteScaling);
		}
	};
	tanks.push(tankObj);
	if(friendly) {
		friendlyTanks.push(tankObj);
	} else {
		let enemyTank = {
			_original: tankObj,
			friendly: false
			};
		for(let publicApi of publicApis) {
			let originalApi = enemyTank._original[publicApi];
			enemyTank[publicApi] = function() {
				return originalApi.apply(enemyTank._original, arguments);
			};
		}
		enemyTanks.push(enemyTank);
	}
	//Draw initial health
	tankObj._updateHealthBar();
	spawnTank(tankObj);
}
function spawnTank(tank) {
	let castedTank = castTank(tank);
	let x;
	let y;
	let heightNoPadding = heightBlocks - 4;
	let extra = heightNoPadding % 2;
	let tankFit = (heightNoPadding - extra) / 2;
	let extraLeft = (tank.id - 1) % tankFit + 1;
	let fit = (tank.id - extraLeft) / tankFit;
	if(castedTank.friendly) {
		x = 2 * (fit + 1);
		y = extraLeft * 2;
	} else {
		x = widthBlocks - 3 - (2 * fit);
		y = heightBlocks - 1 - (extraLeft * 2);
	}
	tank._sprite.x = makeTankCoord(x * blocksize);
	tank._sprite.y = makeTankCoord(y * blocksize);
	tank._sprite.regX = blocksize;
	tank._sprite.regY = blocksize;
	tank.syncCoords();
	stage.addChild(tank._sprite);
	stage.addChild(tank._closeRangeSprite);
	stage.addChild(tank._mediumRangeSprite);
	stage.addChild(tank._longRangeSprite);
	stage.addChild(tank._healthBarOutline);
	stage.addChild(tank._healthBar);
}
var bullets = [];
function spawnBullet(tank) {
	let spr = setupSprite(new createjs.Sprite(sheet, "bullet"));
	spr.x = tank._sprite.x - (blocksize/2);
	spr.y = tank._sprite.y - (blocksize/2);
	let bullet = {
		sprite: spr,
		friendly: tank.friendly,
		velocity: findVelocity(tank._sprite.rotation, bulletSpeed),
		damage: bulletDamage
	};
	stage.addChild(spr);
	bullets.push(bullet);
}
function tickBullets() {
	for(let bullet of bullets) {
		bullet.sprite.x += bullet.velocity.x;
		bullet.sprite.y += bullet.velocity.y;
		bullet.damage -= bulletDamageDecrease;
		let alive = true;
		//Check collision with tanks
		//Use fast collision checking because bullets are small
		for(let tank of enemyTankArray(bullet.friendly)) {
			if(tank.alive() && fastCollisionCheck(bullet.sprite, castTank(tank)._sprite)) {
				//Bullet collided!
				//Remove from stage and array
				bullets.splice(bullets.indexOf(bullet), 1);
				stage.removeChild(bullet.sprite);
				//Damage tank
				damageTank(castTank(tank), bullet.damage);
				alive = false;
				break;
			}
		}
		
		//Collision with wall
		if(alive) {
			for(let wall of walls) {
				if(fastCollisionCheck(bullet.sprite, wall)) {
					//Bullet collided!
					//Remove from stage and array
					bullets.splice(bullets.indexOf(bullet), 1);
					stage.removeChild(bullet.sprite);
					alive = false;
					break;
				}
			}
		}
	}
}

function damageTank(tank, damage) {
	tank._health -= damage;
	tank._updateHealthBar();
	if(!tank.alive()) {
		//BOOM!
		spawnExplosion(tank);
		//Cleanup stage
		stage.removeChild(tank._sprite);
		stage.removeChild(tank._closeRangeSprite);
		stage.removeChild(tank._mediumRangeSprite);
		stage.removeChild(tank._longRangeSprite);
		stage.removeChild(tank._healthBarOutline);
		stage.removeChild(tank._healthBar);
	}
}
function spawnExplosion (tank) {
	let explosion = setupSprite(new createjs.Sprite(sheet, "explode"));
	explosion.x = tank._sprite.x - (blocksize/2);
	explosion.y = tank._sprite.y - (blocksize/2);
	explosion.on("animationend", function() {
		//Remove explosion
		stage.removeChild(explosion);
	});
	stage.addChild(explosion);
}

function enemyTankArray(friendly) {
	if(friendly) {
		return enemyTanks;
	} else {
		return friendlyTanks;
	}
}

function fastCollisionCheck(from, target) {
	let point = from.localToLocal(blocksize/2,blocksize/2,target);
	return target.hitTest(point.x, point.y);
}

console.log("Spawning tanks...");
//Spawn tanks
for(let theTank = 0; theTank < teamTanks; theTank++) {
	animateStageSetup(function() {
		createTank("Green", true);		
	});
	animateStageSetup(function() {
		createTank("Blue", false);		
	});
}

console.log("Starting game...");
var initalized = false;
animateStageSetup(function() {
	initalized = true;
});

function tick() {
	//Perform API action
	if(initalized) {
		//Perform AI actions (TODO Error handling)
		try {
			globalAI();
			for(let tank of friendlyTanks) {
				tankAI(tank);
			}
		} catch(e) {
			alert("Uh oh, your AI has crashed! The error is below:\n" + e.stack);
			initalized = false;
		}
		for(let tank of enemyTanks) {
			enemyAI(tank);
		}
		//Tick tanks
		let foundEnemyTank = false;
		let foundFriendlyTank = false;
		for(let tank of tanks) {
			if(tank.alive()) {
				tank._performActions();
				tank._ticksUntilNextBullet--;
				tank._ticksUntilNextHeal--;
				if(tank.friendly) {
					foundFriendlyTank = true;
				} else {
					foundEnemyTank = true;
				}
			}
		}
		//Tick bullets
		tickBullets();
		//TODO Check win
		if(!foundEnemyTank) {
			alert("You win!");
			initalized = false;
		} else if(!foundFriendlyTank) {
			alert("The enemy has won ☹!");
			initalized = false;
		}
	}
	stage.update(event);
}

//Perform enemy AI
function enemyAI(tank) {
	let casted = castTank(tank);
	closestEnemy = casted.closestEnemy();
	if(casted.lowHealth() && casted.inLongRange(closestEnemy)) {
		casted.fleeFrom(closestEnemy);
	} else if(casted.health() > 25 && !casted.inMediumRange(closestEnemy)) {
		casted.moveTowards(closestEnemy);
	} else {
		casted.shootAt(closestEnemy);
	}
}
})();

//EXPORTED CODE STARTS HERE!

function error(message) {
	let jsError = new Error();
	console.error(jsError);
}

//Get tank
function tank(id) {
	if(id > friendlyTanks.length || id < 1) {
		error("Tank #" + id + " does not exist!");
	}
	return friendlyTanks[id - 1];
}
//Get enemy tank
function enemy(id) {
	if(id > enemyTanks.length || id < 1) {
		error("Enemy tank #" + id + " does not exist!");
	}
	return enemyTanks[id - 1];
}

//Enemy tanks
function enemyTanks() {
	let res = [];
	for(enemyTank of enemyTanks) {
		if(enemyTank.alive()) {
			res.push(enemyTank);
		}
	}
	return res;
}

function friendlyTanks() {
	let res = [];
	for(friendlyTank of friendlyTanks) {
		if(friendlyTank.alive()) {
			res.push(friendlyTank);
		}
	}
}

//Find coordinate distance
function distanceBetween(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(Math.abs(y2 - y1), 2) + Math.pow(Math.abs(x2 - x1), 2));
}
//Find velocity from angle and speed
function findVelocity(angle, speed) {
	let ratioX = Math.sin(angle * Math.PI / 180);
	let ratioY = -Math.cos(angle * Math.PI / 180);
	return {x: speed * ratioX, y: speed * ratioY};
}

function angleCoords(x1, y1, x2, y2) {
	if(x2 === x1) {
	if(y2 >= y1) {
	    return 90
	} else if (y2 < y1) {
	    return 270
    } 
    }else {
	if(x2 > x1 && y2 >= y1) { //QUAD 1
	    return Math.atan((y2 - y1) / (x2 - x1))* (180/Math.PI)
	} else if(x2 > x1 && y2 < y1) { //QUAD 2
	    return 360 + Math.atan((y2 - y1) / (x2 - x1))* (180/Math.PI)
	} else if(x2 < x1 && y2 < y1) { //QUAD 3
	    return 180 + Math.atan((y2 - y1) / (x2 - x1))* (180/Math.PI)
	} else if(x2 < x1 && y2 >= y1) { //QUAD 4
	    return 180 + Math.atan((y2 - y1) / (x2 - x1))* (180/Math.PI)
	}
   }
}
