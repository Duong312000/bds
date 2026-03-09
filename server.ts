import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("realestate.db");
db.exec("PRAGMA foreign_keys = ON;");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    approved INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT,
    phoneNumber TEXT,
    email TEXT,
    address TEXT,
    nationalId TEXT,
    status TEXT DEFAULT 'Mới',
    owner_id INTEGER,
    createdBy INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id),
    FOREIGN KEY(createdBy) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    request_by INTEGER,
    type TEXT DEFAULT 'Ownership',
    status TEXT DEFAULT 'Pending',
    new_data TEXT,
    processed_by INTEGER,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(request_by) REFERENCES users(id),
    FOREIGN KEY(processed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    property_id INTEGER,
    sales_id INTEGER,
    reservation_code TEXT UNIQUE,
    status TEXT DEFAULT 'Active',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(property_id) REFERENCES properties(id),
    FOREIGN KEY(sales_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER,
    customer_id INTEGER,
    property_id INTEGER,
    amount REAL,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reservation_id) REFERENCES reservations(id),
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(property_id) REFERENCES properties(id)
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    property_id INTEGER,
    deposit_id INTEGER,
    total_value REAL,
    status TEXT DEFAULT 'Draft',
    file_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(property_id) REFERENCES properties(id),
    FOREIGN KEY(deposit_id) REFERENCES deposits(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER,
    amount REAL,
    due_date TEXT,
    status TEXT DEFAULT 'Chưa thanh toán',
    invoice_url TEXT,
    FOREIGN KEY(contract_id) REFERENCES contracts(id)
  );
`);

try {
  db.prepare("ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 1").run();
} catch (e) {}

// Migration: Add 'type' column to properties if it doesn't exist
try {
  db.prepare("ALTER TABLE properties ADD COLUMN type TEXT DEFAULT 'Chung cư'").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE activities ADD COLUMN type TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE requests ADD COLUMN processed_by INTEGER").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE requests ADD COLUMN processed_at DATETIME").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE requests ADD COLUMN new_data TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE requests ADD COLUMN type TEXT DEFAULT 'Ownership'").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE requests ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE contracts ADD COLUMN deposit_id INTEGER").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE contracts ADD COLUMN file_url TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE contracts DROP COLUMN deposit").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE contracts DROP COLUMN installments").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE customers ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE customers RENAME COLUMN createdDate TO created_at").run();
} catch (e) {}

  // Migration: Rename old customer columns to new names if they exist
  try {
    db.prepare("ALTER TABLE customers RENAME COLUMN name TO fullName").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE customers RENAME COLUMN phone TO phoneNumber").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE customers ADD COLUMN createdDate DATETIME DEFAULT CURRENT_TIMESTAMP").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE customers ADD COLUMN owner_id INTEGER").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE customers ADD COLUMN createdBy INTEGER").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE customers ADD COLUMN address TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE customers ADD COLUMN email TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE customers ADD COLUMN nationalId TEXT").run();
  } catch (e) {}

try {
  db.prepare("ALTER TABLE properties ADD COLUMN description TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE properties ADD COLUMN listing_type TEXT DEFAULT 'Bán'").run();
} catch (e) {}

// Seed initial data if empty
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("sales", "sales123", "sales");
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("manager", "manager123", "manager");
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("accountant", "accountant123", "accountant");
  
  db.prepare("INSERT INTO customers (fullName, phoneNumber, email, status) VALUES (?, ?, ?, ?)").run("Nguyễn Văn A", "0901234567", "vana@example.com", "Tiềm năng");
  db.prepare("INSERT INTO customers (fullName, phoneNumber, email, status) VALUES (?, ?, ?, ?)").run("Trần Thị B", "0912345678", "thib@example.com", "Đã liên hệ");
  
  db.prepare("INSERT INTO properties (title, type, price, area, location, status, image_url, listing_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    "Vinhomes Grand Park - Căn hộ S1.02", "Chung cư", 2500000000, 65, "Quận 9, TP.HCM", "Còn trống", "https://picsum.photos/seed/apartment1/800/600", "Bán"
  );
  db.prepare("INSERT INTO properties (title, type, price, area, location, status, image_url, listing_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    "Biệt thự ven sông Sunshine City", "Biệt thự", 15000000000, 250, "Quận 7, TP.HCM", "Còn trống", "https://picsum.photos/seed/villa1/800/600", "Bán"
  );
  db.prepare("INSERT INTO properties (title, type, price, area, location, status, image_url, listing_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    "Căn hộ Studio - Masteri Centre Point", "Chung cư", 12000000, 35, "Quận 9, TP.HCM", "Còn trống", "https://picsum.photos/seed/studio1/800/600", "Thuê"
  );

  db.prepare("INSERT INTO activities (type, content) VALUES (?, ?)").run("customer", "Khách hàng Nguyễn Văn A vừa đăng ký quan tâm dự án.");
  db.prepare("INSERT INTO activities (type, content) VALUES (?, ?)").run("contract", "Hợp đồng #HD001 đã được tạo cho khách hàng Trần Thị B.");
}

async function startServer() {
  const app = express();
  
  // Tăng giới hạn nhận JSON và URL-encoded lên 10MB để thoải mái chứa ảnh Base64
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Auth API
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
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

  app.post("/api/register", (req, res) => {
    const { username, password, role } = req.body;
    try {
      // Validate allowed roles for registration
      const allowedRoles = ["sales", "accountant"];
      const finalRole = allowedRoles.includes(role) ? role : "sales";
      
      const info = db.prepare("INSERT INTO users (username, password, role, approved) VALUES (?, ?, ?, ?)").run(username, password, finalRole, 0);
      res.json({ success: true, userId: info.lastInsertRowid });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ success: false, message: "Tên đăng nhập đã tồn tại" });
      } else {
        res.status(500).json({ success: false, message: "Lỗi hệ thống" });
      }
    }
  });

  // Customers API
  app.get("/api/customers", (req, res) => {
    try {
      const customers = db.prepare(`
        SELECT c.*, u.username as owner_name 
        FROM customers c 
        LEFT JOIN users u ON c.owner_id = u.id 
        ORDER BY c.id DESC
      `).all();
      console.log(`Found ${customers.length} customers`);
      res.json(customers);
    } catch (err) {
      console.error("Error fetching customers:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách khách hàng" });
    }
  });

  app.get("/api/customers/check", (req, res) => {
    const { nationalId, fullName } = req.query;
    let customer = null;
    
    if (nationalId && fullName) {
      const nId = String(nationalId).trim();
      const fName = String(fullName).trim();
      customer = db.prepare(`
        SELECT c.*, u.username as owner_name 
        FROM customers c 
        LEFT JOIN users u ON c.owner_id = u.id 
        WHERE TRIM(c.nationalId) = ? AND TRIM(c.fullName) = ? COLLATE NOCASE
      `).get(nId, fName);
    }
    
    res.json({ exists: !!customer, customer });
  });

  app.post("/api/customers", (req, res) => {
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
      const existing = db.prepare("SELECT id FROM customers WHERE TRIM(nationalId) = ? AND TRIM(fullName) = ? COLLATE NOCASE").get(trimmedCCCD, trimmedName);
      if (existing) {
        return res.status(400).json({ success: false, message: "Khách hàng đã tồn tại trong hệ thống (trùng CCCD và Tên)" });
      }

      const info = db.prepare(`
        INSERT INTO customers (fullName, phoneNumber, email, address, nationalId, status, owner_id, createdBy) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(trimmedName, phoneNumber, email, address, trimmedCCCD, status || 'Mới', owner_id, createdBy);
      
      // Log activity
      db.prepare("INSERT INTO activities (type, content) VALUES (?, ?)").run("customer", `Khách hàng mới ${trimmedName} đã được thêm vào hệ thống.`);
      
      res.json({ success: true, customerId: info.lastInsertRowid });
    } catch (err) {
      console.error("Error creating customer:", err);
      res.status(500).json({ success: false, message: "Lỗi khi thêm khách hàng" });
    }
  });

  app.put("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    const { fullName, phoneNumber, email, address, nationalId, status } = req.body;
    db.prepare(`
      UPDATE customers 
      SET fullName = ?, phoneNumber = ?, email = ?, address = ?, nationalId = ?, status = ? 
      WHERE id = ?
    `).run(fullName, phoneNumber, email, address, nationalId, status, id);
    res.json({ success: true });
  });

  // Requests API
  app.get("/api/requests", (req, res) => {
    try {
      const requests = db.prepare(`
        SELECT 
          r.*, 
          c.fullName as customer_name, 
          u_req.username as requester_name,
          u_owner.username as current_owner_name,
          u_proc.username as processor_name
        FROM requests r
        JOIN customers c ON r.customer_id = c.id
        JOIN users u_req ON r.request_by = u_req.id
        LEFT JOIN users u_owner ON c.owner_id = u_owner.id
        LEFT JOIN users u_proc ON r.processed_by = u_proc.id
        ORDER BY r.created_at DESC
      `).all();
      res.json(requests);
    } catch (err) {
      console.error("Error fetching requests:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách yêu cầu" });
    }
  });

  app.post("/api/requests", (req, res) => {
    try {
      const { customer_id, request_by, new_data, type } = req.body;
      // Check if a pending request of same type already exists
      const existing = db.prepare("SELECT * FROM requests WHERE customer_id = ? AND request_by = ? AND type = ? AND status = 'Pending'").get(customer_id, request_by, type || 'Ownership');
      if (existing) {
        return res.status(400).json({ success: false, message: "Yêu cầu đang chờ xử lý" });
      }
      db.prepare("INSERT INTO requests (customer_id, request_by, new_data, type) VALUES (?, ?, ?, ?)").run(customer_id, request_by, new_data ? JSON.stringify(new_data) : null, type || 'Ownership');
      res.json({ success: true });
    } catch (err) {
      console.error("Error creating request:", err);
      res.status(500).json({ success: false, message: "Lỗi khi gửi yêu cầu" });
    }
  });

  app.patch("/api/requests/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status, processed_by } = req.body;
      
      const request = db.prepare("SELECT * FROM requests WHERE id = ?").get(id) as any;
      if (!request) return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu" });

      db.transaction(() => {
        db.prepare("UPDATE requests SET status = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, processed_by, id);

        if (status === 'Approved') {
          if (request.type === 'Deletion') {
            // Delete related records first to avoid FOREIGN KEY constraint failed
            // 1. Delete payments linked to contracts of this customer
            db.prepare(`
              DELETE FROM payments 
              WHERE contract_id IN (SELECT id FROM contracts WHERE customer_id = ?)
            `).run(request.customer_id);

            // 2. Delete contracts
            db.prepare("DELETE FROM contracts WHERE customer_id = ?").run(request.customer_id);

            // 3. Delete ALL requests for this customer
            db.prepare("DELETE FROM requests WHERE customer_id = ?").run(request.customer_id);
            
            // 4. Delete customer
            db.prepare("DELETE FROM customers WHERE id = ?").run(request.customer_id);
            db.prepare("INSERT INTO activities (type, content) VALUES (?, ?)").run("system", `Khách hàng #${request.customer_id} đã được xóa sau khi yêu cầu được phê duyệt bởi ${processed_by}.`);
          } else {
            // Transfer ownership and update data if new_data exists
            if (request.new_data) {
              try {
                const newData = JSON.parse(request.new_data);
                if (newData) {
                  const { fullName, phoneNumber, email, address, nationalId, status: custStatus } = newData;
                  db.prepare(`
                    UPDATE customers 
                    SET fullName = ?, phoneNumber = ?, email = ?, address = ?, nationalId = ?, status = ?, owner_id = ? 
                    WHERE id = ?
                  `).run(fullName, phoneNumber, email, address, nationalId, custStatus, request.request_by, request.customer_id);
                } else {
                  db.prepare("UPDATE customers SET owner_id = ? WHERE id = ?").run(request.request_by, request.customer_id);
                }
              } catch (err) {
                console.error("Error updating customer from request data:", err);
                db.prepare("UPDATE customers SET owner_id = ? WHERE id = ?").run(request.request_by, request.customer_id);
              }
            } else {
              db.prepare("UPDATE customers SET owner_id = ? WHERE id = ?").run(request.request_by, request.customer_id);
            }
            db.prepare("INSERT INTO activities (type, content) VALUES (?, ?)").run("system", `Yêu cầu phân quyền khách hàng #${request.customer_id} đã được chấp nhận bởi ${processed_by}.`);
          }
        }
      })();

      res.json({ success: true });
    } catch (err) {
      console.error("Error updating request:", err);
      res.status(500).json({ success: false, message: "Lỗi khi xử lý yêu cầu: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  // Properties API
  app.get("/api/properties", (req, res) => {
    try {
      const properties = db.prepare("SELECT * FROM properties").all();
      res.json(properties);
    } catch (err) {
      console.error("Error fetching properties:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách bất động sản" });
    }
  });

  app.post("/api/properties", (req, res) => {
    const { title, type, price, area, location, image_url, description, listing_type } = req.body;
    try {
      db.prepare(`
        INSERT INTO properties (title, type, price, area, location, status, image_url, description, listing_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(title, type, price, area, location, 'Còn trống', image_url, description, listing_type || 'Bán');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi thêm bất động sản" });
    }
  });

  // 1. API ĐỂ XỬ LÝ KHI BẠN BẤM LƯU/CẬP NHẬT (Bao gồm cả ảnh mới)
  app.put("/api/properties/:id", (req, res) => {
    const { id } = req.params;
    const { title, type, price, area, location, status, image_url, description, listing_type } = req.body;
    try {
      db.prepare(`
        UPDATE properties 
        SET title = ?, type = ?, price = ?, area = ?, location = ?, status = ?, image_url = ?, description = ?, listing_type = ?
        WHERE id = ?
      `).run(title, type, price, area, location, status, image_url, description, listing_type, id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating property:", err);
      res.status(500).json({ success: false, message: "Lỗi khi cập nhật bất động sản" });
    }
  });

  // 2. API ĐỂ XỬ LÝ KHI BẠN BẤM XÓA DỰ ÁN
  app.delete("/api/properties/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM properties WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting property:", err);
      res.status(500).json({ success: false, message: "Lỗi khi xóa bất động sản" });
    }
  });

  // Reservations API
  app.get("/api/reservations", (req, res) => {
    try {
      const reservations = db.prepare(`
        SELECT r.*, cust.fullName as customer_name, p.title as property_title 
        FROM reservations r
        JOIN customers cust ON r.customer_id = cust.id
        JOIN properties p ON r.property_id = p.id
        ORDER BY r.created_at DESC
      `).all();
      res.json(reservations);
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách giữ chỗ" });
    }
  });

  app.post("/api/reservations", (req, res) => {
    const { customer_id, property_id, sales_id } = req.body;
    try {
      // Check if property is available
      const property = db.prepare("SELECT status FROM properties WHERE id = ?").get(property_id) as any;
      if (property.status !== 'Còn trống') {
        return res.status(400).json({ success: false, message: "Căn hộ này không còn trống để giữ chỗ" });
      }

      const reservationCode = "RES-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours reservation

      const info = db.prepare(`
        INSERT INTO reservations (customer_id, property_id, sales_id, reservation_code, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(customer_id, property_id, sales_id, reservationCode, expiresAt.toISOString());

      // Update property status
      db.prepare("UPDATE properties SET status = 'Giữ chỗ' WHERE id = ?").run(property_id);

      // Log activity
      const customer = db.prepare("SELECT fullName FROM customers WHERE id = ?").get(customer_id) as any;
      db.prepare("INSERT INTO activities (type, content) VALUES (?, ?)").run("system", `Sales đã tạo phiếu giữ chỗ ${reservationCode} cho khách hàng ${customer.fullName}`);

      res.json({ success: true, reservationId: info.lastInsertRowid, reservationCode });
    } catch (err) {
      console.error("Error creating reservation:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tạo phiếu giữ chỗ" });
    }
  });

  // Deposits API
  app.get("/api/deposits", (req, res) => {
    try {
      const deposits = db.prepare(`
        SELECT d.*, cust.fullName as customer_name, p.title as property_title 
        FROM deposits d
        JOIN customers cust ON d.customer_id = cust.id
        JOIN properties p ON d.property_id = p.id
        ORDER BY d.created_at DESC
      `).all();
      res.json(deposits);
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách đặt cọc" });
    }
  });

  app.post("/api/deposits", (req, res) => {
    const { reservation_id, amount } = req.body;
    try {
      const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(reservation_id) as any;
      if (!reservation || reservation.status !== 'Active') {
        return res.status(400).json({ success: false, message: "Phiếu giữ chỗ không hợp lệ hoặc đã hết hạn" });
      }

      const info = db.prepare(`
        INSERT INTO deposits (reservation_id, customer_id, property_id, amount, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(reservation_id, reservation.customer_id, reservation.property_id, amount, 'Success');

      const depositId = info.lastInsertRowid;

      // Update reservation status
      db.prepare("UPDATE reservations SET status = 'Converted' WHERE id = ?").run(reservation_id);

      // Update property status
      db.prepare("UPDATE properties SET status = 'Đặt cọc' WHERE id = ?").run(reservation.property_id);

      // Automatically generate contract (Step 4)
      const property = db.prepare("SELECT price FROM properties WHERE id = ?").get(reservation.property_id) as any;
      const contractInfo = db.prepare(`
        INSERT INTO contracts (customer_id, property_id, deposit_id, total_value, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(reservation.customer_id, reservation.property_id, depositId, property.price, 'Draft');

      // Log activity
      const customer = db.prepare("SELECT fullName FROM customers WHERE id = ?").get(reservation.customer_id) as any;
      db.prepare("INSERT INTO activities (type, content) VALUES (?, ?)").run("contract", `Hệ thống đã tự động tạo hợp đồng cho khách hàng ${customer.fullName} sau khi đặt cọc thành công`);

      res.json({ success: true, depositId, contractId: contractInfo.lastInsertRowid });
    } catch (err) {
      console.error("Error creating deposit:", err);
      res.status(500).json({ success: false, message: "Lỗi khi xác nhận đặt cọc" });
    }
  });

  // Contract Confirmation API
  app.patch("/api/contracts/:id/confirm", (req, res) => {
    const { id } = req.params;
    const { step, confirmed } = req.body;
    try {
      const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(id) as any;
      if (!contract) return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng" });

      if (!confirmed) {
        db.prepare("UPDATE contracts SET status = 'Cancelled' WHERE id = ?").run(id);
        db.prepare("UPDATE properties SET status = 'Còn trống' WHERE id = ?").run(contract.property_id);
        return res.json({ success: true, message: "Hợp đồng đã bị hủy và căn hộ đã được mở lại" });
      }

      let newStatus = contract.status;
      if (step === 'customer') {
        newStatus = 'Customer_Confirmed';
      } else if (step === 'vendor') {
        newStatus = 'Vendor_Confirmed';
      }

      // If vendor confirmed, mark as completed
      if (newStatus === 'Vendor_Confirmed') {
        newStatus = 'Completed';
        db.prepare("UPDATE properties SET status = 'Đã bán' WHERE id = ?").run(contract.property_id);
      }

      db.prepare("UPDATE contracts SET status = ? WHERE id = ?").run(newStatus, id);

      // Log activity
      const statusLabel = newStatus === 'Completed' ? 'hoàn tất' : (step === 'customer' ? 'khách hàng xác nhận' : 'nhà cung cấp xác nhận');
      db.prepare("INSERT INTO activities (type, content) VALUES (?, ?)").run("system", `Hợp đồng #${id} đã được ${statusLabel}`);

      res.json({ success: true, status: newStatus });
    } catch (err) {
      console.error("Error confirming contract:", err);
      res.status(500).json({ success: false, message: "Lỗi khi xác nhận hợp đồng" });
    }
  });

  app.get("/api/contracts", (req, res) => {
    try {
      const contracts = db.prepare(`
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
      `).all();
      res.json(contracts);
    } catch (err) {
      console.error("Error fetching contracts:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách hợp đồng" });
    }
  });

  app.post("/api/contracts", (req, res) => {
    const { customer_id, property_id, total_value, deposit, installments } = req.body;
    const info = db.prepare(`
      INSERT INTO contracts (customer_id, property_id, total_value, deposit, installments)
      VALUES (?, ?, ?, ?, ?)
    `).run(customer_id, property_id, total_value, deposit, installments);
    
    // Log activity
    const customer = db.prepare("SELECT fullName FROM customers WHERE id = ?").get(customer_id) as any;
    db.prepare("INSERT INTO activities (type, content) VALUES (?, ?)").run("contract", `Hợp đồng mới được tạo cho khách hàng ${customer.fullName}`);

    // Create initial payments
    const contractId = info.lastInsertRowid;
    const installmentAmount = (total_value - deposit) / installments;
    for (let i = 1; i <= installments; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      db.prepare(`
        INSERT INTO payments (contract_id, amount, due_date)
        VALUES (?, ?, ?)
      `).run(contractId, installmentAmount, dueDate.toISOString().split('T')[0]);
    }

    res.json({ success: true, contractId });
  });

  app.patch("/api/contracts/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE contracts SET status = ? WHERE id = ?").run(status, id);
    
    // Log activity
    db.prepare("INSERT INTO activities (type, content) VALUES (?, ?)").run("system", `Hợp đồng #HD${String(id).padStart(4, '0')} đã được chuyển sang trạng thái: ${status}`);

    // If approved, mark property as sold
    if (status === 'Đã duyệt') {
      const contract = db.prepare("SELECT property_id FROM contracts WHERE id = ?").get(id) as any;
      db.prepare("UPDATE properties SET status = 'Đã bán' WHERE id = ?").run(contract.property_id);
    }
    
    res.json({ success: true });
  });

  // Payments API
  app.get("/api/payments", (req, res) => {
    try {
      const payments = db.prepare(`
        SELECT p.*, cust.fullName as customer_name, prop.title as property_title
        FROM payments p
        JOIN contracts c ON p.contract_id = c.id
        JOIN customers cust ON c.customer_id = cust.id
        JOIN properties prop ON c.property_id = prop.id
        ORDER BY p.due_date ASC
      `).all();
      res.json(payments);
    } catch (err) {
      console.error("Error fetching payments:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách thanh toán" });
    }
  });

  app.patch("/api/payments/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare("UPDATE payments SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi cập nhật trạng thái thanh toán" });
    }
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    try {
      const monthlyContracts = db.prepare("SELECT count(*) as count FROM contracts WHERE strftime('%m', created_at) = strftime('%m', 'now')").get() as any;
      const totalRevenue = db.prepare("SELECT sum(total_value) as total FROM contracts WHERE status = 'Completed'").get() as any;
      const pendingContracts = db.prepare("SELECT count(*) as count FROM contracts WHERE status IN ('Draft', 'Customer_Confirmed')").get() as any;
      
      const newCustomers = db.prepare("SELECT count(*) as count FROM customers WHERE strftime('%m', created_at) = strftime('%m', 'now')").get() as any;
      const propertiesForSale = db.prepare("SELECT count(*) as count FROM properties WHERE status = 'Còn trống'").get() as any;
      const propertiesSold = db.prepare("SELECT count(*) as count FROM properties WHERE status = 'Đã bán'").get() as any;
      const totalTransactionValue = db.prepare("SELECT sum(total_value) as total FROM contracts WHERE status != 'Cancelled'").get() as any;

      const totalCustomers = db.prepare("SELECT count(*) as count FROM customers").get() as any;
      const totalContracts = db.prepare("SELECT count(*) as count FROM contracts WHERE status = 'Completed'").get() as any;
      const conversionRate = totalCustomers.count > 0 ? (totalContracts.count / totalCustomers.count) * 100 : 0;

      const revenueByMonth = db.prepare(`
        SELECT strftime('%m/%Y', created_at) as month, sum(total_value) as revenue, count(*) as contracts
        FROM contracts
        WHERE status = 'Completed'
        GROUP BY month
        ORDER BY created_at ASC
        LIMIT 6
      `).all();

      const propertyTypeDistribution = db.prepare(`
        SELECT type as name, count(*) as value
        FROM properties
        GROUP BY type
      `).all();

      const contractStatusDistribution = db.prepare(`
        SELECT status as name, count(*) as value
        FROM contracts
        GROUP BY status
      `).all();

      res.json({
        monthlyContracts: monthlyContracts.count,
        totalRevenue: totalRevenue.total || 0,
        pendingContracts: pendingContracts.count,
        newCustomers: newCustomers.count,
        propertiesForSale: propertiesForSale.count,
        propertiesSold: propertiesSold.count,
        totalTransactionValue: totalTransactionValue.total || 0,
        conversionRate: Math.round(conversionRate),
        revenueByMonth,
        propertyTypeDistribution,
        contractStatusDistribution
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải thống kê" });
    }
  });

  app.get("/api/activities", (req, res) => {
    try {
      const activities = db.prepare("SELECT * FROM activities ORDER BY timestamp DESC LIMIT 10").all();
      res.json(activities);
    } catch (err) {
      console.error("Error fetching activities:", err);
      res.status(500).json({ success: false, message: "Lỗi khi tải hoạt động" });
    }
  });

  app.get("/api/search", (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ customers: [], properties: [], contracts: [] });

    const query = `%${q}%`;
    const customers = db.prepare("SELECT * FROM customers WHERE fullName LIKE ? OR phoneNumber LIKE ? LIMIT 5").all(query, query);
    const properties = db.prepare("SELECT * FROM properties WHERE title LIKE ? OR location LIKE ? LIMIT 5").all(query, query);
    const contracts = db.prepare(`
      SELECT c.*, cust.fullName as customer_name, p.title as property_title 
      FROM contracts c
      JOIN customers cust ON c.customer_id = cust.id
      JOIN properties p ON c.property_id = p.id
      WHERE cust.fullName LIKE ? OR p.title LIKE ?
      LIMIT 5
    `).all(query, query);

    res.json({ customers, properties, contracts });
  });

  app.get("/api/users", (req, res) => {
    const { role } = req.query;
    try {
      let query = "SELECT id, username, role, approved FROM users";
      const params: any[] = [];
      if (role) {
        query += " WHERE role = ?";
        params.push(role);
      }
      const users = db.prepare(query).all(...params);
      res.json(users.map((u: any) => ({ ...u, approved: !!u.approved })));
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi tải danh sách nhân viên" });
    }
  });

  app.patch("/api/users/:id/approve", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("UPDATE users SET approved = 1 WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Lỗi khi duyệt tài khoản" });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    console.log(`[Server] Deleting user ID: ${id}`);
    try {
      const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
      console.log(`[Server] Delete result:`, result);
      res.json({ success: true });
    } catch (err) {
      console.error(`[Server] Delete user error:`, err);
      res.status(500).json({ success: false, message: "Lỗi khi xóa nhân viên" });
    }
  });

  app.delete("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    const { user_id, role } = req.body || {};
    
    if (!role || (role !== 'manager' && role !== 'admin')) {
      return res.status(403).json({ success: false, message: "Chỉ quản lý mới có quyền xóa trực tiếp" });
    }

    try {
      db.transaction(() => {
        // 1. Delete payments linked to contracts of this customer
        db.prepare(`
          DELETE FROM payments 
          WHERE contract_id IN (SELECT id FROM contracts WHERE customer_id = ?)
        `).run(id);

        // 2. Delete contracts
        db.prepare("DELETE FROM contracts WHERE customer_id = ?").run(id);

        // 3. Delete requests
        db.prepare("DELETE FROM requests WHERE customer_id = ?").run(id);
        
        // 4. Delete customer
        db.prepare("DELETE FROM customers WHERE id = ?").run(id);
        
        // 5. Log activity
        db.prepare("INSERT INTO activities (type, content) VALUES (?, ?)").run("system", `Khách hàng #${id} đã được xóa trực tiếp bởi quản lý ID: ${user_id || 'N/A'}.`);
      })();
      
      res.json({ success: true });
    } catch (err) {
      console.error('Delete customer error:', err);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi khi xóa khách hàng: " + (err instanceof Error ? err.message : String(err)) 
      });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
