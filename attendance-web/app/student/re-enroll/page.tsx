'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Webcam from 'react-webcam';
import Link from 'next/link';

// ลำดับมุมที่ต้องการให้ผู้ใช้หันหน้า
const SCAN_STEPS = [
  { label: 'มองตรงไปที่กล้อง (หน้าตรง)', hint: 'กรุณามองตรงระดับสายตา' },
  { label: 'หันหน้าไปทางซ้ายเล็กน้อย', hint: 'เอียงใบหน้าไปทางซ้ายประมาณ 30 องศา' },
  { label: 'หันหน้าไปทางขวาเล็กน้อย', hint: 'เอียงใบหน้าไปทางขวาประมาณ 30 องศา' },
  { label: 'ก้มหน้าลงเล็กน้อย', hint: 'ก้มศีรษะลงเบาๆ มองต่ำ' },
  { label: 'เงยหน้าขึ้นเล็กน้อย', hint: 'เชิดคางขึ้นเบาๆ มองสูง' },
];

export default function ReEnrollPage() {
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);
  const [user, setUser] = useState<any>(null);

  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [regMode, setRegMode] = useState<'upload' | 'scan'>('upload');

  const [files, setFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [capturedVectors, setCapturedVectors] = useState<any[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('student_user');
    const token = localStorage.getItem('student_token');

    if (!savedUser) {
      alert('ไม่พบเซสชัน กรุณาเข้าสู่ระบบใหม่');
      router.push('/student/login');
      return;
    }

    const userData = JSON.parse(savedUser);
    const initialName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || userData.displayName || 'นักศึกษา';
    
    setUser({ ...userData, displayName: initialName });
    setStatus(`คุณ ${initialName} สามารถอัปเดตใบหน้าใหม่ได้ที่นี่`);

    const fetchLatestProfile = async () => {
      try {
        const res = await fetch(`/api/student/profile?studentId=${userData.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resJson = await res.json();
        if (resJson.success && resJson.data) {
          const freshName = `${resJson.data.firstName || ''} ${resJson.data.lastName || ''}`.trim() || resJson.data.name || initialName;
          setUser((prev: any) => ({
            ...prev,
            ...resJson.data,
            displayName: freshName,
          }));
          setStatus(`คุณ ${freshName} สามารถอัปเดตใบหน้าใหม่ได้ที่นี่`);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };

    fetchLatestProfile();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = e.target.files;
      if (selectedFiles.length < 3) {
        alert('เพื่อความแม่นยำ กรุณาเลือกอัปโหลดอย่างน้อย 3 รูปขึ้นไป');
      }
      setFiles(selectedFiles);
      const fileArray = Array.from(selectedFiles).map(file => URL.createObjectURL(file));
      setPreviews(fileArray);
      setStatus(`เลือกรูปภาพแล้ว ${selectedFiles.length} รูป`);
    }
  };

  const captureScan = async () => {
    if (!webcamRef.current) return;
    setIsLoading(true);
    setStatus('กำลังสกัด Vector จากกล้อง...');

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
          const nextIndex = scanStepIndex + 1;
          const newProgress = Math.min(Math.round((nextIndex / SCAN_STEPS.length) * 100), 100);

          setScanStepIndex(nextIndex);
          setScanProgress(newProgress);

          if (nextIndex >= SCAN_STEPS.length) {
            setStatus('เก็บข้อมูลจากกล้องครบทุกมุมแล้ว พร้อมกดยืนยัน');
          } else {
            setStatus(`บันทึกสำเร็จ (${newProgress}%) กรุณา${SCAN_STEPS[nextIndex].label}`);
          }
        } else {
          alert(`ตรวจไม่พบใบหน้า: ${data.error}`);
        }
      } catch (err) {
        alert('ไม่สามารถติดต่อระบบประมวลผลใบหน้า (Python AI) ได้');
      }
    }
    setIsLoading(false);
  };

  const handleOpenConfirm = () => {
    if (regMode === 'upload' && (!files || files.length < 3)) {
      alert('กรุณาเลือกรูปภาพอย่างน้อย 3 รูปขึ้นไป');
      return;
    }
    if (regMode === 'scan' && scanProgress < 60) {
      alert('กรุณาสแกนใบหน้าอย่างน้อย 3 มุมขึ้นไป (60%)');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleFinalSave = async () => {
    if (!user) return;
    setShowConfirmModal(false);
    setIsLoading(true);
    setStatus('ระบบกำลังประมวลผลข้อมูลใบหน้าใหม่...');

    try {
      let allFinalVectors: any[] = [];

      if (files && files.length > 0) {
        setStatus('กำลังสกัดข้อมูลจากไฟล์รูปภาพ...');
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

      if (capturedVectors.length > 0) {
        allFinalVectors = [...allFinalVectors, ...capturedVectors];
      }

      if (allFinalVectors.length < 3) {
        throw new Error('กรุณาอัปโหลดรูปหรือสแกนหน้า รวมกันอย่างน้อย 3 ข้อมูลขึ้นไป');
      }

      setStatus('กำลังอัปเดตข้อมูลใบหน้าลงฐานข้อมูล...');

      const dbResponse = await fetch('/api/student/update-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: user.id,
          faceVectors: allFinalVectors
        }),
      });

      const dbResult = await dbResponse.json();
      if (dbResult.success) {
        setStatus('อัปเดตใบหน้าสำเร็จแล้ว');
        alert('อัปเดตข้อมูลใบหน้าเรียบร้อย');
        router.replace('/student/dashboard');
      } else {
        throw new Error(dbResult.error);
      }
    } catch (err: any) {
      setStatus(`ข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPreviews([]);
    setCapturedVectors([]);
    setScanStepIndex(0);
    setScanProgress(0);
    setFiles(null);
    setStatus('ล้างข้อมูลแล้ว สามารถเริ่มใหม่ได้');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans text-white">
      <div className="max-w-xl w-full bg-slate-800 rounded-[2.5rem] shadow-2xl p-10 border border-slate-700/50">
        <div className="flex justify-between items-center mb-6">
          <Link href="/student/dashboard" className="text-blue-500 font-bold inline-flex items-center gap-2 hover:translate-x-[-4px] transition-all text-sm">
            ← กลับหน้า Dashboard
          </Link>
        </div>

        <div className="text-center mb-8 border-b border-slate-700 pb-6">
          <h1 className="text-3xl font-black text-white">อัปเดต <span className="text-blue-500">ใบหน้าใหม่</span></h1>
          <p className="text-slate-400 mt-1 font-medium text-sm">
            นักศึกษา: <span className="text-blue-300 font-bold">{user?.displayName || 'กำลังโหลด...'}</span>
          </p>
        </div>

        {/* เมนูสลับวิธีลงทะเบียน */}
        <div className="flex bg-slate-700/50 p-1 rounded-2xl border border-slate-600 mb-8">
          <button 
            type="button" 
            onClick={() => setRegMode('upload')} 
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
              regMode === 'upload' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload Files
          </button>
          <button 
            type="button" 
            onClick={() => setRegMode('scan')} 
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
              regMode === 'scan' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Face Scan
          </button>
        </div>

        {/* 1. โหมด Upload รูปภาพ */}
        <div className={`${regMode === 'upload' ? 'block' : 'hidden'} animate-in fade-in space-y-6`}>
          <div className="bg-blue-950/50 border border-blue-800/80 rounded-2xl p-4 text-center">
            <p className="text-xs font-bold text-blue-300">
              คำแนะนำ: คุณต้องอัปโหลดภาพอย่างน้อย 3 ภาพขึ้นไปเพื่อความแม่นยำในการรู้จำใบหน้า
            </p>
          </div>

          <div className="p-6 border-2 border-dashed border-slate-600 rounded-[2rem] bg-slate-700/30 text-center">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileChange} 
              disabled={isLoading} 
              className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white cursor-pointer" 
            />
            {previews.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {previews.map((src, i) => (
                  <img key={i} src={src} alt={`preview-${i}`} className="w-14 h-14 object-cover rounded-xl border-2 border-slate-600" />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. โหมด Face Scan พร้อมคำแนะนำท่าทาง */}
        <div className={`${regMode === 'scan' ? 'block' : 'hidden'} animate-in fade-in space-y-6`}>
          <div className="bg-blue-950/60 border border-blue-500/40 rounded-2xl p-4 text-center">
            <div className="inline-block bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase px-3 py-0.5 rounded-full mb-1">
              มุมที่ {Math.min(scanStepIndex + 1, SCAN_STEPS.length)} / {SCAN_STEPS.length}
            </div>
            <h4 className="text-sm font-black text-white">
              {scanStepIndex < SCAN_STEPS.length ? SCAN_STEPS[scanStepIndex].label : 'เก็บข้อมูลครบถ้วนทุกมุมแล้ว'}
            </h4>
            <p className="text-[11px] text-blue-300/80 mt-0.5">
              {scanStepIndex < SCAN_STEPS.length ? SCAN_STEPS[scanStepIndex].hint : 'กดปุ่มยืนยันด้านล่างเพื่อบันทึกข้อมูล'}
            </p>
          </div>

          <div className="flex flex-col items-center p-6 bg-slate-950 rounded-[2rem] border border-slate-700">
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-blue-500 mb-6 relative shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              <Webcam 
                audio={false} 
                ref={webcamRef} 
                screenshotFormat="image/jpeg" 
                className="w-full h-full object-cover scale-x-[-1]" 
              />
            </div>

            <div className="w-full bg-slate-800 h-2.5 rounded-full mb-4 max-w-[250px] overflow-hidden">
              <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${scanProgress}%` }}></div>
            </div>

            <button 
              type="button" 
              onClick={captureScan} 
              disabled={isLoading || scanStepIndex >= SCAN_STEPS.length} 
              className="bg-white hover:bg-slate-100 text-slate-900 px-8 py-3 rounded-xl font-black text-xs active:scale-95 disabled:opacity-40 cursor-pointer transition-all shadow-md"
            >
              {isLoading 
                ? 'กำลังประมวลผล...' 
                : scanStepIndex >= SCAN_STEPS.length 
                  ? 'สแกนครบทุกมุมแล้ว' 
                  : `บันทึกมุม: ${SCAN_STEPS[scanStepIndex].label.split(' ')[0]}`}
            </button>
          </div>
        </div>

        {/* ปุ่มเปิด Modal ยืนยัน */}
        <div className="pt-8 mt-8 border-t border-slate-700">
          <button
            type="button"
            onClick={handleOpenConfirm}
            disabled={isLoading || (regMode === 'upload' && (!files || files.length < 3)) || (regMode === 'scan' && scanProgress < 60)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl active:scale-95 disabled:bg-slate-700 disabled:text-slate-400 cursor-pointer transition-all"
          >
            {isLoading ? 'กำลังประมวลผล...' : 'ยืนยันการอัปเดตใบหน้า'}
          </button>
          
          {(previews.length > 0 || capturedVectors.length > 0) && !isLoading && (
            <button 
              onClick={handleReset} 
              className="w-full text-slate-400 hover:text-slate-200 text-center text-xs font-bold mt-4 cursor-pointer"
            >
              ล้างข้อมูลและเริ่มใหม่
            </button>
          )}

          <button onClick={() => router.back()} className="w-full text-slate-500 text-center text-xs font-bold mt-4 hover:text-slate-300 cursor-pointer">
            ย้อนกลับ
          </button>
        </div>

        {status && (
          <div className={`p-4 rounded-2xl text-center text-xs font-bold mt-6 border ${
            status.includes('ข้อผิดพลาด') 
              ? 'bg-red-950/60 text-red-300 border-red-800' 
              : 'bg-slate-900/80 text-blue-300 border-slate-700'
          }`}>
            {status}
          </div>
        )}
      </div>

      {/* Modal ป๊อบอัปยืนยันการอัปเดตใบหน้า */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              ✓
            </div>
            
            <h3 className="text-2xl font-black text-white">ยืนยันการอัปเดตใบหน้า</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              คุณต้องการบันทึกข้อมูลใบหน้าชุดใหม่สำหรับนักศึกษา <br />
              <span className="font-bold text-blue-300 text-sm">{user?.displayName}</span> ({user?.studentCode}) หรือไม่?
            </p>

            <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 my-6 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">รูปแบบที่ใช้:</span>
                <span className="font-bold text-white">{regMode === 'upload' ? 'อัปโหลดไฟล์รูปภาพ' : 'สแกนผ่านกล้อง'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">จำนวนข้อมูล:</span>
                <span className="font-bold text-blue-400">
                  {regMode === 'upload' ? `${files?.length || 0} รูปภาพ` : `ความสมบูรณ์ ${scanProgress}% (${capturedVectors.length} มุม)`}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-200 bg-slate-700/50 hover:bg-slate-700 rounded-2xl transition-all text-sm cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleFinalSave}
                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
              >
                ยืนยันบันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}