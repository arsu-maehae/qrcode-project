from flask import Flask, render_template
from flask_socketio import SocketIO
import threading
import datetime
from evdev import InputDevice, categorize, ecodes
import socket
import webbrowser
import os
import time
from dotenv import load_dotenv
from supabase import create_client, Client

# โหลดค่าจาก .env
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # ใช้ anon หรือ service_role ก็ได้

# เชื่อมต่อ Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Flask app + SocketIO
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="gevent")

participants = {}
last_scan_time = {}         # cooldown 30s ต่อ UUID
last_scan_time_global = 0   # cooldown 5s ทุก QR
SCAN_COOLDOWN = 5           # เว้น 5 วิทุกครั้งก่อนสแกนใหม่
CHECKOUT_COOLDOWN = 30      # รอ 30 วิถึงจะ checkout ได้

@app.route("/")
def index():
    return render_template("index.html")

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

def format_time():
    return datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")

def handle_scan(qr_uuid):
    global last_scan_time_global

    qr_uuid_clean = qr_uuid.strip().upper()
    now_str = format_time()
    now_ts = time.time()
    status = None

    # 🚫 Global cooldown 5s
    if now_ts - last_scan_time_global < SCAN_COOLDOWN:
        wait_left = int(SCAN_COOLDOWN - (now_ts - last_scan_time_global))
        print(f"⏳ Global Cooldown: wait {wait_left}s")
        socketio.emit("scan_event", {
            "uuid": qr_uuid_clean,
            "status": "global_cooldown",
            "wait_left": wait_left
        })
        return
    last_scan_time_global = now_ts

    # ✅ ถ้ายังไม่เคย check-in → ตรวจใน Supabase ก่อน
    if qr_uuid_clean not in participants:
        try:
            result = supabase.table("qr_codes").select("uuid").eq("uuid", qr_uuid_clean).execute()
            if not result.data:
                print(f"🚫 {qr_uuid_clean} | Invalid QR Code at {now_str}")
                socketio.emit("scan_event", {
                    "uuid": qr_uuid_clean,
                    "status": "invalid"
                })
                return
        except Exception as e:
            print(f"⚠️ Error while checking Supabase: {e}")
            return

        # ✅ check-in สำเร็จ
        participants[qr_uuid_clean] = {"checkin_time": now_str, "checkout_time": None}
        last_scan_time[qr_uuid_clean] = now_ts
        status = "checkin"

    # ✅ เคย check-in แล้ว แต่ยังไม่ checkout → ตรวจ cooldown 30s
    elif participants[qr_uuid_clean]["checkout_time"] is None:
        last_time = last_scan_time.get(qr_uuid_clean, 0)
        if now_ts - last_time < CHECKOUT_COOLDOWN:
            wait_left = int(CHECKOUT_COOLDOWN - (now_ts - last_time))
            print(f"⏳ {qr_uuid_clean} | Please wait {wait_left}s before Check-out")
            socketio.emit("scan_event", {
                "uuid": qr_uuid_clean,
                "status": "checkout_cooldown",
                "wait_left": wait_left
            })
            return
        participants[qr_uuid_clean]["checkout_time"] = now_str
        status = "checkout"

    # 🚫 ถ้าเคย checkout แล้ว → ไม่อนุญาต
    else:
        print(f"🚫 {qr_uuid_clean} | Completed. No re-scanning allowed.")
        socketio.emit("scan_event", {
            "uuid": qr_uuid_clean,
            "status": "completed"
        })
        return

    # ✅ log
    if status == "checkin":
        print(f"✅ {qr_uuid_clean} | Check-in {now_str}")
    elif status == "checkout":
        print(f"❌ {qr_uuid_clean} | Check-out {now_str}")

    # ✅ บันทึกลง Supabase (table participants)
    try:
        supabase.table("participants").insert({
            "uuid": qr_uuid_clean,
            "status": status,
            "checkin_time": participants[qr_uuid_clean]["checkin_time"],
            "checkout_time": participants[qr_uuid_clean]["checkout_time"]
        }).execute()
    except Exception as e:
        print(f"cannot save on Supabase : {e}")

    # ✅ ส่ง event ไปเว็บ
    socketio.emit("scan_event", {
        "uuid": qr_uuid_clean,
        "status": status,
        "checkin_time": participants[qr_uuid_clean]["checkin_time"],
        "checkout_time": participants[qr_uuid_clean]["checkout_time"]
    })
    socketio.sleep(0)

def scanner_loop():
    device_path = "/dev/input/event4"  # เช็คด้วย ls /dev/input/event*
    dev = InputDevice(device_path)

    scancodes = {
        2:'1',3:'2',4:'3',5:'4',6:'5',7:'6',8:'7',9:'8',10:'9',11:'0',
        16:'q',17:'w',18:'e',19:'r',20:'t',21:'y',22:'u',23:'i',24:'o',25:'p',
        30:'a',31:'s',32:'d',33:'f',34:'g',35:'h',36:'j',37:'k',38:'l',
        44:'z',45:'x',46:'c',47:'v',48:'b',49:'n',50:'m',
        12:'-', 28:'ENTER'
    }

    barcode = ""
    print(f"Reading from {device_path} ...")

    for event in dev.read_loop():
        if event.type == ecodes.EV_KEY:
            data = categorize(event)
            if data.keystate == 1:
                key = scancodes.get(data.scancode, None)
                if key:
                    if key == "ENTER":
                        if barcode:
                            handle_scan(barcode)
                            barcode = ""
                    else:
                        barcode += key

if __name__ == "__main__":
    try:
        t = threading.Thread(target=scanner_loop, daemon=True)
        t.start()
        local_ip = get_local_ip()
        url = f"http://{local_ip}:5000/"
        print("Flask server running ... open :")
        print(f" {url}")
        webbrowser.open(url)
        socketio.run(app, host="0.0.0.0", port=5000, debug=False, use_reloader=False)
    except KeyboardInterrupt:
        print("\n Server stopped by user (Ctrl+C)")
