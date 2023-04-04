import * as Request from './request'
import Delaunator from 'delaunator';
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry"
var configJSON;
var boundingSphereCenterMesh;

export function getConfigJSON(){
  return configJSON;
}
// export async function getBoundingSphereCenter(){
//   setTimeout(function(){
//     return boundingSphereCenterMesh;
//   },10000)
// }

export async function renderAll(){
    configJSON = await Request.getYamlRecent();
    console.log(configJSON);
    // console.log(configJSON.free_thresh);
    let free_thresh = configJSON.free_thresh;
    let occupied_thresh = configJSON.occupied_thresh;
    let mapResolution = configJSON.resolution;
    let mapOrigin = configJSON.origin;
    // console.log('maporigin')
    // console.log(mapOrigin);

    await render2dVertices(free_thresh, occupied_thresh, true, false);


    let bottom1dVerticesData = await get1dVertices(false);
    let bottom1dVertices = bottom1dVerticesData[0];
    let bottom1dMinY = bottom1dVerticesData[1];
    let bottomdMaxY = bottom1dVerticesData[2];

    delaunayTriangulation(false, bottom1dVertices, -1 * mapOrigin[1], bottom1dMinY, -1 * mapOrigin[0] );

    let top1dVerticesData = await get1dVertices(true);
    let top1dVertices = top1dVerticesData[0];
    let top1dMinY = top1dVerticesData[1];
    let top1dMaxY = top1dVerticesData[2];

    delaunayTriangulation(true, top1dVertices, -1 * mapOrigin[1], bottom1dMinY, -1 * mapOrigin[0] );

    return origin;

    // this.controls.target.set(10, 0, 10);

    // let bottom1dVertices = await get1dVertices(false);
}

async function get2dVertices(){
    console.log('get2dVertices');
    let rawInputData = await Request.get2dRecent();

    var vertices = [];
    vertices = rawInputData.split("\n");

    for (var i = 0; i < vertices.length; i++) { // for each vertex
      var tempArr = []; 
      tempArr = vertices[i].split(" ");
      for (var j = 0; j < tempArr.length; j++) {
        tempArr[j] = parseFloat(tempArr[j]);
        if(tempArr[j] == null) break; //if null, skip to next point
      }

      vertices[i] = tempArr;
    }

    return vertices;
}

async function render2dVertices(free_thresh, occupied_thresh, renderBorder, renderMultiBorder){
    console.log('render2dVertices');
    let vertices = await get2dVertices();
    // console.log(vertices.length);

    for (var i = 0; i < vertices.length -1; i++) { //points.length
        var dotMaterial;
        var yValue;
        if(vertices[i][0] <= free_thresh){
          if(renderBorder){
            dotMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0xff0000 }); //border
            // yValue = 0.5;
  
            if(renderMultiBorder){
              yValue = 0.5;
              for (var j = 0; j < 5; j++) {
                const dotGeometry = new THREE.BufferGeometry();
                dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2],yValue * j,vertices[i][1]]), 3));
                const dot = new THREE.Points(dotGeometry, dotMaterial);
                scene.add(dot);
              }
            }else{
            let j = 1;
              yValue = 0.2;
              const dotGeometry = new THREE.BufferGeometry();
              dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2],yValue * j,vertices[i][1]]), 3));
              const dot = new THREE.Points(dotGeometry, dotMaterial);
              scene.add(dot);
            }
          }
          
        }else if(vertices[i][0] >= occupied_thresh){
          const dotGeometry = new THREE.BufferGeometry();
          dotMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0x00ff00 }); //empty space
          yValue = 0.05; //0.1;
  
          dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2],yValue,vertices[i][1]]), 3));
          const dot = new THREE.Points(dotGeometry, dotMaterial);
          scene.add(dot);
        }
      }
}

async function get1dVertices(topPoints, yOffset){
    let rawInputData;

    if(topPoints){
        rawInputData = await Request.get1d_1Recent(); //top data
        //yOffset
    }else{
        rawInputData = await Request.get1d_0Recent(); //bottom data
    }

    var vertices = [];
    vertices = rawInputData.split("\n");

    var maxYvalue = 0;
    var minYvalue = 100000;

    for (var i = 0; i < vertices.length; i++) { //
      //vertices[i] = parseFloat(vertices[i]);
      var tempArr; 
      tempArr = vertices[i].split(" , ");
      for (var j = 0; j < tempArr.length; j++) {

        if(tempArr[j] == null) break;
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

    // yOffset1d = minYvalue;

    // var yOffset = minYvalue; //43; //0.8


    return [vertices, minYvalue, maxYvalue];
}


function delaunayTriangulation(top, vertices, xOffSet, yOffset, zOffSet){

    var points3d = [];

    for (let index = 0; index < vertices.length; index++) {
      if(vertices[index][0] == null || vertices[index][1] == null || vertices[index][2] == null){
        console.log("null points");
      }else{
        points3d.push(new THREE.Vector3(zOffSet + vertices[index][0], vertices[index][1] - yOffset, xOffSet - vertices[index][2]));
      }
      //zOffSet + (vertices[i][0] ) , vertices[i][1] - yOffset, xOffSet - (vertices[i][2] )
    }

    var geom = new THREE.BufferGeometry().setFromPoints(points3d);
    var cloud = new THREE.Points(
      geom,
      new THREE.PointsMaterial({ color: 0x99ccff, size: 0.05 })
    );
    scene.add(cloud);
    console.log(cloud);
    // cloud.position.set(0,35,0);

    // triangulate x, z
    var indexDelaunay = Delaunator.from(
      points3d.map(v => {
        return [v.x, v.z];
      })
    );

    var meshIndex = []; // delaunay index => three.js index
    for (let i = 0; i < indexDelaunay.triangles.length; i++){
      meshIndex.push(indexDelaunay.triangles[i]);
    }

    geom.setIndex(meshIndex); // add three.js index to the existing geometry
    geom.computeVertexNormals();
    
    if(top){
      var mesh = new THREE.Mesh(
        geom, // re-use the existing geometry
        new THREE.MeshLambertMaterial({ color: "purple", wireframe: false })
      );
    }else{
      var mesh = new THREE.Mesh(
        geom, // re-use the existing geometry
        new THREE.MeshLambertMaterial({ color: "blue", wireframe: false })
      );
    }
    // console.log(mesh.geometry.boundingSphere.center)

    scene.add(mesh);
    return mesh;

    // return obj.mesh.geometry.boundingSphere.center;
    // mesh.position.set(0,35,0);

  }

  function addConvMesh(vertices, xOffSet, yOffset, zOffSet){
    let positions = [];

    //zOffSet + (vertices[i][0] ) , vertices[i][1] - yOffset, xOffSet - (vertices[i][2] )

    for(let i = 0; i < vertices.length; i++){
      if(vertices[i][0] == null || vertices[i][1] == null || vertices[i][2] == null){
        console.log("null points");
      }else{
        positions.push( new THREE.Vector3(vertices[i][0] + zOffSet, vertices[i][1] - yOffset, xOffSet - vertices[i][2]));
      // console.log(vertices[i][0], vertices[i][1], vertices[i][2]);
      }
    }
    
    // var mesh = new THREE.ConvexGeometry( positions );
    var geom = new ConvexGeometry(positions);
    // console.log(geom.computeBoundingBox());
    //geom.drawRange.count = 18; // draw half of the geometry

    //const convMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const convMaterial = new THREE.MeshPhongMaterial( { color: 0xFF007D, side: THREE.BackSide } ) //map: texture

    convMesh = new THREE.Mesh( geom, convMaterial );
    convMesh.position.set(0,0,0);
    // convMesh.backSided = true;

    scene.add( convMesh );
    console.log(convMesh);
  }

// first get yaml to json -> extract useful data
// then get vertices from pgm and text files
