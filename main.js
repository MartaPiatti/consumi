// Costanti per le fonti di energia e mapping immagini
const ENERGY_SOURCES = [
  { key: "Solar consumption - TWh", label: "SOLARE", img: "assets/solar.png", csv: "Solar consumption - TWh" },
  { key: "Hydro consumption - TWh", label: "IDRICA", img: "assets/hydro.png", csv: "Hydro consumption - TWh" },
  { key: "Wind consumption - TWh", label: "EOLICA", img: "assets/wind.png", csv: "Wind consumption - TWh" },
  { key: "Other renewables (including geothermal and biomass) - TWh", label: "ALTRO", img: "assets/other.png", csv: "Other renewables (including geothermal and biomass) - TWh" },
  { key: "Nuclear consumption - TWh", label: "NUCLEARE", img: "assets/nuclear.png", csv: "Nuclear consumption - TWh" },
  { key: "Biofuels consumption - TWh", label: "BIOCARBURANTE", img: "assets/biofuels.png", csv: "Biofuels consumption - TWh" },
  { key: "Gas consumption - TWh", label: "GAS", img: "assets/gas.png", csv: "Gas consumption - TWh" },
  { key: "Oil consumption - TWh", label: "PETROLIO", img: "assets/oil.png", csv: "Oil consumption - TWh" },
  { key: "Coal consumption - TWh", label: "CARBONE", img: "assets/coal.png", csv: "Coal consumption - TWh" },
];

let energyDataByYear = {};
let availableYears = [];

// Carica i dati dal CSV
window.addEventListener("DOMContentLoaded", () => {
  fetch("./data.csv")
    .then((response) => response.text())
    .then((csvText) => {
      const data = d3.csvParse(csvText);
      data.forEach((row) => {
        const year = +row["Year"];
        if (!energyDataByYear[year]) energyDataByYear[year] = {};
        ENERGY_SOURCES.forEach((source) => {
          let value = row[source.csv];
          value = value === "" || value == null ? 0 : +value;
          energyDataByYear[year][source.key] = value;
        });
      });
      availableYears = Object.keys(energyDataByYear)
        .map(Number)
        .sort((a, b) => a - b);
      // Imposta slider dinamicamente
      const slider = document.getElementById("year-slider");
      slider.min = availableYears[0];
      slider.max = availableYears[availableYears.length - 1];
      slider.value = availableYears[0];
      document.getElementById("year-label").textContent = availableYears[0];
      drawChart(availableYears[0]);
      updateEnergyIcons(availableYears[0]);
    });
});

function getYearData(year) {
  const yearData = energyDataByYear[year] || {};
  const total = ENERGY_SOURCES.reduce((sum, s) => sum + (yearData[s.key] || 0), 0);
  const values = ENERGY_SOURCES.map((s) => ({
    ...s,
    value: yearData[s.key] || 0,
    percent: total > 0 ? ((yearData[s.key] || 0) / total) * 100 : 0,
  }));
  return { total, values };
}

// Funzione per disegnare il donut chart per un anno specifico
function drawChart(year) {
  const { total, values } = getYearData(year);
  const width = 450;
  const height = 450;
  const innerRadius = 90;
  const minOuter = 135;
  const maxOuter = 190;
  const minTotal = 200;
  const maxTotal = 350;
  const outerRadius = minOuter + (maxOuter - minOuter) * ((total - minTotal) / (maxTotal - minTotal));
  // Filtra solo le energie > 1%
  const filteredValues = values.filter((d) => d.percent >= 1);
  const colorMap = {
    "Solar consumption - TWh": "#FFD12E",
    "Hydro consumption - TWh": "#95D9E5",
    "Wind consumption - TWh": "#ACB5F8",
    "Other renewables (including geothermal and biomass) - TWh": "#E5B2FF",
    "Nuclear consumption - TWh": "#B9DA49",
    "Biofuels consumption - TWh": "#006146",
    "Gas consumption - TWh": "#FFB3D2",
    "Oil consumption - TWh": "#FF9233",
    "Coal consumption - TWh": "#804600",
  };

  d3.select("#donut-chart").selectAll("*").remove();
  const svg = d3.select("#donut-chart").append("svg").attr("width", width).attr("height", height);
  const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
  const pie = d3
    .pie()
    .sort(null)
    .value((d) => d.value)
    .padAngle(0.04);

  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius).cornerRadius(5);
  const arcHover = d3
    .arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius + 18)
    .cornerRadius(5);

  // Disegna gli spicchi
  const paths = g
    .selectAll("path")
    .data(pie(filteredValues))
    .join("path")
    .attr("d", arc)
    .attr("fill", (d) => colorMap[d.data.key] || "#ccc")
    .attr("class", (d) => `donut-slice slice-key-${CSS.escape(d.data.key)}`)
    .attr("data-key", (d) => d.data.key)
    .attr("filter", "url(#svg-shadow)")
    .style("transition", "opacity 0.3s");

  // Eventi hover sugli spicchi
  paths
    .on("mouseenter", function (event, d) {
      highlightEnergySource(d.data.key);
    })
    .on("mouseleave", function (event, d) {
      resetHighlightEnergySource(d.data.key);
    });

  // Testo centrale (totale)
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.2em")
    .attr("font-size", "2.7em")
    .attr("font-weight", "bold")
    .attr("font-family", "Satoshi")
    .attr("fill", "#2d1a00")
    .attr("dominant-baseline", "middle")
    .attr("class", "donut-kw-value")
    .text(`${Math.round(total)}M`);
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "1.5em")
    .attr("font-size", "2em")
    .attr("font-family", "Satoshi")
    .attr("font-weight", 500)
    .attr("fill", "#2d1a00")
    .attr("dominant-baseline", "middle")
    .attr("class", "donut-kw-label")
    .text("kw");
}

// Funzione per aggiornare le icone e percentuali
function updateEnergyIcons(year) {
  const { values } = getYearData(year);
  const container = document.getElementById("energy-icons");
  container.innerHTML = "";
  // Mappa colore per fonte
  const percentColorMap = {
    "Solar consumption - TWh": "#804600",
    "Hydro consumption - TWh": "#005573",
    "Wind consumption - TWh": "#142182",
    "Other renewables (including geothermal and biomass) - TWh": "#631F66",
    "Nuclear consumption - TWh": "#006146",
    "Biofuels consumption - TWh": "#B9DA49",
    "Gas consumption - TWh": "#8C0040",
    "Oil consumption - TWh": "#802D00",
    "Coal consumption - TWh": "#FFD12E",
  };
  // Solo valori >= 1%
  const filtered = values.filter((v) => v.percent >= 1);
  filtered.forEach((source) => {
    const iconDiv = document.createElement("div");
    iconDiv.className = "energy-icon";
    iconDiv.setAttribute("data-key", source.key);
    iconDiv.style.transition = "all 0.2s ease-in-out";

    const percentDiv = document.createElement("div");
    percentDiv.className = "energy-percentage cubano-font";
    const percentValue = document.createElement("span");
    percentValue.textContent = Math.round(source.percent);
    const percentSymbol = document.createElement("span");
    percentSymbol.className = "percent-symbol";
    percentSymbol.textContent = "%";
    percentDiv.appendChild(percentValue);
    percentDiv.appendChild(percentSymbol);
    percentDiv.style.color = percentColorMap[source.key] || "#8a5a13";
    iconDiv.appendChild(percentDiv);

    const img = document.createElement("img");
    img.src = source.img;
    img.alt = source.label;
    iconDiv.appendChild(img);

    const labelDiv = document.createElement("div");
    labelDiv.className = "energy-label";
    labelDiv.textContent = source.label;
    iconDiv.appendChild(labelDiv);

    // Eventi hover sulle immagini
    iconDiv.addEventListener("mouseenter", () => {
      highlightEnergySource(source.key);
    });
    iconDiv.addEventListener("mouseleave", () => {
      resetHighlightEnergySource(source.key);
    });

    container.appendChild(iconDiv);
  });
}

// Gestione slider
const slider = document.getElementById("year-slider");
const yearLabel = document.getElementById("year-label");
slider.addEventListener("input", function () {
  const year = +slider.value;
  yearLabel.textContent = year;
  drawChart(year);
  updateEnergyIcons(year);
});

// Funzione per evidenziare una fonte energetica (spicchio e immagine)
function highlightEnergySource(key) {
  const year = +document.getElementById("year-slider").value;
  const { total } = getYearData(year);
  const minOuter = 135;
  const maxOuter = 190;
  const minTotal = 200;
  const maxTotal = 350;
  const baseRadius = minOuter + (maxOuter - minOuter) * ((total - minTotal) / (maxTotal - minTotal));

  // Prima resetta tutti a dimensione normale e opacità 0.5
  d3.selectAll("#donut-chart path").each(function (d) {
    const el = d3.select(this);
    if (el.attr("data-key") === key) {
      // Lo spicchio attivo lo porto subito a normale, poi lo ingrandisco (per evitare accumulo di transizioni)
      el.interrupt().attr("d", d3.arc().innerRadius(90).outerRadius(baseRadius).cornerRadius(5));
    } else {
      el.interrupt().attr("d", d3.arc().innerRadius(90).outerRadius(baseRadius).cornerRadius(5));
    }
    el.style("opacity", el.attr("data-key") === key ? 1 : 0.5);
  });
  // Poi ingrandisco solo quello attivo
  d3.selectAll(`#donut-chart path[data-key='${key}']`)
    .transition()
    .duration(200)
    .attr(
      "d",
      d3
        .arc()
        .innerRadius(90)
        .outerRadius(baseRadius + 18)
        .cornerRadius(5)
    )
    .style("opacity", 1);

  // Gestione delle immagini
  document.querySelectorAll(".energy-icon").forEach((el) => {
    if (el.dataset.key === key) {
      el.classList.add("icon-hover");
      el.classList.remove("icon-fade");
      el.style.opacity = "1";
      el.style.transform = "scale(1.1)";
    } else {
      el.classList.remove("icon-hover");
      el.classList.add("icon-fade");
      el.style.opacity = "0.5";
      el.style.transform = "scale(1)";
    }
  });
}

function resetHighlightEnergySource(key) {
  const year = +document.getElementById("year-slider").value;
  const { total } = getYearData(year);
  const minOuter = 135;
  const maxOuter = 190;
  const minTotal = 200;
  const maxTotal = 350;
  const baseRadius = minOuter + (maxOuter - minOuter) * ((total - minTotal) / (maxTotal - minTotal));

  // Solo lo spicchio attivo torna normale
  if (key) {
    d3.selectAll(`#donut-chart path[data-key='${key}']`).transition().duration(200).attr("d", d3.arc().innerRadius(90).outerRadius(baseRadius).cornerRadius(5)).style("opacity", 1);
  }

  // Reset di tutte le immagini
  document.querySelectorAll(".energy-icon").forEach((el) => {
    el.classList.remove("icon-hover");
    el.classList.remove("icon-fade");
    el.style.opacity = "1";
    el.style.transform = "scale(1)";
  });

  // Tutti gli spicchi non attivi restano invariati (solo opacità)
  d3.selectAll("#donut-chart path").each(function (d) {
    const el = d3.select(this);
    if (!key || el.attr("data-key") !== key) {
      el.transition().duration(200).style("opacity", 1);
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // Imposta il colore dello slider
  const slider = document.getElementById("year-slider");
  slider.style.accentColor = "#804600";
});
