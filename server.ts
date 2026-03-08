import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg"; // Dùng pg thay cho better-sqlite3
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. KẾT NỐI POSTGRESQL (Railway Database)
const { Pool } = pg;
const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false } // Bắt buộc khi chạy trên Railway
});

// 2. KHỞI TẠO BẢNG (Dùng cú pháp Postgres)
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

      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        type TEXT,
        content TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Các bảng khác (properties, contracts...) thêm tại đây tương tự
    `);

    // Kiểm tra và tạo admin mẫu
    const userCount = await client.query("SELECT count(*) FROM users");
    if (parseInt(userCount.rows[0].count) === 0) {
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["admin", "admin123", "manager"]);
    }
    
    await client.query('COMMIT');
    console.log("✅ PostgreSQL đã sẵn sàng và đã kết nối!");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("❌ Lỗi DB:", e);
  } finally {
    client.release();
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());
  
  // Phục vụ file tĩnh từ thư mục public (Tránh lỗi 403 favicon)
  app.use(express.static(path.resolve(__dirname, "public")));

  await initializeDB();

  // Ví dụ API Login dùng Postgres
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      // Dùng $1, $2 thay cho ? của SQLite
      const result = await pool.query("SELECT * FROM users WHERE username = $1 AND password = $2", [username, password]);
      if (result.rows.length > 0) {
        res.json({ success: true, user: result.rows[0] });
      } else {
        res.status(401).json({ success: false, message: "Sai tài khoản" });
      }
    } catch (err) { res.status(500).send("Error"); }
  });

  // Cấu hình Vite (giữ nguyên logic của bạn)
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith('/api')) return next();
    try {
      let template = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Quản lý BĐS</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`;
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) { next(e); }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
}

startServer();
