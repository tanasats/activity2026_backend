const Activity = require('./models/activity');
require('dotenv').config();

async function runTest() {
  try {
    console.log('--- Testing Pagination (Page 1, Limit 2) ---');
    const res1 = await Activity.findAll({ page: 1, limit: 2 });
    console.log('Total:', res1.total);
    console.log('Rows count:', res1.rows.length);
    console.log('Rows:', res1.rows.map(r => r.title));

    console.log('\n--- Testing Filtering (Year 2569) ---');
    const res2 = await Activity.findAll({ academicYear: 2569 });
    console.log('Total for 2569:', res2.total);
    
    console.log('\n--- Testing Search ("กิจกรรม") ---');
    const res3 = await Activity.findAll({ search: 'กิจกรรม' });
    console.log('Total for search:', res3.total);

    process.exit(0);
  } catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
  }
}

runTest();
