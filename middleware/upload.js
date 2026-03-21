const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine target folder based on fieldname
    if (file.fieldname === 'attachments') {
      cb(null, 'uploads/attachments/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: (req, file, cb) => {
    // Generate a unique filename: uuid + extension
    const uniqueSuffix = uuidv4();
    // Fix Thai Encoding for filename from Multer
    //const utf8Name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    //cb(null, `${uniqueSuffix}${path.extname(utf8Name)}`);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File Filter (Optional: restricts types)
const fileFilter = (req, file, cb) => {
  // Broaden allowed types to include documents
  const allowedTypes = /jpeg|jpg|png|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mimetype = file.mimetype;

  // Simple extension check for document types
  const isValidExt = allowedTypes.test(ext);

  if (isValidExt) {
    return cb(null, true);
  } else {
    cb(new Error('File type not supported (Allowed: images, PDF, Word, Excel, PPT, Text)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Increased to 10MB limit for docs
  fileFilter: fileFilter
});

module.exports = upload;
