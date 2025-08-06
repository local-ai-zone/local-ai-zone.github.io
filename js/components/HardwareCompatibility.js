/**
 * HardwareCompatibility Component for GGUF Model Discovery
 * Provides hardware compatibility indicators and upgrade recommendations
 */

class HardwareCompatibility {
    constructor() {
        this.userHardware = this.getUserHardware();
        this.compatibilityCache = new Map();
        
        // Bind methods
        this.getUserHardware = this.getUserHardware.bind(this);
        this.checkCompatibility = this.checkCompatibility.bind(this);
        this.generateCompatibilityIndicator = this.generateCompatibilityIndicator.bind(this);
        this.generateUpgradeRecommendations = this.generateUpgradeRecommendations.bind(this);
        this.updateUserHardware = this.updateUserHardware.bind(this);
    }
    
    getUserHardware() {
        // Try to get hardware info from localStorage or browser APIs
        const saved = localStorage.getItem('user-hardware');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.warn('HardwareCompatibility: Failed to parse saved hardware info');
            }
        }
        
        // Attempt to detect hardware using available APIs
        return this.detectHardware();
    }
    
    detectHardware() {
        const hardware = {
            cpuCores: navigator.hardwareConcurrency || 4, // Fallback to 4 cores
            ramGB: this.estimateRAM(),
            hasGpu: this.detectGPU(),
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            detected: true,
            timestamp: Date.now()
        };
        
        // Save detected hardware
        try {
            localStorage.setItem('user-hardware', JSON.stringify(hardware));
        } catch (error) {
            console.warn('HardwareCompatibility: Failed to save hardware info');
        }
        
        return hardware;
    }
    
    estimateRAM() {
        // Use device memory API if available
        if ('deviceMemory' in navigator) {
            return navigator.deviceMemory;
        }
        
        // Fallback estimation based on user agent and other factors
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Mobile devices typically have less RAM
        if (/mobile|android|iphone|ipad/.test(userAgent)) {
            return 4; // Assume 4GB for mobile
        }
        
        // Desktop fallback
        return 8; // Assume 8GB for desktop
    }
    
    detectGPU() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                return false;
            }
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                // Check for dedicated GPU indicators
                return /nvidia|amd|radeon|geforce|quadro|tesla/i.test(renderer);
            }
            
            return true; // WebGL available, assume some GPU capability
        } catch (error) {
            return false;
        }
    }
    
    checkCompatibility(model) {
        if (!model) {
            return {
                status: 'unknown',
                score: 0,
                recommendations: [],
                indicators: []
            };
        }
        
        // Check cache first
        const cacheKey = `${model.modelName}-${JSON.stringify(this.userHardware)}`;
        if (this.compatibilityCache.has(cacheKey)) {
            return this.compatibilityCache.get(cacheKey);
        }
        
        const compatibility = this.performCompatibilityCheck(model);
        
        // Cache result
        this.compatibilityCache.set(cacheKey, compatibility);
        
        return compatibility;
    }
    
    performCompatibilityCheck(model) {
        const recommendations = [];
        const indicators = [];
        let score = 100;
        let status = 'compatible';
        
        // Check CPU requirements
        if (model.minCpuCores && this.userHardware.cpuCores) {
            const cpuRatio = this.userHardware.cpuCores / model.minCpuCores;
            
            if (cpuRatio < 1) {
                status = 'incompatible';
                score -= 40;
                recommendations.push({
                    type: 'cpu',
                    severity: 'critical',
                    current: this.userHardware.cpuCores,
                    required: model.minCpuCores,
                    message: `CPU upgrade required: ${model.minCpuCores}+ cores needed`,
                    icon: '🖥️'
                });
                indicators.push({
                    type: 'cpu',
                    status: 'incompatible',
                    text: `${this.userHardware.cpuCores}/${model.minCpuCores} cores`,
                    color: 'error'
                });
            } else if (cpuRatio < 1.5) {
                if (status === 'compatible') status = 'marginal';
                score -= 15;
                recommendations.push({
                    type: 'cpu',
                    severity: 'warning',
                    current: this.userHardware.cpuCores,
                    required: model.minCpuCores,
                    message: `Consider CPU upgrade for better performance`,
                    icon: '⚠️'
                });
                indicators.push({
                    type: 'cpu',
                    status: 'marginal',
                    text: `${this.userHardware.cpuCores}/${model.minCpuCores} cores`,
                    color: 'warning'
                });
            } else {
                indicators.push({
                    type: 'cpu',
                    status: 'compatible',
                    text: `${this.userHardware.cpuCores}/${model.minCpuCores} cores`,
                    color: 'success'
                });
            }
        }
        
        // Check RAM requirements
        if (model.minRamGB && this.userHardware.ramGB) {
            const ramRatio = this.userHardware.ramGB / model.minRamGB;
            
            if (ramRatio < 1) {
                if (status !== 'incompatible') status = 'requires-upgrade';
                score -= 30;
                recommendations.push({
                    type: 'ram',
                    severity: 'high',
                    current: this.userHardware.ramGB,
                    required: model.minRamGB,
                    message: `RAM upgrade needed: ${model.minRamGB}+ GB required`,
                    icon: '💾'
                });
                indicators.push({
                    type: 'ram',
                    status: 'insufficient',
                    text: `${this.userHardware.ramGB}/${model.minRamGB} GB`,
                    color: 'error'
                });
            } else if (ramRatio < 1.3) {
                if (status === 'compatible') status = 'marginal';
                score -= 10;
                recommendations.push({
                    type: 'ram',
                    severity: 'medium',
                    current: this.userHardware.ramGB,
                    required: model.minRamGB,
                    message: `More RAM recommended for optimal performance`,
                    icon: '📈'
                });
                indicators.push({
                    type: 'ram',
                    status: 'marginal',
                    text: `${this.userHardware.ramGB}/${model.minRamGB} GB`,
                    color: 'warning'
                });
            } else {
                indicators.push({
                    type: 'ram',
                    status: 'compatible',
                    text: `${this.userHardware.ramGB}/${model.minRamGB} GB`,
                    color: 'success'
                });
            }
        }
        
        // Check GPU requirements
        if (model.gpuRequired && !this.userHardware.hasGpu) {
            if (status === 'compatible') status = 'requires-upgrade';
            score -= 25;
            recommendations.push({
                type: 'gpu',
                severity: 'high',
                current: false,
                required: true,
                message: 'Dedicated GPU recommended for this model',
                icon: '🎮'
            });
            indicators.push({
                type: 'gpu',
                status: 'missing',
                text: 'GPU Required',
                color: 'warning'
            });
        } else if (model.gpuRequired && this.userHardware.hasGpu) {
            indicators.push({
                type: 'gpu',
                status: 'available',
                text: 'GPU Available',
                color: 'success'
            });
        }
        
        // File size considerations
        if (model.fileSize) {
            const fileSizeGB = model.fileSize / (1024 * 1024 * 1024);
            const availableSpace = this.estimateAvailableStorage();
            
            if (availableSpace && fileSizeGB > availableSpace * 0.8) {
                recommendations.push({
                    type: 'storage',
                    severity: 'medium',
                    current: availableSpace,
                    required: fileSizeGB,
                    message: 'Ensure sufficient storage space available',
                    icon: '💿'
                });
            }
        }
        
        return {
            status,
            score: Math.max(0, score),
            recommendations,
            indicators,
            userHardware: this.userHardware,
            modelRequirements: {
                cpuCores: model.minCpuCores,
                ramGB: model.minRamGB,
                gpuRequired: model.gpuRequired
            }
        };
    }
    
    estimateAvailableStorage() {
        // This is a rough estimation - actual implementation would need more sophisticated detection
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(estimate => {
                return (estimate.quota - estimate.usage) / (1024 * 1024 * 1024); // GB
            });
        }
        return null; // Cannot estimate
    }
    
    generateCompatibilityIndicator(model) {
        const compatibility = this.checkCompatibility(model);
        
        const indicatorElement = document.createElement('div');
        indicatorElement.className = 'hardware-compatibility-indicator';
        
        const statusClass = this.getStatusClass(compatibility.status);
        const statusIcon = this.getStatusIcon(compatibility.status);
        const statusText = this.getStatusText(compatibility.status);
        
        indicatorElement.innerHTML = `
            <div class="compatibility-header ${statusClass}">
                <div class="compatibility-status">
                    <span class="status-icon">${statusIcon}</span>
                    <span class="status-text">${statusText}</span>
                </div>
                <div class="compatibility-score">
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${compatibility.score}%"></div>
                    </div>
                    <span class="score-text">${compatibility.score}%</span>
                </div>
            </div>
            
            ${compatibility.indicators.length > 0 ? `
                <div class="compatibility-details">
                    ${compatibility.indicators.map(indicator => `
                        <div class="compatibility-item ${indicator.color}">
                            <span class="item-icon">${this.getIndicatorIcon(indicator.type)}</span>
                            <span class="item-text">${indicator.text}</span>
                            <span class="item-status ${indicator.status}"></span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${compatibility.recommendations.length > 0 ? `
                <div class="compatibility-recommendations">
                    <button class="recommendations-toggle" type="button">
                        <span>View Recommendations</span>
                        <svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6,9 12,15 18,9"/>
                        </svg>
                    </button>
                    <div class="recommendations-content" style="display: none;">
                        ${compatibility.recommendations.map(rec => `
                            <div class="recommendation-item ${rec.severity}">
                                <span class="rec-icon">${rec.icon}</span>
                                <div class="rec-content">
                                    <div class="rec-message">${rec.message}</div>
                                    ${rec.current !== undefined && rec.required !== undefined ? `
                                        <div class="rec-details">
                                            Current: ${rec.current} | Required: ${rec.required}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        
        // Add event listeners
        const toggle = indicatorElement.querySelector('.recommendations-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const content = indicatorElement.querySelector('.recommendations-content');
                const icon = toggle.querySelector('.toggle-icon');
                
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    content.style.display = 'none';
                    icon.style.transform = 'rotate(0deg)';
                }
            });
        }
        
        return indicatorElement;
    }
    
    getStatusClass(status) {
        const classes = {
            'compatible': 'status-compatible',
            'marginal': 'status-marginal',
            'requires-upgrade': 'status-upgrade',
            'incompatible': 'status-incompatible',
            'unknown': 'status-unknown'
        };
        return classes[status] || 'status-unknown';
    }
    
    getStatusIcon(status) {
        const icons = {
            'compatible': '✅',
            'marginal': '⚠️',
            'requires-upgrade': '🔧',
            'incompatible': '❌',
            'unknown': '❓'
        };
        return icons[status] || '❓';
    }
    
    getStatusText(status) {
        const texts = {
            'compatible': 'Compatible',
            'marginal': 'Marginal',
            'requires-upgrade': 'Upgrade Recommended',
            'incompatible': 'Incompatible',
            'unknown': 'Unknown'
        };
        return texts[status] || 'Unknown';
    }
    
    getIndicatorIcon(type) {
        const icons = {
            'cpu': '🖥️',
            'ram': '💾',
            'gpu': '🎮',
            'storage': '💿'
        };
        return icons[type] || '⚙️';
    }
    
    generateUpgradeRecommendations(model) {
        const compatibility = this.checkCompatibility(model);
        
        if (compatibility.recommendations.length === 0) {
            return null;
        }
        
        const recommendationsElement = document.createElement('div');
        recommendationsElement.className = 'upgrade-recommendations';
        
        recommendationsElement.innerHTML = `
            <div class="recommendations-header">
                <h4>Hardware Upgrade Recommendations</h4>
                <div class="compatibility-score">
                    Score: ${compatibility.score}%
                </div>
            </div>
            
            <div class="recommendations-list">
                ${compatibility.recommendations.map(rec => `
                    <div class="recommendation-card ${rec.severity}">
                        <div class="rec-header">
                            <span class="rec-icon">${rec.icon}</span>
                            <span class="rec-type">${rec.type.toUpperCase()}</span>
                            <span class="rec-severity ${rec.severity}">${rec.severity}</span>
                        </div>
                        <div class="rec-message">${rec.message}</div>
                        ${rec.current !== undefined && rec.required !== undefined ? `
                            <div class="rec-comparison">
                                <div class="current-spec">
                                    <span class="label">Current:</span>
                                    <span class="value">${rec.current}</span>
                                </div>
                                <div class="required-spec">
                                    <span class="label">Required:</span>
                                    <span class="value">${rec.required}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="recommendations-footer">
                <button class="update-hardware-btn" type="button">
                    Update My Hardware Info
                </button>
            </div>
        `;
        
        // Add event listener for hardware update
        const updateBtn = recommendationsElement.querySelector('.update-hardware-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                this.showHardwareUpdateDialog();
            });
        }
        
        return recommendationsElement;
    }
    
    showHardwareUpdateDialog() {
        // Create a simple dialog for updating hardware info
        const dialog = document.createElement('div');
        dialog.className = 'hardware-update-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay">
                <div class="dialog-content">
                    <div class="dialog-header">
                        <h3>Update Hardware Information</h3>
                        <button class="dialog-close" type="button">×</button>
                    </div>
                    
                    <div class="dialog-body">
                        <div class="hardware-form">
                            <div class="form-group">
                                <label for="cpu-cores">CPU Cores:</label>
                                <input type="number" id="cpu-cores" min="1" max="128" value="${this.userHardware.cpuCores}">
                            </div>
                            
                            <div class="form-group">
                                <label for="ram-gb">RAM (GB):</label>
                                <input type="number" id="ram-gb" min="1" max="1024" value="${this.userHardware.ramGB}">
                            </div>
                            
                            <div class="form-group">
                                <label for="has-gpu">Dedicated GPU:</label>
                                <select id="has-gpu">
                                    <option value="true" ${this.userHardware.hasGpu ? 'selected' : ''}>Yes</option>
                                    <option value="false" ${!this.userHardware.hasGpu ? 'selected' : ''}>No</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dialog-footer">
                        <button class="dialog-cancel" type="button">Cancel</button>
                        <button class="dialog-save" type="button">Save</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add event listeners
        const closeBtn = dialog.querySelector('.dialog-close');
        const cancelBtn = dialog.querySelector('.dialog-cancel');
        const saveBtn = dialog.querySelector('.dialog-save');
        const overlay = dialog.querySelector('.dialog-overlay');
        
        const closeDialog = () => {
            document.body.removeChild(dialog);
        };
        
        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDialog();
            }
        });
        
        saveBtn.addEventListener('click', () => {
            const cpuCores = parseInt(dialog.querySelector('#cpu-cores').value);
            const ramGB = parseInt(dialog.querySelector('#ram-gb').value);
            const hasGpu = dialog.querySelector('#has-gpu').value === 'true';
            
            this.updateUserHardware({
                cpuCores,
                ramGB,
                hasGpu,
                detected: false,
                timestamp: Date.now()
            });
            
            closeDialog();
            
            // Refresh compatibility indicators
            this.compatibilityCache.clear();
            
            // Dispatch event for UI updates
            document.dispatchEvent(new CustomEvent('hardwareUpdated', {
                detail: this.userHardware
            }));
        });
    }
    
    updateUserHardware(newHardware) {
        this.userHardware = { ...this.userHardware, ...newHardware };
        
        try {
            localStorage.setItem('user-hardware', JSON.stringify(this.userHardware));
        } catch (error) {
            console.warn('HardwareCompatibility: Failed to save updated hardware info');
        }
        
        // Clear compatibility cache
        this.compatibilityCache.clear();
    }
    
    // Public API methods
    getUserHardwareInfo() {
        return { ...this.userHardware };
    }
    
    clearCache() {
        this.compatibilityCache.clear();
    }
    
    getCompatibilityStats(models) {
        if (!Array.isArray(models)) return null;
        
        const stats = {
            compatible: 0,
            marginal: 0,
            requiresUpgrade: 0,
            incompatible: 0,
            unknown: 0
        };
        
        models.forEach(model => {
            const compatibility = this.checkCompatibility(model);
            switch (compatibility.status) {
                case 'compatible':
                    stats.compatible++;
                    break;
                case 'marginal':
                    stats.marginal++;
                    break;
                case 'requires-upgrade':
                    stats.requiresUpgrade++;
                    break;
                case 'incompatible':
                    stats.incompatible++;
                    break;
                default:
                    stats.unknown++;
            }
        });
        
        return stats;
    }
}

// Export for use in other modules
window.HardwareCompatibility = HardwareCompatibility;