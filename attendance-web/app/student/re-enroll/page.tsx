'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Webcam from 'react-webcam';

export default function ReEnrollPage() {
    const router = useRouter();
    const webcamRef = useRef<Webcam>(null);
    const [user, setUser] = useState<any>(null);

    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [regMode, setRegMode] = useState<'upload' | 'scan'>('upload');

    const [files, setFiles] = useState<FileList | null>(null);
    const [previews, setPreviews] = useState<string[]>([]);

    const [scanProgress, setScanProgress] = useState(0);
    const [capturedVectors, setCapturedVectors] = useState<any[]>([]);

    useEffect(() => {
        //  ดึงข้อมูลจาก student_user (ไม่ต้องเช็ค token แล้ว)
        const savedUser = localStorage.getItem('student_user');

        if (!savedUser) {
            alert("ไม่พบเซสชัน กรุณาเข้าสู่ระบบใหม่ครับ");
            router.push('/student/login');
            return;
        }
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setStatus(`คุณ ${userData.name} สามารถอัปเดตใบหน้าใหม่ได้ที่นี่ครับ`);
    }, [router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = e.target.files;
            setFiles(selectedFiles);
            const fileArray = Array.from(selectedFiles).map(file => URL.createObjectURL(file));
            setPreviews(fileArray);
            setStatus(`เลือกรูปภาพแล้ว ${selectedFiles.length} รูป`);
        }
    };

    const captureScan = async () => {
        if (!webcamRef.current) return;
        setIsLoading(true);
        setStatus('AI กำลังสกัด Vector จากกล้อง...');

        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
            try {
                const res = await fetch('http://localhost:8000/api/extract-vector', {
                    method: 'POST',
                    body: JSON.stringify({ image: imageSrc }),
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();

                if (data.success) {
                    setCapturedVectors(prev => [...prev, data.vector]);
                    const newProgress = Math.min(scanProgress + 20, 100);
                    setScanProgress(newProgress);

                    if (newProgress >= 100) {
                        setStatus('เก็บข้อมูลจากกล้องครบถ้วนแล้ว!');
                    } else {
                        setStatus(`สแกนสำเร็จ (${newProgress}%) หันหน้ามุมอื่นแล้วสแกนต่อ...`);
                    }
                } else {
                    alert(`AI ตรวจไม่พบใบหน้า: ${data.error}`);
                }
            } catch (err) {
                alert('ไม่สามารถติดต่อ Python AI ได้ (ตรวจสอบ Port 8000)');
            }
        }
        setIsLoading(false);
    };

    const handleFinalSave = async () => {
        if (!user) return;
        setIsLoading(true);
        setStatus('ระบบกำลังประมวลผลข้อมูลใบหน้าใหม่...');

        try {
            let allFinalVectors: any[] = [];

            // จัดการรูปที่อัปโหลด (ยิงไปหา Python AI)
            if (files && files.length > 0) {
                setStatus('AI กำลังสกัดข้อมูลจากไฟล์รูปภาพ...');
                const faceFormData = new FormData();
                Array.from(files).forEach(file => faceFormData.append('files', file));

                const aiResponse = await fetch('http://localhost:8000/api/register-face-multi', {
                    method: 'POST',
                    body: faceFormData
                });

                const aiResult = await aiResponse.json();
                if (aiResult.success) {
                    allFinalVectors = [...allFinalVectors, ...aiResult.face_vectors];
                }
            }

            //  รวม Vector จากการสแกนกล้อง
            if (capturedVectors.length > 0) {
                allFinalVectors = [...allFinalVectors, ...capturedVectors];
            }

            if (allFinalVectors.length < 1) {
                throw new Error('กรุณาอัปโหลดรูปหรือสแกนหน้าอย่างน้อย 1 ข้อมูลครับ');
            }

            setStatus(` กำลังอัปเดตข้อมูลใบหน้าลงฐานข้อมูล...`);

            // ยิงไปที่ API Update Face (แบบ No-Token)
            const dbResponse = await fetch('/api/student/update-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    //  ตัด Authorization Header ออกเรียบร้อย
                },
                body: JSON.stringify({
                    studentId: user.id,
                    faceVectors: allFinalVectors 
                }),
            });

            const dbResult = await dbResponse.json();
            if (dbResult.success) {
                setStatus(' อัปเดตใบหน้าสำเร็จแล้ว!');
                alert(" อัปเดตข้อมูลใบหน้าเรียบร้อยครับ!");
                router.replace('/student/dashboard');
            } else {
                throw new Error(dbResult.error);
            }
        } catch (err: any) {
            setStatus(` ข้อผิดพลาด: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans text-white">
            <div className="max-w-xl w-full bg-slate-800 rounded-[2.5rem] shadow-2xl p-10 border border-slate-700/50">

                <div className="text-center mb-8 border-b border-slate-700 pb-6">
                    <h1 className="text-3xl font-black text-white">อัปเดต <span className="text-blue-500">ใบหน้าใหม่</span></h1>
                    <p className="text-slate-400 mt-1 font-medium text-sm">
                        นักศึกษา: <span className="text-blue-300 font-bold">{user?.name || 'กำลังโหลด...'}</span>
                    </p>
                </div>

                <div className="flex bg-slate-700/50 p-1 rounded-2xl border border-slate-600 mb-8">
                    <button type="button" onClick={() => setRegMode('upload')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${regMode === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>📁 Upload Files</button>
                    <button type="button" onClick={() => setRegMode('scan')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${regMode === 'scan' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>📸 Face Scan</button>
                </div>

                <div className={`${regMode === 'upload' ? 'block' : 'hidden'} animate-in fade-in space-y-6`}>
                    <div className="p-6 border-2 border-dashed border-slate-600 rounded-[2rem] bg-slate-700/30 text-center">
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} disabled={isLoading} className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white cursor-pointer" />
                        {previews.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-2 mt-5">
                                {previews.map((src, i) => <img key={i} src={src} className="w-14 h-14 object-cover rounded-xl border-2 border-slate-600" />)}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`${regMode === 'scan' ? 'block' : 'hidden'} animate-in fade-in space-y-6`}>
                    <div className="flex flex-col items-center p-6 bg-slate-950 rounded-[2rem] border border-slate-700">
                        <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-blue-500 mb-6 relative shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover scale-x-[-1]" />
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full mb-4 max-w-[250px] overflow-hidden">
                            <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${scanProgress}%` }}></div>
                        </div>
                        <button type="button" onClick={captureScan} disabled={isLoading || scanProgress >= 100} className="bg-white text-slate-900 px-8 py-3 rounded-xl font-black text-xs active:scale-95 disabled:opacity-30">
                            {isLoading ? 'กำลังประมวลผล...' : scanProgress >= 100 ? 'สแกนครบแล้ว' : ' กดเพื่อสแกนมุมนี้'}
                        </button>
                    </div>
                </div>

                <div className="pt-8 mt-8 border-t border-slate-700">
                    <button
                        type="button"
                        onClick={handleFinalSave}
                        disabled={isLoading || (regMode === 'upload' && !files) || (regMode === 'scan' && scanProgress < 20)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl active:scale-95 disabled:bg-slate-600"
                    >
                        {isLoading ? 'กำลังประมวลผล...' : 'ยืนยันการอัปเดตใบหน้า'}
                    </button>

                    <button onClick={() => router.back()} className="w-full text-slate-500 text-center text-xs font-bold mt-4 hover:text-slate-300">
                        ย้อนกลับ
                    </button>
                </div>

                {status && (
                    <div className={`p-5 rounded-2xl text-center text-[14px] font-white mt-8 border ${status.includes('') ? 'bg-blue-950 text-white-300 border-blue-600' : 'text-blue-300 animate-pulse'}`}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}