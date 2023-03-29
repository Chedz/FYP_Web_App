// import { ConvexGeometry } from "./examples/ConvexGeometry.js";
let convMesh;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.addEventListener('change', render);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// var geometry = new THREE.BoxGeometry( 1, 1, 1 );
// var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
// var cube = new THREE.Mesh( geometry, material );
// scene.add( cube );

camera.position.z = 5;

// ambient light
scene.add( new THREE.AmbientLight( 0x222222 ) );
// point light
const light = new THREE.PointLight( 0xffffff, 1 );
light.position.set(15,10,5)
scene.add( light );


window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

var animate = function () {
	requestAnimationFrame( animate );

	// cube.rotation.x += 0.01;
	// cube.rotation.y += 0.01;


	render();
};

function render(){
	renderer.render(scene, camera);
}

function addFloor(){
	var geometry = new THREE.PlaneGeometry( 100, 100, 32 );
	var material = new THREE.MeshLambertMaterial( {color: 0x808080, side: THREE.DoubleSide} );
	var plane = new THREE.Mesh( geometry, material );
	plane.rotation.x = Math.PI / 2;
	plane.position.y = -1;
	plane.receiveShadow = true;
	scene.add( plane );
}

function addConvexGeometry(){

	let vertices = [
		[0,0,0],
		[4.5,0,0],
		[4.5,0,3],
		[0,0,3],
		[0,3,0],
		[4.5,3,0],
		[4.5,3,3],
		[0,3,3],
	]

	let positions = [];

	for(let i = 0; i < vertices.length; i++){
		positions.push( new THREE.Vector3(vertices[i][0], vertices[i][1], vertices[i][2]));
	}
	
	// var mesh = new THREE.ConvexGeometry( positions );
	var geom = new THREE.ConvexGeometry(positions);
	//geom.drawRange.count = 18; // draw half of the geometry

	//const convMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	const convMaterial = new THREE.MeshPhongMaterial( { color: 0x00ff00, side: THREE.BackSide } ) //map: texture

	convMesh = new THREE.Mesh( geom, convMaterial );
	convMesh.position.set(0,0,0);
	// convMesh.backSided = true;

	scene.add( convMesh );
	console.log(convMesh);
}

addFloor();

addConvexGeometry();

animate();