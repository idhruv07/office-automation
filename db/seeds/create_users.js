const { pool } = require('../../config/db');
const fs = require('fs');
const path = require('path');

const users = [
  {"acc": "98345722", "name": "P AMARNATH REDDY", "gender": "Male", "desig": "AAO"},
  {"acc": "98320323", "name": "SUBHENDU DE", "gender": "Male", "desig": "SAO"},
  {"acc": "98332709", "name": "BINU S NAIR", "gender": "Male", "desig": "SAO"},
  {"acc": "98345942", "name": "CHINTHADA SIVA PRASAD", "gender": "Male", "desig": "AUDITOR"},
  {"acc": "98347013", "name": "VIVEK KUMAR SINGH", "gender": "Male", "desig": "AUDITOR"},
  {"acc": "98332365", "name": "P BRAHMA REDDY", "gender": "Male", "desig": "SAO"},
  {"acc": "98325354", "name": "N.V. GIRIJA", "gender": "Female", "desig": "ACDA"},
  {"acc": "98325986", "name": "C S CHAKRAVARTHY", "gender": "Male", "desig": "SAO"},
  {"acc": "98333999", "name": "SANTOSH CHANDRAN", "gender": "Male", "desig": "SAO"},
  {"acc": "98334027", "name": "S VIJAYA BHASKAR RAO", "gender": "Male", "desig": "AAO"},
  {"acc": "98335515", "name": "V NAGA PRASAD", "gender": "Male", "desig": "SAO"},
  {"acc": "98336522", "name": "R RAVEENDRA PRASAD", "gender": "Male", "desig": "SAO"},
  {"acc": "98336528", "name": "V UDAYA KIRAN", "gender": "Male", "desig": "SAO"},
  {"acc": "98336575", "name": "N RAMACHANDRAN", "gender": "Male", "desig": "SAO"},
  {"acc": "98336642", "name": "TANGELLA VANAJA", "gender": "Female", "desig": "SAO"},
  {"acc": "98336948", "name": "PARTHA GHOSH", "gender": "Male", "desig": "SAO"},
  {"acc": "98340923", "name": "SUKHABOGHI GAUTHAM", "gender": "Male", "desig": "AUDITOR"},
  {"acc": "98341398", "name": "K V N PRASAD", "gender": "Male", "desig": "AAO"},
  {"acc": "98343170", "name": "A DEEPAK", "gender": "Male", "desig": "AAO"},
  {"acc": "98345652", "name": "SHAIK NASEER AHMED", "gender": "Male", "desig": "SR AUDITOR"},
  {"acc": "98345748", "name": "KORE VIKRAM", "gender": "Male", "desig": "SR AUDITOR"},
  {"acc": "98345750", "name": "VELISHALA KARTHIK", "gender": "Male", "desig": "SR AUDITOR"},
  {"acc": "98345759", "name": "SHIKHAR SRIVASTAVA", "gender": "Male", "desig": "SR AUDITOR"},
  {"acc": "98345805", "name": "VIJAY KUMAR B", "gender": "Male", "desig": "SR AUDITOR"},
  {"acc": "98345826", "name": "KAMMARA NAVEEN KUMAR", "gender": "Male", "desig": "AAO"},
  {"acc": "98345854", "name": "YALLASIRI P V S PRASAD", "gender": "Male", "desig": "AUDITOR"},
  {"acc": "98345856", "name": "KONDREDDY SAI KIRAN REDDY", "gender": "Male", "desig": "AUDITOR"},
  {"acc": "98345872", "name": "ANUGOLU SIVA RAMA KRISHNA", "gender": "Male", "desig": "AUDITOR"},
  {"acc": "98345943", "name": "BHOGYAM VINAY SAI TEJA", "gender": "Male", "desig": "AUDITOR"},
  {"acc": "98345944", "name": "GUNDAPANENI PAVAN KUMAR", "gender": "Male", "desig": "AUDITOR"},
  {"acc": "98345979", "name": "KAMAL", "gender": "Male", "desig": "STENO GRADE - II"},
  {"acc": "98346016", "name": "SUMIT KUMAR SAINI", "gender": "Male", "desig": "STENO GRADE - II"},
  {"acc": "98348067", "name": "AMBER MURTUZA ANSARI", "gender": "Male", "desig": "AAO"},
  {"acc": "98352779", "name": "KONGALA NORIS ANUDEEP", "gender": "Male", "desig": "AUDITOR"},
  {"acc": "111111", "name": "K M SIVA SHANKAR", "gender": "Male", "desig": "ADDL CDA"},
  {"acc": "98347760", "name": "DHRUV BHARDWAJ", "gender": "Male", "desig": "AAO"}
];

const passwordHash = '$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W'; // Hash for password '1'

async function createUsers() {
  const client = await pool.connect();
  try {
    for (const user of users) {
      console.log(`Creating user: ${user.acc} (${user.name})`);
      
      // 1. Check if user exists
      const check = await client.query('SELECT id FROM users WHERE username = $1 OR personal_no = $2', [user.acc, user.acc]);
      if (check.rows.length > 0) {
        console.log(`  User ${user.acc} already exists. Skipping.`);
        continue;
      }

      // 2. Insert into DB
      const storagePath = `/storage/${user.acc}/`;
      await client.query(
        `INSERT INTO users (username, password_hash, role_id, name, designation, personal_no, gender, storage_path, must_reset_password) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [user.acc, passwordHash, 2, user.name, user.desig, user.acc, user.gender, storagePath, true]
      );

      // 3. Create storage folders
      const baseDir = path.join(__dirname, '../../server', storagePath);
      const billsDir = path.join(baseDir, 'bills');
      const claimsDir = path.join(baseDir, 'claims');

      if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
      if (!fs.existsSync(billsDir)) fs.mkdirSync(billsDir);
      if (!fs.existsSync(claimsDir)) fs.mkdirSync(claimsDir);

      console.log(`  User ${user.acc} created successfully.`);
    }
  } catch (err) {
    console.error('Error creating users:', err);
  } finally {
    client.release();
    process.exit();
  }
}

createUsers();
