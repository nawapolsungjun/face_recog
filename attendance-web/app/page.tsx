'use client';
import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

export default function AttendancePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('กำลังเตรียมความพร้อม...');
  const [isLoading, setIsLoading] = useState(true);

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. โหลดโมเดล
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        setIsLoading(false);
        setStatus(' ระบบพร้อมใช้งาน กรุณาอัปโหลดรูปภาพ');
      } catch (err) {
        console.error("Model load error:", err);
        setStatus(' โหลดโมเดลไม่สำเร็จ ตรวจสอบไฟล์ใน public/models');
      }
    };
    loadModels();
  }, []);

  // 2. จัดการเมื่อเลือกไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setStatus(' รูปภาพพร้อมแล้ว กดปุ่ม "เช็คชื่อ" ได้เลย');
    }
  };

  // 3. ฟังก์ชันหลัก: เช็คชื่อกลุ่ม + วาดกรอบแบบ Scaling
  const handleAttendance = async () => {
    if (!selectedFile || !imageRef.current || !canvasRef.current) return;

    const image = imageRef.current;
    const canvas = canvasRef.current;
    setIsLoading(true);
    setStatus(' กำลังสแกนใบหน้ากลุ่ม...');

    try {
      // ตรวจจับพิกัดจากขนาดรูปจริง (Natural Size)
      const detections = await faceapi.detectAllFaces(image).withFaceLandmarks();

      if (!detections || detections.length === 0) {
        setStatus(' ไม่พบใบหน้า');
        setIsLoading(false);
        return;
      }

      const boxes = detections.map((d: any) => ({
        x: d.detection.box.x,
        y: d.detection.box.y,
        width: d.detection.box.width,
        height: d.detection.box.height
      }));

      // ส่งข้อมูลไป Python API
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('boxes', JSON.stringify(boxes));

      const response = await fetch('http://localhost:8000/api/check-attendance-group', {
        method: 'POST',
        body: formData,
      });

      const apiResult = await response.json();

      // --- ส่วนการวาดผลลัพธ์แบบคำนวณ Scale ---
      if (canvas && image) {
        // ตั้งขนาด Canvas ให้เท่ากับขนาดที่ "แสดงผลบนจอ" (Display Size)
        canvas.width = image.clientWidth;
        canvas.height = image.clientHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          //  คำนวณ Ratio ระหว่างรูปจริงกับรูปบนจอ
          const scaleX = image.clientWidth / image.naturalWidth;
          const scaleY = image.clientHeight / image.naturalHeight;

          boxes.forEach((box: any, index: number) => {
            const studentName = apiResult.matches && apiResult.matches[index] ? apiResult.matches[index] : null;
            const isMatched = studentName !== null && studentName !== undefined; //สถานะการ Match
            if (ctx) {
              // ตั้งสี: เขียวถ้าเจอ, แดงถ้าไม่เจอ
              ctx.strokeStyle = isMatched ? '#22c55e' : '#ef4444';
              ctx.lineWidth = 3;

              // ปรับพิกัด Box ให้เข้ากับ Scale หน้าจอ
              const drawX = box.x * scaleX;
              const drawY = box.y * scaleY;
              const drawW = box.width * scaleX;
              const drawH = box.height * scaleY;

              // วาดกรอบ
              ctx.strokeStyle = isMatched ? '#22c55e' : '#ef4444';
              ctx.lineWidth = 3;
              ctx.strokeRect(drawX, drawY, drawW, drawH);

              // วาดป้ายชื่อ
              const label = isMatched ? studentName : "Unknown";
              ctx.font = 'bold 14px Arial';
              const textWidth = ctx.measureText(label).width;

              ctx.fillStyle = isMatched ? '#22c55e' : '#ef4444';
              ctx.fillRect(drawX, drawY - 22, textWidth + 10, 22);

              ctx.fillStyle = '#ffffff';
              ctx.fillText(label, drawX + 5, drawY - 7);
            }

          });
        }
      }

      setStatus(` ตรวจพบ ${boxes.length} ใบหน้า`);
    } catch (err: any) {
      console.error(err);
      setStatus(` Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-50 p-10 font-sans">
      <h1 className="text-3xl font-bold mb-8 text-slate-800">เช็คชื่อเข้าเรียน</h1>

      <div className="flex flex-col gap-4 bg-white p-8 rounded-2xl shadow-lg border border-slate-200 w-full max-w-xl mb-10">
        <label className="text-slate-600 font-medium">เลือกรูปภาพเพื่อเช็คชื่อ:</label>
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
        <p className={`text-sm font-semibold ${status.includes('') ? 'text-green-600' : 'text-blue-600'}`}>
          {status}
        </p>
      </div>


      {previewUrl && (
        <div className="flex justify-center w-full mt-5">
          <div className="relative inline-block bg-white p-2 rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <img
              ref={imageRef}
              src={previewUrl}

              className="block max-w-full md:max-w-2xl h-auto rounded-lg"
              alt="Preview"
            />
            <canvas
              ref={canvasRef}

              className="absolute top-2 left-2 pointer-events-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}