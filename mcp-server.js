import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('plugin'));

// Configure multer for file uploads
const upload = multer({
  dest: 'temp-downloads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// MCP Server Configuration
// Note: MCP integration works through Cursor's MCP system (configured in ~/.cursor/mcp.json)
// This server provides the web interface and coordinates between systems
const MCP_CONFIG = {
  sanity: {
    projectId: 'b8bczekj',
    dataset: 'production',
    enabled: true, // MCP configured in Cursor
    configuredVia: 'Cursor MCP'
  },
  webflow: {
    enabled: true,
    endpoint: 'https://mcp.webflow.com/sse',
    configuredVia: 'Cursor MCP'
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mcp: {
      sanity: MCP_CONFIG.sanity.enabled,
      webflow: MCP_CONFIG.webflow.enabled
    }
  });
});

// Main interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'plugin', 'index.html'));
});

// MCP Status endpoint
app.get('/mcp/status', (req, res) => {
  res.json({
    sanity: {
      configured: MCP_CONFIG.sanity.enabled,
      projectId: MCP_CONFIG.sanity.projectId,
      dataset: MCP_CONFIG.sanity.dataset,
      configuredVia: MCP_CONFIG.sanity.configuredVia
    },
    webflow: {
      configured: MCP_CONFIG.webflow.enabled,
      endpoint: MCP_CONFIG.webflow.endpoint,
      configuredVia: MCP_CONFIG.webflow.configuredVia
    },
    note: "MCP tools work through Cursor's MCP system - no manual setup needed!"
  });
});

// Webflow integration endpoints
app.get('/webflow/sites', async (req, res) => {
  try {
    // This would typically call the Webflow MCP server
    // For now, return a placeholder
    res.json({
      message: 'Webflow integration ready',
      note: 'Use MCP tools to interact with Webflow sites'
    });
  } catch (error) {
    console.error('Webflow error:', error);
    res.status(500).json({ error: 'Failed to fetch Webflow sites' });
  }
});

// Sanity to Webflow sync endpoint
app.post('/sync/sanity-to-webflow', async (req, res) => {
  try {
    const { contentType, records } = req.body;
    
    console.log(`Syncing ${records?.length || 0} ${contentType} records to Webflow`);
    
    // This endpoint would coordinate between Sanity and Webflow MCP servers
    res.json({
      success: true,
      message: `Ready to sync ${contentType} content`,
      synced: records?.length || 0,
      note: 'Use MCP tools for actual synchronization'
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Document processing endpoint (existing functionality)
app.post('/process', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    console.log('Processing document:', req.file.originalname);
    
    // Document processing logic would go here
    res.json({
      success: true,
      message: 'Document processing ready',
      filename: req.file.originalname,
      note: 'Document processing functionality to be implemented'
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'Document processing failed' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(port, () => {
  console.log(`🎨 Sanity Art Aurea MCP Server running on port ${port}`);
  console.log(`📊 Web interface: http://localhost:${port}`);
  console.log(`🔧 Health check: http://localhost:${port}/health`);
  
  console.log('\n🔗 MCP Integration Status:');
  console.log(`  Sanity: ${MCP_CONFIG.sanity.enabled ? '✅ Enabled (via Cursor MCP)' : '❌ Not configured'}`);
  console.log(`  Webflow: ${MCP_CONFIG.webflow.enabled ? '✅ Enabled (via Cursor MCP)' : '❌ Not configured'}`);
  
  console.log('\n🎉 Ready to sync art jewelry content between Sanity and Webflow!');
});

export default app; 