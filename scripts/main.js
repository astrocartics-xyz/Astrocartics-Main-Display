// Imports
import {loadRandomRegionSystems, fetchSystemsBySearch, fetchRegionHeatmap} from './api_wrapper/wrapper.js';
import {setupScene} from './camera/scene.js';
import {setupInteractionHandlers} from './user_interface/interactivity.js';
import {setupUIHandlers} from './user_interface/panel.js';
import {normalizeHeatmap, buildKillsById, buildKillsByKey} from './user_interface/heatmap_parser.js';
// Grouping of DOM elements.
const ui = {
	header: document.getElementById('region-header'),
	loading: document.getElementById('loading-section'),
	loadingMsg: document.getElementById('loading-message'),
	scene: document.getElementById('scene-container'),
	searchBtn: document.getElementById('search-toggle-btn')
};
// Current scene flag
let currentScene = null;
// Export functions for visualization in index.html
export async function startVisualization(mode, params = null) {
	// Loading Screen, hide scene while loading
	toggleLoadingScreen(true);
	ui.scene.classList.add('hidden');
	// Clean up any scenes previously loaded.
	if (currentScene) {
		if (currentScene.cleanup) {
			currentScene.cleanup();
		}
		currentScene = null;
	}
	// Loading data and updating navigation bar
	try {
		// Systems
		const systems = await loadGalaxyData(mode, params);
		// Check systems length on load
		if (!systems || systems.length === 0) {
			throw new Error('No solar systems found.');
		}
		// Determine region id from the returned systems
		const regionId = systems[0].region_id;
		// Fetch heatmap for this region (used by footer/panel/interaction)
		updateLoadingText('Loading heatmap...');
		// Current heatmap flag
		let heatmap = null;
		// Get heatmap for current region
		try {
			heatmap = await fetchRegionHeatmap(regionId);
		} catch (e) {
			console.warn('Failed to load region heatmap', e);
			heatmap = null;
		}
		// Normalize once and build lookups here (single source of truth)
		const heatmapBuckets = normalizeHeatmap(heatmap);
		const killsById = buildKillsById(heatmapBuckets);   // for interactivity (id/name => kills)
		const killsByKey = buildKillsByKey(heatmapBuckets); // for panel (id:<id> / name:<name>)
		//console.log(heatmapBuckets);
		//console.log(killsById);
		//console.log(killsByKey);
		// Notify any UI modules that need heatmap data (panel.js listens to this event)
		window.dispatchEvent(new CustomEvent('regionHeatmapLoaded', {
			detail: {regionId, heatmap, systems, heatmapBuckets, killsById, killsByKey}
		}));
		// Extract stargates from systems
		const allStargates = systems.flatMap(s => s.stargates || []);
		// Region header
		ui.header.textContent = systems[0].region_name;
		// Build scene in display
		updateLoadingText('Building Region View.');
		currentScene = setupScene(systems, allStargates, killsById);
		// After scene load, allow user interactivity (pass heatmap so we don't fetch per selection)
		setupInteractionHandlers(currentScene.camera, currentScene.scene, systems, heatmap);
		// Display end results to user
		toggleLoadingScreen(false);
		ui.scene.classList.remove('hidden');
		ui.searchBtn.classList.remove('hidden');
	} catch (error) {
		// Console logging
		console.error("Error Message:", error);
		alert("Error: " + error.message);
		toggleLoadingScreen(false);
		// User view
		ui.header.textContent = "Error Loading Region";
	}
}
// Auxiliary functions
async function loadGalaxyData(mode, params) {
	let systems;
	// Help with text on screen
	const onProgress = (phase, text) => updateLoadingText(text);
	// Check mode before loading
	if (mode === 'random') {
		// Make wrapper call
		systems = await loadRandomRegionSystems(onProgress);
	} else if (mode === 'search') {
		// Fetch both systems and stargates simultanously
		systems = await fetchSystemsBySearch(params.term, onProgress);
	}
	// Return systems and stargates for display in scene
	return systems;
}
// Loading screen function
function toggleLoadingScreen(isVisible) {
	// Check the isVisible flag, otherwise keep loading hidden
	if (isVisible) {
		ui.loading.classList.remove('hidden');
		ui.loadingMsg.textContent = 'Starting display';
	} else {
		ui.loading.classList.add('hidden');
	}
}
// Update loading screen text
function updateLoadingText(text) {
	ui.loadingMsg.textContent = text;
}
// Pull the DOM together
document.addEventListener('DOMContentLoaded', () => {
	// Set up User Interface
	setupUIHandlers();
	// Listen for regionClick events from the footer and use the existing search flow
	window.addEventListener('regionClick', (e) => {
		const name = e?.detail?.region_name;
		if (name) {
			startVisualization('search', {term: name});
		}
	});
	// Listen for uiSearch events and call startVisualization
	window.addEventListener('uiSearch', (e) => {
		const term = e?.detail?.term;
		if (term) {
			startVisualization('search', {term});
		}
	});
	// Random region upon start.
	startVisualization('random');
});
