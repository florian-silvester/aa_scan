/**
 * HTTP Client Service (Browser Compatible)
 * Provides interface to backend server using HTTP requests
 */
export class HttpClient {
    constructor() {
        this.isConnected = false;
        this.serverUrl = 'http://localhost:3001'; // Backend server endpoint
        this.credentials = null;
    }

    /**
     * Initialize connection to backend server
     * @param {object} credentials - API credentials
     */
    async connect(credentials) {
        try {
            console.log('Connecting to backend server...');
            
            this.credentials = credentials;

            // Test connection
            await this.makeRequest('health');
            
            this.isConnected = true;
            console.log('Successfully connected to backend server');
            
            return { success: true, message: 'Connected to server' };
        } catch (error) {
            console.error('Failed to connect to backend server:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Make HTTP request to backend server
     */
    async makeRequest(endpoint, params = {}) {
        const requestBody = {
            ...params,
            ...this.credentials
        };

        try {
            const response = await fetch(`${this.serverUrl}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }

            return result.content || result.data || result;
        } catch (error) {
            console.error(`Request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Disconnect from the service
     */
    async disconnect() {
        this.isConnected = false;
        this.credentials = null;
        console.log('Disconnected from backend service');
    }
} 