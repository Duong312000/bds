import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load biến môi trường từ file .env (nếu có)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// 1. CẤU HÌNH KẾT NỐI DB (TRIỆT ĐỂ LỖI SSL & CONNECTION)
const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Nếu là Railway thì bắt buộc dùng SSL, local thì không cần
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

// Bắt lỗi idle client để tránh sập server ngang xương
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// 2. KHỞI TẠO CẤU TRÚC BẢNG
async function initializeDB() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ LỖI: Biến DATABASE_URL chưa được cấu hình trên Railway!");
    return;
  }

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

    const userCount = await client.query("SELECT count(*) FROM users");
    if (parseInt(userCount.rows[0].count) === 0) {
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["sales", "sales123", "sales"]);
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["manager", "manager123", "manager"]);
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["accountant", "accountant123", "accountant"]);
      
      await client.query("INSERT INTO customers (fullName, phoneNumber, email, status) VALUES ($1, $2, $3, $4)", ["Nguyễn Văn A", "0901234567", "vana@example.com", "Tiềm năng"]);
      
      await client.query("INSERT INTO properties (title, type, price, area, location, status, image_url, listing_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
        ["Vinhomes Grand Park", "Chung cư", 2500000000, 65, "Quận 9", "Còn trống", "https://picsum.photos/seed/apt1/800/600", "Bán"]);
    }
    await client.query('COMMIT');
    console.log("✅ Postgres DB Ready");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("❌ DB Init Error:", e);
  } finally {
    client.release();
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Chạy Init DB
  await initializeDB();

  // --- 1. API ROUTES (Ưu tiên hàng đầu) ---
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE username = $1 AND password = $2", [username, password]);
      const user = result.rows[0];
      if (user) {
        if (user.approved === 0) return res.json({ success: false, message: "Chờ duyệt", pending: true });
        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
      } else {
        res.json({ success: false, message: "Sai tài khoản/mật khẩu" });
      }
    } catch (err) { res.status(500).send("Login Error"); }
  });

  app.get("/api/customers", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.*, u.username as owner_name 
        FROM customers c LEFT JOIN users u ON c.owner_id = u.id ORDER BY c.id DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).send("Fetch error"); }
  });

  app.post("/api/customers", async (req, res) => {
    const { fullName, phoneNumber, email, address, nationalId, status, owner_id, createdBy } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO customers (fullName, phoneNumber, email, address, nationalId, status, owner_id, createdBy) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
        [fullName, phoneNumber, email, address, nationalId, status || 'Mới', owner_id, createdBy]
      );
      await pool.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["customer", `Thêm khách: ${fullName}`]);
      res.json({ success: true, customerId: result.rows[0].id });
    } catch (err) { res.status(500).send("Create Error"); }
  });

  app.get("/api/properties", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM properties");
      res.json(result.rows);
    } catch (err) { res.status(500).send("Fetch properties error"); }
  });

  app.post("/api/reservations", async (req, res) => {
    const { customer_id, property_id, sales_id } = req.body;
    const code = "RES-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await pool.query("BEGIN");
      await pool.query(
        "INSERT INTO reservations (customer_id, property_id, sales_id, reservation_code, expires_at) VALUES ($1, $2, $3, $4, NOW() + interval '24 hours')",
        [customer_id, property_id, sales_id, code]
      );
      await pool.query("UPDATE properties SET status = 'Giữ chỗ' WHERE id = $1", [property_id]);
      await pool.query("COMMIT");
      res.json({ success: true, reservationCode: code });
    } catch (e) { await pool.query("ROLLBACK"); res.status(500).send("Reservation Error"); }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const revenue = await pool.query("SELECT COALESCE(SUM(total_value), 0) as total FROM contracts WHERE status = 'Completed'");
      const customers = await pool.query("SELECT count(*) as count FROM customers");
      const properties = await pool.query("SELECT count(*) as count FROM properties WHERE status = 'Còn trống'");
      
      res.json({
        totalRevenue: parseFloat(revenue.rows[0].total),
        newCustomers: parseInt(customers.rows[0].count),
        propertiesForSale: parseInt(properties.rows[0].count),
        conversionRate: 0 
      });
    } catch (err) { res.status(500).send("Stats Error"); }
  });

  // --- 2. VITE SETUP (Dành cho Giao diện) ---
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  // Sử dụng Vite middleware
  app.use(vite.middlewares);

  // Catch-all route để render React App
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
            <title>Quản lý Bất Động Sản</title>
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
    console.log(`🚀 Server đang chạy tại: http://localhost:${port}`);
    console.log(`📡 Chế độ: ${isLocal ? 'Local' : 'Railway/Production'}`);
  });
}

startServer().catch(err => {
  console.error("🔥 Server sập lúc khởi động:", err);
});
