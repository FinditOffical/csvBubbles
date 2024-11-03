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
        name: d.to || "Transfer",  // Provide fallback if 'to' is missing
        value: +d.amount,  // Ensure amount is numeric
        from: d.from,
        to: d.to
    }));

    const volumeExtent = d3.extent(bubbleData, d => d.value);

    // Custom color scale based on value thresholds
    const colorScale = d3.scaleThreshold()
        .domain([1000000, 10000000, 10000000000])
        .range(["#FFD739", "#C299FC", "#9852F9", "#6807F9"]);

    const simulation = d3.forceSimulation(bubbleData)
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => Math.sqrt(d.value) * 5 + 5))
        .on("tick", ticked);

    const bubble = d3.pack()
        .size([width, height])
        .padding(1.5);

    const root = d3.hierarchy({ children: bubbleData })
        .sum(d => d.value);

    bubble(root);

    const positionLookup = new Map();
    const links = [];

    root.leaves().forEach((node) => {
        positionLookup.set(node.data.name, node);
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

    const nodes = g.selectAll('circle')
        .data(root.leaves())
        .enter().append('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => d.r)
        .attr('fill', d => colorScale(d.data.value))
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));

    nodes.append('title')
        .text(d => `${d.data.name || "Amount"}: ${d.data.value}`);

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

function launchApp() {
    window.location.href = "/bubbles.html"; // Adjust this path to your app's main page
}
function goHome() {
    window.location.href = "/index.html"; // Adjust this path to your app's main page
}

