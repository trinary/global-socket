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

// connect to our socket server
var socket = io.connect('http://127.0.0.1:7008/');

var width = window.innerWidth,
    height = window.innerHeight;

var markers = [];

var duration = 90000;
var automove = 3000;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
var origin = new THREE.Vector3(0, 0, 0);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
var geometry = new THREE.SphereGeometry(10, 64, 64);
var material = new THREE.MeshPhongMaterial({ map: THREE.ImageUtils.loadTexture('/img/2_no_clouds_8k.jpg')});

var light = new THREE.DirectionalLight(0xffffff);
light.position.set(0, 15, 15).normalize();

var light2 = new THREE.DirectionalLight(0xffffff);
light2.position.set(0, -15, -15).normalize();

scene.add(light);
scene.add(light2);

var globe = new THREE.Mesh(geometry, material);
var lastmoved = new Date();
var lastframe = new Date();
scene.add(globe);

camera.position.z = 20;

var controls = new THREE.OrbitControls(camera);
controls.damping = 0.2;
controls.addEventListener('change', controlledMove);


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

  if (now - lastmoved > automove) {
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
    markers.push({mesh: marker, start: new Date(), removeable: false});
    scene.add(marker);
  }
}

function controlledMove() {
//  lastmoved = new Date();
//  render();
}

render();

document.body.appendChild(renderer.domElement);

socket.on('tweet', addTweet);
