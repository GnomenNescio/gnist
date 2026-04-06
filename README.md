# Gnist: Activity Finder

Find fun activities to do with your kids! Filter by location and energy level.

## How to Use

1. **Start a local web server** in the project directory:
   ```bash
   # Using Python 3
   python3 -m http.server 8000

   # Or using Python 2
   python -m SimpleHTTPServer 8000

   # Or using Node.js
   npx http-server -p 8000
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:8000
   ```

3. **Select your filters**:
   - Choose locations (Inside, Outside, Garden, Snow, Car)
   - Choose energy levels (Calm, Active)

4. **Click "Generate Ideas"** to see activities matching your filters

## Troubleshooting

### Activities Won't Display

If activities aren't showing up, check the following:

1. **Are you using a web server?**
   - ❌ Opening `index.html` directly (file:// URLs) will cause CORS errors
   - ✅ Use a local web server (see "How to Use" above)

2. **Check the browser console** (F12 or right-click → Inspect → Console tab):
   - Look for error messages in red
   - The app now logs helpful debug information:
     - "Loaded X activities from JSON"
     - "Selected locations: ..."
     - "Filtered to X activities"

3. **Common Issues**:
   - **CORS Error**: You must use a web server, not open the file directly
   - **404 Error**: Make sure `activities.json` is in the same folder as `index.html`
   - **No activities shown**: Check if any filters are selected (at least one location AND one energy level must be checked)

4. **Try a different browser**: Test in Chrome, Firefox, or Edge to rule out browser-specific issues

5. **Clear browser cache**: Press Ctrl+F5 (or Cmd+Shift+R on Mac) to force reload

### Error Messages

The app now shows helpful error messages:
- **"Loading activities..."**: The app is fetching data (should be quick)
- **"No ideas match your filters..."**: No activities match your current filter selection
- **"Error loading activities..."**: There was a problem loading the JSON file (check console for details)

## Files

- `index.html` - Main page
- `script.js` - JavaScript for filtering and displaying activities
- `activities.json` - Activity data
- `styles.css` - Styling
