// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
// import 'three/examples/js/QuickHull';
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry"
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper"
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib"
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass"

// Core boilerplate code deps
import { createCamera, createComposer, createRenderer, runApp } from "./core-utils"

// Other deps
import Tile from './assets/checker_tile.png'

global.THREE = THREE

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
  speed: 1,
  lightOneSwitch: true,
  lightTwoSwitch: true,
  lightThreeSwitch: true,
  // Bokeh pass properties
  focus: 0.0,
  aperture: 0,
  maxblur: 0.0
}


/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene()

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

// (Optional) Create the EffectComposer and passes for post-processing
// If you don't need post-processing, just comment/delete the following creation code, and skip passing any composer to 'runApp' at the bottom
let bokehPass = new BokehPass(scene, camera, {
  focus: 0.0,
  aperture: 0.0,
  maxblur: 0.0
})
// The RenderPass is already created in 'createComposer'
let composer = createComposer(renderer, scene, camera, (comp) => {
  comp.addPass(bokehPass)
})

/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true

    // // Scene setup taken from https://threejs.org/examples/#webgl_lights_rectarealight
    // // Create rect area lights
    // RectAreaLightUniformsLib.init()

    // let rectLight1 = new THREE.RectAreaLight(0xff0000, 5, 4, 10)
    // rectLight1.position.set(- 5, 5, 5)
    // scene.add(rectLight1)

    // let rectLight2 = new THREE.RectAreaLight(0x00ff00, 5, 4, 10)
    // rectLight2.position.set(0, 5, 5)
    // scene.add(rectLight2)

    // let rectLight3 = new THREE.RectAreaLight(0x0000ff, 5, 4, 10)
    // rectLight3.position.set(5, 5, 5)
    // scene.add(rectLight3)

    // scene.add(new RectAreaLightHelper(rectLight1))
    // scene.add(new RectAreaLightHelper(rectLight2))
    // scene.add(new RectAreaLightHelper(rectLight3))

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
    const mshStdFloor = new THREE.Mesh(geoFloor, matStdFloor)
    // need await to make sure animation starts only after texture is loaded
    // this works because the animation code is 'then-chained' after initScene(), see core-utils.runApp
    await this.loadTexture(mshStdFloor)
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

    // GUI controls
    const gui = new dat.GUI()

    gui.add(params, "speed", 1, 10, 0.5)
    gui.add(params, "lightOneSwitch").name('Red light').onChange((val) => {
      rectLight1.intensity = val ? 5 : 0
    })
    gui.add(params, "lightTwoSwitch").name('Green light').onChange((val) => {
      rectLight2.intensity = val ? 5 : 0
    })
    gui.add(params, "lightThreeSwitch").name('Blue light').onChange((val) => {
      rectLight3.intensity = val ? 5 : 0
    })

    const matChanger = () => {
      bokehPass.uniforms['focus'].value = params.focus
      bokehPass.uniforms['aperture'].value = params.aperture * 0.00001
      bokehPass.uniforms['maxblur'].value = params.maxblur
    }

    let bokehFolder = gui.addFolder(`Bokeh Pass`)
    bokehFolder.add(params, 'focus', 0.0, 3000.0, 10).onChange(matChanger)
    bokehFolder.add(params, 'aperture', 0, 10, 0.1).onChange(matChanger)
    bokehFolder.add(params, 'maxblur', 0.0, 0.01, 0.001).onChange(matChanger)

    // Stats - show fps
    this.stats1 = new Stats()
    this.stats1.showPanel(0) // Panel 0 = fps
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement)

    this.addConvexGeometry();
  },

addConvexGeometry(){

  var rawInputData;

  var points =[];

  //  fetch('http://localhost:6968/output/2d') // /2d/mostRecent
  //fetch('http://localhost:6969/output/2d')
  // fetch('http://localhost:6968/output/2d/mostRecent') 
  fetch('http://localhost:6968/2d/mostRecent') 
  .then(response => response.text())
  .then(data => { 
    rawInputData = data; 
    console.log(typeof(rawInputData));
    console.log(rawInputData.length);

    // var numbers;
    // numbers = rawInputData.split(" ");
    // for (var i = 0; i < numbers.length; i++) {
    //   numbers[i] = parseFloat(numbers[i]);
    // }

    // var vertices = [];
    // for (var i = 0; i < numbers.length; i+=3) {
    //   vertices.push([numbers[i], numbers[i+1], numbers[i+2]]);
    // }

    // for (var i = 0; i < 20; i++) {
    //   console.log(vertices[i]);
    // }

    var vertices = [];
    vertices = rawInputData.split("\n");

    for (var i = 0; i < vertices.length; i++) { //
      //vertices[i] = parseFloat(vertices[i]);
      var tempArr; 
      tempArr = vertices[i].split(" ");
      for (var j = 0; j < tempArr.length; j++) {
        tempArr[j] = parseFloat(tempArr[j]);
      }
      vertices[i] = tempArr;
    }

    // for (var i = 0; i < 20; i++) {
    //   console.log(vertices[i]);
    // }

    // for (var i = 0; i < vertices.length; i++) {
    //   if (vertices[i][0] == 0) { //254
    //     points.push([vertices[i][1], vertices[i][2]]);
    //   }
    // }

    // for (var i = 0; i < 20; i++) {
    //   console.log(points[i]);
    // }
    // console.log(points.length);

    for (var i = 0; i < vertices.length -1; i++) { //points.length
      // var dotGeometry = new THREE.BufferGeometry();
      // var dotGeometryVertices = [];
      // dotGeometryVertices.push(new THREE.Vector3( points[i][0], 0.5 , points[i][1]));
      // dotGeometry.setAttribute( 'position', new THREE.BufferAttribute( dotGeometryVertices, 3 ) );
      // var dotMaterial = new THREE.PointsMaterial( { size: 1, sizeAttenuation: false } );
      // var dot = new THREE.Points( dotGeometry, dotMaterial );
      // scene.add( dot );


      // const dotGeometry = new THREE.BufferGeometry();
      var dotMaterial;
      var yValue;
      if(vertices[i][0] == 0){
        dotMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0xff0000 }); //border
        yValue = 0.5;

        for (var j = 0; j < 5; j++) {
          const dotGeometry = new THREE.BufferGeometry();
          dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2],yValue * j,vertices[i][1]]), 3));
          const dot = new THREE.Points(dotGeometry, dotMaterial);
          scene.add(dot);
        }
        
      }else{
        const dotGeometry = new THREE.BufferGeometry();
        dotMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0x00ff00 }); //empty space
        yValue = 0.2;

        dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2],yValue,vertices[i][1]]), 3));
        const dot = new THREE.Points(dotGeometry, dotMaterial);
        scene.add(dot);
      }
      // dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2],yValue,vertices[i][1]]), 3));
      // const dot = new THREE.Points(dotGeometry, dotMaterial);
      // scene.add(dot);


    }

    // camera.position.set(51.224998/2, 25, 51.224998)/2;
    this.controls.target.set(4.097548, 0, 2.919713); 




  });
  //const fs = require('fs');

  // fs.readFile('../map_files/knownSpacePoints.txt', 'utf8', function(err, data) {
  //   if (err){
  //     console.error(err);
  //     return;
  //   }
  //   console.log(data);
  // });

  // var url = require('../map_files/knownSpacePoints.txt');

  // var loader = new THREE.FileLoader();

  // console.log(window.location.pathname);

  // loader.load(
  //    url,
  //     function ( fileData ) {
  //       console.log('loaded data!');
  //       console.log(typeof(fileData));
  //       console.log(fileData);
  //     });

  // for (var i = 0; i < 20; i++) {
  //   console.log(points[i]);
  // }




  // fetch('http://localhost:6969/vert')
  // fetch('http://localhost:6968/output/1d') // /1d/mostRecent
  fetch('http://localhost:6968/1d/mostRecent')
  .then(response => response.text())
  .then(data => { 
    rawInputData = data; 
    console.log(typeof(rawInputData));
    console.log(rawInputData.length);

    var vertices = [];
    vertices = rawInputData.split("\n");

    var maxYvalue = 0;
    var minYvalue = 100000;

    for (var i = 0; i < vertices.length; i++) { //
      //vertices[i] = parseFloat(vertices[i]);
      var tempArr; 
      tempArr = vertices[i].split(" , ");
      for (var j = 0; j < tempArr.length; j++) {
        tempArr[j] = parseFloat(tempArr[j]);
        if (j == 1) {
          if (tempArr[j] > maxYvalue) {
            maxYvalue = tempArr[j];
          }
          if (tempArr[j] < minYvalue) {
            minYvalue = tempArr[j];
          }
        }
      }
      vertices[i] = tempArr;
    }

    console.log(vertices[0]);
    console.log(vertices[vertices.length/2]);

    console.log(maxYvalue);
    console.log(minYvalue);

    var yOffset = minYvalue; //43; //0.8

    for (var i = 0; i < vertices.length -1; i++) {
        const dotGeometry = new THREE.BufferGeometry();
        dotMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0x0000ff }); //empty space
        yValue = 0;

        //-51.224998, -51.224998, 0.000000
        //-4.097548, -2.919713, 0.000000
        var xOffSet = 4.097548;
        var zOffSet = 2.919713;
        dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([ zOffSet + (vertices[i][2] ) , vertices[i][1] - yOffset, xOffSet - (vertices[i][0] ) ]), 3));
        const dot = new THREE.Points(dotGeometry, dotMaterial);
        scene.add(dot);
        //xOffSet + (vertices[i][0] )
        // zOffSet - (vertices[i][2] ) 
    }


    // for (var i = 0; i < vertices.length -1; i++) { //points.length

    //   var dotMaterial;
    //   var yValue;
    //   if(vertices[i][0] == 0){
    //     dotMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0xff0000 }); //border
    //     yValue = 0.1;

    //     for (var j = 0; j < 10; j++) {
    //       const dotGeometry = new THREE.BufferGeometry();
    //       dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2],yValue * j,vertices[i][1]]), 3));
    //       const dot = new THREE.Points(dotGeometry, dotMaterial);
    //       scene.add(dot);
    //     }
        
    //   }else{
    //     const dotGeometry = new THREE.BufferGeometry();
    //     dotMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0x00ff00 }); //empty space
    //     yValue = 0.2;

    //     dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2],yValue,vertices[i][1]]), 3));
    //     const dot = new THREE.Points(dotGeometry, dotMaterial);
    //     scene.add(dot);
    //   }
    //   // dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2],yValue,vertices[i][1]]), 3));
    //   // const dot = new THREE.Points(dotGeometry, dotMaterial);
    //   // scene.add(dot);


    // }

  });



	// let vertices = [
	// 	[0,0,0],
	// 	[4.5,0,0],
	// 	[4.5,0,3],
	// 	[0,0,3],
	// 	[0,3,0],
	// 	[4.5,3,0],
	// 	[4.5,3,3],
	// 	[0,3,3],
	// 	[2.25,5,1.5], //change y-component to see geometry change
	// ]

	// let positions = [];

	// for(let i = 0; i < vertices.length; i++){
	// 	positions.push( new THREE.Vector3(vertices[i][0], vertices[i][1], vertices[i][2]));
	// }
	
	// // var mesh = new THREE.ConvexGeometry( positions );
	// var geom = new ConvexGeometry(positions);
	// // console.log(geom.computeBoundingBox());
	// //geom.drawRange.count = 18; // draw half of the geometry

	// //const convMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	// const convMaterial = new THREE.MeshPhongMaterial( { color: 0x00ff00, side: THREE.BackSide } ) //map: texture

	// convMesh = new THREE.Mesh( geom, convMaterial );
	// convMesh.position.set(0,0,0);
	// // convMesh.backSided = true;

	// scene.add( convMesh );
	// console.log(convMesh);
},

  // load a texture for the floor
  // returns a promise so the caller can await on this function
  loadTexture(mshStdFloor) {
    return new Promise((resolve, reject) => {
      var loader = new THREE.TextureLoader()
      loader.load(Tile, function (texture) {
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

    // rotate the torus
    this.meshKnot.rotation.y = elapsed * params.speed
  }
}

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, undefined, composer)

