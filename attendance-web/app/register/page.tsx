'use client';
import { useState, useRef } from 'react';

export default function RegisterPage() {
    const [studentData, setStudentData] = useState({ code: '', name: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // ฟังก์ชันจัดการการเลือกไฟล์ภาพ
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // ฟังก์ชันหลัก: ส่งรูปไป Python -> เอา Vector กลับมา -> บันทึกลง Prisma
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedFile || !studentData.code || !studentData.name) {
            alert('กรุณากรอกข้อมูลและเลือกรูปภาพให้ครบครับบอส!');
            return;
        }

        setIsLoading(true);
        setStatus('⏳ 1/2: กำลังส่งรูปให้ AI (Python) วิเคราะห์ใบหน้า...');

        try {
            // --- STEP 1: ส่งรูปไปให้ Python API เพื่อสร้าง Vector ---
            const formData = new FormData();
            formData.append('file', selectedFile);

            // หมายเหตุ: URL ต้องตรงกับที่บอสรัน uvicorn (ปกติคือ port 8000)
            const pythonRes = await fetch('http://localhost:8000/api/register-face', {
                method: 'POST',
                body: formData,
            });

            const pythonData = await pythonRes.json();

            if (!pythonData.success) {
                setStatus(`❌ AI หาใบหน้าไม่เจอ: ${pythonData.error}`);
                setIsLoading(false);
                return;
            }

            // --- STEP 2: เอาเลข Vector ที่ได้จาก Python ส่งไปบันทึกที่ Next.js API ---
            setStatus('⏳ 2/2: ได้ข้อมูลจาก AI แล้ว กำลังบันทึกลงฐานข้อมูล...');
            
            const prismaRes = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentCode: studentData.code,
                    name: studentData.name,
                    // ✅ ส่งเลข 128 มิติจาก Python ลง DB โดยตรง (ไม่มี JSON.stringify ซ้อน)
                    faceVectors: { front: pythonData.face_vector } 
                }),
            });

            const prismaData = await prismaRes.json();

            if (prismaData.success) {
                setStatus('✅ ลงทะเบียนนักศึกษาและบันทึกใบหน้าสำเร็จแล้วครับบอส!');
                // ล้างฟอร์ม
                setStudentData({ code: '', name: '' });
                setSelectedFile(null);
                setPreviewUrl(null);
            } else {
                setStatus('❌ บันทึกข้อมูลลง Prisma ไม่สำเร็จ');
            }

        } catch (err) {
            console.error("Registration Error:", err);
            setStatus('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ (เช็คว่ารัน Python API หรือยัง?)');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-slate-50 p-10">
            <h1 className="text-3xl font-bold text-slate-800 mb-8">ระบบลงทะเบียนใบหน้านักศึกษา</h1>

            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-lg border border-slate-200">
                <form onSubmit={handleRegister} className="space-y-6">
                    {/* ข้อมูลนักศึกษา */}
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="รหัสนักศึกษา"
                            className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={studentData.code}
                            onChange={(e) => setStudentData({...studentData, code: e.target.value})}
                            required
                        />
                        <input 
                            type="text" 
                            placeholder="ชื่อ-นามสกุล"
                            className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={studentData.name}
                            onChange={(e) => setStudentData({...studentData, name: e.target.value})}
                            required
                        />
                    </div>

                    {/* เลือกรูปภาพ */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">อัปโหลดรูปหน้าตรง:</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            required
                        />
                    </div>

                    {/* แสดงรูป Preview */}
                    {previewUrl && (
                        <div className="mt-4 flex justify-center">
                            <img src={previewUrl} alt="Preview" className="w-40 h-40 object-cover rounded-2xl border-4 border-blue-100 shadow-md" />
                        </div>
                    )}

                    {/* ปุ่มยืนยัน */}
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                        {isLoading ? '⏳ กำลังประมวลผล...' : 'ยืนยันการลงทะเบียน'}
                    </button>

                    {/* แสดงสถานะ */}
                    {status && (
                        <p className={`text-center text-sm font-bold mt-4 ${status.includes('✅') ? 'text-green-600' : 'text-blue-600'}`}>
                            {status}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}