// The number of birds in each population
//const totalPopulation = 25;
var totalPopulation = 5;
// Birds currently alived
var aliveBirds = [];

// all the birds of the current generation
var allBirds = [];
var p5=new p5();
function createNextGeneration() {
	
	normalizeFitness(allBirds);
	aliveBirds = generate(allBirds).slice();
	//allBirds = aliveBirds.slice();
	//for (let i = 0; i < aliveBirds.length; i++) {
	for (let i = 0; i < totalPopulation; i++) {
		
    let bird = aliveBirds[i];
    bird.mesh.scale.set(.25,.25,.25);
	
    scene.add(bird.mesh);
	}
    allBirds=[];
	resetGame();
}

function generate(oldBirds) {
	let newBirds = [];
	
	for (let i = 0; i < totalPopulation; i++) {
		let bird = poolSelection(oldBirds);	
		newBirds[i] = bird;
	}
	return newBirds;
}
//fix eds: en fitness guardamos el promedio
/* function normalizeFitness(birds){
	let sum = 0;
	
	for (let i = 0; i < birds.length; i++) {
		sum =sum+ birds[i].score;
		//console.log("score: "+birds[i].score);
	}
	for (let i = 0; i < birds.length; i++) {
		birds[i].fitness = sum/birds[i].length;
		//console.log("fitness: "+birds[i].fitness);
	}

}
 *///not working :
 function normalizeFitness(birds) {
	
	for (let i = 0; i < birds.length; i++) {
		console.log("Plane: "+i+", distancia: "+birds[i].score);
	//	birds[i].score = p5.pow(birds[i].score, 2); //no concuerda el mayor
	}
	let sum = 0;
	//console.log("sum: "+sum);
	for (let i = 0; i < birds.length; i++) {
		sum =sum+ birds[i].score;
			
	}
	for (let i = 0; i < birds.length; i++) {
		birds[i].fitness = birds[i].score / sum;
		//console.log("fitness: "+birds[i].fitness);
	}
	
} 


// An algorithm for picking one bird from an array
// based on fitness
/* function poolSelection(birds) {
	// Start at 0
	let index = 0;

	// Pick a random number between 0 and 1
	let r = random(1);

	// Keep subtracting probabilities until you get less than zero
	// Higher probabilities will be more likely to be fixed since they will
	// subtract a larger number towards zero
	while (r > 0) {
		r -= birds[index].fitness;
		// And move on to the next
		index ++;
	}

	// Go back one
	index --;

	// Make sure it's a copy!
	// (this includes mutation)
	return birds[index].copy();
} */
 
//mi Eds funcion de seleccion:
function poolSelection(birds){//aqui se obtiene el mayor score del promedio
	let index=0;
	let may=-1;
	for(j=0;j<birds.length;j++){
   		let bird =birds[j];
		if(bird.score > may ){
			index=j;
			may=bird.score;		//cambiando fitnes por score
		}
  	}
	  console.log("El mejor: "+index + " Distancia: "+may);
	return birds[index].copy();
    
}

