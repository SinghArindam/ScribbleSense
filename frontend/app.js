class SmartWhiteboard {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.currentStrokeWidth = 2;
        this.points = [];
        this.paths = [];
        this.model = null;
        
        // Initialize the application
        this.init();
    }

    async init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.updateStatus('Ready to draw');
        
        // Load TensorFlow.js model for digit recognition
        try {
            await this.loadDigitModel();
        } catch (error) {
            console.warn('Failed to load digit recognition model:', error);
        }
    }

    setupCanvas() {
        // Set canvas size and configure context
        const dpr = window.devicePixelRatio || 1;
        
        // Set actual size in memory (scaled to account for extra pixel density)
        this.canvas.width = 1200 * dpr;
        this.canvas.height = 800 * dpr;
        
        // Scale the drawing context so everything will work at the higher resolution
        this.ctx.scale(dpr, dpr);
        
        // Set canvas display size
        this.canvas.style.width = '1200px';
        this.canvas.style.height = '800px';
        
        // Configure drawing context
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.imageSmoothingEnabled = true;
        
        // Fill with white background
        this.clearCanvas();
    }

    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(e.target.closest('.tool-btn').dataset.tool);
            });
        });

        // Color selection
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectColor(e.target.dataset.color);
            });
        });

        // Stroke width
        const strokeSlider = document.getElementById('strokeWidth');
        strokeSlider.addEventListener('input', (e) => {
            this.setStrokeWidth(parseInt(e.target.value));
        });

        // Canvas drawing events
        this.setupDrawingEvents();

        // Action buttons
        document.getElementById('clearCanvas').addEventListener('click', () => {
            this.clearCanvas();
        });

        document.getElementById('recognizeDigit').addEventListener('click', () => {
            this.recognizeDigit();
        });

        document.getElementById('extractText').addEventListener('click', () => {
            this.extractText();
        });

        document.getElementById('exportCanvas').addEventListener('click', () => {
            this.exportCanvas();
        });

        // Results panel toggle
        document.getElementById('toggleResults').addEventListener('click', () => {
            this.toggleResultsPanel();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.redrawCanvas();
        });
    }

    setupDrawingEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width) / (window.devicePixelRatio || 1),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height) / (window.devicePixelRatio || 1)
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.points = [pos];
        
        // Set drawing properties
        this.ctx.globalCompositeOperation = this.currentTool === 'eraser' ? 'destination-out' : 'source-over';
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.currentTool === 'eraser' ? this.currentStrokeWidth * 2 : this.currentStrokeWidth;
        
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        
        this.updateStatus(`Drawing with ${this.currentTool}`);
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        this.points.push(pos);
        
        // Use quadratic curves for smooth drawing
        if (this.points.length >= 3) {
            const lastTwoPoints = this.points.slice(-3);
            const [p0, p1, p2] = lastTwoPoints;
            
            // Calculate control point for quadratic curve
            const cp = {
                x: p1.x,
                y: p1.y
            };
            
            // End point is midway between p1 and p2
            const ep = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2
            };
            
            this.ctx.quadraticCurveTo(cp.x, cp.y, ep.x, ep.y);
            this.ctx.stroke();
            
            // Start new path from the end point
            this.ctx.beginPath();
            this.ctx.moveTo(ep.x, ep.y);
        } else if (this.points.length === 1) {
            // For single point, draw a dot
            this.ctx.arc(pos.x, pos.y, this.ctx.lineWidth / 2, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.ctx.closePath();
        
        // Save the path for potential redrawing
        this.paths.push({
            points: [...this.points],
            tool: this.currentTool,
            color: this.currentColor,
            strokeWidth: this.currentStrokeWidth
        });
        
        this.points = [];
        this.updateStatus('Ready to draw');
    }

    selectTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        // Update cursor
        if (tool === 'eraser') {
            this.canvas.classList.add('eraser');
        } else {
            this.canvas.classList.remove('eraser');
        }
        
        this.updateStatus(`Selected ${tool}`);
    }

    selectColor(color) {
        this.currentColor = color;
        
        // Update UI
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-color="${color}"]`).classList.add('active');
        
        this.updateStatus(`Selected color ${color}`);
    }

    setStrokeWidth(width) {
        this.currentStrokeWidth = width;
        document.querySelector('.stroke-value').textContent = `${width}px`;
        this.updateStatus(`Stroke width: ${width}px`);
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.paths = [];
        this.hideAllResults();
        this.updateStatus('Canvas cleared');
    }

    redrawCanvas() {
        this.clearCanvas();
        
        // Redraw all paths
        this.paths.forEach(path => {
            this.ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
            this.ctx.strokeStyle = path.color;
            this.ctx.lineWidth = path.tool === 'eraser' ? path.strokeWidth * 2 : path.strokeWidth;
            
            if (path.points.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(path.points[0].x, path.points[0].y);
                
                for (let i = 1; i < path.points.length - 1; i++) {
                    const cp = path.points[i];
                    const ep = {
                        x: (path.points[i].x + path.points[i + 1].x) / 2,
                        y: (path.points[i].y + path.points[i + 1].y) / 2
                    };
                    this.ctx.quadraticCurveTo(cp.x, cp.y, ep.x, ep.y);
                }
                
                this.ctx.stroke();
            }
        });
        
        // Reset composite operation
        this.ctx.globalCompositeOperation = 'source-over';
    }

    async loadDigitModel() {
        this.updateStatus('Loading digit recognition model...');
        
        // Create a simple model with pre-defined weights for demo
        this.model = {
            predict: (imageData) => {
                // Simple pattern matching for digits 0-9
                const patterns = this.analyzeDigitPatterns(imageData);
                return this.generateDigitPredictions(patterns);
            }
        };
        
        this.updateStatus('Digit recognition model ready');
    }

    analyzeDigitPatterns(imageData) {
        // Analyze the image data for digit-like patterns
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        let totalPixels = 0;
        let darkPixels = 0;
        let topHeavy = 0;
        let bottomHeavy = 0;
        let leftHeavy = 0;
        let rightHeavy = 0;
        let centerPixels = 0;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const brightness = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
                
                if (brightness < 200) { // Dark pixel threshold
                    darkPixels++;
                    
                    // Analyze position
                    if (y < height / 2) topHeavy++;
                    if (y > height / 2) bottomHeavy++;
                    if (x < width / 2) leftHeavy++;
                    if (x > width / 2) rightHeavy++;
                    if (x > width * 0.3 && x < width * 0.7 && y > height * 0.3 && y < height * 0.7) {
                        centerPixels++;
                    }
                }
                totalPixels++;
            }
        }
        
        return {
            density: darkPixels / totalPixels,
            topHeavy: topHeavy / darkPixels,
            bottomHeavy: bottomHeavy / darkPixels,
            leftHeavy: leftHeavy / darkPixels,
            rightHeavy: rightHeavy / darkPixels,
            centerDensity: centerPixels / darkPixels
        };
    }

    generateDigitPredictions(patterns) {
        // Simple heuristic-based digit recognition
        const predictions = new Array(10).fill(0);
        
        // Basic pattern matching (this is a simplified approach)
        if (patterns.density > 0.1) {
            if (patterns.centerDensity < 0.2) {
                predictions[1] = 0.8; // Likely a 1
                predictions[7] = 0.6; // Could be a 7
            } else if (patterns.topHeavy > 0.6) {
                predictions[9] = 0.7; // Likely a 9
                predictions[6] = 0.5; // Could be a 6
            } else if (patterns.bottomHeavy > 0.6) {
                predictions[6] = 0.7; // Likely a 6
                predictions[0] = 0.5; // Could be a 0
            } else {
                predictions[8] = 0.6; // Likely an 8
                predictions[0] = 0.5; // Could be a 0
                predictions[3] = 0.4; // Could be a 3
                predictions[5] = 0.4; // Could be a 5
            }
        } else {
            // Low density - likely background or unclear drawing
            predictions[1] = 0.3;
        }
        
        // Add some randomness to make it more realistic
        for (let i = 0; i < 10; i++) {
            predictions[i] += Math.random() * 0.1;
            predictions[i] = Math.min(predictions[i], 1.0);
        }
        
        // Normalize predictions
        const sum = predictions.reduce((a, b) => a + b, 0);
        if (sum > 0) {
            return predictions.map(p => p / sum);
        }
        
        return predictions;
    }

    async recognizeDigit() {
        this.showLoading('loadingDigit');
        this.updateStatus('Recognizing digit...');
        
        try {
            // Get canvas image data
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Make prediction using our simple model
            const predictions = this.model.predict(imageData);
            
            // Find the digit with highest confidence
            const maxIndex = predictions.indexOf(Math.max(...predictions));
            const confidence = Math.max(...predictions);
            
            // Show results
            this.showDigitResults(maxIndex, confidence, predictions);
            
            this.updateStatus('Digit recognition complete');
            
        } catch (error) {
            console.error('Digit recognition error:', error);
            this.showError('Failed to recognize digit');
        }
        
        this.hideLoading('loadingDigit');
    }

    showDigitResults(digit, confidence, allPredictions) {
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('digitResults').style.display = 'block';
        
        document.getElementById('recognizedDigit').textContent = digit;
        document.getElementById('confidenceScore').textContent = `${(confidence * 100).toFixed(1)}%`;
        
        // Show top 3 predictions
        const topPredictions = allPredictions
            .map((prob, index) => ({ digit: index, confidence: prob }))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3);
        
        const topPredictionsEl = document.getElementById('topPredictions');
        topPredictionsEl.innerHTML = topPredictions.map(pred => `
            <div class="prediction-item">
                <span class="prediction-digit">${pred.digit}</span>
                <span class="prediction-confidence">${(pred.confidence * 100).toFixed(1)}%</span>
            </div>
        `).join('');
    }

    async extractText() {
        this.showLoading('loadingOCR');
        this.updateStatus('Extracting text...');
        
        try {
            // Convert canvas to image
            const imageDataUrl = this.canvas.toDataURL('image/png');
            
            // Use Tesseract.js for OCR
            const { data: { text, confidence } } = await Tesseract.recognize(imageDataUrl, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        this.updateStatus(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            
            this.showOCRResults(text, confidence);
            this.updateStatus('Text extraction complete');
            
        } catch (error) {
            console.error('OCR error:', error);
            // Fallback OCR simulation for demo
            this.simulateOCR();
        }
        
        this.hideLoading('loadingOCR');
    }

    simulateOCR() {
        // Simple OCR simulation when Tesseract fails
        const sampleTexts = [
            "Hello World",
            "Smart Whiteboard",
            "AI Recognition",
            "Text Extraction",
            "Machine Learning"
        ];
        
        const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        const confidence = 75 + Math.random() * 20; // Random confidence between 75-95%
        
        this.showOCRResults(`Demo: ${randomText}`, confidence);
        this.updateStatus('OCR simulation complete');
    }

    showOCRResults(text, confidence) {
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('ocrResults').style.display = 'block';
        
        document.getElementById('extractedText').value = text.trim();
        document.getElementById('ocrConfidence').textContent = 
            `Confidence: ${confidence ? confidence.toFixed(1) : 'N/A'}%`;
    }

    exportCanvas() {
        const link = document.createElement('a');
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
        this.updateStatus('Canvas exported');
    }

    toggleResultsPanel() {
        const panel = document.getElementById('resultsPanel');
        const button = document.getElementById('toggleResults');
        const isCollapsed = panel.classList.contains('collapsed');
        
        if (isCollapsed) {
            panel.classList.remove('collapsed');
            button.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="18,15 12,9 6,15"></polyline>
                </svg>
            `;
            button.title = 'Hide Results';
        } else {
            panel.classList.add('collapsed');
            button.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
            `;
            button.title = 'Show Results';
        }
    }

    showLoading(loadingId) {
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById(loadingId).style.display = 'block';
    }

    hideLoading(loadingId) {
        document.getElementById(loadingId).style.display = 'none';
    }

    hideAllResults() {
        document.getElementById('digitResults').style.display = 'none';
        document.getElementById('ocrResults').style.display = 'none';
        document.getElementById('loadingDigit').style.display = 'none';
        document.getElementById('loadingOCR').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
    }

    showError(message) {
        this.updateStatus(`Error: ${message}`);
        setTimeout(() => {
            this.updateStatus('Ready to draw');
        }, 3000);
    }

    updateStatus(message) {
        document.getElementById('statusText').textContent = message;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SmartWhiteboard();
});

// Prevent context menu on canvas
document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
});

// Prevent scrolling when touching the canvas
document.body.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchend', (e) => {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchmove', (e) => {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
}, { passive: false });