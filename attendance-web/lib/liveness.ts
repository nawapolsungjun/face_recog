// lib/liveness.ts
import * as faceapi from 'face-api.js';

/**
 * 1. คำนวณระยะห่างขอบตา (Eye Aspect Ratio - EAR)
 * ใช้สำหรับตรวจจับการกระพริบตา
 */
export const calculateEAR = (landmarks: faceapi.FaceLandmarks68) => {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const getEAR = (eye: faceapi.Point[]) => {
    // คำนวณระยะแนวตั้ง 2 เส้น
    const v1 = Math.sqrt(Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2));
    const v2 = Math.sqrt(Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2));
    // คำนวณระยะแนวนอน
    const h = Math.sqrt(Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2));
    return (v1 + v2) / (2.0 * h);
  };

  const ear = (getEAR(leftEye) + getEAR(rightEye)) / 2;
  
  // ปรับ Threshold: ค่า EAR ปกติคนลืมตาจะอยู่ที่ ~0.25 - 0.30 
  // ถ้าหลับตาจะลดลงต่ำกว่า 0.20
  // แก้ไข: ใช้ 0.22 เพื่อให้จับการกระพริบตาได้ง่ายขึ้น
  return ear; 
};

/**
 * 2. ตรวจสอบการหันหน้า (Head Pose)
 * ใช้สัดส่วนระยะห่างจมูกถึงแก้มซ้าย-ขวา
 */
export const checkHeadPose = (landmarks: faceapi.FaceLandmarks68) => {
  const nose = landmarks.getNose()[0]; // จุดดั้งจมูก
  const leftCheek = landmarks.getJawOutline()[0]; // จุดกรามซ้ายสุด
  const rightCheek = landmarks.getJawOutline()[16]; // จุดกรามขวาสุด

  const distLeft = Math.abs(nose.x - leftCheek.x);
  const distRight = Math.abs(nose.x - rightCheek.x);
  
  // สัดส่วนระยะซ้ายเทียบขวา
  const ratio = distLeft / distRight;

  // ปรับ Threshold ให้หันไม่ต้องเยอะก็ผ่าน:
  // หันซ้าย: ระยะขวาจะน้อยลง ทำให้ ratio มากขึ้น (เดิม 2.2 -> แก้เป็น 1.8)
  if (ratio > 1.8) return 'LEFT';
  
  // หันขวา: ระยะซ้ายจะน้อยลง ทำให้ ratio น้อยลง (เดิม 0.45 -> แก้เป็น 0.55)
  if (ratio < 0.55) return 'RIGHT';
  
  return 'CENTER';
};