import * as faceapi from 'face-api.js';

// 1. คำนวณระยะดวงตา (Blink Detection)
export const calculateEAR = (landmarks: faceapi.FaceLandmarks68) => {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const getEAR = (eye: faceapi.Point[]) => {
    const v1 = Math.sqrt(Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2));
    const v2 = Math.sqrt(Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2));
    const h = Math.sqrt(Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2));
    return (v1 + v2) / (2.0 * h);
  };

  return (getEAR(leftEye) + getEAR(rightEye)) / 2;
};

// 2. ตรวจสอบการหันหน้า (Pose Detection)
export const checkHeadPose = (landmarks: faceapi.FaceLandmarks68) => {
  const nose = landmarks.getNose()[0];
  const leftCheek = landmarks.getJawOutline()[0];
  const rightCheek = landmarks.getJawOutline()[16];

  const distLeft = Math.abs(nose.x - leftCheek.x);
  const distRight = Math.abs(nose.x - rightCheek.x);
  const ratio = distLeft / distRight;

  if (ratio > 2.2) return 'LEFT';
  if (ratio < 0.45) return 'RIGHT';
  return 'CENTER';
};