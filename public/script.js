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

    // Clear any existing chart content
    const chart = d3.select('#chart').html('');
    const svg = chart.append('svg')
        .attr('width', width)
        .attr('height', height)
        .call(d3.zoom().on("zoom", (event) => {
            g.attr("transform", event.transform);
        }));

    const g = svg.append('g')
        .attr("text-anchor", "middle")
        .style("font", "10px sans-serif");

    // Create hierarchy and pack layout with increased padding for bubble separation
    const root = d3.hierarchy({ children: data })
        .sum(d => d.amount)
        .sort((a, b) => b.amount - a.amount);

    const pack = d3.pack()
        .size([width, height])
        .padding(8);  // Increased padding to separate bubbles more

    pack(root);

    const colorScale = d3.scaleThreshold()
        .domain([1000000, 10000000, 10000000000])
        .range(["#FFD739", "#C299FC", "#9852F9", "#6807F9"]);

    // Create a force simulation to add inertia/momentum effect
    const simulation = d3.forceSimulation(root.leaves())
        .force("x", d3.forceX(width / 2).strength(0.05))
        .force("y", d3.forceY(height / 2).strength(0.05))
        .force("collide", d3.forceCollide(d => d.r + 4))
        .alphaDecay(0.02)  // Slow decay for lingering motion
        .on("tick", ticked);

    // Add a group for each bubble (node)
    const node = g.selectAll("g")
        .data(root.leaves())
        .join("g")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .call(d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded));

    // Draw each bubble's circle
    node.append("circle")
        .attr("r", d => d.r)
        .attr("fill", d => colorScale(d.value))
        .attr("stroke", "#000")
        .attr("stroke-width", 1);

    // Add token address and amount as combined label on each bubble
    node.append("text")
        .text(d => `${d.data.tokenaddress}\n${d.data.amount}`)
        .attr("dy", "0.3em")
        .attr("font-size", d => Math.min(d.r / 5, 10))
        .style("pointer-events", "none")
        .style("text-anchor", "middle");

    // Update positions on each tick of the simulation
    function ticked() {
        node.attr("transform", d => `translate(${d.x},${d.y})`);
    }

    function dragStarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragEnded(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

function launchApp() {
    window.location.href = "bubbles.html"; // Adjust this path to your app's main page
}
function goHome() {
    window.location.href = "index.html"; // Adjust this path to your app's main page
}

