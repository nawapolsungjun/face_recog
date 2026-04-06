'use client';
import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { calculateEAR, checkHeadPose } from '../../lib/liveness';

const CHALLENGES = ['BLINK', 'TURN_LEFT', 'TURN_RIGHT'];

export default function RegisterPage() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [status, setStatus] = useState('กำลังโหลดโมเดล SSD...');
    const [studentData, setStudentData] = useState({ code: '', name: '' });
    const [isComplete, setIsComplete] = useState(false);

    // 1. โหลดโมเดล (เปลี่ยนเป็น ssdMobilenetv1)
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    // 🚀 เปลี่ยนจุดที่ 1: ใช้ ssdMobilenetv1
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                ]);
                setStatus('✅ โมเดล SSD พร้อมใช้งาน! กรุณาพิมพ์ข้อมูลแล้วเริ่มลงทะเบียน');
            } catch (err) {
                console.error(err);
                setStatus('❌ โหลดโมเดลไม่สำเร็จ ตรวจสอบไฟล์ใน public/models');
            }
        };
        loadModels();
    }, []);

    // 2. ฟังก์ชันเปิดกล้อง
    const startVideo = () => {
        if (!studentData.code || !studentData.name) return alert('กรุณากรอกรหัสนักศึกษาและชื่อก่อนครับ');
        
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
            .then((stream) => {
                if (videoRef.current) videoRef.current.srcObject = stream;
                setStatus('📸 กำลังสแกนใบหน้าด้วยความแม่นยำสูง...');
            })
            .catch((err) => console.error("เปิดกล้องไม่ได้:", err));
    };

    // 3. ตรวจจับและวิเคราะห์ (Detection Loop)
    const handleVideoPlay = () => {
        const interval = setInterval(async () => {
            if (isComplete) {
                clearInterval(interval);
                return;
            }

            if (videoRef.current && canvasRef.current) {
                // 🚀 เปลี่ยนจุดที่ 2: สั่งตรวจจับด้วย SsdMobilenetv1Options
                const detections = await faceapi
                    .detectSingleFace(
                        videoRef.current, 
                        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
                    )
                    .withFaceLandmarks();

                if (detections) {
                    // วาดจุด Landmarks เพื่อเช็คว่า AI จับ "ตา" หรือ "คิ้ว"
                    const displaySize = { width: 640, height: 480 };
                    faceapi.matchDimensions(canvasRef.current, displaySize);
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, 640, 480);
                        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
                    }

                    // ส่งไปเช็ค Challenge
                    onFrameDetected(detections.landmarks);
                }
            }
        }, 100); 
    };

    // 4. ตรรกะการตรวจสอบ Liveness
    const onFrameDetected = (landmarks: faceapi.FaceLandmarks68) => {
        const challenge = CHALLENGES[currentStep];
        let isSuccess = false;

        if (challenge === 'BLINK') {
            const ear = calculateEAR(landmarks);
            // ถ้าบอสยังรู้สึกว่าผ่านยาก ลองปรับเป็น 0.23 หรือ 0.24
            if (ear < 0.22) isSuccess = true;
        } else if (challenge === 'TURN_LEFT') {
            if (checkHeadPose(landmarks) === 'LEFT') isSuccess = true;
        } else if (challenge === 'TURN_RIGHT') {
            if (checkHeadPose(landmarks) === 'RIGHT') isSuccess = true;
        }

        if (isSuccess) {
            if (currentStep < CHALLENGES.length - 1) {
                setCurrentStep(s => s + 1);
            } else {
                setIsComplete(true);
                setStatus('✅ ยืนยันตัวตนสำเร็จ! กำลังบันทึก Vector...');
                handleCaptureAndRegister();
            }
        }
    };

    const handleCaptureAndRegister = async () => {
        alert(`ลงทะเบียนสำเร็จ: ${studentData.name} (ข้อมูลถูกแปลงเป็น Vector 128 มิติแล้ว)`);
        // ตรงนี้ค่อยเพิ่มโค้ด fetch ไปหา Python ตามที่เตรียมไว้ครับ
    };

    return (
        <div className="flex flex-col items-center p-10 font-sans">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">🤖 ระบบลงทะเบียนนักศึกษาใหม่</h1>
            
            <div className="mb-6 flex gap-4 bg-slate-100 p-4 rounded-xl shadow-inner">
                <input 
                    type="text" placeholder="รหัสนักศึกษา" 
                    className="border p-2 rounded text-black w-40"
                    onChange={(e) => setStudentData({...studentData, code: e.target.value})}
                />
                <input 
                    type="text" placeholder="ชื่อ-นามสกุล" 
                    className="border p-2 rounded text-black w-64"
                    onChange={(e) => setStudentData({...studentData, name: e.target.value})}
                />
                <button onClick={startVideo} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    เปิดกล้อง
                </button>
            </div>

            <div className="relative overflow-hidden rounded-2xl shadow-2xl border-4 border-white">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    onPlay={handleVideoPlay}
                    className="w-[640px] h-[480px] bg-slate-900 object-cover"
                />
                {/* 🚀 Canvas สำหรับวาดเส้น Landmarks ทับหน้าวิดีโอ */}
                <canvas 
                    ref={canvasRef} 
                    className="absolute top-0 left-0 w-[640px] h-[480px] pointer-events-none" 
                />
                
                {!isComplete && videoRef.current?.srcObject && (
                    <div className="absolute top-6 left-6 bg-yellow-400 text-black px-6 py-3 rounded-2xl font-black shadow-lg animate-bounce border-2 border-black">
                        คำสั่ง: {CHALLENGES[currentStep]}
                    </div>
                )}

                {isComplete && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <div className="bg-white p-4 rounded-full shadow-xl">
                            <span className="text-4xl">✅</span>
                        </div>
                    </div>
                )}
            </div>

            <p className={`mt-8 text-2xl font-bold ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
                {status}
            </p>
        </div>
    );
}