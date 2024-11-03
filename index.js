const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream'); // Allows conversion of buffer to stream
const path = require('path');

const app = express();
const PORT = 3000;

// Use multer's memory storage to keep files in memory
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, 'public')));

app.post('/upload', upload.single('file'), (req, res) => {
    const results = [];
    
    // Convert buffer to a readable stream
    const stream = new Readable();
    stream.push(req.file.buffer);
    stream.push(null);

    stream
        .pipe(csv())
        .on('data', (data) => {
            results.push({
                signature: data.Signature,
                timestamp: data.Timestamp,
                type: data.Type,
                from: data.Source,
                to: data.Destination,
                amount: parseFloat(data.Amount),
                decimals: parseInt(data.Decimals, 10),
                tokenAddress: data['Token Address']
            });
        })
        .on('end', () => {
            res.json(results); // Send parsed CSV data to frontend
        });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});