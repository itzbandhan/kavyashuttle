let routesData = {};
const searchInput = document.getElementById("searchInput");
const suggestionsBox = document.getElementById("suggestions");
const errorBox = document.getElementById("error");
const findBtn = document.getElementById("findBtn");

fetch("index.json")
  .then(res => res.json())
  .then(data => {
    routesData = data;
  })
  .catch(() => {
    showError("Failed to load route data.");
  });

function getScore(query, text) {
  if (text === query) return 6;
  if (text.startsWith(query)) return 4;
  if (text.includes(query)) return 2;
  return 0;
}

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();
  suggestionsBox.innerHTML = "";
  errorBox.classList.add("hidden");

  if (!query) {
    suggestionsBox.classList.add("hidden");
    return;
  }

  let results = [];

  Object.entries(routesData).forEach(([routeId, route]) => {
    route.pickup_locations.forEach(loc => {
      const name = loc.name.toLowerCase();
      const score = getScore(query, name);

      if (score > 0) {
        results.push({
          routeId,
          routeName: route.route_name,
          location: loc.name,
          score: score + query.length / name.length
        });
      }
    });
  });

  if (!results.length) {
    suggestionsBox.classList.add("hidden");
    return;
  }

  results.sort((a, b) => b.score - a.score);

  const unique = [];
  const seen = new Set();

  for (let r of results) {
    if (!seen.has(r.routeId)) {
      unique.push(r);
      seen.add(r.routeId);
    }
    if (unique.length === 4) break;
  }

  unique.forEach(r => {
    const div = document.createElement("div");
    div.className =
      "px-4 py-3 cursor-pointer hover:bg-blue-50 transition";

    div.innerHTML = `
      <div class="font-medium text-slate-800">${r.location}</div>
      <div class="text-xs text-slate-500">
        Route-${r.routeId} • ${r.routeName}
      </div>
    `;

    div.onclick = () => {
      window.location.href = `route.html?id=${r.routeId}`;
    };

    suggestionsBox.appendChild(div);
  });

  suggestionsBox.classList.remove("hidden");
});

findBtn.onclick = () => {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    showError("Please type your nearest location.");
    return;
  }

  let bestMatch = null;
  let bestScore = 0;

  Object.entries(routesData).forEach(([routeId, route]) => {
    route.pickup_locations.forEach(loc => {
      const name = loc.name.toLowerCase();
      const score = getScore(query, name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = routeId;
      }
    });
  });

  if (!bestMatch) {
    showError("No matching route found.");
    return;
  }

  window.location.href = `route.html?id=${bestMatch}`;
};

const locationBtn = document.getElementById("locationBtn");

if (locationBtn) {
  locationBtn.onclick = () => {
    errorBox.classList.add("hidden");

    if (!navigator.geolocation) {
      showError("Geolocation not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      let closest = { dist: Infinity, routeId: null };

      Object.entries(routesData).forEach(([routeId, route]) => {
        route.pickup_locations.forEach(loc => {
          const d = haversine(
            latitude,
            longitude,
            parseFloat(loc.latitude),
            parseFloat(loc.longitude)
          );

          if (d < closest.dist) {
            closest = { dist: d, routeId };
          }
        });
      });

      if (closest.dist > 5 || !closest.routeId) {
        showError(
          "No route found nearby. Please contact student services."
        );
        return;
      }

      window.location.href = `route.html?id=${closest.routeId}`;
    });
  };
}

function showError(msg) {
  errorBox.innerText = msg;
  errorBox.classList.remove("hidden");
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
  