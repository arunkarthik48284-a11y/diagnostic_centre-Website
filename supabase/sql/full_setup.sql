-- QuickDiag Complete Supabase Setup Script (Clean Reset + Schema + Seed)
-- Copy and paste this ENTIRE file into Supabase SQL Editor and click "Run"

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing tables if they exist to avoid column name conflicts
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS appointment_tests CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table (With password_hash)
CREATE TABLE users (
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
CREATE TABLE patients (
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
CREATE TABLE tests (
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
CREATE TABLE appointments (
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
CREATE TABLE appointment_tests (
  id SERIAL PRIMARY KEY,
  appointment_id INT REFERENCES appointments(id) ON DELETE CASCADE,
  test_id INT REFERENCES tests(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL
);

-- 6. Reports Table
CREATE TABLE reports (
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
CREATE TABLE invoices (
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
CREATE TABLE settings (
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
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  description TEXT,
  ip_address VARCHAR(50) DEFAULT '127.0.0.1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_patients_code ON patients(patient_code);
CREATE INDEX idx_appointments_num ON appointments(appointment_number);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_reports_num ON reports(report_number);
CREATE INDEX idx_invoices_num ON invoices(invoice_number);

-- ========================================================
-- SEED INITIAL DATA
-- ========================================================

-- Seed Demo Users
INSERT INTO users (name, email, password_hash, role, phone, status) VALUES
('P.Ravi', 'admin@quickdiag.com', '$2a$10$Wp4X.M48Q0d5S9Xz6C3E/e0g7T5/uKkPqA5Y1GzXwR2q7uY7T1uG6', 'Admin', '+1 (555) 100-2000', 'Active'),
('Emily Watson', 'reception@quickdiag.com', '$2a$10$7Z8qM48Q0d5S9Xz6C3E/e0g7T5/uKkPqA5Y1GzXwR2q7uY7T1uG6', 'Receptionist', '+1 (555) 200-3000', 'Active'),
('Marcus Vance', 'tech@quickdiag.com', '$2a$10$8A9qM48Q0d5S9Xz6C3E/e0g7T5/uKkPqA5Y1GzXwR2q7uY7T1uG6', 'Lab Technician', '+1 (555) 300-4000', 'Active'),
('Robert Downey', 'patient@quickdiag.com', '$2a$10$9B0qM48Q0d5S9Xz6C3E/e0g7T5/uKkPqA5Y1GzXwR2q7uY7T1uG6', 'Patient', '+1 (555) 044-5566', 'Active');

-- Seed Diagnostic Tests
INSERT INTO tests (test_name, category, price, estimated_hours, description, prep_instructions) VALUES
('CBC (Complete Blood Count)', 'Pathology', 45.00, 12, 'Includes RBC, WBC, Hemoglobin, Hematocrit, and Platelets count.', 'No special preparation required.'),
('Lipid Profile', 'Pathology', 60.00, 24, 'Evaluates Cholesterol, Triglycerides, HDL, LDL, and VLDL levels.', 'Requires 10-12 hours overnight fasting.'),
('Liver Function Test (LFT)', 'Pathology', 75.00, 24, 'Checks Bilirubin, SGOT, SGPT, Alkaline Phosphatase, and Albumin.', 'Avoid alcohol for 24 hours prior to sample collection.'),
('Kidney Function Test (KFT)', 'Pathology', 70.00, 24, 'Measures Serum Creatinine, Blood Urea Nitrogen, Uric Acid, and Electrolytes.', 'Stay adequately hydrated before sample collection.'),
('Thyroid Profile (T3, T4, TSH)', 'Pathology', 65.00, 24, 'Comprehensive thyroid hormones assay to check metabolic balance.', 'Morning sample preferred.'),
('HbA1c (Glycated Hemoglobin)', 'Pathology', 50.00, 12, 'Measures average blood sugar control over the past 3 months.', 'Fasting not required.'),
('Chest X-Ray PA View', 'Radiology', 55.00, 6, 'Digital X-ray for pulmonary and cardiac anatomical evaluation.', 'Remove metal objects or jewelry before scan.'),
('Abdominal Ultrasound (USG)', 'Radiology', 110.00, 12, 'Ultrasound imaging of liver, gallbladder, kidneys, and spleen.', 'Full bladder required. Drink 1L water 1 hour prior.'),
('MRI Brain (Plain)', 'Radiology', 350.00, 48, 'High-resolution magnetic resonance imaging of brain parenchyma.', 'Report any metal implants or pacemakers to radiologist.'),
('CT Scan Chest (HRCT)', 'Radiology', 220.00, 24, 'High-resolution computed tomography scan of lung tissue.', 'Fast for 4 hours if contrast dye is advised.'),
('ECG 12-Lead', 'Cardiology', 40.00, 2, 'Electrocardiogram measuring electrical activity of heart chambers.', 'Rest comfortably 10 minutes prior to recording.'),
('2D Echocardiogram (Echo)', 'Radiology', 150.00, 12, 'Ultrasound Doppler evaluation of heart valves and ejection fraction.', 'No special preparation needed.'),
('TMT (Treadmill Stress Test)', 'Cardiology', 130.00, 12, 'Exercise cardiac stress test under ECG monitoring.', 'Wear comfortable athletic clothing and walking shoes.'),
('RT-PCR Viral Panel', 'Molecular', 95.00, 18, 'Molecular real-time PCR detection of viral RNA pathogens.', 'Nasopharyngeal swab. Avoid nasal sprays 2 hours prior.'),
('Vitamin D Total (25-OH)', 'Pathology', 80.00, 24, 'Chemiluminescence immunoassay for 25-hydroxy vitamin D levels.', 'Fasting optional.'),
('Vitamin B12 Assay', 'Pathology', 70.00, 24, 'Serum cyanocobalamin quantification for nerve health.', 'Overnight fasting recommended.'),
('Urine Routine & Microscopy', 'Pathology', 30.00, 6, 'Physical, chemical, and microscopic urinalysis.', 'First morning mid-stream urine sample preferred.'),
('Stool Routine & Occult Blood', 'Pathology', 35.00, 12, 'Screening for intestinal infections and occult GI bleeding.', 'Collect in sterile specimen container provided.'),
('Random Plasma Glucose', 'Pathology', 120.00, 6, 'Random Plasma Glucose blood sugar test.', 'No special fasting required.'),
('Complete Urine Examination (CUE)', 'Pathology', 200.00, 6, 'Complete Urine Examination physical, chemical & microscopic analysis.', 'Clean mid-stream morning sample.'),
('Complete Blood Picture / Haemogram', 'Pathology', 400.00, 12, 'Complete Blood Picture / Haemogram evaluation.', 'No special preparation needed.'),
('Liver Function Test (LFT - Vijaya)', 'Pathology', 690.00, 24, 'Evaluates Bilirubin, SGOT, SGPT, and liver enzymes.', 'Avoid alcohol 24 hours prior.'),
('Lipid Profile (Vijaya Special)', 'Pathology', 690.00, 24, 'Measures Cholesterol, Triglycerides, HDL, and LDL.', 'Overnight 10-12 hours fasting required.'),
('Thyroid Stimulating Hormone (TSH - Vijaya)', 'Pathology', 340.00, 24, 'Thyroid Stimulating Hormone assay for thyroid regulation.', 'Morning sample preferred.'),
('Vitamin B12 / Vitamin D Total', 'Pathology', 1350.00, 24, 'Assay for Vitamin B12 and Vitamin D Total levels.', 'Fasting optional.'),
('Electrocardiogram (ECG - Vijaya)', 'Radiology & Cardiology', 350.00, 2, '12-Lead Electrocardiogram measuring heart electrical activity.', 'Rest 10 minutes prior.'),
('Ultrasound (Abdomen - Vijaya)', 'Radiology & Cardiology', 1500.00, 12, 'Abdominal USG scan of liver, kidneys, gallbladder and spleen.', 'Full bladder required.'),
('Basic / Preventive Health Checkup', 'Health Packages', 999.00, 24, 'Basic Preventive Health Package including key pathology & urine tests.', '10-12 hours overnight fasting required.'),
('Comprehensive Full Body Checkup', 'Health Packages', 3500.00, 24, 'Full Body Package with complete pathology, organ panels & ECG.', 'Overnight fasting required.');

-- Seed Facility Default Settings
INSERT INTO settings (centre_name, address, phone, email, working_hours, tax_rate) VALUES
('QuickDiag Healthcare & Diagnostics', '104 Healthcare Boulevard, Medical District', '+1 (800) 555-0199', 'support@quickdiag.com', 'Mon-Sat: 07:00 AM - 08:00 PM', 18.00);
