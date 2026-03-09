import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. KẾT NỐI DATABASE
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: Missing DATABASE_URL in Environment Variables!");
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. KHỞI TẠO BẢNG DỮ LIỆU
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

    // Dữ liệu mẫu (Seed Data)
    const userCount = await client.query("SELECT count(*) as count FROM users");
    if (parseInt(userCount.rows[0].count) === 0) {
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["sales", "sales123", "sales"]);
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["manager", "manager123", "manager"]);
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["accountant", "accountant123", "accountant"]);
      
      await client.query("INSERT INTO properties (title, type, price, area, location, status, image_url, listing_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
        ["Vinhomes Grand Park - Căn hộ S1.02", "Chung cư", 2500000000, 65, "Quận 9, TP.HCM", "Còn trống", "https://picsum.photos/seed/apartment1/800/600", "Bán"]
      );
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

// 3. KHỞI CHẠY SERVER VÀ CÁC API
async function startServer() {
  const app = express();
  
  // Tăng giới hạn payload lên 10MB để up ảnh thoải mái
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  await initializeDB();

  // ==========================================
  // AUTH API
  // ==========================================
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE username = $1 AND password = $2", [username, password]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        if (user.approved === 0) return res.json({ success: false, message: "Tài khoản đang chờ quản lý duyệt", pending: true });
        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, approved: true } });
      } else {
        res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu" });
      }
    } catch (err) { res.status(500).json({ success: false, message: "Lỗi hệ thống" }); }
  });

  app.post("/api/register", async (req, res) => {
    const { username, password, role } = req.body;
    try {
      const finalRole = ["sales", "accountant"].includes(role) ? role : "sales";
      const result = await pool.query("INSERT INTO users (username, password, role, approved) VALUES ($1, $2, $3, $4) RETURNING id", [username, password, finalRole, 0]);
      res.json({ success: true, userId: result.rows[0].id });
    } catch (err: any) {
      if (err.message.includes("unique constraint")) res.status(400).json({ success: false, message: "Tên đăng nhập đã tồn tại" });
      else res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
  });

  // ==========================================
  // CUSTOMERS API
  // ==========================================
  app.get("/api/customers", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.*, u.username as owner_name 
        FROM customers c 
        LEFT JOIN users u ON c.owner_id = u.id 
        ORDER BY c.id DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ success: false, message: "Lỗi tải khách hàng" }); }
  });

  app.get("/api/customers/check", async (req, res) => {
    const { nationalId, fullName } = req.query;
    try {
      const result = await pool.query(`
        SELECT c.*, u.username as owner_name 
        FROM customers c 
        LEFT JOIN users u ON c.owner_id = u.id 
        WHERE TRIM(c.nationalId) = $1 AND TRIM(c.fullName) = $2
      `, [String(nationalId).trim(), String(fullName).trim()]);
      res.json({ exists: result.rows.length > 0, customer: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false }); }
  });

  app.post("/api/customers", async (req, res) => {
    const { fullName, phoneNumber, email, address, nationalId, status, owner_id, createdBy } = req.body;
    try {
      const result = await pool.query(`
        INSERT INTO customers (fullName, phoneNumber, email, address, nationalId, status, owner_id, createdBy) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
      `, [fullName, phoneNumber, email, address, nationalId, status || 'Mới', owner_id, createdBy]);
      await pool.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["customer", `Khách hàng mới ${fullName} đã được thêm.`]);
      res.json({ success: true, customerId: result.rows[0].id });
    } catch (err) { res.status(500).json({ success: false, message: "Lỗi thêm khách hàng" }); }
  });

  app.put("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    const { fullName, phoneNumber, email, address, nationalId, status } = req.body;
    try {
      await pool.query(`
        UPDATE customers SET fullName = $1, phoneNumber = $2, email = $3, address = $4, nationalId = $5, status = $6 WHERE id = $7
      `, [fullName, phoneNumber, email, address, nationalId, status, id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
  });

  // ==========================================
  // REQUESTS API
  // ==========================================
  app.get("/api/requests", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT r.*, c.fullName as customer_name, u_req.username as requester_name,
               u_owner.username as current_owner_name, u_proc.username as processor_name
        FROM requests r
        JOIN customers c ON r.customer_id = c.id
        JOIN users u_req ON r.request_by = u_req.id
        LEFT JOIN users u_owner ON c.owner_id = u_owner.id
        LEFT JOIN users u_proc ON r.processed_by = u_proc.id
        ORDER BY r.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ success: false, message: "Lỗi tải yêu cầu" }); }
  });

  app.post("/api/requests", async (req, res) => {
    const { customer_id, request_by, new_data, type } = req.body;
    try {
      await pool.query("INSERT INTO requests (customer_id, request_by, new_data, type) VALUES ($1, $2, $3, $4)", 
        [customer_id, request_by, new_data ? JSON.stringify(new_data) : null, type || 'Ownership']);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
  });

  app.patch("/api/requests/:id", async (req, res) => {
    const { id } = req.params;
    const { status, processed_by } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const reqResult = await client.query("SELECT * FROM requests WHERE id = $1", [id]);
      const request = reqResult.rows[0];
      
      await client.query("UPDATE requests SET status = $1, processed_by = $2, processed_at = CURRENT_TIMESTAMP WHERE id = $3", [status, processed_by, id]);

      if (status === 'Approved') {
        if (request.type === 'Deletion') {
          await client.query("DELETE FROM payments WHERE contract_id IN (SELECT id FROM contracts WHERE customer_id = $1)", [request.customer_id]);
          await client.query("DELETE FROM contracts WHERE customer_id = $1", [request.customer_id]);
          await client.query("DELETE FROM requests WHERE customer_id = $1", [request.customer_id]);
          await client.query("DELETE FROM customers WHERE id = $1", [request.customer_id]);
          await client.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["system", `Khách hàng #${request.customer_id} đã bị xóa.`]);
        } else {
          await client.query("UPDATE customers SET owner_id = $1 WHERE id = $2", [request.request_by, request.customer_id]);
          await client.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["system", `Phân quyền khách hàng #${request.customer_id} được chấp nhận.`]);
        }
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(500).json({ success: false, message: "Lỗi xử lý yêu cầu" });
    } finally {
      client.release();
    }
  });

  // ==========================================
  // PROPERTIES API
  // ==========================================
  app.get("/api/properties", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM properties ORDER BY id DESC");
      res.json(result.rows);
    } catch (err) { res.status(500).json({ success: false, message: "Lỗi tải dự án" }); }
  });

  app.post("/api/properties", async (req, res) => {
    const { title, type, price, area, location, image_url, description, listing_type } = req.body;
    try {
      await pool.query(`INSERT INTO properties (title, type, price, area, location, status, image_url, description, listing_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [title, type, price, area, location, 'Còn trống', image_url, description, listing_type || 'Bán']);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
  });

  app.put("/api/properties/:id", async (req, res) => {
    const { id } = req.params;
    const { title, type, price, area, location, status, image_url, description, listing_type } = req.body;
    try {
      await pool.query(`UPDATE properties SET title=$1, type=$2, price=$3, area=$4, location=$5, status=$6, image_url=$7, description=$8, listing_type=$9 WHERE id=$10`, 
        [title, type, price, area, location, status, image_url, description, listing_type, id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM properties WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: "Lỗi xóa dự án" }); }
  });

  // ==========================================
  // RESERVATIONS & DEPOSITS API
  // ==========================================
  app.get("/api/reservations", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT r.*, cust.fullName as customer_name, p.title as property_title 
        FROM reservations r
        JOIN customers cust ON r.customer_id = cust.id
        JOIN properties p ON r.property_id = p.id ORDER BY r.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ success: false }); }
  });

  app.post("/api/reservations", async (req, res) => {
    const { customer_id, property_id, sales_id } = req.body;
    try {
      const reservationCode = "RES-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const result = await pool.query(`INSERT INTO reservations (customer_id, property_id, sales_id, reservation_code, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id`, 
        [customer_id, property_id, sales_id, reservationCode, expiresAt.toISOString()]);
      await pool.query("UPDATE properties SET status = 'Giữ chỗ' WHERE id = $1", [property_id]);
      res.json({ success: true, reservationId: result.rows[0].id, reservationCode });
    } catch (err) { res.status(500).json({ success: false }); }
  });

  app.get("/api/deposits", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT d.*, cust.fullName as customer_name, p.title as property_title 
        FROM deposits d
        JOIN customers cust ON d.customer_id = cust.id
        JOIN properties p ON d.property_id = p.id ORDER BY d.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ success: false }); }
  });

  app.post("/api/deposits", async (req, res) => {
    const { reservation_id, amount } = req.body;
    try {
      const resResult = await pool.query("SELECT * FROM reservations WHERE id = $1", [reservation_id]);
      const reservation = resResult.rows[0];
      
      const depResult = await pool.query(`INSERT INTO deposits (reservation_id, customer_id, property_id, amount, status) VALUES ($1, $2, $3, $4, $5) RETURNING id`, 
        [reservation_id, reservation.customer_id, reservation.property_id, amount, 'Success']);
      
      await pool.query("UPDATE reservations SET status = 'Converted' WHERE id = $1", [reservation_id]);
      await pool.query("UPDATE properties SET status = 'Đặt cọc' WHERE id = $1", [reservation.property_id]);
      res.json({ success: true, depositId: depResult.rows[0].id });
    } catch (err) { res.status(500).json({ success: false }); }
  });

  // ==========================================
  // CONTRACTS & PAYMENTS API
  // ==========================================
  app.get("/api/contracts", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.*, cust.fullName as customer_name, p.title as property_title, p.listing_type as property_listing_type
        FROM contracts c
        JOIN customers cust ON c.customer_id = cust.id
        JOIN properties p ON c.property_id = p.id ORDER BY c.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ success: false }); }
  });

  app.post("/api/contracts", async (req, res) => {
    const { customer_id, property_id, total_value, deposit, installments } = req.body;
    try {
      const result = await pool.query(`INSERT INTO contracts (customer_id, property_id, total_value, deposit_id) VALUES ($1, $2, $3, $4) RETURNING id`, 
        [customer_id, property_id, total_value, null]); // Adjust deposit_id logic as needed
      
      const contractId = result.rows[0].id;
      const installmentAmount = (total_value - deposit) / installments;
      
      for (let i = 1; i <= installments; i++) {
        const dueDate = new Date(); dueDate.setMonth(dueDate.getMonth() + i);
        await pool.query("INSERT INTO payments (contract_id, amount, due_date) VALUES ($1, $2, $3)", 
          [contractId, installmentAmount, dueDate.toISOString().split('T')[0]]);
      }
      res.json({ success: true, contractId });
    } catch (err) { res.status(500).json({ success: false }); }
  });

  app.patch("/api/contracts/:id/confirm", async (req, res) => {
    const { id } = req.params;
    const { step, confirmed } = req.body;
    try {
      const conResult = await pool.query("SELECT * FROM contracts WHERE id = $1", [id]);
      const contract = conResult.rows[0];

      if (!confirmed) {
        await pool.query("UPDATE contracts SET status = 'Cancelled' WHERE id = $1", [id]);
        await pool.query("UPDATE properties SET status = 'Còn trống' WHERE id = $1", [contract.property_id]);
        return res.json({ success: true });
      }

      let newStatus = step === 'customer' ? 'Customer_Confirmed' : 'Vendor_Confirmed';
      if (newStatus === 'Vendor_Confirmed') {
        newStatus = 'Completed';
        await pool.query("UPDATE properties SET status = 'Đã bán' WHERE id = $1", [contract.property_id]);
      }
      await pool.query("UPDATE contracts SET status = $1 WHERE id = $2", [newStatus, id]);
      res.json({ success: true, status: newStatus });
    } catch (err) { res.status(500).json({ success: false }); }
  });

  app.get("/api/payments", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT p.*, cust.fullName as customer_name, prop.title as property_title
        FROM payments p
        JOIN contracts c ON p.contract_id = c.id
        JOIN customers cust ON c.customer_id = cust.id
        JOIN properties prop ON c.property_id = prop.id ORDER BY p.due_date ASC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ success: false }); }
  });

  app.patch("/api/payments/:id/status", async (req, res) => {
    try {
      await pool.query("UPDATE payments SET status = $1 WHERE id = $2", [req.body.status, req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
  });

  // ==========================================
  // DASHBOARD STATS API
  // ==========================================
  app.get("/api/stats", async (req, res) => {
    try {
      const monthlyContracts = await pool.query("SELECT count(*) FROM contracts WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)");
      const totalRevenue = await pool.query("SELECT sum(total_value) FROM contracts WHERE status = 'Completed'");
      const pendingContracts = await pool.query("SELECT count(*) FROM contracts WHERE status IN ('Draft', 'Customer_Confirmed')");
      const newCustomers = await pool.query("SELECT count(*) FROM customers WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)");
      const propertiesForSale = await pool.query("SELECT count(*) FROM properties WHERE status = 'Còn trống'");
      const propertiesSold = await pool.query("SELECT count(*) FROM properties WHERE status = 'Đã bán'");
      const totalTransactionValue = await pool.query("SELECT sum(total_value) FROM contracts WHERE status != 'Cancelled'");
      
      const totalCustomers = await pool.query("SELECT count(*) FROM customers");
      const totalContractsCompleted = await pool.query("SELECT count(*) FROM contracts WHERE status = 'Completed'");
      
      let convRate = 0;
      if (parseInt(totalCustomers.rows[0].count) > 0) {
        convRate = (parseInt(totalContractsCompleted.rows[0].count) / parseInt(totalCustomers.rows[0].count)) * 100;
      }

      const revenueByMonth = await pool.query(`
        SELECT TO_CHAR(created_at, 'MM/YYYY') as month, sum(total_value) as revenue, count(*) as contracts
        FROM contracts WHERE status = 'Completed' GROUP BY month ORDER BY month DESC LIMIT 6
      `);

      const propDist = await pool.query("SELECT type as name, count(*) as value FROM properties GROUP BY type");
      const contractDist = await pool.query("SELECT status as name, count(*) as value FROM contracts GROUP BY status");

      res.json({
        monthlyContracts: parseInt(monthlyContracts.rows[0].count),
        totalRevenue: totalRevenue.rows[0].sum || 0,
        pendingContracts: parseInt(pendingContracts.rows[0].count),
        newCustomers: parseInt(newCustomers.rows[0].count),
        propertiesForSale: parseInt(propertiesForSale.rows[0].count),
        propertiesSold: parseInt(propertiesSold.rows[0].count),
        totalTransactionValue: totalTransactionValue.rows[0].sum || 0,
        conversionRate: Math.round(convRate),
        revenueByMonth: revenueByMonth.rows.reverse(),
        propertyTypeDistribution: propDist.rows,
        contractStatusDistribution: contractDist.rows
      });
    } catch (err) { 
      console.error("Stats API Error:", err);
      res.status(500).json({ success: false, message: "Lỗi tải thống kê" }); 
    }
  });

  // ==========================================
  // CẤU HÌNH VITE VÀ CHẠY SERVER
  // ==========================================
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      if (!req.originalUrl.startsWith('/api')) {
        res.sendFile(path.join(__dirname, "dist", "index.html"));
      }
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        let template = `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`;
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) { next(e); }
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, "0.0.0.0", () => console.log(`🚀 Server chạy thành công tại port ${port}`));
}

startServer();
