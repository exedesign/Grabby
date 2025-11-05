# 🎯 Grabby

Smart 3D model file downloader with intelligent naming and multi-language support.

## 🌟 Features

- 🔍 **Auto-Detection**: Automatically finds 3D model files on web pages
- 📝 **Smart Naming**: Downloads files with page title instead of URL filename
- 🎨 **Dark Theme**: Beautiful dark mode interface with purple gradients
- 🔧 **Customizable Formats**: Add or remove file formats to monitor
- � **Multi-Language**: Supports 10 languages (English, Turkish, Spanish, French, German, Chinese, Japanese, Russian, Portuguese, Arabic)
- 💾 **Custom Downloads**: Save files with date-stamped custom names
- 🔔 **Badge Counter**: Shows detected file count on extension icon
- 📋 **Title Extraction**: Uses og:title, meta tags, and page title for smart naming

## 📦 Installation

### Chrome/Edge

1. Download or clone this repository
2. Open `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension folder
6. The Grabby icon will appear in your Chrome toolbar

## 🚀 Usage

1. Visit any web page with 3D model files
2. Grabby automatically detects supported file formats
3. Click the extension icon to see detected files
4. Choose your preferred language from settings (⚙️)
5. Click "Download" to save files with custom names
6. Files are saved with format: `page-title-YYYY-MM-DD.extension`

## 🌐 Supported Languages

- 🇬🇧 English
- 🇹🇷 Türkçe (Turkish)
- 🇪🇸 Español (Spanish)
- 🇫🇷 Français (French)
- 🇩🇪 Deutsch (German)
- 🇨🇳 中文 (Chinese)
- 🇯🇵 日本語 (Japanese)
- 🇷🇺 Русский (Russian)
- 🇧🇷 Português (Portuguese)
- 🇸🇦 العربية (Arabic)

## Settings

Click the ⚙️ icon to:
- **Change Language** - Select from 10 supported languages
- **View Active Formats** - See currently monitored file types
- **Add New Formats** - Add custom file extensions
- **Remove Formats** - Delete unwanted formats (minimum 1 required)

## 🎯 Supported Formats (Default)

- `.spz` - SPZ files
- `.ply` - PLY point clouds
- `.splat` - Splat files
- `.gsplat` - GSplat files
- `.npz` - NumPy compressed arrays

You can add or remove formats through the settings panel.

## ⚙️ Technical Details

### Title Extraction Priority
1. `og:title` (OpenGraph) - Absolute priority
2. `twitter:title` (Twitter Cards)
3. `article:title` (Article metadata)
4. `headline` (Schema.org)
5. `name` (Generic meta name)
6. Page `<title>` tag
7. First `<h1>` tag
8. Meta description (shortened)
9. Site name fallback
10. Domain name (last resort)

### File Detection
- Network monitoring via `webRequest` API
- Content-Disposition header parsing
- Content-Type validation (including multiple PLY MIME types)
- URL path segment analysis
- Query parameter handling

### Filename Sanitization
- Turkish character conversion (ğ→g, ı→i, ş→s, ç→c, ö→o, ü→u)
- Special character removal
- Unicode normalization
- Maximum 150 character limit
- Lowercase conversion

## 🛠️ Development

### File Structure
```
grabby/
├── manifest.json       # Extension configuration
├── background.js       # Service worker (file detection)
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic and i18n handling
├── i18n.js             # Translation system
├── options.html        # Options page
├── icons/              # Extension icons
└── README.md           # This file
```

### Key APIs Used
- `chrome.webRequest` - Network monitoring
- `chrome.downloads` - Custom file downloads
- `chrome.storage` - Settings and file tracking
- `chrome.scripting` - Title extraction

## 📝 Changelog

### v1.1.0 (2025-11-05)
- ✨ Added multi-language support (10 languages)
- 🌍 Language selector in settings panel
- 🔄 Dynamic UI translation system
- 📚 i18n translation library
- 🎨 Enhanced settings modal with language section
- 💾 Language preference persistence

### v1.0.0 (2025-11-05)
- ✨ Enhanced .ply file detection with Content-Type support
- 🔍 Added multiple PLY MIME type support
- 🎯 og:title absolute priority for title extraction
- 📊 Enhanced title extraction with 10 priority sources
- 🎨 Dark theme with purple gradients
- 💾 Custom filename downloads
- ⚙️ Format management system
- 🔔 Badge counter for detected files

## 📄 License

MIT License - Feel free to use and modify!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Issues

Found a bug? Please open an issue on GitHub with:
- Browser version
- Extension version
- Steps to reproduce
- Expected vs actual behavior

---

Made with ❤️ for 3D enthusiasts

## How It Works

1. **Network Monitor** - Listens to all network requests
2. **File Detection** - Checks Content-Type and URL for supported formats
3. **Title Extraction** - Extracts page title from:
   - `og:title` meta tag
   - `twitter:title` meta tag
   - Dialog/modal titles
   - H1 headings
   - Document title
4. **Filename Generation** - Creates safe filename:
   - Converts Turkish characters (ğ→g, ı→i, etc.)
   - Removes special characters
   - Adds date stamp
   - Adds original extension

## Default Supported Formats

- `.spz` - Splat files
- `.ply` - Polygon files
- `.splat` - Gaussian splatting
- `.gsplat` - Gaussian splatting
- `.npz` - NumPy arrays

## Technical Details

- **Manifest V3** - Latest Chrome extension format
- **Permissions**: storage, webRequest, downloads, scripting
- **Storage**: Chrome sync storage for formats, local storage for files
- **Download API**: Uses `chrome.downloads.onDeterminingFilename` for custom naming

## Development

### File Structure
```
spz-yakala/
├── manifest.json       # Extension configuration
├── background.js       # Network monitoring & download logic
├── popup.html          # Extension UI
├── popup.js            # UI logic
├── options.html        # Settings page
├── options.js          # Settings logic
└── icons/              # Extension icons
```

### Building

No build process required - this is a pure JavaScript extension.

### Testing

1. Load extension in Chrome
2. Open developer console
3. Visit a page with 3D model files
4. Check console for debug messages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use in your own projects!

## Author

Created with ❤️ for the 3D community

## Changelog

### v1.0.0 (2025-11-04)
- Initial release
- Auto-detection of 5 file formats
- Smart filename generation
- Dark theme UI
- Custom format management
