-- QuickDiag SQLite Schema Definition

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('Admin', 'Receptionist', 'Lab Technician', 'Patient')) NOT NULL,
  phone TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  dob DATE,
  blood_group TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  emergency_contact TEXT,
  doctor_ref TEXT,
  registration_date DATE DEFAULT (DATE('now')),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  prep_instructions TEXT,
  estimated_hours INTEGER DEFAULT 24,
  status TEXT DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_number TEXT UNIQUE NOT NULL,
  patient_id INTEGER NOT NULL,
  test_ids TEXT NOT NULL, -- JSON array string of test IDs
  doctor_name TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  remarks TEXT,
  status TEXT CHECK(status IN ('Booked', 'Sample Collected', 'In Lab', 'Testing', 'Report Ready', 'Completed', 'Cancelled')) DEFAULT 'Booked',
  sample_status TEXT CHECK(sample_status IN ('Pending', 'Collected', 'In Lab', 'Testing', 'Quality Check', 'Report Ready', 'Delivered')) DEFAULT 'Pending',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_number TEXT UNIQUE NOT NULL,
  appointment_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  technician_id INTEGER,
  file_path TEXT,
  digital_data_json TEXT, -- JSON structure of test parameters & observed values
  notes TEXT,
  status TEXT CHECK(status IN ('Draft', 'Report Ready', 'Delivered')) DEFAULT 'Draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  appointment_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  grand_total REAL NOT NULL,
  payment_status TEXT CHECK(payment_status IN ('Paid', 'Partial', 'Pending')) DEFAULT 'Pending',
  payment_method TEXT CHECK(payment_method IN ('Cash', 'Card', 'UPI', 'Net Banking')) DEFAULT 'Cash',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  centre_name TEXT NOT NULL DEFAULT 'QuickDiag Healthcare Centre',
  logo_url TEXT,
  address TEXT DEFAULT '123 Health Avenue, Suite 400, Tech City',
  email TEXT DEFAULT 'contact@quickdiag.com',
  phone TEXT DEFAULT '+1 (555) 019-2834',
  working_hours TEXT DEFAULT 'Mon - Sat: 07:00 AM - 08:00 PM',
  tax_rate REAL DEFAULT 18.0,
  theme_default TEXT DEFAULT 'light',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
