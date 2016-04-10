/*************************************
//
// global-socket app
//
**************************************/
/* global io: false */
/* global window: false */
/* global document: false */
/* global requestAnimationFrame: false */
/* global THREE: false */
/* jshint -W015 */
/* jshint camelcase: false */
'use strict';

function latLongToVector3(lat, lon, radius) {
  var phi = (lat) * Math.PI / 180;
  var theta = ((lon - 180) * Math.PI / 180);

  var x = -(radius) * Math.cos(phi) * Math.cos(theta);
  var y = (radius) * Math.sin(phi);
  var z = (radius) * Math.cos(phi) * Math.sin(theta);

  return [x, y, z];
}

function d2rad(deg) {
  return deg * Math.PI / 180;
}

function lensFlareUpdateCallback( object ) {
  var f, fl = object.lensFlares.length;
  var flare;
  var vecX = -object.positionScreen.x * 2;
  var vecY = -object.positionScreen.y * 2;

  for( f = 0; f < fl; f++ ) {
    flare = object.lensFlares[ f ];

    flare.x = object.positionScreen.x + vecX * flare.distance;
    flare.y = object.positionScreen.y + vecY * flare.distance;

    flare.rotation = 0;
  }

  object.lensFlares[ 2 ].y += 0.025;
  object.lensFlares[ 3 ].rotation = object.positionScreen.x * 0.5 + THREE.Math.degToRad( 45 );
}

// connect to our socket server
var socket = io.connect('http://127.0.0.1:7008/');

var width = window.innerWidth,
    height = window.innerHeight;

var markers = [];

var duration = 90000;
var autoMove = true;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
var origin = new THREE.Vector3(0, 0, 0);
var globeGroup = new THREE.Group();
var renderer = new THREE.WebGLRenderer(width, height, { format: THREE.RGBAFormat } );
var textureLoader = new THREE.TextureLoader();
renderer.setSize(width, height);

var dirLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
dirLight.position.set( 0, 0, -1 ).normalize();
dirLight.lookAt(origin);
scene.add( dirLight );

// lens flares

var textureFlare0 = textureLoader.load('img/lensflare0.png');
var textureFlare2 = textureLoader.load('img/lensflare2.png');
var textureFlare3 = textureLoader.load('img/lensflare3.png');

//addLight( 0.995, 0.5, 0.9, 5000, 5000, -1000 );

function addLight( h, s, l, x, y, z ) {
  var light = new THREE.PointLight( 0xffffff, 1.5, 2000 );
  light.color.setHSL( h, s, l );
  light.position.set( x, y, z );
  scene.add( light );

  var flareColor = new THREE.Color( 0xffffff );
  flareColor.setHSL( h, s, l + 0.5 );

  var lensFlare = new THREE.LensFlare( textureFlare0, 700, 0.0, THREE.AdditiveBlending, flareColor );

  lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
  lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
  lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );

  lensFlare.add( textureFlare3, 60, 0.6, THREE.AdditiveBlending );
  lensFlare.add( textureFlare3, 70, 0.7, THREE.AdditiveBlending );
  lensFlare.add( textureFlare3, 120, 0.9, THREE.AdditiveBlending );
  lensFlare.add( textureFlare3, 70, 1.0, THREE.AdditiveBlending );

  lensFlare.customUpdateCallback = lensFlareUpdateCallback;
  lensFlare.position.copy( light.position );

  scene.add( lensFlare );
}

textureLoader.load(
  'img/2_no_clouds_8k.jpg',
  function(surfaceTex) {
    var material = new THREE.MeshPhongMaterial();
    material.map = surfaceTex;
    globeGroup.rotateY(d2rad(-23.4)); // Earth doesn't point straight "up". Need to account for this on markers.
    var geometry = new THREE.SphereGeometry(10, 64, 64);
    var globe = new THREE.Mesh(geometry, material);
    globe = new THREE.Mesh(geometry, material);
    globeGroup.add(globe);
    scene.add(globeGroup);
  }
);

var light = new THREE.DirectionalLight(0xffffff);
light.position.set(0, 15, 15).normalize();
scene.add(light);

var lastframe = new Date();
camera.position.z = -20;

var controls = new THREE.OrbitControls(camera);
controls.damping = 0.2;
controls.enableKeys = false;


var cameraMove = function(camera, delta) {
  var orbitPeriod = 60000;
  var step = delta / orbitPeriod;
  var deg = 2 * Math.PI * step;

  controls.rotateLeft(deg);
  controls.update();
};

var render = function () {
  var now = new Date();
  markers.forEach(function (m) {
    var age = now - m.start;
    var ratio = (duration - age) / duration;
    m.mesh.material.opacity = ratio;
    if (age > duration) {
      scene.remove(m.mesh);
      m.removeable = true;
    }
  });

  markers = markers.filter(function (m) { return !m.removeable; });

  if (autoMove) {
    cameraMove(camera, Date.now() - lastframe);
  }

  renderer.render(scene, camera);
  lastframe = new Date();
  requestAnimationFrame(render);
};

function addTweet(tweet) {
  if (tweet.location && tweet.location.geo) {
    var geo = tweet.geo || tweet.location.geo;
    var pos = [];
    var color;
    if (tweet.inReplyTo) {
      color = 0xC969B6;
    } else {
      color = 0xEDA228;
    }
    var marker = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1 + ((Math.random() - 0.5) * 0.01)), new THREE.MeshBasicMaterial({transparent: true, color: color }));
    if (geo.type === 'Point') {
      pos = geo.coordinates;
    } else if (geo.type === 'Polygon') {
      pos = [
        (geo.coordinates[0][0][1] + geo.coordinates[0][1][1] + geo.coordinates[0][2][1] + geo.coordinates[0][3][1]) / 4,
        (geo.coordinates[0][0][0] + geo.coordinates[0][1][0] + geo.coordinates[0][2][0] + geo.coordinates[0][3][0]) / 4
      ];
    }
    var coords = latLongToVector3(pos[0] + (Math.random() - 0.5) * 0.01, pos[1] + (Math.random() - 0.5) * 0.01, 10);
    marker.position.fromArray(coords);
    marker.lookAt(origin);
    markers.push({tweet: tweet, mesh: marker, start: new Date(), removeable: false});
    globeGroup.add(marker);
  }
}

function handleKeyEvent(event) {
  if (event.code === 'Space') { autoMove = !autoMove; }
}

render();

document.body.appendChild(renderer.domElement);
document.addEventListener('keydown', handleKeyEvent);

socket.on('tweet', addTweet);
