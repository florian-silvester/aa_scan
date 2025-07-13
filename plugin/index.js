/**
 * Sanity Art Aurea - AI Art Jewelry Documentation Processor
 */

class WordDropboxProcessor {
    constructor() {
        this.credentials = {
            dropboxToken: ''  // Only Dropbox token is configurable
        };
        this.currentAnalysis = null;
        this.tableStructure = null;
        this.initializeEventListeners();
        this.loadDropboxToken();
    }

    initializeEventListeners() {
        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => this.resetAll());
        
        // Skip credential event listeners since they're hardcoded
        // The credentials are now handled server-side
        
        // Only Dropbox token is configurable
        document.getElementById('dropboxToken').addEventListener('input', () => {
            this.credentials.dropboxToken = document.getElementById('dropboxToken').value.trim();
            localStorage.setItem('word_dropbox_processor_dropbox_token', this.credentials.dropboxToken);
        });

        // File upload
        const fileInput = document.getElementById('wordFile');
        const uploadZone = document.getElementById('uploadZone');
        
        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                this.onFileSelected();
            }
        });
        
        fileInput.addEventListener('change', () => this.onFileSelected());
        
        // Process and sync
        document.getElementById('processBtn').addEventListener('click', () => this.processWithAI());
        document.getElementById('syncBtn').addEventListener('click', () => this.syncToSanity());

        // Results
        document.getElementById('editBtn').addEventListener('click', () => this.editRecords());

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    }

    resetAll() {
        // Clear Dropbox token only (other credentials are hardcoded)
        document.getElementById('dropboxToken').value = '';
        
        // Clear file
        document.getElementById('wordFile').value = '';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('uploadZone').style.display = 'block';
        
        // Reset states
        this.credentials = { dropboxToken: '' };
        this.currentAnalysis = null;
        this.tableStructure = null;
        
        // Clear status messages
        this.clearStatus('processStatus');
        this.clearStatus('syncStatus');
        
        // Hide sections
        document.getElementById('analysis-section').style.display = 'none';
        document.getElementById('debug-section').style.display = 'none';
        
        // Disable buttons
        document.getElementById('processBtn').disabled = true;
        document.getElementById('syncBtn').style.display = 'none';
        
        // Clear localStorage
        localStorage.removeItem('word_dropbox_processor_dropbox_token');
        
        console.log('🔄 Reset complete - credentials are pre-configured, just upload a Word document!');
    }

    // Removed onCredentialsChange - credentials are hardcoded in server

    loadDropboxToken() {
        const saved = localStorage.getItem('word_dropbox_processor_dropbox_token');
        if (saved) {
            try {
                document.getElementById('dropboxToken').value = saved;
                this.credentials.dropboxToken = saved;
            } catch (e) {
                console.warn('Failed to load saved Dropbox token');
            }
        }
    }

    // Removed saveCredentials - credentials are hardcoded in server

    // Removed testCredentials - credentials are hardcoded in server

    onFileSelected() {
        const fileInput = document.getElementById('wordFile');
        const file = fileInput.files[0];
        
        if (file) {
            if (!file.name.match(/\.(doc|docx)$/i)) {
                this.showStatus('processStatus', '❌ Please select a Word document (.doc or .docx)', 'error');
                return;
            }
            
            // Show file info
            document.getElementById('uploadZone').style.display = 'none';
            const fileInfo = document.getElementById('fileInfo');
            fileInfo.innerHTML = `
                <div class="file-selected">
                    📄 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)
                    <button type="button" onclick="this.parentElement.parentElement.style.display='none'; document.getElementById('uploadZone').style.display='block'; document.getElementById('wordFile').value=''; document.getElementById('processBtn').disabled=true;">✕</button>
                </div>
            `;
            fileInfo.style.display = 'block';
            
            // Enable process button (credentials are hardcoded in server)
            document.getElementById('processBtn').disabled = false;
        }
    }

    async processWithAI() {
        const fileInput = document.getElementById('wordFile');
        if (!fileInput.files[0]) {
            this.showStatus('processStatus', '❌ Please select a Word document', 'error');
            return;
        }

        // OpenAI key is hardcoded in server, no need to check

        this.showStatus('processStatus', '🔄 Processing Word document with AI...', 'loading');
        document.getElementById('processBtn').disabled = true;

        try {
            const formData = new FormData();
            formData.append('word', fileInput.files[0]);
            // Credentials are hardcoded in server, only send Dropbox token if provided
            if (this.credentials.dropboxToken) {
                formData.append('dropbox_token', this.credentials.dropboxToken);
            }

            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentAnalysis = data.analysis;
                this.displayAnalysisResults(data);
                this.showStatus('processStatus', '✅ Processing complete!', 'success');
                document.getElementById('analysis-section').style.display = 'block';
                document.getElementById('syncBtn').style.display = 'inline-block';
            } else {
                this.showStatus('processStatus', `❌ ${data.error}`, 'error');
            }
        } catch (error) {
            this.showStatus('processStatus', `❌ Processing failed: ${error.message}`, 'error');
        } finally {
            document.getElementById('processBtn').disabled = false;
        }
    }

    displayAnalysisResults(data) {
        const resultsDiv = document.getElementById('analysisResults');
        
        console.log('Full analysis data:', data); // Debug log
        
        let html = '<div class="analysis-tabs">';
        
        // Show raw analysis first for debugging
        if (data.analysis) {
            html += `<div class="debug-analysis">
                <h4>🔍 Raw AI Analysis:</h4>
                <pre>${JSON.stringify(data.analysis, null, 2)}</pre>
            </div>`;
        }
        
        // Articles tab
        if (data.analysis && data.analysis.articles && data.analysis.articles.length > 0) {
            html += `<div class="tab-content">
                <h3>📰 Articles Found (${data.analysis.articles.length})</h3>
                <div class="records-grid">`;
            
            data.analysis.articles.forEach((article, i) => {
                html += `<div class="record-card">
                    <h4>${this.getRecordTitle(article, `Article ${i + 1}`)}</h4>
                    <div class="record-fields">`;
                
                Object.entries(article).forEach(([key, value]) => {
                    if (value && key !== 'Name' && key !== 'Title') {
                        html += `<p><strong>${key}:</strong> ${String(value).substring(0, 200)}${String(value).length > 200 ? '...' : ''}</p>`;
                    }
                });
                
                html += `</div></div>`;
            });
            html += '</div></div>';
        } else {
            html += `<div class="no-results">
                <h3>❌ No Articles Found</h3>
                <p>The AI didn't identify any articles in the text. This might be because:</p>
                <ul>
                    <li>The text was too long and got truncated</li>
                    <li>The AI analysis failed</li>
                                            <li>The field names don't match your Sanity schema</li>
                </ul>
            </div>`;
        }
        
        // Images tab
        if (data.analysis && data.analysis.images && data.analysis.images.length > 0) {
            html += `<div class="tab-content">
                <h3>🖼️ Image Captions Found (${data.analysis.images.length})</h3>
                <div class="records-grid">`;
            
            data.analysis.images.forEach((image, i) => {
                const title = image['Work Title'] || image.title || image.name || `Caption ${i + 1}`;
                html += `<div class="record-card">
                    <h4>📸 ${title}</h4>
                    <div class="record-fields">`;
                
                // Display fields in a logical order for image captions
                const fieldOrder = ['Maker', 'Year', 'Material', 'Measurements', 'Comments'];
                fieldOrder.forEach(key => {
                    if (image[key] && image[key].trim()) {
                        const displayValue = key === 'Comments' ? 
                            String(image[key]).substring(0, 300) + (String(image[key]).length > 300 ? '...' : '') :
                            String(image[key]);
                        html += `<p><strong>${key}:</strong> ${displayValue}</p>`;
                    }
                });
                
                // Add any other fields not in the ordered list
                Object.entries(image).forEach(([key, value]) => {
                    if (value && value.trim() && !fieldOrder.includes(key) && key !== 'Work Title') {
                        html += `<p><strong>${key}:</strong> ${String(value).substring(0, 200)}${String(value).length > 200 ? '...' : ''}</p>`;
                    }
                });
                
                html += `</div></div>`;
            });
            html += '</div></div>';
        }
        
        // Show Dropbox images if any
        if (data.dropboxImages && data.dropboxImages.length > 0) {
            html += `<div class="tab-content">
                <h3>☁️ Dropbox Images (${data.dropboxImages.length})</h3>
                <div class="records-grid">`;
            
            data.dropboxImages.forEach((image, i) => {
                html += `<div class="record-card">
                    <h4>${image.name}</h4>
                    <p><strong>Path:</strong> ${image.path}</p>
                    <p><strong>Size:</strong> ${Math.round(image.size/1024)}KB</p>
                </div>`;
            });
            html += '</div></div>';
        }
        
        html += '</div>';
        
        // Add debug section with Word content and table structure
        if (data.extractedContent) {
            html += `<details class="debug-details">
                <summary>🔍 Debug: Raw Word Document Text (${data.extractedContent.text.length} characters)</summary>
                <pre class="debug-text">${data.extractedContent.text}</pre>
            </details>`;
        }
        
        if (data.tableStructure) {
            html += `<details class="debug-details">
                <summary>🗂️ Debug: Sanity Schema Fields</summary>
                <pre class="debug-text">${JSON.stringify(data.tableStructure, null, 2)}</pre>
            </details>`;
        }
        
        resultsDiv.innerHTML = html;
    }

    getRecordTitle(record, fallback) {
        return record.Name || record.Title || record.title || record.name || fallback;
    }

    async syncToSanity() {
        try {
            showStatus('Syncing to Sanity CMS...', 'info');
            
            const response = await fetch('/sanity/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'sync_to_sanity'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                showStatus(`✅ Synced to Sanity: ${result.articles} articles, ${result.artworks} artworks`, 'success');
            } else {
                throw new Error(`Sync failed: ${response.statusText}`);
            }
        } catch (error) {
            showStatus(`❌ Sync failed: ${error.message}`, 'error');
        }
    }

    showStatus(elementId, message, type) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = `status ${type}`;
        element.style.display = 'block';
    }

    clearStatus(elementId) {
        const element = document.getElementById(elementId);
        element.textContent = '';
        element.className = 'status';
        element.style.display = 'none';
    }

    editRecords() {
        this.showMessage('💡 Click "Edit" on individual records to modify them', 'info');
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    editRecord(type, index) {
        // Simple inline editing - you can enhance this
        const record = this.currentAnalysis[type + 's'][index];
        const newTitle = prompt('Edit title:', record.title || record.name);
        if (newTitle !== null) {
            if (type === 'article') {
                record.title = newTitle;
            } else {
                record.name = newTitle;
            }
            this.displayAnalysisResults({ analysis: this.currentAnalysis, extractedContent: { text: '', images: [] } });
        }
    }

    removeRecord(type, index) {
        if (confirm('Remove this record?')) {
            this.currentAnalysis[type + 's'].splice(index, 1);
            this.displayAnalysisResults({ analysis: this.currentAnalysis, extractedContent: { text: '', images: [] } });
        }
    }

    // UI Helper Methods
    showMessage(message, type = 'info') {
        const messagesDiv = document.getElementById('messages');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        messagesDiv.appendChild(messageEl);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 5000);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new WordDropboxProcessor();
}); 