async function fetchInfo() {
    try {
        const response = await fetch('/api/info');
        const data = await response.json();

        // Update basic info
        updateElement('pod-name', data.podName);
        updateElement('node-name', data.nodeName);
        updateElement('namespace', data.namespace);
        updateElement('pod-ip', data.podIP);

        // Update system stats
        updateElement('uptime', formatUptime(data.uptime));
        updateElement('memory', formatBytes(data.memoryUsage.rss));
        updateElement('arch', data.architecture.toUpperCase());

        // Update timestamp
        const now = new Date();
        document.getElementById('last-updated').textContent = `Last update: ${now.toLocaleTimeString()}`;

    } catch (error) {
        console.error('Error fetching cluster info:', error);
    }
}

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
        el.classList.remove('loading');
    }
}

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initial fetch
fetchInfo();

// Refresh every 5 seconds
setInterval(fetchInfo, 5000);
