// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Core boilerplate code deps
import { createCamera, createComposer, createRenderer, runApp } from "./core-utils"

// Other deps
import Tile from './assets/checker_tile.png'
import Wood from './assets/wood_floor.jpeg'
import Grass from './assets/grass.jpeg'
import {renderRecent, renderSpecific, getConfigJSON, toggleMapVisibility, toggleMapOutlineVisibility} from './processRender'
import * as Request from './request'

global.THREE = THREE

// Request the list of processed maps
var processedFilesList;

// HTML elements
var mapNameElement;
var mapSizeElement;
var distanceElement;
var elevationElement;

// 3d model meshs
var tvMesh;
var warehouseMesh;
var axesHelper;


async function initGUI() {  // initialize GUI
  processedFilesList = await Request.getFilesProcessedList();

  const params = {
    enableMarkerMeasurements: false,
    renderOrigin: false,
    renderFloor: true,
    renderTv: false,
    renderWarehouse: false,
    renderMap: true,
    render2d: true,
  }

  // GUI controls
  const gui = new dat.GUI()

  axesHelper = new THREE.AxesHelper( 20 );  //for showing origin point
  axesHelper.visible = false;
  scene.add( axesHelper );
  

  gui.add(params, "enableMarkerMeasurements").name('Measure').onChange((val) => {
    enableMarkerMeasurements = val ? true : false
  });

  let toggleVisbilityFolder = gui.addFolder(`Visible`);

  toggleVisbilityFolder.add(params, "renderMap").name('Map Mesh').onChange((val) => {
    toggleMapVisibility(val);
  });

  toggleVisbilityFolder.add(params, "render2d").name('Map Border').onChange((val) => {
    toggleMapOutlineVisibility(val);
  });

  toggleVisbilityFolder.add(params, "renderOrigin").name('Map Origin').onChange((val) => {
    axesHelper.visible = val ? true : false
  });

  toggleVisbilityFolder.add(params, "renderFloor").name('Render Floor').onChange((val) => {
    mshStdFloor.visible = val ? true : false
  });
  toggleVisbilityFolder.add(params, "renderTv").name('TV').onChange((val) => {
    tvMesh.visible = val ? true : false
  });
  toggleVisbilityFolder.add(params, "renderWarehouse").name('Warehouse').onChange((val) => {
    warehouseMesh.visible = val ? true : false
  });
  

  let mapFolder = gui.addFolder(`Map`);


  for (let index = 0; index < processedFilesList.length; index++) {
    const file = processedFilesList[index];

     params[file] = function() {
      //remove distance marker points from the scene
      markerPoints.forEach((point) => {
        point.geometry.dispose();
        point.material.dispose();
        scene.remove(point);
      });
      markerPoints = [];
      console.log(file);
      if(file == '2023_04_11-15_54_11_PM'){
        renderSpecific(file, true);
      }else{
        renderSpecific(file, false);
      }
    };

    mapFolder.add(params, file);
  }
}

// Global variables for use within the three.js scene
var renderFloor = true;
const pointer = new THREE.Vector2();
let raycaster;
let globalPoints;
let markerPoints = [];
let enableMarkerMeasurements = false;
var mshStdFloor;
let convMesh;
let yOffset1d;
let originPoint;


/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene()
global.scene = scene;

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  // e.g. uncomment below if you want the output to be in sRGB color space
  _renderer.outputEncoding = THREE.sRGBEncoding
})

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(45, 1, 1000, { x: 0, y: 5, z: -15 })


/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls for drag to move camera
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true;

    // ambient light
    scene.add( new THREE.AmbientLight( 0x222222 ) );
    // point lights
    const pointLight1 = new THREE.PointLight( 0xffffff, 1 );
    pointLight1.position.set(15,10,5)
    const pointLight2 = new THREE.PointLight( 0xffffff, 1 );
    pointLight2.position.set(-30,15,15)
    scene.add( pointLight1 );
    scene.add( pointLight2 );

    // Create the floor
    const geoFloor = new THREE.BoxGeometry(200, 0.1, 200)
    const matStdFloor = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.5, metalness: 0 })
    mshStdFloor = new THREE.Mesh(geoFloor, matStdFloor)
    // need await to make sure animation starts only after texture is loaded
    // this works because the animation code is 'then-chained' after initScene(), see core-utils.runApp
    await this.loadTexture(mshStdFloor)
    scene.add(mshStdFloor)


    // Stats - show fps
    this.stats1 = new Stats()
    this.stats1.showPanel(0) // Panel 0 = fps
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement)

    let maxMinYValues = await renderRecent(true); //lowGroundLevel, highGroundLevel, lowClearance, highClearance 
    var origin = getConfigJSON().origin;
    this.controls.target.set(0,0,0);  //set camera target to origin of map

    raycaster = new THREE.Raycaster();
		raycaster.params.Points.threshold = 0.1;

    //Event Listeners
    window.addEventListener( 'resize', onWindowResize );
    document.addEventListener( 'pointermove', onPointerMove );
    document.addEventListener( 'click', onLeftClick );
    document.addEventListener( 'contextmenu', onRightClick );
    document.addEventListener( 'keydown', onKeyPress );

    // HTML elements overlay
    elevationElement = document.createElement('div');
    elevationElement.style.position = 'absolute';
    elevationElement.style.top = '10px';
    elevationElement.style.left = '100px';
    elevationElement.style.color = 'white';
    elevationElement.style.font = 'normal 18px Arial';
    elevationElement.id = 'valueId';
    elevationElement.innerText = 'Elevation:';
    document.body.appendChild(elevationElement);

    distanceElement = document.createElement('div');
    distanceElement.style.position = 'absolute';
    distanceElement.style.top = '35px';
    distanceElement.style.left = '100px';
    distanceElement.style.color = 'white';
    distanceElement.style.font = 'normal 18px Arial';
    distanceElement.innerText = 'Distance:';
    distanceElement.id = 'distanceId';
    document.body.appendChild(distanceElement);

    mapNameElement = document.createElement('div');
    mapNameElement.style.position = 'absolute';
    mapNameElement.style.top = '10px';
    mapNameElement.style.left = '280px';
    mapNameElement.style.color = 'white';
    mapNameElement.style.font = 'normal 18px Arial';
    mapNameElement.innerText = 'Map Info: ' + getConfigJSON().image.slice(35, -4);
    mapNameElement.id = 'mapNameId';
    document.body.appendChild(mapNameElement);

    mapSizeElement = document.createElement('div');
    mapSizeElement.style.position = 'absolute';
    mapSizeElement.style.top = '35px';
    mapSizeElement.style.left = '280px';
    mapSizeElement.style.color = 'white';
    mapSizeElement.style.font = 'normal 18px Arial';
    mapSizeElement.innerText = 'Min/Max Clearance: ' + (maxMinYValues[2] - maxMinYValues[0]).toFixed(2) + 'm , ' + (maxMinYValues[3] - maxMinYValues[0]).toFixed(2) + 'm';
    mapSizeElement.id = 'mapSizeId';
    document.body.appendChild(mapSizeElement);
  },


  // load a texture for the floor
  // returns a promise so the caller can await on this function
  loadTexture(mshStdFloor) {
    return new Promise((resolve, reject) => {
      var loader = new THREE.TextureLoader()
      loader.load(Wood, function (texture) {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(40, 40)
        mshStdFloor.material.map = texture
        resolve()
      }, undefined, function (error) {
        console.log(error)
        reject(error)
      })
    })
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update()
    this.stats1.update()
    raycaster.setFromCamera( pointer, camera );
  }
}

function onKeyPress( event ) {
  if(event.key == "e"){
    let pointPos = raycaster.intersectObjects( scene.children, false )[0].point;
    console.log("Elevation: " + pointPos.y);
  }
}

function onLeftClick( event ){ //add marker point
  if(!enableMarkerMeasurements) return;
  console.log("left click");

  pointPos = raycaster.intersectObjects( scene.children, false )[0].point;
  dotMaterial = new THREE.PointsMaterial({ size: 0.2, color: 0xFFFF00 }); // marker point
  const dotGeometry = new THREE.BufferGeometry();

  dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([ pointPos.x, pointPos.y, pointPos.z ]), 3)); //2, 0
  const markerPoint = new THREE.Points(dotGeometry, dotMaterial);

  if(markerPoints.length == 0){
    markerPoint.name = "markerPoint0";
    scene.add(markerPoint);
    markerPoints.push(markerPoint);
  }
  else if(markerPoints.length == 2){
    scene.remove(markerPoints[0]);
    markerPoints.shift();
    markerPoints[0].name = "markerPoint0";
    markerPoint.name = "markerPoint1";
    scene.add(markerPoint);
    markerPoints.push(markerPoint);
  }
  else{
    markerPoint.name = "markerPoint1";
    scene.add(markerPoint);
    markerPoints.push(markerPoint);
  }
  console.log(markerPoints);

  calcMarkerDist();

}

function calcMarkerDist(){  //calculate distance between marker points
  if(markerPoints.length == 2){
    let vec0 = new THREE.Vector3(markerPoints[0].geometry.attributes.position.array[0], markerPoints[0].geometry.attributes.position.array[1], markerPoints[0].geometry.attributes.position.array[2]);
    let vec1 = new THREE.Vector3(markerPoints[1].geometry.attributes.position.array[0], markerPoints[1].geometry.attributes.position.array[1], markerPoints[1].geometry.attributes.position.array[2]);
    let dist = vec0.distanceTo(vec1);
    console.log("DIST: " + dist);
    document.getElementById("distanceId").innerHTML = "Distance: " + dist.toFixed(2) + "m";
  }
}

function onRightClick( event ){ //delete marker point
  if(!enableMarkerMeasurements) return;
  console.log("right click");
  let intersects = raycaster.intersectObjects( scene.children, false );
  console.log(intersects);
  for(let i = 0; i < intersects.length; i++){
    // if(intersects[i].object == convMesh){
    //   console.log("hit");
    //   console.log(intersects[i].point);
    // }
    if(intersects[i].object.name == "markerPoint"){
      console.log("hit");
      console.log(intersects[i].object);
      scene.remove(intersects[i].object);
    }
  }
}

function onPointerMove( event ) { //get elevation of point at mouse pointer

  pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  updateElevation();

}

function updateElevation(){
  let intersectedObjects = raycaster.intersectObjects( scene.children, false );
  if(intersectedObjects == 0) return;

  let pointPos = intersectedObjects[0].point;
  // console.log("Elevation: " + pointPos.y);
  document.getElementById("valueId").innerHTML = "Elevation: " + pointPos.y.toFixed(2) + "m";
}


function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

export function updateElements(existingMapName, newMapName, maxMinYValues) {
  console.log("updateElements");

  mapNameElement.innerText = 'Map Name: ' + newMapName;
  elevationElement.innerText = 'Elevation:';
  distanceElement.innerText = 'Distance:';
  mapSizeElement.innerText = 'Min/Max Clearance: ' + (maxMinYValues[2] - maxMinYValues[0]).toFixed(2) + 'm , ' + (maxMinYValues[3] - maxMinYValues[0]).toFixed(2) + 'm';
}

function loadAddGLBModels(){  //load and add .glb models to scene but set them to invisible
  // Instantiate a loader
  const loader = new GLTFLoader();
  const tvUrl = new URL('./glbModels/TELEVISION.glb', import.meta.url);
  const warehouseUrl = new URL('./glbModels/abandoned_warehouse_interior.glb', import.meta.url);


  loader.load(tvUrl+"/", function(gltf) {
      console.log(gltf);
      tvMesh = gltf.scene;
      tvMesh.position.set(0, 1, 0);
      tvMesh.scale.set(1.5, 1.5, 1.5);
      tvMesh.visible = false;

      scene.add(tvMesh);
  }, function(xhr) {
      // console.log(xhr.loaded/xhr.total * 100);
  },function(error) {
      console.log(error);
  });

  loader.load(warehouseUrl+"/", function(gltf) {
    warehouseMesh = gltf.scene;
    warehouseMesh.position.set(0, 2.9, 0);
    warehouseMesh.visible = false;

    scene.add(warehouseMesh);
  }, function(xhr) {
    // console.log(xhr.loaded/xhr.total * 100);
  },function(error) {
    console.log(error);
  });
}

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
initGUI();
loadAddGLBModels();
runApp(app, scene, renderer, camera, true, undefined);

