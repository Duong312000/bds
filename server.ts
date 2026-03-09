import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. KẾT NỐI VÀO DATABASE CỦA RAILWAY
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: Thiếu biến DATABASE_URL. Hãy thêm vào tab Variables trên Railway.");
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Bắt buộc trên Railway
});

// 2. KHỞI TẠO BẢNG (Dùng SERIAL thay cho AUTOINCREMENT)
async function initializeDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        approved INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        fullName TEXT,
        phoneNumber TEXT,
        email TEXT,
        address TEXT,
        nationalId TEXT,
        status TEXT DEFAULT 'Mới',
        owner_id INTEGER REFERENCES users(id),
        createdBy INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        request_by INTEGER REFERENCES users(id),
        type TEXT DEFAULT 'Ownership',
        status TEXT DEFAULT 'Pending',
        new_data TEXT,
        processed_by INTEGER REFERENCES users(id),
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        title TEXT,
        type TEXT DEFAULT 'Chung cư',
        price REAL,
        area REAL,
        location TEXT,
        status TEXT DEFAULT 'Còn trống',
        image_url TEXT,
        description TEXT,
        listing_type TEXT DEFAULT 'Bán'
      );

      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        type TEXT,
        content TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        property_id INTEGER REFERENCES properties(id),
        sales_id INTEGER REFERENCES users(id),
        reservation_code TEXT UNIQUE,
        status TEXT DEFAULT 'Active',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        property_id INTEGER REFERENCES properties(id),
        deposit_id INTEGER,
        total_value REAL,
        status TEXT DEFAULT 'Draft',
        file_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tạo Admin mặc định nếu chưa có
    const userCount = await client.query("SELECT count(*) as count FROM users");
    if (parseInt(userCount.rows[0].count) === 0) {
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["manager", "manager123", "manager"]);
      console.log("✅ Đã tạo tài khoản quản lý mặc định");
    }

    await client.query('COMMIT');
    console.log("🚀 Đã khởi tạo cấu trúc PostgreSQL thành công!");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("❌ Lỗi tạo bảng DB:", e);
  } finally {
    client.release();
  }
}

// 3. API ROUTES (Bắt buộc dùng async/await và $1, $2)
async function startServer() {
  const app = express();
  // Tăng giới hạn JSON để upload được ảnh dung lượng lớn
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  await initializeDB();

  // API Đăng nhập
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE username = $1 AND password = $2", [username, password]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        if (user.approved === 0) {
          return res.json({ success: false, message: "Tài khoản đang chờ duyệt", pending: true });
        }
        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, approved: true } });
      } else {
        res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu" });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
  });

  // API Đăng ký (Sử dụng RETURNING id để lấy ID vừa tạo)
  app.post("/api/register", async (req, res) => {
    const { username, password, role } = req.body;
    try {
      const finalRole = ["sales", "accountant"].includes(role) ? role : "sales";
      const result = await pool.query(
        "INSERT INTO users (username, password, role, approved) VALUES ($1, $2, $3, $4) RETURNING id", 
        [username, password, finalRole, 0]
      );
      res.json({ success: true, userId: result.rows[0].id });
    } catch (err: any) {
      if (err.message.includes("unique constraint")) {
        res.status(400).json({ success: false, message: "Tên đăng nhập đã tồn tại" });
      } else {
        res.status(500).json({ success: false, message: "Lỗi hệ thống" });
      }
    }
  });

  // API Lấy danh sách khách hàng
  app.get("/api/customers", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.*, u.username as owner_name 
        FROM customers c 
        LEFT JOIN users u ON c.owner_id = u.id 
        ORDER BY c.id DESC
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi tải khách hàng" });
    }
  });

  // Setup Vite & Static Files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
