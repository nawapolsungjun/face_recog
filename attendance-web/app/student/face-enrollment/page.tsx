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

export default function FaceEnrollmentPage() {
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
      alert('กรุณาเข้าสู่ระบบก่อนทำการลงทะเบียนใบหน้า');
      router.push('/student/login');
      return;
    }

    const userData = JSON.parse(savedUser);
    const initialName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || userData.displayName || 'นักศึกษา';
    
    setUser({ ...userData, displayName: initialName });
    setStatus(`สวัสดีคุณ ${initialName} กรุณาเลือกวิธีลงทะเบียนใบหน้าด้านล่าง`);

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
          setStatus(`สวัสดีคุณ ${freshName} กรุณาเลือกวิธีลงทะเบียนใบหน้าด้านล่าง`);
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
      } catch {
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
    setStatus('ระบบกำลังรวบรวมและประมวลผลข้อมูลใบหน้า...');

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

      setStatus('กำลังบันทึกข้อมูลใบหน้าลงระบบ...');

      const dbResponse = await fetch('/api/student/face-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId || user.id,
          faceVectors: JSON.stringify(allFinalVectors)
        }),
      });

      const dbResult = await dbResponse.json();
      if (dbResult.success) {
        setStatus('ลงทะเบียนใบหน้าสำเร็จแล้ว');
        alert('ลงทะเบียนใบหน้าสมบูรณ์ ระบบจะพาคุณไปที่ Dashboard');
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
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">
      
      {/* 1. Header ด้านบนตาม Style Canva (หัวข้อตรงกลาง 100%) */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative">
        <div className="absolute top-6 left-6">
          <Link
            href="/student/dashboard"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-2 text-xs uppercase tracking-wider transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบตรวจสอบรายชื่อเข้าชั้นเรียน
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          ลงทะเบียนใบหน้า: <span className="font-bold text-white">{user?.displayName || 'กำลังโหลด...'}</span> {user?.studentCode ? `(${user.studentCode})` : ''}
        </p>
      </header>

      {/* 3. Main Content Card */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 md:py-8 flex flex-col justify-center">
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80">
          
          <div className="text-center mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-xl font-black text-slate-800">ลงทะเบียน <span className="text-emerald-700">ใบหน้าใหม่</span></h2>
            <p className="text-slate-400 mt-1 font-medium text-xs">
              นักศึกษา: <span className="text-slate-700 font-bold">{user?.displayName || 'กำลังโหลด...'}</span>
            </p>
          </div>

          {/* เมนูสลับวิธีลงทะเบียน */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 mb-6">
            <button 
              type="button" 
              onClick={() => setRegMode('upload')} 
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                regMode === 'upload' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Upload Files
            </button>
            <button 
              type="button" 
              onClick={() => setRegMode('scan')} 
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                regMode === 'scan' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Face Scan
            </button>
          </div>

          {/* 1. โหมด Upload รูปภาพ */}
          <div className={`${regMode === 'upload' ? 'block' : 'hidden'} animate-in fade-in space-y-4`}>
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 text-center">
              <p className="text-xs font-medium text-emerald-800">
                คำแนะนำ: กรุณาเลือกอัปโหลดอย่างน้อย 3 รูปขึ้นไปเพื่อความแม่นยำในการรู้จำใบหน้า
              </p>
            </div>

            <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileChange} 
                disabled={isLoading} 
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" 
              />
              {previews.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt={`preview-${i}`} className="w-14 h-14 object-cover rounded-xl border border-slate-200" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. โหมด Face Scan พร้อมคำแนะนำท่าทาง */}
          <div className={`${regMode === 'scan' ? 'block' : 'hidden'} animate-in fade-in space-y-4`}>
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 text-center">
              <div className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full mb-1">
                มุมที่ {Math.min(scanStepIndex + 1, SCAN_STEPS.length)} / {SCAN_STEPS.length}
              </div>
              <h4 className="text-xs md:text-sm font-bold text-slate-800">
                {scanStepIndex < SCAN_STEPS.length ? SCAN_STEPS[scanStepIndex].label : 'เก็บข้อมูลครบถ้วนทุกมุมแล้ว'}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {scanStepIndex < SCAN_STEPS.length ? SCAN_STEPS[scanStepIndex].hint : 'กดปุ่มยืนยันด้านล่างเพื่อบันทึกข้อมูล'}
              </p>
            </div>

            <div className="flex flex-col items-center p-5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-emerald-500 mb-4 relative shadow-sm">
                <Webcam 
                  audio={false} 
                  ref={webcamRef} 
                  screenshotFormat="image/jpeg" 
                  className="w-full h-full object-cover scale-x-[-1]" 
                />
              </div>

              <div className="w-full bg-slate-200 h-2 rounded-full mb-4 max-w-[220px] overflow-hidden">
                <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${scanProgress}%` }}></div>
              </div>

              <button 
                type="button" 
                onClick={captureScan} 
                disabled={isLoading || scanStepIndex >= SCAN_STEPS.length} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs active:scale-95 disabled:opacity-40 cursor-pointer transition-all shadow-sm"
              >
                {isLoading 
                  ? 'กำลังประมวลผล...' 
                  : scanStepIndex >= SCAN_STEPS.length 
                    ? 'สแกนครบทุกมุมแล้ว' 
                    : `บันทึกมุม: ${SCAN_STEPS[scanStepIndex].label.split(' ')[0]}`}
              </button>
            </div>
          </div>

          {/* ปุ่มยืนยัน */}
          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleOpenConfirm}
              disabled={isLoading || (regMode === 'upload' && (!files || files.length < 3)) || (regMode === 'scan' && scanProgress < 60)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-sm active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer transition-all"
            >
              {isLoading ? 'กำลังประมวลผล...' : 'ยืนยันการลงทะเบียนใบหน้า'}
            </button>
            
            {(previews.length > 0 || capturedVectors.length > 0) && !isLoading && (
              <button 
                onClick={handleReset} 
                className="w-full text-slate-400 hover:text-slate-600 text-center text-xs font-bold mt-3 cursor-pointer"
              >
                ล้างข้อมูลและเริ่มใหม่
              </button>
            )}

            <button onClick={() => router.back()} className="w-full text-slate-400 text-center text-xs font-bold mt-3 hover:text-slate-600 cursor-pointer">
              ย้อนกลับ
            </button>
          </div>

          {status && (
            <div className={`p-3 rounded-xl text-center text-xs font-bold mt-4 border ${
              status.includes('ข้อผิดพลาด') 
                ? 'bg-red-50 text-red-600 border-red-100' 
                : 'bg-emerald-50/60 text-emerald-700 border-emerald-100'
            }`}>
              {status}
            </div>
          )}
        </div>
      </main>

      {/* 4. Footer ด้านล่าง */}
      <footer className="bg-[#0f766e] text-emerald-100 py-4 px-4 text-center text-xs font-medium mt-auto">
        © 2026 ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>

      {/* Modal ป๊อบอัปยืนยันการลงทะเบียนใบหน้า */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              ✓
            </div>
            
            <h3 className="text-xl font-black text-slate-800">ยืนยันการลงทะเบียนใบหน้า</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              คุณต้องการบันทึกข้อมูลใบหน้านี้สำหรับนักศึกษา <br />
              <span className="font-bold text-emerald-700 text-sm">{user?.displayName}</span> ({user?.studentCode}) หรือไม่?
            </p>

            <div className="bg-slate-50 rounded-xl p-4 my-5 text-xs text-slate-600 text-left space-y-2 border border-slate-200/60">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">รูปแบบที่ใช้:</span>
                <span className="font-bold text-slate-800">{regMode === 'upload' ? 'อัปโหลดไฟล์รูปภาพ' : 'สแกนผ่านกล้อง'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">จำนวนข้อมูล:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {regMode === 'upload' ? `${files?.length || 0} รูปภาพ` : `ความสมบูรณ์ ${scanProgress}% (${capturedVectors.length} มุม)`}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleFinalSave}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
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