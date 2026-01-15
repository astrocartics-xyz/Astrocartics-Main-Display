// Imports
import {fetchTopRegions} from '../api_wrapper/wrapper.js';
// Must populate top regions footer and listen for click event
export async function setupFooter() {
	// Listing external link
	const listEl = document.getElementById('top-regions-list');
	const loadingEl = document.getElementById('top-regions-loading');
	// Check it exists
	if (!listEl) {
		return;
	}
	// Ensure the container has ticker class (styling applied in CSS)
	listEl.classList.add('footer-ticker');
	// Clear previous dynamic items but keep any existing .ticker-content if present
	let content = listEl.querySelector('.ticker-content');
	if (content) {
		// remove any previously added region items but keep label
		const label = content.querySelector('.top-region-label');
		content.innerHTML = '';
		if (label) content.appendChild(label);
	} else {
		// create content container
		content = document.createElement('div');
		content.className = 'ticker-content';
		// If there's an existing label elsewhere inside listEl, move it in
		const existingLabel = listEl.querySelector('.top-region-label');
		content.appendChild(existingLabel);
		listEl.appendChild(content);
	}
	// Ensure padding-left so content starts off-screen
	content.style.paddingLeft = '100%';
	content.setAttribute('aria-live', 'polite');
	// Try to fetch top regions from wrapper
	try {
		const regions = await fetchTopRegions(); // defaults to hour
		// Remove loading toggle
		if (loadingEl) {
			loadingEl.remove();
		}
		// Check for returns
		if (!regions || regions.length === 0) {
			const none = document.createElement('span');
			none.textContent = 'No top regions available';
			none.className = 'top-region-none';
			none.style.opacity = '0.8';
			content.appendChild(none);
			return;
		}
		// Build items (append after the existing label)
		const maxShow = 10;
		regions.slice(0, maxShow).forEach(region => {
			const name = region.region_name ?? region.name ?? String(region.region_id ?? '');
			const item = document.createElement('span');
			item.className = 'top-region-item';
			item.setAttribute('role', 'button');
			item.tabIndex = 0;
			item.textContent = name;
			// Click handler
			item.addEventListener('click', () => {
				// visual: mark selected
				const all = listEl.querySelectorAll('.top-region-item');
				all.forEach(a => a.classList.remove('selected'));
				item.classList.add('selected');
				// Dispatch events
				window.dispatchEvent(new CustomEvent('regionClick', {detail: {region_name: name}}));
				window.dispatchEvent(new CustomEvent('uiSearch', {detail: {term: name}}));
			});
			// Keyboard
			item.addEventListener('keydown', (ev) => {
				if (ev.key === 'Enter' || ev.key === ' ') {
					ev.preventDefault();
					item.click();
				}
			});
			content.appendChild(item);
		});
		// Compute animation duration
		requestAnimationFrame(() => {
			try {
				const tickerWidth = listEl.clientWidth || window.innerWidth || 800;
				const contentWidth = content.scrollWidth || 0;
				const distancePx = tickerWidth + contentWidth;
				const speedPxPerSec = 120; // tweak
				const durationSec = Math.max(6, distancePx / speedPxPerSec);
				content.style.setProperty('--ticker-duration', `${durationSec}s`);
			} catch (e) {
				console.warn('Failed to compute ticker duration', e);
			}
		});
	} catch (err) {
		console.warn('Failed to load top regions', err);
		if (loadingEl) loadingEl.textContent = 'Failed to load';
	}
}
