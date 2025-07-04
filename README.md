# 🎨 Sanity Art Aurea

**AI-powered Word document processor for art jewelry documentation**

A sophisticated system that extracts text from Word documents, analyzes content with OpenAI, and automatically organizes art jewelry documentation into Sanity CMS. Perfect for processing exhibition catalogs, artist profiles, and artwork descriptions with intelligent bilingual content management.

## 🌟 Features

- **📄 Word Document Processing**: Extract text from .doc and .docx files using mammoth
- **🤖 AI Analysis**: Uses OpenAI GPT-4 to intelligently analyze and structure art jewelry content
- **📊 Smart Categorization**: Automatically separates articles from artwork descriptions
- **🎨 Art Jewelry Focus**: Specialized for jewelry documentation, exhibitions, and artist profiles
- **🔄 Sanity CMS Integration**: Seamlessly syncs structured data to Sanity CMS
- **🌍 Bilingual Support**: Complete English and German content management
- **📝 Rich Text Editing**: Full rich text editing with block-based content
- **🖼️ Image Management**: Automatic artwork reference linking with image thumbnails
- **⚡ Batch Processing**: Handles large documents with efficient batching

## 📋 Prerequisites

- Node.js 16+
- Sanity account and project
- OpenAI API key
- (Optional) Dropbox account for image processing

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure credentials:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Start the server:**
   ```bash
   npm start
   # or
   node mcp-server.js
   ```

4. **Start Sanity Studio:**
   ```bash
   cd sanity-cms
   npm run dev
   ```

5. **Access the applications:**
   - Word processor: `http://localhost:3001`
   - Sanity Studio: `http://localhost:3333`

## 🔐 Configuration

Create a `.env` file in the project root with your credentials:

```env
# Sanity Configuration
SANITY_PROJECT_ID=your_sanity_project_id_here
SANITY_DATASET=production
SANITY_API_TOKEN=your_sanity_api_token_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Dropbox Configuration (Optional)
DROPBOX_TOKEN=your_dropbox_access_token_here

# Server Configuration
PORT=3001
```

### Getting Your Credentials

1. **Sanity Project**: Create a project at [Sanity.io](https://www.sanity.io/)
2. **OpenAI API Key**: Get from [OpenAI API Keys](https://platform.openai.com/api-keys)
3. **Dropbox Token**: Optional, from [Dropbox App Console](https://www.dropbox.com/developers/apps)

## 🎨 Art Jewelry Documentation Structure

Sanity Art Aurea uses specialized content types designed for art jewelry documentation:

### Articles Schema
Perfect for exhibition catalogs, essays, and artist profiles:

| Field Name | Type | Description |
|------------|------|-------------|
| titleEn/titleDe | String | Article title (bilingual) |
| author | String | Author name |
| maker | String | Featured artist/maker |
| date | Date | Publication date |
| introductionEn/introductionDe | Rich Text | Article introduction |
| fullTextEn/fullTextDe | Rich Text | Full article content |
| images | References | Links to featured artworks |
| slug | Slug | URL-friendly identifier |

### Artworks Schema
Comprehensive artwork documentation:

| Field Name | Type | Description |
|------------|------|-------------|
| imageId | String | Unique identifier |
| workTitle | String | Artwork title |
| categoryEn/categoryDe | String | Category (brooch, necklace, etc.) |
| maker | String | Artist name |
| year | String | Creation year |
| materialEn/materialDe | String | Materials used (bilingual) |
| measurements | String | Dimensions |
| commentsEn/commentsDe | Rich Text | Artwork descriptions (bilingual) |
| photoCredit | String | Photographer credit |
| images | Files | High-resolution artwork images |
| articles | References | Related articles/exhibitions |
| slug | Slug | URL-friendly identifier |

## 🎯 How It Works

1. **Document Upload**: Upload Word documents containing exhibition catalogs or artist documentation
2. **Text Extraction**: Advanced parsing extracts text while preserving formatting
3. **AI Analysis**: OpenAI GPT-4 analyzes content specifically for art jewelry documentation:
   - Identifies artists, techniques, and materials
   - Extracts artwork descriptions and technical details
   - Structures content for bilingual presentation
   - Links artworks to related articles
4. **Smart Sync**: 
   - Creates organized content in Sanity CMS
   - Maintains relationships between artists and artworks
   - Supports bilingual content workflow
   - Generates SEO-friendly slugs

## 🛠️ Development

### Project Structure

```
sanity-art-aurea/
├── mcp-server.js              # Main server with AI processing
├── plugin/
│   ├── index.html            # Web interface
│   ├── index.js              # Frontend JavaScript
│   ├── styles.css            # UI styles
│   └── HttpClient.js         # Backend communication
├── sanity-cms/               # Sanity CMS project
│   ├── schemas/             # Content schemas
│   ├── sanity.config.js     # Sanity configuration
│   └── package.json         # Sanity dependencies
├── migrate-*.js             # Migration utilities
├── .env                     # Environment variables
└── README.md               # This file
```

### Key Features

- **Art Jewelry Specialized**: Optimized for jewelry documentation workflows
- **Bilingual Content**: Complete English/German content management
- **Image Relationships**: Automatic linking between articles and artwork images
- **Rich Text Support**: Formatted content with proper typography
- **Migration Tools**: Utilities for importing existing documentation

### API Endpoints

- `GET /` - Web interface
- `POST /process` - Process Word document with AI
- `POST /sync` - Sync structured data to Sanity CMS
- `GET /health` - Health check

## 🔧 Migration Scripts

The project includes specialized migration utilities:

- `migrate-airtable-to-sanity.js` - Import existing Airtable documentation
- `migrate-text-to-rich-text.js` - Convert text fields to rich text blocks
- `fix-artwork-references.js` - Repair artwork reference relationships

## 🔧 Troubleshooting

### Common Issues

1. **"Missing required credentials"**
   - Ensure your `.env` file is properly configured
   - Check that all required environment variables are set

2. **"JSON Parse Error"**
   - The AI response was truncated
   - System automatically falls back to manual extraction

3. **"Sanity API Error"**
   - Check your token permissions
   - Verify project ID and dataset are correct
   - Ensure schema structure matches expectations

4. **"No active document found"**
   - Upload a valid Word document (.doc or .docx)
   - Check file isn't corrupted

### Debug Mode

Set `NODE_ENV=development` for detailed logging:
```bash
NODE_ENV=development npm start
```

## 📈 Performance

- **Document Size**: Handles exhibition catalogs up to 100MB
- **Processing Speed**: ~30 seconds for typical jewelry documentation
- **Token Usage**: Optimized prompts for art jewelry content
- **Rich Text**: Automatic formatting preservation

## 🎨 Perfect For

- **Exhibition Catalogs**: Process entire jewelry exhibition documentation
- **Artist Portfolios**: Organize artist statements and artwork descriptions
- **Gallery Documentation**: Manage collection information and provenance
- **Academic Research**: Structure scholarly articles about jewelry art
- **Auction Catalogs**: Extract lot descriptions and artist information

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Sanity.io for headless CMS services
- mammoth.js for Word document processing
- The art jewelry community for inspiration

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: [Wiki](https://github.com/your-repo/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**✨ Transform your art jewelry documentation with AI! 🎨📊**

