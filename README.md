# Robux Price Converter Chrome Extension

A Chrome extension that converts prices in USD to Robux on any webpage.

## Conversion Rate
- 1000 Robux = $3.5

## Features
- Automatically scans webpages for dollar prices
- Converts prices to their Robux equivalent
- Works on any webpage
- Simple one-click conversion

## Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the folder containing this extension
5. The extension should now appear in your Chrome toolbar

## Usage
1. Navigate to any webpage with dollar prices (e.g., shopping sites)
2. Click on the Robux Price Converter icon in your Chrome toolbar
3. Click the "Convert Prices to Robux" button
4. All dollar prices on the page will be converted to their Robux equivalent

## Technical Notes
- The extension uses a tree walker to find all text nodes containing dollar amounts
- Regular expressions are used to identify price formats
- Prices are converted using the rate: 1000 Robux = $3.5
- The extension preserves the original page structure and only modifies text nodes 