import * as Request from './request'
import Delaunator from 'delaunator';
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry"
import * as Index from './index'
var configJSON;
var boundingSphereCenterMesh;
var originPoint2d;
let mapWidth;
let mapHeight;
var removableObjects = [];
var existingMapName;

export function getConfigJSON(){
  return configJSON;
}
// export async function getBoundingSphereCenter(){
//   setTimeout(function(){
//     return boundingSphereCenterMesh;
//   },10000)
// }

export async function renderRecent(){
    // processed = await Request.getFilesProcessedList();
    // console.log(processed);
    configJSON = await Request.getYamlRecent();
    console.log(configJSON);
    // console.log(configJSON.free_thresh);
    let free_thresh = configJSON.free_thresh;
    let occupied_thresh = configJSON.occupied_thresh;
    let mapResolution = configJSON.resolution;
    let mapOrigin = configJSON.origin;
    let averageDroneElevation = configJSON.averageElevation;
    // console.log('maporigin')
    // console.log(mapOrigin);

    //  await render2dVertices(free_thresh, occupied_thresh, true, false, mapOrigin, averageDroneElevation);
    // await render2dVertices(free_thresh, occupied_thresh, true, false, [-4.43, -9.63, 0.000000]);
    //10.572565078735352, 0.05000000074505806 , 8.053475379943848

    // 8.85 and 16.9 metres
    //origin: [-4.419973, -7.269125, 0]
    


    let bottom1dVerticesData = await get1dVertices(false);
    let bottom1dVertices = bottom1dVerticesData[0];
    let bottom1dMinY = bottom1dVerticesData[1];
    let bottom1dMaxY = bottom1dVerticesData[2];

    // delaunayTriangulation(false, bottom1dVertices, -1 * mapOrigin[1], bottom1dMinY, -1 * mapOrigin[0] );
    delaunayTriangulation(false, bottom1dVertices, 0, bottom1dMinY, 0 );

    let top1dVerticesData = await get1dVertices(true);
    let top1dVertices = top1dVerticesData[0];
    let top1dMinY = top1dVerticesData[1];
    let top1dMaxY = top1dVerticesData[2];

    // delaunayTriangulation(true, top1dVertices, -1 * mapOrigin[1], bottom1dMinY, -1 * mapOrigin[0] );
    delaunayTriangulation(true, top1dVertices, 0, bottom1dMinY, 0 );

    let yOffset2dMap = averageDroneElevation - bottom1dMinY;
    console.log(averageDroneElevation);
    console.log(bottom1dMinY);
    console.log(yOffset2dMap);

    await render2dVertices(free_thresh, occupied_thresh, true, true, mapOrigin, yOffset2dMap);

    return [bottom1dMinY, bottom1dMaxY, top1dMinY, top1dMaxY]; //lowGroundLevel, highGroundLevel, lowClearance, highClearance 

    // this.controls.target.set(10, 0, 10);

    // let bottom1dVertices = await get1dVertices(false);
}

export async function renderSpecific(fileName){
  // console.log(scene);
  // Index.updateElements(existingMapName, fileName);
  clearScene();
  existingMapName = fileName;

  // Index.updateElements(existingMapName, fileName, [bottom1dMinY, bottom1dMaxY, top1dMinY, top1dMaxY]);

  configJSON = await Request.getYamlSpecific(fileName);
  // console.log(configJSON);
  // console.log(configJSON.free_thresh);
  let free_thresh = configJSON.free_thresh;
  let occupied_thresh = configJSON.occupied_thresh;
  let mapResolution = configJSON.resolution;
  let mapOrigin = configJSON.origin;
  let averageDroneElevation = configJSON.averageElevation;
  // console.log('maporigin')
  // console.log(mapOrigin);

  //  await render2dVertices(free_thresh, occupied_thresh, true, false, mapOrigin, averageDroneElevation);
  // await render2dVertices(free_thresh, occupied_thresh, true, false, [-4.43, -9.63, 0.000000]);
  //10.572565078735352, 0.05000000074505806 , 8.053475379943848

  // 8.85 and 16.9 metres
  //origin: [-4.419973, -7.269125, 0]
  


  let bottom1dVerticesData = await get1dVertices(false, fileName);
  let bottom1dVertices = bottom1dVerticesData[0];
  let bottom1dMinY = bottom1dVerticesData[1];
  let bottom1dMaxY = bottom1dVerticesData[2];

  // delaunayTriangulation(false, bottom1dVertices, -1 * mapOrigin[1], bottom1dMinY, -1 * mapOrigin[0] );
  delaunayTriangulation(false, bottom1dVertices, 0, bottom1dMinY, 0 );

  let top1dVerticesData = await get1dVertices(true, fileName);
  let top1dVertices = top1dVerticesData[0];
  let top1dMinY = top1dVerticesData[1];
  let top1dMaxY = top1dVerticesData[2];

  // delaunayTriangulation(true, top1dVertices, -1 * mapOrigin[1], bottom1dMinY, -1 * mapOrigin[0] );
  delaunayTriangulation(true, top1dVertices, 0, bottom1dMinY, 0 );

  let yOffset2dMap = averageDroneElevation - bottom1dMinY;
  console.log(averageDroneElevation);
  console.log(bottom1dMinY);
  console.log(yOffset2dMap);

  await render2dVertices(free_thresh, occupied_thresh, true, true, mapOrigin, yOffset2dMap, fileName);

  Index.updateElements(existingMapName, fileName, [bottom1dMinY, bottom1dMaxY, top1dMinY, top1dMaxY]);

  return existingMapName; //lowGroundLevel, highGroundLevel, lowClearance, highClearance 

}

async function get2dVertices(fileName = 'recent'){
    // console.log('get2dVertices');
    let rawInputData;
    if(fileName == 'recent'){
      rawInputData = await Request.get2dRecent();
    } else {
      rawInputData = await Request.get2dSpecific(fileName);
    }

    var vertices = [];
    vertices = rawInputData.split("\n");  //split pgm.txt by row of pixels
    let widthHeight = vertices[0];
    let widthHeightArr = widthHeight.split(" ");
    mapWidth = parseFloat(widthHeightArr[0]);
    mapHeight = parseFloat(widthHeightArr[1]);
    vertices.splice(0, 1); //remove first row of pgm.txt

    console.log(mapWidth * configJSON.resolution);
    console.log(mapHeight * configJSON.resolution);

    for (var i = 0; i < vertices.length; i++) { // for each row of pixels

      var tempArr = []; 
      tempArr = vertices[i].split(" "); //split row of pixels by space into individual pixels

      for (var j = 0; j < tempArr.length; j++) {
        tempArr[j] = parseFloat(tempArr[j]);
        if(tempArr[j] == null) break; //if null, skip to next point
      }

      // if(i == vertices.length -1) originPoint2d = tempArr[0]; //if last row, first pixel is origin point

      vertices[i] = tempArr;
    }

    console.log(originPoint2d);

    return vertices;
}

async function render2dVertices(free_thresh, occupied_thresh, renderBorder, renderMultiBorder, mapOrigin, yOffset2dMap, fileName = 'recent'){
    // let xOffSet = (mapWidth * configJSON.resolution) - mapOrigin[0];
    // let zOffSet = (mapHeight * configJSON.resolution) - mapOrigin[1];



    // let xOffSet = 0;
    // let zOffSet = 0;


    // console.log('render2dVertices');
    let vertices = await get2dVertices(fileName);
    // let xOffSet = -1 *((mapWidth * configJSON.resolution) + mapOrigin[0]);
    // let zOffSet = -1 *((mapHeight * configJSON.resolution) + mapOrigin[1]);

    // xOffSet =  mapOrigin[0]; // -4.43 //-9.714648
    // zOffSet =  mapOrigin[1] / 2.3; // -9.63 // -4.49 after divide by 2.3

    // xOffSet = 0;
    // zOffSet = 0;

//-9.71, -10.33


// xOffSet -9.714648
// zOffSet -10.332941 -> -4.49 after divide by 2.3


    // console.log('xOffSet');
    // console.log(xOffSet);
    // console.log('zOffSet');
    // console.log(zOffSet);

    // xOffSet = mapOrigin[0]; // -4.43
    // zOffSet = mapOrigin[1]; // -9.63

    /**
     * issues: 
     */

    // console.log('xOffSet');
    // console.log(xOffSet);
    // console.log('zOffSet');
    // console.log(zOffSet);

    // console.log((mapWidth * configJSON.resolution) - mapOrigin[0])
    // console.log((mapHeight * configJSON.resolution) - mapOrigin[1])

    // console.log(mapOrigin[0]);
    // console.log(mapOrigin[1]);
    // console.log(mapWidth * configJSON.resolution); //15.55
    // console.log(mapHeight * configJSON.resolution); //14.8
    // console.log(mapWidth);
    // console.log(mapHeight);
    // console.log(configJSON.resolution);

    // console.log(vertices);

    //  console.log(vertices.length);
    // console.log(vertices[vertices.length -2]); //0, 15.4, 5.300000000000001

    let zOffset = (mapHeight * configJSON.resolution) + mapOrigin[1];
    let xOffSet = mapOrigin[0];

    console.log(yOffset2dMap);

    for (var i = 0; i < vertices.length -1; i++) { //points.length
        var dotMaterial;
        var yValue = yOffset2dMap;
        if(vertices[i][0] <= free_thresh){
          if(renderBorder){
            dotMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0xff0000 }); //border
            // yValue = 0.5;
  
            if(renderMultiBorder){
              // yValue = 0.5;
              
              // 1.5858293696272227  0
              // 1.6858293696272227  1
              // 1.7858293696272227  2
              // 1.8858293696272227  3
              for (var j = 0; j < 5; j++) {
                const dotGeometry = new THREE.BufferGeometry();
                dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2] + xOffSet, yValue-0.2 + (0.1 * j),vertices[i][1] - zOffset]), 3));
                const dot = new THREE.Points(dotGeometry, dotMaterial);
                scene.add(dot);
                removableObjects.push(dot);
              }
            }else{
            let j = 1;
              // yValue = 0.2;
              const dotGeometry = new THREE.BufferGeometry();
              // dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2] + xOffSet, yValue * j, vertices[i][1] + zOffSet]), 3));
              dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2] + xOffSet, yValue * j, vertices[i][1] - zOffset]), 3));
              const dot = new THREE.Points(dotGeometry, dotMaterial);
              scene.add(dot);
              removableObjects.push(dot);
            }
          }
          
        }
        // else if(vertices[i][0] >= occupied_thresh){
        //   if(i % 2 === 0){ //skip every other point
        //     const dotGeometry = new THREE.BufferGeometry();
        //     dotMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0x00ff00 }); //empty space
        //     yValue = 0.05; //0.1;
    
        //     dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2] + xOffSet, yValue, vertices[i][1] - zOffset]), 3));
        //     const dot = new THREE.Points(dotGeometry, dotMaterial);
        //     scene.add(dot);
        //   }
        // }
      }
      
      


    var points3d = [];

    for (let index = 0; index < vertices.length; index++) {
      if(vertices[index][1] == null || vertices[index][2] == null ){
        console.log("null points");
      }else{
        if(vertices[index][0] >= occupied_thresh){
          points3d.push(new THREE.Vector3( vertices[index][2] + xOffSet, 0.1 ,  vertices[index][1] - zOffset));
        }
      }
      //zOffSet + (vertices[i][0] ) , vertices[i][1] - yOffset, xOffSet - (vertices[i][2] )
    }

    var geom = new THREE.BufferGeometry().setFromPoints(points3d);
    var cloud = new THREE.Points(
      geom,
      new THREE.PointsMaterial({ color: 'cyan', size: 0.05 })
    );
    scene.add(cloud);
    removableObjects.push(cloud);
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
    
      var mesh = new THREE.Mesh(
        geom, // re-use the existing geometry
        new THREE.MeshLambertMaterial({ color: 0x5A5A5A, wireframe: false })
      );
    // console.log(mesh.geometry.boundingSphere.center)

    scene.add(mesh);
    removableObjects.push(mesh);


}

async function get1dVertices(topPoints, fileName = 'recent'){
    let rawInputData;

    if(fileName == 'recent'){
    
      if(topPoints){
          rawInputData = await Request.get1d_1Recent(); //top data
      }else{
          rawInputData = await Request.get1d_0Recent(); //bottom data
      }

    } else {

      if(topPoints){
        rawInputData = await Request.get1d_1Specific(fileName); //top data
      }else{
        rawInputData = await Request.get1d_0Specific(fileName); //bottom data
      }

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

    console.log('maxYvalue', maxYvalue);
    return [vertices, minYvalue, maxYvalue];
}


function delaunayTriangulation(top, vertices, xOffSet, yOffset, zOffSet){

    var points3d = [];
    console.log("vertices", vertices.length);
    console.log("yOffset", yOffset);

    for (let index = 0; index < vertices.length; index++) {
      if(vertices[index][0] == null || vertices[index][1] == null || vertices[index][2] == null){
        console.log("null points");
      }else{
        if(vertices[index][1] - yOffset > 2 && top == false){
           console.log(index)
           console.log("yOffset", yOffset);
        }
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
    removableObjects.push(cloud);
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
    removableObjects.push(mesh);
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

function clearScene(){
  if( removableObjects.length > 0 ) {
    removableObjects.forEach(function(v) {
      v.material.dispose();
      v.geometry.dispose();
      scene.remove(v);
    });
    removableObjects = null;
    removableObjects = [];
  }
}

export function toggleMapVisibility(toggleVal){
  removableObjects.forEach(function(v) {
    v.visible = toggleVal;
  });
}
