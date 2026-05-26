// Eco-Prompt: Carbon-Aware AI Sandbox
// Core Application Logic

// Model Database
// Estimated energy consumption per 1000 tokens (in kWh)
// Source references: standard LLM power measurements (e.g., Llama-3, GPT-4, hardware profiling)
const MODELS = {
  'eco-router': {
    name: 'Green Eco-Router (Dynamic)',
    provider: 'Eco-Prompt Sandbox',
    size: 'Auto',
    kwhPer1k: 0.0015,
    waterPer1k: 1.5,
    ewastePer1k: 0.015,
    slogan: 'Dynamic model selection based on prompt load & grid emissions.',
    color: '#10b981' // green
  },
  'gpt-4-opus': {
    name: 'Claude 3 Opus / GPT-4 (Super Heavy)',
    provider: 'Anthropic / Microsoft',
    size: 'Extra Large',
    kwhPer1k: 0.012, // 12 Wh per 1k tokens (Highly dense MoE model)
    waterPer1k: 12.0, // ml of water consumed for cooling per 1k tokens
    ewastePer1k: 0.15, // mg of GPU hardware depletion per 1k tokens
    slogan: 'Max capability, massive compute footprint.',
    color: '#ef4444' // red
  },
  'gpt-4o-sonnet': {
    name: 'GPT-4o / Claude 3.5 Sonnet (Balanced Heavy)',
    provider: 'Microsoft / Anthropic',
    size: 'Large',
    kwhPer1k: 0.004, // 4 Wh per 1k tokens (Highly optimized frontier model)
    waterPer1k: 4.0,
    ewastePer1k: 0.05,
    slogan: 'Frontier reasoning, balanced carbon profile.',
    color: '#f97316' // orange
  },
  'gpt-35-llama70': {
    name: 'Llama 3 70B / GPT-3.5 Turbo (Standard)',
    provider: 'Meta / Microsoft',
    size: 'Medium',
    kwhPer1k: 0.0015, // 1.5 Wh per 1k tokens
    waterPer1k: 1.5,
    ewastePer1k: 0.015,
    slogan: 'Standard operations, moderate energy demand.',
    color: '#eab308' // yellow
  },
  'llama3-8b-flash': {
    name: 'Llama 3 8B / Gemini 1.5 Flash (Lightweight)',
    provider: 'Meta / Google',
    size: 'Small',
    kwhPer1k: 0.0003, // 0.3 Wh per 1k tokens (Highly efficient edge/distilled model)
    waterPer1k: 0.3,
    ewastePer1k: 0.003,
    slogan: 'Ultra-fast inference, minimal environmental footprint.',
    color: '#22c55e' // green
  }
};

// Global App State
const state = {
  selectedModel: 'eco-router',
  gridData: null,
  isLive: false,
  carbonIntensity: 120, // default moderate
  generationMix: [],
  hourlyForecast: [],
  inputTokens: 0,
  outputTokens: 0,
  isAuditing: false,
  sessionSavingsCo2: 0, // Track total carbon saved during this playground session
  auditHistory: [], // Track rolling list of queries audited this session
  score: 0,
  streak: 0,
  activeQuizQuestion: 0,
  challenges: {
    flashDiet: 0,
    peakShifter: 0,
    ecoRouter: 0
  }
};

let isGridUpdateInFlight = false;

// API Endpoints for UK National Grid ESO
const API_INTENSITY = 'https://api.carbonintensity.org.uk/intensity';
const API_GENERATION = 'https://api.carbonintensity.org.uk/generation';
const API_FORECAST = 'https://api.carbonintensity.org.uk/intensity/date';

// -------------------------------------------------------------
// Carbon Math & Estimations
// -------------------------------------------------------------

// Analyze prompt text for complexity based on character length and presence of programming/math keywords
function analyzePromptComplexity(text) {
  if (!text) return { level: 'Low', reason: 'Empty query' };
  
  const len = text.length;
  
  // Programming keyword indicators
  const codePatterns = [
    /\bdef\b/, /\bfunction\b/, /\bclass\b/, /\bconst\b/, /\bimport\b/, 
    /\blet\b/, /\bvar\b/, /\breturn\b/, /\bconsole\.log\b/, /\bprintf?\b/,
    /\bselect\s+.*\s+from\b/i, /<html>/i, /css/i, /[\{\}\[\]\(\)]/
  ];
  
  // Mathematical keyword indicators
  const mathPatterns = [
    /\bsqrt\b/i, /\bintegral\b/i, /\bmatrix\b/i, /\bequation\b/i,
    /\bformula\b/i, /\bderive\b/i, /[\+\-\*\/=]{2,}/
  ];
  
  let hasCode = codePatterns.some(pat => pat.test(text));
  let hasMath = mathPatterns.some(pat => pat.test(text));
  
  if (len > 1000 || hasCode || hasMath) {
    let reason = len > 1000 ? 'Length > 1000 chars' : (hasCode ? 'Code tokens detected' : 'Math tokens detected');
    return { level: 'High', reason };
  } else if (len > 400) {
    return { level: 'Medium', reason: 'Length > 400 chars' };
  } else {
    return { level: 'Low', reason: 'Short conversational text' };
  }
}

// Router logic: Select the optimal model based on prompt intensity and grid intensity
function runEcoRouting(promptText, gridIntensity) {
  const complexity = analyzePromptComplexity(promptText);
  let decisionTrace = [];
  
  decisionTrace.push(`Analyzing prompt complexity...`);
  decisionTrace.push(`Complexity: ${complexity.level} (${complexity.reason})`);
  decisionTrace.push(`Grid Carbon Intensity: ${gridIntensity} gCO₂/kWh`);
  
  // 1. Map complexity to standard base target models
  let baseModelKey;
  if (complexity.level === 'High') {
    // If the grid is extremely clean, route to highest capability model (Opus)
    if (gridIntensity < 75) {
      baseModelKey = 'gpt-4-opus';
      decisionTrace.push(`Clean grid (< 75 gCO₂/kWh) permits upgrading to Opus (XL) tier.`);
    } else {
      baseModelKey = 'gpt-4o-sonnet';
      decisionTrace.push(`Standard high complexity routes to Large tier (Sonnet).`);
    }
  } else if (complexity.level === 'Medium') {
    baseModelKey = 'gpt-35-llama70';
    decisionTrace.push(`Medium complexity routes to Medium tier (Llama 70B).`);
  } else {
    baseModelKey = 'llama3-8b-flash';
    decisionTrace.push(`Low complexity routes to Small tier (Llama 8B / Flash).`);
  }
  
  // 2. Throttling/downgrading logic if grid carbon emissions are high (> 150)
  let routedModelKey = baseModelKey;
  let throttled = false;
  
  if (gridIntensity > 150) {
    throttled = true;
    decisionTrace.push(`Grid carbon emissions exceed 150 gCO₂/kWh. Activating emissions throttle...`);
    if (baseModelKey === 'gpt-4-opus') {
      routedModelKey = 'gpt-4o-sonnet';
      decisionTrace.push(`Downgraded Opus (XL) -> Sonnet (L) to conserve power.`);
    } else if (baseModelKey === 'gpt-4o-sonnet') {
      routedModelKey = 'gpt-35-llama70';
      decisionTrace.push(`Downgraded Sonnet (L) -> Llama 70B (M) to conserve power.`);
    } else if (baseModelKey === 'gpt-35-llama70') {
      routedModelKey = 'llama3-8b-flash';
      decisionTrace.push(`Downgraded Llama 70B (M) -> Flash (S) to conserve power.`);
    } else {
      decisionTrace.push(`Flash (S) is already at the lowest energy tier.`);
    }
  } else {
    decisionTrace.push(`Grid emissions stable. Standard routing active.`);
  }
  
  decisionTrace.push(`Routed Model: ${MODELS[routedModelKey].name}`);
  
  return {
    complexity: complexity.level,
    baseModelKey,
    routedModelKey,
    throttled,
    decisionTrace
  };
}

// Calculate estimated tokens based on text characters
// Standard approximation: 1 token = 4 characters (approx 0.75 words)
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Perform carbon footprints logic
// E = (Tokens / 1000) * Model_kWh_per_1k
// Carbon = E (kWh) * Grid_Intensity (gCO2/kWh)
function calculateCarbonMetrics(inputTxt, outputTxt, modelKey, intensity) {
  let activeKey = modelKey;
  if (modelKey === 'eco-router') {
    const route = runEcoRouting(inputTxt, intensity);
    activeKey = route.routedModelKey;
  }
  
  const model = MODELS[activeKey];
  const inTokens = estimateTokens(inputTxt);
  const outTokens = estimateTokens(outputTxt);
  const totalTokens = inTokens + outTokens;
  
  const energyKwh = (totalTokens / 1000) * model.kwhPer1k;
  const energyWh = energyKwh * 1000;
  const co2Grams = energyKwh * intensity;
  
  const waterMl = (totalTokens / 1000) * model.waterPer1k;
  const ewasteMg = (totalTokens / 1000) * model.ewastePer1k;
  
  // Alternative comparisons for recommendations (filtering out the router itself)
  const alternatives = Object.keys(MODELS)
    .filter(key => key !== 'eco-router')
    .map(key => {
      const altModel = MODELS[key];
      const altEnergyKwh = (totalTokens / 1000) * altModel.kwhPer1k;
      const altCo2Grams = altEnergyKwh * intensity;
      const savingsPercent = ((co2Grams - altCo2Grams) / (co2Grams || 1)) * 100;
      return {
        key,
        name: altModel.name,
        co2: altCo2Grams,
        savingsPercent: savingsPercent
      };
    });
  
  // Energy analogies (referenced to average UK values)
  // LED Light bulb: 10W bulb. 1 hour = 0.01 kWh. In terms of grams of CO2 = 0.01 * intensity.
  // We can also use absolute averages:
  // - LED light bulb (9W) leaves on for 1 hour = ~0.009 kWh
  // - Smart phone charge = ~0.012 kWh (approx 1.8g CO2 at avg intensity)
  // - Water sip = ~15ml of water cooling effectiveness
  // - Tree absorption: A mature tree absorbs ~22kg of CO2 per year = 0.0007g per second
  const ledHours = energyKwh / 0.009;
  const phoneCharges = energyKwh / 0.012;
  const waterSips = waterMl / 15;
  const treeAbsorptionSeconds = co2Grams / 0.000697; // 22000g / (365*24*3600)
  const coffeeCupsBoiled = energyKwh / 0.025; // boiling a cup of water takes ~0.025 kWh
  
  return {
    inTokens,
    outTokens,
    totalTokens,
    energyKwh,
    energyWh,
    co2Grams,
    waterMl,
    ewasteMg,
    analogies: {
      ledHours,
      phoneCharges,
      waterSips,
      treeAbsorptionSeconds,
      coffeeCupsBoiled
    },
    alternatives
  };
}

// -------------------------------------------------------------
// Live API & High-Fidelity Local Simulator
// -------------------------------------------------------------

// High-fidelity local simulation based on diurnal grid cycles
function getSimulatedGridData() {
  const now = new Date();
  const hour = now.getHours();
  
  // Simulate carbon intensity based on time of day (UK average is ~130-180 gCO2/kWh)
  // Peak grid demand is typically 17:00 to 21:00 (coal/gas peak, high intensity)
  // Midday has solar output (lower intensity)
  // Night has wind/nuclear dominance (lowest intensity)
  let intensity = 135; // base
  
  if (hour >= 17 && hour <= 21) {
    intensity = 180 + Math.sin((hour - 17) * Math.PI / 4) * 45; // peak 180 - 225
  } else if (hour >= 11 && hour <= 15) {
    intensity = 90 - Math.sin((hour - 11) * Math.PI / 4) * 30; // midday low 60 - 90
  } else if (hour >= 1 && hour <= 5) {
    intensity = 65 + Math.sin(hour * Math.PI / 4) * 15; // night low 50 - 80
  } else {
    intensity = 120 + (Math.random() - 0.5) * 20; // normal transition
  }
  
  intensity = Math.round(intensity);
  
  // Calculate simulated fuel mix based on intensity
  // High intensity -> high gas/imports
  // Low intensity -> high wind/nuclear/solar
  let gasPerc = 15;
  let windPerc = 35;
  let nuclearPerc = 20;
  let solarPerc = 0;
  let importsPerc = 10;
  let biomassPerc = 8;
  let hydroPerc = 2;
  let coalPerc = 0;
  
  if (hour >= 8 && hour <= 17) {
    solarPerc = Math.max(5, Math.round(25 * Math.sin((hour - 7) * Math.PI / 10)));
  }
  
  if (intensity > 150) {
    gasPerc = Math.round(40 + (intensity - 150) * 0.4);
    windPerc = Math.max(10, Math.round(30 - (intensity - 150) * 0.3));
    coalPerc = intensity > 200 ? 2 : 0;
  } else {
    windPerc = Math.round(45 + (150 - intensity) * 0.5);
    gasPerc = Math.max(5, Math.round(25 - (150 - intensity) * 0.3));
  }
  
  // Normalize percentages to sum to 100
  const rawSum = gasPerc + windPerc + nuclearPerc + solarPerc + importsPerc + biomassPerc + hydroPerc + coalPerc;
  const factor = 100 / rawSum;
  
  const mix = [
    { fuel: 'gas', perc: Math.round(gasPerc * factor * 10) / 10 },
    { fuel: 'wind', perc: Math.round(windPerc * factor * 10) / 10 },
    { fuel: 'nuclear', perc: Math.round(nuclearPerc * factor * 10) / 10 },
    { fuel: 'solar', perc: Math.round(solarPerc * factor * 10) / 10 },
    { fuel: 'imports', perc: Math.round(importsPerc * factor * 10) / 10 },
    { fuel: 'biomass', perc: Math.round(biomassPerc * factor * 10) / 10 },
    { fuel: 'hydro', perc: Math.round(hydroPerc * factor * 10) / 10 },
    { fuel: 'coal', perc: Math.round(coalPerc * factor * 10) / 10 }
  ].sort((a, b) => b.perc - a.perc);
  
  // Forecast for next 12 hours
  const forecast = [];
  for (let i = 0; i < 12; i++) {
    const fHour = (hour + i) % 24;
    let fIntensity = 130;
    if (fHour >= 17 && fHour <= 21) fIntensity = 205;
    else if (fHour >= 11 && fHour <= 15) fIntensity = 75;
    else if (fHour >= 1 && fHour <= 5) fIntensity = 60;
    else fIntensity = 110;
    
    // Add minor variation
    fIntensity = Math.round(fIntensity + Math.sin(i) * 10);
    forecast.push({
      time: `${String(fHour).padStart(2, '0')}:00`,
      intensity: fIntensity
    });
  }
  
  return {
    intensity,
    mix,
    forecast,
    index: intensity < 75 ? 'very low' : intensity < 150 ? 'moderate' : 'high'
  };
}

// Fetch live grid metrics with fallback logic
async function updateGridMetrics() {
  if (isGridUpdateInFlight) return;
  isGridUpdateInFlight = true;

  const liveIndicator = document.getElementById('live-indicator');
  const liveStatusText = document.getElementById('live-status-text');
  
  try {
    // 1. Fetch live carbon intensity
    const resIntensity = await fetch(API_INTENSITY, { method: 'GET', mode: 'cors' });
    if (!resIntensity.ok) throw new Error('Failed to fetch intensity');
    const dataInt = await resIntensity.json();
    const actualIntensity = dataInt.data[0].intensity.actual || dataInt.data[0].intensity.forecast;
    // 2. Fetch live generation mix
    const resGen = await fetch(API_GENERATION, { method: 'GET', mode: 'cors' });
    if (!resGen.ok) throw new Error('Failed to fetch generation mix');
    const dataGen = await resGen.json();
    const liveMix = dataGen.data.generationmix;
    
    // 3. Fetch hourly forecast for the day
    // Get current date string YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    const resForecast = await fetch(`${API_FORECAST}/${todayStr}`, { method: 'GET', mode: 'cors' });
    let liveForecast = [];
    if (resForecast.ok) {
      const dataForecast = await resForecast.json();
      // Take the next 12 half-hourly slots or map them hourly
      liveForecast = dataForecast.data.slice(0, 12).map(slot => {
        const dateObj = new Date(slot.from);
        const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return {
          time: timeStr,
          intensity: slot.intensity.forecast
        };
      });
    }
    
    // Update global state
    state.carbonIntensity = actualIntensity;
    state.generationMix = liveMix.sort((a, b) => b.perc - a.perc);
    state.hourlyForecast = liveForecast.length > 0 ? liveForecast : getSimulatedGridData().forecast;
    state.isLive = true;
    
    // Update UI Indicators
    liveIndicator.classList.add('live-active');
    liveIndicator.classList.remove('live-simulated');
    liveStatusText.innerText = 'UK GRID LIVE';
    
  } catch (error) {
    console.warn('Grid API fetch failed, resorting to simulated grid data:', error);
    // Use diurnal simulator fallback
    const simulated = getSimulatedGridData();
    state.carbonIntensity = simulated.intensity;
    state.generationMix = simulated.mix;
    state.hourlyForecast = simulated.forecast;
    state.isLive = false;
    
    // Update UI Indicators
    liveIndicator.classList.remove('live-active');
    liveIndicator.classList.add('live-simulated');
    liveStatusText.innerText = 'SIMULATED GRID';
  } finally {
    // Trigger UI layout updates
    renderGridUI();
    isGridUpdateInFlight = false;
  }
}

// -------------------------------------------------------------
// UI Rendering Functions
// -------------------------------------------------------------

// Dynamic color scaling for grid intensity
// Green -> Orange -> Red
function getIntensityColor(intensity) {
  if (intensity < 75) return '#22c55e'; // Emerald
  if (intensity < 150) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

function getIntensityLabel(intensity) {
  if (intensity < 75) return 'Clean (Low Carbon)';
  if (intensity < 150) return 'Moderate Intensity';
  return 'Dirty (High Carbon)';
}

// Populate the UI with grid telemetry
function renderGridUI() {
  const intensityValue = document.getElementById('intensity-value');
  const intensityLabel = document.getElementById('intensity-label');
  const gaugeFill = document.getElementById('gauge-fill');
  
  // Set intensity texts
  intensityValue.innerText = state.carbonIntensity;
  intensityLabel.innerText = getIntensityLabel(state.carbonIntensity);
  intensityLabel.style.color = getIntensityColor(state.carbonIntensity);
  
  // Update gauge circle strokeDashoffset (max circumference is 283 for r=45)
  // Let's scale intensity from 0 to 300 gCO2/kWh
  const maxIntensity = 300;
  const percentage = Math.min(100, (state.carbonIntensity / maxIntensity) * 100);
  const strokeOffset = 283 - (283 * percentage) / 100;
  gaugeFill.style.strokeDashoffset = strokeOffset;
  gaugeFill.style.stroke = getIntensityColor(state.carbonIntensity);
  
  // Update fuel mix grid/cards
  const fuelListContainer = document.getElementById('fuel-list');
  fuelListContainer.innerHTML = '';
  
  // Icon mapper for fuels
  const fuelIcons = {
    wind: 'wind',
    solar: 'sun',
    nuclear: 'shield-alert',
    gas: 'flame',
    coal: 'box',
    imports: 'arrow-down-left',
    biomass: 'leaf',
    hydro: 'droplets',
    other: 'help-circle'
  };

  const fuelLabels = {
    wind: 'Wind Power',
    solar: 'Solar Energy',
    nuclear: 'Nuclear Clean',
    gas: 'Natural Gas',
    coal: 'Coal Power',
    imports: 'Foreign Imports',
    biomass: 'Biomass/Waste',
    hydro: 'Hydroelectric',
    other: 'Other Sources'
  };
  
  state.generationMix.forEach(item => {
    const fuelKey = item.fuel.toLowerCase();
    const percentage = item.perc;
    const label = fuelLabels[fuelKey] || fuelKey;
    const isRenewable = ['wind', 'solar', 'hydro', 'nuclear', 'biomass'].includes(fuelKey);
    const badgeClass = isRenewable ? 'badge-clean' : 'badge-dirty';
    
    // Calculate color based on fuel type
    let fuelColor = '#71717a'; // neutral
    if (fuelKey === 'wind') fuelColor = '#06b6d4'; // cyan
    else if (fuelKey === 'solar') fuelColor = '#fbbf24'; // amber
    else if (fuelKey === 'nuclear') fuelColor = '#a855f7'; // purple
    else if (fuelKey === 'gas') fuelColor = '#f97316'; // orange
    else if (fuelKey === 'coal') fuelColor = '#ef4444'; // red
    else if (fuelKey === 'imports') fuelColor = '#3b82f6'; // blue
    else if (fuelKey === 'biomass') fuelColor = '#10b981'; // emerald
    else if (fuelKey === 'hydro') fuelColor = '#3b82f6'; // blue

    const itemHtml = `
      <div class="fuel-item">
        <div class="fuel-info">
          <div class="fuel-header">
            <span class="fuel-bullet" style="background-color: ${fuelColor}"></span>
            <span class="fuel-name">${label}</span>
          </div>
          <span class="fuel-badge ${badgeClass}">${isRenewable ? 'CLEAN' : 'CARBON'}</span>
        </div>
        <div class="fuel-progress-wrapper">
          <div class="fuel-progress-track">
            <div class="fuel-progress-bar" style="width: ${percentage}%; background: ${fuelColor}"></div>
          </div>
          <span class="fuel-percentage">${percentage}%</span>
        </div>
      </div>
    `;
    fuelListContainer.insertAdjacentHTML('beforeend', itemHtml);
  });
  
  // Render current ambient background color based on intensity
  const baseColor = getIntensityColor(state.carbonIntensity);
  document.documentElement.style.setProperty('--glow-color', baseColor + '1a'); // 10% opacity glow
  
  // Update Green AI Guide advice box dynamically
  const adviceBox = document.getElementById('grid-advice-box');
  if (adviceBox) {
    let adviceHtml = '';
    let statusClass = 'moderate';
    
    if (state.carbonIntensity < 75) {
      statusClass = 'clean';
      adviceHtml = `
        <div class="advice-header">
          <i data-lucide="smile" class="advice-icon text-green"></i>
          <strong>Grid Status: Clean (Optimal)</strong>
        </div>
        <p class="advice-text">The electric grid is currently powered by a high percentage of wind, solar, or nuclear energy. This is an optimal time to execute resource-intensive audits or complex AI queries.</p>
      `;
    } else if (state.carbonIntensity > 150) {
      statusClass = 'dirty';
      adviceHtml = `
        <div class="advice-header">
          <i data-lucide="alert-triangle" class="advice-icon text-red"></i>
          <strong>Grid Status: Dirty (Carbon-Heavy)</strong>
        </div>
        <p class="advice-text">Emissions are high. Consider utilizing the lightweight <strong>Llama 3 8B / Flash</strong> tier, enabling the Eco-Router, or delaying large batch requests to off-peak hours.</p>
      `;
    } else {
      statusClass = 'moderate';
      adviceHtml = `
        <div class="advice-header">
          <i data-lucide="info" class="advice-icon text-amber"></i>
          <strong>Grid Status: Moderate Carbon Load</strong>
        </div>
        <p class="advice-text">Carbon intensity is standard. Using the <strong>Eco-Router</strong> ensures standard formatting or conversational text runs on lightweight engines, saving grid reserves.</p>
      `;
    }
    
    adviceBox.className = `grid-advice-box advice-${statusClass}`;
    adviceBox.innerHTML = adviceHtml;
    lucide.createIcons();
  }
  
  // Update recommendations and future forecasts
  renderForecastChart();
}

// Render dynamic SVG/HTML forecast trend line
function renderForecastChart() {
  const forecastContainer = document.getElementById('forecast-chart-container');
  forecastContainer.innerHTML = '';
  
  // We will build a beautiful HTML-based line chart/bar list representing future grid hours
  state.hourlyForecast.forEach(item => {
    const intensity = item.intensity;
    const time = item.time;
    const color = getIntensityColor(intensity);
    const barHeight = Math.min(90, (intensity / 300) * 100); // percentage height
    
    const barHtml = `
      <div class="forecast-bar-wrapper">
        <div class="forecast-tooltip">${intensity} g</div>
        <div class="forecast-bar" style="height: ${barHeight}%; background-color: ${color}"></div>
        <span class="forecast-time">${time}</span>
      </div>
    `;
    forecastContainer.insertAdjacentHTML('beforeend', barHtml);
  });
}

// Update token estimation tags dynamically as users type
function updateRealtimeCounts() {
  const promptInput = document.getElementById('prompt-input');
  const characterCount = document.getElementById('char-count');
  const tokenEstimate = document.getElementById('token-estimate');
  const energyEstimate = document.getElementById('energy-estimate');
  
  const text = promptInput.value;
  const count = text.length;
  const tokens = estimateTokens(text);
  
  characterCount.innerText = count.toLocaleString();
  tokenEstimate.innerText = tokens.toLocaleString();
  
  const routerDivider = document.getElementById('router-divider');
  const routerIndicator = document.getElementById('router-indicator');
  const routerStatusText = document.getElementById('router-status-text');
  
  let activeModelKey = state.selectedModel;
  
  if (state.selectedModel === 'eco-router') {
    const route = runEcoRouting(text, state.carbonIntensity);
    activeModelKey = route.routedModelKey;
    
    // Show router indicators in header
    if (routerDivider) routerDivider.style.display = 'inline-block';
    if (routerIndicator) {
      routerIndicator.style.display = 'flex';
      const m = MODELS[activeModelKey];
      let sizeShort = m.size === 'Extra Large' ? 'XL' : m.size === 'Large' ? 'L' : m.size === 'Medium' ? 'M' : 'S';
      let nameShort = activeModelKey === 'gpt-4-opus' ? 'OPUS' : activeModelKey === 'gpt-4o-sonnet' ? 'SONNET' : activeModelKey === 'gpt-35-llama70' ? 'LLAMA 70B' : 'FLASH';
      
      if (routerStatusText) {
        routerStatusText.innerText = `ROUTED: ${nameShort} (${sizeShort})`;
      }
      
      routerIndicator.style.borderColor = m.color + '44';
      routerIndicator.style.background = m.color + '14';
      
      const pulseRing = routerIndicator.querySelector('.pulse-ring');
      if (pulseRing) {
        pulseRing.style.backgroundColor = m.color;
      }
    }
    
    // Update specifications box dynamically in real-time as users type
    updateModelDetails();
  } else {
    // Hide router indicators
    if (routerDivider) routerDivider.style.display = 'none';
    if (routerIndicator) routerIndicator.style.display = 'none';
  }
  
  // Calculate instant expected energy usage just for prompt input
  const model = MODELS[activeModelKey];
  const energyWh = (tokens / 1000) * model.kwhPer1k * 1000;
  energyEstimate.innerText = energyWh.toFixed(4) + ' Wh';
}

let realtimeCountFrame = null;
function scheduleRealtimeCountsUpdate() {
  if (realtimeCountFrame !== null) return;
  realtimeCountFrame = requestAnimationFrame(() => {
    realtimeCountFrame = null;
    updateRealtimeCounts();
  });
}

// Simulated response dictionary to generate realistic content based on user prompts
const SIMULATED_RESPONSES = [
  "Based on your query, the optimal method to process this data involves initializing a localized cache store and mapping the input variables in a parallelized stream. This decreases CPU clock waste by 42%.",
  "To implement the requested binary search algorithm in Python:\n\ndef binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1",
  "The carbon footprint of deep learning operations scales exponentially with parameters. Distillation of models (e.g., teaching a smaller 8B model using GPT-4 labels) is the most effective way to optimize energy efficiency without sacrificing pipeline accuracy.",
  "Here is a CSS structure for responsive grid layouts:\n\n.grid-container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 1.5rem;\n}",
  "Analyzing your prompt: Sustainable computing is not just hardware efficiency, but scheduling tasks to run when renewable wind and solar energy supply are at their highest capacity on the electric grid."
];

// Complete printing of audit metrics and updating of savings totals
function printAuditResults(promptText, simulatedOutput, activeModelKey) {
  const terminalBody = document.getElementById('terminal-body');
  const metricsResultCard = document.getElementById('metrics-results');
  const auditBtn = document.getElementById('audit-btn');
  
  let displayName = MODELS[activeModelKey].name;
  if (state.selectedModel === 'eco-router') {
    displayName = `Eco-Router -> ${MODELS[activeModelKey].name}`;
  }
  
  terminalBody.innerHTML = `
    <div class="term-line text-success">> Audit Complete. AI Response Streamed:</div>
    <div class="term-response">${simulatedOutput}</div>
    <div class="term-divider"></div>
    <div class="term-line font-mono text-muted">> Energy consumption details:</div>
    <div class="term-line font-mono">> Model: ${displayName}</div>
    <div class="term-line font-mono">> Grid Intensity Factor: ${state.carbonIntensity} gCO2/kWh</div>
    <div class="term-line font-mono">> Calculated Footprint: <span id="term-footprint-g">--</span> grams CO2</div>
  `;
  
  const metrics = calculateCarbonMetrics(promptText, simulatedOutput, activeModelKey, state.carbonIntensity);
  document.getElementById('term-footprint-g').innerText = metrics.co2Grams.toFixed(4);
  
  // Compute session savings compared to running on 'gpt-4-opus' (the worst-case model)
  const maxCo2 = calculateCarbonMetrics(promptText, simulatedOutput, 'gpt-4-opus', state.carbonIntensity).co2Grams;
  const savings = Math.max(0, maxCo2 - metrics.co2Grams);
  state.sessionSavingsCo2 += savings;
  
  const savingsBadge = document.getElementById('savings-badge');
  const savingsVal = document.getElementById('session-savings-val');
  if (savingsBadge && savingsVal) {
    savingsVal.innerText = state.sessionSavingsCo2.toFixed(3) + 'g';
    savingsBadge.classList.add('visible');
    savingsBadge.classList.add('pulse-green-flash');
    setTimeout(() => savingsBadge.classList.remove('pulse-green-flash'), 800);
  }
  
  updateMetricsUI(metrics, activeModelKey);
  
  // Record audit in session history logs
  addAuditToHistory(promptText, activeModelKey, metrics.co2Grams, metrics.energyWh);
  
  const termContainer = document.getElementById('terminal-container');
  if (termContainer) {
    termContainer.scrollTop = termContainer.scrollHeight;
  }
  
  state.isAuditing = false;
  auditBtn.disabled = false;
  auditBtn.innerHTML = '<i data-lucide="zap"></i> Run Carbon Audit';
  lucide.createIcons();
  
  metricsResultCard.classList.add('visible');
  
  // EcoPulse Challenge checks
  if (activeModelKey === 'llama3-8b-flash') {
    updateChallengeProgress('flashDiet', 1);
  }
  if (state.selectedModel === 'eco-router') {
    updateChallengeProgress('ecoRouter', 1);
  }

  // Carbon Budget — deduct the CO2 from today's daily budget
  const modelColor = MODELS[activeModelKey].color;
  budgetRecordAudit(promptText, metrics.co2Grams, modelColor);
}

// Record an audit run into session history and trigger render
function addAuditToHistory(promptText, activeModelKey, co2Grams, energyWh) {
  const shortPrompt = promptText.length > 35 ? promptText.substring(0, 32) + '...' : promptText;
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  state.auditHistory.unshift({
    time,
    prompt: shortPrompt,
    model: MODELS[activeModelKey].name.split(' ')[0], // Short name (e.g. Claude or Llama)
    color: MODELS[activeModelKey].color,
    co2: co2Grams,
    energy: energyWh
  });
  
  // Limit to most recent 5 records
  if (state.auditHistory.length > 5) {
    state.auditHistory.pop();
  }
  
  renderAuditHistory();
}

// Render rolling logs table
function renderAuditHistory() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  if (state.auditHistory.length === 0) {
    historyList.innerHTML = `<div class="no-history-state text-muted">No queries audited this session.</div>`;
    return;
  }
  
  historyList.innerHTML = '';
  state.auditHistory.forEach(item => {
    const itemHtml = `
      <div class="history-item">
        <div class="history-item-top">
          <span class="history-prompt">"${item.prompt}"</span>
          <span class="history-time">${item.time}</span>
        </div>
        <div class="history-item-bottom">
          <span class="history-model-badge" style="background-color: ${item.color}22; color: ${item.color}; border: 1px solid ${item.color}44;">
            ${item.model}
          </span>
          <span class="history-metrics font-mono">
            <strong>${item.energy.toFixed(2)} Wh</strong> | <span style="color: #cbd5e1;">${item.co2.toFixed(3)}g CO₂</span>
          </span>
        </div>
      </div>
    `;
    historyList.insertAdjacentHTML('beforeend', itemHtml);
  });
}

// Run simulated audit
function runCarbonAudit() {
  if (state.isAuditing) return;
  
  const promptInput = document.getElementById('prompt-input');
  const promptText = promptInput.value.trim();
  if (!promptText) {
    alert('Please enter a prompt or code snippet to analyze.');
    return;
  }
  
  state.isAuditing = true;
  const auditBtn = document.getElementById('audit-btn');
  const terminalBody = document.getElementById('terminal-body');
  
  auditBtn.disabled = true;
  auditBtn.innerHTML = '<span class="spinner"></span> Auditing Footprint...';
  
  const simulatedOutput = SIMULATED_RESPONSES[Math.floor(Math.random() * SIMULATED_RESPONSES.length)];
  
  if (state.selectedModel === 'eco-router') {
    const route = runEcoRouting(promptText, state.carbonIntensity);
    const activeModelKey = route.routedModelKey;
    
    terminalBody.innerHTML = '<div class="term-line loading-text">> Establishing connection with Green Eco-Router...</div>';
    
    setTimeout(() => {
      terminalBody.innerHTML += '<div class="term-line">> [Router] Initiating carbon-aware request routing...</div>';
      
      setTimeout(() => {
        const comp = analyzePromptComplexity(promptText);
        terminalBody.innerHTML += `<div class="term-line">> [Router] Analyzing prompt complexity: <strong>${comp.level} Complexity</strong> (${comp.reason})</div>`;
        
        setTimeout(() => {
          terminalBody.innerHTML += `<div class="term-line">> [Router] UK Grid Carbon Intensity: <span style="color: ${getIntensityColor(state.carbonIntensity)}">${state.carbonIntensity} gCO₂/kWh</span></div>`;
          
          setTimeout(() => {
            if (route.throttled) {
              terminalBody.innerHTML += `<div class="term-line text-warning">> [Router] Carbon Throttle Active: Grid emissions > 150 gCO₂/kWh. Downgrading target model 1 tier.</div>`;
            } else if (state.carbonIntensity < 75 && route.complexity === 'High') {
              terminalBody.innerHTML += `<div class="term-line text-success">> [Router] Carbon Grid Optimal: Grid emissions < 75 gCO₂/kWh. Permitting premium model upgrade.</div>`;
            } else {
              terminalBody.innerHTML += `<div class="term-line">> [Router] No throttling required. Standard routing path selected.</div>`;
            }
            
            setTimeout(() => {
              terminalBody.innerHTML += `<div class="term-line text-success">> [Router] Decision: Routed to <strong>${MODELS[activeModelKey].name}</strong></div>`;
              
              setTimeout(() => {
                terminalBody.innerHTML += `<div class="term-line">> Establishing session with ${MODELS[activeModelKey].name}...</div>`;
                
                setTimeout(() => {
                  terminalBody.innerHTML += `<div class="term-line">> Streaming inference response...</div>`;
                  
                  setTimeout(() => {
                    printAuditResults(promptText, simulatedOutput, activeModelKey);
                  }, 1000);
                }, 800);
              }, 700);
            }, 600);
          }, 800);
        }, 700);
      }, 600);
    }, 500);
    
  } else {
    terminalBody.innerHTML = '<div class="term-line loading-text">> Establishing session with ' + MODELS[state.selectedModel].name + '...</div>';
    
    setTimeout(() => {
      terminalBody.innerHTML += '<div class="term-line">> Calculating input token footprint...</div>';
      
      setTimeout(() => {
        terminalBody.innerHTML += '<div class="term-line">> Querying live UK grid carbon coefficients...</div>';
        terminalBody.innerHTML += `<div class="term-line">> Grid Status: <span style="color: ${getIntensityColor(state.carbonIntensity)}">${state.carbonIntensity} gCO2/kWh</span></div>`;
        
        setTimeout(() => {
          terminalBody.innerHTML += '<div class="term-line">> Streaming simulated response output...</div>';
          
          setTimeout(() => {
            printAuditResults(promptText, simulatedOutput, state.selectedModel);
          }, 1000);
        }, 800);
      }, 700);
    }, 600);
  }
}

// Populate the main metrics results cards
function updateMetricsUI(metrics, activeModelKey = state.selectedModel) {
  // Numeric updates
  document.getElementById('res-energy').innerText = metrics.energyWh.toFixed(3) + ' Wh';
  document.getElementById('res-carbon').innerText = metrics.co2Grams.toFixed(3) + ' g';
  document.getElementById('res-water').innerText = metrics.waterMl.toFixed(2) + ' ml';
  document.getElementById('res-ewaste').innerText = metrics.ewasteMg.toFixed(3) + ' mg';
  
  // Analogies updates
  document.getElementById('analogy-led').innerText = metrics.analogies.ledHours.toFixed(1) + ' hrs';
  document.getElementById('analogy-phone').innerText = metrics.analogies.phoneCharges.toFixed(1) + ' charges';
  document.getElementById('analogy-water').innerText = metrics.analogies.waterSips.toFixed(1) + ' sips';
  document.getElementById('analogy-tree').innerText = metrics.analogies.treeAbsorptionSeconds.toFixed(0) + ' s';
  
  // Slogan / Story text
  const narrative = document.getElementById('analogy-narrative');
  
  let scaleText = '';
  if (metrics.co2Grams > 0.5) {
    scaleText = `This heavy AI query emits **${metrics.co2Grams.toFixed(2)}g of CO₂** and consumes **${metrics.waterMl.toFixed(1)}ml** of fresh server-cooling water. Under the current grid intensity of **${state.carbonIntensity} gCO₂/kWh**, running this request is equivalent to boiling a kettle for ${metrics.analogies.coffeeCupsBoiled.toFixed(1)} cups of coffee and generates **${metrics.ewasteMg.toFixed(3)}mg** of GPU hardware depletion.`;
  } else if (metrics.co2Grams > 0.05) {
    scaleText = `This prompt is moderately taxing, releasing **${metrics.co2Grams.toFixed(3)}g of CO₂** and consuming **${metrics.waterMl.toFixed(2)}ml** of cooling water. Leaving a standard 10W LED bulb illuminated for **${metrics.analogies.ledHours.toFixed(1)} hours** would release an equivalent amount of carbon under the current grid mix.`;
  } else {
    scaleText = `A highly efficient query! Emits just **${metrics.co2Grams.toFixed(4)}g of CO₂** and consumes **${metrics.waterMl.toFixed(3)}ml** of water. This tiny footprint is equal to charging **${metrics.analogies.phoneCharges.toFixed(2)}%** of a standard smartphone.`;
  }
  narrative.innerHTML = scaleText;
  
  // Recommendations List
  const recommendationsContainer = document.getElementById('recommendations-list');
  recommendationsContainer.innerHTML = '';
  
  // Suggestion 1: Model Switching (if not already using the lightweight option)
  if (activeModelKey !== 'llama3-8b-flash') {
    const flashModel = metrics.alternatives.find(a => a.key === 'llama3-8b-flash');
    const savings = flashModel.savingsPercent.toFixed(1);
    
    recommendationsContainer.innerHTML += `
      <div class="recommendation-card border-green">
        <div class="rec-icon text-green"><i data-lucide="shield-check"></i></div>
        <div class="rec-details">
          <div class="rec-title">Switch to a Lightweight Model</div>
          <div class="rec-desc">Running this query on <strong>Llama 3 8B / Gemini Flash</strong> instead would save approx <strong>${savings}%</strong> of carbon emissions (${(metrics.co2Grams - flashModel.co2).toFixed(3)}g saved).</div>
          <button class="rec-action-btn btn-green-outline" onclick="switchModel('llama3-8b-flash')">Use Llama 3 8B</button>
        </div>
      </div>
    `;
  }
  
  // Suggestion 2: Time shifting
  // Find the lowest forecasted intensity slot in our 12h forecast
  let lowestSlot = state.hourlyForecast[0];
  state.hourlyForecast.forEach(slot => {
    if (slot.intensity < lowestSlot.intensity) {
      lowestSlot = slot;
    }
  });
  
  const currentIntensity = state.carbonIntensity;
  const lowestIntensity = lowestSlot.intensity;
  
  if (currentIntensity - lowestIntensity > 15) {
    const timeSavings = ((currentIntensity - lowestIntensity) / currentIntensity * 100).toFixed(0);
    recommendationsContainer.innerHTML += `
      <div class="recommendation-card border-blue">
        <div class="rec-icon text-blue"><i data-lucide="clock"></i></div>
        <div class="rec-details">
          <div class="rec-title">Pre-Schedule for Dynamic Window</div>
          <div class="rec-desc">The grid carbon intensity is forecasted to drop to <strong>${lowestIntensity} gCO₂/kWh</strong> at <strong>${lowestSlot.time}</strong>. Deferring this non-urgent batch request will reduce carbon footprint by <strong>${timeSavings}%</strong>.</div>
          <button class="rec-action-btn btn-blue-outline" onclick="simulateSchedule('${lowestSlot.time}', ${timeSavings})">Schedule for ${lowestSlot.time}</button>
        </div>
      </div>
    `;
  } else {
    recommendationsContainer.innerHTML += `
      <div class="recommendation-card border-gray">
        <div class="rec-icon text-muted"><i data-lucide="info"></i></div>
        <div class="rec-details">
          <div class="rec-title">Grid Optimal</div>
          <div class="rec-desc">The grid carbon intensity is relatively stable right now. No major savings are available by shifting this query's time.</div>
        </div>
      </div>
    `;
  }
  
  lucide.createIcons();
}

// Switch current selected model from recommendations
window.switchModel = function(modelKey) {
  const modelSelect = document.getElementById('model-select');
  modelSelect.value = modelKey;
  state.selectedModel = modelKey;
  updateModelDetails();
  updateRealtimeCounts();
  
  // Flash visual feedback
  modelSelect.classList.add('flash-highlight');
  setTimeout(() => modelSelect.classList.remove('flash-highlight'), 600);
};

// Simulate scheduling the execution
window.simulateSchedule = function(time, savingsPercent) {
  const modal = document.createElement('div');
  modal.className = 'toast-notification';
  modal.innerHTML = `
    <div class="toast-content">
      <i data-lucide="calendar-check" class="text-green"></i>
      <div class="toast-text">
        <div class="toast-title">Task Scheduled Successfully</div>
        <div class="toast-desc">Prompt queued for deferred processing at <strong>${time}</strong>. Estimated carbon savings: <strong>${savingsPercent}%</strong>.</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();
  
  setTimeout(() => {
    modal.classList.add('fade-out');
    setTimeout(() => modal.remove(), 500);
  }, 4000);

  // Peak Shifter challenge progress
  updateChallengeProgress('peakShifter', 1);
};

// Update model specifications box on selector change
function updateModelDetails() {
  const select = document.getElementById('model-select');
  state.selectedModel = select.value;
  
  const specModelName = document.getElementById('spec-model-name');
  const specEnergy = document.getElementById('spec-energy');
  const specSlogan = document.getElementById('spec-slogan');
  const modelBadge = document.getElementById('model-badge');
  
  let activeKey = state.selectedModel;
  let prefix = '';
  let slogan = '';
  
  if (state.selectedModel === 'eco-router') {
    const promptInput = document.getElementById('prompt-input');
    const text = promptInput ? promptInput.value : '';
    const route = runEcoRouting(text, state.carbonIntensity);
    activeKey = route.routedModelKey;
    prefix = 'Router -> ';
    slogan = `[${route.complexity} Complexity] ${route.throttled ? 'Carbon throttle active due to emissions. ' : ''}Routing request to ${MODELS[activeKey].name}.`;
  } else {
    slogan = MODELS[activeKey].slogan;
  }
  
  const m = MODELS[activeKey];
  specModelName.innerText = prefix + m.name;
  specEnergy.innerText = (m.kwhPer1k * 1000).toFixed(1) + ' Wh / 1k tokens';
  specSlogan.innerText = slogan;
  modelBadge.style.backgroundColor = m.color;
  modelBadge.innerText = state.selectedModel === 'eco-router' ? `Auto (${m.size})` : m.size;
}

// -------------------------------------------------------------
// EcoPulse Green Quiz Data & Engine
// -------------------------------------------------------------
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "How much CO₂ does a single email with a 1MB attachment produce?",
    options: ["0.05g", "4g", "19g", "50g"],
    correctAnswer: 2,
    explanation: "A standard email with a 1MB attachment produces approximately 19g of CO₂ due to data transmission and storage.",
    carbonFact: "Sending 65 emails is equivalent to driving 1km in a car!"
  },
  {
    id: 2,
    question: "What percentage of all emails sent are spam?",
    options: ["25%", "45%", "65%", "85%"],
    correctAnswer: 1,
    explanation: "About 45% of all emails are spam, causing unnecessary carbon emissions from data centers.",
    carbonFact: "Deleting 1,000 old emails saves about 0.1kg of CO₂ per year."
  },
  {
    id: 3,
    question: "How much CO₂ does one hour of HD video streaming produce?",
    options: ["20g", "55g", "150g", "300g"],
    correctAnswer: 2,
    explanation: "One hour of HD streaming produces about 150g of CO₂, accounting for data centers and network transmission.",
    carbonFact: "Switching to SD quality can reduce emissions by up to 70%!"
  },
  {
    id: 4,
    question: "How much energy does a single AI chatbot query use compared to a Google search?",
    options: ["Same", "3x more", "10x more", "30x more"],
    correctAnswer: 2,
    explanation: "AI queries use approximately 10x more energy than traditional search queries due to complex computations.",
    carbonFact: "Being specific with AI prompts reduces the number of queries needed."
  },
  {
    id: 5,
    question: "What percentage of stored cloud data is 'dark data' (never accessed)?",
    options: ["20%", "40%", "52%", "75%"],
    correctAnswer: 2,
    explanation: "About 52% of cloud data is dark data that is stored but never used or analyzed.",
    carbonFact: "Cleaning up unused cloud data globally could save over 5.8 million tonnes of CO₂!"
  }
];

let quizTimer = null;
let quizSecondsLeft = 30;
let quizAnswered = false;
let quizScoreThisSession = 0;
let quizCorrectCount = 0;

function initQuiz() {
  state.activeQuizQuestion = 0;
  quizCorrectCount = 0;
  quizScoreThisSession = 0;
  quizAnswered = false;
  
  document.getElementById('quiz-start-view').style.display = 'none';
  document.getElementById('quiz-active-view').style.display = 'block';
  document.getElementById('quiz-end-view').style.display = 'none';
  
  loadQuizQuestion();
}

function loadQuizQuestion() {
  quizAnswered = false;
  quizSecondsLeft = 30;
  
  const q = QUIZ_QUESTIONS[state.activeQuizQuestion];
  
  // Set question text
  document.getElementById('quiz-question-text').innerText = q.question;
  
  // Render options buttons
  const container = document.getElementById('quiz-options-container');
  container.innerHTML = '';
  
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    btn.innerHTML = `
      <span class="quiz-option-letter">${String.fromCharCode(65 + idx)}</span>
      <span class="option-text">${opt}</span>
    `;
    btn.addEventListener('click', () => selectQuizAnswer(idx));
    container.appendChild(btn);
  });
  
  // Update index and streak displays
  document.getElementById('quiz-q-index').innerText = `Question ${state.activeQuizQuestion + 1}/${QUIZ_QUESTIONS.length}`;
  
  const streakBadge = document.getElementById('quiz-streak-badge');
  if (state.streak > 0) {
    streakBadge.style.display = 'inline-block';
    streakBadge.innerText = `🔥 ${state.streak} Streak`;
  } else {
    streakBadge.style.display = 'none';
  }
  
  // Reset feedback box and next button
  document.getElementById('quiz-feedback-box').style.display = 'none';
  document.getElementById('quiz-next-btn').style.display = 'none';
  
  // Reset progress bar
  const fill = document.getElementById('quiz-timer-fill');
  fill.style.transition = 'none';
  fill.style.width = '100%';
  document.getElementById('quiz-timer-val').innerText = '30s';
  
  // Start timer
  if (quizTimer) clearInterval(quizTimer);
  quizTimer = setInterval(tickQuizTimer, 1000);
}

function tickQuizTimer() {
  if (quizAnswered) return;
  
  quizSecondsLeft--;
  if (quizSecondsLeft <= 0) {
    quizSecondsLeft = 0;
    clearInterval(quizTimer);
    document.getElementById('quiz-timer-val').innerText = '0s';
    document.getElementById('quiz-timer-fill').style.width = '0%';
    selectQuizAnswer(-1); // timeout
  } else {
    document.getElementById('quiz-timer-val').innerText = `${quizSecondsLeft}s`;
    const percentage = (quizSecondsLeft / 30) * 100;
    const fill = document.getElementById('quiz-timer-fill');
    fill.style.transition = 'width 1s linear';
    fill.style.width = `${percentage}%`;
  }
}

function selectQuizAnswer(selectedIndex) {
  if (quizAnswered) return;
  quizAnswered = true;
  clearInterval(quizTimer);
  
  const q = QUIZ_QUESTIONS[state.activeQuizQuestion];
  const correctIdx = q.correctAnswer;
  const isCorrect = (selectedIndex === correctIdx);
  
  // Disable all options
  const buttons = document.querySelectorAll('.quiz-option-btn');
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === correctIdx) {
      btn.classList.add('option-correct');
    } else if (idx === selectedIndex) {
      btn.classList.add('option-incorrect');
    } else {
      btn.classList.add('option-dimmed');
    }
  });
  
  // Calculate points
  let pointsEarned = 0;
  if (isCorrect) {
    quizCorrectCount++;
    state.streak++;
    
    // Streak multiplier logic
    const streakBonus = Math.floor(state.streak / 2) * 10;
    pointsEarned = 50 + streakBonus + Math.round(quizSecondsLeft * 1.5);
    state.score += pointsEarned;
    quizScoreThisSession += pointsEarned;
    
    // Highlight correct indicators
    const feedbackTitle = document.getElementById('quiz-feedback-title');
    feedbackTitle.innerText = "Correct!";
    const feedbackInd = feedbackTitle.parentElement;
    feedbackInd.className = "feedback-indicator correct-color";
    
    // Set check mark icon
    const feedbackIcon = document.getElementById('quiz-feedback-icon');
    feedbackIcon.setAttribute('data-lucide', 'check-circle');
  } else {
    state.streak = 0;
    // Highlight incorrect indicators
    const feedbackTitle = document.getElementById('quiz-feedback-title');
    feedbackTitle.innerText = selectedIndex === -1 ? "Time's Up!" : "Not Quite Right";
    const feedbackInd = feedbackTitle.parentElement;
    feedbackInd.className = "feedback-indicator incorrect-color";
    
    // Set cross icon
    const feedbackIcon = document.getElementById('quiz-feedback-icon');
    feedbackIcon.setAttribute('data-lucide', 'x-circle');
  }
  
  // Update header score displays
  updateEcoPulseScoreUI();
  
  // Fill explanation and fact
  document.getElementById('quiz-feedback-desc').innerText = q.explanation;
  document.getElementById('quiz-feedback-fact').innerText = q.carbonFact;
  document.getElementById('quiz-feedback-box').style.display = 'block';
  document.getElementById('quiz-next-btn').style.display = 'block';
  
  lucide.createIcons();
}

function updateEcoPulseScoreUI() {
  document.getElementById('header-score-val').innerText = state.score;
  
  const separator = document.getElementById('header-streak-separator');
  const streakBadge = document.getElementById('header-streak-badge');
  const streakVal = document.getElementById('header-streak-val');
  
  if (state.streak > 0) {
    if (separator) separator.style.display = 'inline';
    if (streakBadge) {
      streakBadge.style.display = 'inline';
      streakVal.innerText = state.streak;
    }
  } else {
    if (separator) separator.style.display = 'none';
    if (streakBadge) streakBadge.style.display = 'none';
  }
  
  // Animate score badge flash
  const scoreBadge = document.getElementById('EcoPulse-score-badge');
  if (scoreBadge) {
    scoreBadge.classList.add('pulse-green-flash');
    setTimeout(() => scoreBadge.classList.remove('pulse-green-flash'), 800);
  }
}

function nextQuizQuestion() {
  state.activeQuizQuestion++;
  if (state.activeQuizQuestion >= QUIZ_QUESTIONS.length) {
    // End Quiz
    document.getElementById('quiz-active-view').style.display = 'none';
    document.getElementById('quiz-end-view').style.display = 'block';
    
    // Update results screen
    document.getElementById('quiz-final-score').innerText = `+${quizScoreThisSession} pts`;
    const accuracy = Math.round((quizCorrectCount / QUIZ_QUESTIONS.length) * 100);
    document.getElementById('quiz-final-accuracy').innerText = `${accuracy}%`;
  } else {
    loadQuizQuestion();
  }
}

// -------------------------------------------------------------
// EcoPulse Challenges Progress Tracker
// -------------------------------------------------------------
function updateChallengeProgress(type, amount = 1) {
  if (type === 'flashDiet') {
    if (state.challenges.flashDiet < 3) {
      state.challenges.flashDiet = Math.min(3, state.challenges.flashDiet + amount);
      renderChallengesUI();
      if (state.challenges.flashDiet === 3) {
        awardChallengePoints("Flash Diet Completed!", 100);
      }
    }
  } else if (type === 'peakShifter') {
    if (state.challenges.peakShifter < 1) {
      state.challenges.peakShifter = Math.min(1, state.challenges.peakShifter + amount);
      renderChallengesUI();
      if (state.challenges.peakShifter === 1) {
        awardChallengePoints("Peak Shifter Completed!", 100);
      }
    }
  } else if (type === 'ecoRouter') {
    if (state.challenges.ecoRouter < 1) {
      state.challenges.ecoRouter = Math.min(1, state.challenges.ecoRouter + amount);
      renderChallengesUI();
      if (state.challenges.ecoRouter === 1) {
        awardChallengePoints("Eco Adoption Completed!", 150);
      }
    }
  }
}

function renderChallengesUI() {
  // Flash Diet
  const flashStatus = document.getElementById('challenge-flash-diet-status');
  const flashFill = document.getElementById('challenge-flash-diet-fill');
  if (flashStatus && flashFill) {
    flashStatus.innerText = `${state.challenges.flashDiet}/3`;
    flashFill.style.width = `${(state.challenges.flashDiet / 3) * 100}%`;
  }
  
  // Peak Shifter
  const peakStatus = document.getElementById('challenge-peak-shifter-status');
  const peakFill = document.getElementById('challenge-peak-shifter-fill');
  if (peakStatus && peakFill) {
    peakStatus.innerText = `${state.challenges.peakShifter}/1`;
    peakFill.style.width = `${(state.challenges.peakShifter / 1) * 100}%`;
  }
  
  // Eco Router
  const ecoStatus = document.getElementById('challenge-eco-router-status');
  const ecoFill = document.getElementById('challenge-eco-router-fill');
  if (ecoStatus && ecoFill) {
    ecoStatus.innerText = `${state.challenges.ecoRouter}/1`;
    ecoFill.style.width = `${(state.challenges.ecoRouter / 1) * 100}%`;
  }
}

function awardChallengePoints(message, points) {
  state.score += points;
  updateEcoPulseScoreUI();
  
  // Toast notification for challenge completion
  const modal = document.createElement('div');
  modal.className = 'toast-notification';
  modal.innerHTML = `
    <div class="toast-content">
      <i data-lucide="trophy" class="text-amber"></i>
      <div class="toast-text">
        <div class="toast-title">${message}</div>
        <div class="toast-desc">You've earned <strong>+${points} EcoPulse Points</strong>.</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();
  
  setTimeout(() => {
    modal.classList.add('fade-out');
    setTimeout(() => modal.remove(), 500);
  }, 4000);
}

// =============================================================
// LOCAL CARBON IMPACT SYSTEM
// =============================================================

// Maps dropdown option values (regionId strings) to display names & insights
const LOCAL_REGION_DATA = {
  '1':  { name: 'North Scotland',             insight: 'North Scotland leads the UK in wind power, with some of the world\'s highest capacity factors for onshore wind. Hydro power supplements supply during low-wind periods.' },
  '2':  { name: 'South Scotland (Edinburgh/Glasgow)', insight: 'South Scotland benefits from strong offshore and onshore wind, with Edinburgh\'s carbon intensity consistently below the UK average.' },
  '3':  { name: 'North West England (Manchester)', insight: 'The Manchester region is connected to significant offshore wind capacity in the Irish Sea, particularly via Burbo Bank and Walney Extension. Grid intensity fluctuates with tidal wind windows.' },
  '4':  { name: 'North East England (Newcastle)', insight: 'The North East has a strong industrial legacy but is transitioning fast — Teesside is home to one of the UK\'s emerging green hydrogen hubs and offshore wind clusters.' },
  '5':  { name: 'Yorkshire',                  insight: 'Yorkshire\'s grid is driven by a mix of Humber offshore wind, gas peakers, and remaining biomass capacity. Running AI queries at midday benefits from better renewable penetration.' },
  '6':  { name: 'Merseyside & Cheshire (Liverpool)', insight: 'Merseyside benefits from strong Irish Sea wind connectivity. The region is also home to several pump-storage facilities which help balance renewable intermittency.' },
  '7':  { name: 'South Wales (Cardiff)',       insight: 'South Wales has significant tidal stream potential and a legacy nuclear contribution. The region\'s carbon intensity is typically moderate, improving steadily with offshore wind.' },
  '8':  { name: 'West Midlands (Birmingham)',  insight: 'The West Midlands is land-locked with fewer direct renewables. It relies on grid imports from windier regions. Running lighter AI models during peak hours is highly recommended.' },
  '9':  { name: 'East Midlands (Nottingham)', insight: 'The East Midlands is historically gas-heavy but transitioning with East Midlands Net Zero cluster investments. Solar energy peaks in summer afternoons.' },
  '10': { name: 'East England (Norwich)',      insight: 'East England is a solar powerhouse — high irradiance and flat terrain enable strong PV output in summer. Offshore wind from the North Sea also contributes significantly.' },
  '11': { name: 'South West England (Bristol/Exeter)', insight: 'The South West has excellent wind and tidal resources. The region hosts the Hinkley Point C nuclear project, which will substantially reduce grid carbon intensity from 2030.' },
  '12': { name: 'South England (Southampton)', insight: 'South England benefits from high solar irradiance. It is also connected to French nuclear power via the IFA interconnector, which can provide very low-carbon imports.' },
  '13': { name: 'London',                     insight: 'London\'s grid benefits from interconnectors to France and Belgium (low-carbon nuclear), but high urban density and data centre load maintain moderate intensity. Early morning is typically the cleanest window.' },
  '14': { name: 'South East England (Brighton)', insight: 'The South East has strong solar capacity and benefits from Channel interconnectors. Grid intensity often dips below 100 gCO₂/kWh on sunny, windy days.' },
};

// Average daily digital CO₂ footprint per UK adult (streaming, browsing, emails, social media)
// Source: Carbon Trust / IEA 2023 estimates
const AVG_DAILY_DIGITAL_G = 200; // grams CO₂

// Average daily UK electricity usage per person (kWh) — EDF/DESNZ 2023
const AVG_DAILY_KWH = 4.5;

// Fuel type colours (matches main app palette)
const LOCAL_FUEL_COLORS = {
  wind: '#06b6d4',
  solar: '#fbbf24',
  nuclear: '#a855f7',
  gas: '#f97316',
  coal: '#ef4444',
  imports: '#3b82f6',
  biomass: '#10b981',
  hydro: '#3b82f6',
  other: '#71717a',
};

const LOCAL_FUEL_LABELS = {
  wind: 'Wind',
  solar: 'Solar',
  nuclear: 'Nuclear',
  gas: 'Natural Gas',
  coal: 'Coal',
  imports: 'Imports',
  biomass: 'Biomass',
  hydro: 'Hydro',
  other: 'Other',
};

// Holds last fetched regional data
let localRegionCache = null;

// Fetch live regional data from Carbon Intensity API
async function fetchLocalRegionData(regionId) {
  const fetchBtn = document.getElementById('local-fetch-btn');
  if (fetchBtn) {
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<span class="spinner"></span> Fetching...';
  }

  try {
    const res = await fetch(`https://api.carbonintensity.org.uk/regional/regionid/${regionId}`, {
      method: 'GET', mode: 'cors'
    });
    if (!res.ok) throw new Error('Regional API unavailable');
    const json = await res.json();
    const d = json.data[0];
    localRegionCache = {
      regionId,
      name: LOCAL_REGION_DATA[regionId]?.name || d.shortname || d.dnoregion,
      intensity: d.intensity.forecast || d.intensity.actual || state.carbonIntensity,
      index: d.intensity.index || 'moderate',
      generationmix: (d.generationmix || []).sort((a, b) => b.perc - a.perc),
      live: true,
    };
  } catch (e) {
    // Fallback: use global simulated data, substitute regional name
    localRegionCache = {
      regionId,
      name: LOCAL_REGION_DATA[regionId]?.name || 'Selected Region',
      intensity: state.carbonIntensity,
      index: state.carbonIntensity < 75 ? 'very low' : state.carbonIntensity < 150 ? 'moderate' : 'high',
      generationmix: state.generationMix,
      live: false,
    };
  }

  renderLocalImpactUI();

  if (fetchBtn) {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Refresh Regional Data';
    lucide.createIcons();
  }
}

// Render the full Local Impact panel from cached data
function renderLocalImpactUI() {
  // Update your-co2 from today's budget
  const yourCo2 = budgetState.used;
  const yourCo2El = document.getElementById('local-your-co2');
  if (yourCo2El) yourCo2El.textContent = yourCo2.toFixed(3) + 'g';

  // Your bar relative to the average daily digital footprint
  const yourPct = Math.min(100, (yourCo2 / AVG_DAILY_DIGITAL_G) * 100);
  const yourBar = document.getElementById('local-your-bar');
  if (yourBar) yourBar.style.width = yourPct.toFixed(1) + '%';

  const avgEl = document.getElementById('local-avg-co2');
  if (avgEl) avgEl.textContent = '~' + AVG_DAILY_DIGITAL_G + 'g';

  // Percentage contribution
  const pctOfDigital = (yourCo2 / AVG_DAILY_DIGITAL_G) * 100;
  const pctValEl = document.getElementById('local-pct-val');
  if (pctValEl) {
    pctValEl.textContent = pctOfDigital.toFixed(3) + '%';
    pctValEl.style.color = pctOfDigital > 5 ? 'var(--amber)' : 'var(--green)';
  }
  const pctBar = document.getElementById('local-pct-bar');
  if (pctBar) pctBar.style.width = Math.min(100, pctOfDigital * 2).toFixed(1) + '%';

  if (!localRegionCache) return; // No region data yet — stop here

  const { name, intensity, index, generationmix, live, regionId } = localRegionCache;

  // --- Region Card ---
  const regionCard = document.getElementById('local-region-card');
  const regionNameEl = document.getElementById('local-region-name');
  const regionBadge = document.getElementById('local-region-badge');
  const intensityVal = document.getElementById('local-intensity-val');
  const intensityLabel = document.getElementById('local-intensity-label');
  const pulseEl = document.getElementById('local-pulse');

  if (regionNameEl) regionNameEl.textContent = (live ? '🔴 ' : '🟡 ') + name;
  if (regionBadge) {
    regionBadge.textContent = live ? 'LIVE' : 'SIMULATED';
    regionBadge.style.background = live ? 'rgba(20,184,166,0.12)' : 'rgba(234,179,8,0.12)';
    regionBadge.style.color = live ? 'var(--cyan)' : 'var(--amber)';
    regionBadge.style.borderColor = live ? 'rgba(20,184,166,0.25)' : 'rgba(234,179,8,0.25)';
  }
  if (intensityVal) {
    intensityVal.textContent = intensity;
    intensityVal.style.color = getIntensityColor(intensity);
  }
  if (intensityLabel) {
    intensityLabel.textContent = getIntensityLabel(intensity) + ' — ' +
      (index === 'very low' ? 'Optimal time to run AI queries.' :
       index === 'low'      ? 'Good time for AI queries.' :
       index === 'moderate' ? 'Standard grid conditions.' :
       index === 'high'     ? 'Consider lighter models.' :
       'High emissions — use eco models or defer.');
  }
  if (regionCard) {
    regionCard.className = 'local-region-card' +
      (intensity >= 150 ? ' state-high' : intensity >= 75 ? ' state-moderate' : '');
  }
  if (pulseEl) {
    pulseEl.style.background = getIntensityColor(intensity);
  }

  // --- Per-Capita Context ---
  const dailyElecCo2G = AVG_DAILY_KWH * intensity; // grams
  const yourShareOfElec = yourCo2 > 0 ? ((yourCo2 / dailyElecCo2G) * 100).toFixed(4) : '0.0000';
  const contextText = document.getElementById('local-context-text');
  if (contextText) {
    contextText.innerHTML =
      `In <strong>${name}</strong>, the current grid intensity is <strong style="color:${getIntensityColor(intensity)}">${intensity} gCO₂/kWh</strong>. ` +
      `An average person's daily electricity use (~${AVG_DAILY_KWH} kWh) produces roughly <strong>${dailyElecCo2G.toFixed(0)}g CO₂/day</strong>. ` +
      `Your AI queries today (<strong>${yourCo2.toFixed(3)}g</strong>) represent ` +
      `<strong>${yourShareOfElec}%</strong> of that per-capita electricity footprint — and ` +
      `<strong>${pctOfDigital.toFixed(3)}%</strong> of the average daily digital footprint (${AVG_DAILY_DIGITAL_G}g).`;
  }

  // --- Regional Fuel Mini-Mix ---
  const fuelMini = document.getElementById('local-fuel-mini');
  if (fuelMini && generationmix && generationmix.length > 0) {
    // Show top 6 fuels only
    const topFuels = generationmix.filter(f => f.perc > 0).slice(0, 6);
    fuelMini.innerHTML = topFuels.map(f => {
      const key = f.fuel.toLowerCase();
      const color = LOCAL_FUEL_COLORS[key] || '#71717a';
      const label = LOCAL_FUEL_LABELS[key] || key;
      return `
        <div class="local-fuel-row">
          <span class="local-fuel-label">${label}</span>
          <div class="local-fuel-bar-track">
            <div class="local-fuel-bar-inner" style="width:${f.perc}%; background:${color};"></div>
          </div>
          <span class="local-fuel-pct">${f.perc.toFixed(1)}%</span>
        </div>
      `;
    }).join('');
  } else if (fuelMini) {
    fuelMini.innerHTML = '<div class="no-history-state text-muted" style="font-size:0.72rem;">Fuel mix data unavailable for this region.</div>';
  }

  // --- Insight Box ---
  const insightBox = document.getElementById('local-insight-box');
  const insightText = document.getElementById('local-insight-text');
  const insight = LOCAL_REGION_DATA[regionId]?.insight;
  if (insightBox && insightText && insight) {
    insightText.textContent = insight;
    insightBox.style.display = 'block';
  }

  lucide.createIcons();
}

// =============================================================
// CARBON BUDGET SYSTEM
// =============================================================

// Budget persistent state (localStorage-backed)
const BUDGET_KEY_LIMIT = 'EcoPulse_budget_limit';
const BUDGET_KEY_TODAY = 'EcoPulse_budget_today_date';
const BUDGET_KEY_USED  = 'EcoPulse_budget_used';
const BUDGET_KEY_LOG   = 'EcoPulse_budget_log';
const BUDGET_KEY_STREAK = 'EcoPulse_budget_streak';
const BUDGET_KEY_TOTAL  = 'EcoPulse_budget_total_alltime';

let budgetState = {
  limit: parseFloat(localStorage.getItem(BUDGET_KEY_LIMIT) || '1'),
  used: 0,
  log: [],
  streakDays: parseInt(localStorage.getItem(BUDGET_KEY_STREAK) || '0', 10),
  totalAllTime: parseFloat(localStorage.getItem(BUDGET_KEY_TOTAL) || '0'),
};

// Restore or reset today's budget data
function budgetRestoreDaily() {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem(BUDGET_KEY_TODAY);

  if (savedDate === today) {
    budgetState.used = parseFloat(localStorage.getItem(BUDGET_KEY_USED) || '0');
    try { budgetState.log = JSON.parse(localStorage.getItem(BUDGET_KEY_LOG) || '[]'); } catch(e) { budgetState.log = []; }
  } else {
    // New day — check if yesterday's session was under budget and increment streak
    const yesterdayUsed = parseFloat(localStorage.getItem(BUDGET_KEY_USED) || '0');
    const yesterdayLimit = parseFloat(localStorage.getItem(BUDGET_KEY_LIMIT) || '1');
    if (savedDate && yesterdayUsed <= yesterdayLimit) {
      budgetState.streakDays++;
      localStorage.setItem(BUDGET_KEY_STREAK, budgetState.streakDays);
    } else if (savedDate && yesterdayUsed > yesterdayLimit) {
      budgetState.streakDays = 0;
      localStorage.setItem(BUDGET_KEY_STREAK, 0);
    }
    budgetState.used = 0;
    budgetState.log = [];
    localStorage.setItem(BUDGET_KEY_TODAY, today);
    localStorage.setItem(BUDGET_KEY_USED, '0');
    localStorage.setItem(BUDGET_KEY_LOG, '[]');
  }
}

function budgetSave() {
  localStorage.setItem(BUDGET_KEY_LIMIT, budgetState.limit);
  localStorage.setItem(BUDGET_KEY_USED, budgetState.used);
  localStorage.setItem(BUDGET_KEY_LOG, JSON.stringify(budgetState.log));
  localStorage.setItem(BUDGET_KEY_STREAK, budgetState.streakDays);
  localStorage.setItem(BUDGET_KEY_TOTAL, budgetState.totalAllTime);
}

// Called by printAuditResults each time a query is audited
function budgetRecordAudit(promptText, co2Grams, modelColor) {
  const wasOverBefore = budgetState.used > budgetState.limit;

  budgetState.used += co2Grams;
  budgetState.totalAllTime += co2Grams;
  budgetState.log.unshift({
    prompt: promptText.length > 30 ? promptText.substring(0, 28) + '…' : promptText,
    co2: co2Grams,
    color: modelColor,
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  });
  if (budgetState.log.length > 20) budgetState.log.pop();

  budgetSave();
  renderBudgetUI();

  // Show toast only first time budget is exceeded per session
  if (!wasOverBefore && budgetState.used > budgetState.limit) {
    showBudgetExceededToast();
  }
}

// Render the full Budget UI
function renderBudgetUI() {
  const used    = budgetState.used;
  const limit   = budgetState.limit;
  const pct     = Math.min(100, (used / limit) * 100);
  const isWarn  = pct >= 80 && pct < 100;
  const isOver  = pct >= 100;

  // --- Ring Gauge ---
  const CIRCUMFERENCE = 364.4; // 2π × r=58
  const ringFill = document.getElementById('budget-ring-fill');
  if (ringFill) {
    const offset = CIRCUMFERENCE - (Math.min(pct, 100) / 100) * CIRCUMFERENCE;
    ringFill.style.strokeDashoffset = offset;
    ringFill.classList.toggle('budget-warn', isWarn && !isOver);
    ringFill.classList.toggle('budget-over', isOver);
  }

  // --- Center text ---
  const usedVal = document.getElementById('budget-used-val');
  if (usedVal) usedVal.textContent = used.toFixed(3);
  const usedLabel = document.getElementById('budget-used-label');
  if (usedLabel) usedLabel.textContent = `of ${limit.toFixed(2)}g limit`;

  // --- Linear bar ---
  const barFill = document.getElementById('budget-bar-fill');
  if (barFill) {
    barFill.style.width = pct.toFixed(1) + '%';
    barFill.classList.toggle('budget-warn', isWarn && !isOver);
    barFill.classList.toggle('budget-over', isOver);
  }
  const barLimitLbl = document.getElementById('budget-bar-limit-lbl');
  if (barLimitLbl) barLimitLbl.textContent = limit.toFixed(2) + 'g';

  // --- Stats row ---
  const remaining = Math.max(0, limit - used);
  const remainingEl = document.getElementById('budget-remaining-val');
  if (remainingEl) {
    remainingEl.textContent = remaining.toFixed(3) + 'g';
    remainingEl.style.color = isOver ? 'var(--red)' : isWarn ? 'var(--amber)' : 'var(--green)';
  }
  const pctEl = document.getElementById('budget-pct-val');
  if (pctEl) {
    pctEl.textContent = pct.toFixed(1) + '%';
    pctEl.style.color = isOver ? 'var(--red)' : isWarn ? 'var(--amber)' : 'var(--text-main)';
  }
  const auditsEl = document.getElementById('budget-audits-val');
  if (auditsEl) auditsEl.textContent = budgetState.log.length;

  // --- Alert box ---
  const alertBox   = document.getElementById('budget-alert-box');
  const alertIcon  = document.getElementById('budget-alert-icon');
  const alertTitle = document.getElementById('budget-alert-title');
  const alertDesc  = document.getElementById('budget-alert-desc');
  if (alertBox && alertIcon && alertTitle && alertDesc) {
    alertBox.className = 'budget-alert-box';
    if (isOver) {
      alertBox.classList.add('budget-alert-over');
      alertIcon.setAttribute('data-lucide', 'alert-octagon');
      alertIcon.className = 'budget-alert-icon text-red';
      alertTitle.textContent = '⚠ Budget Exceeded!';
      alertDesc.textContent = `You've used ${pct.toFixed(0)}% of your daily ${limit.toFixed(2)}g CO₂ limit (${(used - limit).toFixed(3)}g over). Switch to lightweight models or defer non-urgent queries.`;
    } else if (isWarn) {
      alertBox.classList.add('budget-alert-warn');
      alertIcon.setAttribute('data-lucide', 'alert-triangle');
      alertIcon.className = 'budget-alert-icon text-amber';
      alertTitle.textContent = '⚡ Approaching Limit';
      alertDesc.textContent = `You've used ${pct.toFixed(0)}% of your daily budget — only ${remaining.toFixed(3)}g remaining. Consider using the Eco-Router or Llama 8B for remaining queries.`;
    } else {
      // Hide safe modal
      alertBox.style.display = 'none';
      lucide.createIcons();
      return;
    }
    lucide.createIcons();
    // Ensure alert is visible
    alertBox.style.display = '';
    // Attach close handler
    const closeBtn = alertBox.querySelector('.budget-alert-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        alertBox.style.display = 'none';
      };
    }
  }

  // --- Streak & All-time ---
  const streakEl = document.getElementById('budget-streak-days');
  if (streakEl) streakEl.textContent = budgetState.streakDays;
  const totalEl = document.getElementById('budget-total-saved');
  if (totalEl) totalEl.textContent = budgetState.totalAllTime.toFixed(3) + 'g';

  // --- Input sync ---
  const limInput = document.getElementById('budget-limit-input');
  if (limInput) limInput.value = limit;

  // --- Active preset highlight ---
  document.querySelectorAll('.budget-preset-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.limit) === limit);
  });

  // --- Log list ---
  const logList = document.getElementById('budget-log-list');
  if (logList) {
    if (budgetState.log.length === 0) {
      logList.innerHTML = '<div class="no-history-state text-muted">No audits logged today.</div>';
    } else {
      logList.innerHTML = budgetState.log.map(item => `
        <div class="budget-log-item">
          <div class="budget-log-dot" style="background-color: ${item.color}"></div>
          <div class="budget-log-info">
            <div class="budget-log-prompt">"${item.prompt}"</div>
            <div class="budget-log-co2">${item.co2.toFixed(4)}g CO₂</div>
          </div>
          <span class="budget-log-time">${item.time}</span>
        </div>
      `).join('');
    }
  }
}

function setBudgetLimit(newLimit) {
  const parsed = parseFloat(newLimit);
  if (isNaN(parsed) || parsed < 0.01) return;
  budgetState.limit = parsed;
  budgetSave();
  renderBudgetUI();
}

function showBudgetExceededToast() {
  let toast = document.getElementById('budget-exceeded-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'budget-exceeded-toast';
    toast.className = 'budget-exceeded-toast';
    toast.innerHTML = `
      <i data-lucide="alert-octagon"></i>
      <div class="budget-exceeded-toast-text">
        <strong>Daily CO₂ Budget Exceeded!</strong>
        <span>You've surpassed your daily carbon limit. Switch to lighter models or defer queries until tomorrow.</span>
      </div>
      <button class="budget-alert-close" aria-label="Close">&times;</button>
    `;
    document.body.appendChild(toast);
    lucide.createIcons();
    // Close button handler
    const closeBtn = toast.querySelector('.budget-alert-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        toast.classList.remove('visible');
      };
    }
  }
  // Show toast centered
  toast.classList.add('visible');
  // Auto-hide after 6 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 6000);
}

// =============================================================
// DOMContentLoaded — Application Bootstrap
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Restore today's budget from localStorage
  budgetRestoreDaily();

  // Bind inputs
  const promptInput = document.getElementById('prompt-input');
  const modelSelect = document.getElementById('model-select');
  const auditBtn = document.getElementById('audit-btn');
  const refreshGridBtn = document.getElementById('refresh-grid-btn');
  
  promptInput.addEventListener('input', scheduleRealtimeCountsUpdate);
  modelSelect.addEventListener('change', () => {
    updateModelDetails();
    updateRealtimeCounts();
  });
  auditBtn.addEventListener('click', runCarbonAudit);
  refreshGridBtn.addEventListener('click', updateGridMetrics);
  
  // Model Comparison Drawer Toggle
  const compareToggleBtn = document.getElementById('compare-toggle-btn');
  const compareMatrixDrawer = document.getElementById('compare-matrix-drawer');
  if (compareToggleBtn && compareMatrixDrawer) {
    compareToggleBtn.addEventListener('click', () => {
      compareToggleBtn.classList.toggle('active');
      compareMatrixDrawer.classList.toggle('active');
    });
  }
  
  // Tab Switcher for Right Sidebar
  const tabTelemetry = document.getElementById('tab-telemetry');
  const tabRecommendations = document.getElementById('tab-recommendations');
  const tabQuiz = document.getElementById('tab-quiz');
  const tabBudget = document.getElementById('tab-budget');
  
  const metricsResults = document.getElementById('metrics-results');
  const fuelCard = document.querySelector('.fuel-card');
  const forecastCard = document.querySelector('.forecast-card');
  const historyCard = document.getElementById('history-card');
  const recommendationsPanel = document.getElementById('recommendations-panel');
  const quizPanel = document.getElementById('quiz-panel');
  const budgetPanel = document.getElementById('budget-panel');
  
  function switchTab(activeTab) {
    // Remove active class from all tabs
    [tabTelemetry, tabRecommendations, tabQuiz, tabBudget].forEach(tab => {
      if (tab) tab.classList.remove('active');
    });
    
    // Hide all panels
    metricsResults.style.display = 'none';
    if (fuelCard) fuelCard.style.display = 'none';
    if (forecastCard) forecastCard.style.display = 'none';
    if (historyCard) historyCard.style.display = 'none';
    if (recommendationsPanel) recommendationsPanel.style.display = 'none';
    if (quizPanel) quizPanel.style.display = 'none';
    if (budgetPanel) budgetPanel.style.display = 'none';
    
    if (activeTab === 'telemetry') {
      if (tabTelemetry) tabTelemetry.classList.add('active');
      metricsResults.style.display = 'flex';
      if (fuelCard) fuelCard.style.display = 'flex';
      if (forecastCard) forecastCard.style.display = 'flex';
      if (historyCard) historyCard.style.display = 'flex';
    } else if (activeTab === 'recommendations') {
      if (tabRecommendations) tabRecommendations.classList.add('active');
      if (recommendationsPanel) recommendationsPanel.style.display = 'flex';
    } else if (activeTab === 'quiz') {
      if (tabQuiz) tabQuiz.classList.add('active');
      if (quizPanel) quizPanel.style.display = 'flex';
      renderLocalImpactUI(); // refresh contribution data on open
    } else if (activeTab === 'budget') {
      if (tabBudget) tabBudget.classList.add('active');
      if (budgetPanel) budgetPanel.style.display = 'flex';
      renderBudgetUI(); // Refresh on tab open
    }
  }
  
  if (tabTelemetry) {
    tabTelemetry.addEventListener('click', () => switchTab('telemetry'));
  }
  if (tabRecommendations) {
    tabRecommendations.addEventListener('click', () => switchTab('recommendations'));
  }
  if (tabQuiz) {
    tabQuiz.addEventListener('click', () => switchTab('quiz'));
  }
  if (tabBudget) {
    tabBudget.addEventListener('click', () => switchTab('budget'));
  }

  // Quiz view binds (removed — quiz replaced by Local Impact panel)
  // Local Impact: Fetch btn
  const localFetchBtn = document.getElementById('local-fetch-btn');
  const localCitySelect = document.getElementById('local-city-select');
  if (localFetchBtn && localCitySelect) {
    localFetchBtn.addEventListener('click', () => {
      const regionId = localCitySelect.value;
      fetchLocalRegionData(regionId);
    });
    // Auto-fetch default region (Manchester) on first load
    fetchLocalRegionData(localCitySelect.value);
  }
  
  // Render score UI and challenges UI on load
  updateEcoPulseScoreUI();
  renderChallengesUI();
  renderBudgetUI(); // Initial budget render

  // --- Carbon Budget Button Bindings ---
  // Preset buttons
  document.querySelectorAll('.budget-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => setBudgetLimit(parseFloat(btn.dataset.limit)));
  });
  // Manual Set button
  const budgetSetBtn = document.getElementById('budget-set-btn');
  const budgetLimitInput = document.getElementById('budget-limit-input');
  if (budgetSetBtn && budgetLimitInput) {
    budgetSetBtn.addEventListener('click', () => {
      setBudgetLimit(budgetLimitInput.value);
      budgetSetBtn.classList.add('flash-highlight');
      setTimeout(() => budgetSetBtn.classList.remove('flash-highlight'), 500);
    });
    budgetLimitInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') budgetSetBtn.click();
    });
  }
  // Reset today's usage
  const budgetResetBtn = document.getElementById('budget-reset-btn');
  if (budgetResetBtn) {
    budgetResetBtn.addEventListener('click', () => {
      budgetState.used = 0;
      budgetState.log = [];
      budgetSave();
      renderBudgetUI();
      budgetResetBtn.classList.add('flash-highlight');
      setTimeout(() => budgetResetBtn.classList.remove('flash-highlight'), 500);
    });
  }

  // Modal Elements and Triggers
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const resetSavingsBtn = document.getElementById('reset-savings-btn');
  const intensityOffsetInput = document.getElementById('settings-intensity-offset');
  const simToggleSelect = document.getElementById('settings-sim-toggle');
  
  // Custom Settings State Variables
  let intensityMultiplier = 1.0;
  let forceSimulation = false;
  
  if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('active');
    });
  }
  
  if (resetSavingsBtn) {
    resetSavingsBtn.addEventListener('click', () => {
      state.sessionSavingsCo2 = 0;
      state.auditHistory = [];
      renderAuditHistory();
      
      const savingsVal = document.getElementById('session-savings-val');
      if (savingsVal) savingsVal.innerText = '0.000g';
      
      // Reset EcoPulse states
      state.score = 0;
      state.streak = 0;
      state.challenges = {
        flashDiet: 0,
        peakShifter: 0,
        ecoRouter: 0
      };
      updateEcoPulseScoreUI();
      renderChallengesUI();
      
      // Visual feedback
      resetSavingsBtn.classList.add('flash-highlight');
      setTimeout(() => resetSavingsBtn.classList.remove('flash-highlight'), 600);
      
      // Alert/notification
      simulateSchedule('Reset Complete', 0);
      settingsModal.classList.remove('active');
    });
  }
  
  if (intensityOffsetInput) {
    intensityOffsetInput.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0.5 && val <= 2.0) {
        intensityMultiplier = val;
        updateGridMetrics(); // Refresh calculation base
      }
    });
  }
  
  if (simToggleSelect) {
    simToggleSelect.addEventListener('change', (e) => {
      forceSimulation = (e.target.value === 'sim');
      updateGridMetrics(); // Refresh simulation state
    });
  }

  // Intercept grid update logic in app.js using our custom settings values
  const originalUpdateGrid = updateGridMetrics;
  updateGridMetrics = async function() {
    if (forceSimulation) {
      // Force simulated data bypassing live fetch
      const simulated = getSimulatedGridData();
      state.carbonIntensity = Math.round(simulated.intensity * intensityMultiplier);
      state.generationMix = simulated.mix;
      state.hourlyForecast = simulated.forecast.map(s => ({
        time: s.time,
        intensity: Math.round(s.intensity * intensityMultiplier)
      }));
      state.isLive = false;
      
      const liveIndicator = document.getElementById('live-indicator');
      const liveStatusText = document.getElementById('live-status-text');
      if (liveIndicator && liveStatusText) {
        liveIndicator.classList.remove('live-active');
        liveIndicator.classList.add('live-simulated');
        liveStatusText.innerText = 'FORCED SIM';
      }
      renderGridUI();
    } else {
      // Fallback/standard update
      await originalUpdateGrid();
      // Apply offset if live
      state.carbonIntensity = Math.round(state.carbonIntensity * intensityMultiplier);
      state.hourlyForecast = state.hourlyForecast.map(s => ({
        time: s.time,
        intensity: Math.round(s.intensity * intensityMultiplier)
      }));
      renderGridUI();
    }
  };

  // Left Sidebar Item Click Bindings
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach((btn, index) => {
    // Skip logo item click
    if (btn.classList.contains('sidebar-logo')) return;
    
    btn.addEventListener('click', (e) => {
      // Set active indicator
      navItems.forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
      
      // Perform contextual view action based on index click:
      // Index 0: Playground Sandbox (terminal icon)
      // Index 1: Model Registry (cpu icon)
      // Index 2: Live Power Grid (activity icon)
      // Index 3: Generation Mix (pie-chart icon)
      // Index 4: Carbon Forecast (trending-up icon)
      // Index 5: Diagnostics Settings (settings icon)
      // Index 6: About Info (info icon)
      
      if (index === 0) {
        // Switch to Telemetry tab and flash prompt area
        if (tabTelemetry) tabTelemetry.click();
        const pInput = document.getElementById('prompt-input');
        if (pInput) {
          pInput.focus();
          pInput.classList.add('flash-highlight');
          setTimeout(() => pInput.classList.remove('flash-highlight'), 600);
        }
      } else if (index === 1) {
        // Switch to Actions tab, flash model specs
        if (tabRecommendations) tabRecommendations.click();
        const specBox = document.querySelector('.model-spec-box');
        if (specBox) {
          specBox.classList.add('flash-highlight');
          setTimeout(() => specBox.classList.remove('flash-highlight'), 600);
        }
      } else if (index === 2) {
        // Refresh Grid metrics, flash grid dial card
        updateGridMetrics();
        const dialCard = document.querySelector('.dial-card');
        if (dialCard) {
          dialCard.classList.add('flash-highlight');
          setTimeout(() => dialCard.classList.remove('flash-highlight'), 600);
        }
      } else if (index === 3) {
        // Switch to Telemetry and scroll to Fuel mix card
        if (tabTelemetry) tabTelemetry.click();
        const fuelCardEl = document.querySelector('.fuel-card');
        if (fuelCardEl) {
          fuelCardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fuelCardEl.classList.add('flash-highlight');
          setTimeout(() => fuelCardEl.classList.remove('flash-highlight'), 600);
        }
      } else if (index === 4) {
        // Switch to Telemetry and scroll to Forecast chart card
        if (tabTelemetry) tabTelemetry.click();
        const forecastCardEl = document.querySelector('.forecast-card');
        if (forecastCardEl) {
          forecastCardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          forecastCardEl.classList.add('flash-highlight');
          setTimeout(() => forecastCardEl.classList.remove('flash-highlight'), 600);
        }
      } else if (index === 5) {
        // Open Carbon Budget tab
        if (tabBudget) tabBudget.click();
        switchTab('budget');
      } else if (index === 6) {
        // Open Settings Modal
        if (settingsModal) settingsModal.classList.add('active');
      } else if (index === 7) {
        // Start Onboarding Tour
        startOnboardingTour();
      }
    });
  });

  // -------------------------------------------------------------
  // Onboarding Tour Controller (Spotlight Guide)
  // -------------------------------------------------------------
  const tourSteps = [
    {
      elementSelector: '.sidebar-nav',
      title: 'EcoPulse Sidebar',
      description: 'Interact with this full-height control deck to navigate between playground workspaces, inspect live grids, adjust settings, or replay this guide.',
      position: 'right'
    },
    {
      elementSelector: '.top-pill-bar',
      title: 'Pill Control Header',
      description: 'Switch models inside this floating pill. Monitor live UK power grid connections and track your EcoPulse sustainability points/streak badge.',
      position: 'bottom'
    },
    {
      elementSelector: '.bottom-bento-grid',
      title: 'Playground Workspace & Dial',
      description: 'Run prompt carbon audits in the playground, check the UK grid carbon intensity dial, and trace real-time routing decisions in the terminal logs.',
      position: 'top'
    },
    {
      elementSelector: '.right-sidebar',
      title: 'Telemetry, Challenges & Quiz',
      description: 'Examine detailed carbon footprint metrics. Toggle tabs to see your weekly developer Challenges, or take the timed interactive Green Quiz!',
      position: 'fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);'
    }
  ];

  let currentTourStep = 0;
  let tourOverlay = null;
  let tourPopover = null;

  function startOnboardingTour() {
    currentTourStep = 0;
    
    // Create Overlay if missing
    tourOverlay = document.getElementById('tour-overlay');
    if (!tourOverlay) {
      tourOverlay = document.createElement('div');
      tourOverlay.id = 'tour-overlay';
      tourOverlay.className = 'tour-overlay';
      document.body.appendChild(tourOverlay);
    }
    
    // Create Popover if missing
    tourPopover = document.getElementById('tour-popover');
    if (!tourPopover) {
      tourPopover = document.createElement('div');
      tourPopover.id = 'tour-popover';
      tourPopover.className = 'tour-popover';
      document.body.appendChild(tourPopover);
    }
    
    tourOverlay.classList.add('active');
    tourPopover.classList.add('active');
    
    renderTourStep();
  }

  function renderTourStep() {
    const step = tourSteps[currentTourStep];
    const targetEl = document.querySelector(step.elementSelector);
    
    // Remove previous highlights
    document.querySelectorAll('.tour-focus').forEach(el => el.classList.remove('tour-focus'));
    
    if (targetEl) {
      targetEl.classList.add('tour-focus');
    }
    
    // Build popover contents
    tourPopover.innerHTML = `
      <div class="tour-popover-header">
        <span class="tour-popover-title">${step.title}</span>
        <span class="tour-step-badge">Step ${currentTourStep + 1} of ${tourSteps.length}</span>
      </div>
      <p class="tour-popover-desc">${step.description}</p>
      <div class="tour-popover-footer">
        <button class="tour-btn tour-btn-skip" id="tour-skip-btn">Skip Guide</button>
        <div style="display: flex; gap: 8px;">
          ${currentTourStep > 0 ? '<button class="tour-btn tour-btn-prev" id="tour-prev-btn">Back</button>' : ''}
          <button class="tour-btn tour-btn-next" id="tour-next-btn">${currentTourStep === tourSteps.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    `;
    
    // Bind buttons
    document.getElementById('tour-skip-btn').addEventListener('click', endTour);
    document.getElementById('tour-next-btn').addEventListener('click', () => {
      if (currentTourStep === tourSteps.length - 1) {
        endTour();
      } else {
        currentTourStep++;
        renderTourStep();
      }
    });
    
    const prevBtn = document.getElementById('tour-prev-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentTourStep--;
        renderTourStep();
      });
    }
    
    // Position popover
    setTimeout(() => {
      if (targetEl) {
        positionPopover(targetEl, tourPopover, step.position);
      }
    }, 50);
  }

  function endTour() {
    if (tourOverlay) tourOverlay.classList.remove('active');
    if (tourPopover) tourPopover.classList.remove('active');
    document.querySelectorAll('.tour-focus').forEach(el => el.classList.remove('tour-focus'));
    
    // Save completion state
    localStorage.setItem('EcoPulse_onboarded', 'true');
  }

  function positionPopover(target, popover, position) {
    const rect = target.getBoundingClientRect();
    const popoverWidth = 320;
    const popoverHeight = popover.offsetHeight || 160;
    let top = 0;
    let left = 0;
    
    if (position === 'right') {
      left = rect.right + 16;
      top = rect.top + (rect.height / 2) - (popoverHeight / 2);
    } else if (position === 'left') {
      left = rect.left - popoverWidth - 16;
      top = rect.top + (rect.height / 2) - (popoverHeight / 2);
    } else if (position === 'bottom') {
      left = rect.left + (rect.width / 2) - (popoverWidth / 2);
      top = rect.bottom + 16;
    } else if (position === 'top') {
      left = rect.left + (rect.width / 2) - (popoverWidth / 2);
      top = rect.top - popoverHeight - 16;
    }
    
    // Boundary collision checks
    if (left < 16) left = 16;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (top < 16) top = 16;
    if (top + popoverHeight > window.innerHeight - 16) {
      top = window.innerHeight - popoverHeight - 16;
    }
    
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  // Trigger Onboarding Tour automatically for first-time visitors
  if (!localStorage.getItem('EcoPulse_onboarded')) {
    setTimeout(startOnboardingTour, 1500);
  }

  // Set defaults
  updateModelDetails();
  updateRealtimeCounts();
  
  // Fetch Grid Info
  updateGridMetrics();
  
  // Auto-refresh grid stats every 2 minutes, but avoid background-tab work.
  let gridRefreshTimer = null;
  function startGridAutoRefresh() {
    if (gridRefreshTimer) return;
    gridRefreshTimer = setInterval(() => {
      if (!document.hidden) updateGridMetrics();
    }, 120000);
  }

  function stopGridAutoRefresh() {
    if (!gridRefreshTimer) return;
    clearInterval(gridRefreshTimer);
    gridRefreshTimer = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopGridAutoRefresh();
      return;
    }
    startGridAutoRefresh();
    updateGridMetrics();
  });

  startGridAutoRefresh();
  
  // Initialize Lucide Icons
  lucide.createIcons();
});
