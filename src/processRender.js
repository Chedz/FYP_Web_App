// import dependencies
import * as Request from './request'
import Delaunator from 'delaunator';
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry"
import * as Index from './index'

//global variables
var configJSON;
var boundingSphereCenterMesh;
var originPoint2d;
let mapWidth;
let mapHeight;
var removableObjects = [];
var existingMapName;
var points2dOutline = [];

/**
 * This file contains all the functions that are used to process and render the data received from the server via the request.js file
 */

export function getConfigJSON(){
  return configJSON;
}

export async function renderRecent(normaliseYvalues = true){
    configJSON = await Request.getYamlRecent();
    // console.log(configJSON);

    let free_thresh = configJSON.free_thresh;
    let occupied_thresh = configJSON.occupied_thresh;
    let mapResolution = configJSON.resolution;
    let mapOrigin = configJSON.origin;
    let averageDroneElevation = configJSON.averageElevation;


    let bottom1dVerticesData = await get1dVertices(false);
    let bottom1dVertices = bottom1dVerticesData[0];
    let bottom1dMinY = bottom1dVerticesData[1];
    let bottom1dMaxY = bottom1dVerticesData[2];
    let bottom1dAverageY = bottom1dVerticesData[3];

    let top1dVerticesData = await get1dVertices(true);
    let top1dVertices = top1dVerticesData[0];
    let top1dMinY = top1dVerticesData[1];
    let top1dMaxY = top1dVerticesData[2];
    let top1dAverageY = top1dVerticesData[3];

    let yDiffList = [];
    yDiffList = delaunayTriangulation(true, top1dVertices, 0, bottom1dMinY, 0, bottom1dAverageY, top1dAverageY, normaliseYvalues );

    delaunayTriangulation(false, bottom1dVertices, 0, bottom1dMinY, 0, bottom1dAverageY, top1dAverageY, normaliseYvalues, yDiffList );

    let yOffset2dMap = averageDroneElevation - bottom1dMinY;

    await render2dVertices(free_thresh, occupied_thresh, true, true, mapOrigin, yOffset2dMap);

    return [bottom1dMinY, bottom1dMaxY, top1dMinY, top1dMaxY]; //lowGroundLevel, highGroundLevel, lowClearance, highClearance 
}

export async function renderSpecific(fileName, normaliseYvalues = false){

  clearScene();
  existingMapName = fileName;

  configJSON = await Request.getYamlSpecific(fileName);

  let free_thresh = configJSON.free_thresh;
  let occupied_thresh = configJSON.occupied_thresh;
  let mapResolution = configJSON.resolution;
  let mapOrigin = configJSON.origin;
  let averageDroneElevation = configJSON.averageElevation;


  let bottom1dVerticesData = await get1dVertices(false, fileName);
  let bottom1dVertices = bottom1dVerticesData[0];
  let bottom1dMinY = bottom1dVerticesData[1];
  let bottom1dMaxY = bottom1dVerticesData[2];
  let bottom1dAverageY = bottom1dVerticesData[3];

  let top1dVerticesData = await get1dVertices(true, fileName);
  let top1dVertices = top1dVerticesData[0];
  let top1dMinY = top1dVerticesData[1];
  let top1dMaxY = top1dVerticesData[2];
  let top1dAverageY = top1dVerticesData[3];

  let yDiffList = [];
  yDiffList = delaunayTriangulation(true, top1dVertices, 0, bottom1dMinY, 0, bottom1dAverageY, top1dAverageY, normaliseYvalues );

  delaunayTriangulation(false, bottom1dVertices, 0, bottom1dMinY, 0, bottom1dAverageY, top1dAverageY, normaliseYvalues, yDiffList );

  let yOffset2dMap = averageDroneElevation - bottom1dMinY;
  // console.log(averageDroneElevation);
  // console.log(bottom1dMinY);
  // console.log(yOffset2dMap);

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

    // console.log(mapWidth * configJSON.resolution);
    // console.log(mapHeight * configJSON.resolution);

    for (var i = 0; i < vertices.length; i++) { // for each row of pixels

      var tempArr = []; 
      tempArr = vertices[i].split(" "); //split row of pixels by space into individual pixels

      for (var j = 0; j < tempArr.length; j++) {
        tempArr[j] = parseFloat(tempArr[j]);
        if(tempArr[j] == null) break; //if null, skip to next point
      }

      vertices[i] = tempArr;
    }

    return vertices;
}

async function render2dVertices(free_thresh, occupied_thresh, renderBorder, renderMultiBorder, mapOrigin, yOffset2dMap, fileName = 'recent'){

    let vertices = await get2dVertices(fileName);

    let zOffset = (mapHeight * configJSON.resolution) + mapOrigin[1];
    let xOffSet = mapOrigin[0];

    // console.log(yOffset2dMap);

    for (var i = 0; i < vertices.length -1; i++) { // for all 2d vertices
        var dotMaterial;
        var yValue = yOffset2dMap;
        if(vertices[i][0] <= free_thresh){
          if(renderBorder){
            dotMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0xff0000 }); //border
  
            if(renderMultiBorder){

              for (var j = 0; j < 5; j++) {
                const dotGeometry = new THREE.BufferGeometry();
                dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2] + xOffSet, yValue-0.2 + (0.1 * j),vertices[i][1] - zOffset]), 3));
                const dot = new THREE.Points(dotGeometry, dotMaterial);
                scene.add(dot);
                points2dOutline.push(dot);
              }
            }else{
              let j = 1;

              const dotGeometry = new THREE.BufferGeometry();
              dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([vertices[i][2] + xOffSet, yValue * j, vertices[i][1] - zOffset]), 3));
              const dot = new THREE.Points(dotGeometry, dotMaterial);
              scene.add(dot);
              // points2dOutline.push(dot);
              removableObjects.push(dot);
            }
          }
          
        }
      }
      

    var points3d = [];

    for (let index = 0; index < vertices.length; index++) {
      if(vertices[index][1] == null || vertices[index][2] == null ){
        console.log("null points found in input file");
      }else{
        if(vertices[index][0] >= occupied_thresh){
          points3d.push(new THREE.Vector3( vertices[index][2] + xOffSet, 0.1 ,  vertices[index][1] - zOffset));
        }
      }
    }

    var geom = new THREE.BufferGeometry().setFromPoints(points3d);
    var cloud = new THREE.Points(
      geom,
      new THREE.PointsMaterial({ color: 'cyan', size: 0.05 })
    );
    scene.add(cloud);
    removableObjects.push(cloud);

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

    scene.add(mesh);
    removableObjects.push(mesh);
}

async function get1dVertices(topPoints, fileName = 'recent'){
    let rawInputData;
    let averageYCounter = 0;

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

    for (var i = 0; i < vertices.length; i++) { // each line of data (x,y,z)
      //vertices[i] = parseFloat(vertices[i]);
      var tempArr; 
      tempArr = vertices[i].split(" , ");
      for (var j = 0; j < tempArr.length; j++) { //each axis per vertex

        if(tempArr[j] == null) break; //skip null values
        tempArr[j] = parseFloat(tempArr[j]);  //convert to float

        if (j == 1) { //y axis
          averageYCounter += tempArr[j];  //add to average counter

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

    var averageY = averageYCounter / vertices.length;
    // console.log('averageY', averageY);

    // console.log('maxYvalue', maxYvalue);
    return [vertices, minYvalue, maxYvalue, averageY];
}


function delaunayTriangulation(top, vertices, xOffSet, yOffset, zOffSet, bottom1dAverageY, top1dAverageY, normaliseYvalues = false, yDiffList){

    var points3d = [];
    let yOffsetList = [];
    if(normaliseYvalues){
      if(!top){
        yOffsetList = yDiffList;
      }else{
        yOffsetList = [];
      }
    }

    for (let index = 0; index < vertices.length; index++) {
      if(vertices[index][0] == null || vertices[index][1] == null || vertices[index][2] == null){
        console.log("null points found in input file");
      }else{
        if(vertices[index][1] - yOffset > 2 && top == false){
          //  console.log(index)
        }
        points3d.push(new THREE.Vector3(zOffSet + vertices[index][0], vertices[index][1] - yOffset, xOffSet - vertices[index][2]));
      }
    }

   
    if(normaliseYvalues){
      if(top){ //if top points then normalise to top1dAverageY
        for (let point = 0; point < points3d.length; point++) {
          const element = points3d[point];

          let normalisedTopAverageY = top1dAverageY - yOffset;
          let yDiff = element.y - normalisedTopAverageY;

          yOffsetList.push(yDiff);
          element.y = normalisedTopAverageY;
        }
        // console.log('yOffsetList', yOffsetList.length);
        // console.log(yOffsetList);

      }else{ //if bottom points then normalise to bottom1dAverageY
        // console.log('yDiffList', yOffsetList.length);
        // console.log('point3d', points3d.length);

        for (let point = 0; point < points3d.length; point++) {
            const element = points3d[point];
            element.y -= yDiffList[point];
        }
      }
    }

    var geom = new THREE.BufferGeometry().setFromPoints(points3d);
    var cloud = new THREE.Points(
      geom,
      new THREE.PointsMaterial({ color: 0x99ccff, size: 0.05 })
    );
    scene.add(cloud);
    removableObjects.push(cloud);

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

    scene.add(mesh);
    removableObjects.push(mesh);

    return yOffsetList;
  }

  function addConvMesh(vertices, xOffSet, yOffset, zOffSet){
    let positions = [];

    for(let i = 0; i < vertices.length; i++){
      if(vertices[i][0] == null || vertices[i][1] == null || vertices[i][2] == null){
        console.log("null points found in input file");
      }else{
        positions.push( new THREE.Vector3(vertices[i][0] + zOffSet, vertices[i][1] - yOffset, xOffSet - vertices[i][2]));
      }
    }
    
    var geom = new ConvexGeometry(positions);
    const convMaterial = new THREE.MeshPhongMaterial( { color: 0xFF007D, side: THREE.BackSide } ) //map: texture

    convMesh = new THREE.Mesh( geom, convMaterial );
    convMesh.position.set(0,0,0);
    // convMesh.backSided = true;

    scene.add( convMesh );
    console.log(convMesh);
  }



function clearScene(){  // clear scene of all removable objects ie. objects from rendering a map before adding a new one
  if( removableObjects.length > 0 ) {
    removableObjects.forEach(function(v) {
      v.material.dispose();
      v.geometry.dispose();
      scene.remove(v);
    });
    removableObjects = null;
    removableObjects = [];
  }
  if( points2dOutline.length > 0 ) {
    points2dOutline.forEach(function(v) {
      v.material.dispose();
      v.geometry.dispose();
      scene.remove(v);
    });
    points2dOutline = null;
    points2dOutline = [];
  }
}

export function toggleMapVisibility(toggleVal){ // toggle visibility of the map
    removableObjects.forEach(function(v) {
      v.visible = toggleVal;
    });
}

export function toggleMapOutlineVisibility(toggleVal){  // toggle visibility of the outline/border of the map
    points2dOutline.forEach(function(v) {
      v.visible = toggleVal;
    });
}
