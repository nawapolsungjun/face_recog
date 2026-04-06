'use client';
import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { calculateEAR, checkHeadPose } from '../lib/liveness';

const CHALLENGES = ['BLINK', 'TURN_LEFT', 'TURN_RIGHT'];

export default function RegisterPage() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null); // เพิ่มไว้สำหรับ Capture รูป
    const [currentStep, setCurrentStep] = useState(0);
    const [status, setStatus] = useState('กำลังโหลดโมเดล...');
    const [studentData, setStudentData] = useState({ code: '', name: '' });
    const [isComplete, setIsComplete] = useState(false);

    // 1. โหลดโมเดลตอนเปิดหน้าเว็บ
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                ]);
                setStatus('✅ โมเดลพร้อมใช้งาน! กรุณาพิมพ์ชื่อแล้วเปิดกล้อง...');
            } catch (err) {
                console.error(err);
                setStatus('❌ โหลดโมเดลไม่สำเร็จ เช็ค Path /public/models');
            }
        };
        loadModels();
    }, []);

    // 2. ฟังก์ชันเปิดกล้อง
    const startVideo = () => {
        if (!studentData.code || !studentData.name) return alert('กรุณากรอกรหัสนักศึกษาและชื่อก่อนครับ');
        
        navigator.mediaDevices.getUserMedia({ video: {} })
            .then((stream) => {
                if (videoRef.current) videoRef.current.srcObject = stream;
                setStatus('📸 กำลังเริ่มการตรวจสอบ Liveness...');
            })
            .catch((err) => console.error("เปิดกล้องไม่ได้:", err));
    };

    // 3. ตัวตรวจสอบเหตุการณ์ (Liveness Logic)
    const onFrameDetected = (landmarks: faceapi.FaceLandmarks68) => {
        if (isComplete) return;

        const challenge = CHALLENGES[currentStep];
        let isSuccess = false;

        if (challenge === 'BLINK') {
            const ear = calculateEAR(landmarks);
            if (ear < 0.2) isSuccess = true;
        } else if (challenge === 'TURN_LEFT' || challenge === 'TURN_RIGHT') {
            const pose = checkHeadPose(landmarks);
            if (pose === (challenge === 'TURN_LEFT' ? 'LEFT' : 'RIGHT')) isSuccess = true;
        }

        if (isSuccess) {
            if (currentStep < CHALLENGES.length - 1) {
                setCurrentStep(s => s + 1);
            } else {
                setIsComplete(true);
                setStatus('✅ ยืนยันตัวตนสำเร็จ! กำลังบันทึกใบหน้า (Vector)...');
                handleCaptureAndRegister();
            }
        }
    };

    // 4. สแกนหน้าวนไป
    const handleVideoPlay = () => {
        const interval = setInterval(async () => {
            if (isComplete) {
                clearInterval(interval);
                return;
            }
            if (videoRef.current && !videoRef.current.paused) {
                const detections = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks();

                if (detections) {
                    onFrameDetected(detections.landmarks);
                }
            }
        }, 150); // ปรับเป็น 150ms เพื่อลดภาระเครื่อง
    };

    // 5. 🏆 ฟังก์ชันสุดท้าย: แคปภาพและส่งไปทำ Vector
    const handleCaptureAndRegister = async () => {
        // ในขั้นตอนนี้ เราจะสั่ง Capture เฟรมปัจจุบันจาก Video แล้วส่งไปที่ Python
        // เพื่อแปลงเป็น Face Encoding (Vector) ตามที่บอสต้องการ
        alert(`ลงทะเบียนสำเร็จ: ${studentData.name} (ในขั้นตอนนี้เราจะส่งไปบันทึกเป็น Vector)`);
    };

    return (
        <div className="flex flex-col items-center p-10 font-sans">
            <h1 className="text-2xl font-bold mb-6">🤖 ลงทะเบียนใหม่ด้วย Liveness</h1>
            
            {/* ส่วนกรอกข้อมูล */}
            <div className="mb-6 flex gap-4">
                <input 
                    type="text" placeholder="รหัสนักศึกษา" 
                    className="border p-2 rounded text-black"
                    onChange={(e) => setStudentData({...studentData, code: e.target.value})}
                />
                <input 
                    type="text" placeholder="ชื่อ-นามสกุล" 
                    className="border p-2 rounded text-black"
                    onChange={(e) => setStudentData({...studentData, name: e.target.value})}
                />
                <button onClick={startVideo} className="bg-blue-600 text-white px-4 py-2 rounded">เริ่มลงทะเบียน</button>
            </div>

            <div className="relative">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    onPlay={handleVideoPlay}
                    className="rounded-lg border-4 border-slate-800 w-[640px] h-[480px] bg-black"
                />
                
                {/* Overlay คำสั่ง */}
                {!isComplete && videoRef.current?.srcObject && (
                    <div className="absolute top-4 left-4 bg-yellow-400 text-black px-4 py-2 rounded-full font-bold animate-pulse shadow-lg">
                        คำสั่ง: {CHALLENGES[currentStep]} 👁️↔️
                    </div>
                )}
            </div>

            <p className={`mt-6 text-xl font-semibold ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
                {status}
            </p>
        </div>
    );
}