tf.setBackend("cpu");
//tf.loadLayersModel('localstorage://BirdBrain');//load model from localstorage

let pipes = [];
let frameCounter = 0;
// Current generation number
let generation = 1;
let generationSpan;
//COLORS
var Colors = {
  red:0xf25346,
  green:0xD0B494,
  white:0xd8d0d1,
  brown:0x9dba94,
  brownDark:0x544b32,
  pink:0xF5986E,
  yellow:0xFFC373,
  blue:0x8E3D75,
  black: 0x000000,
  red1: 0xE3242B,
  red2: 0xFDB731,
  red3: 0x379351,
  grey: 0xD9D1B9,
  darkGrey: 0x4D4B54,
  windowBlue: 0xaabbe3,
  windowDarkBlue: 0x4A6E8A,
  thrusterOrange: 0xFEA036,

};

///////////////

// GAME VARIABLES
var game;
var deltaTime = 0;
var newTime = new Date().getTime();
var oldTime = new Date().getTime();
var ennemiesPool = [];
var particlesPool = [];
var particlesInUse = [];
var ennemiesInUse = [];
function resetGame(){
  game = {speed:0,
    /* //original:
          initSpeed:.00035,
          baseSpeed:.00035,
          targetBaseSpeed:.00035,
          incrementSpeedByTime:.0000025,
          incrementSpeedByLevel:.000005,
          distanceForSpeedUpdate:100,
          speedLastUpdate:0,
*/
          initSpeed:.00029,
          baseSpeed:.00029,
          targetBaseSpeed:.00029,
          incrementSpeedByTime:.000001,
          incrementSpeedByLevel:.000001,
          distanceForSpeedUpdate:150,
          speedLastUpdate:0,
          distance:0,
          ratioSpeedDistance:50,
          energy:80,
          ratioSpeedEnergy:3,

          level:1,
          levelLastUpdate:0,
          distanceForLevelUpdate:250,//orig:1000

          planeDefaultHeight:300,//orig:100
          planeAmpHeight:150,//orig:80
          planeAmpWidth:120,//orig:75
          planeMoveSensivity:0.005,
          planeRotXSensivity:0.00018,
          planeRotZSensivity:0.0004,
          planeFallSpeed:.001,
          planeMinSpeed:1.2,
          planeMaxSpeed:1.8,
          planeSpeed:0,
          planeCollisionDisplacementX:0,
          planeCollisionSpeedX:0,
          planeCollisionDisplacementY:0,
          planeCollisionSpeedY:0,
          seaRadius:2250,//original:600
          seaLength:880, //original:800
          wavesMinAmp : 2.5,//orig:5
          wavesMaxAmp : 13,
          wavesMinSpeed : 0.001,
          wavesMaxSpeed : 0.003,
          cameraFarPos:400,
          cameraNearPos:290,//orign:150
          cameraSensivity:0.002,
          coinDistanceTolerance:15,
          coinValue:3,
          coinsSpeed:.5,
          coinLastSpawn:0,
          distanceForCoinsSpawn:10,
          ennemyDistanceTolerance:10,
          ennemyValue:80,
          ennemiesSpeed:.8,//orig:.6
          ennemyLastSpawn:0,
          distanceForEnnemiesSpawn:58,

          status : "playing",
         };
  //fieldLevel.innerHTML = Math.floor(game.level);
  fieldLevel.innerHTML = generation;
  clearEnnemies();//limpiamos de pantalla los enemigos
}

//THREEJS RELATED VARIABLES

var scene,
    camera, fieldOfView, aspectRatio, nearPlane, farPlane,
    renderer,
    container,
    controls;

//SCREEN & MOUSE VARIABLES

var HEIGHT, WIDTH,
    mousePos = { x: 0, y: 0 };

//INIT THREE JS, SCREEN AND MOUSE EVENTS

function createScene() {

  HEIGHT = 450;
  //HEIGHT = window.innerHeight;
  WIDTH = 800;
  //WIDTH = window.innerWidth;

  scene = new THREE.Scene();
  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 140;
  nearPlane = .1;
  farPlane = 10000;
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane
    );
  scene.fog = new THREE.Fog(0xE1F6FF, 900,1400);
  camera.position.x = 0;
  camera.position.z = 480;//orig:200
  camera.position.y = game.planeDefaultHeight;
  
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(WIDTH, HEIGHT);

  renderer.shadowMap.enabled = true;

  container = document.getElementById('world');
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', handleWindowResize, false);

 
}

// MOUSE AND SCREEN EVENTS

 function handleWindowResize() {
   //HEIGHT = window.innerHeight;
  //WIDTH = window.innerWidth;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}
/*
function handleMouseMove(event) {
  var tx = -1 + (event.clientX / WIDTH)*2;
  var ty = 1 - (event.clientY / HEIGHT)*2;
  mousePos = {x:tx, y:ty};
}

function handleTouchMove(event) {
    event.preventDefault();
    var tx = -1 + (event.touches[0].pageX / WIDTH)*2;
    var ty = 1 - (event.touches[0].pageY / HEIGHT)*2;
    mousePos = {x:tx, y:ty};
}

function handleMouseUp(event){
  if (game.status == "waitingReplay"){
    resetGame();
    hideReplay();
  }
}


function handleTouchEnd(event){
  if (game.status == "waitingReplay"){
    resetGame();
    hideReplay();
  }
}
 */
// LIGHTS

var ambientLight, hemisphereLight, shadowLight;

function createLights() {

   hemisphereLight = new THREE.HemisphereLight(0x404040, 0x404040, .9)

  ambientLight = new THREE.AmbientLight(0xdc8874, .5);

  shadowLight = new THREE.DirectionalLight(0x71fdff, .9);
  shadowLight.position.set(150, 350, -250);
  shadowLight.castShadow = true;
  shadowLight.shadow.camera.left = -400;
  shadowLight.shadow.camera.right = 400;
  shadowLight.shadow.camera.top = 400;
  shadowLight.shadow.camera.bottom = -400;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 800;
  shadowLight.shadow.mapSize.width = 4096;
  shadowLight.shadow.mapSize.height = 4096;

  //var ch = new THREE.CameraHelper(shadowLight.shadow.camera);

  //scene.add(ch);
  scene.add(hemisphereLight);
  scene.add(shadowLight);
  scene.add(ambientLight); 
  const directionalLight = new THREE.DirectionalLight(0xdfebff, 1);
  directionalLight.position.set(-300, 0, 600);

  const pointLight = new THREE.PointLight(0xffcc71, 2, 1000, 2);
  pointLight.position.set(200, -100, 50);

  scene.add( pointLight);
 
}


var Pilot = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "pilot";
  this.angleHairs=0;

  var bodyGeom = new THREE.BoxGeometry(15,15,15);
  var bodyMat = new THREE.MeshLambertMaterial({color:Colors.brown, shading:THREE.FlatShading});
  var body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.set(2,-12,0);

  this.mesh.add(body);

  var faceGeom = new THREE.BoxGeometry(10,10,10);
  var faceMat = new THREE.MeshLambertMaterial({color:Colors.pink});
  var face = new THREE.Mesh(faceGeom, faceMat);
  this.mesh.add(face);

  var hairGeom = new THREE.BoxGeometry(4,4,4);
  var hairMat = new THREE.MeshLambertMaterial({color:Colors.brownDark});
  var hair = new THREE.Mesh(hairGeom, hairMat);
  hair.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0,2,0));
  var hairs = new THREE.Object3D();

  this.hairsTop = new THREE.Object3D();

  for (var i=0; i<12; i++){
    var h = hair.clone();
    var col = i%3;
    var row = Math.floor(i/3);
    var startPosZ = -4;
    var startPosX = -4;
    h.position.set(startPosX + row*4, 0, startPosZ + col*4);
    h.geometry.applyMatrix4(new THREE.Matrix4().makeScale(1,1,1));
    this.hairsTop.add(h);
  }
  hairs.add(this.hairsTop);

  var hairSideGeom = new THREE.BoxGeometry(12,4,2);
  hairSideGeom.applyMatrix4(new THREE.Matrix4().makeTranslation(-6,0,0));
  var hairSideR = new THREE.Mesh(hairSideGeom, hairMat);
  var hairSideL = hairSideR.clone();
  hairSideR.position.set(8,-2,6);
  hairSideL.position.set(8,-2,-6);
  hairs.add(hairSideR);
  hairs.add(hairSideL);

  var hairBackGeom = new THREE.BoxGeometry(2,8,10);
  var hairBack = new THREE.Mesh(hairBackGeom, hairMat);
  hairBack.position.set(-1,-4,0)
  hairs.add(hairBack);
  hairs.position.set(-5,5,0);

  this.mesh.add(hairs);

  var glassGeom = new THREE.BoxGeometry(5,5,5);
  var glassMat = new THREE.MeshLambertMaterial({color:Colors.brown});
  var glassR = new THREE.Mesh(glassGeom,glassMat);
  glassR.position.set(6,0,3);
  var glassL = glassR.clone();
  glassL.position.z = -glassR.position.z

  var glassAGeom = new THREE.BoxGeometry(11,1,11);
  var glassA = new THREE.Mesh(glassAGeom, glassMat);
  this.mesh.add(glassR);
  this.mesh.add(glassL);
  this.mesh.add(glassA);

  var earGeom = new THREE.BoxGeometry(2,3,2);
  var earL = new THREE.Mesh(earGeom,faceMat);
  earL.position.set(0,0,-6);
  var earR = earL.clone();
  earR.position.set(0,0,6);
  this.mesh.add(earL);
  this.mesh.add(earR);
}

Pilot.prototype.updateHairs = function(){
  //*
   var hairs = this.hairsTop.children;

   var l = hairs.length;
   for (var i=0; i<l; i++){
      var h = hairs[i];
      h.scale.y = .75 + Math.cos(this.angleHairs+i/3)*.25;
   }
  this.angleHairs += game.speed*deltaTime*40;
  //*/
}

var AirPlane = function(brain){
  //this.brain =new NeuralNetwork(4, 16, 2);
  
    
		// How many frames the bird stays alive
		this.score = 0;

		// The fitness of the bird
		this.fitness = 0;

		if (brain instanceof NeuralNetwork) {
			this.brain = brain.copy();
			//this.brain.mutate(0.1);//mutation to weights
      console.log("copiando...");
		} else {
			// Parameters are number of inputs, number of units in hidden Layer, number of outputs
      
			this.brain = new NeuralNetwork(5, 3, 1); //128 best performance
      
      console.log("creando cerebro...");
		}

  
  AirPlane.prototype.copy=function(){
    return new AirPlane(this.brain);
  }
  AirPlane.prototype.chooseAction=function(pipes,targetY){
    let closest = null;
		let minimum = 100; //distancia minima (entre avion y enemigo)para tomar accion
    let returnAction=targetY;
    let diff = 0;
		for (let i = 0; i < pipes.length; i++) {
      
      if(pipes[i].mesh.position.x>=this.mesh.position.x){//x.objeto mayor a bird
      let diffPos = pipes[i].mesh.position.clone().sub(this.mesh.position.clone());
      diff = diffPos.length();
      }
           //console.log("diff: "+diff);
			
			if (diff > game.ennemyDistanceTolerance && diff < minimum) {
				minimum = diff;
				closest = pipes[i];
			}



		}
 //console.log("closest: "+closest);
		if (closest != null) {
			// We get all the inputs and normalize them between 0 and 1
			//let inputs = [1,0,1,1,1];
      let inputs =[];
      const center = new THREE.Vector3();
      //bBox.getCenter( center );
			var box = new THREE.Box3().setFromObject( this.mesh );
      var box2 = new THREE.Box3().setFromObject( closest.mesh );
//console.log( box.min, box.max, box.getSize() );
      	// 1. The horizontal distance of the pipe from the bird
			inputs[0] = p5.map(minimum,game.ennemyDistanceTolerance, 100, 0, 1);

			// 2. top of the closest
			//inputs[1] = p5.map(box2.min, 0, box2.getSize(center), 0, 1);
      inputs[1] = p5.map(closest.mesh.position.y,game.planeDefaultHeight-game.planeAmpHeight, game.planeDefaultHeight+game.planeAmpHeight, 0, 1);
			
			// 3. ennemy's y position
			inputs[2] = p5.map(box2.max, 0, box2.getSize(center), 0, 1);
      // 4. bird's y position
			
			inputs[3] = p5.map(this.mesh.y, game.planeDefaultHeight-game.planeAmpHeight, game.planeDefaultHeight+game.planeAmpHeight, 0, 1);

      // 5. bird's velocity
      inputs[4] = map(game.planeSpeed, game.planeMinSpeed, game.planeMaxSpeed, 0, 1);
			const action = this.brain.predict(inputs);
      
      if (action[0] > 0.5) {
        returnAction+=0.5;

      }else if (action[0] > 0 &&  action[0] <= 0.5){
        returnAction-=0.5;
      }      
      else
        returnAction=0;
      
		}
    return returnAction;
  }

  this.mesh = new THREE.Object3D();
  this.mesh.name = "airPlane";
  //random color:
  rcolor = new THREE.Color( 0xffffff );
  rcolor.setHex( Math.random() * 0xffffff );
  
  // Cabin
  var geomCabin = new THREE.BoxGeometry(80,50,50,1,1,1);
  var matCabin = new THREE.MeshLambertMaterial({
     //color:Colors.red,
     color: rcolor,
     shading:THREE.FlatShading});

  geomCabin.vertices[4].y-=10;
  geomCabin.vertices[4].z+=20;
  geomCabin.vertices[5].y-=10;
  geomCabin.vertices[5].z-=20;
  geomCabin.vertices[6].y+=30;
  geomCabin.vertices[6].z+=20;
  geomCabin.vertices[7].y+=30;
  geomCabin.vertices[7].z-=20;

  var cabin = new THREE.Mesh(geomCabin, matCabin);
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  this.mesh.add(cabin);

  // Engine

  var geomEngine = new THREE.BoxGeometry(20,50,50,1,1,1);
  var matEngine = new THREE.MeshLambertMaterial({color:Colors.white, shading:THREE.FlatShading});
  var engine = new THREE.Mesh(geomEngine, matEngine);
  engine.position.x = 50;
  engine.castShadow = true;
  engine.receiveShadow = true;
  this.mesh.add(engine);

  // Tail Plane

  var geomTailPlane = new THREE.BoxGeometry(15,20,5,1,1,1);
  var matTailPlane = new THREE.MeshLambertMaterial({
    //color:Colors.red,
    color:rcolor,
    shading:THREE.FlatShading});
  var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
  tailPlane.position.set(-40,20,0);
  tailPlane.castShadow = true;
  tailPlane.receiveShadow = true;
  this.mesh.add(tailPlane);

  // Wings

  var geomSideWing = new THREE.BoxGeometry(30,5,120,1,1,1);
  var matSideWing = new THREE.MeshLambertMaterial({
     //color:Colors.red,
     color:rcolor,    
    shading:THREE.FlatShading});
  var sideWing = new THREE.Mesh(geomSideWing, matSideWing);
  sideWing.position.set(0,15,0);
  sideWing.castShadow = true;
  sideWing.receiveShadow = true;
  this.mesh.add(sideWing);

  var geomWindshield = new THREE.BoxGeometry(3,15,20,1,1,1);
  var matWindshield = new THREE.MeshLambertMaterial({color:Colors.white,transparent:true, opacity:.3, shading:THREE.FlatShading});;
  var windshield = new THREE.Mesh(geomWindshield, matWindshield);
  windshield.position.set(5,27,0);

  windshield.castShadow = true;
  windshield.receiveShadow = true;

  this.mesh.add(windshield);

  var geomPropeller = new THREE.BoxGeometry(20,10,10,1,1,1);
  geomPropeller.vertices[4].y-=5;
  geomPropeller.vertices[4].z+=5;
  geomPropeller.vertices[5].y-=5;
  geomPropeller.vertices[5].z-=5;
  geomPropeller.vertices[6].y+=5;
  geomPropeller.vertices[6].z+=5;
  geomPropeller.vertices[7].y+=5;
  geomPropeller.vertices[7].z-=5;
  var matPropeller = new THREE.MeshLambertMaterial({color:Colors.brown, shading:THREE.FlatShading});
  this.propeller = new THREE.Mesh(geomPropeller, matPropeller);

  this.propeller.castShadow = true;
  this.propeller.receiveShadow = true;

  var geomBlade = new THREE.BoxGeometry(1,80,10,1,1,1);
  var matBlade = new THREE.MeshLambertMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
  var blade1 = new THREE.Mesh(geomBlade, matBlade);
  blade1.position.set(8,0,0);

  blade1.castShadow = true;
  blade1.receiveShadow = true;

  var blade2 = blade1.clone();
  blade2.rotation.x = Math.PI/2;

  blade2.castShadow = true;
  blade2.receiveShadow = true;

  this.propeller.add(blade1);
  this.propeller.add(blade2);
  this.propeller.position.set(60,0,0);
  this.mesh.add(this.propeller);

  var wheelProtecGeom = new THREE.BoxGeometry(30,15,10,1,1,1);
  var wheelProtecMat = new THREE.MeshLambertMaterial({
     //color:Colors.red,
     color:rcolor,
     shading:THREE.FlatShading});
  var wheelProtecR = new THREE.Mesh(wheelProtecGeom,wheelProtecMat);
  wheelProtecR.position.set(25,-20,25);
  this.mesh.add(wheelProtecR);

  var wheelTireGeom = new THREE.BoxGeometry(24,24,4);
  var wheelTireMat = new THREE.MeshLambertMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
  var wheelTireR = new THREE.Mesh(wheelTireGeom,wheelTireMat);
  wheelTireR.position.set(25,-28,25);

  var wheelAxisGeom = new THREE.BoxGeometry(10,10,6);
  var wheelAxisMat = new THREE.MeshLambertMaterial({color:Colors.brown, shading:THREE.FlatShading});
  var wheelAxis = new THREE.Mesh(wheelAxisGeom,wheelAxisMat);
  wheelTireR.add(wheelAxis);

  this.mesh.add(wheelTireR);

  var wheelProtecL = wheelProtecR.clone();
  wheelProtecL.position.z = -wheelProtecR.position.z ;
  this.mesh.add(wheelProtecL);

  var wheelTireL = wheelTireR.clone();
  wheelTireL.position.z = -wheelTireR.position.z;
  this.mesh.add(wheelTireL);

  var wheelTireB = wheelTireR.clone();
  wheelTireB.scale.set(.5,.5,.5);
  wheelTireB.position.set(-35,-5,0);
  this.mesh.add(wheelTireB);

  var suspensionGeom = new THREE.BoxGeometry(4,20,4);
  suspensionGeom.applyMatrix4(new THREE.Matrix4().makeTranslation(0,10,0))
  var suspensionMat = new THREE.MeshLambertMaterial({
     //color:Colors.red,
     color:rcolor,
     shading:THREE.FlatShading});
  var suspension = new THREE.Mesh(suspensionGeom,suspensionMat);
  suspension.position.set(-35,-5,0);
  suspension.rotation.z = -.3;
  this.mesh.add(suspension);

  this.pilot = new Pilot();
  this.pilot.mesh.position.set(-10,27,0);
  this.mesh.add(this.pilot.mesh);


  this.mesh.castShadow = true;
  this.mesh.receiveShadow = true;

};

Sky = function(){
  this.mesh = new THREE.Object3D();
  this.nClouds = 20;
  this.clouds = [];
  var stepAngle = Math.PI*2 / this.nClouds;
  for(var i=0; i<this.nClouds; i++){
    var c = new Cloud();
    this.clouds.push(c);
    var a = stepAngle*i;
    var h = game.seaRadius + 150 + Math.random()*200;
    c.mesh.position.y = Math.sin(a)*h;
    c.mesh.position.x = Math.cos(a)*h;
    c.mesh.position.z = -300-Math.random()*500;
    c.mesh.rotation.z = a + Math.PI/2;
    var s = 1+Math.random()*2;
    c.mesh.scale.set(s,s,s);
    this.mesh.add(c.mesh);
  }
}

Sky.prototype.moveClouds = function(){
  for(var i=0; i<this.nClouds; i++){
    var c = this.clouds[i];
    c.rotate();
  }
  this.mesh.rotation.z += game.speed*deltaTime;

}

Sea = function(){
  var geom = new THREE.CylinderGeometry(game.seaRadius,game.seaRadius,game.seaLength,40,10);
  geom.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI/2));
  geom.mergeVertices();
  var l = geom.vertices.length;

  this.waves = [];

  for (var i=0;i<l;i++){
    var v = geom.vertices[i];
    //v.y = Math.random()*30;
    this.waves.push({y:v.y,
                     x:v.x,
                     z:v.z,
                     ang:Math.random()*Math.PI*2,
                     amp:game.wavesMinAmp + Math.random()*(game.wavesMaxAmp-game.wavesMinAmp),
                     speed:game.wavesMinSpeed + Math.random()*(game.wavesMaxSpeed - game.wavesMinSpeed)
                    });
  };
  var mat = new THREE.MeshLambertMaterial({
    color:Colors.brown,
    transparent:true,
    opacity:1,
    flatShading:true,

  });

  this.mesh = new THREE.Mesh(geom, mat);
  this.mesh.name = "waves";
  this.mesh.receiveShadow = true;

}

Sea.prototype.moveWaves = function (){
  var verts = this.mesh.geometry.vertices;
  var l = verts.length;
  for (var i=0; i<l; i++){
    var v = verts[i];
    var vprops = this.waves[i];
    v.x =  vprops.x + Math.cos(vprops.ang)*vprops.amp;
    v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;
    vprops.ang += vprops.speed*deltaTime;
    this.mesh.geometry.verticesNeedUpdate=true;
  }
}

Cloud = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "cloud";
  //var geom = new THREE.CubeGeometry(20,18,20);
  var geom = new THREE.TetrahedronGeometry(8.5,2);
 // var geom = new THREE.TetrahedronGeometry(4,4)
 var mat = new THREE.MeshLambertMaterial({
  color:Colors.white,
  flatShading:true,
  opacity: 0.8  
});

  var nBlocs = 18+Math.floor(Math.random()*12);
  for (var i=0; i<nBlocs; i++ ){
    var m = new THREE.Mesh(geom.clone(), mat);
    m.position.x = i*3;
    m.position.y = Math.random()*10;
    m.position.z = Math.random()*50;
    m.rotation.z = Math.random()*Math.PI*0.002;
    m.rotation.y = Math.random()*Math.PI*0.002;
    var s = .6 + Math.random()*.9;
    m.scale.set(s,s,s);
    this.mesh.add(m);
    m.castShadow = true;
    m.receiveShadow = true;

  }
  
}

Cloud.prototype.rotate = function(){
  var l = this.mesh.children.length;
  for(var i=0; i<l; i++){
    var m = this.mesh.children[i];
    m.rotation.z+= Math.random()*.005*(i+1);
    m.rotation.y+= Math.random()*.002*(i+1);
  }
}

Ennemy = function(){
  var geom = new THREE.TetrahedronGeometry(11,2);
  var mat = new THREE.MeshLambertMaterial({
    color: 0x666666,
    flatShading:true,
  opacity: 0.7  
});
  this.mesh = new THREE.Mesh(geom,mat);
  
  this.mesh.castShadow = true;
  this.mesh.receiveShadow = true;
  this.angle = 0;
  this.dist = 0;
}
var ennemie
EnnemiesHolder = function (){
  this.mesh = new THREE.Object3D();
  
}

EnnemiesHolder.prototype.spawnEnnemies = function(){
  var nEnnemies = game.level;
  $("#numeroEnemigos").val(game.level);
  for (var i=0; i<nEnnemies; i++){
    var ennemy;
    if (ennemiesPool.length) {
      ennemy = ennemiesPool.pop();
    }else{
      ennemy = new Ennemy();
    }

    ennemy.angle = - (i*0.1);
    ennemy.distance = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight-20);
    ennemy.mesh.position.y = -game.seaRadius + Math.sin(ennemy.angle)*ennemy.distance;
    ennemy.mesh.position.x = Math.cos(ennemy.angle)*ennemy.distance;

    this.mesh.add(ennemy.mesh);
    ennemiesInUse.push(ennemy);
  }
}

EnnemiesHolder.prototype.rotateEnnemies = function(){
  for (var i=0; i<ennemiesInUse.length; i++){
    var ennemy = ennemiesInUse[i];
    ennemy.angle += game.speed*deltaTime*game.ennemiesSpeed;

    if (ennemy.angle > Math.PI*2) ennemy.angle -= Math.PI*2;

    ennemy.mesh.position.y = -game.seaRadius + Math.sin(ennemy.angle)*ennemy.distance+15;
    ennemy.mesh.position.x = Math.cos(ennemy.angle)*ennemy.distance;
    ennemy.mesh.rotation.z += Math.random()*.1;
    ennemy.mesh.rotation.y += Math.random()*.1;
    //copiar vector a allbirds
   

    //for (var j=0; j<aliveBirds.length; j++) {
    for (let i = aliveBirds.length - 1; i >= 0; i--) {
      let bird = aliveBirds[i];
      let diffPos = bird.mesh.position.clone().sub(ennemy.mesh.position.clone());
      let d = diffPos.length();
      if (d<game.ennemyDistanceTolerance){
        
        particlesHolder.spawnParticles(ennemy.mesh.position.clone(), 15, Colors.yellow, 3);
        
      
        //remove bird:
        allBirds.push(aliveBirds.splice(i, 1)[0]);
        //j++;
        //para destruir enemigo despues del choque:
        
          /* ennemiesPool.unshift(ennemiesInUse.splice(i,1)[0]);
          this.mesh.remove(ennemy.mesh);
          i--; */
        
        scene.remove(bird.mesh);
        
        //bird.mesh.position.y=1;
				console.log("Restantes: "+aliveBirds.length);
        //romoves energy of game but not bird
        //removeEnergy();
        //i--;
       
      }
      
    }
    
    
    if (ennemy.angle > Math.PI){
      ennemiesPool.unshift(ennemiesInUse.splice(i,1)[0]);
      this.mesh.remove(ennemy.mesh);
      i--;
    }
  }
}

Particle = function(){
  var geom = new THREE.TetrahedronGeometry(3,0);
  var mat = new THREE.MeshLambertMaterial({
    color:0x009999,
    shading:THREE.FlatShading
  });
  this.mesh = new THREE.Mesh(geom,mat);
}

Particle.prototype.explode = function(pos, color, scale){
  var _this = this;
  var _p = this.mesh.parent;
  this.mesh.material.color = new THREE.Color( color);
  this.mesh.material.needsUpdate = true;
  this.mesh.scale.set(scale, scale, scale);
  var targetX = pos.x + (-1 + Math.random()*2)*50;
  var targetY = pos.y + (-1 + Math.random()*2)*50;
  var speed = .6+Math.random()*.2;
  TweenMax.to(this.mesh.rotation, speed, {x:Math.random()*12, y:Math.random()*12});
  TweenMax.to(this.mesh.scale, speed, {x:.1, y:.1, z:.1});
  TweenMax.to(this.mesh.position, speed, {x:targetX, y:targetY, delay:Math.random() *.1, ease:Power2.easeOut, onComplete:function(){
      if(_p) _p.remove(_this.mesh);
      _this.mesh.scale.set(1,1,1);
      particlesPool.unshift(_this);
    }});
}

ParticlesHolder = function (){
  this.mesh = new THREE.Object3D();
  this.particlesInUse = [];
}

ParticlesHolder.prototype.spawnParticles = function(pos, density, color, scale){

  var nPArticles = density;
  for (var i=0; i<nPArticles; i++){
    var particle;
    if (particlesPool.length) {
      particle = particlesPool.pop();
    }else{
      particle = new Particle();
    }
    this.mesh.add(particle.mesh);
    particle.mesh.visible = true;
    var _this = this;
    particle.mesh.position.y = pos.y;
    particle.mesh.position.x = pos.x;
    particle.explode(pos,color, scale);
  }
}

Coin = function(){
  var geom = new THREE.TetrahedronGeometry(8,0);
  var mat = new THREE.MeshLambertMaterial({
    color:0xD4F21B,
    shading:THREE.FlatShading
  });
  this.mesh = new THREE.Mesh(geom,mat);
  this.mesh.castShadow = true;
  this.angle = 0;
  this.dist = 0;
}

CoinsHolder = function (nCoins){
  this.mesh = new THREE.Object3D();
  this.coinsInUse = [];
  this.coinsPool = [];
  for (var i=0; i<nCoins; i++){
    var coin = new Coin();
    this.coinsPool.push(coin);
  }
}

CoinsHolder.prototype.spawnCoins = function(){

  var nCoins = 1 + Math.floor(Math.random()*10);
  var d = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight-20);
  var amplitude = 10 + Math.round(Math.random()*10);
  for (var i=0; i<nCoins; i++){
    var coin;
    if (this.coinsPool.length) {
      coin = this.coinsPool.pop();
    }else{
      coin = new Coin();
    }
    this.mesh.add(coin.mesh);
    this.coinsInUse.push(coin);
    coin.angle = - (i*0.02);
    coin.distance = d + Math.cos(i*.5)*amplitude;
    coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle)*coin.distance;
    coin.mesh.position.x = Math.cos(coin.angle)*coin.distance;
  }
}

CoinsHolder.prototype.rotateCoins = function(){
  for (var i=0; i<this.coinsInUse.length; i++){
    var coin = this.coinsInUse[i];
    if (coin.exploding) continue;
    coin.angle += game.speed*deltaTime*game.coinsSpeed;
    if (coin.angle>Math.PI*2) coin.angle -= Math.PI*2;
    coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle)*coin.distance;
    coin.mesh.position.x = Math.cos(coin.angle)*coin.distance;
    coin.mesh.rotation.z += Math.random()*.1;
    coin.mesh.rotation.y += Math.random()*.1;
    for (let j=0; j<aliveBirds.length ; j++){
      let bird = aliveBirds[j];
      let diffPos = bird.mesh.position.clone().sub(coin.mesh.position.clone());
      let d = diffPos.length();
      if (d<game.coinDistanceTolerance){
        //erase coin:
        //this.coinsPool.unshift(this.coinsInUse.splice(i,1)[0]);
        //this.mesh.remove(coin.mesh);
        particlesHolder.spawnParticles(coin.mesh.position.clone(), 5, 0x009999, .8);
        
        //addEnergy();
        //i--;
      }
  }
    if (coin.angle > Math.PI){
      this.coinsPool.unshift(this.coinsInUse.splice(i,1)[0]);
      this.mesh.remove(coin.mesh);
      i--;
    }
  }
}


// 3D Models
var sea;
var airplane;

function createPlane(){
  
  for (let i = 0; i < totalPopulation; i++) {
		//let bird = new Bird();
    let bird = new AirPlane();
    bird.mesh.scale.set(.25,.25,.25);
    bird.mesh.position.y = game.planeDefaultHeight-Math.random(40) ;
    //bird.mesh.position.x = game.planeAmpWidth-Math.random(40) ;
    //bird.mesh.position.y = game.planeDefaultHeight ;
		aliveBirds[i] = bird;
		allBirds[i] = bird;
    scene.add(bird.mesh);
	}
  
  
}


function createSea(){
  sea = new Sea();
  sea.mesh.position.y = -game.seaRadius;
  scene.add(sea.mesh);
}

function createSky(){
  sky = new Sky();
  sky.mesh.position.y = -game.seaRadius;
  scene.add(sky.mesh);
}

function createCoins(){

  coinsHolder = new CoinsHolder(20);
  scene.add(coinsHolder.mesh)
}

function createEnnemies(){
  for (var i=0; i<10; i++){
    var ennemy = new Ennemy();
    ennemiesPool.push(ennemy);
  }
  ennemiesHolder = new EnnemiesHolder();
  //ennemiesHolder.mesh.position.y = -game.seaRadius;
  scene.add(ennemiesHolder.mesh)
}

/*Landscape*/
function createMountainsBack(){
  // Load cloud texture
  var loader = new THREE.TextureLoader();
 loader.load("images/mountain5.png", function(texture) {
   cloudGeo = new THREE.PlaneBufferGeometry(8000,2000);
   cloudMaterial = new THREE.MeshLambertMaterial({
     map: texture,
     transparent: true
   }); 
   
var cloud = new THREE.Mesh(cloudGeo,cloudMaterial);
     cloud.position.set(
       0,
       299,
       -980
     ); 
     scene.add(cloud);
 });
}
//create sun
var sunSphere;
var skySun;

function sun(){
  skySun = new THREE.Sky();
  skySun.scale.setScalar( 450000);
  skySun.material.uniforms.turbidity.value =1;//1
  skySun.material.uniforms.rayleigh.value = 1.511; //menos es mas oscuro 2:noche, 1:tarde
  skySun.material.uniforms.luminance.value = 1.111;//tarde:0.001
  skySun.material.uniforms.mieCoefficient.value = 0.0513//0.1:esfera mas iluminada sol
  skySun.material.uniforms.mieDirectionalG.value = 0.146785;
  scene.add( skySun );
  sunSphere = new THREE.Mesh(
    new THREE.SphereBufferGeometry( 200000, 16, 8 ),
    new THREE.MeshBasicMaterial( { color: 0xfffb85 } )
  );
  sunSphere.visible = false;
  scene.add( sunSphere );
  var theta = Math.PI * ( -0.03 );
  var phi = 2 * Math.PI * ( -.25 );
  sunSphere.position.x = 40000 * Math.cos( phi );
  sunSphere.position.y = 805000 * Math.sin( phi ) * Math.sin( theta );//posicion de la esfera
  sunSphere.position.z = 40000* Math.sin( phi ) * Math.cos( theta );
  skySun.material.uniforms.sunPosition.value.copy( sunSphere.position );
}
function createParticles(){
  for (var i=0; i<10; i++){
    var particle = new Particle();
    particlesPool.push(particle);
  }
  particlesHolder = new ParticlesHolder();
  //ennemiesHolder.mesh.position.y = -game.seaRadius;
  scene.add(particlesHolder.mesh)
}
function clearEnnemies(){
  for (var i=0; i<ennemiesInUse.length; i++){
      var ennemy = ennemiesInUse[i];
      ennemiesPool.unshift(ennemiesInUse.splice(i,1)[0]);
      ennemiesHolder.mesh.remove(ennemy.mesh);
      i--;
  }
  }
function loop(){

  newTime = new Date().getTime();
  deltaTime = newTime-oldTime;
  oldTime = newTime;

  if (game.status=="playing"){

    // Add energy coins every 100m;
    /*
    if (Math.floor(game.distance)%game.distanceForCoinsSpawn == 0 && Math.floor(game.distance) > game.coinLastSpawn){
      game.coinLastSpawn = Math.floor(game.distance);
      coinsHolder.spawnCoins();
    }
    */

    if (Math.floor(game.distance)%game.distanceForSpeedUpdate == 0 && Math.floor(game.distance) > game.speedLastUpdate){
      game.speedLastUpdate = Math.floor(game.distance);
      game.targetBaseSpeed += game.incrementSpeedByTime*deltaTime;
    }


    if (Math.floor(game.distance)%game.distanceForEnnemiesSpawn == 0 && Math.floor(game.distance) > game.ennemyLastSpawn){
      game.ennemyLastSpawn = Math.floor(game.distance);
      ennemiesHolder.spawnEnnemies();
    }

    if (Math.floor(game.distance)%game.distanceForLevelUpdate == 0 && Math.floor(game.distance) > game.levelLastUpdate){
      game.levelLastUpdate = Math.floor(game.distance);
      game.level++;
      difficultyLevel.innerHTML = Math.floor(game.level).toString();
      game.targetBaseSpeed = game.initSpeed + game.incrementSpeedByLevel*game.level
    }

    sea.mesh.rotation.z += game.speed*deltaTime;//*game.seaRotationSpeed;
    ennemiesHolder.rotateEnnemies();
    sky.moveClouds();
    sea.moveWaves();
    updatePlane();
    updateDistance();
    
    updateEnergy();

    
  
    //game.baseSpeed += (game.targetBaseSpeed - game.baseSpeed) * deltaTime * 0.02;
    game.baseSpeed = (game.targetBaseSpeed - game.baseSpeed);
    game.speed = game.baseSpeed * game.planeSpeed*1.77;

  }else if(game.status=="gameover"){
    difficultyLevel.innerHTML=1;
    generation++;
		console.log("Generation: "+generation);
		createNextGeneration();
    

  }else if (game.status=="waitingReplay"){

  }
//girar aspas de avion:
for (let j=0; j<aliveBirds.length ; j++){
		let bird = aliveBirds[j];
		bird.propeller.rotation.x +=.2 + game.planeSpeed * deltaTime*.005;
		
	}
  
  sea.mesh.rotation.z += game.speed*deltaTime;//*game.seaRotationSpeed;

  if ( sea.mesh.rotation.z > 2*Math.PI)  sea.mesh.rotation.z -= 2*Math.PI;

 // ambientLight.intensity += (.5 - ambientLight.intensity)*deltaTime*0.005;

  
 

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function updateDistance(){
  game.distance += game.speed*deltaTime*game.ratioSpeedDistance;
  fieldDistance.innerHTML = Math.floor(game.distance);
  for (let j=0; j<aliveBirds.length ; j++){
		let bird = aliveBirds[j];
    bird.score=Math.floor(game.distance);
  }
  var d = 502*(1-(game.distance%game.distanceForLevelUpdate)/game.distanceForLevelUpdate);
  levelCircle.setAttribute("stroke-dashoffset", d);

}

var blinkEnergy=false;

function updateEnergy(){
  
  if (aliveBirds.length<=0){
    game.status = "gameover";
  }
}

function addEnergy(){
  game.energy += game.coinValue;
  game.energy = Math.min(game.energy, 100);
}

function removeEnergy(){
  game.energy -= game.ennemyValue;
  game.energy = Math.max(0, game.energy);
}



function updatePlane(){
  game.planeSpeed = normalize(mousePos.x,-.5,.5,game.planeMinSpeed, game.planeMaxSpeed);
  game.planeCollisionDisplacementX += game.planeCollisionSpeedX;
  game.planeCollisionDisplacementY += game.planeCollisionSpeedY;
  for (let j = aliveBirds.length - 1; j >= 0; j--) {
		let bird = aliveBirds[j];
    
    targetY = normalize((game.planeDefaultHeight*(j/20)),-200,200,game.planeDefaultHeight-game.planeAmpHeight, game.planeDefaultHeight+game.planeAmpHeight);//baja un poco
    
    targetY=bird.chooseAction(ennemiesInUse,targetY);
    bird.mesh.position.y += (targetY-bird.mesh.position.y)*deltaTime*game.planeMoveSensivity;
    bird.mesh.rotation.z = (targetY-bird.mesh.position.y)*deltaTime*game.planeRotXSensivity;
    bird.mesh.rotation.x = (bird.mesh.position.y-targetY)*deltaTime*game.planeRotZSensivity;
    bird.pilot.updateHairs();
  }
  
  camera.fov = normalize(mousePos.x,-1,1,45, 65);
  camera.updateProjectionMatrix ()
    camera.position.y=game.planeDefaultHeight;
   
  
 
  game.planeCollisionSpeedX += (0-game.planeCollisionSpeedX)*deltaTime * 0.03;
  game.planeCollisionDisplacementX += (0-game.planeCollisionDisplacementX)*deltaTime *0.01;
  game.planeCollisionSpeedY += (0-game.planeCollisionSpeedY)*deltaTime * 0.03;
  game.planeCollisionDisplacementY += (0-game.planeCollisionDisplacementY)*deltaTime *0.01;

  
}

function randomNumber(min, max){
  const r = Math.random()*(max-min) + min
  return Math.floor(r)
}
function showReplay(){
  replayMessage.style.display="block";
}

function hideReplay(){
  replayMessage.style.display="none";
}

function normalize(v,vmin,vmax,tmin, tmax){
  var nv = Math.max(Math.min(v,vmax), vmin);
  var dv = vmax-vmin;
  var pc = (nv-vmin)/dv;
  var dt = tmax-tmin;
  var tv = tmin + (pc*dt);
  return tv;
}
function norm(value, min, max) {
  return (value - min) / (max - min);
}

var fieldDistance, energyBar, replayMessage, fieldLevel, levelCircle;


function init(event){

  // UI
  fieldDistance = document.getElementById("distValue");
  energyBar = document.getElementById("energyBar");
  replayMessage = document.getElementById("replayMessage");
  fieldLevel = document.getElementById("levelValue");
  difficultyLevel = document.getElementById("difficultyLevel");
  levelCircle = document.getElementById("levelCircleStroke");
  resetGame();
  createScene();
  createLights();
  sun();
  //createMountainsBack();
  
  //Save data 


  createPlane();
  createSea();
  createSky();
 // createCoins();
  createEnnemies();
  createParticles();
  
  //event listener
  /*
  document.addEventListener('mousemove', handleMouseMove, false);
  document.addEventListener('touchmove', handleTouchMove, false);
  document.addEventListener('mouseup', handleMouseUp, false);
  document.addEventListener('touchend', handleTouchEnd, false);
*/
//document.addEventListener('keyup', keyPressed,false);

  loop();
}



 

//window.addEventListener('load', init, false);


//save data:
function keyPressed(){
	if(key==='S'){
	  var birdToSave=alivebirds[0];
	  var json=birdToSave.brain.serialize();
	  saveJson(json,'plane.json');
	  console.log(json);
	  
	}
  } 

  //end save
