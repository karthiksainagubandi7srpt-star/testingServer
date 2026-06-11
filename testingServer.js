const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');

app.use(cors({ origin: '*' }));
app.use(express.json());



app.put('/api/fetch-sum', async (req, res) => {
    const { firstnumber, secondnumber } = req.body;
try {
    const sumofnumbers = firstnumber + secondnumber;
return res.json({ success: true, message: 'User added successfully!', sum: sumofnumbers });
} catch (err) {
        console.error('Format error:', err.message);
}
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
