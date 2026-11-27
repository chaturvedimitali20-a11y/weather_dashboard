let weatherData = null;
let currentUnit = "C";

// DOM Elements
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const geoBtn = document.getElementById("geo-btn");
const unitToggleBtn = document.getElementById("unit-toggle");
const searchMessage = document.getElementById("search-message");

// Helper: Convert Celsius to rounded Fahrenheit
function toFahrenheit(celsius) {
  return Math.round((Number(celsius) * 9) / 5 + 32);
}

// Helper: Format temperature according to active unit
function formatTemp(tempC) {
  return currentUnit === "C" ? `${Math.round(Number(tempC))}°C` : `${toFahrenheit(tempC)}°F`;
}

// Helper: Map weather description text to emoji and theme
function getWeatherInfo(desc) {
  const text = desc.toLowerCase();
  if (text.includes("thunder") || text.includes("storm")) {
    return { emoji: "⛈️", theme: "rain" };
  }
  if (text.includes("rain") || text.includes("drizzle") || text.includes("shower")) {
    return { emoji: "🌧️", theme: "rain" };
  }
  if (text.includes("snow") || text.includes("sleet") || text.includes("blizzard")) {
    return { emoji: "❄️", theme: "cloudy" };
  }
  if (text.includes("fog") || text.includes("mist") || text.includes("haze")) {
    return { emoji: "🌫️", theme: "cloudy" };
  }
  if (text.includes("overcast") || text.includes("cloud")) {
    return { emoji: "☁️", theme: "cloudy" };
  }
  if (text.includes("partly")) {
    return { emoji: "⛅", theme: "sunny" };
  }
  return { emoji: "☀️", theme: "sunny" };
}

// Helper to show/hide feedback banner
function setBanner(text, type = "") {
  searchMessage.textContent = text;
  searchMessage.className = type ? `search-message ${type}` : "search-message";
}

// 1. Fetch Weather Directly by City Name or "lat,lon"
async function fetchWeatherByQuery(query, customLabel = null) {
  setBanner("Loading weather...", "loading");
  searchBtn.disabled = true;
  geoBtn.disabled = true;

  try {
    const url = `https://wttr.in{encodeURIComponent(query)}?format=j1`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.current_condition || !data.current_condition[0]) {
      throw new Error("Location not found");
    }

    const current = data.current_condition[0];
    const area = data.nearest_area?.[0];
    const cityName = area?.areaName?.[0]?.value || query;
    const countryName = area?.country?.[0]?.value || "";
    const label = customLabel || (countryName ? `${cityName}, ${countryName}` : cityName);

    const conditionText = current.weatherDesc?.[0]?.value || "Clear";
    const currentInfo = getWeatherInfo(conditionText);

    // wttr.in returns 3 days in free JSON; map available days cleanly
    const forecast = (data.weather || []).map((dayItem) => {
      const dateObj = new Date(dayItem.date + "T00:00:00");
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const midDesc = dayItem.hourly?.[4]?.weatherDesc?.[0]?.value || conditionText;
      const dayInfo = getWeatherInfo(midDesc);

      return {
        day: dayName,
        emoji: dayInfo.emoji,
        highC: dayItem.maxtempC,
        lowC: dayItem.mintempC,
      };
    });

    weatherData = {
      city: label,
      tempC: current.temp_C,
      humidity: current.humidity,
      windKmh: current.windspeedKmph,
      condition: conditionText,
      emoji: currentInfo.emoji,
      theme: currentInfo.theme,
      forecast: forecast,
    };

    setBanner("");
    renderWeather(weatherData);
  } catch (error) {
    console.error("Weather fetch error:", error);
    setBanner("Could not find that city or connect to the weather service.", "error");
  } finally {
    searchBtn.disabled = false;
    geoBtn.disabled = false;
  }
}

// 2. Render Weather to DOM
function renderWeather(data) {
  document.body.className = `theme-${data.theme}`;

  document.getElementById("current-city").textContent = data.city;
  document.getElementById("current-condition").textContent = data.condition;
  document.getElementById("current-icon").textContent = data.emoji;
  document.getElementById("current-temp").textContent = formatTemp(data.tempC);
  document.getElementById("current-humidity").textContent = `${data.humidity}%`;
  document.getElementById("current-wind").textContent = `${data.windKmh} km/h`;

  const forecastRow = document.getElementById("forecast-row");
  forecastRow.innerHTML = data.forecast
    .map(
      (item) => `
      <div class="forecast-card">
        <span class="forecast-day">${item.day}</span>
        <span class="forecast-icon">${item.emoji}</span>
        <div class="forecast-temps">
          <span>${formatTemp(item.highC)}</span>
          <span class="min-temp">/ ${formatTemp(item.lowC)}</span>
        </div>
      </div>
    `
    )
    .join("");
}

// 3. IP-Based Fallback Location Detection (Works even when GPS is blocked)
async function detectLocationByIP() {
  try {
    setBanner("Detecting location via network...", "loading");
    const res = await fetch("https://ipapi.co");
    if (!res.ok) throw new Error("IP lookup failed");
    const ipData = await res.json();

    if (ipData.city) {
      const label = ipData.country_name ? `${ipData.city}, ${ipData.country_name}` : ipData.city;
      await fetchWeatherByQuery(ipData.city, label);
    } else {
      throw new Error("City not detected");
    }
  } catch (err) {
    console.error("IP location error:", err);
    setBanner("Unable to detect location automatically. Please type your city above.", "error");
    searchBtn.disabled = false;
    geoBtn.disabled = false;
  }
}

// 4. Device Location Handler (Tries GPS first, falls back to IP location)
function handleGeolocation() {
  searchBtn.disabled = true;
  geoBtn.disabled = true;

  if (!navigator.geolocation) {
    detectLocationByIP();
    return;
  }

  setBanner("Detecting your location...", "loading");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      fetchWeatherByQuery(`${latitude},${longitude}`);
    },
    () => {
      // If browser/OS blocks GPS permission, automatically use IP-based location
      detectLocationByIP();
    },
    { timeout: 6000 }
  );
}

// 5. Event Listeners
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) {
    fetchWeatherByQuery(city);
  } else {
    setBanner("Please enter a city name.", "error");
  }
});

geoBtn.addEventListener("click", handleGeolocation);

unitToggleBtn.addEventListener("click", () => {
  currentUnit = currentUnit === "C" ? "F" : "C";
  unitToggleBtn.textContent = currentUnit === "C" ? "Switch to °F" : "Switch to °C";

  if (weatherData) {
    renderWeather(weatherData);
  }
});

// Load Pune by default on startup
fetchWeatherByQuery("Pune");
