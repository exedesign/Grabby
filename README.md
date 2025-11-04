# 🎯 Grabby

Smart 3D model file downloader with custom naming for Chrome/Edge browsers.

## Features

✨ **Auto-Detection** - Automatically detects 3D model files (.spz, .ply, .splat, .gsplat, .npz)  
📝 **Smart Naming** - Extracts page title and uses it as filename  
🗓️ **Date Stamping** - Adds date to filename (YYYY-MM-DD format)  
🔧 **Custom Formats** - Add/remove supported file formats  
🌙 **Dark Theme** - Beautiful dark UI with purple gradient  
🇹🇷 **Turkish Support** - Converts Turkish characters for safe filenames  

## Installation

### Chrome/Edge

1. Download or clone this repository
2. Open `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `spz-yakala` folder

## Usage

1. **Navigate** to a page with 3D model files
2. **Badge** shows count of detected files
3. **Click** extension icon to see file list
4. **Download** with custom filename based on page title

## Settings

Click the ⚙️ icon to:
- View active formats
- Add new file formats
- Remove formats (minimum 1 required)

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
