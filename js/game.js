//tf.setBackend("cpu");
// Birds currently alived
let aliveBirds = [];
// all the birds of the current generation
let allBirds = [];
// Array which holds all the pipes on the screen
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