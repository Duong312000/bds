import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// KẾT NỐI POSTGRESQL TRÊN RAILWAY
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: Missing DATABASE_URL in Environment Variables!");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// HÀM KHỞI TẠO VÀ MIGRATION DATABASE
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Tạo bảng với chuẩn PostgreSQL (SERIAL PRIMARY KEY thay vì INTEGER PRIMARY KEY AUTOINCREMENT)
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
        property_id INTEGER REFERENCES properties(id),
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


    // Seed initial data if empty
    const userCountResult = await client.query("SELECT count(*) as count FROM users");
    const userCount = parseInt(userCountResult.rows[0].count);
    
    if (userCount === 0) {
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["sales", "sales123", "sales"]);
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["manager", "manager123", "manager"]);
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ["accountant", "accountant123", "accountant"]);
      
      await client.query("INSERT INTO customers (fullName, phoneNumber, email, status) VALUES ($1, $2, $3, $4)", ["Nguyễn Văn A", "0901234567", "vana@example.com", "Tiềm năng"]);
      await client.query("INSERT INTO customers (fullName, phoneNumber, email, status) VALUES ($1, $2, $3, $4)", ["Trần Thị B", "0912345678", "thib@example.com", "Đã liên hệ"]);
      
      await client.query("INSERT INTO properties (title, type, price, area, location, status, image_url, listing_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [
        "Vinhomes Grand Park - Căn hộ S1.02", "Chung cư", 2500000000, 65, "Quận 9, TP.HCM", "Còn trống", "https://picsum.photos/seed/apartment1/800/600", "Bán"
      ]);
      await client.query("INSERT INTO properties (title, type, price, area, location, status, image_url, listing_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [
        "Biệt thự ven sông Sunshine City", "Biệt thự", 15000000000, 250, "Quận 7, TP.HCM", "Còn trống", "https://picsum.photos/seed/villa1/800/600", "Bán"
      ]);
      await client.query("INSERT INTO properties (title, type, price, area, location, status, image_url, listing_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [
        "Căn hộ Studio - Masteri Centre Point", "Chung cư", 12000000, 35, "Quận 9, TP.HCM", "Còn trống", "https://picsum.photos/seed/studio1/800/600", "Thuê"
      ]);

      await client.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["customer", "Khách hàng Nguyễn Văn A vừa đăng ký quan tâm dự án."]);
      await client.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["contract", "Hợp đồng #HD001 đã được tạo cho khách hàng Trần Thị B."]);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Lỗi khởi tạo DB:", err);
  } finally {
    client.release();
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  await initDB();

  // Auth API
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE username = $1 AND password = $2", [username, password]);
      const user = result.rows[0];
      
      if (user) {
        if (user.approved === 0) {
          return res.json({ success: false, message: "Tài khoản đang chờ quản lý duyệt", pending: true });
        }
        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, approved: !!user.approved } });
      } else {
        res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu" });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi hệ thống khi đăng nhập" });
    }
  });

  app.post("/api/register", async (req, res) => {
    const { username, password, role } = req.body;
    try {
      const allowedRoles = ["sales", "accountant"];
      const finalRole = allowedRoles.includes(role) ? role : "sales";
      
      const info = await pool.query("INSERT INTO users (username, password, role, approved) VALUES ($1, $2, $3, $4) RETURNING id", [username, password, finalRole, 0]);
      res.json({ success: true, userId: info.rows[0].id });
    } catch (err: any) {
      if (err.message.includes("unique constraint")) {
        res.status(400).json({ success: false, message: "Tên đăng nhập đã tồn tại" });
      } else {
        res.status(500).json({ success: false, message: "Lỗi hệ thống" });
      }
    }
  });

  // Customers API
  app.get("/api/customers", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.*, u.username as owner_name 
        FROM customers c 
        LEFT JOIN users u ON c.owner_id = u.id 
        ORDER BY c.id DESC
      `);
      console.log(`Found ${result.rows.length} customers`);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching customers:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách khách hàng" });
    }
  });

  app.get("/api/customers/check", async (req, res) => {
    const { nationalId, fullName } = req.query;
    let customer = null;
    
    if (nationalId && fullName) {
      const nId = String(nationalId).trim();
      const fName = String(fullName).trim();
      const result = await pool.query(`
        SELECT c.*, u.username as owner_name 
        FROM customers c 
        LEFT JOIN users u ON c.owner_id = u.id 
        WHERE TRIM(c.nationalId) = $1 AND TRIM(c.fullName) ILIKE $2
      `, [nId, fName]);
      customer = result.rows[0];
    }
    
    res.json({ exists: !!customer, customer });
  });

  app.post("/api/customers", async (req, res) => {
    const { fullName, phoneNumber, email, address, nationalId, status, owner_id, createdBy } = req.body;
    
    // Server-side validation
    if (!fullName || !nationalId) {
      return res.status(400).json({ success: false, message: "Họ tên và CCCD là bắt buộc" });
    }

    const trimmedName = String(fullName).trim();
    const trimmedCCCD = String(nationalId).trim();

    if (trimmedName.length < 3) {
      return res.status(400).json({ success: false, message: "Họ và tên phải có ít nhất 3 ký tự" });
    }

    const nameRegex = /^[\p{L}\s]+$/u;
    if (!nameRegex.test(trimmedName)) {
      return res.status(400).json({ success: false, message: "Họ và tên không được chứa ký tự đặc biệt" });
    }

    const cccdRegex = /^\d{12}$/;
    if (!cccdRegex.test(trimmedCCCD)) {
      return res.status(400).json({ success: false, message: "Số CCCD phải bao gồm đúng 12 chữ số" });
    }

    try {
      // Server-side duplicate check
      const checkResult = await pool.query("SELECT id FROM customers WHERE TRIM(nationalId) = $1 AND TRIM(fullName) ILIKE $2", [trimmedCCCD, trimmedName]);
      if (checkResult.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Khách hàng đã tồn tại trong hệ thống (trùng CCCD và Tên)" });
      }

      const info = await pool.query(`
        INSERT INTO customers (fullName, phoneNumber, email, address, nationalId, status, owner_id, createdBy) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
      `, [trimmedName, phoneNumber, email, address, trimmedCCCD, status || 'Mới', owner_id, createdBy]);
      
      // Log activity
      await pool.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["customer", `Khách hàng mới ${trimmedName} đã được thêm vào hệ thống.`]);
      
      res.json({ success: true, customerId: info.rows[0].id });
    } catch (err) {
      console.error("Error creating customer:", err);
      res.status(500).json({ success: false, message: "Lỗi khi thêm khách hàng" });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    const { fullName, phoneNumber, email, address, nationalId, status } = req.body;
    await pool.query(`
      UPDATE customers 
      SET fullName = $1, phoneNumber = $2, email = $3, address = $4, nationalId = $5, status = $6 
      WHERE id = $7
    `, [fullName, phoneNumber, email, address, nationalId, status, id]);
    res.json({ success: true });
  });

  // Requests API
  app.get("/api/requests", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          r.*, 
          c.fullName as customer_name, 
          p.title as property_title,
          u_req.username as requester_name,
          u_owner.username as current_owner_name,
          u_proc.username as processor_name
        FROM requests r
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN properties p ON r.property_id = p.id
        JOIN users u_req ON r.request_by = u_req.id
        LEFT JOIN users u_owner ON c.owner_id = u_owner.id
        LEFT JOIN users u_proc ON r.processed_by = u_proc.id
        ORDER BY r.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      // 1. In ra lỗi SQL thực sự vào màn hình đen (Server logs)
      console.error("🔥 LỖI TẠI /api/requests:", err);
      
      // 2. Tạm thời trả về mảng rỗng thay vì báo lỗi 500 
      // để Frontend KHÔNG BỊ CRASH (j.map is not a function) nữa!
      res.json([]);
    }
  });

  app.post("/api/requests", async (req, res) => {
    try {
      const { customer_id, property_id, request_by, new_data, type } = req.body;
      const checkResult = await pool.query("SELECT * FROM requests WHERE (customer_id = $1 OR property_id = $2) AND request_by = $3 AND type = $4 AND status = 'Pending'", 
        [customer_id || null, property_id || null, request_by, type || 'Ownership']);
      
      if (checkResult.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Yêu cầu đang chờ xử lý" });
      }
      
      await pool.query("INSERT INTO requests (customer_id, property_id, request_by, new_data, type) VALUES ($1, $2, $3, $4, $5)", 
        [customer_id || null, property_id || null, request_by, new_data ? JSON.stringify(new_data) : null, type || 'Ownership']);
      res.json({ success: true });
    } catch (err) {
      console.error("Error creating request:", err);
      res.status(500).json({ success: false, message: "Lỗi khi gửi yêu cầu" });
    }
  });

  app.patch("/api/requests/:id", async (req, res) => {
    const { id } = req.params;
    const { status, processed_by } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      const reqResult = await client.query("SELECT * FROM requests WHERE id = $1", [id]);
      const request = reqResult.rows[0];
      
      if (!request) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu" });
      }

      await client.query("UPDATE requests SET status = $1, processed_by = $2, processed_at = CURRENT_TIMESTAMP WHERE id = $3", [status, processed_by, id]);

      if (status === 'Approved') {
        if (request.type === 'Deletion') {
          if (request.customer_id) {
            await client.query("DELETE FROM payments WHERE contract_id IN (SELECT id FROM contracts WHERE customer_id = $1)", [request.customer_id]);
            await client.query("DELETE FROM contracts WHERE customer_id = $1", [request.customer_id]);
            await client.query("DELETE FROM requests WHERE customer_id = $1", [request.customer_id]);
            await client.query("DELETE FROM customers WHERE id = $1", [request.customer_id]);
            await client.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["system", `Khách hàng #${request.customer_id} đã được xóa sau khi yêu cầu được phê duyệt bởi ${processed_by}.`]);
          } else if (request.property_id) {
            await client.query("DELETE FROM reservations WHERE property_id = $1", [request.property_id]);
            await client.query("DELETE FROM deposits WHERE property_id = $1", [request.property_id]);
            await client.query("DELETE FROM contracts WHERE property_id = $1", [request.property_id]);
            await client.query("DELETE FROM requests WHERE property_id = $1", [request.property_id]);
            await client.query("DELETE FROM properties WHERE id = $1", [request.property_id]);
            await client.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["system", `Bất động sản #${request.property_id} đã được xóa sau khi yêu cầu được phê duyệt bởi ${processed_by}.`]);
          }
        } else if (request.type === 'PropertyUpdate') {
          if (request.new_data && request.property_id) {
            const newData = JSON.parse(request.new_data);
            await client.query(`
              UPDATE properties 
              SET title = $1, type = $2, price = $3, area = $4, location = $5, image_url = $6, description = $7, listing_type = $8
              WHERE id = $9
            `, [newData.title, newData.type, newData.price, newData.area, newData.location, newData.image_url, newData.description, newData.listing_type, request.property_id]);
            await client.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["system", `Thông tin bất động sản #${request.property_id} đã được cập nhật sau khi yêu cầu được phê duyệt bởi ${processed_by}.`]);
          }
        } else {
          if (request.new_data && request.customer_id) {
            try {
              const newData = JSON.parse(request.new_data);
              if (newData) {
                const { fullName, phoneNumber, email, address, nationalId, status: custStatus } = newData;
                await client.query(`
                  UPDATE customers 
                  SET fullName = $1, phoneNumber = $2, email = $3, address = $4, nationalId = $5, status = $6, owner_id = $7 
                  WHERE id = $8
                `, [fullName, phoneNumber, email, address, nationalId, custStatus, request.request_by, request.customer_id]);
              } else {
                await client.query("UPDATE customers SET owner_id = $1 WHERE id = $2", [request.request_by, request.customer_id]);
              }
            } catch (err) {
              await client.query("UPDATE customers SET owner_id = $1 WHERE id = $2", [request.request_by, request.customer_id]);
            }
          } else {
            await client.query("UPDATE customers SET owner_id = $1 WHERE id = $2", [request.request_by, request.customer_id]);
          }
          await client.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["system", `Yêu cầu phân quyền khách hàng #${request.customer_id} đã được chấp nhận bởi ${processed_by}.`]);
        }
      }
      
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error updating request:", err);
      res.status(500).json({ success: false, message: "Lỗi khi xử lý yêu cầu: " + (err instanceof Error ? err.message : String(err)) });
    } finally {
      client.release();
    }
  });

  // Properties API
  app.get("/api/properties", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM properties");
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching properties:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách bất động sản" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    const { title, type, price, area, location, image_url, description, listing_type } = req.body;
    try {
      await pool.query(`
        INSERT INTO properties (title, type, price, area, location, status, image_url, description, listing_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [title, type, price, area, location, 'Còn trống', image_url, description, listing_type || 'Bán']);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi thêm bất động sản" });
    }
  });

  app.put("/api/properties/:id", async (req, res) => {
    const { id } = req.params;
    const { title, type, price, area, location, image_url, description, listing_type } = req.body;
    try {
      await pool.query(`
        UPDATE properties 
        SET title = $1, type = $2, price = $3, area = $4, location = $5, image_url = $6, description = $7, listing_type = $8
        WHERE id = $9
      `, [title, type, price, area, location, image_url, description, listing_type, id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi cập nhật bất động sản" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM reservations WHERE property_id = $1", [id]);
      await client.query("DELETE FROM deposits WHERE property_id = $1", [id]);
      await client.query("DELETE FROM contracts WHERE property_id = $1", [id]);
      await client.query("DELETE FROM requests WHERE property_id = $1", [id]);
      await client.query("DELETE FROM properties WHERE id = $1", [id]);
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ success: false, message: "Lỗi khi xóa bất động sản" });
    } finally {
      client.release();
    }
  });

  // Reservations API
  app.get("/api/reservations", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT r.*, cust.fullName as customer_name, p.title as property_title 
        FROM reservations r
        JOIN customers cust ON r.customer_id = cust.id
        JOIN properties p ON r.property_id = p.id
        ORDER BY r.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách giữ chỗ" });
    }
  });

  app.post("/api/reservations", async (req, res) => {
    const { customer_id, property_id, sales_id } = req.body;
    try {
      const propResult = await pool.query("SELECT status FROM properties WHERE id = $1", [property_id]);
      const property = propResult.rows[0];
      
      if (property.status !== 'Còn trống') {
        return res.status(400).json({ success: false, message: "Căn hộ này không còn trống để giữ chỗ" });
      }

      const reservationCode = "RES-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const info = await pool.query(`
        INSERT INTO reservations (customer_id, property_id, sales_id, reservation_code, expires_at)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `, [customer_id, property_id, sales_id, reservationCode, expiresAt.toISOString()]);

      await pool.query("UPDATE properties SET status = 'Giữ chỗ' WHERE id = $1", [property_id]);

      const custResult = await pool.query("SELECT fullName FROM customers WHERE id = $1", [customer_id]);
      const customer = custResult.rows[0];
      await pool.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["system", `Sales đã tạo phiếu giữ chỗ ${reservationCode} cho khách hàng ${customer.fullName}`]);

      res.json({ success: true, reservationId: info.rows[0].id, reservationCode });
    } catch (err) {
      console.error("Error creating reservation:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tạo phiếu giữ chỗ" });
    }
  });

  // Deposits API
  app.get("/api/deposits", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT d.*, cust.fullName as customer_name, p.title as property_title 
        FROM deposits d
        JOIN customers cust ON d.customer_id = cust.id
        JOIN properties p ON d.property_id = p.id
        ORDER BY d.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách đặt cọc" });
    }
  });

  app.post("/api/deposits", async (req, res) => {
    const { reservation_id, amount } = req.body;
    try {
      const resResult = await pool.query("SELECT * FROM reservations WHERE id = $1", [reservation_id]);
      const reservation = resResult.rows[0];
      
      if (!reservation || reservation.status !== 'Active') {
        return res.status(400).json({ success: false, message: "Phiếu giữ chỗ không hợp lệ hoặc đã hết hạn" });
      }

      const info = await pool.query(`
        INSERT INTO deposits (reservation_id, customer_id, property_id, amount, status)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `, [reservation_id, reservation.customer_id, reservation.property_id, amount, 'Success']);

      const depositId = info.rows[0].id;

      await pool.query("UPDATE reservations SET status = 'Converted' WHERE id = $1", [reservation_id]);
      await pool.query("UPDATE properties SET status = 'Đặt cọc' WHERE id = $1", [reservation.property_id]);

      const propResult = await pool.query("SELECT price FROM properties WHERE id = $1", [reservation.property_id]);
      const property = propResult.rows[0];
      
      const contractInfo = await pool.query(`
        INSERT INTO contracts (customer_id, property_id, deposit_id, total_value, status)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `, [reservation.customer_id, reservation.property_id, depositId, property.price, 'Draft']);

      const custResult = await pool.query("SELECT fullName FROM customers WHERE id = $1", [reservation.customer_id]);
      const customer = custResult.rows[0];
      await pool.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["contract", `Hệ thống đã tự động tạo hợp đồng cho khách hàng ${customer.fullName} sau khi đặt cọc thành công`]);

      res.json({ success: true, depositId, contractId: contractInfo.rows[0].id });
    } catch (err) {
      console.error("Error creating deposit:", err);
      res.status(500).json({ success: false, message: "Lỗi khi xác nhận đặt cọc" });
    }
  });

  // Contract Confirmation API
  app.patch("/api/contracts/:id/confirm", async (req, res) => {
    const { id } = req.params;
    const { step, confirmed } = req.body;
    try {
      const conResult = await pool.query("SELECT * FROM contracts WHERE id = $1", [id]);
      const contract = conResult.rows[0];
      
      if (!contract) return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng" });

      if (!confirmed) {
        await pool.query("UPDATE contracts SET status = 'Cancelled' WHERE id = $1", [id]);
        await pool.query("UPDATE properties SET status = 'Còn trống' WHERE id = $1", [contract.property_id]);
        return res.json({ success: true, message: "Hợp đồng đã bị hủy và căn hộ đã được mở lại" });
      }

      let newStatus = contract.status;
      if (step === 'customer') {
        newStatus = 'Customer_Confirmed';
      } else if (step === 'vendor') {
        newStatus = 'Vendor_Confirmed';
      }

      if (newStatus === 'Vendor_Confirmed') {
        newStatus = 'Completed';
        await pool.query("UPDATE properties SET status = 'Đã bán' WHERE id = $1", [contract.property_id]);
      }

      await pool.query("UPDATE contracts SET status = $1 WHERE id = $2", [newStatus, id]);

      const statusLabel = newStatus === 'Completed' ? 'hoàn tất' : (step === 'customer' ? 'khách hàng xác nhận' : 'nhà cung cấp xác nhận');
      await pool.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["system", `Hợp đồng #${id} đã được ${statusLabel}`]);

      res.json({ success: true, status: newStatus });
    } catch (err) {
      console.error("Error confirming contract:", err);
      res.status(500).json({ success: false, message: "Lỗi khi xác nhận hợp đồng" });
    }
  });

  app.get("/api/contracts", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          c.*, 
          cust.fullName as customer_name, 
          cust.phoneNumber as customer_phone,
          cust.email as customer_email,
          cust.address as customer_address,
          cust.nationalId as customer_nationalId,
          p.title as property_title,
          p.location as property_location,
          p.type as property_type,
          p.area as property_area,
          p.listing_type as property_listing_type
        FROM contracts c
        JOIN customers cust ON c.customer_id = cust.id
        JOIN properties p ON c.property_id = p.id
        ORDER BY c.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching contracts:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách hợp đồng" });
    }
  });

  app.post("/api/contracts", async (req, res) => {
    const { customer_id, property_id, total_value, deposit, installments } = req.body;
    try {
      const info = await pool.query(`
        INSERT INTO contracts (customer_id, property_id, total_value, deposit_id)
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [customer_id, property_id, total_value, null]); // Adjusted deposit param for PG schema
      
      const contractId = info.rows[0].id;
      
      const custResult = await pool.query("SELECT fullName FROM customers WHERE id = $1", [customer_id]);
      const customer = custResult.rows[0];
      await pool.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["contract", `Hợp đồng mới được tạo cho khách hàng ${customer.fullName}`]);

      const installmentAmount = (total_value - deposit) / installments;
      for (let i = 1; i <= installments; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        await pool.query(`
          INSERT INTO payments (contract_id, amount, due_date)
          VALUES ($1, $2, $3)
        `, [contractId, installmentAmount, dueDate.toISOString().split('T')[0]]);
      }

      res.json({ success: true, contractId });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi tạo hợp đồng" });
    }
  });

  app.patch("/api/contracts/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await pool.query("UPDATE contracts SET status = $1 WHERE id = $2", [status, id]);
      
      await pool.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["system", `Hợp đồng #HD${String(id).padStart(4, '0')} đã được chuyển sang trạng thái: ${status}`]);

      if (status === 'Đã duyệt') {
        const conResult = await pool.query("SELECT property_id FROM contracts WHERE id = $1", [id]);
        await pool.query("UPDATE properties SET status = 'Đã bán' WHERE id = $1", [conResult.rows[0].property_id]);
      }
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi cập nhật trạng thái hợp đồng" });
    }
  });

  // Payments API
  app.get("/api/payments", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT p.*, cust.fullName as customer_name, prop.title as property_title
        FROM payments p
        JOIN contracts c ON p.contract_id = c.id
        JOIN customers cust ON c.customer_id = cust.id
        JOIN properties prop ON c.property_id = prop.id
        ORDER BY p.due_date ASC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching payments:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách thanh toán" });
    }
  });

  app.patch("/api/payments/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await pool.query("UPDATE payments SET status = $1 WHERE id = $2", [status, id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi cập nhật trạng thái thanh toán" });
    }
  });

  // Dashboard Stats
  app.get("/api/stats", async (req, res) => {
    try {
      const monthlyContracts = await pool.query("SELECT count(*) as count FROM contracts WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)");
      const totalRevenue = await pool.query("SELECT sum(total_value) as total FROM contracts WHERE status = 'Completed'");
      const pendingContracts = await pool.query("SELECT count(*) as count FROM contracts WHERE status IN ('Draft', 'Customer_Confirmed')");
      
      const newCustomers = await pool.query("SELECT count(*) as count FROM customers WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)");
      const propertiesForSale = await pool.query("SELECT count(*) as count FROM properties WHERE status = 'Còn trống'");
      const propertiesSold = await pool.query("SELECT count(*) as count FROM properties WHERE status = 'Đã bán'");
      const totalTransactionValue = await pool.query("SELECT sum(total_value) as total FROM contracts WHERE status != 'Cancelled'");

      const totalCustomers = await pool.query("SELECT count(*) as count FROM customers");
      const totalContracts = await pool.query("SELECT count(*) as count FROM contracts WHERE status = 'Completed'");
      
      const tCustCount = parseInt(totalCustomers.rows[0].count);
      const tConCount = parseInt(totalContracts.rows[0].count);
      const conversionRate = tCustCount > 0 ? (tConCount / tCustCount) * 100 : 0;

      const revenueByMonth = await pool.query(`
        SELECT TO_CHAR(created_at, 'MM/YYYY') as month, sum(total_value) as revenue, count(*) as contracts
        FROM contracts
        WHERE status = 'Completed'
        GROUP BY month
        ORDER BY MIN(created_at) ASC
        LIMIT 6
      `);

      const propertyTypeDistribution = await pool.query(`
        SELECT type as name, count(*) as value
        FROM properties
        GROUP BY type
      `);

      const contractStatusDistribution = await pool.query(`
        SELECT status as name, count(*) as value
        FROM contracts
        GROUP BY status
      `);

      res.json({
        monthlyContracts: parseInt(monthlyContracts.rows[0].count),
        totalRevenue: totalRevenue.rows[0].total || 0,
        pendingContracts: parseInt(pendingContracts.rows[0].count),
        newCustomers: parseInt(newCustomers.rows[0].count),
        propertiesForSale: parseInt(propertiesForSale.rows[0].count),
        propertiesSold: parseInt(propertiesSold.rows[0].count),
        totalTransactionValue: totalTransactionValue.rows[0].total || 0,
        conversionRate: Math.round(conversionRate),
        revenueByMonth: revenueByMonth.rows,
        propertyTypeDistribution: propertyTypeDistribution.rows,
        contractStatusDistribution: contractStatusDistribution.rows
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải thống kê" });
    }
  });

  app.get("/api/activities", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM activities ORDER BY timestamp DESC LIMIT 10");
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching activities:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải hoạt động" });
    }
  });

  app.get("/api/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ customers: [], properties: [], contracts: [] });

    const query = `%${q}%`;
    try {
      const customers = await pool.query("SELECT * FROM customers WHERE fullName ILIKE $1 OR phoneNumber ILIKE $2 LIMIT 5", [query, query]);
      const properties = await pool.query("SELECT * FROM properties WHERE title ILIKE $1 OR location ILIKE $2 LIMIT 5", [query, query]);
      const contracts = await pool.query(`
        SELECT c.*, cust.fullName as customer_name, p.title as property_title 
        FROM contracts c
        JOIN customers cust ON c.customer_id = cust.id
        JOIN properties p ON c.property_id = p.id
        WHERE cust.fullName ILIKE $1 OR p.title ILIKE $2
        LIMIT 5
      `, [query, query]);

      res.json({ customers: customers.rows, properties: properties.rows, contracts: contracts.rows });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi tìm kiếm" });
    }
  });

  app.get("/api/users", async (req, res) => {
    const { role } = req.query;
    try {
      let query = "SELECT id, username, role, approved FROM users";
      const params: any[] = [];
      if (role) {
        query += " WHERE role = $1";
        params.push(role);
      }
      const result = await pool.query(query, params);
      res.json(result.rows.map((u: any) => ({ ...u, approved: !!u.approved })));
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách nhân viên" });
    }
  });

  app.patch("/api/users/:id/approve", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("UPDATE users SET approved = 1 WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi duyệt tài khoản" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`[Server] Deleting user ID: ${id}`);
    try {
      await pool.query("DELETE FROM users WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error(`[Server] Delete user error:`, err);
      res.status(500).json({ success: false, message: "Lỗi khi xóa nhân viên" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    const { user_id, role } = req.body || {};
    
    if (!role || (role !== 'manager' && role !== 'admin')) {
      return res.status(403).json({ success: false, message: "Chỉ quản lý mới có quyền xóa trực tiếp" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      // 1. Delete payments linked to contracts of this customer
      await client.query(`
        DELETE FROM payments 
        WHERE contract_id IN (SELECT id FROM contracts WHERE customer_id = $1)
      `, [id]);

      // 2. Delete contracts
      await client.query("DELETE FROM contracts WHERE customer_id = $1", [id]);

      // 3. Delete requests
      await client.query("DELETE FROM requests WHERE customer_id = $1", [id]);
      
      // 4. Delete customer
      await client.query("DELETE FROM customers WHERE id = $1", [id]);
      
      // 5. Log activity
      await client.query("INSERT INTO activities (type, content) VALUES ($1, $2)", ["system", `Khách hàng #${id} đã được xóa trực tiếp bởi quản lý ID: ${user_id || 'N/A'}.`]);
      
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error('Delete customer error:', err);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi khi xóa khách hàng: " + (err instanceof Error ? err.message : String(err)) 
      });
    } finally {
      client.release();
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
