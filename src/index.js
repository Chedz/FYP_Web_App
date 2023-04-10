// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass"

// Core boilerplate code deps
import { createCamera, createComposer, createRenderer, runApp } from "./core-utils"

// Other deps
import Tile from './assets/checker_tile.png'
import Wood from './assets/wood_floor.jpeg'
import Grass from './assets/grass.jpeg'
import {renderRecent, renderSpecific, getConfigJSON} from './processRender'
import * as Request from './request'

global.THREE = THREE

// Request the list of processed maps
var processedFilesList;

// HTML elements
var mapNameElement;
var mapSizeElement;
var distanceElement;
var elevationElement;



async function initGUI() {
  processedFilesList = await Request.getFilesProcessedList();
  // console.log(processedFilesList);

  const params = {
    // general scene params
    // speed: 1,
    enableMarkerMeasurements: false,
    renderOrigin: false,
    // renderEmpty: true,
    renderFloor: true,
  }

  // GUI controls
  const gui = new dat.GUI()
  // gui.width = 300;

  // gui.add(params, "speed", 1, 10, 0.5)
  // gui.add(params, "lightOneSwitch").name('Red light').onChange((val) => {
  //   rectLight1.intensity = val ? 5 : 0
  // })
  // gui.add(params, "lightTwoSwitch").name('Green light').onChange((val) => {
  //   rectLight2.intensity = val ? 5 : 0
  // })
  // gui.add(params, "lightThreeSwitch").name('Blue light').onChange((val) => {
  //   rectLight3.intensity = val ? 5 : 0
  // })

  dotMaterial = new THREE.PointsMaterial({ size: 0.5, color: 0xFFFF00 }); //border
  const dotGeometry = new THREE.BufferGeometry();
  dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0.15, 0]), 3));
  originPoint = new THREE.Points(dotGeometry, dotMaterial);
  originPoint.visible = false;
  scene.add(originPoint);

  gui.add(params, "enableMarkerMeasurements").name('Measure').onChange((val) => {
    enableMarkerMeasurements = val ? true : false
  });
  gui.add(params, "renderOrigin").name('Show Origin').onChange((val) => {
    originPoint.visible = val ? true : false
  });
  // gui.add(params, "renderEmpty").name('Render Empty').onChange((val) => {
  //   renderEmpty = val ? true : false
  // });
  gui.add(params, "renderFloor").name('Render Floor').onChange((val) => {
    mshStdFloor.visible = val ? true : false
  });
  

  let mapFolder = gui.addFolder(`Map`)
  // processedFilesList.forEach((file) => {
  //   params[file] = false;
  //   params[processedFilesList[processedFilesList.length]] = true;
  //   mapFolder.add(params, file).name(file).onChange((val) => {
  //     if (val) {
  //       // renderAll(file);
  //       console.log(file);
  //     }
  //   });
  // });

  for (let index = 0; index < processedFilesList.length; index++) {
    const file = processedFilesList[index];

    // if(index == processedFilesList.length - 1) params[file] = true;
    // else params[file] = false;

    // if(index == processedFilesList.length - 1)
     params[file] = function() {
      //remove distance marker points from the scene
      markerPoints.forEach((point) => {
        point.geometry.dispose();
        point.material.dispose();
        scene.remove(point);
      });
      markerPoints = [];
      renderSpecific(file);
    };
    // else params[file] = false;

    // params[file] = false;
    // params[processedFilesList[processedFilesList.length]] = true;
    mapFolder.add(params, file);

    // console.log(mapFolder);
    // console.log(params);
    
  }
}


// /**************************************************
//  * 0. Tweakable parameters for the scene
//  *************************************************/
// const params = {
//   // general scene params
//   // speed: 1,
//   enableMarkerMeasurements: false,
//   renderOrigin: false,
//   // renderEmpty: true,
//   renderFloor: true,
//   // Bokeh pass properties
//   focus: 0.0,
//   aperture: 0,
//   maxblur: 0.0
// }


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

// // (Optional) Create the EffectComposer and passes for post-processing
// // If you don't need post-processing, just comment/delete the following creation code, and skip passing any composer to 'runApp' at the bottom
// let bokehPass = new BokehPass(scene, camera, {
//   focus: 0.0,
//   aperture: 0.0,
//   maxblur: 0.0
// })
// The RenderPass is already created in 'createComposer'
// let composer = createComposer(renderer, scene, camera, (comp) => {
//   comp.addPass(bokehPass)
// })

/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // processedFilesList = await Request.getFilesProcessedList();
    // console.log(processedFilesList);
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true;

    // ambient light
    scene.add( new THREE.AmbientLight( 0x222222 ) );
    // point light
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
    console.log(mshStdFloor)
    scene.add(mshStdFloor)

    // Create the torus knot
    const geoKnot = new THREE.TorusKnotGeometry(1.5, 0.5, 200, 16)
    const matKnot = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 0 })
    // save mesh to 'this' so that we can access it in the 'updateScene' function
    this.meshKnot = new THREE.Mesh(geoKnot, matKnot)
    this.meshKnot.position.set(0, 5, 0)
    // update orbit controls to target meshKnot at center
    this.controls.target.copy(this.meshKnot.position)
    //scene.add(this.meshKnot)

    // // GUI controls
    // const gui = new dat.GUI()

    // // gui.add(params, "speed", 1, 10, 0.5)
    // // gui.add(params, "lightOneSwitch").name('Red light').onChange((val) => {
    // //   rectLight1.intensity = val ? 5 : 0
    // // })
    // // gui.add(params, "lightTwoSwitch").name('Green light').onChange((val) => {
    // //   rectLight2.intensity = val ? 5 : 0
    // // })
    // // gui.add(params, "lightThreeSwitch").name('Blue light').onChange((val) => {
    // //   rectLight3.intensity = val ? 5 : 0
    // // })

    // dotMaterial = new THREE.PointsMaterial({ size: 0.5, color: 0xFFFF00 }); //border
    // const dotGeometry = new THREE.BufferGeometry();
    // dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0.15, 0]), 3));
    // originPoint = new THREE.Points(dotGeometry, dotMaterial);
    // originPoint.visible = false;
    // scene.add(originPoint);

    // gui.add(params, "enableMarkerMeasurements").name('Measure').onChange((val) => {
    //   enableMarkerMeasurements = val ? true : false
    // });
    // gui.add(params, "renderOrigin").name('Show Origin').onChange((val) => {
    //   originPoint.visible = val ? true : false
    // });
    // // gui.add(params, "renderEmpty").name('Render Empty').onChange((val) => {
    // //   renderEmpty = val ? true : false
    // // });
    // gui.add(params, "renderFloor").name('Render Floor').onChange((val) => {
    //   mshStdFloor.visible = val ? true : false
    // });
    

    // const mapChanger = () => {
    //   bokehPass.uniforms['focus'].value = params.focus
    //   bokehPass.uniforms['aperture'].value = params.aperture * 0.00001
    //   bokehPass.uniforms['maxblur'].value = params.maxblur
    // }

    // let bokehFolder = gui.addFolder(`Bokeh Pass`)
    // bokehFolder.add(params, 'focus', 0.0, 3000.0, 10).onChange(mapChanger)
    // bokehFolder.add(params, 'aperture', 0, 10, 0.1).onChange(mapChanger)
    // bokehFolder.add(params, 'maxblur', 0.0, 0.01, 0.001).onChange(mapChanger)

    // Stats - show fps
    this.stats1 = new Stats()
    this.stats1.showPanel(0) // Panel 0 = fps
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement)

    let maxMinYValues = await renderRecent(); //lowGroundLevel, highGroundLevel, lowClearance, highClearance 
    var origin = getConfigJSON().origin;
    // console.log(getConfigJSON);
    //this.controls.target.set(-origin[0], 0, -origin[1]);
    this.controls.target.set(0,0,0);

    // dotMaterial = new THREE.PointsMaterial({ size: 0.5, color: 0xFFFF00 }); //border
    // const dotGeometry = new THREE.BufferGeometry();
    // dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0.5, 0]), 3));
    // const dot = new THREE.Points(dotGeometry, dotMaterial);
    // scene.add(dot);

    // -4.419973, -7.269125,  //The 2-D pose of the lower-left pixel in the map -> origin


    //15.4, 5.300000000000001 origin pixel in pgm value


    //-10.572565078735352, 0.05000000074505806 , 8.053475379943848 //where orgin should be in 3d space


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
    //lowGroundLevel, highGroundLevel, lowClearance, highClearance 
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

function calcMarkerDist(){
  if(markerPoints.length == 2){
    // console.log(markerPoints[0].geometry.attributes.position.array);
    // console.log(markerPoints[1].geometry.attributes.position.array);
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

function onPointerMove( event ) {

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

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
initGUI();
runApp(app, scene, renderer, camera, true, undefined);

