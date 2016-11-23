//Don't touch this unless you know what you are doing
function globalAI() {
	//Don't put any code in here
}

//Put your AI code in here
function tankAI(tank) {
	//This is an example AI, you can delete this block of code if you want to start from scratch
	
	if(tank.inCloseRange(tank.closestEnemy())) { //Is there an enemy close to us?
		//Yes! Shoot the enemy!
		tank.shootAt(tank.closestEnemy());
	} else if(tank.outOfRange(tank.weakestEnemy())) { //Is the weakest enemy out of range?
		tank.moveTowards(tank.weakestEnemy()); //Move towards the weakest enemy
	} else {
		tank.shootAt(tank.weakestEnemy()); //The weakest enemy is in range so shoot him!
	}
}
