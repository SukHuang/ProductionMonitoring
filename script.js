// Production Animation Floor Simulator

class ProductionFloor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        this.units = [];
        this.stations = [];
        this.isRunning = false;
        this.isPaused = false;
        this.frameCount = 0;
        this.spawnTimer = 0;
        
        // Statistics
        this.stats = {
            unitsIn: 0,
            unitsCompleted: 0,
            unitsFailed: 0,
            unitsRepaired: 0
        };
        
        this.speedMultiplier = 1;
        this.unitSpawnRate = 0.5;
        
        this.initializeStations();
        this.setupEventListeners();
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.layoutStations();
    }
    
    initializeStations() {
        // Station layout: Assembly -> Quality -> Inspection -> (Repair) -> Packaging
        // Positions are stored as ratios (0-1) so the floor scales with the canvas.
        const stationData = [
            { name: 'Assembly', xRatio: 0.12, yRatio: 0.32, type: 'processing', color: '#3b82f6' },
            { name: 'Quality Check', xRatio: 0.32, yRatio: 0.32, type: 'processing', color: '#8b5cf6' },
            { name: 'Inspection', xRatio: 0.52, yRatio: 0.32, type: 'inspection', color: '#f59e0b', failureRate: 0.1 },
            { name: 'Repair', xRatio: 0.52, yRatio: 0.7, type: 'repair', color: '#ef4444' },
            { name: 'Packaging', xRatio: 0.75, yRatio: 0.32, type: 'processing', color: '#10b981' }
        ];
        
        this.stations = stationData.map(data => ({
            ...data,
            x: 0,
            y: 0,
            queue: [],
            currentUnit: null,
            processingTime: 2000,
            processingTimer: 0,
            width: 100,
            height: 100,
            processed: 0,
            failed: 0,
            repaired: 0
        }));
        
        this.layoutStations();
    }
    
    // Converts each station's ratio position into actual canvas pixel coordinates.
    layoutStations() {
        if (!this.stations || this.stations.length === 0) return;
        this.stations.forEach(station => {
            station.x = station.xRatio * this.canvas.width;
            station.y = station.yRatio * this.canvas.height;
        });
    }
    
    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('toggleConfigBtn').addEventListener('click', () => this.toggleConfig());
        
        document.getElementById('unitSpawnRate').addEventListener('change', (e) => {
            this.unitSpawnRate = parseFloat(e.target.value);
        });
        
        document.getElementById('speedMultiplier').addEventListener('change', (e) => {
            this.speedMultiplier = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = e.target.value + 'x';
        });
        
        window.addEventListener('resize', () => this.resizeCanvas());
        this.renderConfigPanel();
    }
    
    renderConfigPanel() {
        const configContainer = document.getElementById('stationConfigs');
        configContainer.innerHTML = '';
        
        this.stations.forEach((station, index) => {
            const configDiv = document.createElement('div');
            configDiv.className = 'station-config';
            configDiv.innerHTML = `
                <h3>${station.name}</h3>
                <div class="config-item">
                    <label>Processing Time (ms):</label>
                    <input type="number" class="process-time" data-station="${index}" min="500" max="5000" step="100" value="${station.processingTime}">
                    <div class="config-value">${station.processingTime}ms</div>
                </div>
                ${station.type === 'inspection' ? `
                    <div class="config-item">
                        <label>Failure Rate (%):</label>
                        <input type="range" class="failure-rate" data-station="${index}" min="0" max="100" step="5" value="${station.failureRate * 100}">
                        <div class="config-value">${Math.round(station.failureRate * 100)}%</div>
                    </div>
                ` : ''}
                <div class="config-item">
                    <span style="font-size: 0.85rem; color: #666;">Processed: ${station.processed}</span>
                </div>
            `;
            
            configContainer.appendChild(configDiv);
        });
        
        // Add event listeners for config inputs
        document.querySelectorAll('.process-time').forEach(input => {
            input.addEventListener('change', (e) => {
                const stationIdx = parseInt(e.target.dataset.station);
                this.stations[stationIdx].processingTime = parseInt(e.target.value);
                e.target.nextElementSibling.textContent = e.target.value + 'ms';
            });
        });
        
        document.querySelectorAll('.failure-rate').forEach(input => {
            input.addEventListener('change', (e) => {
                const stationIdx = parseInt(e.target.dataset.station);
                this.stations[stationIdx].failureRate = parseInt(e.target.value) / 100;
                e.target.nextElementSibling.textContent = e.target.value + '%';
            });
        });
    }
    
    toggleConfig() {
        const panel = document.getElementById('configPanel');
        panel.classList.toggle('hidden');
    }
    
    start() {
        this.isRunning = true;
        this.isPaused = false;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        this.animate();
    }
    
    pause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        btn.textContent = this.isPaused ? '▶ Resume' : '⏸ Pause';
        if (!this.isPaused) this.animate();
    }
    
    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.units = [];
        this.frameCount = 0;
        this.stats = { unitsIn: 0, unitsCompleted: 0, unitsFailed: 0, unitsRepaired: 0 };
        this.stations.forEach(s => { s.queue = []; s.currentUnit = null; s.processed = 0; s.failed = 0; });
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = '⏸ Pause';
        this.renderConfigPanel();
        this.updateStats();
        this.draw();
    }
    
    animate() {
        if (!this.isRunning || this.isPaused) return;
        
        this.frameCount++;
        
        // Spawn new units (unitSpawnRate is expressed as units per second, animated at ~60fps)
        this.spawnTimer += this.unitSpawnRate / 60;
        if (this.spawnTimer >= 1) {
            this.spawnUnit();
            this.spawnTimer -= 1;
        }
        
        // Process units through stations
        this.processStations();
        
        // Update unit positions
        this.updateUnits();
        
        // Draw everything
        this.draw();
        
        // Update UI
        this.updateStats();
        this.renderConfigPanel();
        
        requestAnimationFrame(() => this.animate());
    }
    
    spawnUnit() {
        const entryStation = this.stations[0];
        const unit = {
            id: this.stats.unitsIn++,
            x: 10,
            y: entryStation.y,
            fromStation: -1,
            targetStation: 0,
            currentStation: -1,
            status: 'moving', // moving, processing, completed, failed, repaired
            failed: false,
            repaired: false,
            size: 16,
            color: '#3b82f6'
        };
        this.units.push(unit);
    }
    
    // Routes a unit that just finished processing at `station` to its next destination.
    // The unit only travels here; it joins the destination queue once it arrives (see updateUnits).
    routeUnit(unit, station, stationIdx) {
        if (station.type === 'inspection') {
            if (Math.random() < station.failureRate) {
                unit.failed = true;
                this.stats.unitsFailed++;
                station.failed++;
                
                const repairStation = this.stations.find(s => s.type === 'repair');
                unit.status = 'moving';
                unit.fromStation = stationIdx;
                unit.targetStation = this.stations.indexOf(repairStation);
            } else {
                // Passed inspection: skip straight to Packaging.
                const packagingStation = this.stations.find(s => s.name === 'Packaging');
                unit.status = 'moving';
                unit.fromStation = stationIdx;
                unit.targetStation = this.stations.indexOf(packagingStation);
            }
            return;
        }
        
        if (station.type === 'repair') {
            unit.repaired = true;
            unit.failed = false;
            this.stats.unitsRepaired++;
            station.repaired++;
            
            // Repaired units go back through Inspection for a re-test.
            const inspectionStation = this.stations.find(s => s.type === 'inspection');
            unit.status = 'moving';
            unit.fromStation = stationIdx;
            unit.targetStation = this.stations.indexOf(inspectionStation);
            return;
        }
        
        const nextIdx = stationIdx + 1;
        if (nextIdx < this.stations.length) {
            unit.status = 'moving';
            unit.fromStation = stationIdx;
            unit.targetStation = nextIdx;
        } else {
            unit.status = 'completed';
            this.stats.unitsCompleted++;
        }
    }
    
    processStations() {
        this.stations.forEach((station, stationIdx) => {
            // Move the next queued unit into processing once the station is free.
            if (station.queue.length > 0 && !station.currentUnit) {
                station.currentUnit = station.queue.shift();
                station.currentUnit.currentStation = stationIdx;
                station.currentUnit.status = 'processing';
                station.currentUnit.x = station.x;
                station.currentUnit.y = station.y;
                station.processingTimer = 0;
            }
            
            // Advance processing on the current unit.
            if (station.currentUnit) {
                station.processingTimer += 16 * this.speedMultiplier; // ~60fps
                
                if (station.processingTimer >= station.processingTime) {
                    const unit = station.currentUnit;
                    station.processed++;
                    station.currentUnit = null;
                    this.routeUnit(unit, station, stationIdx);
                }
            }
        });
    }
    
    updateUnits() {
        this.units.forEach(unit => {
            if (unit.status === 'moving') {
                const station = this.stations[unit.targetStation];
                if (!station) return;
                
                const speed = 2.5 * this.speedMultiplier;
                const dx = station.x - unit.x;
                const dy = station.y - unit.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > speed) {
                    unit.x += (dx / distance) * speed;
                    unit.y += (dy / distance) * speed;
                } else {
                    unit.x = station.x;
                    unit.y = station.y;
                    // Arrived: join the destination station's queue and wait to be processed.
                    unit.status = 'queued';
                    station.queue.push(unit);
                }
            } else if (unit.status === 'completed') {
                unit.x = this.canvas.width - 20;
                unit.y = this.stations[0].y + Math.random() * 40;
            }
        });
        
        // Remove completed units after a while
        this.units = this.units.filter(u => {
            if (u.status === 'completed') {
                return this.frameCount - (u.completionFrame || 0) < 300;
            }
            return true;
        });
        
        this.units.forEach(u => {
            if (u.status === 'completed' && !u.completionFrame) u.completionFrame = this.frameCount;
        });
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.canvas.width; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw stations
        this.stations.forEach(station => {
            // Station box
            this.ctx.fillStyle = station.color;
            this.ctx.globalAlpha = 0.7;
            this.ctx.fillRect(station.x - station.width/2, station.y - station.height/2, station.width, station.height);
            this.ctx.globalAlpha = 1;
            
            // Station border
            this.ctx.strokeStyle = station.color;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(station.x - station.width/2, station.y - station.height/2, station.width, station.height);
            
            // Station name
            this.ctx.fillStyle = '#1f2937';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(station.name, station.x, station.y - station.height/2 - 12);
            
            // Queue count
            const queueSize = station.queue.length + (station.currentUnit ? 1 : 0);
            this.ctx.fillStyle = '#ef4444';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText(queueSize.toString(), station.x + station.width/2 + 12, station.y - station.height/2);
        });
        
        // Draw connectors between stations
        this.ctx.strokeStyle = '#cbd5e1';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        for (let i = 0; i < this.stations.length - 1; i++) {
            const from = this.stations[i];
            const to = this.stations[i + 1];
            if (to.type === 'repair') continue; // repair is only reached via the fail path below
            this.ctx.beginPath();
            this.ctx.moveTo(from.x + from.width/2, from.y);
            this.ctx.lineTo(to.x - to.width/2, to.y);
            this.ctx.stroke();
        }
        
        // Inspection passes go straight to Packaging, skipping Repair
        const inspectionStation = this.stations.find(s => s.type === 'inspection');
        const repairStation = this.stations.find(s => s.type === 'repair');
        const packagingStation = this.stations.find(s => s.name === 'Packaging');
        this.ctx.beginPath();
        this.ctx.moveTo(inspectionStation.x + inspectionStation.width/2, inspectionStation.y);
        this.ctx.lineTo(packagingStation.x - packagingStation.width/2, packagingStation.y);
        this.ctx.stroke();
        
        // Fail path: Inspection -> Repair, then back to Inspection for a re-test
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(inspectionStation.x - inspectionStation.width/4, inspectionStation.y + inspectionStation.height/2);
        this.ctx.lineTo(repairStation.x - repairStation.width/4, repairStation.y - repairStation.height/2);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(repairStation.x + repairStation.width/4, repairStation.y - repairStation.height/2);
        this.ctx.lineTo(inspectionStation.x + inspectionStation.width/4, inspectionStation.y + inspectionStation.height/2);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
        
        // Draw units
        this.units.forEach(unit => {
            // Unit circle
            this.ctx.fillStyle = unit.color;
            if (unit.failed) this.ctx.fillStyle = '#ef4444';
            else if (unit.repaired) this.ctx.fillStyle = '#10b981';
            else if (unit.status === 'completed') this.ctx.fillStyle = '#06b6d4';
            
            this.ctx.beginPath();
            this.ctx.arc(unit.x, unit.y, unit.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Unit border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Unit ID
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(unit.id.toString(), unit.x, unit.y);
        });
        
        // Draw legend
        this.drawLegend();
    }
    
    drawLegend() {
        const legendX = 20;
        const legendY = this.canvas.height - 100;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(legendX, legendY, 250, 90);
        this.ctx.strokeStyle = '#cbd5e1';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(legendX, legendY, 250, 90);
        
        this.ctx.fillStyle = '#1f2937';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Legend:', legendX + 10, legendY + 20);
        
        const items = [
            { color: '#3b82f6', text: 'Processing', y: 40 },
            { color: '#ef4444', text: 'Failed Unit', y: 55 },
            { color: '#10b981', text: 'Repaired', y: 70 }
        ];
        
        items.forEach(item => {
            this.ctx.fillStyle = item.color;
            this.ctx.beginPath();
            this.ctx.arc(legendX + 20, legendY + item.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#1f2937';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(item.text, legendX + 35, legendY + item.y + 3);
        });
    }
    
    updateStats() {
        document.getElementById('unitsIn').textContent = this.stats.unitsIn;
        document.getElementById('unitsCompleted').textContent = this.stats.unitsCompleted;
        document.getElementById('unitsFailed').textContent = this.stats.unitsFailed;
        document.getElementById('unitsRepaired').textContent = this.stats.unitsRepaired;
        
        const total = this.stats.unitsCompleted + this.stats.unitsFailed;
        const successRate = total > 0 ? Math.round(((total - this.stats.unitsFailed) / total) * 100) : 0;
        document.getElementById('successRate').textContent = successRate + '%';
        
        // Update queue display
        const queueDisplay = document.getElementById('queueDisplay');
        queueDisplay.innerHTML = '';
        this.stations.forEach(station => {
            const queueSize = station.queue.length + (station.currentUnit ? 1 : 0);
            if (queueSize > 0) {
                const item = document.createElement('div');
                item.className = 'queue-item';
                item.textContent = `${station.name}: ${queueSize} units`;
                queueDisplay.appendChild(item);
            }
        });
        
        // Update workflow display
        const workflowDisplay = document.getElementById('workflowDisplay');
        workflowDisplay.innerHTML = '';
        
        const statusCounts = {
            processing: 0,
            failed: 0,
            repaired: 0
        };
        
        this.units.forEach(unit => {
            if (unit.status === 'processing') statusCounts.processing++;
            else if (unit.failed && !unit.repaired && unit.status !== 'completed') statusCounts.failed++;
            else if (unit.repaired && unit.status !== 'completed') statusCounts.repaired++;
        });
        
        if (statusCounts.processing > 0) {
            const item = document.createElement('div');
            item.className = 'workflow-item processing';
            item.textContent = `⚙️ Processing: ${statusCounts.processing}`;
            workflowDisplay.appendChild(item);
        }
        
        if (statusCounts.failed > 0) {
            const item = document.createElement('div');
            item.className = 'workflow-item failed';
            item.textContent = `❌ Failed: ${statusCounts.failed}`;
            workflowDisplay.appendChild(item);
        }
        
        if (statusCounts.repaired > 0) {
            const item = document.createElement('div');
            item.className = 'workflow-item repaired';
            item.textContent = `✓ Repaired: ${statusCounts.repaired}`;
            workflowDisplay.appendChild(item);
        }
        
        if (workflowDisplay.innerHTML === '') {
            workflowDisplay.innerHTML = '<div class="workflow-item">Waiting for units...</div>';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const floor = new ProductionFloor('productionCanvas');
    floor.draw();
    
    console.log('%c🏭 Production Animation Floor Ready', 'font-size: 16px; font-weight: bold; color: #2563eb;');
});
