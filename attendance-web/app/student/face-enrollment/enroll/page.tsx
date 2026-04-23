'use client';
import { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';

export default function FaceEnrollment() {
  const webcamRef = useRef<Webcam>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('กรุณาวางใบหน้าในวงกลม');
  const [capturedVectors, setCapturedVectors] = useState<any[]>([]);

  // จำลองการดึง Vector เมื่อหันหน้า (ในเครื่องบอสต้องส่งไปที่ Python api.py)
  const captureStep = async () => {
    if (progress >= 100) return;

    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // 🚀 ส่งไปให้ Python สกัด Vector
      const res = await fetch('http://localhost:8000/api/extract-vector', {
        method: 'POST',
        body: JSON.stringify({ image: imageSrc }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      
      if (data.success) {
        setCapturedVectors(prev => [...prev, data.vector]);
        setProgress(prev => prev + 20); // เก็บสัก 5 มุม (ตรง, ซ้าย, ขวา, ก้ม, เงย)
        setStatus(progress < 80 ? 'ค่อยๆ หันหน้าช้าๆ...' : 'เรียบร้อย!');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <h1 className="text-2xl font-black mb-2">Face ID Enrollment</h1>
      <p className="text-slate-400 mb-8">{status}</p>

      {/* 📸 กรอบวงกลมแบบ Face ID */}
      <div className="relative w-72 h-72">
        <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
        
        {/* Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="144" cy="144" r="140"
            fill="transparent"
            stroke="#2563eb"
            strokeWidth="8"
            strokeDasharray={880}
            strokeDashoffset={880 - (880 * progress) / 100}
            className="transition-all duration-500"
          />
        </svg>

        <div className="absolute inset-2 rounded-full overflow-hidden bg-black">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
            videoConstraints={{ facingMode: "user" }}
          />
        </div>
      </div>

      <button 
        onClick={captureStep}
        className="mt-12 bg-white text-black px-8 py-4 rounded-full font-black hover:scale-105 transition-all"
      >
        {progress === 0 ? 'เริ่มลงทะเบียน' : `กำลังเก็บข้อมูล ${progress}%`}
      </button>
    </div>
  );
}