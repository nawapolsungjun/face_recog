import sys
import traceback

print("--- 🔍 เริ่มการตรวจสอบระบบ ---")
print("รันด้วย Python:", sys.executable)
print("-" * 30)

# เช็คด่านที่ 1: โมเดลสมอง
try:
    import face_recognition_models
    print("✅ 1. face_recognition_models: นำเข้าสำเร็จ ติดตั้งสมบูรณ์")
except Exception as e:
    print("❌ 1. face_recognition_models พัง! สาเหตุที่แท้จริงคือ:")
    traceback.print_exc()

# เช็คด่านที่ 2: ระบบ C++ (บ่อยครั้งที่ปัญหาซ่อนอยู่ที่นี่)
try:
    import dlib
    print("✅ 2. dlib: นำเข้าสำเร็จ ระบบ C++ สมบูรณ์")
except Exception as e:
    print("❌ 2. dlib พัง! สาเหตุที่แท้จริงคือ:")
    traceback.print_exc()

# เช็คด่านที่ 3: ตัวโปรแกรมหลัก
try:
    import face_recognition
    print("✅ 3. face_recognition: นำเข้าสำเร็จ พร้อมใช้งาน")
except Exception as e:
    print("❌ 3. face_recognition พัง! สาเหตุที่แท้จริงคือ:")
    traceback.print_exc()

print("-" * 30)