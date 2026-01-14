// Imports
import {fetchRegionSummary} from '../api_wrapper/wrapper.js';
//import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/auto/auto.mjs';// Content Delivery for Chart.js
import * as uiCHART from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/auto/+esm';
//const CHART_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';

// Exports
export async function renderRegionKillsGraph(container, regionId) {
    if (!container) {
        console.error("Container element not found!");    
        return;
    }
    // Clear previous graph on load
    container.innerHTML = '';
    // Loading screen
    //const loading = document.createElement('div');
    //loading.textContent = 'Loading graph!';
    //container.appendChild(loading);
    
    // Create Canvas
    //container.innerHTML = '';
    const canvas = document.createElement('canvas');
    // const canvas = document.createElement('canvas');
	// const ctx = canvas.getContext('2d');
    canvas.id = 'myChart';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    //container.innerHTML = 'myChart';
    //const ctx = document.getElementById('myChart');
    // Chart configuration
    const chartConfiguration = {
        type: 'bar',
        data: {
            labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
            datasets: [{
                label: `Region ${regionId} Kills`, // Dynamic label
                data: [12, 19, 3, 5, 2, 3], // Replace this with regionData later
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    };
    // Render Chart
    new uiCHART.Chart(ctx, chartConfiguration);
    
}