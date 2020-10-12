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

    const dataURL = canvas.toDataURL();
    FaceExtension.reportImage(dataURL);
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
    /*
    `predictions` is an array of objects describing each detected face, for example:

    [
      {
        faceInViewConfidence: 1, // The probability of a face being present.
        boundingBox: { // The bounding box surrounding the face.
          topLeft: [232.28, 145.26],
          bottomRight: [449.75, 308.36],
        },
        mesh: [ // The 3D coordinates of each facial landmark.
          [92.07, 119.49, -17.54],
          [91.97, 102.52, -30.54],
          ...
        ],
        scaledMesh: [ // The 3D coordinates of each facial landmark, normalized.
          [322.32, 297.58, -17.54],
          [322.18, 263.95, -30.54]
        ],
        annotations: { // Semantic groupings of the `scaledMesh` coordinates.
          silhouette: [
            [326.19, 124.72, -3.82],
            [351.06, 126.30, -3.00],
            ...
          ],
          ...
        }
      }
    ]
    */

      // for (let i = 0; i < predictions.length; i++) {
      const leftCheek = predictions[0].scaledMesh[234];
      const rightCheek = predictions[0].scaledMesh[454];
      const forehead = predictions[0].scaledMesh[10];
      const chin = predictions[0].scaledMesh[152];
      const leftEyeInnerCorner = predictions[0].scaledMesh[133];
      const rightEyeInnerCorner = predictions[0].scaledMesh[362];
      const mouthTop = predictions[0].scaledMesh[0];
      const mouthBottom = predictions[0].scaledMesh[17];

      const leftEyeTop = predictions[0].scaledMesh[159];
      const leftEyeBottom = predictions[0].scaledMesh[145];

      const rightEyeTop = predictions[0].scaledMesh[386];
      const rightEyeBottom = predictions[0].scaledMesh[374];


      const newObj = {"leftCheek" : {x: leftCheek[0] + 480, y: leftCheek[1], z: leftCheek[2]},
                      "rightCheek" : {x : rightCheek[0] + 480, y: rightCheek[1], z: rightCheek[2]},
                      "forehead": {x : forehead[0] + 480, y: forehead[1], z: forehead[2]},
                      "chin": {x : chin[0] + 480, y: chin[1], z: chin[2]},
                      "leftEyeInnerCorner": {x : leftEyeInnerCorner[0]+ 480, y: leftEyeInnerCorner[1], z: leftEyeInnerCorner[2]},
                      "rightEyeInnerCorner": {x : rightEyeInnerCorner[0]+ 480, y: rightEyeInnerCorner[1], z: rightEyeInnerCorner[2]},
                      "mouthTop": {x : mouthTop[0]+ 480, y: mouthTop[1], z: mouthTop[2]},
                      "mouthBottom": {x : mouthBottom[0]+ 480, y: mouthBottom[1], z: mouthBottom[2]},
                      "leftEyeTop": {x : leftEyeTop[0]+ 480, y: leftEyeTop[1], z: leftEyeTop[2]},
                      "leftEyeBottom": {x : leftEyeBottom[0]+ 480, y: leftEyeBottom[1], z: leftEyeBottom[2]},
                      "rightEyeTop": {x : rightEyeTop[0]+ 480, y: rightEyeTop[1], z: rightEyeTop[2]},
                      "rightEyeBottom": {x : rightEyeBottom[0]+ 480, y: rightEyeBottom[1], z: rightEyeBottom[2]}
                      };

      FaceExtension.reportResult(JSON.stringify(newObj));
      // const [x, y, z] = keypoints[10];
      // FaceExtension.reportResult(JSON.stringify([x, y, z]));

      // Log facial keypoints.
      // for (let i = 0; i < keypoints.length; i++) {
      //   const [x, y, z] = keypoints[i];

      //   console.log(`Keypoint ${i}: [${x}, ${y}, ${z}]`);
      // }
    // }
  }



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