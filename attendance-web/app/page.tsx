'use client';
import { useState, useRef, useEffect } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export default function AttendancePage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const landmarkerRef = useRef<FaceLandmarker | null>(null);

    // 1. Initial MediaPipe
    useEffect(() => {
        const initMediaPipe = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "/models/face_landmarker.task",
                        delegate: "CPU" 
                    },
                    runningMode: "IMAGE",
                    numFaces: 10
                });
                console.log("MediaPipe Engine Loaded ✅");
            } catch (err) {
                console.error("MediaPipe Init Error:", err);
                setStatus('❌ โหลดโมเดล AI ไม่สำเร็จ');
            }
        };
        initMediaPipe();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setStatus('');
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
    };

    // 2. ฟังก์ชันหลัก: เช็คชื่อกลุ่ม (พร้อมเกราะป้องกัน)
    const handleAttendance = async () => {
        if (!selectedFile || !imageRef.current || !canvasRef.current || !landmarkerRef.current) {
            alert('ระบบยังไม่พร้อมครับบอส');
            return;
        }

        const image = imageRef.current;
        setIsLoading(true);
        setStatus('⏳ กำลังสแกนใบหน้าด้วย MediaPipe...');

        try {
            // สร้าง Canvas ลับเพื่อสกัดพิกเซล
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = image.naturalWidth;
            offscreenCanvas.height = image.naturalHeight;
            const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
            
            if (!offscreenCtx) throw new Error("Canvas Context Failed");
            offscreenCtx.drawImage(image, 0, 0);

            // ปล่อย Thread ว่างชั่วครู่
            await new Promise(resolve => setTimeout(resolve, 100));

            // สั่ง AI Detect
            const result = await new Promise<any>((resolve, reject) => {
                setTimeout(() => {
                    try {
                        if (!landmarkerRef.current) return reject("No Landmarker Instance");
                        const detection = landmarkerRef.current.detect(offscreenCanvas);
                        resolve(detection);
                    } catch (e) {
                        reject(e);
                    }
                }, 0);
            });

            if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
                setStatus('❌ ไม่พบใบหน้าในรูปภาพครับ');
                setIsLoading(false);
                return;
            }

            // คำนวณพิกัดสี่เหลี่ยม
            const boxes = result.faceLandmarks.map((landmarks: any) => {
                const xs = landmarks.map((l: any) => l.x * image.width);
                const ys = landmarks.map((l: any) => l.y * image.height);
                return {
                    x: Math.min(...xs),
                    y: Math.min(...ys),
                    width: Math.max(...xs) - Math.min(...xs),
                    height: Math.max(...ys) - Math.min(...ys)
                };
            });

            // 🚀 ส่งไปให้ Python ประมวลผล
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('boxes', JSON.stringify(boxes));

            setStatus('⏳ กำลังตรวจสอบรายชื่อกับฐานข้อมูล...');
            const response = await fetch('http://localhost:8000/api/check-attendance-group', {
                method: 'POST',
                body: formData,
            });

            const apiResult = await response.json();

            // --- 🛡️ [เกราะป้องกัน] ตรวจสอบความถูกต้องของข้อมูลจาก API ---
            if (!apiResult.success || !apiResult.matches) {
                console.error("Server Error:", apiResult.error);
                setStatus(`❌ Server Error: ${apiResult.error || 'ไม่ได้รับข้อมูลรายชื่อ'}`);
                setIsLoading(false);
                return; // หยุดทำงานทันทีเพื่อป้องกัน Console Error
            }
            // -------------------------------------------------------

            // วาดผลลัพธ์บน Canvas
            const canvas = canvasRef.current;
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);

            // วนลูปวาดกรอบ (ใช้ Type number เพื่อแก้ปัญหา Implicit any)
            boxes.forEach((box: any, index: number) => {
                const studentName = apiResult.matches[index]; // ปลอดภัยแล้วเพราะเช็คด้านบนแล้ว
                const isMatched = studentName !== null;

                if (ctx) {
                    ctx.strokeStyle = isMatched ? '#22c55e' : '#ef4444';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);

                    const label = isMatched ? studentName : "Unknown";
                    ctx.font = 'bold 18px Arial';
                    const textWidth = ctx.measureText(label).width;
                    
                    ctx.fillStyle = isMatched ? '#22c55e' : '#ef4444';
                    ctx.fillRect(box.x, box.y - 30, textWidth + 10, 30);
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(label, box.x + 5, box.y - 8);
                }
            });

            const foundCount = apiResult.matches.filter((m: any) => m !== null).length;
            setStatus(`✅ พบนักศึกษา ${foundCount} จากทั้งหมด ${boxes.length} ใบหน้า`);

        } catch (err) {
            console.error("Process Error:", err);
            setStatus('❌ เกิดข้อผิดพลาดในระบบสแกนใบหน้า');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-slate-50 p-8">
            <h1 className="text-3xl font-bold mb-8 text-slate-800">MediaPipe Group Attendance</h1>
            
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-4xl border border-slate-200">
                <div className="flex flex-wrap gap-4 mb-8 justify-center items-center">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    <button onClick={handleAttendance} disabled={isLoading || !selectedFile} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-full font-bold shadow-md transition-all disabled:bg-slate-300">
                        {isLoading ? 'Processing...' : 'Start Group Scan'}
                    </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200">
                    {previewUrl && (
                        <>
                            <img ref={imageRef} src={previewUrl} className="block w-full h-auto" alt="Preview" />
                            <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none w-full h-full" />
                        </>
                    )}
                </div>

                {status && (
                    <div className={`mt-6 p-4 rounded-xl text-center font-bold text-lg ${status.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}