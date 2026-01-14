# EVE Galaxy Explorer

A simplified, interactive 3D visualization of the EVE Online galaxy.

## Features

- **Dual Space Support**: Choose between K-Space (Known Space) and J-Space (Wormhole Space)
- **Fast Search**: Search by region, constellation, or system name
- **Quick Access**: One-click access to popular regions
- **3D Visualization**: Interactive Three.js-powered galaxy map
- **Performance Optimized**: Uses direct API endpoints for fast loading

## File Structure

```
├── index.html              # Main HTML file
├── styles/
│   └── main.css            # All styling
└── scripts/
    ├── main.js             # Main application entry point
    ├── menuHandler.js      # Menu interactions and search
    ├── galaxyDataLoader.js # API calls and data processing
    ├── sceneSetup.js       # Three.js scene configuration
    └── interactions.js     # 3D scene interactions
```

## Quick Start

1. Open `index.html` in a web browser
2. Choose space type (K-Space or J-Space)
3. Either load the full galaxy or search for specific areas
4. Navigate the 3D view with mouse controls

## API

Uses the astrocartics.xyz API:
- `/v1/regions/{id}/constellations` - Get constellations in a region
- `/v1/regions/{id}/systems` - Get all systems in a region
- `/v1/stargates` - Get stargate connections

## Recent Improvements

- ✅ Fixed "The Forge" search functionality
- ✅ Optimized API calls (2 calls vs 66+ previously)
- ✅ Simplified file structure (removed unused files)
- ✅ Clean HTML/CSS without inline styles
- ✅ Better menu layout and responsiveness

## Controls

- **Left-drag**: Rotate view
- **Right-drag**: Pan view  
- **Scroll**: Zoom in/out
- **Double-click stars**: View system info