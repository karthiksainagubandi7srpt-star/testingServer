const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// 1. Configure the Database Connection Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, 
    ssl: {
        rejectUnauthorized: false // Required for secure Render database connections
    }
});


// 3. Login API Endpoint
const jwt = require('jsonwebtoken');

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Fetch user by username only (Secure querying design pattern)
        const result = await pool.query(
            'SELECT * FROM logindata WHERE username = $1', 
            [username]
        );

        if (result.rows.length > 0) {
            const foundUser = result.rows[0];

            // 2. Structural Plain-text Match Gate (Switch to bcrypt hashing later!)
            if (foundUser.password !== password) {
                return res.status(401).json({ success: true, message: 'Invalid credentials provided.' });
            }

            // 3. Cryptographically sign a token containing user identity details
            // Note: Use a random string fallback if JWT_SECRET environment variable is missing
            const secretKey = process.env.JWT_SECRET || 'SRI_CHAITANYA_SUPER_SECRET_KEY_2026';
            const token = jwt.sign(
                { username: foundUser.username, role: foundUser.role },
                secretKey,
                { expiresIn: '8h' } // Token auto-expires after 8 hours
            );

            // 4. Return matching data packet structure expected by the login UI
            return res.json({ 
                success: true, 
                token: token, 
                role: foundUser.role, 
                username: foundUser.username 
            });

        } else {
            return res.status(401).json({ success: true, message: 'Invalid credentials provided.' });
        }
    } catch (err) {
        console.error('Login Exception Error Log:', err);
        return res.status(500).json({ success: false, message: 'Database lookup error.' });
    }
});
// 4. User Creation API Endpoint

// 🚀 SECURE ACCOUNT PROVISIONING ENDPOINT
app.post('/api/create-user', async (req, res) => {
    // 1. Extract the Authorization Bearer Token from HTTP Headers
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Splits 'Bearer <token>'

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied: Missing session token.' });
    }

    try {
        // 2. Decode and cryptographically verify the token signature
        const secretKey = process.env.JWT_SECRET || 'SRI_CHAITANYA_SUPER_SECRET_KEY_2026';
        const decodedUser = jwt.verify(token, secretKey);

        // 3. RBAC Check: Hard-verify the request source has an Admin role identity
        if (decodedUser.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges.' });
        }

        // 4. Unpack payload strings transmitted by your create-user.html form
        const { newUsername, newPassword, newRole } = req.body;

        if (!newUsername || !newPassword || !newRole) {
            return res.status(400).json({ success: false, message: 'Validation Error: Missing required fields.' });
        }

        // 5. Conflict Resolution: Check if the Username / Student ID already exists
        const duplicateCheck = await pool.query(
            'SELECT username FROM logindata WHERE username = $1',
            [newUsername]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Account Registration Conflict: Username already taken.' });
        }

        // 6. DB Writing Block: Safely inject elements via prepared parametric constraints
        // NOTE: If you decide to add password hashing later, hash 'newPassword' right before this step!
        const insertQuery = `

            INSERT INTO logindata (username, password, role) 
            VALUES ($1, $2, $3) 
                `;
        
        await pool.query(insertQuery, [newUsername, newPassword, newRole]);

        // 7. Success Loop Return
        return res.status(201).json({ 
            success: true, 
            message: `Account for ${newUsername} (${newRole.toUpperCase()}) successfully created!` 
        });

    } catch (err) {
        // Catch expired or tampered token exceptions securely
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(403).json({ success: false, message: 'Session expired or altered. Please log back in.' });
        }
        
        console.error('System Account Provisioning Fault Log:', err);
        return res.status(500).json({ success: false, message: 'Database runtime insertion error.' });
    }
});

// 5. Fetch All student data
app.get('/api/view-users', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM users ORDER BY id ASC'
        );
        return res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error('Database fetch operation error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to extract database logs.' });
    }
});

// 6. Fetch All student marks
app.get('/api/view-marks', async (req, res) => {
    try {
        const queryText = `SELECT id, username, marks, RANK() OVER (ORDER BY marks DESC) AS calculated_rank FROM marks`;
        const result = await pool.query(queryText);
        return res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error('Database fetch operation error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to extract database logs.' });
    }
});

// 7. Fetch single student profile details
app.get('/api/fetch-student/:id', async (req, res) => {
    const studentId = req.params.id;

    try {
        let result = await pool.query(
            `SELECT id, username FROM users WHERE id = $1`,
            [studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Student ID does not exist.' });
        }

        let studentData = result.rows[0];

        // Fetch existing marks to populate the form field accurately
        let marksResult = await pool.query(`SELECT marks FROM marks WHERE id = $1`, [studentId]);
        studentData.marks = marksResult.rows.length > 0 ? marksResult.rows[0].marks : 0;

        return res.json({ success: true, student: studentData });
    } catch (err) {
        console.error('Fetch student endpoint error:', err.message);
        return res.status(500).json({ success: false, message: 'Server database error lookup.' });
    }
});

// 8. Add students profiles
app.post('/api/add-user', async (req, res) => {
    const { username, email, age, gender, contactno, score10th, board, address } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO users (username, email, age, gender, contactno, score10th, board, address) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [username, email, age, gender, contactno, score10th, board, address]
        );
        return res.json({ success: true, message: 'User added successfully!' });
    } catch (err) {
        console.error('Database insertion error:', err.message);
        return res.status(500).json({ success: false, message: 'Server database error.' });
    }
});

// 9. Update student marks endpoint (FIXED: Rebuilt the missing execution blocks safely)
app.put('/api/update-marks/:id', async (req, res) => {
    const studentid = parseInt(req.params.id.toString().trim(), 10);
    const { username, marks } = req.body; 

    if (marks === undefined || marks === null || marks === '') {
        return res.status(400).json({ success: false, message: 'Marks value is required.' });
    }
    
    const numericMarks = Math.round(Number(marks));
    
    if (isNaN(numericMarks) || isNaN(studentid)) {
        return res.status(400).json({ 
            success: false, 
            message: `Invalid format error. Received ID: "${req.params.id}", Received Marks: "${marks}"` 
        });
    }

    try {
        const result = await pool.query(
            `UPDATE marks 
             SET marks = $1, username = $2
             WHERE id = $3`,
            [numericMarks, username || '', studentid]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Student record not found.' });
        }
        
        return res.json({ success: true, message: 'Marks updated successfully!' });
    } catch (err) {
        console.error('Database update error:', err.message);
        return res.status(500).json({ success: false, message: 'Server database error.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
