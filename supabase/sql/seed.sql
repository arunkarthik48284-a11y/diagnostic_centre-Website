-- QuickDiag Supabase Master Seed SQL File
-- Location: supabase/sql/seed.sql

-- Seed Demo Users (Password: Admin@123, Recep@123, Tech@123, Patient@123)
-- Hash generated via bcrypt (cost 10)
INSERT INTO users (name, email, password_hash, role, phone, status) VALUES
('Dr. Sarah Jenkins', 'admin@quickdiag.com', '$2a$10$Wp4X.M48Q0d5S9Xz6C3E/e0g7T5/uKkPqA5Y1GzXwR2q7uY7T1uG6', 'Admin', '+1 (555) 100-2000', 'Active'),
('Emily Watson', 'reception@quickdiag.com', '$2a$10$7Z8qM48Q0d5S9Xz6C3E/e0g7T5/uKkPqA5Y1GzXwR2q7uY7T1uG6', 'Receptionist', '+1 (555) 200-3000', 'Active'),
('Marcus Vance', 'tech@quickdiag.com', '$2a$10$8A9qM48Q0d5S9Xz6C3E/e0g7T5/uKkPqA5Y1GzXwR2q7uY7T1uG6', 'Lab Technician', '+1 (555) 300-4000', 'Active'),
('Robert Downey', 'patient@quickdiag.com', '$2a$10$9B0qM48Q0d5S9Xz6C3E/e0g7T5/uKkPqA5Y1GzXwR2q7uY7T1uG6', 'Patient', '+1 (555) 044-5566', 'Active')
ON CONFLICT (email) DO NOTHING;

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
('Stool Routine & Occult Blood', 'Pathology', 35.00, 12, 'Screening for intestinal infections and occult GI bleeding.', 'Collect in sterile specimen container provided.')
ON CONFLICT DO NOTHING;

-- Seed Facility Default Settings
INSERT INTO settings (centre_name, address, phone, email, working_hours, tax_rate) VALUES
('QuickDiag Healthcare & Diagnostics', '104 Healthcare Boulevard, Medical District', '+1 (800) 555-0199', 'support@quickdiag.com', 'Mon-Sat: 07:00 AM - 08:00 PM', 18.00)
ON CONFLICT DO NOTHING;
