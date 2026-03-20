const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config();
const passport = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(passport.initialize());

app.get('/', (req, res) => {
  res.send('Activity Transcript API is running');
});

// Import routes
const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activities');
const reportRoutes = require('./routes/reports');
const masterDataRoutes = require('./routes/masterData');
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/master', masterDataRoutes);

// Global Error Handler (Multer & General)
app.use((err, req, res, next) => {
  if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'ไฟล์มีขนาดใหญ่เกินไป (จำกัด 10MB)' });
    }
    return res.status(400).json({ message: `ข้อผิดพลาดในการอัปโหลด: ${err.message}` });
  } else if (err.message && err.message.includes('File type not supported')) {
    return res.status(400).json({ message: err.message });
  } else if (err) {
    console.error('SERVER ERROR:', err);
    return res.status(res.statusCode === 200 ? 500 : res.statusCode).json({ message: err.message || 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
