// -*- mode: javascript; js-indent-level: 2; -*-
// Copyright © 2019 MIT, All rights reserved.

"use strict";

console.log("FaceExtension using tfjs-core version " + tf.version_core);
console.log("FaceExtension using tfjs-converter version " + tf.version_converter);

const ERROR_WEBVIEW_NO_MEDIA = 400;
const ERROR_MODEL_LOAD = 401;
var videoWidth = 300;
var videoHeight = 250;

const ERRORS = {
  400: "WebView does not support navigator.mediaDevices",
  401: "Unable to load model"
};

let forwardCamera = true;
let running = false;

async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    PosenetExtension.error(ERROR_WEBVIEW_NO_MEDIA,
      ERRORS[ERROR_WEBVIEW_NO_MEDIA]);
    return;
  }

  const video = document.getElementById('video');
  video.width = 0;
  video.height = 0;

  video.srcObject = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: forwardCamera ? 'user' : 'environment'
    }
  });

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    }
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();
  return video;
}

let stop = false;

function runClassifier(video, net) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function classifyFrame() {
    const predictions = await net.estimateFaces(video, false, true);

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    ctx.save();
    ctx.scale(forwardCamera ? -1 : 1, 1);
    ctx.translate(forwardCamera ? -videoWidth : 0, 0);
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.restore();

    // FaceExtension.reportImage(dataURL);
    // if predictions.length > 0 {
    // FaceExtension.reportResult(JSON.stringify(predictions));
    // }
    // if predictions.length > 0 {
      // for (let i = 0; i < predictions.length; i++) {
      //   const keypoints = predictions[i].scaledMesh;

      //   // Log facial keypoints.
      //   for (let i = 0; i < keypoints.length; i++) {
      //     const [x, y, z] = keypoints[i];

      //     console.log(`Keypoint ${i}: [${x}, ${y}, ${z}]`);
      //   }
      // }
      // FaceExtension.reportResult(JSON.stringify(predictions[0].scaledMesh));
    // }

    if (predictions.length > 0) {
      // for (let i = 0; i < predictions.length; i++) {
      const rightCheek = predictions[0].scaledMesh[234];
      const leftCheek = predictions[0].scaledMesh[454];
      const forehead = predictions[0].scaledMesh[10];
      const chin = predictions[0].scaledMesh[152];
      const rightEyeInnerCorner = predictions[0].scaledMesh[133];
      const leftEyeInnerCorner = predictions[0].scaledMesh[362];
      const mouthTop = predictions[0].scaledMesh[0];
      const mouthBottom = predictions[0].scaledMesh[17];

      const rightEyeTop = predictions[0].scaledMesh[159];
      const rightEyeBottom = predictions[0].scaledMesh[145];

      const leftEyeTop = predictions[0].scaledMesh[386];
      const leftEyeBottom = predictions[0].scaledMesh[374];

      const rightEarStart = predictions[0].scaledMesh[67];
      const leftEarStart = predictions[0].scaledMesh[297];

      const rightEarEnd = predictions[0].scaledMesh[148];
      const leftEarEnd = predictions[0].scaledMesh[377];

      const rightNoseTop = predictions[0].scaledMesh[188];
      const leftNoseTop = predictions[0].scaledMesh[412];

      const newObj = {"leftCheek" : {x: leftCheek[0] + 480, y: leftCheek[1]-20, z: leftCheek[2]},
                      "rightCheek" : {x : rightCheek[0] + 480, y: rightCheek[1]-20, z: rightCheek[2]},
                      "forehead": {x : forehead[0] + 480, y: forehead[1]-20, z: forehead[2]},
                      "chin": {x : chin[0] + 480, y: chin[1]-20, z: chin[2]},
                      "leftEyeInnerCorner": {x : leftEyeInnerCorner[0]+ 480, y: leftEyeInnerCorner[1]-20, z: leftEyeInnerCorner[2]},
                      "rightEyeInnerCorner": {x : rightEyeInnerCorner[0]+ 480, y: rightEyeInnerCorner[1]-20, z: rightEyeInnerCorner[2]},
                      "mouthTop": {x : mouthTop[0]+ 480, y: mouthTop[1]-20, z: mouthTop[2]},
                      "mouthBottom": {x : mouthBottom[0]+ 480, y: mouthBottom[1]-20, z: mouthBottom[2]},
                      "leftEyeTop": {x : leftEyeTop[0]+ 480, y: leftEyeTop[1]-20, z: leftEyeTop[2]},
                      "leftEyeBottom": {x : leftEyeBottom[0]+ 480, y: leftEyeBottom[1]-20, z: leftEyeBottom[2]},
                      "rightEyeTop": {x : rightEyeTop[0]+ 480, y: rightEyeTop[1]-20, z: rightEyeTop[2]},
                      "rightEyeBottom": {x : rightEyeBottom[0]+ 480, y: rightEyeBottom[1]-20, z: rightEyeBottom[2]},
                      "rightEarStart": {x : rightEarStart[0]+ 480, y: rightEarStart[1]-20, z: rightEarStart[2]},
                      "leftEarStart": {x : leftEarStart[0]+ 480, y: leftEarStart[1]-20, z: leftEarStart[2]},
                      "rightEarEnd": {x : rightEarEnd[0]+ 480, y: rightEarEnd[1]-20, z: rightEarEnd[2]},
                      "leftEarEnd": {x : leftEarEnd[0]+ 480, y: leftEarEnd[1]-20, z: leftEarEnd[2]},
                      "rightNoseTop": {x : rightNoseTop[0]+ 480, y: rightNoseTop[1]-20, z: rightNoseTop[2]},
                      "leftNoseTop": {x : leftNoseTop[0]+ 480, y: leftNoseTop[1]-20, z: leftNoseTop[2]}
                      };

      FaceExtension.reportResult(JSON.stringify(newObj));
    }

    const dataURL = canvas.toDataURL();
    FaceExtension.reportImage(dataURL);


    if (!stop) requestAnimationFrame(classifyFrame);
  }

  return classifyFrame();
}

async function loadModel() {
  try {
    return facemesh.load({
      maxFaces: 1
    });
  } catch (e) {
    FaceExtension.error(ERROR_MODEL_LOAD,
      ERRORS[ERROR_MODEL_LOAD]);
    throw e;
  }
}

let net = null;

async function runModel() {
  let video;

  try {
    video = await loadVideo();
  } catch (e) {
    FaceExtension.error(ERROR_WEBVIEW_NO_MEDIA,
      ERRORS[ERROR_WEBVIEW_NO_MEDIA]);
    throw e;
  }

  running = true;
  return runClassifier(video, net);
}

async function startVideo() {
  console.log('startVideo called');
  stop = false;
  return runModel();
}

// noinspection JSUnusedGlobalSymbols
function stopVideo() {
  console.log('stopVideo called');
  stop = true;
  running = false;
}

// noinspection JSUnusedGlobalSymbols
function setCameraFacingMode(useForward) {
  console.log('setCameraFacingMode(' + useForward + ')');
  forwardCamera = useForward;
  stop = true;
  requestAnimationFrame(() => {
    // noinspection JSIgnoredPromiseFromCall
    startVideo();
  })
}

// noinspection JSUnresolvedVariable
navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

loadModel().then(model => {
  net = model;
  FaceExtension.ready();
});

    // [
    //   {
    //     faceInViewConfidence: 1, // The probability of a face being present.
    //     boundingBox: { // The bounding box surrounding the face.
    //       topLeft: [232.28, 145.26],
    //       bottomRight: [449.75, 308.36],
    //     },
    //     mesh: [ // The 3D coordinates of each facial landmark.
    //       [92.07, 119.49, -17.54],
    //       [91.97, 102.52, -30.54],
    //       ...
    //     ],
    //     scaledMesh: [ // The 3D coordinates of each facial landmark, normalized.
    //       [322.32, 297.58, -17.54],
    //       [322.18, 263.95, -30.54]
    //     ],
    //     annotations: { // Semantic groupings of the `scaledMesh` coordinates.
    //       silhouette: [
    //         [326.19, 124.72, -3.82],
    //         [351.06, 126.30, -3.00],
    //         ...
    //       ],
    //       ...
    //     }
    //   }
    // ]
    // */