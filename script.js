let weatherData = null;
let currentUnit = "C";

// DOM Elements
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const geoBtn = document.getElementById("geo-btn");
const unitToggleBtn = document.getElementById("unit-toggle");
const searchMessage = document.getElementById("search-message");

function toFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

function formatTemp(tempC) {
  return currentUnit === "C" ? `${Math.round(tempC)}°C` : `${toFahrenheit(tempC)}°F`;
}

function getWeatherInfo(code) {
  if (code === 0) return { emoji: "☀️", label: "Clear Sky", theme: "sunny" };
  if (code === 1 || code === 2) return { emoji: "⛅", label: "Partly Cloudy", theme: "sunny" };
  if (code === 3) return { emoji: "☁️", label: "Overcast", theme: "cloudy" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Foggy", theme: "cloudy" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { emoji: "🌧️", label: "Rain / Showers", theme: "rain" };
  }
  if ((code >= 71 && code <= 77) || (code === 85 || code === 86)) {
    return { emoji: "❄️", label: "Snow", theme: "cloudy" };
  }
  if (code >= 95 && code <= 99) {
    return { emoji: "⛈️", label: "Thunderstorm", theme: "rain" };
  }
  return { emoji: "🌤️", label: "Mild Weather", theme: "sunny" };
}

function setBanner(text, type = "") {
  searchMessage.textContent = text;
  searchMessage.className = type ? `search-message ${type}` : "search-message";
}

// 1. Get Coordinates from City Name (Open-Meteo Geocoding API)
async function getCoordinates(city) {
  const url = `https://open-meteo.com{encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geocoding error: ${response.status}`);
  return await response.json();
}

// 2. Get Current & 7-Day Forecast Data (Open-Meteo Forecast API)
async function getWeather(lat, lon) {
  const url = `https://open-meteo.com{lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Forecast error: ${response.status}`);
  return await response.json();
}

// 3. Format Data
function formatWeatherData(cityLabel, apiData) {
  const currentInfo = getWeatherInfo(apiData.current.weather_code);

  const forecast = apiData.daily.time.map((dateStr, index) => {
    const dateObj = new Date(dateStr + "T00:00:00");
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
    const dayInfo = getWeatherInfo(apiData.daily.weather_code[index]);

    return {
      day: dayName,
      emoji: dayInfo.emoji,
      highC: apiData.daily.temperature_2m_max[index],
      lowC: apiData.daily.temperature_2m_min[index],
    };
  });

  return {
    city: cityLabel,
    tempC: apiData.current.temperature_2m,
    humidity: apiData.current.relative_humidity_2m,
    windKmh: apiData.current.wind_speed_10m,
    condition: currentInfo.label,
    emoji: currentInfo.emoji,
    theme: currentInfo.theme,
    forecast: forecast,
  };
}

// 4. Render Dashboard
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

// 5. Search by City Name
async function handleCitySearch(city) {
  setBanner("Loading...", "loading");
  searchBtn.disabled = true;
  geoBtn.disabled = true;

  try {
    const geoData = await getCoordinates(city);

    if (!geoData.results || geoData.results.length === 0) {
      setBanner("City not found. Please check the spelling and try again.", "error");
      return;
    }

    const firstPlace = geoData.results.at(0);
    const rawWeather = await getWeather(firstPlace.latitude, firstPlace.longitude);

    const cityLabel = `${firstPlace.name}, ${firstPlace.country}`;
    weatherData = formatWeatherData(cityLabel, rawWeather);

    setBanner("");
    renderWeather(weatherData);
  } catch (error) {
    console.error("Fetch failed:", error);
    setBanner("Error: " + error.message, "error");
  } finally {
    searchBtn.disabled = false;
    geoBtn.disabled = false;
  }
}

// 6. IP-Based Location Fallback (Works even when browser GPS is blocked)
async function detectLocationByIP() {
  try {
    setBanner("Detecting location via IP...", "loading");
    const res = await fetch("https://ipwho.is");
    const ipData = await res.json();

    if (!ipData.success) {
      throw new Error("IP location unavailable");
    }

    const rawWeather = await getWeather(ipData.latitude, ipData.longitude);
    const label = `${ipData.city}, ${ipData.country}`;
    weatherData = formatWeatherData(label, rawWeather);

    setBanner("");
    renderWeather(weatherData);
  } catch (error) {
    console.error("IP location failed:", error);
    setBanner("Could not auto-detect location. Please type your city above.", "error");
  } finally {
    searchBtn.disabled = false;
    geoBtn.disabled = false;
  }
}

// 7. Device Location Handler (Tries GPS first, automatically falls back to IP)
function handleGeolocation() {
  searchBtn.disabled = true;
  geoBtn.disabled = true;

  if (!navigator.geolocation) {
    detectLocationByIP();
    return;
  }

  setBanner("Detecting your location...", "loading");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const rawWeather = await getWeather(latitude, longitude);
        weatherData = formatWeatherData("My Current Location", rawWeather);
        setBanner("");
        renderWeather(weatherData);
      } catch (error) {
        detectLocationByIP();
      } finally {
        searchBtn.disabled = false;
        geoBtn.disabled = false;
      }
    },
    () => {
      // Automatically use IP location if GPS permission is denied or blocked
      detectLocationByIP();
    },
    { timeout: 5000 }
  );
}

// 8. Event Listeners
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) {
    handleCitySearch(city);
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

// Load Pune on startup
handleCitySearch("Pune");
