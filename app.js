const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.post('/upload', upload.single('file'), (req, res) => {
    const results = [];

    fs.createReadStream(req.file.path)
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
            fs.unlinkSync(req.file.path); // Clean up uploaded file
            res.json(results); // Send parsed CSV data to frontend
        });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});