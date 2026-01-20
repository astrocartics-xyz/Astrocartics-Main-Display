// Imports
import {setupFooter} from './footer.js';
import {setupNavbar} from './navbar.js';
import {normalizeHeatmap, openRegionPanel, closeRegionPanel} from './heatmap.js';
import {openTopPanel, closeTopPanel} from './top.js';
import {fetchTopRegions, fetchTopConstellations, fetchTopSystems} from '../../api_wrapper/wrapper.js';
// Keep a local store of the latest heatmap and  systems loaded for the region
let latestHeatmapRaw = null;   // raw payload
let latestHeatmapBuckets = []; // normalized array of bucket entries
let latestRegionId = null;
let latestSystems = [];
// Listen for heatmap events dispatched by main.js
window.addEventListener('regionHeatmapLoaded', (e) => {
	latestRegionId = e?.detail?.regionId ?? null;
	latestSystems = Array.isArray(e?.detail?.systems) ? e.detail.systems : [];
	// Normalize heatmap payload into an array of "bucket" entries
	latestHeatmapRaw = e?.detail?.heatmap ?? null;
	latestHeatmapBuckets = normalizeHeatmap(latestHeatmapRaw);
});
// Export all functions for user interface
export function setupUIHandlers() {
	// Initialize navbar through the user_interface module (Option A)
	const navbar = setupNavbar();
	const {searchBtn, infoBtn, explosionBtn, searchPanel, searchInput, panelSearchBtn, closeSearchBtn, clearSearchInput, toggleSearchPanel, showSearchPanel, hideSearchPanel, getSearchValue} = navbar;
	// Search window show/hide feature
	// Panels owns showing/hiding the search panel, using the navbar button as the trigger.
	if (searchBtn && searchPanel) {
		searchBtn.addEventListener('click', toggleSearchPanel);
	}
	// Info button: toggle the region heatmap panel (open if closed, close if open).
	if (infoBtn) {
		infoBtn.addEventListener('click', () => {
			// Close top panel
			const topPanel = document.getElementById('top-info-panel');
			if (topPanel) {
				topPanel.remove();
			}
			// Close heat panel or open it
			const heatPanel = document.getElementById('region-heatmap-panel');
			if (heatPanel) {
				heatPanel.remove();
			} else {
				openRegionPanel(latestRegionId, latestSystems, latestHeatmapBuckets);
			}
		});
	}
	// Explosion button: toggle the top panel (open if closed, close if oepn).
	if (explosionBtn) {
		explosionBtn.addEventListener('click', async () => {
			// Close heat panel
			const heatPanel = document.getElementById('region-heatmap-panel');
			if (heatPanel) {
				heatPanel.remove();
			}
			// Close top panel or open it
			const topPanel = document.getElementById('top-info-panel');
			if (topPanel) {
				topPanel.remove();
			} else {
				const [regions, constellations, systems] = await Promise.all([
					fetchTopRegions(),
					fetchTopConstellations(),
					fetchTopSystems()
				]);
				openTopPanel({regions, constellations, systems});
			}
		});
	}
	// Clicking button
	if (panelSearchBtn) {
		panelSearchBtn.addEventListener('click', runSearch);
	}
	// Run search after pressing enter
	if (searchInput) {
		searchInput.addEventListener('keypress', (event) => {
			if (event.key === 'Enter') {
				runSearch();
			}
		});
	}
	// Remove panel if user initiates a search
	window.addEventListener('uiSearch', closeRegionPanel);
	// Remove panel if a region is clicked in the footer
	window.addEventListener('regionClick', closeRegionPanel);
	// Remove panel when new data is loaded by user
	//window.addEventListener('regionHeatmapLoaded', closeRegionPanel);
	// Populate footer
	setupFooter();
	// Running the search
	function runSearch() {
		const text = getSearchValue();
		if (!text) {
			alert('Please type region name!');
			return;
		}
		clearSearchInput();
		hideSearchPanel();
		window.dispatchEvent(new CustomEvent('uiSearch', {detail: {term: text}}));
	}
}
