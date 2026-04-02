import sys
print("🔍 ตัวที่กำลังรันโค้ดนี้คือ:", sys.executable)
import face_recognition


print("🤖 กำลังเปิดระบบ AI เช็คชื่อ...")

# 1. สอน AI ให้รู้จักหน้านักเรียนต้นฉบับ (ลงทะเบียน)
print("กำลังจดจำใบหน้าจากไฟล์ student1.jpg...")
try:
    student_image = face_recognition.load_image_file("student1.jpg")
    # แปลงรูปเป็นตัวเลข (Face Embedding)
    student_encoding = face_recognition.face_encodings(student_image)[0]
    print("✅ จดจำใบหน้านักเรียนคนที่ 1 สำเร็จ!")
except FileNotFoundError:
    print("❌ หาไฟล์ student1.jpg ไม่เจอ รบกวนตรวจสอบชื่อไฟล์ครับ")
    exit()

# 2. ให้ AI ไปค้นหาในรูปถ่ายหมู่
print("\nกำลังสแกนหาใบหน้าในรูปถ่ายห้องเรียน (group_photo.jpg)...")
try:
    group_image = face_recognition.load_image_file("group_photo.jpg")
    # หาพิกัดใบหน้าทุกคนในรูป
    face_locations = face_recognition.face_locations(group_image)
    # แปลงทุกหน้าที่เจอเป็นตัวเลข
    face_encodings_in_group = face_recognition.face_encodings(group_image, face_locations)
    
    print(f"👀 พบใบหน้าในรูปถ่ายหมู่ทั้งหมด: {len(face_locations)} คน")
except FileNotFoundError:
    print("❌ หาไฟล์ group_photo.jpg ไม่เจอ รบกวนตรวจสอบชื่อไฟล์ครับ")
    exit()

# 3. ตรวจสอบว่ามีนักเรียนที่ลงทะเบียนไว้ มาเรียนหรือไม่
print("\n--- 📊 สรุปผลการเช็คชื่อ ---")
found = False

for encoding in face_encodings_in_group:
    # นำหน้าในรูปหมู่ มาเทียบกับหน้าต้นฉบับ
    results = face_recognition.compare_faces([student_encoding], encoding, tolerance=0.5)
    
    if results[0] == True:
        print("✅ พบเป้าหมาย! นักเรียนคนที่ 1 มาเรียนครับ")
        found = True
        break

if not found:
    print("❌ ไม่พบนักเรียนคนที่ 1 ในรูปภาพนี้ (ขาดเรียน)")