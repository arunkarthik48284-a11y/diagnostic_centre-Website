const bcrypt = require('bcryptjs');
const { query } = require('./db');

async function seed() {
  console.log('🌱 Starting QuickDiag Database Seeding...');

  // Initialize Schema
  await query.initSchema();

  // Reset existing data cleanly
  await query.exec(`
    DELETE FROM activity_logs;
    DELETE FROM invoices;
    DELETE FROM reports;
    DELETE FROM appointments;
    DELETE FROM patients;
    DELETE FROM tests;
    DELETE FROM users;
    DELETE FROM settings;
  `);

  // 1. Seed Settings
  await query.run(`
    INSERT INTO settings (id, centre_name, logo_url, address, email, phone, working_hours, tax_rate, theme_default)
    VALUES (1, 'QuickDiag Diagnostics & Clinical Labs', '/assets/images/logo.png', '104 Healthcare Boulevard, Medical District', 'contact@quickdiag.com', '+1 (800) 555-0199', 'Mon - Sat: 07:00 AM - 09:00 PM', 18.0, 'light')
  `);

  // 2. Seed Users
  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash('Admin@123', salt);
  const recepPass = await bcrypt.hash('Recep@123', salt);
  const techPass = await bcrypt.hash('Tech@123', salt);
  const patientPass = await bcrypt.hash('Patient@123', salt);

  const adminUser = await query.run(`
    INSERT INTO users (name, email, password_hash, role, phone, avatar)
    VALUES ('Dr. Sarah Jenkins', 'admin@quickdiag.com', ?, 'Admin', '+1 (555) 011-2233', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250')
  `, [adminPass]);

  const recepUser = await query.run(`
    INSERT INTO users (name, email, password_hash, role, phone, avatar)
    VALUES ('Emily Vance', 'reception@quickdiag.com', ?, 'Receptionist', '+1 (555) 022-3344', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250')
  `, [recepPass]);

  const techUser = await query.run(`
    INSERT INTO users (name, email, password_hash, role, phone, avatar)
    VALUES ('Alex Mercer', 'tech@quickdiag.com', ?, 'Lab Technician', '+1 (555) 033-4455', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250')
  `, [techPass]);

  const patientUser = await query.run(`
    INSERT INTO users (name, email, password_hash, role, phone, avatar)
    VALUES ('Robert Downey', 'patient@quickdiag.com', ?, 'Patient', '+1 (555) 044-5566', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250')
  `, [patientPass]);

  console.log('✅ Users seeded successfully');

  // 3. Seed 18+ Diagnostic Tests
  const testsData = [
    ['CBC (Complete Blood Count)', 'Pathology', 'Comprehensive blood panel checking RBC, WBC, Platelets, and Hemoglobin.', 45.0, 'Fasting for 8 hours required.', 12],
    ['Lipid Profile', 'Pathology', 'Measures Total Cholesterol, HDL, LDL, and Triglycerides.', 60.0, '12 hours overnight fasting.', 24],
    ['Liver Function Test (LFT)', 'Pathology', 'Evaluates Bilirubin, SGOT, SGPT, and Alkaline Phosphatase levels.', 75.0, 'Fasting for 8-10 hours.', 24],
    ['Kidney Function Test (KFT)', 'Pathology', 'Checks Urea, Creatinine, Uric Acid, and Electrolytes.', 70.0, 'Normal hydration, no alcohol 24h prior.', 24],
    ['Thyroid Profile (T3, T4, TSH)', 'Pathology', 'Assesses thyroid gland activity and hormonal balance.', 65.0, 'Morning sample preferred.', 24],
    ['Fasting Blood Sugar (FBS)', 'Pathology', 'Measures blood glucose levels after overnight fasting.', 25.0, 'Strict 8-10 hours fasting.', 6],
    ['HbA1c (Glycated Hemoglobin)', 'Pathology', 'Measures average blood sugar levels over the past 3 months.', 50.0, 'No fasting required.', 12],
    ['Vitamin D (25-OH)', 'Pathology', 'Checks vitamin D adequacy for bone health and immunity.', 85.0, 'No special prep needed.', 48],
    ['Vitamin B12', 'Pathology', 'Measures B12 concentration for nerve and blood health.', 80.0, 'Morning fasting recommended.', 48],
    ['Urine Routine & Microscopy', 'Pathology', 'Screens for urinary tract infections, kidney conditions, and diabetes.', 30.0, 'First morning mid-stream urine sample.', 12],
    ['ECG (Electrocardiogram)', 'Cardiology', 'Records electrical activity of the heart to detect arrhythmias.', 40.0, 'Wear comfortable two-piece clothing.', 2],
    ['2D Echocardiogram', 'Cardiology', 'Ultrasound imaging of the heart chambers and valves.', 150.0, 'No special prep required.', 4],
    ['Chest X-Ray (PA View)', 'Radiology', 'Digital X-ray of lungs, heart, and chest wall structure.', 55.0, 'Remove all metal objects & jewelry.', 3],
    ['Abdominal Ultrasound (USG)', 'Radiology', 'High-frequency sound wave scan of liver, gallbladder, and kidneys.', 110.0, 'Full bladder required. Drink 1L water.', 6],
    ['CT Scan Brain (Non-Contrast)', 'Radiology', '3D cross-sectional imaging for head trauma or headache evaluation.', 280.0, 'Fasting for 4 hours if contrast is added.', 12],
    ['MRI Lumbar Spine', 'Radiology', 'Detailed magnetic resonance imaging of back bones and spinal nerve roots.', 420.0, 'Inform tech if you have metal implants/pacemaker.', 24],
    ['Covid-19 RT-PCR Test', 'Molecular', 'Qualitative detection of SARS-CoV-2 RNA via nasopharyngeal swab.', 35.0, 'Avoid eating/drinking 30 mins before swab.', 12],
    ['D-Dimer Test', 'Pathology', 'Assesses blood clotting disorders and thrombosis risk.', 95.0, 'No special preparation needed.', 12]
  ];

  const testIdsMap = {};
  for (const t of testsData) {
    const res = await query.run(`
      INSERT INTO tests (test_name, category, description, price, prep_instructions, estimated_hours)
      VALUES (?, ?, ?, ?, ?, ?)
    `, t);
    testIdsMap[t[0]] = res.lastID;
  }
  console.log('✅ 18 Diagnostic tests seeded successfully');

  // 4. Seed Patients
  const patient1 = await query.run(`
    INSERT INTO patients (patient_code, name, age, gender, dob, blood_group, phone, email, address, emergency_contact, doctor_ref, user_id)
    VALUES ('PT-20260801-001', 'Robert Downey', 48, 'Male', '1978-04-12', 'O+', '+1 (555) 044-5566', 'patient@quickdiag.com', '742 Evergreen Terrace, Springfield', '+1 (555) 999-8877', 'Dr. Arthur Conan', ?)
  `, [patientUser.lastID]);

  const patient2 = await query.run(`
    INSERT INTO patients (patient_code, name, age, gender, dob, blood_group, phone, email, address, emergency_contact, doctor_ref)
    VALUES ('PT-20260802-002', 'Sophia Martinez', 34, 'Female', '1992-09-18', 'A+', '+1 (555) 123-9876', 'sophia.m@example.com', '12 Rosewood Lane, Metroville', '+1 (555) 888-7766', 'Dr. Gregory House')
  `);

  const patient3 = await query.run(`
    INSERT INTO patients (patient_code, name, age, gender, dob, blood_group, phone, email, address, emergency_contact, doctor_ref)
    VALUES ('PT-20260803-003', 'Michael Chen', 62, 'Male', '1964-02-25', 'B+', '+1 (555) 456-7890', 'mchen64@example.com', '88 Oakridge Drive, Bay Area', '+1 (555) 777-6655', 'Dr. Meredith Grey')
  `);

  const patient4 = await query.run(`
    INSERT INTO patients (patient_code, name, age, gender, dob, blood_group, phone, email, address, emergency_contact, doctor_ref)
    VALUES ('PT-20260804-004', 'Emma Watson', 29, 'Female', '1997-07-05', 'AB+', '+1 (555) 654-3210', 'emma.w@example.com', '45 High Street, London City', '+1 (555) 666-5544', 'Dr. Stephen Strange')
  `);

  const patient5 = await query.run(`
    INSERT INTO patients (patient_code, name, age, gender, dob, blood_group, phone, email, address, emergency_contact, doctor_ref)
    VALUES ('PT-20260805-005', 'David Miller', 55, 'Male', '1971-11-30', 'O-', '+1 (555) 789-0123', 'david.miller@example.com', '302 Sunset Blvd, Westside', '+1 (555) 555-4433', 'Dr. John Watson')
  `);

  console.log('✅ Patients seeded successfully');

  // 5. Seed Appointments
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const dayBeforeStr = new Date(Date.now() - 172800000).toISOString().split('T')[0];

  // Appointment 1: Completed with Report
  const apt1 = await query.run(`
    INSERT INTO appointments (appointment_number, patient_id, test_ids, doctor_name, appointment_date, appointment_time, remarks, status, sample_status, created_by)
    VALUES ('APT-20260803-101', ?, ?, 'Dr. Arthur Conan', ?, '08:30 AM', 'Routine executive health checkup', 'Completed', 'Delivered', ?)
  `, [patient1.lastID, JSON.stringify([testIdsMap['CBC (Complete Blood Count)'], testIdsMap['Lipid Profile']]), dayBeforeStr, recepUser.lastID]);

  // Appointment 2: Report Ready
  const apt2 = await query.run(`
    INSERT INTO appointments (appointment_number, patient_id, test_ids, doctor_name, appointment_date, appointment_time, remarks, status, sample_status, created_by)
    VALUES ('APT-20260804-102', ?, ?, 'Dr. Gregory House', ?, '09:15 AM', 'Complaining of fatigue & joint pain', 'Report Ready', 'Report Ready', ?)
  `, [patient2.lastID, JSON.stringify([testIdsMap['Thyroid Profile (T3, T4, TSH)'], testIdsMap['Vitamin D (25-OH)']]), yesterdayStr, recepUser.lastID]);

  // Appointment 3: Testing / In Lab
  const apt3 = await query.run(`
    INSERT INTO appointments (appointment_number, patient_id, test_ids, doctor_name, appointment_date, appointment_time, remarks, status, sample_status, created_by)
    VALUES ('APT-20260805-103', ?, ?, 'Dr. Meredith Grey', ?, '10:00 AM', 'Pre-surgery evaluation', 'Testing', 'Testing', ?)
  `, [patient3.lastID, JSON.stringify([testIdsMap['Kidney Function Test (KFT)'], testIdsMap['Liver Function Test (LFT)']]), todayStr, recepUser.lastID]);

  // Appointment 4: Sample Collected
  const apt4 = await query.run(`
    INSERT INTO appointments (appointment_number, patient_id, test_ids, doctor_name, appointment_date, appointment_time, remarks, status, sample_status, created_by)
    VALUES ('APT-20260805-104', ?, ?, 'Dr. Stephen Strange', ?, '11:30 AM', 'Diabetes monitoring', 'Sample Collected', 'Collected', ?)
  `, [patient4.lastID, JSON.stringify([testIdsMap['Fasting Blood Sugar (FBS)'], testIdsMap['HbA1c (Glycated Hemoglobin)']]), todayStr, recepUser.lastID]);

  // Appointment 5: Booked (Pending sample)
  const apt5 = await query.run(`
    INSERT INTO appointments (appointment_number, patient_id, test_ids, doctor_name, appointment_date, appointment_time, remarks, status, sample_status, created_by)
    VALUES ('APT-20260805-105', ?, ?, 'Dr. John Watson', ?, '02:00 PM', 'Chest tightness evaluation', 'Booked', 'Pending', ?)
  `, [patient5.lastID, JSON.stringify([testIdsMap['Chest X-Ray (PA View)'], testIdsMap['ECG (Electrocardiogram)']]), todayStr, recepUser.lastID]);

  console.log('✅ Appointments seeded successfully');

  // 6. Seed Reports
  await query.run(`
    INSERT INTO reports (report_number, appointment_id, patient_id, technician_id, file_path, digital_data_json, notes, status)
    VALUES ('REP-20260803-001', ?, ?, ?, '/uploads/reports/sample-cbc-report.pdf', ?, 'All blood count parameters are within normal reference ranges. Lipid profile shows slightly elevated LDL.', 'Delivered')
  `, [
    apt1.lastID,
    patient1.lastID,
    techUser.lastID,
    JSON.stringify({
      parameters: [
        { name: 'Hemoglobin', value: '14.8', unit: 'g/dL', range: '13.5 - 17.5', status: 'Normal' },
        { name: 'Total WBC Count', value: '7,200', unit: '/cumm', range: '4,000 - 11,000', status: 'Normal' },
        { name: 'Platelet Count', value: '250,000', unit: '/cumm', range: '150,000 - 450,000', status: 'Normal' },
        { name: 'Total Cholesterol', value: '215', unit: 'mg/dL', range: '< 200', status: 'Elevated' },
        { name: 'HDL Cholesterol', value: '52', unit: 'mg/dL', range: '> 40', status: 'Normal' },
        { name: 'LDL Cholesterol', value: '138', unit: 'mg/dL', range: '< 100', status: 'High' }
      ]
    })
  ]);

  await query.run(`
    INSERT INTO reports (report_number, appointment_id, patient_id, technician_id, file_path, digital_data_json, notes, status)
    VALUES ('REP-20260804-002', ?, ?, ?, '/uploads/reports/sample-thyroid-report.pdf', ?, 'TSH level is borderline elevated. Suggest clinical correlation.', 'Report Ready')
  `, [
    apt2.lastID,
    patient2.lastID,
    techUser.lastID,
    JSON.stringify({
      parameters: [
        { name: 'TSH (Thyroid Stimulating Hormone)', value: '4.85', unit: 'uIU/mL', range: '0.4 - 4.2', status: 'Elevated' },
        { name: 'Total T3', value: '1.1', unit: 'ng/mL', range: '0.8 - 2.0', status: 'Normal' },
        { name: 'Total T4', value: '7.5', unit: 'ug/dL', range: '5.1 - 14.1', status: 'Normal' },
        { name: 'Vitamin D (25-OH)', value: '18.2', unit: 'ng/mL', range: '30.0 - 100.0', status: 'Deficient' }
      ]
    })
  ]);

  console.log('✅ Diagnostic Reports seeded successfully');

  // 7. Seed Invoices
  // Invoice 1 for Apt 1: Total = 45 + 60 = 105. Tax = 18.9. Grand = 123.9
  await query.run(`
    INSERT INTO invoices (invoice_number, appointment_id, patient_id, total_amount, discount_amount, tax_amount, grand_total, payment_status, payment_method)
    VALUES ('INV-20260803-001', ?, ?, 105.00, 5.00, 18.00, 118.00, 'Paid', 'Card')
  `, [apt1.lastID, patient1.lastID]);

  // Invoice 2 for Apt 2: Total = 65 + 85 = 150. Grand = 168.00
  await query.run(`
    INSERT INTO invoices (invoice_number, appointment_id, patient_id, total_amount, discount_amount, tax_amount, grand_total, payment_status, payment_method)
    VALUES ('INV-20260804-002', ?, ?, 150.00, 0.00, 27.00, 177.00, 'Paid', 'UPI')
  `, [apt2.lastID, patient2.lastID]);

  // Invoice 3 for Apt 3: Total = 70 + 75 = 145. Grand = 161.10
  await query.run(`
    INSERT INTO invoices (invoice_number, appointment_id, patient_id, total_amount, discount_amount, tax_amount, grand_total, payment_status, payment_method)
    VALUES ('INV-20260805-003', ?, ?, 145.00, 10.00, 24.30, 159.30, 'Pending', 'Cash')
  `, [apt3.lastID, patient3.lastID]);

  // Invoice 4 for Apt 4: Total = 25 + 50 = 75. Grand = 88.50
  await query.run(`
    INSERT INTO invoices (invoice_number, appointment_id, patient_id, total_amount, discount_amount, tax_amount, grand_total, payment_status, payment_method)
    VALUES ('INV-20260805-004', ?, ?, 75.00, 0.00, 13.50, 88.50, 'Paid', 'Net Banking')
  `, [apt4.lastID, patient4.lastID]);

  console.log('✅ Invoices seeded successfully');

  // 8. Seed Activity Logs
  await query.run(`
    INSERT INTO activity_logs (user_id, action, description, ip_address)
    VALUES (?, 'User Login', 'Admin user Dr. Sarah Jenkins logged in successfully.', '127.0.0.1')
  `, [adminUser.lastID]);

  await query.run(`
    INSERT INTO activity_logs (user_id, action, description, ip_address)
    VALUES (?, 'Patient Created', 'Registered new patient Robert Downey (PT-20260801-001).', '127.0.0.1')
  `, [recepUser.lastID]);

  await query.run(`
    INSERT INTO activity_logs (user_id, action, description, ip_address)
    VALUES (?, 'Report Uploaded', 'Uploaded report REP-20260803-001 for Robert Downey.', '127.0.0.1')
  `, [techUser.lastID]);

  console.log('🎉 QuickDiag database seeding completed successfully!');
}

seed().catch(err => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
