QR Code Check-in — Static Prototype (Phase 1)

โครงการตัวอย่าง Front-end only (ไม่มี Back-end) เก็บข้อมูลชั่วคราวใน localStorage และทำงานบน Browser อย่างเดียว

โครงสร้างไฟล์
- index.html — หน้า “สร้าง Token”
- checkin.html — หน้า “เช็คอิน”
- dashboard.html — หน้า “ผู้เข้าร่วม” + Export/Import/Clear
- assets/css/style.css — สไตล์หลัก
- assets/js/config.js — ค่าคงที่/ยูทิล
- assets/js/storage.js — ตัวช่วยอ่าน/เขียน localStorage (events, checkins)
- assets/js/index.js — ลอจิกหน้าสร้าง Token
- assets/js/checkin.js — ลอจิกหน้าเช็คอิน
- assets/js/dashboard.js — ลอจิกหน้ารายชื่อและตั้งค่า

การใช้งาน
- เปิดไฟล์ front-end/index.html ใน Browser
- ที่หน้า “สร้าง Token” กรอกข้อมูลและกด “สร้าง Token” จะได้ Token และ “ภาพโค้ดตัวอย่าง” (ยังไม่ใช่ QR จริงใน Phase 1)
- กดปุ่ม “เปิดหน้าตรวจเช็คอิน” เพื่อลิงก์ไปยัง checkin.html พร้อมพารามิเตอร์โค้ด
- หน้า “ผู้เข้าร่วม” แสดงรายการเช็คอิน ค้นหา/กรอง และ Export/Import/Lค่าได้

หมายเหตุ
- Prototype นี้ไม่มีระบบสแกนกล้องจริง ใช้การกรอก Token แทน (รองรับพารามิเตอร์ `checkin.html?code=TOKEN` เพื่อพรีฟิล)
- รูป “QR” เป็นเพียงภาพลวดลายเพื่อสื่อสารเท่านั้น (ยังไม่เป็นมาตรฐาน QR) — Phase ต่อไปสามารถเพิ่มไลบรารี QR จริงและตัวอ่านกล้องได้
