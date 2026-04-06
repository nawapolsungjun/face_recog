from fastapi import FastAPI, UploadFile, File
import face_recognition
import io

# 1. สร้างตัวเซิร์ฟเวอร์ API
app = FastAPI(title="Student Attendance AI API")
from fastapi.middleware.cors import CORSMiddleware

# ต้องมีส่วนนี้เพื่อให้ Next.js คุยกับ Python ได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # หรือใส่ ["http://localhost:3000"] เพื่อความปลอดภัย
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ตัวแปรเก็บฐานข้อมูลใบหน้า (เก็บไว้ใน Memory ตอนเซิร์ฟเวอร์เปิด)
known_face_encodings = []
known_face_names = []

@app.post("/api/register-face")
async def register_face(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = face_recognition.load_image_file(io.BytesIO(contents))
        
        # ค้นหาตำแหน่งใบหน้าและแปลงเป็น Vector
        encodings = face_recognition.face_encodings(image)
        
        if len(encodings) > 0:
            # แปลงเป็น list เพื่อส่งกลับไปให้ Next.js บันทึก
            return {"success": True, "face_vector": encodings[0].tolist()}
        else:
            return {"success": False, "error": "ไม่พบใบหน้าในรูปภาพ"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# 2. ฟังก์ชันนี้จะทำงานทันทีที่เปิดเซิร์ฟเวอร์ (โหลดหน้านักเรียนรอไว้เลย จะได้เร็ว)
@app.on_event("startup")
def load_database():
    print("⏳ กำลังโหลดข้อมูลใบหน้านักเรียนเข้าสู่ระบบ...")
    try:
        # โหลดภาพ student1.jpg มาเป็นข้อมูลต้นฉบับ
        image = face_recognition.load_image_file("student1.jpg")
        encoding = face_recognition.face_encodings(image)[0]
        
        known_face_encodings.append(encoding)
        known_face_names.append("Student 1 (Somchai)") # ชื่อสมมติ
        print("✅ โหลดฐานข้อมูลเสร็จสิ้น! AI พร้อมทำงาน")
    except Exception as e:
        print(f"❌ โหลดภาพต้นฉบับไม่สำเร็จ: {e}")

# 3. สร้าง Endpoint (ช่องทางรับข้อมูล) สำหรับเช็คชื่อ
@app.post("/api/scan-attendance")
async def scan_attendance(file: UploadFile = File(...)):
    print(f"📥 ได้รับไฟล์รูปภาพ: {file.filename} กำลังประมวลผล...")
    
    # อ่านไฟล์รูปภาพที่ส่งเข้ามา แปลงให้อยู่ในรูปแบบที่ AI เข้าใจ
    contents = await file.read()
    group_image = face_recognition.load_image_file(io.BytesIO(contents))
    
    # สแกนหาพิกัดและสกัดเวกเตอร์ใบหน้าทั้งหมดในรูป
    face_locations = face_recognition.face_locations(group_image)
    face_encodings = face_recognition.face_encodings(group_image, face_locations)
    
    present_students = []

    # นำหน้าทุกคนในรูป ไปเทียบกับฐานข้อมูล
    for encoding in face_encodings:
        matches = face_recognition.compare_faces(known_face_encodings, encoding, tolerance=0.5)
        
        if True in matches:
            # ถ้าเจอคนที่ตรงกัน ก็เอาชื่อมาใส่ในลิสต์คนมาเรียน
            match_index = matches.index(True)
            present_students.append(known_face_names[match_index])

    # 4. ส่งผลลัพธ์กลับไปให้ฝั่งเว็บ (รูปแบบ JSON)
    return {
        "status": "success",
        "total_faces_detected": len(face_locations),
        "present_students": present_students
    }
    