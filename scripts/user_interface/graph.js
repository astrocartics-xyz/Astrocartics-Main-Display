// Imports
import {fetchRegionSummary} from '../api_wrapper/wrapper.js';
import * as uiCHART from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/auto/+esm';

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
    const canvas = document.createElement('canvas');
    canvas.id = 'myChart';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    // Fetch Data
    let regionData;
    let latestData;
    try {
        regionData = await fetchRegionSummary(regionId);
        latestData = await getGraphData(regionData);
    } catch (error) {
        console.error("Erorr fetchin region data:", error);
    }
 
    // Chart configuration
    const options = {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        autoskip: true,
                        maxTicksLimit: 8,
                        minRotation: 45,
                        maxRotation: 45
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    const config = {
        type: 'line',
        data: latestData,
        options: options,
    }
    
    // Render Chart
    new uiCHART.Chart(ctx, config);
}
// Helper functions
async function getGraphData(regionData) {
    // Variables
    let labels = [];
    //let dataPoints = [];

    // Process data
    if (regionData.buckets.length > 0 && Array.isArray(regionData.buckets)) {
        console.log("We made it to buckets");
        const buckets = regionData.buckets.slice(1,15);
        
        const dataKills = buckets.map(currentBucket => currentBucket.count).reverse();
        const dataTime = buckets.map(currentBucket => currentBucket.period).reverse();
        const data = {
        labels: dataTime,
        datasets: [{
            label: 'Kills over Time',
            data:dataKills,
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    };

    return data;
    
    }
}