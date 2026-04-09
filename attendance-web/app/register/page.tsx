'use client';
import { useState } from 'react';

export default function RegisterPage() {
    const [studentData, setStudentData] = useState({ code: '', name: '' });
    //  เปลี่ยนเป็นรองรับหลายไฟล์
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // ฟังก์ชันจัดการการเลือกไฟล์ (หลายรูป)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setSelectedFiles(files);
            // สร้าง URLs สำหรับพรีวิวทุกรูป
            const urls = Array.from(files).map(file => URL.createObjectURL(file));
            setPreviewUrls(urls);
            setStatus(` เลือกรูปภาพทั้งหมด ${files.length} มุมเรียบร้อย`);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedFiles || !studentData.code || !studentData.name) {
            alert('กรุณากรอกข้อมูลและเลือกรูปภาพให้ครบครับบอส!');
            return;
        }

        setIsLoading(true);
        setStatus(` 1/2: กำลังส่งรูปภาพ ${selectedFiles.length} รูป ไปวิเคราะห์...`);

        try {
            // --- STEP 1: ส่งทุกรูปไปให้ Python API ---
            const formData = new FormData();
            formData.append('student_code', studentData.code); // ส่งรหัสไปด้วยเพื่อให้ Python รู้
            
            // วนลูปเพิ่มทุกไฟล์ลงใน FormData
            Array.from(selectedFiles).forEach((file) => {
                formData.append('files', file); 
            });

            //  เรียก API ตัวใหม่ที่รองรับหลายรูป (บอสต้องปรับฝั่ง Python ตามด้วยนะครับ)
            const pythonRes = await fetch('http://localhost:8000/api/register-face-multi', {
                method: 'POST',
                body: formData,
            });

            const pythonData = await pythonRes.json();

            if (!pythonData.success) {
                setStatus(` AI วิเคราะห์พลาด: ${pythonData.error}`);
                setIsLoading(false);
                return;
            }

            // --- STEP 2: บันทึก Vectors ชุดใหญ่ลง Prisma ---
            setStatus(` 2/2: วิเคราะห์ได้ ${pythonData.vector_count} มุม กำลังบันทึกลงฐานข้อมูล...`);
            
            const prismaRes = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentCode: studentData.code,
                    name: studentData.name,
                    //  เก็บเป็น Array ของ Vectors เพื่อความแม่นยำสูงสุด
                    faceVectors: pythonData.face_vectors 
                }),
            });

            const prismaData = await prismaRes.json();

            if (prismaData.success) {
                setStatus(' ลงทะเบียนทุกมุมมองสำเร็จแล้วครับบอส! แม่นยำแน่นอน');
                setStudentData({ code: '', name: '' });
                setSelectedFiles(null);
                setPreviewUrls([]);
            } else {
                setStatus(' บันทึกข้อมูลลง Prisma ไม่สำเร็จ');
            }

        } catch (err) {
            console.error("Registration Error:", err);
            setStatus(' เชื่อมต่อ Python ไม่ได้ (รัน API หรือยังครับ?)');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
            <h1 className="text-3xl font-bold text-slate-800 mb-8">ลงทะเบียนนักศึกษาใหม่ (Multi-Angle)</h1>

            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-xl border border-slate-200">
                <form onSubmit={handleRegister} className="space-y-6">
                    {/* ข้อมูลนักศึกษา */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                            type="text" 
                            placeholder="รหัสนักศึกษา"
                            className="p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={studentData.code}
                            onChange={(e) => setStudentData({...studentData, code: e.target.value})}
                            required
                        />
                        <input 
                            type="text" 
                            placeholder="ชื่อ-นามสกุล"
                            className="p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={studentData.name}
                            onChange={(e) => setStudentData({...studentData, name: e.target.value})}
                            required
                        />
                    </div>

                    {/* เลือกรูปภาพหลายรูป */}
                    <div className="space-y-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <label className="text-sm font-bold text-blue-800 flex items-center gap-2">
                             อัปโหลดรูปภาพหลายมุม (หน้าตรง, ซ้าย, ขวา, ก้ม/เงย)
                        </label>
                        <input 
                            type="file" 
                            multiple //  สำคัญ
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                            required
                        />
                        <p className="text-[10px] text-blue-600 font-medium">* แนะนำอย่างน้อย 3-5 รูปเพื่อความแม่นยำสูงสุด</p>
                    </div>

                    {/* แสดงรูป Preview แบบ Grid */}
                    {previewUrls.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-4 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl">
                            {previewUrls.map((url, i) => (
                                <img key={i} src={url} alt="Preview" className="w-full h-24 object-cover rounded-lg border-2 border-white shadow-sm" />
                            ))}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:bg-slate-300"
                    >
                        {isLoading ? ' กำลังสกัดข้อมูลใบหน้า...' : 'ยืนยันลงทะเบียนข้อมูลกลุ่ม'}
                    </button>

                    {status && (
                        <div className={`p-3 rounded-xl text-center text-sm font-bold ${status.includes('') ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {status}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}