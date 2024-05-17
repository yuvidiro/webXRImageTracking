import './style.css'
import * as THREE from 'three';
import {ARButton} from 'three/addons/webxr/ARButton.js';

let scene, camera, renderer;

let mainMesh;

init()

async function init() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.z =5;
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setAnimationLoop(render)
  renderer.xr.enabled = true;

  const canvas = document.querySelector("#mainScene");
  canvas.appendChild(renderer.domElement)

  const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  ambient.position.set(0.5,1,0.25);
  scene.add(ambient);

  const imgMarker = document.getElementById('imgMarker');
  const imgMarkerBitmap = await createImageBitmap(imgMarker);
  console.log(imgMarker);

  const button = ARButton.createButton(renderer,{
    requiredFeatures: ["image-tracking"],
    trackedImages:[
      {
        image:imgMarkerBitmap,
        widthInMeters:0.2,
      }
    ],

    optionalFeatures:["dom-overlay"],
    domOverlay:{
      root: document.body,
    },
  });
  document.body.appendChild(button);

  const boxGeometry = new THREE.BoxGeometry(0.2,0.2,0.2);
  boxGeometry.translate(0,0.1,0);
  const boxMaterial = new THREE.MeshNormalMaterial({
    transparent:true,
    opacity:0.5,
    side:THREE.DoubleSide,
  })

  mainMesh = new THREE.Mesh(boxGeometry, boxMaterial);
  mainMesh.matrixAutoUpdate = false;
  mainMesh.visible = false;
  console.log(mainMesh)
  scene.add(mainMesh);
}

function render(timestamp, frame){
  if(frame){
    const results = frame.getImageTrackingResults();
    console.log(results);

    for(const result of results){
      const imageIndex = result.index;
      const referenceSpace = renderer.xr.getReferenceSpace();
      const pose = frame.getPose(result.imageSpace,referenceSpace);

      const state = result.trackingState;
      console.log(state);
      if(state == "tracked"){
        console.log("ImageIndex: ", imageIndex)
        mainMesh.visible = true;
        mainMesh.matrix.fromArray(pose.transform.matrix)
      }
    }
  }
  renderer.render(scene, camera);
}

window.addEventListener('resize', () =>
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
})