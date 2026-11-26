// Week 2: Dynamic Weather Rendering, Unit Conversion & Form Validation

const sampleWeather = {
  current: {
    city: "Greater Noida, IN",
    tempC: 24,
    condition: "sunny",
    description: "Clear & Sunny",
    humidity: 45,
    windKmh: 12,
  },
  daily: [
    { date: "2026-11-26", condition: "sunny", maxC: 25, minC: 13 },
    { date: "2026-11-27", condition: "partly-cloudy", maxC: 24, minC: 12 },
    { date: "2026-11-28", condition: "sunny", maxC: 26, minC: 14 },
    { date: "2026-11-29", condition: "partly-cloudy", maxC: 25, minC: 13 },
    { date: "2026-11-30", condition: "cloudy", maxC: 22, minC: 12 },
    { date: "2026-12-01", condition: "rain", maxC: 20, minC: 11 },
    { date: "2026-12-02", condition: "sunny", maxC: 23, minC: 12 },
  ],
};

// State variable: always keep base data in Celsius and convert on render
let currentUnit = "C";

// Helper: Convert Celsius to rounded Fahrenheit
function toFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

// Helper: Format temperature according to active unit
function formatTemp(tempC) {
  return currentUnit === "C" ? `${Math.round(tempC)}°C` : `${toFahrenheit(tempC)}°F`;
}

// Helper: Return weather emoji from condition key
function getWeatherEmoji(condition) {
  const map = {
    sunny: "☀️",
    "partly-cloudy": "⛅",
    cloudy: "☁️",
    rain: "🌧️",
  };
  return map[condition] || "🌤️";
}

// Stretch Goal: Update page background based on current condition
function applyConditionTheme(condition) {
  document.body.classList.remove("theme-sunny", "theme-cloudy", "theme-rain");
  if (condition === "sunny") {
    document.body.classList.add("theme-sunny");
  } else if (condition === "cloudy" || condition === "partly-cloudy") {
    document.body.classList.add("theme-cloudy");
  } else if (condition === "rain") {
    document.body.classList.add("theme-rain");
  }
}

// Render Current Weather Card
function renderCurrent(data) {
  document.getElementById("current-city").textContent = data.city;
  document.getElementById("current-condition").textContent = data.description;
  document.getElementById("current-icon").textContent = getWeatherEmoji(data.condition);
  document.getElementById("current-temp").textContent = formatTemp(data.tempC);
  document.getElementById("current-humidity").textContent = `${data.humidity}%`;
  document.getElementById("current-wind").textContent = `${data.windKmh} km/h`;

  applyConditionTheme(data.condition);
}

// Render 7-Day Forecast Cards via Template Literals
function renderForecast(days) {
  const forecastRow = document.getElementById("forecast-row");

  forecastRow.innerHTML = days
    .map((day) => {
      const weekday = new Date(day.date).toLocaleDateString("en-IN", { weekday: "short" });
      const maxDisplay = currentUnit === "C" ? `${Math.round(day.maxC)}°` : `${toFahrenheit(day.maxC)}°`;
      const minDisplay = currentUnit === "C" ? `${Math.round(day.minC)}°` : `${toFahrenheit(day.minC)}°`;

      return `
        <article class="forecast-card">
          <h3 class="forecast-day">${weekday}</h3>
          <div class="forecast-icon" role="img" aria-label="${day.condition}">${getWeatherEmoji(day.condition)}</div>
          <p class="forecast-temps">
            <span class="max-temp">${maxDisplay}</span> / <span class="min-temp">${minDisplay}</span>
          </p>
        </article>
      `;
    })
    .join("");
}

// Re-render entire dashboard
function renderDashboard() {
  renderCurrent(sampleWeather.current);
  renderForecast(sampleWeather.daily);
}

// Event 1: Unit Toggle Button (°C <-> °F)
const unitToggleBtn = document.getElementById("unit-toggle");
unitToggleBtn.addEventListener("click", () => {
  currentUnit = currentUnit === "C" ? "F" : "C";
  unitToggleBtn.textContent = currentUnit === "C" ? "Switch to °F" : "Switch to °C";
  renderDashboard();
});

// Event 2: Search Form Submit with Empty Input Validation
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchMessage = document.getElementById("search-message");

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = cityInput.value.trim();

  if (!query) {
    searchMessage.textContent = "Please enter a city name before searching.";
    searchMessage.className = "search-message error";
    return;
  }

  // Update displayed city name (live API data will be connected in Week 3)
  sampleWeather.current.city = query;
  renderCurrent(sampleWeather.current);

  searchMessage.textContent = `Showing sample forecast for "${query}" (Live API integration coming in Week 3).`;
  searchMessage.className = "search-message info";
  cityInput.value = "";
});

// Initial Render on Page Load
unitToggleBtn.textContent = "Switch to °F";
renderDashboard();
