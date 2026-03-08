import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. KẾT NỐI POSTGRESQL
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. KHỞI TẠO CẤU TRÚC BẢNG (CHUẨN POSTGRES)
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

    // Kiểm tra dữ liệu mẫu
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
  await initializeDB();

  // --- AUTH API ---
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

  // --- CUSTOMERS API ---
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

  // --- PROPERTIES API ---
  app.get("/api/properties", async (req, res) => {
    const result = await pool.query("SELECT * FROM properties");
    res.json(result.rows);
  });

  // --- RESERVATIONS ---
  app.post("/api/reservations", async (req, res) => {
    const { customer_id, property_id, sales_id } = req.body;
    const code = "RES-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await pool.query("BEGIN");
      const result = await pool.query(
        "INSERT INTO reservations (customer_id, property_id, sales_id, reservation_code, expires_at) VALUES ($1, $2, $3, $4, NOW() + interval '24 hours') RETURNING id",
        [customer_id, property_id, sales_id, code]
      );
      await pool.query("UPDATE properties SET status = 'Giữ chỗ' WHERE id = $1", [property_id]);
      await pool.query("COMMIT");
      res.json({ success: true, reservationCode: code });
    } catch (e) { await pool.query("ROLLBACK"); res.status(500).send(e); }
  });

  // --- STATS ---
  app.get("/api/stats", async (req, res) => {
    try {
      const revenue = await pool.query("SELECT COALESCE(SUM(total_value), 0) as total FROM contracts WHERE status = 'Completed'");
      const customers = await pool.query("SELECT count(*) as count FROM customers");
      const properties = await pool.query("SELECT count(*) as count FROM properties WHERE status = 'Còn trống'");
      
      res.json({
        totalRevenue: parseFloat(revenue.rows[0].total),
        newCustomers: parseInt(customers.rows[0].count),
        propertiesForSale: parseInt(properties.rows[0].count),
        conversionRate: 0 // Logic tính sau
      });
    } catch (err) { res.status(500).send("Stats Error"); }
  });

// --- VITE SETUP CHUẨN CHO RAILWAY ---
const vite = await createViteServer({
  server: { 
    middlewareMode: true,
    hmr: { server: undefined } // Tránh xung đột cổng trên Railway
  },
  appType: "custom",
});

// 1. Phải để Vite Middleware lên TRƯỚC các route khác
app.use(vite.middlewares);

// 2. Route phục vụ Giao diện
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  // Nếu là yêu cầu API thì bỏ qua để Express xử lý bên trên
  if (url.startsWith('/api')) return next();

  try {
    // HTML chuẩn để Vite có thể "Inject" React vào
    let template = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Quản lý Bất Động Sản</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/main.tsx"></script>
        </body>
      </html>
    `;

    // CỰC KỲ QUAN TRỌNG: Vite biến đổi HTML để nó biết đường dịch /src/main.tsx
    template = await vite.transformIndexHtml(url, template);

    res.status(200).set({ "Content-Type": "text/html" }).end(template);
  } catch (e) {
    vite.ssrFixStacktrace(e as Error);
    next(e);
  }
});
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
}

startServer();
