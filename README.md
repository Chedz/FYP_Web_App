## Three Web App - point cloud rendering within a web browser

Uses a Three.js boilerplate. 

Scene declaration and data fetching all occurs within src/index.js. Point cloud data is uploaded and retrieved from a Rest API server, see: https://github.com/Chedz/FYP_backend

Point cloud data is created by a localisation and mapping device mounted on top a quadcopter for Autonomous UAV SLAM, see: https://github.com/Chedz/FYP_RPI4

Combining these three individual repositorys and devices to run them results in a harmonious system for autonomously mapping indoor, GPS-denied environments and allowing a user to access and view the collected map data from their phone, laptop or any device containing a modern web browser.

## Package versions

- dat.gui: ^0.7.9
- three: 0.145.0
- parcel: ^2.7.0

## How to run locally

1. npm i
2. make dev

## NOTE: 
must start the API server on localhost in order to access map data to render in the web application
