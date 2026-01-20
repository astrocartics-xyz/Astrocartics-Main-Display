// Close Top
export function closeTopPanel() {
	const panel = document.getElementById('top-info-panel');
	if (panel) {
		panel.remove();
	}
}
// Open Top
export function openTopPanel({regions = [], constellations = [], systems = []}) {
	const id = 'top-info-panel';
	let panel = document.getElementById(id);
	// Make sure to remove
	if (panel) {
		panel.remove();
	}
	// Create panel
	panel = document.createElement('div');
	panel.id = id;
	panel.className = 'top-info-panel';
	// Calculate offsets
	const navbar = document.getElementById('top-bar');
	const footer = document.getElementById('top-regions-footer');
	const topOffset = navbar ? navbar.offsetHeight : 0;
	const bottomOffset = footer ? footer.offsetHeight : 0;
	panel.style.top = `${topOffset}px`;
	panel.style.bottom = `${bottomOffset}px`;
	// Title
	const header = document.createElement('div');
	header.className = 'top-info-header';
	const title = document.createElement('h2');
	title.textContent = 'Top Activity: Past Hour';
	header.appendChild(title);
	panel.appendChild(header);
	// Top Information
	panel.appendChild(makeTable('Top Regions', regions, 'region_name', 'total_kills'));
	panel.appendChild(makeTable('Top Constellations', constellations, 'constellation_name', 'total_kills'));
	panel.appendChild(makeTable('Top Systems', systems, 'system_name', 'total_kills'));
	document.body.appendChild(panel);
	// Scroll the panel into view a bit
	panel.scrollIntoView();
}
// Build table
function makeTable(title, items, nameKey, valueKey)  {
	// Class
	const wrap = document.createElement('div');
	wrap.className = 'top-list-wrap'; // for styling
	// Header
	const heading = document.createElement('h3');
	heading.textContent = title;
	wrap.appendChild(heading);
	// Create table
	const table = document.createElement('table');
	table.className = 'top-table'; // option for extra style
	// Add table header
	const thead = document.createElement('thead');
	const trHead = document.createElement('tr');
	const thName = document.createElement('th');
	thName.textContent = title.replace("Top ", ""); // "Region", "Constellation", "System"
	const thKills = document.createElement('th');
	thKills.textContent = "Kills";
	thKills.style.textAlign = "right";
	trHead.appendChild(thName);
	trHead.appendChild(thKills);
	thead.appendChild(trHead);
	table.appendChild(thead);
	// Add table body
	const tbody = document.createElement('tbody');
	// List of data wrapped
	const list = document.createElement('ul');
	if (!Array.isArray(items) || items.length === 0) {
		const tr = document.createElement('tr');
		const td = document.createElement('td');
		td.colSpan = 2;
		td.textContent = "No data";
		tr.appendChild(td);
		tbody.appendChild(tr);
	} else {
		items.forEach(item => {
			let value = item[valueKey];
			// Get names
			const name = item[nameKey] || item.region_name || item.constellation_name || item.system_name || 'Unknown';
			// Put together items
			const tr = document.createElement('tr');
			const tdName = document.createElement('td');
			tdName.textContent = name;
			const tdKills = document.createElement('td');
			tdKills.textContent = value;
			tdKills.style.textAlign = "right";
			tr.appendChild(tdName);
			tr.appendChild(tdKills);
			tbody.appendChild(tr);
		});
	}
	// Put everything together
	table.appendChild(tbody);
	wrap.appendChild(table);
	return wrap;
}
