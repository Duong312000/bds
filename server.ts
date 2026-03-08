import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load biến môi trường
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// 1. CẤU HÌNH DATABASE THÔNG MINH (TRÁNH LỖI ECONNREFUSED)
const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway yêu cầu SSL, Local thì không. Cấu hình này giúp chạy mọi nơi.
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

// Ngăn server sập nếu mất kết nối DB bất ngờ
pool.on('error', (err) => {
  console.error('⚠️ Lỗi kết nối Database bất ngờ:', err);
});

// 2. KHỞI TẠO DATABASE (POSTGRESQL)
async function initializeDB() {
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️ CẢNH BÁO: Chưa có DATABASE_URL. App sẽ chạy không có DB.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Tạo bảng (Giữ nguyên cấu trúc của bạn nhưng thêm IF NOT EXISTS)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT, approved INTEGER DEFAULT 1);
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY, fullName TEXT, phoneNumber TEXT, email TEXT, address TEXT, 
        nationalId TEXT, status TEXT DEFAULT 'Mới', owner_id INTEGER REFERENCES users(id), 
        createdBy INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY, title TEXT, type TEXT DEFAULT 'Chung cư', price REAL, 
        area REAL, location TEXT, status TEXT DEFAULT 'Còn trống', image_url TEXT, 
        description TEXT, listing_type TEXT DEFAULT 'Bán'
      );
      CREATE TABLE IF NOT EXISTS activities (id SERIAL PRIMARY KEY, type TEXT, content TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), 
        property_id INTEGER REFERENCES properties(id), total_value REAL, 
        status TEXT DEFAULT 'Draft', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Thêm dữ liệu mẫu nếu bảng trống
    const userCount = await client.query("SELECT count(*) FROM users");
    if (parseInt(userCount.rows[0].count) === 0) {
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["admin", "admin123", "manager"]);
      console.log("✅ Đã tạo tài khoản admin mẫu");
    }
    
    await client.query('COMMIT');
    console.log("✅ Database đã sẵn sàng");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("❌ Lỗi khởi tạo DB:", e);
  } finally {
    client.release();
  }
}

// 3. KHỞI CHẠY SERVER
async function startServer() {
  const app = express();
  
  // A. Cấu hình các file tĩnh (Sửa lỗi 403 Favicon)
  const publicPath = path.resolve(__dirname, "public");
  app.use(express.static(publicPath));
  app.use(express.json());

  // B. Khởi tạo Database
  await initializeDB();

  // C. API ROUTES (Đặt trước Vite Middleware để tránh bị chiếm quyền)
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE username = $1 AND password = $2", [username, password]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
      } else {
        res.status(401).json({ success: false, message: "Sai tài khoản hoặc mật khẩu" });
      }
    } catch (err) { res.status(500).send("Login Error"); }
  });

  app.get("/api/customers", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM customers ORDER BY id DESC");
      res.json(result.rows);
    } catch (err) { res.status(500).send("Fetch error"); }
  });

  // D. CẤU HÌNH VITE (Dành cho phát triển và Production trên Railway)
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  // E. RENDER FRONTEND (React)
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith('/api')) return next();

    try {
      let template = `
        <!DOCTYPE html>
        <html lang="vi">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="icon" type="image/x-icon" href="/favicon.ico">
            <title>Hệ thống Quản lý BĐS</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.tsx"></script>
          </body>
        </html>`;

      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Server chạy tại: http://localhost:${port}`);
    console.log(`🏠 Chế độ: ${isLocal ? 'LOCAL' : 'RAILWAY'}`);
  });
}

startServer().catch(err => {
  console.error("🔥 Lỗi khởi động server:", err);
});
