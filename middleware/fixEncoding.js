/**
 * Middleware to fix Thai character encoding issues in multipart/form-data.
 * This is a common issue with Multer/Busboy where it defaults to Latin1.
 */
const fixEncoding = (req, res, next) => {
  // 1. Fix req.body (Text fields)
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        try {
          // Re-decode from Latin1 to UTF-8
          req.body[key] = Buffer.from(req.body[key], 'latin1').toString('utf8');
        } catch (e) {
          // If decoding fails, keep the original (might already be UTF-8)
          console.error(`Error decoding field ${key}:`, e);
        }
      }
    }
  }

  // 2. Fix req.files (Filenames)
  if (req.files) {
    // If it's an array (multer.any() or multer.array())
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (file.originalname) {
          file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        }
      });
    } 
    // If it's an object with fieldnames (multer.fields())
    else {
      for (const fieldname in req.files) {
        req.files[fieldname].forEach(file => {
          if (file.originalname) {
            file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
          }
        });
      }
    }
  }

  next();
};

module.exports = fixEncoding;
