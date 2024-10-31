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

async function uploadFile() {
    const fileInput = document.getElementById('file-input');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error('File upload failed');
        }
        const data = await response.json();
        createBubbleMap(data);
    } catch (error) {
        console.error(error);
        alert('File upload failed. Please ensure the file is a valid CSV.');
    }
}

function createBubbleMap(data) {
    const width = window.innerWidth;
    const height = window.innerHeight * 0.9;
    const chart = d3.select('#chart').html(''); // Clear existing chart
    const svg = chart.append('svg')
        .attr('width', width)
        .attr('height', height)
        .call(d3.zoom().on('zoom', (event) => {
            g.attr('transform', event.transform);
        }));

    const g = svg.append('g'); // Group element to apply transformations for zoom and drag

    // Map data to required format for D3
    const bubbleData = data.map(d => ({
        name: d.to,
        value: d.amount,
        from: d.from,
        to: d.to
    }));

    // Calculate the min and max volume for the color scale
    const volumeExtent = d3.extent(bubbleData, d => d.value);
    
    // Color scale based on transaction volume
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain(volumeExtent.reverse()); // Reverse to have darker colors for higher volumes

        const simulation = d3.forceSimulation(bubbleData)
        .force("charge", d3.forceManyBody().strength(-50)) // Negative strength to push bubbles apart
        .force("center", d3.forceCenter(width / 2, height / 2)) // Center the bubbles in the SVG
        .force("collision", d3.forceCollide().radius(d => Math.sqrt(d.value) * 5 + 5)) // Prevent overlap with extra space
        .on("tick", ticked);

    const bubble = d3.pack()
        .size([width, height])
        .padding(1.5);

    const root = d3.hierarchy({ children: bubbleData })
        .sum(d => d.value);

    bubble(root);

    // Draw connecting lines
    const positionLookup = new Map();
    const links = [];
    root.leaves().forEach((node) => {
        positionLookup.set(node.data.name, node);  // Store the position of each transaction
        if (node.data.from && positionLookup.has(node.data.from)) {
            links.push({
                source: positionLookup.get(node.data.from),
                target: node
            });
        }
    });

    g.selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1.5);

    // Draw circles (bubbles) with color based on volume
    const nodes = g.selectAll('circle')
        .data(root.leaves())
        .enter().append('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => d.r)
        .attr('fill', d => colorScale(d.data.value))  // Apply color based on volume
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));

    nodes.append('title').text(d => `${d.data.name}: ${d.data.value}`);

    // Drag functions
    function dragStarted(event, d) {
        d3.select(this).raise().attr('stroke', 'black');
    }

    function dragged(event, d) {
        d3.select(this)
            .attr('cx', d.x = event.x)
            .attr('cy', d.y = event.y);
    }

    function dragEnded(event, d) {
        d3.select(this).attr('stroke', null);
    }

    function ticked() {
        nodes.attr("transform", d => `translate(${d.x}, ${d.y})`);
    }
}
