-- Database Schema for Activity Transcript System

-- Faculties master table
CREATE TABLE IF NOT EXISTS faculties (
    id SERIAL PRIMARY KEY,
    faculty_code VARCHAR(10) UNIQUE NOT NULL,
    faculty_name VARCHAR(255) NOT NULL,
    faculty_name_en VARCHAR(255),
    faculty_name_abb VARCHAR(50),
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Authentication table (replaces users and roles)
CREATE TABLE IF NOT EXISTS userauth (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(255),
    profile_image TEXT,
    role VARCHAR(20) DEFAULT 'guest', -- student, staff, guest, admin, superadmin
    faculty_code VARCHAR(10) REFERENCES faculties(faculty_code),
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hours INTEGER DEFAULT 0,
    credits INTEGER DEFAULT 0,
    max_participants INTEGER,
    registration_start TIMESTAMP WITH TIME ZONE,
    registration_end TIMESTAMP WITH TIME ZONE,
    activity_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'ขออนุมัติ', -- ขออนุมัติ, ดำเนินการ, สิ้นสุด, ยกเลิก
    cover_image TEXT,
    creator_id INTEGER REFERENCES userauth(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Registrations table
CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES userauth(id),
    activity_id INTEGER REFERENCES activities(id),
    status VARCHAR(20) DEFAULT 'registered', -- registered, attended, cancelled
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, activity_id)
);

-- Initial Faculty Data
INSERT INTO faculties (id, faculty_code, faculty_name) VALUES
(1,'01','คณะมนุษยศาสตร์และสังคมศาสตร์'),
(2,'02','คณะวิทยาศาสตร์'),
(3,'03','คณะวิศวกรรมศาสตร์'),
(4,'04','คณะพยาบาลศาสตร์'),
(5,'05','คณะศึกษาศาสตร์'),
(7,'07','คณะเภสัชศาสตร์'),
(8,'08','คณะเทคโนโลยี'),
(9,'09','คณะการบัญชีและการจัดการ'),
(10,'10','คณะการท่องเที่ยวและการโรงแรม'),
(11,'11','คณะสถาปัตยกรรมศาสตร์ ผังเมืองและนฤมิตศิลป์'),
(12,'12','คณะวิทยาการสารสนเทศ'),
(13,'13','วิทยาลัยการเมืองการปกครอง'),
(14,'14','คณะสาธารณสุขศาสตร์'),
(15,'15','คณะแพทยศาสตร์'),
(16,'17','คณะสิ่งแวดล้อมและทรัพยากรศาสตร์'),
(17,'20','วิทยาลัยดุริยางคศิลป์'),
(19,'22','คณะสัตวแพทยศาสตร์'),
(20,'23','คณะนิติศาสตร์'),
(21,'24','คณะศิลปกรรมศาสตร์และวัฒนธรรมศาสตร์'),
(22,'25','สำนักคอมพิวเตอร์'),
(6,'06','คณะศิลปกรรมศาสตร์และวัฒนธรรมศาสตร์(ไม่ใช้)'),
(18,'21','คณะศิลปกรรมศาสตร์และวัฒนธรรมศาสตร์(ไม่ใช้)')
ON CONFLICT (faculty_code) DO UPDATE SET faculty_name = EXCLUDED.faculty_name;
