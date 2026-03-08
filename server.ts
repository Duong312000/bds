import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. KẾT NỐI DATABASE (Sử dụng DATABASE_URL của Railway)
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

// 2. KHỞI TẠO CẤU TRÚC BẢNG (Chuyển sang SERIAL cho Postgres)
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

      CREATE TABLE IF NOT EXISTS deposits (
        id SERIAL PRIMARY KEY,
        reservation_id INTEGER REFERENCES reservations(id),
        customer_id INTEGER REFERENCES customers(id),
        property_id INTEGER REFERENCES properties(id),
        amount REAL,
        status TEXT DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        property_id INTEGER REFERENCES properties(id),
        deposit_id INTEGER REFERENCES deposits(id),
        total_value REAL,
        status TEXT DEFAULT 'Draft',
        file_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        contract_id INTEGER REFERENCES contracts(id),
        amount REAL,
        due_date TEXT,
        status TEXT DEFAULT 'Chưa thanh toán',
        invoice_url TEXT
      );
    `);

    // Kiểm tra và thêm dữ liệu mẫu nếu DB trống
    const userCount = await client.query("SELECT count(*) FROM users");
    if (parseInt(userCount.rows[0].count) === 0) {
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["admin", "admin123", "manager"]);
      console.log("✅ Đã tạo user admin mặc định");
    }

    await client.query('COMMIT');
    console.log("🚀 PostgreSQL Initialized Successfully");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("❌ DB Init Error:", e);
  } finally {
    client.release();
  }
}

// 3. API ROUTES (Đã chuyển sang Postgres)
async function startServer() {
  const app = express();
  app.use(express.json());
  await initializeDB();

  // Login API
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE username = $1 AND password = $2", 
        [username, password]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
      } else {
        res.status(401).json({ success: false, message: "Sai tài khoản hoặc mật khẩu" });
      }
    } catch (err) { res.status(500).send("Login Error"); }
  });

  // Get Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.*, u.username as owner_name 
        FROM customers c 
        LEFT JOIN users u ON c.owner_id = u.id 
        ORDER BY c.id DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).send("Fetch error"); }
  });

  // Xóa Khách hàng (Ví dụ về Transaction phức tạp)
  app.delete("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("DELETE FROM payments WHERE contract_id IN (SELECT id FROM contracts WHERE customer_id = $1)", [id]);
      await client.query("DELETE FROM contracts WHERE customer_id = $1", [id]);
      await client.query("DELETE FROM requests WHERE customer_id = $1", [id]);
      await client.query("DELETE FROM customers WHERE id = $1", [id]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(500).json({ success: false, message: "Lỗi khi xóa" });
    } finally {
      client.release();
    }
  });

  // Setup Vite
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith('/api')) return next();
    try {
      let template = `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`;
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) { next(e); }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
}

startServer();
