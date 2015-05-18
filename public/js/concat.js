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

var rotation = [0, -Math.PI / 2];
var markers = [];

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

var duration = 90000;

var origin = new THREE.Vector3(0,0,0);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
var geometry = new THREE.SphereGeometry(10, 64, 64);
var material = new THREE.MeshPhongMaterial({ map: THREE.ImageUtils.loadTexture('/img/2_no_clouds_8k.jpg')});

var light = new THREE.DirectionalLight(0xffffff);

light.position.set(0, 15, 15).normalize();
scene.add(light);

var globe = new THREE.Mesh(geometry, material);
scene.add(globe);

camera.position.z = 20;

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
    var marker = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1), new THREE.MeshBasicMaterial({transparent: true, color: color }));
    if (geo.type === 'Point') {
      pos = geo.coordinates;
    } else if (geo.type === 'Polygon') {
      pos = [
        (geo.coordinates[0][0][1] + geo.coordinates[0][1][1] + geo.coordinates[0][2][1] + geo.coordinates[0][3][1]) / 4,
        (geo.coordinates[0][0][0] + geo.coordinates[0][1][0] + geo.coordinates[0][2][0] + geo.coordinates[0][3][0]) / 4
      ];
    }
    var coords = latLongToVector3(pos[0], pos[1], 10);
    console.log(pos, coords);
    marker.position.fromArray(coords);
    marker.lookAt(origin);
    markers.push({mesh: marker, start: new Date()});
    scene.add(marker);
  }
}


var render = function () {
  requestAnimationFrame(render);
  var timer = Date.now() * 0.0001;
  var camerapos = [(Math.cos(timer) * 20), Math.sin(timer * 2) * 12, (Math.sin(timer) * 20)];

  markers.forEach(function(m) {
    var age = new Date() - m.start;
    var ratio = (duration - age) / duration;
    m.mesh.material.opacity = ratio;
    if (m.mesh.material.opacity < 0) {
      scene.remove(m.mesh);
      m = undefined;
    }
  });

  markers = markers.filter(function(m) { return m !== undefined;});

  camera.position.fromArray(camerapos);
  light.position.fromArray(camerapos);
  camera.lookAt(origin);

  renderer.render(scene, camera);
};
render();

document.body.appendChild(renderer.domElement);

socket.on('tweet', addTweet);
