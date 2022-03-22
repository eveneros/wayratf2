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

window.addEventListener('load', init, false);

function init() {
  createScene();
  createLights();
  createPlane();
  createSea();
  createSky();

  document.addEventListener('mousemove', handleMouseMove, false);

  loop();
}

var scene,
  camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH,
  renderer, container,
  hemisphereLight, shadowLight;

function createScene() {
  
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;

  scene = new THREE.Scene();

  scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 60;
  nearPlane = 1;
  farPlane = 950;
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane
  );
  camera.position.x = 0;
  camera.position.z = 200;
  camera.position.y = 100;

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });

  renderer.setSize(WIDTH, HEIGHT);

  renderer.shadowMap.enabled = true;

  container = document.getElementById('world');
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', handleWindowResize, false);
}
var mousePos = {
  x: 0,
  y: 0
};

// now handle the mousemove event
function handleMouseMove(event) {

  // here we are converting the mouse position value received 
  // to a normalized value varying between -1 and 1;
  // this is the formula for the horizontal axis:

  var tx = -1 + (event.clientX / WIDTH) * 2;

  // for the vertical axis, we need to inverse the formula 
  // because the 2D y-axis goes the opposite direction of the 3D y-axis

  var ty = 1 - (event.clientY / HEIGHT) * 2;
  mousePos = {
    x: tx,
    y: ty
  };

}

function handleWindowResize() {
  // update height and width of the renderer and the camera
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}

function createLights() {
  // A hemisphere light is a gradient colored light; 
  // the first parameter is the sky color, the second parameter is the ground color, 
  // the third parameter is the intensity of the light
  hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9);

  // an ambient light modifies the global color of a scene and makes the shadows softer
  ambientLight = new THREE.AmbientLight(0xdc8874, .5);
  scene.add(ambientLight);

  // A directional light shines from a specific direction. 
  // It acts like the sun, that means that all the rays produced are parallel. 
  shadowLight = new THREE.DirectionalLight(0xffffff, .9);

  // Set the direction of the light  
  shadowLight.position.set(150, 350, 350);

  // Allow shadow casting 
  shadowLight.castShadow = true;

  // define the visible area of the projected shadow
  shadowLight.shadow.camera.left = -400;
  shadowLight.shadow.camera.right = 400;
  shadowLight.shadow.camera.top = 400;
  shadowLight.shadow.camera.bottom = -400;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 1000;

  // define the resolution of the shadow; the higher the better, 
  // but also the more expensive and less performant
  shadowLight.shadow.mapSize.width = 2048;
  shadowLight.shadow.mapSize.height = 2048;

  // to activate the lights, just add them to the scene
  scene.add(hemisphereLight);
  scene.add(shadowLight);
}

// First let's define a Sea object :
Sea = function() {
  var geom = new THREE.CylinderGeometry(600, 600, 800, 40, 10);
  geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

  // important: by merging vertices we ensure the continuity of the waves
  geom.mergeVertices();

  // get the vertices
  var l = geom.vertices.length;

  // create an array to store new data associated to each vertex
  this.waves = [];

  for (var i = 0; i < l; i++) {
    // get each vertex
    var v = geom.vertices[i];

    // store some data associated to it
    this.waves.push({
      y: v.y,
      x: v.x,
      z: v.z,
      // a random angle
      ang: Math.random() * Math.PI * 2,
      // a random distance
      amp: 5 + Math.random() * 15,
      // a random speed between 0.016 and 0.048 radians / frame
      speed: 0.016 + Math.random() * 0.032
    });
  };
  var mat = new THREE.MeshPhongMaterial({
    color: Colors.brownDark,
    transparent: true,
    opacity: .8,
    shading: THREE.FlatShading,
  });

  this.mesh = new THREE.Mesh(geom, mat);
  this.mesh.receiveShadow = true;

}

// now we create the function that will be called in each frame 
// to update the position of the vertices to simulate the waves

Sea.prototype.moveWaves = function() {

  // get the vertices
  var verts = this.mesh.geometry.vertices;
  var l = verts.length;

  for (var i = 0; i < l; i++) {
    var v = verts[i];

    // get the data associated to it
    var vprops = this.waves[i];

    // update the position of the vertex
    v.x = vprops.x + Math.cos(vprops.ang) * vprops.amp;
    v.y = vprops.y + Math.sin(vprops.ang) * vprops.amp;

    // increment the angle for the next frame
    vprops.ang += vprops.speed;

  }

  // Tell the renderer that the geometry of the sea has changed.
  // In fact, in order to maintain the best level of performance, 
  // three.js caches the geometries and ignores any changes
  // unless we add this line
  this.mesh.geometry.verticesNeedUpdate = true;

  sea.mesh.rotation.z += .005;
}

// Instantiate the sea and add it to the scene:

var sea;

function createSea() {
  sea = new Sea();

  // push it a little bit at the bottom of the scene
  sea.mesh.position.y = -600;

  // add the mesh of the sea to the scene
  scene.add(sea.mesh);
}

Cloud = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "cloud";
  var geom = new THREE.TetrahedronGeometry(8.5,2);
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

// Define a Sky Object
Sky = function() {
  // Create an empty container
  this.mesh = new THREE.Object3D();

  // choose a number of clouds to be scattered in the sky
  this.nClouds = 20;

  // To distribute the clouds consistently,
  // we need to place them according to a uniform angle
  var stepAngle = Math.PI * 2 / this.nClouds;

  // create the clouds
  for (var i = 0; i < this.nClouds; i++) {
    var c = new Cloud();

    // set the rotation and the position of each cloud;
    // for that we use a bit of trigonometry
    var a = stepAngle * i; // this is the final angle of the cloud
    var h = 750 + Math.random() * 200; // this is the distance between the center of the axis and the cloud itself

    // Trigonometry!!! I hope you remember what you've learned in Math :)
    // in case you don't: 
    // we are simply converting polar coordinates (angle, distance) into Cartesian coordinates (x, y)
    c.mesh.position.y = Math.sin(a) * h;
    c.mesh.position.x = Math.cos(a) * h;

    // rotate the cloud according to its position
    c.mesh.rotation.z = a + Math.PI / 2;

    // for a better result, we position the clouds 
    // at random depths inside of the scene
    c.mesh.position.z = -400 - Math.random() * 400;

    // we also set a random scale for each cloud
    var s = 1 + Math.random() * 2;
    c.mesh.scale.set(s, s, s);

    // do not forget to add the mesh of each cloud in the scene
    this.mesh.add(c.mesh);
  }
}

// Now we instantiate the sky and push its center a bit
// towards the bottom of the screen

var sky;

function createSky() {
  sky = new Sky();
  sky.mesh.position.y = -600;
  scene.add(sky.mesh);
}

var AirPlane = function() {

  this.mesh = new THREE.Object3D();

  // Create the cabin
  var geomCockpit = new THREE.BoxGeometry(60, 50, 50, 1, 1, 1);
  var matCockpit = new THREE.MeshPhongMaterial({
    color: Colors.red,
    shading: THREE.FlatShading
  });
  // we can access a specific vertex of a shape through 
  // the vertices array, and then move its x, y and z property:
  geomCockpit.vertices[4].y -= 10;
  geomCockpit.vertices[4].z += 20;
  geomCockpit.vertices[5].y -= 10;
  geomCockpit.vertices[5].z -= 20;
  geomCockpit.vertices[6].y += 30;
  geomCockpit.vertices[6].z += 20;
  geomCockpit.vertices[7].y += 30;
  geomCockpit.vertices[7].z -= 20;

  var cockpit = new THREE.Mesh(geomCockpit, matCockpit);
  cockpit.castShadow = true;
  cockpit.receiveShadow = true;
  this.mesh.add(cockpit);

  // Create the engine
  var geomEngine = new THREE.BoxGeometry(20, 50, 50, 1, 1, 1);
  var matEngine = new THREE.MeshPhongMaterial({
    color: Colors.white,
    shading: THREE.FlatShading
  });
  var engine = new THREE.Mesh(geomEngine, matEngine);
  engine.position.x = 40;
  engine.castShadow = true;
  engine.receiveShadow = true;
  this.mesh.add(engine);

  // Create the tail
  var geomTailPlane = new THREE.BoxGeometry(15, 20, 5, 1, 1, 1);
  var matTailPlane = new THREE.MeshPhongMaterial({
    color: Colors.red,
    shading: THREE.FlatShading
  });
  var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
  tailPlane.position.set(-35, 25, 0);
  tailPlane.castShadow = true;
  tailPlane.receiveShadow = true;
  this.mesh.add(tailPlane);

  // Create the wing
  var geomSideWing = new THREE.BoxGeometry(40, 8, 150, 1, 1, 1);
  var matSideWing = new THREE.MeshPhongMaterial({
    color: Colors.red,
    shading: THREE.FlatShading
  });
  var sideWing = new THREE.Mesh(geomSideWing, matSideWing);
  sideWing.castShadow = true;
  sideWing.receiveShadow = true;
  this.mesh.add(sideWing);

  // propeller
  var geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
  var matPropeller = new THREE.MeshPhongMaterial({
    color: Colors.brown,
    shading: THREE.FlatShading
  });
  this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
  this.propeller.castShadow = true;
  this.propeller.receiveShadow = true;

  // blades
  var geomBlade = new THREE.BoxGeometry(1, 100, 20, 1, 1, 1);
  var matBlade = new THREE.MeshPhongMaterial({
    color: Colors.brownDark,
    shading: THREE.FlatShading
  });

  var blade = new THREE.Mesh(geomBlade, matBlade);
  blade.position.set(8, 0, 0);
  blade.castShadow = true;
  blade.receiveShadow = true;
  this.propeller.add(blade);
  this.propeller.position.set(50, 0, 0);
  this.mesh.add(this.propeller);
};
var airplane;

function createPlane() {
  airplane = new AirPlane();
  airplane.mesh.scale.set(.25, .25, .25);
  airplane.mesh.position.y = 100;
  scene.add(airplane.mesh);
}

function loop() {
  // Rotate the propeller, the sea and the sky
  airplane.propeller.rotation.x += 0.3;
  sea.mesh.rotation.z += .005;
  sky.mesh.rotation.z += .01;

  // update the plane on each frame
  updatePlane();
  sea.moveWaves();

  // render the scene
  renderer.render(scene, camera);

  // call the loop function again
  requestAnimationFrame(loop);
}

function updatePlane() {

  var targetY = normalize(mousePos.y, -.75, .75, 25, 175);
  var targetX = normalize(mousePos.x, -.75, .75, -100, 100);

  // Move the plane at each frame by adding a fraction of the remaining distance
  airplane.mesh.position.y += (targetY - airplane.mesh.position.y) * 0.1;

  // Rotate the plane proportionally to the remaining distance
  airplane.mesh.rotation.z = (targetY - airplane.mesh.position.y) * 0.0128;
  airplane.mesh.rotation.x = (airplane.mesh.position.y - targetY) * 0.0064;

  airplane.propeller.rotation.x += 0.3;
}

function normalize(v, vmin, vmax, tmin, tmax) {
  var nv = Math.max(Math.min(v, vmax), vmin);
  var dv = vmax - vmin;
  var pc = (nv - vmin) / dv;
  var dt = tmax - tmin;
  var tv = tmin + (pc * dt);
  return tv;
}