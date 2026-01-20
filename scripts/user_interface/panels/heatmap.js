// Imports
import {renderRegionKillsGraph} from './graph.js'
// Heatmap normalization functions, do not want to repeat more than once.
export function normalizeHeatmap(raw) {
	// Returns an array of bucket-like objects: {system_id?, system_name?, kills?}
	if (!raw) {
		return [];
	}
	if (Array.isArray(raw)) {
		return raw;
	} else if (raw && Array.isArray(raw.buckets)) {
		return raw.buckets;
	} else if (raw && typeof raw === 'object') {
		// map of id->value
		return Object.keys(raw).map(k => ({ system_id: Number(k), kills: Number(raw[k] ?? 0) }));
	}
	return [];
}
// Export picking function
export function pick(obj, ...props) {
	for (const p of props) {
		if(obj[p] !== undefined && obj[p] !== null) {
			return obj[p];
		}
	}
	return null;
}
// Builds a simple lookup where keys are either numeric ids or system name strings.
// lookup[id] => kills, lookup[name] => kills
export function buildKillsById(buckets) {
	const lookup = {};
	if (!Array.isArray(buckets)) {
		return lookup;
	}
	buckets.forEach(entry => {
		// ID, NAME, KILLS
		const id = entry.system_id ?? entry.id ?? entry.systemId ?? null;
		const name = entry.system_name ?? entry.name ?? null;
		const kills = Number(entry.kills ?? entry.count ?? 0);
		if (id !== null && id !== undefined) {
			lookup[id] = kills;
		} else if (name) {
			lookup[name] = kills;
		}
	});
	return lookup;
}
// Builds the panel-style keyed lookup: `id:<id>` and `name:<name>`
export function buildKillsByKey(buckets) {
	const lookup = {};
	if (!Array.isArray(buckets)) {
		return lookup;
	}
	// Buckets
	buckets.forEach(entry => {
		// ID, NAME, KILLS
		const id = pick(entry, 'system_id', 'id', 'systemId');
		const name = pick(entry, 'system_name', 'name');
		const kills = Number(pick(entry, 'kills', 'count') || 0);
		if (id !== null && id !== undefined) {
			lookup[`id:${id}`] = kills;
		} else if (name) {
			lookup[`name:${name}`] = kills;
		}
	});
	return lookup;
}

// Close info panel when a new search/region is requested or loaded
export function closeRegionPanel() {
	const existing = document.getElementById('region-heatmap-panel');
	if (existing) {
		existing.remove();
	} else {
		return;
	}
}
// Create and open the panel that fills area between navbar and footer
export function openRegionPanel(regionId, systems, heatmapBuckets) {
	const existing = document.getElementById('region-heatmap-panel');
	if (existing) {
		existing.remove();
	}
	const panel = document.createElement('div');
	panel.id = 'region-heatmap-panel';
	panel.className = 'region-heatmap-panel';
	// Compute offsets to avoid covering navbar and footer
	const navbar = document.getElementById('top-bar');
	const footer = document.getElementById('top-regions-footer');
	const topOffset = navbar ? navbar.offsetHeight : 0;
	const bottomOffset = footer ? footer.offsetHeight : 0;
	panel.style.top = `${topOffset}px`;
	panel.style.bottom = `${bottomOffset}px`;
	// Header
	const header = document.createElement('div');
	header.className = 'region-heatmap-header';
	// Title
	const title = document.createElement('h2');
	title.className = 'region-heatmap-title';
	title.textContent = systems && systems.length ? (systems[0].region_name || 'Region') : 'Region';
	header.appendChild(title);
	panel.appendChild(header);
	// Graph
	const graphWrap = document.createElement('div');
	graphWrap.className = 'region-heatmap-graph';
	panel.appendChild(graphWrap);
	// Check for latest region
	if (regionId) {
		renderRegionKillsGraph(graphWrap, regionId);
	}
	// Subtitle / Information
	const infoLine = document.createElement('div');
	infoLine.className = 'region-heatmap-sub';
	// Count systems with activity, i.e. non-zero kills in the normalized heatmap buckets
	const buckets = Array.isArray(heatmapBuckets) ? heatmapBuckets : [];
	const activeSystemsCount = buckets.filter(b => Number(b.kills ?? b.value ?? 0) > 0).length;
	infoLine.textContent = `Past hour activity: ${activeSystemsCount} system${activeSystemsCount === 1 ? '' : 's'}`;
	panel.appendChild(infoLine);
	// Normalize buckets for lookup: prefer system_id and use `kills` field
	const killsByKey = {};
	if (Array.isArray(heatmapBuckets)) {
		heatmapBuckets.forEach(b => {
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
	// Sort systems by kills, descending, for presentation purposes
	const systemsToShow = Array.isArray(systems) ? systems.slice() : [];
	// Sort for table
	systemsToShow.sort((a, b) => {
		const aKills = killsByKey[a.system_id] ?? 0;
		const bKills = killsByKey[b.system_id] ?? 0;
		return bKills - aKills;
	});
	// Tabel data
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


