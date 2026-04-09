'use client';
import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

export default function AttendancePage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [status, setStatus] = useState('กำลังเตรียมความพร้อมของ AI...');
    const [isLoading, setIsLoading] = useState(true);
    
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 1. โหลดโมเดลทันทีที่เปิดหน้าเว็บ
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                ]);
                setIsLoading(false);
                setStatus('✅ ระบบพร้อมใช้งาน กรุณาอัปโหลดรูปภาพ');
            } catch (err) {
                console.error("Model load error:", err);
                setStatus('❌ โหลดโมเดลไม่สำเร็จ ตรวจสอบไฟล์ใน public/models');
            }
        };
        loadModels();
    }, []);

    // 2. จัดการเมื่อมีการเลือกไฟล์
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            // สร้าง URL สำหรับแสดงรูป Preview
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            
            // ล้างกรอบเก่าบน Canvas
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
            setStatus('🖼️ รูปภาพพร้อมแล้ว กดปุ่ม "เช็คชื่อ" ได้เลย');
        }
    };

    // 3. ฟังก์ชันหลัก: ตีกรอบหน้า + เช็คชื่อ
    const handleAttendance = async () => {
        if (!selectedFile || !imageRef.current || !canvasRef.current) {
            return alert('กรุณาเลือกรูปภาพก่อนครับบอส');
        }

        try {
            setStatus('⏳ AI กำลังวิเคราะห์ใบหน้าและตรวจสอบตัวตน...');

            // --- ขั้นตอนที่ 1: ตีกรอบใบหน้า ---
            const detection = await faceapi
                .detectSingleFace(imageRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks();

            if (!detection) {
                setStatus('❌ ไม่พบใบหน้าในรูปภาพ กรุณาใช้รูปที่เห็นหน้าชัดเจน');
                return;
            }

            // ตั้งค่าขนาด Canvas ให้เท่ากับรูปภาพที่แสดงจริง
            const displaySize = { 
                width: imageRef.current.clientWidth, 
                height: imageRef.current.clientHeight 
            };
            faceapi.matchDimensions(canvasRef.current, displaySize);
            
            // ปรับขนาดผลลัพธ์ให้ตรงกับรูปบนจอ
            const resizedDetection = faceapi.resizeResults(detection, displaySize);
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, displaySize.width, displaySize.height);

            // วาดกรอบสี่เหลี่ยม
            faceapi.draw.drawDetections(canvasRef.current, resizedDetection);

            // --- ขั้นตอนที่ 2: ส่งไปเช็คชื่อกับ Python Backend ---
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await fetch('http://localhost:8000/api/check-attendance', {
                method: 'POST',
                body: formData
            });
            const result = await res.json();

            if (result.success && result.match) {
                setStatus(`✅ เช็คชื่อสำเร็จ! ยินดีต้อนรับ: ${result.studentName}`);
                
                // วาดชื่อนักศึกษาทับลงบนกรอบ
                const drawBox = new faceapi.draw.DrawBox(resizedDetection.detection.box, { 
                    label: result.studentName,
                    boxColor: '#00ff00' 
                });
                drawBox.draw(canvasRef.current);
            } else {
                setStatus('❌ ไม่พบข้อมูลนักศึกษา หรือใบหน้าไม่ตรงกับในระบบ');
                const drawBox = new faceapi.draw.DrawBox(resizedDetection.detection.box, { 
                    label: "Unknown",
                    boxColor: '#ff0000' 
                });
                drawBox.draw(canvasRef.current);
            }

        } catch (err) {
            console.error("Attendance error:", err);
            setStatus('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ Backend');
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-slate-50 p-10 font-sans">
            <h1 className="text-3xl font-bold mb-8 text-slate-800">ระบบเช็คชื่อเข้าเรียน (Face Recognition)</h1>

            {/* ส่วนควบคุมการอัปโหลด */}
            <div className="flex flex-col gap-4 bg-white p-8 rounded-2xl shadow-lg border border-slate-200 w-full max-w-xl mb-10">
                <label className="text-slate-600 font-medium">เลือกรูปภาพนักศึกษาเพื่อเช็คชื่อ:</label>
                <div className="flex items-center gap-4">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <button 
                        onClick={handleAttendance}
                        disabled={isLoading || !selectedFile}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl font-bold disabled:bg-slate-300 transition-all shadow-md"
                    >
                        เช็คชื่อ
                    </button>
                </div>
                <p className={`text-sm font-semibold ${status.includes('✅') ? 'text-green-600' : 'text-blue-600'}`}>
                    {status}
                </p>
            </div>

            {/* ส่วนแสดงรูปและกรอบใบหน้า */}
            {previewUrl && (
                <div className="relative inline-block border-8 border-white rounded-3xl shadow-2xl overflow-hidden bg-slate-200">
                    <img 
                        ref={imageRef}
                        src={previewUrl} 
                        alt="Preview" 
                        className="max-w-full md:max-w-2xl block h-auto"
                        onLoad={() => {
                            // เตรียมขนาด Canvas ให้พร้อมเมื่อรูปโหลดเข้าจอ
                            if (imageRef.current && canvasRef.current) {
                                canvasRef.current.width = imageRef.current.clientWidth;
                                canvasRef.current.height = imageRef.current.clientHeight;
                            }
                        }}
                    />
                    {/* Canvas สำหรับวาดกรอบหน้า (ซ้อนทับรูป) */}
                    <canvas 
                        ref={canvasRef}
                        className="absolute top-0 left-0 pointer-events-none"
                    />
                </div>
            )}
        </div>
    );
}