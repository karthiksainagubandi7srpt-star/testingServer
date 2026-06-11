const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.put('/api/fetch-sum', async (req, res) => {
    const { firstnumber, secondnumber } = req.body;
    
    try {
        // Convert strings to numbers to prevent string concatenation (e.g., "5" + "5" = "55")
        const num1 = Number(firstnumber);
        const num2 = Number(secondnumber);

        if (isNaN(num1) || isNaN(num2)) {
            return res.status(400).json({ success: false, message: 'Please provide valid numbers.' });
        }

        const sumofnumbers = num1 + num2;
        return res.json({ success: true, message: 'Calculation successful!', sum: sumofnumbers });
        
    } catch (err) {
        console.error('Format error:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    } // <-- Fixed: Added missing closing brace for try block
}); // <-- Fixed: Added missing closing brace for route handler

app.put('/api/fetch-message', async (req, res) => {
    const { hi } = req.body;
    
    try {
        // Convert strings to numbers to prevent string concatenation (e.g., "5" + "5" = "55")
        if (isNaN(hi)) {
            return res.status(400).json({ success: false, message: 'Please provide valid numbers.' });
        }
        const greeting = `Hello, ${name}! Welcome back.`; 
        return res.json({ success: true, message: 'Calculation successful!', note: greeting });
        
    } catch (err) {
        console.error('Format error:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    } // <-- Fixed: Added missing closing brace for try block
}); // <-- Fixed: Added missing closing brace for route handler

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
