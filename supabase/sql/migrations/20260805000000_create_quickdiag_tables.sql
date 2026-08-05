-- QuickDiag Supabase Migration File
-- Location: supabase/sql/migrations/20260805000000_create_quickdiag_tables.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Receptionist', 'Lab Technician', 'Patient')),
  phone VARCHAR(50),
  avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  patient_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  dob DATE,
  blood_group VARCHAR(10),
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  doctor_ref VARCHAR(255),
  emergency_contact VARCHAR(100),
  registration_date DATE DEFAULT CURRENT_DATE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Diagnostic Tests Catalog Table
CREATE TABLE IF NOT EXISTS tests (
  id SERIAL PRIMARY KEY,
  test_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  estimated_hours INT DEFAULT 24,
  description TEXT,
  prep_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  appointment_number VARCHAR(50) UNIQUE NOT NULL,
  patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
  test_ids TEXT,
  doctor_name VARCHAR(255),
  appointment_date DATE NOT NULL,
  appointment_time VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Booked' CHECK (status IN ('Booked', 'Sample Collected', 'In Lab', 'Testing', 'Report Ready', 'Completed', 'Cancelled')),
  sample_status VARCHAR(50) DEFAULT 'Pending' CHECK (sample_status IN ('Pending', 'Collected', 'In Lab', 'Testing', 'Quality Check', 'Report Ready', 'Delivered')),
  total_price DECIMAL(10, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  remarks TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Appointment Diagnostic Tests Mapping Table
CREATE TABLE IF NOT EXISTS appointment_tests (
  id SERIAL PRIMARY KEY,
  appointment_id INT REFERENCES appointments(id) ON DELETE CASCADE,
  test_id INT REFERENCES tests(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL
);

-- 6. Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  report_number VARCHAR(50) UNIQUE NOT NULL,
  appointment_id INT REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
  technician_id INT REFERENCES users(id) ON DELETE SET NULL,
  file_path TEXT,
  notes TEXT,
  digital_data_json JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'Report Ready' CHECK (status IN ('Report Ready', 'Delivered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  appointment_id INT REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  grand_total DECIMAL(10, 2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Partial')),
  payment_method VARCHAR(50) DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Card', 'UPI', 'Net Banking')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Diagnostic Centre Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  centre_name VARCHAR(255) DEFAULT 'QuickDiag Healthcare & Diagnostics',
  address TEXT DEFAULT '104 Healthcare Boulevard, Medical District',
  phone VARCHAR(50) DEFAULT '+1 (800) 555-0199',
  email VARCHAR(255) DEFAULT 'support@quickdiag.com',
  working_hours VARCHAR(100) DEFAULT 'Mon-Sat: 07:00 AM - 08:00 PM',
  logo_url TEXT DEFAULT 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=200',
  tax_rate DECIMAL(5, 2) DEFAULT 18.00,
  theme_default VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Activity Audit Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  description TEXT,
  ip_address VARCHAR(50) DEFAULT '127.0.0.1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_appointments_num ON appointments(appointment_number);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_reports_num ON reports(report_number);
CREATE INDEX IF NOT EXISTS idx_invoices_num ON invoices(invoice_number);
