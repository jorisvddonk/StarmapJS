import { mindata_mapping, biodata_mapping } from "./data/starmap-colormapping.js?v=1.11";
import { starColors } from "./util.js?v=1.11";

const SVG_NS = "http://www.w3.org/2000/svg";
const MAP_SIZE = 800; // s_width + 2 * s_pad_x
const EXPORT_PIXELS = 2400;
const TRUE_SPACE_LEGEND = [
  ["Blue", starColors.blue],
  ["Green", starColors.green],
  ["Orange", starColors.orange],
  ["Red", starColors.red],
  ["White", starColors.white],
  ["Yellow", starColors.yellow]
];

const COLOR_MODE_LABELS = [
  "True space colours",
  "Available minerals (value)",
  "Available biological data (units)"
];

const CHART_TITLES = [
  "HyperSpace Star Map",
  "Mineral Survey Chart",
  "Biological Survey Chart"
];

function exportFilename(options, extension) {
  const date = new Date().toISOString().slice(0, 10);
  return "starmapjs-" + options.mapKey + "-" + date + "." + extension;
}

async function getExportCSS() {
  const cssUrl = new URL("starmap-styling.css?v=1.11", import.meta.url);
  const response = await fetch(cssUrl);
  if (!response.ok) {
    throw new Error("Could not load starmap styling (" + response.status + ")");
  }
  const css = await response.text();
  return css + "\ntext { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }";
}

//Clone the live SVG and strip everything that belongs to the interactive UI.
async function buildExportSVG(pixels) {
  const source = document.querySelector("#svgStarmap svg");
  if (!source) {
    throw new Error("Starmap SVG not found");
  }

  const clone = source.cloneNode(true);
  clone.querySelectorAll("script").forEach(function (node) { node.remove(); });
  clone.querySelectorAll(".qtip").forEach(function (node) { node.remove(); });

  const style = document.createElementNS(SVG_NS, "style");
  style.textContent = await getExportCSS();
  clone.insertBefore(style, clone.firstChild);

  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("x", "0");
  background.setAttribute("y", "0");
  background.setAttribute("width", String(MAP_SIZE));
  background.setAttribute("height", String(MAP_SIZE));
  background.setAttribute("fill", "#ffffff");
  clone.insertBefore(background, style.nextSibling);

  const viewport = clone.querySelector("#viewport");
  if (viewport) {
    viewport.setAttribute("transform", "translate(0,0)");
  }

  //The live map keeps star sizes constant on screen while zooming; restore the
  //unzoomed sizes so the export always looks the same.
  const zoom = typeof window.totalZoom === "number" ? window.totalZoom : 1;
  const restore = Math.sqrt(zoom);
  clone.querySelectorAll(".circle-Star").forEach(function (circle) {
    const radius = parseFloat(circle.getAttribute("r"));
    if (!isNaN(radius)) {
      circle.setAttribute("r", String(radius * restore));
    }
  });
  const starsGroup = clone.querySelector("#svg_stars");
  if (starsGroup) {
    starsGroup.setAttribute("stroke-width", "1");
  }
  const clinesGroup = clone.querySelector("#svg_clines");
  if (clinesGroup) {
    clinesGroup.setAttribute("stroke-width", "1");
  }

  clone.setAttribute("width", String(pixels));
  clone.setAttribute("height", String(pixels));
  clone.setAttribute("viewBox", "0 0 " + MAP_SIZE + " " + MAP_SIZE);
  clone.setAttribute("style", "width:" + pixels + "px;height:" + pixels + "px");

  return clone;
}

function loadImage(url) {
  return new Promise(function (resolve, reject) {
    const image = new Image();
    image.onload = function () { resolve(image); };
    image.onerror = function () { reject(new Error("Could not render the starmap image")); };
    image.src = url;
  });
}

export async function renderStarmapCanvas(pixels) {
  const size = pixels || EXPORT_PIXELS;
  const svg = await buildExportSVG(size);
  const xml = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);
    return canvas;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  //Give the browser time to start the download before releasing the URL.
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
}

export async function exportPNG(options) {
  const canvas = await renderStarmapCanvas();
  const blob = await new Promise(function (resolve, reject) {
    canvas.toBlob(function (result) {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Could not encode the PNG"));
      }
    }, "image/png");
  });
  downloadBlob(blob, exportFilename(options, "png"));
  return blob;
}

function hexToRgb(hex) {
  const value = parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function drawLegend(doc, x, y, width, colorMode, columns) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Star colour legend", x, y);

  let rows;
  if (colorMode === 0) {
    rows = TRUE_SPACE_LEGEND.map(function (entry) { return { label: entry[0], color: entry[1] }; });
  } else {
    const mapping = colorMode === 1 ? mindata_mapping : biodata_mapping;
    rows = mapping.map(function (entry) {
      return { label: "[" + entry.min + ", " + entry.max + "]", color: entry.color };
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(COLOR_MODE_LABELS[colorMode], x, y + 6);

  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  doc.line(x, y + 9, x + width, y + 9);

  const columnCount = columns || 1;
  const rowsPerColumn = Math.ceil(rows.length / columnCount);
  const columnWidth = width / columnCount;
  const rowHeight = 6;
  rows.forEach(function (row, index) {
    const column = Math.floor(index / rowsPerColumn);
    const rowY = y + 16 + (index % rowsPerColumn) * rowHeight;
    const rowX = x + column * columnWidth;
    const rgb = hexToRgb(row.color);
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(rowX, rowY - 3.5, 4.5, 4.5, "F");
    doc.setDrawColor(80);
    doc.setLineWidth(0.1);
    doc.rect(rowX, rowY - 3.5, 4.5, 4.5, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text(row.label, rowX + 7, rowY);
  });
}

function buildPDFDocument(options, paperSize, orientation, canvas) {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) {
    throw new Error("The PDF library could not be loaded. Check your internet connection and try again.");
  }

  const isPortrait = orientation === "portrait";
  const doc = new jsPDF({
    orientation: isPortrait ? "portrait" : "landscape",
    unit: "mm",
    format: paperSize
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const mapTop = 32;
  const footerHeight = 10;
  let mapX, mapY, mapSize, legendX, legendY, legendWidth, legendColumns;

  if (isPortrait) {
    const legendHeight = 46;
    mapSize = Math.min(
      pageWidth - (2 * margin),
      pageHeight - mapTop - footerHeight - margin - 6 - legendHeight
    );
    mapX = (pageWidth - mapSize) / 2;
    mapY = mapTop;
    legendX = margin;
    legendY = mapY + mapSize + 8;
    legendWidth = pageWidth - (2 * margin);
    legendColumns = 2;
  } else {
    const landscapeLegendWidth = 62;
    mapSize = Math.min(
      pageHeight - mapTop - footerHeight - margin,
      pageWidth - (2 * margin) - landscapeLegendWidth - 10
    );
    mapX = margin;
    mapY = mapTop + Math.max(0, (pageHeight - mapTop - footerHeight - margin - mapSize) / 2);
    legendX = mapX + mapSize + 10;
    legendY = mapY + 2;
    legendWidth = pageWidth - legendX - margin;
    legendColumns = 1;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0);
  doc.text(CHART_TITLES[options.colorMode], margin, 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(options.mapName, margin, 21.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80);
  doc.text(options.sphereName, margin, 26.5);

  doc.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", mapX, mapY, mapSize, mapSize);
  doc.setDrawColor(0);
  doc.setLineWidth(0.25);
  doc.rect(mapX, mapY, mapSize, mapSize);

  drawLegend(doc, legendX, legendY, legendWidth, options.colorMode, legendColumns);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120);
  const generated = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric"
  });
  doc.text(
    "Generated " + generated + " with StarmapJS - https://jorisvddonk.github.io/StarmapJS/",
    margin,
    pageHeight - 6
  );

  return doc;
}

export async function exportPDF(options, paperSize, orientation) {
  const format = paperSize === "letter" ? "letter" : "a4";
  const direction = orientation === "portrait" ? "portrait" : "landscape";
  const canvas = await renderStarmapCanvas(2000);
  const doc = buildPDFDocument(options, format, direction, canvas);
  const blob = doc.output("blob");
  downloadBlob(blob, exportFilename(options, format + "-" + direction + ".pdf"));
  return blob;
}

export async function exportSVG(options) {
  const svg = await buildExportSVG(MAP_SIZE);
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, exportFilename(options, "svg"));
  return blob;
}
