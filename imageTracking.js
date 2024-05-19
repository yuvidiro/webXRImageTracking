import './style.css'
import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

setupMobileDebug()

function setupMobileDebug() {
  const containerEl = document.getElementById("console-ui");
  eruda.init({
    container: containerEl
  });
  const devToolEl = containerEl.shadowRoot.querySelector('.eruda-dev-tools');
  devToolEl.style.height = '40%'; // control the height of the dev tool panel
}

let camera, canvas, scene, renderer;
let mesh, controller;
let video, videoTexture;
let playButtonMesh, playTexture,pauseTexture, seekBarMesh, seekBarBgMesh;


init();
animate();

async function init() {
  canvas = document.querySelector('canvas.webgl')

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70,
    window.innerWidth / window.innerHeight,
    0.01,
    40
  );

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.xr.enabled = true;

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  video = document.getElementById('video');

  // Create video texture
  videoTexture = new THREE.VideoTexture(video);
  playTexture = new THREE.TextureLoader().load('/play.jpg'); 
  const geometry = new THREE.PlaneGeometry(0.8, 0.5);
  const material = new THREE.MeshBasicMaterial({ map: playTexture , side: THREE.DoubleSide});
  mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.y = Math.PI;
  mesh.matrixAutoUpdate = false; // important we have to set this to false because we'll update the position when we track an image
  mesh.visible = false;
  scene.add(mesh);

  // setup the image target
  const img = document.getElementById('imgMarker');
  const imgBitmap = await createImageBitmap(img);
  // console.log(imgBitmap);

  //more on image-tracking feature: https://github.com/immersive-web/marker-tracking/blob/main/explainer.md
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["image-tracking"], // notice a new required feature
    trackedImages: [
      {
        image: imgBitmap, // tell webxr this is the image target we want to track
        widthInMeters: 0.7 // in meters what the size of the PRINTED image in the real world
      }
    ],
    //this is for the mobile debug
    optionalFeatures: ["dom-overlay", "dom-overlay-for-handheld-ar"],
    domOverlay: {
      root: document.body
    }
  });
  document.body.appendChild(button);

  // Create play and pause button meshes
  createControlButtons();

  // Setup the XR controller
  controller = renderer.xr.getController(0);
  controller.addEventListener('selectstart', onSelectStart);
  scene.add(controller);

  window.addEventListener("resize", onWindowResize, false);
}

function createControlButtons() {
  // Play button
  const playGeometry = new THREE.PlaneGeometry(0.1, 0.1);
  pauseTexture = new THREE.TextureLoader().load('/pause.jpg');
  const playMaterial = new THREE.MeshBasicMaterial({ map: pauseTexture, side: THREE.DoubleSide });
  playButtonMesh = new THREE.Mesh(playGeometry, playMaterial);
  playButtonMesh.position.set(-0.45, -0.35, 0); // Position relative to the video plane
  playButtonMesh.rotation.y =-Math.PI
  playButtonMesh.visible = false;
  scene.add(playButtonMesh);
 // replace with your pause icon path


  // Seek bar background
  const seekBarBgGeometry = new THREE.PlaneGeometry(0.8, 0.05);
  const seekBarBgMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide });
  seekBarBgMesh = new THREE.Mesh(seekBarBgGeometry, seekBarBgMaterial);
  seekBarBgMesh.position.set(0, -0.45, 0); // Position relative to the video plane
  seekBarBgMesh.visible = false;
  scene.add(seekBarBgMesh);

  // Seek bar
  const seekBarGeometry = new THREE.PlaneGeometry(0.8, 0.05);
  seekBarGeometry.translate(-0.4, 0, 0);
  const seekBarMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
  seekBarMesh = new THREE.Mesh(seekBarGeometry, seekBarMaterial);
  seekBarMesh.position.set(-0.4, -0.45, 0.01);
  seekBarMesh.scale.set(0, 1, 1);
  seekBarMesh.visible = false;
  scene.add(seekBarMesh);
}

var firstClick=false;
function onSelectStart(event) {
  const controller = event.target;
  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];
    const object = intersection.object;

    if (object === playButtonMesh) { 
      console.log("Clicked on playButton")
      if(!video.paused){
        video.pause()
        playButtonMesh.material.map = playTexture;
      }else{
        video.play()
        playButtonMesh.material.map = pauseTexture;
      }
     
    } else if (object === mesh) {
      if(!firstClick){
        console.log("Clicking Video")
        mesh.material.map =videoTexture;
        video.play()
        seekBarBgMesh.visible =true;
        seekBarMesh.visible =true;
        playButtonMesh.visible = true;
        firstClick = true;
      }
      // showButtons();
      console.log("Clicked on the mesh")
    } else if (object === seekBarBgMesh) {
      const barPos = (intersection.uv.x - 0.5) * 0.6; // Normalize to seek bar width
      const seekPos = (barPos / 0.6 + 0.5) * video.duration; // Map to video duration
      video.currentTime = seekPos;
    }
  }
}

function getIntersections(controller) {
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);

  const raycaster = new THREE.Raycaster();
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  return raycaster.intersectObjects([mesh, playButtonMesh, seekBarBgMesh]);
}

function updateSeekBar() {
  const progress = video.currentTime / video.duration;
  seekBarMesh.scale.set(progress, 1, 1);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame) {
    const results = frame.getImageTrackingResults(); //checking if there are any images we track
    //if we have more than one image the results are an array 
    for (const result of results) {
      // The result's index is the image's position in the trackedImages array specified at session creation
      const imageIndex = result.index;

      // Get the pose of the image relative to a reference space.
      const referenceSpace = renderer.xr.getReferenceSpace();
      const pose = frame.getPose(result.imageSpace, referenceSpace);
      const state = result.trackingState;

      if (state == "tracked") {
        mesh.visible = true;
        const pos = pose.transform.position;
        mesh.position.set(pos.x, pos.y, pos.z);
        seekBarBgMesh.position.set(pos.x, pos.y -0.4, pos.z);
        seekBarBgMesh.rotation.set(0,-Math.PI, 0)
        seekBarMesh.position.set(pos.x -0.4, pos.y -0.4, pos.z+0.01);
        seekBarMesh.rotation.set(0,-Math.PI, 0);
        playButtonMesh.position.set(pos.x-0.45, pos.y -0.4, pos.z)
        playButtonMesh.rotation.set(0,-Math.PI, 0);
        mesh.rotation.set(0, -Math.PI, 0);
        console.log(mesh.rotation);
        console.log(pos)
        mesh.updateMatrix();
      } else if (state == "emulated") {
        mesh.visible = false;
        // console.log("Image target no longer seen")
      }
    }
  }

  updateSeekBar();
  renderer.render(scene, camera);
}
