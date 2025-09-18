import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  ALLOWED_ORIGINS,
  PORT
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("❌ ต้องตั้งค่า SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY ใน .env");
}

app.use(cors({
  origin: (ALLOWED_ORIGINS || "").split(",").map(o => o.trim()),
  credentials: true
}));

// ===== Utils =====
async function getUserFromToken(token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": SUPABASE_ANON_KEY
    }
  });
  if (!res.ok) throw new Error("token invalid");
  return await res.json();
}

async function isAdmin(user_id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/admins?user_id=eq.${user_id}&select=user_id`, {
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!res.ok) throw new Error("admins check failed");
  const rows = await res.json();
  return rows.length > 0;
}

// ===== Routes =====
app.get("/admin/me", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    const token = auth.split(" ")[1];
    const user = await getUserFromToken(token);
    const admin = await isAdmin(user.id);
    res.json({ user: { id: user.id, email: user.email }, is_admin: admin });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

app.post("/admin/reset-password", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    const token = auth.split(" ")[1];
    const requester = await getUserFromToken(token);

    if (!(await isAdmin(requester.id))) {
      return res.status(403).json({ error: "Admins only" });
    }

    const { email, new_password } = req.body;
    if (!email || !new_password) return res.status(400).json({ error: "email & new_password required" });

    // หา user จาก email
    const lookup = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY
      }
    });
    const body = await lookup.json();
    const user = body.users?.[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    // อัปเดตรหัสผ่าน
    const patch = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: new_password })
    });

    if (!patch.ok) {
      const err = await patch.text();
      return res.status(400).json({ error: err });
    }

    res.json({ ok: true, message: `Password reset for ${email} success` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT || 8000, () => {
  console.log(`🚀 Admin backend running on http://127.0.0.1:${PORT || 8000}`);
});
