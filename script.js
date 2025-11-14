// Make monitoringPoints accessible globally in this file
const monitoringPoints = [
  {
    location: "North Station",
    coordinates: [12.9978, 80.2438],
    rainfallIndex: 32,
    windSpeed: 18,
    altitude: 210,
    floodRisk: "Medium",
    seismicActivity: "0.3",
    cloudIndex: 60,
    dangerLevel: 35
  },
  {
    location: "East Station",
    coordinates: [12.9908, 80.2437],
    rainfallIndex: 80,
    windSpeed: 40,
    altitude: 120,
    floodRisk: "High",
    seismicActivity: "0.7",
    cloudIndex: 90,
    dangerLevel: 85
  },
  {
    location: "South Station",
    coordinates: [12.9838, 80.2337],
    rainfallIndex: 12,
    windSpeed: 8,
    altitude: 300,
    floodRisk: "Low",
    seismicActivity: "0.1",
    cloudIndex: 30,
    dangerLevel: 10
  }
];

document.addEventListener("DOMContentLoaded", () => {
  // --- LEAFLET MAP INITIALIZATION ---
  let map;
  if (window.L && document.getElementById('map')) {
    map = L.map('map').setView([12.9908, 80.2337], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Add initial markers for the default points
    monitoringPoints.forEach(point => {
      if (point.coordinates) {
        L.marker(point.coordinates).addTo(map)
          .bindPopup(`<b>${point.location}</b><br>
            Rainfall: ${point.rainfallIndex} mm/h<br>
            Wind: ${point.windSpeed} km/h<br>
            Risk: ${point.floodRisk}`)
          .on('click', () => updateMetricsPanel(point)); // Add click handler
      }
    });

    // Allow user to add new monitoring points
    map.on('click', function(e) {
      const lat = e.latlng.lat.toFixed(5);
      const lng = e.latlng.lng.toFixed(5);
      const newPoint = {
        location: `New Point ${monitoringPoints.length + 1}`,
        coordinates: [lat, lng],
        rainfallIndex: Math.floor(Math.random() * 100),
        windSpeed: Math.floor(Math.random() * 50),
        altitude: Math.floor(Math.random() * 500),
        floodRisk: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
        seismicActivity: (Math.random() * 1.5).toFixed(2),
        cloudIndex: Math.floor(Math.random() * 100),
        dangerLevel: Math.floor(Math.random() * 100)
      };

      const marker = L.marker([lat, lng]).addTo(map)
        .bindPopup(`<b>${newPoint.location}</b><br>
          Rainfall: ${newPoint.rainfallIndex} mm/h<br>
          Wind: ${newPoint.windSpeed} km/h<br>
          Risk: ${newPoint.floodRisk}`).openPopup();
      
      marker.on('click', () => updateMetricsPanel(newPoint)); // Add click handler

      monitoringPoints.push(newPoint);
      updateMonitoringTable(monitoringPoints);
      updateMetricsPanel(newPoint);
    });
  }
  // --- END LEAFLET MAP INITIALIZATION ---

  // helper: create alert DOM element from alert object
  function createAlertElement(alert) {
    const div = document.createElement("div");
    // ensure priority class exists: 'high', 'medium', 'low' expected
    const p = (alert.priority || '').toLowerCase();
    div.className = `alert-message ${p}-priority`;
    // include type if present, otherwise fallback to capitalized priority
    const type = alert.type || (p ? p.charAt(0).toUpperCase() + p.slice(1) + " Alert" : "Alert");
    div.innerHTML = `<strong>${type}</strong>: ${alert.message || ''}`;
    return div;
  }

  // helper: render list of alerts; shows placeholder only when empty
  function renderAlerts(alerts) {
    const container = document.getElementById("alerts");
    if (!container) return;
    container.innerHTML = ''; // clear existing
    if (!alerts || alerts.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.className = 'placeholder';
      placeholder.textContent = "No active alerts. Messages will appear here when sent.";
      container.appendChild(placeholder);
      return;
    }
    alerts.forEach(alert => {
      container.appendChild(createAlertElement(alert));
    });
  }

  // fetch alerts and render (initial load)
  fetch("/alerts")
    .then(res => res.json())
    .then(data => {
      renderAlerts(Array.isArray(data) ? data : []);
    })
    .catch(err => {
      console.error("Failed to load alerts:", err);
      renderAlerts([]);
    });

  const form = document.getElementById("messageForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = document.getElementById("messageInput").value;
    const priority = document.getElementById("priority").value;

    try {
      await fetch("/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, priority })
      });

      // create a local alert object and append to UI immediately
      const newAlert = {
        type: priority ? (priority.charAt(0).toUpperCase() + priority.slice(1) + " Alert") : "Alert",
        message,
        priority: (priority || 'low').toLowerCase()
      };

      // append new alert to top of container and remove placeholder if present
      const container = document.getElementById("alerts");
      if (container) {
        // remove placeholder if present
        const ph = container.querySelector('.placeholder');
        if (ph) ph.remove();
        // insert the new alert at the top
        container.insertBefore(createAlertElement(newAlert), container.firstChild);
      }

      alert("Message sent with priority: " + priority);
      form.reset();
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message. See console for details.");
    }
  });

  // Monitoring points table logic
  function updateMetricsPanel(point) {
    if (!point) return;
    // Show which monitoring point is being displayed
    let label = document.getElementById('current-metric-point');
    if (!label) {
      label = document.createElement('div');
      label.id = 'current-metric-point';
      label.className = 'current-metric-point-label'; // Add class for styling
      // Insert above the metrics panel
      const metricsPanel = document.querySelector('.metrics-panel');
      if (metricsPanel) metricsPanel.insertBefore(label, metricsPanel.firstChild);
    }
    label.textContent = `Showing data for: ${point.location}`;

    document.getElementById('rainfall-index').textContent = point.rainfallIndex + " mm/h";
    document.getElementById('wind-speed').textContent = point.windSpeed + " km/h";
    document.getElementById('altitude').textContent = point.altitude + " m";
    document.getElementById('flood-risk').textContent = point.floodRisk;
    document.getElementById('seismic-activity').textContent = point.seismicActivity;
    document.getElementById('cloud-index').textContent = point.cloudIndex + "%";
    // Danger meter
    const danger = point.dangerLevel;
    document.querySelector('#danger-meter .meter-fill').style.width = danger + "%";
    let desc = "Low risk";
    if (danger >= 70) desc = "High risk! Immediate action required.";
    else if (danger >= 30) desc = "Moderate risk. Stay alert.";
    document.getElementById('danger-description').textContent = desc;
  }

  function updateMonitoringTable(points) {
    const tbody = document.getElementById('monitoringData');
    if (!tbody) {
      alert("tbody#monitoringData not found in DOM!");
      return;
    }
    tbody.innerHTML = '';
    points.forEach(point => {
      const row = document.createElement('tr');
      row.style.cursor = 'pointer'; // Show it's clickable
      row.onclick = () => updateMetricsPanel(point); // Add click handler
      row.innerHTML = `
        <td>${point.location}</td>
        <td>${point.rainfallIndex} mm/h</td>
        <td>${point.windSpeed} km/h</td>
        <td>${point.altitude} m</td>
        <td>${point.floodRisk}</td>
        <td>${point.seismicActivity}</td>
        <td>${point.cloudIndex}%</td>
        <td>
          <div class="danger-level-cell">
            <span class="danger-indicator danger-${getDangerClass(point.dangerLevel)}"></span>
            ${point.dangerLevel}%
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  function getDangerClass(level) {
    if (level < 30) return 'low';
    if (level < 70) return 'medium';
    return 'high';
  }

  updateMonitoringTable(monitoringPoints);
  if (monitoringPoints.length > 0) updateMetricsPanel(monitoringPoints[monitoringPoints.length - 1]); // On page load, show metrics for the last point by default

  // Toggle table visibility
  const toggleBtn = document.getElementById('toggleTable');
  const tableContainer = document.getElementById('monitoringTable');
  // Remove any inline display style so CSS controls initial state
  if (tableContainer) tableContainer.style.display = ''; 
  if (toggleBtn && tableContainer) {
    toggleBtn.addEventListener('click', function() {
      const isHidden = tableContainer.style.display === 'none' || getComputedStyle(tableContainer).display === 'none';
      if (isHidden) {
        tableContainer.style.display = 'block';
        toggleBtn.innerHTML = '<span class="icon">📊</span> Hide Monitoring Points Data';
      } else {
        tableContainer.style.display = 'none';
        toggleBtn.innerHTML = '<span class="icon">📊</span> Show Monitoring Points Data';
      }
    });
  }
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetPage = link.dataset.page;
    
    // Update active states
    document.querySelectorAll('.nav-link').forEach(l => 
      l.classList.toggle('active', l === link)
    );
    
    // Show/hide pages
    document.querySelectorAll('section.page').forEach(page => 
      page.classList.toggle('active', page.id === targetPage)
    );
  });
});