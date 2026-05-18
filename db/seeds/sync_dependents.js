
const { Client } = require('pg');
require('dotenv').config();

const dependentsData = [
    ["98343170", "M", "ANVIKA MENON", "DAUGHTER", "2020-07-30", "F"],
    ["98343170", "M", "SARIMA GOPAL", "WIFE", "1991-05-20", "F"],
    ["98348067", "M", "ALI MURTUZA ANSARI", "FATHER", "1962-01-11", "M"],
    ["98348067", "M", "SHAKILA KHATOON", "MOTHER", "1971-02-12", "F"],
    ["98348067", "M", "SHAMAILA TAHSIN", "WIFE", "1993-08-16", "F"],
    ["98348067", "M", "ZAHRA AMBER", "DAUGHTER", "2022-02-24", "F"],
    ["98345872", "M", "Somesula Veera Yamini Sudha", "WIFE", "1994-01-09", "F"],
    ["98332709", "M", "RENU K.S", "WIFE", "1978-08-01", "F"],
    ["98332709", "M", "THANIYA B NAIR", "DAUGHTER", "2000-04-22", "F"],
    ["98325986", "M", "C.VENKATA LAKSHMI", "WIFE", "1973-12-27", "F"],
    ["98325986", "M", "CVS NEERAJ NANDAN", "SON", "1999-07-23", "M"],
    ["98345942", "M", "ASHA NANDINI DEVI", "WIFE", "1994-02-27", "F"],
    ["98345942", "M", "CHINTADA JHANSI", "MOTHER", "1973-02-02", "F"],
    ["98345942", "M", "CHINTADA RAMA RAO", "FATHER", "1967-07-15", "M"],
    ["98337321", "M", "D. REVATHI", "WIFE", "1980-07-01", "F"],
    ["98337321", "M", "D.S. HARSHVADHDAN", "SON", "2005-06-10", "M"],
    ["98337321", "M", "D SHOBA", "SISTER", "1966-07-01", "F"],
    ["98337321", "M", "D.S. PRAVALIKA", "DAUGHTER", "2003-08-30", "F"],
    ["98345944", "M", "B SHARMILA", "WIFE", "1994-03-28", "F"],
    ["98345944", "M", "G CH SUBBAIAH", "FATHER", "1960-01-01", "M"],
    ["98345944", "M", "G VIJAYA LAKSHMI", "MOTHER", "1968-09-07", "F"],
    ["98345826", "M", "KAMSALI LAVANYA", "WIFE", "1996-07-09", "F"],
    ["98345826", "M", "K MUKUNDA CHARI", "FATHER", "1958-12-27", "M"],
    ["98345826", "M", "K SAVITHRI", "MOTHER", "1967-04-28", "F"],
    ["98345748", "M", "KORE VIDHATRI", "DAUGHTER", "2025-03-20", "F"],
    ["98345748", "M", "KORE VISHNU PRIYA", "WIFE", "1996-12-27", "F"],
    ["98336575", "M", "ANURADHA RAMACHANDRAN", "WIFE", "1978-09-09", "F"],
    ["98336575", "M", "RAMACHANDRAN ABHIRAMA SHANKAR", "SON", "2012-08-16", "M"],
    ["98336575", "M", "RAMACHANDRAN SIVARAMAN", "SON", "2006-02-26", "M"],
    ["98325354", "F", "SNEHA", "DAUGHTER", "2000-04-12", "F"],
    ["98325354", "F", "V.LAKSHMINARAYAN", "HUSBAND", "1962-07-20", "M"],
    ["98345722", "M", "A P HANUMANTHA REDDY", "FATHER", "1969-03-01", "M"],
    ["98345722", "M", "A P LALITHA", "MOTHER", "1975-07-01", "F"],
    ["98345722", "M", "P SAHITHI REDDY", "WIFE", "1997-02-28", "F"],
    ["98332365", "M", "P SARALA DEVI", "WIFE", "1970-04-05", "F"],
    ["98332365", "M", "P SNEHA", "DAUGHTER", "1992-04-05", "F"],
    ["98332365", "M", "P SRAVYA", "DAUGHTER", "1995-06-04", "F"],
    ["98336948", "M", "M.SHASHI SHREE", "WIFE", "1975-10-22", "F"],
    ["98336948", "M", "SHREYA GHOSH", "DAUGHTER", "2010-08-15", "F"],
    ["98336522", "M", "R ADITYA", "SON", "2011-07-07", "M"],
    ["98336522", "M", "R VIJAYA PRIYANKA", "WIFE", "1984-08-16", "F"],
    ["98334027", "M", "S. Keyur", "SON", "2002-08-30", "M"],
    ["98334027", "M", "S.SATWIK", "SON", "1995-07-08", "M"],
    ["98334027", "M", "S. SUNITHA", "WIFE", "1972-07-15", "F"],
    ["98333999", "M", "ANUSHREE SANTOSH", "DAUGHTER", "2003-11-08", "F"],
    ["98333999", "M", "ASHWIN SANTOSH CHANDRAN", "SON", "2006-05-24", "M"],
    ["98333999", "M", "SREEJA SANTOSH", "WIFE", "1980-07-30", "F"],
    ["98345652", "M", "SHAIK AMJAD ALI", "FATHER-IN-LAW", "1988-12-23", "M"],
    ["98345652", "M", "SHAIK FATHIMA", "MOTHER-IN-LAW", "1988-12-23", "F"],
    ["98345652", "M", "SHAIK MUSHEERA KOKAB", "DAUGHTER", "2015-04-15", "F"],
    ["98345652", "M", "SHAIKSHANAWAZ AHMED", "SON", "2017-03-20", "M"],
    ["98345652", "M", "SHAIK TAHIREEN", "DAUGHTER", "2012-12-29", "F"],
    ["98345652", "M", "shaik tanveer", "WIFE", "1993-01-01", "F"],
    ["98345759", "M", "Akriti Srivastava", "WIFE", "1994-07-23", "F"],
    ["98345759", "M", "ANUJA SRIVASTAVA", "MOTHER", "1967-08-01", "F"],
    ["98320323", "M", "ISHIKA DE", "DAUGHTER", "2005-04-07", "F"],
    ["98346016", "M", "HEMLATA", "MOTHER", "1981-11-28", "F"],
    ["98346016", "M", "JYOTI", "SISTER", "2000-01-01", "F"],
    ["98346016", "M", "PUSHPENDRA", "BROTHER", "2011-07-22", "M"],
    ["98346016", "M", "RAM SINGH", "FATHER", "1982-01-01", "M"],
    ["98336642", "F", "K ABHISHIKTHA V SAGAR", "SON", "2006-02-06", "M"],
    ["98336642", "F", "RAGHUVEERA", "HUSBAND", "1975-08-01", "M"],
    ["98336642", "F", "T K LAKSHMI SATHYAVATHI", "MOTHER", "1958-09-18", "F"],
    ["98336642", "F", "T V NARASIMHA RAO", "FATHER", "1956-11-12", "M"],
    ["98335515", "M", "V RUTHVIK", "SON", "2006-07-05", "M"],
    ["98335515", "M", "V. SREEDEVI", "WIFE", "1976-05-15", "F"],
    ["98335515", "M", "V VAMSHI", "SON", "2008-08-24", "M"],
    ["98336528", "M", "V. LALITHA", "MOTHER", "1946-07-01", "F"],
    ["98336528", "M", "V.N.L.SUMANA", "WIFE", "1982-09-03", "F"],
    ["98336528", "M", "V SRIDA KEYURA", "DAUGHTER", "2020-12-04", "F"],
    ["98336528", "M", "V. VEDASAI MOUKTIKA", "DAUGHTER", "2007-07-12", "F"],
    ["98345750", "M", "MADISHETTY BHAVANA", "WIFE", "1996-06-01", "F"],
    ["98345750", "M", "VELISHALA KALYANI", "MOTHER", "1975-06-06", "F"],
    ["98345750", "M", "VELISHALA RAMESH", "FATHER", "1966-11-22", "M"],
    ["98345805", "M", "BANOTHU AMRU", "FATHER", "1950-01-01", "M"],
    ["98345805", "M", "BANOTHU MANGAMMA", "MOTHER", "1968-01-01", "F"],
    ["98345805", "M", "KANISHK BANOTHU", "SON", "2023-01-05", "M"],
    ["98345805", "M", "NIDVITH BANOTHU", "SON", "2020-07-29", "M"],
    ["98345805", "M", "PRIYANKA BANOTHU", "WIFE", "1998-08-27", "F"],
    ["98345854", "M", "DEVAPUJALA VAMSI SREE ALEKHYA", "WIFE", "1995-11-09", "F"]
];

async function run() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    await client.connect();

    try {
        console.log("Starting update...");

        // Unique personal numbers in the data
        const personalNos = [...new Set(dependentsData.map(d => d[0]))];

        for (const pNo of personalNos) {
            // Find user
            const res = await client.query('SELECT id FROM users WHERE personal_no = $1', [pNo]);
            if (res.rows.length === 0) {
                console.log(`User with personal_no ${pNo} not found, skipping family details.`);
                continue;
            }

            const userId = res.rows[0].id;
            const userGender = dependentsData.find(d => d[0] === pNo)[1] === 'M' ? 'Male' : 'Female';

            // Update user gender
            await client.query('UPDATE users SET gender = $1 WHERE id = $2', [userGender, userId]);

            // Delete existing dependents for this user to avoid duplicates on sync
            await client.query('DELETE FROM dependents WHERE user_id = $1', [userId]);

            // Insert new dependents
            const userDeps = dependentsData.filter(d => d[0] === pNo);
            for (const dep of userDeps) {
                const [_, __, depName, relation, dob, depGender] = dep;
                const genderFull = depGender === 'M' ? 'Male' : 'Female';
                await client.query(
                    'INSERT INTO dependents (user_id, name, relationship, dob, gender) VALUES ($1, $2, $3, $4, $5)',
                    [userId, depName, relation, dob, genderFull]
                );
            }
            console.log(`Updated user ${pNo} with ${userDeps.length} dependents.`);
        }

        console.log("Update completed successfully.");
    } catch (err) {
        console.error("Error updating database:", err);
    } finally {
        await client.end();
    }
}

run();
