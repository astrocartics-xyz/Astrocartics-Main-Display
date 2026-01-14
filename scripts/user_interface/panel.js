// Imports
import {setupFooter} from './footer.js';
import {setupNavbar} from './navbar.js';
import {renderRegionKillsGraph} from './graph.js'
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
	if (Array.isArray(latestHeatmapRaw)) {
		latestHeatmapBuckets = latestHeatmapRaw;
	} else if (latestHeatmapRaw && Array.isArray(latestHeatmapRaw.buckets)) {
		latestHeatmapBuckets = latestHeatmapRaw.buckets;
	} else if (latestHeatmapRaw && typeof latestHeatmapRaw === 'object') {
		//map id->value, convert to array of objects
		latestHeatmapBuckets = Object.keys(latestHeatmapRaw).map(k => {
			return {system_id: Number(k), kills: Number(latestHeatmapRaw[k] ?? 0)};
		});
	} else {
		latestHeatmapBuckets = [];
	}
});
// Export all functions for user interface
export function setupUIHandlers() {
	// Initialize navbar through the user_interface module (Option A)
	const navbar = setupNavbar();
	const searchToggleBtn = navbar.searchBtn;
	const infoBtn = navbar.infoBtn;

	const searchPanel = document.getElementById('search-panel');
	const closeSearchBtn = document.getElementById('close-search-btn');
	const searchBtn = document.getElementById('search-btn');
	const searchInput = document.getElementById('search-input');
	// Search window show/hide feature
	// Panels owns showing/hiding the search panel, using the navbar button as the trigger.
	if (searchToggleBtn && searchPanel) {
		searchToggleBtn.addEventListener('click', () => {
			searchPanel.classList.toggle('hidden');
			if (!searchPanel.classList.contains('hidden') && searchInput) {
				searchInput.focus();
			}
		});
	}
	// Close button in paneling
	if (closeSearchBtn && searchPanel) {
		closeSearchBtn.addEventListener('click', () => {
			searchPanel.classList.add('hidden');
		});
	}
	// Info button: toggle the region heatmap panel (open if closed, close if open).
	if (infoBtn) {
		infoBtn.addEventListener('click', () => {
			const existing = document.getElementById('region-heatmap-panel');
			if (existing) {
				existing.remove();
			} else {
				openRegionHeatmapPanel();
			}
		});
	}
	// Populate footer
	setupFooter();
	// Run search during click on button
	if (searchBtn) {
		searchBtn.addEventListener('click', () => runSearch());
	}
	// Run search after pressing enter
	if (searchInput) {
		searchInput.addEventListener('keypress', (event) => {
			if (event.key === 'Enter') {
				runSearch();
			}
		});
	}
	// Auxiliary functions
	// -------------------
	function runSearch() {
		const text = searchInput ? searchInput.value.trim() : '';
		if (!text) {
			alert('Please type region name!');
			return;
		}
		if (searchPanel) {
			searchPanel.classList.add('hidden');
		}
		window.dispatchEvent(new CustomEvent('uiSearch', {detail: {term: text}}));
	}
	// Create and open the panel that fills area between navbar and footer
	function openRegionHeatmapPanel() {
		const existing = document.getElementById('region-heatmap-panel');
		if (existing) {
			existing.remove();
		}
		const panel = document.createElement('div');
		panel.id = 'region-heatmap-panel';
		panel.className = 'region-heatmap-panel';
		// Compute offsets to avoid covering navbar and footer
		const topBar = document.getElementById('top-bar');
		const footer = document.getElementById('top-regions-footer');
		const topOffset = topBar ? topBar.offsetHeight : 60;
		const bottomOffset = footer ? footer.offsetHeight : 56;
		// Assign styling
		Object.assign(panel.style, {
			position: 'fixed',
			top: `${topOffset}px`,
			left: '0',
			right: '0',
			bottom: `${bottomOffset}px`,
			zIndex: '100',
			overflow: 'auto',
			padding: '28px',
			boxSizing: 'border-box'
		});
		// Header
		const header = document.createElement('div');
		header.className = 'region-heatmap-header';
		// Title
		const title = document.createElement('h2');
		title.className = 'region-heatmap-title';
		title.textContent = latestSystems && latestSystems.length ? (latestSystems[0].region_name || 'Region') : 'Region';
		header.appendChild(title);
		panel.appendChild(header);
		// Subtitle / Information
		const infoLine = document.createElement('div');
		infoLine.className = 'region-heatmap-sub';
		// Count systems with activity, i.e. non-zero kills in the normalized heatmap buckets
		const buckets = Array.isArray(latestHeatmapBuckets) ? latestHeatmapBuckets : [];
		const activeSystemsCount = buckets.filter(b => Number(b.kills ?? b.value ?? 0) > 0).length;
		infoLine.textContent = `Past hour activity: ${activeSystemsCount} system${activeSystemsCount === 1 ? '' : 's'}`;
		panel.appendChild(infoLine);
		// Graph 
		const graphWrap = document.createElement('div');
		graphWrap.className = 'region-heatmap-graph';
		panel.appendChild(graphWrap);
		// Check for latest region
		if (latestRegionId) {
			renderRegionKillsGraph(graphWrap, latestRegionId);
			// Render graph into graphWrap
			console.log("Graph function call render goes here");
			
		}
		// Normalize buckets for lookup: prefer system_id and use `kills` field
		const killsByKey = {};
		if (Array.isArray(latestHeatmapBuckets)) {
			latestHeatmapBuckets.forEach(b => {
				const id = Number(b.system_id ?? b.id ?? b.systemId ?? NaN);
				const kills = Number(b.kills ?? b.value ?? 0);
				if (!Number.isNaN(id)) killsByKey[id] = kills;
			});
		}
		// Create table wrapper
		const wrap = document.createElement('div');
		wrap.className = 'region-heatmap-table-wrap';
		const table = document.createElement('table');
		table.className = 'region-heatmap-table';
		// Head
		const thead = document.createElement('thead');
		const headRow = document.createElement('tr');
		const th1 = document.createElement('th');
		th1.textContent = 'System';
		const th2 = document.createElement('th');
		th2.textContent = 'Constellation';
		const th3 = document.createElement('th');
		th3.textContent = 'Kills';
		th3.className = 'region-heatmap-th--numeric';
		headRow.appendChild(th1);
		headRow.appendChild(th2);
		headRow.appendChild(th3);
		thead.appendChild(headRow);
		table.appendChild(thead);
		// Body
		const tbody = document.createElement('tbody');
		// Sort latestSystems by kills, descending, for presentation purposes
		const systemsToShow = Array.isArray(latestSystems) ? latestSystems.slice() : [];
		systemsToShow.sort((a, b) => {
			const aKills = killsByKey[a.system_id] ?? 0;
			const bKills = killsByKey[b.system_id] ?? 0;
			return bKills - aKills;
		});
		systemsToShow.forEach(sys => {
			const tr = document.createElement('tr');
			const tdName = document.createElement('td');
			tdName.className = 'region-heatmap-td';
			tdName.textContent = sys.system_name || `#${sys.system_id}`;
			const tdConst = document.createElement('td');
			tdConst.className = 'region-heatmap-td';
			tdConst.textContent = sys.constellation_name || '';
			const tdKills = document.createElement('td');
			tdKills.className = 'region-heatmap-td region-heatmap-kills';
			tdKills.textContent = String(killsByKey[sys.system_id] ?? 0);
			tr.appendChild(tdName);
			tr.appendChild(tdConst);
			tr.appendChild(tdKills);
			tbody.appendChild(tr);
		});
		table.appendChild(tbody);
		wrap.appendChild(table);
		panel.appendChild(wrap);
		// Append to body
		document.body.appendChild(panel);
		// Scroll the panel into view a bit
		panel.scrollIntoView();
	}
}
