/* global $, resizeStars, initSVGPan */
import map_sc2 from "./data/map_sc2.js?v=1.12";
import map_p6014 from "./data/map_p6014.js?v=1.12";
import starmap_spheres from "./data/starmap-spheres.js?v=1.12";
import { mindata_mapping, biodata_mapping } from "./data/starmap-colormapping.js?v=1.12";
import { convertPrefix, getStarColor_normal, getStarColor_mineralData, getStarColor_bioData } from "./util.js?v=1.12";
import { starTable } from "./starTable.js?v=1.12";
import { legend } from "./legend.js?v=1.12";
import { exportPNG, exportPDF, exportSVG } from "./export.js?v=1.12";

const starmaps = {
    sc2: map_sc2,
    p6014: map_p6014
}; //filled in the various map JS files
let starmapdata;
const spheres = starmap_spheres; // Filled in starmap-spheres.js            
//
//Starmap settings on load:
let showingSpheres = "oldSpheres";
let showingStarmap = "sc2";
let colortype = 0;
let showingHighlights = [];
let hashUpdateTimer;

//Which starmap each Sphere of Influence set belongs to:
const sphereSetStarmaps = {
    oldSpheres: "sc2",
    newSpheres: "sc2",
    p6014InitialSpheres: "p6014",
    p6014AllSpheres: "p6014"
};

//Sphere of Influence set to show when switching to each starmap:
const defaultSpheres = {
    sc2: "oldSpheres",
    p6014: "p6014InitialSpheres"
};

const starmapNames = {
    sc2: "Star Control 2",
    p6014: "Project 6014"
};

//SVG:
let svg;
let svg_paper;
let svg_g_grid;
let svg_g_clines;
let svg_g_stars;
let svg_g_spheres;
let svg_gs_spheres;

$(function () {
    $('#svgStarmap').svg({ onLoad: initPaper }); //only run this once
});

//THIS FUNCTION SHOULD ONLY BE RUN ONCE!!
function initPaper(svgt) {
    svg = svgt;
    //Init SVGPan
    initSVGPan();
    //Modify the width and height of the SVG so we can resize our window
    $("svg").attr("height", "100%");
    $("svg").attr("width", "100%");
    svg_paper = svg.group(null, "viewport", { transform: "translate(0,0)" });
    displayStarmap(showingStarmap);
    loadStateFromHash();
}

function displayStarmap(starmapName) {
    showingStarmap = starmapName;
    showingHighlights = [];
    starmapdata = starmaps[starmapName];
    if (sphereSetStarmaps[showingSpheres] != undefined && sphereSetStarmaps[showingSpheres] != showingStarmap) {
        showingSpheres = defaultSpheres[showingStarmap];
    }
    $(".starmapdata-icon").removeClass("icon-ok");
    $("#starmapdata-" + starmapName).addClass("icon-ok");

    paintPaper_SVG();
    scheduleHashUpdate();
}

let s_width = 750; //Inner starmap width in px
let s_height = 750; //Inner starmap height in px
let s_pad_x = 25; //Starmap border
let s_pad_y = 25;
let width = s_width + (2 * s_pad_x); //Canvas width
let height = s_height + (2 * s_pad_y); //Canvas height

//Renders a starmap
function paintPaper_SVG() {
    $(svg_paper).empty();
    svg_g_grid = svg.group(svg_paper, "svg_grid");
    svg_g_spheres = svg.group(svg_paper, "svg_spheres");
    svg_gs_spheres = {};
    svg_g_clines = svg.group(svg_paper, "svg_clines");
    svg_g_stars = svg.group(svg_paper, "svg_stars");

    for (const sphereCI in spheres) {
        const grp = svg.group(svg_g_spheres, sphereCI);
        svg_gs_spheres[sphereCI] = grp;
        const sphereCollection = spheres[sphereCI];
        for (const sphereI in sphereCollection) { //Draw all texts first...
            const sphere = sphereCollection[sphereI];
            drawSphereText_SVG(grp, sphere);
        }
        for (const sphereI in sphereCollection) { //..then draw the spheres; this prevents texts from overlaying another Sphere
            const sphere = sphereCollection[sphereI];
            drawSphere_SVG(grp, sphere);
        }
        $(grp).show();
    }

    paintgrid_SVG();
    $.each(starmapdata, function (i, constellation) {
        drawConstellation_SVG(constellation);
    });

    parseTypeAhead();
    ShowSpheres(); //Hide/show default/current Spheres of Influence
    ShowStarColor(); //Set the star colors
    resizeStars(); //Recalculate star sizes (for when rerendering a starmap)
}

function paintLegend() {
    //Paint the legend
    $("#rightdata").show();
    switch (colortype) {
        case 0:
            $("#rightdata").hide();
            renderMappingLegend();
            break;
        case 1:
            renderMappingLegend(mindata_mapping, "mineral value");
            break;
        case 2:
            renderMappingLegend(biodata_mapping, "biological units");
            break;
    }
}

//Show a Sphere of Influence set
function ShowSpheres(selection) {
    if (selection != undefined && sphereSetStarmaps[selection] != undefined && sphereSetStarmaps[selection] != showingStarmap) {
        alert("This Sphere of Influence set isn't available for the " + starmapNames[showingStarmap] + " starmap!");
        return;
    }
    if (selection != undefined) {
        showingSpheres = selection;
    }
    for (const sphereCI in spheres) {
        if (sphereCI == showingSpheres) {
            $(svg_gs_spheres[sphereCI]).show();
        } else {
            $(svg_gs_spheres[sphereCI]).hide();
        }
    }
    $(".spheredata-icon").removeClass("icon-ok");
    $("#spheredata-" + showingSpheres).addClass("icon-ok");
    scheduleHashUpdate();
}

function ShowStarColor(selection) {
    if (selection != undefined) {
        colortype = selection;
    }
    let funct = function () { };
    switch (colortype) {
        case 0:
            funct = getStarColor_normal;
            break;
        case 1:
            funct = getStarColor_mineralData;
            break;
        case 2:
            funct = getStarColor_bioData;
            break;
    }
    $.each($(".circle-Star"), function (b, c) {
        const _star = $(c).data('star');
        const _const = $(c).data('constellation');
        $(c).attr('fill', funct(_star, _const));
    });
    $(".colortype-icon").removeClass("icon-ok");
    $("#colortype-" + colortype).addClass("icon-ok");
    paintLegend();
    scheduleHashUpdate();
}

function parseTypeAhead() {
    const typeAheads = [];
    $.each(starmapdata, function (constellationI, constellation) {
        $.each(constellation["stars"], function (starI, star) {
            typeAheads.push((star.id == "*" ? "" : convertPrefix(star.id) + " ") + constellation.name);
            $.each(star["planets"], function (planetI, planet) {
                if (planet["Homeworlds"] != undefined) {
                    $.each(planet["Homeworlds"], function (hmwldI, hmwld) {
                        typeAheads.push(hmwld);
                    });
                }
                if (planet["Devices"] != undefined) {
                    $.each(planet["Devices"], function (devI, devic) {
                        typeAheads.push(devic);
                    });
                }
            });
        });
    });
    $("#findstar").removeData("typeahead");
    $('#findstar').typeahead({ source: typeAheads });
}

function paintgrid_SVG() {
    const g = svg.group(svg_g_grid);
    //Vertical lines:
    for (let i = 0; i <= 10; i++) {
        const xf = s_pad_x + i * (s_width / 10);
        const yf = s_pad_y;
        const xt = xf;
        const yt = s_pad_y + s_height;
        svg.line(g, xf, yf, xt, yt);
    }
    //Horizontal lines:
    for (let i = 0; i <= 10; i++) {
        const xf = s_pad_x;
        const yf = s_pad_y + i * (s_height / 10);
        const xt = s_pad_x + s_width;
        const yt = yf;
        svg.line(g, xf, yf, xt, yt);
    }
}

function drawSphere_SVG(grp, sphere) {
    svg.circle(grp, tx(sphere.x), ty(sphere.y), ts(sphere.size), { "class": "SoI SoI-" + sphere.name });
}
function drawSphereText_SVG(grp, sphere) {
    //The small spheres around home stars (as shown at the start of Project 6014) are too small to read
    //with a font-size that scales with the sphere, so use a minimum font-size for those:
    const fontSize = Math.max(ts(sphere.size) * 0.5, 7);
    svg.text(grp, tx(sphere.x), ty(sphere.y), sphere.name, { "font-size": fontSize + "px", "class": "SoI-text SoI-" + sphere.name.replace(" ", "_") + " SoI-" + sphere.name.replace(" ", "_") + "-text" });
}

function findStar(text) {
    text = text.toLowerCase();
    if (text != "") {
        $(".circle-Star").each(function (a, b) {
            if ($(b).data("starname") != undefined) {
                let showT = false;
                if ($(b).data('starname').toLowerCase() == text) {
                    showT = true;
                }
                if ($(b).data('star') != undefined) {
                    $.each($(b).data('star')["planets"], function (planI, planet) {
                        if (planet["Homeworlds"] != undefined) {
                            $.each(planet["Homeworlds"], function (hmwldI, hmwld) {
                                if (hmwld.toLowerCase().indexOf(text) >= 0) {
                                    showT = true;
                                }
                            });
                        }
                        if (planet["Devices"] != undefined) {
                            $.each(planet["Devices"], function (devI, devic) {
                                if (devic.toLowerCase().indexOf(text) >= 0) {
                                    showT = true;
                                }
                            });
                        }
                    });
                }
                if (showT) {
                    $(b).qtip('show');
                }
            }
        });
    }
}

function highlightStar(star) {
    $(star).stop();
    $(star).animate({}, 1, _anim_star_highlight_Off); //Initializes the looping animation
    $(star).addClass("highlightedStar"); //In the future, we can use CSS3 animations for star highlights.
}

function unhighlightStar(star) {
    $(star).stop();
    $(star).animate({ "opacity": "1", "stroke-width": "1" }, 150);
    $(star).removeClass("highlightedStar");
}

function _anim_star_highlight_On() {
    $(this).animate({ "opacity": "1", "stroke-width": "1" }, 150, _anim_star_highlight_Pause);
}

function _anim_star_highlight_Pause() {
    $(this).animate({ "opacity": "1", "stroke-width": "1" }, 500, _anim_star_highlight_Off);
}

function _anim_star_highlight_Off() {
    $(this).animate({ "opacity": "0.5", "stroke-width": "9" }, 150, _anim_star_highlight_On);
}



function unhighlightAll() {
    showingHighlights = [];
    $(".circle-Star").each(function (a, b) {
        const star = $(b).data('star');
        if (star != undefined) {
            unhighlightStar(b);
        }
    });
    scheduleHashUpdate();
}

function findRainbowWorlds() {
    if (showingHighlights.indexOf("rainbow") < 0) {
        showingHighlights.push("rainbow");
    }
    $(".circle-Star").each(function (a, b) {
        let star = $(b).data('star');
        let fndR = false;
        if (star != undefined) {
            $.each(star["planets"], function (pIndex, planet) {
                if (planet.Type == "Rainbow") {
                    fndR = true;
                }
            });
            if (fndR) {
                highlightStar(b);
            }
        }
    });
    scheduleHashUpdate();
}

function findDevices() {
    if (showingHighlights.indexOf("device") < 0) {
        showingHighlights.push("device");
    }
    $(".circle-Star").each(function (a, b) {
        let star = $(b).data('star');
        let fndR = false;
        if (star != undefined) {
            $.each(star["planets"], function (pIndex, planet) {
                if (planet.Devices != undefined) {
                    fndR = true;
                }
            });
            if (fndR) {
                highlightStar(b);
            }
        }
    });
    scheduleHashUpdate();
}

function findHomeworlds() {
    if (showingHighlights.indexOf("home") < 0) {
        showingHighlights.push("home");
    }
    $(".circle-Star").each(function (a, b) {
        let star = $(b).data('star');
        let fndR = false;
        if (star != undefined) {
            $.each(star["planets"], function (pIndex, planet) {
                if (planet.Homeworlds != undefined) {
                    fndR = true;
                }
            });
            if (fndR) {
                highlightStar(b);
            }
        }
    });
    scheduleHashUpdate();
}

function addTooltip_SVG(Rnode, text) {
    $(Rnode).qtip({
        content: {
            text: text
        },
        position: {
            my: "bottom center",
            at: "top center",
            target: Rnode,
            viewport: $(Rnode)
        },
        style: {
            classes: "ui-tooltip-tipsy"
        }
    });
}

//Shows a modal dialog containing details for a star
function showModalDialogForStar() {
    let star = $(this).data("star");
    let constellation = $(this).data("constellation");
    let title = (star.id == "*" ? "" : convertPrefix(star.id) + " ") + constellation.name;
    starTableViewInstance.showStar(star, title);
}

function drawConstellation_SVG(constellation) {
    $.each(constellation["stars"], function (is, star) {
        drawStar_SVG(star, constellation);
    });
    $.each(constellation["lines"], function (il, cline) {
        drawConstellationLine_SVG(cline, constellation);
    });
}

//Transform Size (based on width)
function ts(input) {
    return (s_width / 1000) * input;
}

//Transform X
function tx(input) {
    return (s_width / 1000) * input + s_pad_x;
}

//Transform Y
function ty(input) {
    return (s_height / 1000) * (1000 - input) + s_pad_y;
}

function drawConstellationLine_SVG(cline, constellation) {
    let sfrom;
    let sto;
    for (const si in constellation["stars"]) {
        if (constellation["stars"][si].id == cline.from) {
            sfrom = constellation["stars"][si];
        }
        if (constellation["stars"][si].id == cline.to) {
            sto = constellation["stars"][si];
        }
    }
    if (sfrom != undefined && sto != undefined) {
        svg.line(svg_g_clines, tx(sfrom.x), ty(sfrom.y), tx(sto.x), ty(sto.y), { "class": "line-cline" });
    } else {
        console.log("WARNING: constellationLine not drawn (constellation=" + constellation.name + ", from=" + cline.from + ", to=" + cline.to + ")");
    }
}

function checkEnter(e) {
    return e.which !== 13;
}

const legendInstance = legend.mount('#legendbody');

function renderMappingLegend(mapping, type) {
    legendInstance.mapping = mapping;
    legendInstance.type = type;
}

const starTableViewInstance = starTable.mount("#starModal");

function drawStar_SVG(star, constellation) {
    let starname = (star.id == "*" ? "" : convertPrefix(star.id) + " ") + constellation.name;
    let gfx = svg.circle(svg_g_stars, tx(star.x), ty(star.y), (star.size + 1) * 3, { stroke: 'black', "class": "circle-Star" });
    //Circle fill color defined elsewhere (showStarColor function)
    $(gfx).data("star", star);
    $(gfx).data("starname", starname);
    $(gfx).data("constellation", constellation);
    $(gfx).data("starsize", star.size);
    addTooltip_SVG(gfx, starname);
    $(gfx).click(showModalDialogForStar);
}


window.onload = function () {
    $("#myModal").modal();
    $("#myModal").modal('hide');
}

//Keep the shared map hash when clicking menu/nav links that use href="#".
$(document).on("click", 'a[href="#"]', function (event) {
    event.preventDefault();
});

let timer;
$(document).ready(new function () {
    $('#findstar').live('change', function () {
        $(".circle-Star").qtip('hide');
        findStar_();
    });
});

function findStar_() {
    findStar($("#findstar").val());
}

function normalizeTransform(transform) {
    const matrix = transform.replace(/\s+/g, "").match(/^matrix\(([^)]+)\)$/);
    if (matrix) {
        const values = matrix[1].split(",").map(function (value) { return parseFloat(value); });
        if (values.length !== 6 || values.some(isNaN)) {
            return "";
        }
        if (values[0] === 1 && values[1] === 0 && values[2] === 0
                && values[3] === 1 && values[4] === 0 && values[5] === 0) {
            return "";
        }
        return "matrix(" + values.map(function (value) {
            return parseFloat(value.toFixed(3));
        }).join(",") + ")";
    }
    const translate = transform.replace(/\s+/g, "").match(/^translate\(([^)]+)\)$/);
    if (translate) {
        const values = translate[1].split(",").map(function (value) { return parseFloat(value); });
        if (values.length !== 2 || values.some(isNaN) || (values[0] === 0 && values[1] === 0)) {
            return "";
        }
        return "translate(" + values.map(function (value) {
            return parseFloat(value.toFixed(3));
        }).join(",") + ")";
    }
    const scale = transform.replace(/\s+/g, "").match(/^scale\(([^)]+)\)$/);
    if (scale) {
        const value = parseFloat(scale[1]);
        return isNaN(value) || value === 1 ? "" : "scale(" + parseFloat(value.toFixed(3)) + ")";
    }
    return "";
}

function getViewTransform() {
    const viewport = document.querySelector("#viewport");
    if (!viewport) {
        return "";
    }
    const transform = viewport.getAttribute("transform");
    return transform ? normalizeTransform(transform) : "";
}

function buildHash() {
    const params = new URLSearchParams();
    params.set("map", showingStarmap);
    params.set("spheres", showingSpheres);
    params.set("color", String(colortype));
    if (showingHighlights.length > 0) {
        params.set("highlight", showingHighlights.join(","));
    }
    const view = getViewTransform();
    if (view) {
        params.set("view", view);
    }
    return params.toString();
}

function writeHash() {
    const hash = "#" + buildHash();
    if (window.location.hash === hash) {
        return;
    }
    try {
        history.replaceState(null, "", hash);
    } catch (error) {
        window.location.hash = hash;
    }
}

function scheduleHashUpdate() {
    clearTimeout(hashUpdateTimer);
    hashUpdateTimer = setTimeout(writeHash, 200);
}

function applyViewTransform(transform) {
    if (!transform || !/^(matrix|translate|scale)\([-0-9.,\se]+\)$/.test(transform)) {
        return;
    }
    const viewport = document.querySelector("#viewport");
    if (!viewport) {
        return;
    }
    viewport.setAttribute("transform", transform);
    let zoom = 1;
    const matrix = transform.match(/^matrix\(([^)]+)\)$/);
    if (matrix) {
        const values = matrix[1].split(",").map(function (value) { return parseFloat(value); });
        if (values.length === 6) {
            zoom = Math.sqrt(values[0] * values[0] + values[1] * values[1]);
        }
    } else {
        const scale = transform.match(/^scale\(([^)]+)\)$/);
        if (scale) {
            zoom = parseFloat(scale[1]) || 1;
        }
    }
    if (isFinite(zoom) && zoom > 0) {
        window.totalZoom = zoom;
        if (typeof resizeStars === "function") {
            resizeStars();
        }
    }
}

function loadStateFromHash() {
    if (!svg_paper) {
        return;
    }
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) {
        return;
    }
    const params = new URLSearchParams(raw);
    const map = params.get("map");
    if (map && starmaps[map] && map !== showingStarmap) {
        displayStarmap(map);
    }
    const sphereKey = params.get("spheres");
    if (sphereKey) {
        if (sphereSetStarmaps[sphereKey] === undefined
                || sphereSetStarmaps[sphereKey] === showingStarmap) {
            ShowSpheres(sphereKey);
        } else {
            ShowSpheres(defaultSpheres[showingStarmap]);
        }
    }
    const color = parseInt(params.get("color"), 10);
    if (!isNaN(color) && color >= 0 && color <= 2) {
        ShowStarColor(color);
    }
    unhighlightAll();
    const highlights = (params.get("highlight") || "").split(",");
    if (highlights.indexOf("rainbow") >= 0) {
        findRainbowWorlds();
    }
    if (highlights.indexOf("home") >= 0) {
        findHomeworlds();
    }
    if (highlights.indexOf("device") >= 0) {
        findDevices();
    }
    applyViewTransform(params.get("view"));
    scheduleHashUpdate();
}

function copyStarmapLink() {
    clearTimeout(hashUpdateTimer);
    writeHash();
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
            alert("Link copied to clipboard.");
        }).catch(function () {
            prompt("Copy this link:", url);
        });
    } else {
        prompt("Copy this link:", url);
    }
}

function getSphereSetLabel() {
    const anchor = $("#spheredata-" + showingSpheres).parent("a").clone();
    anchor.find(".label").remove();
    return anchor.text().replace(/\s+/g, " ").trim();
}

function getExportOptions() {
    return {
        mapKey: showingStarmap,
        mapName: starmapNames[showingStarmap],
        sphereName: getSphereSetLabel() || "No spheres of influence",
        colorMode: colortype
    };
}

function showExportError(error) {
    console.error(error);
    alert("Export failed: " + (error && error.message ? error.message : error));
}

window.exportStarmapSVG = function () {
    return exportSVG(getExportOptions()).catch(showExportError);
};
window.exportStarmapPNG = function () {
    return exportPNG(getExportOptions()).catch(showExportError);
};
window.exportStarmapPDF = function (paperSize, orientation) {
    return exportPDF(getExportOptions(), paperSize, orientation).catch(showExportError);
};

// "exports" for index.html
window.displayStarmap = displayStarmap;
window.ShowSpheres = ShowSpheres;
window.ShowStarColor = ShowStarColor;
window.findRainbowWorlds = findRainbowWorlds;
window.unhighlightAll = unhighlightAll;
window.findHomeworlds = findHomeworlds;
window.findDevices = findDevices;
window.checkEnter = checkEnter;
window.copyStarmapLink = copyStarmapLink;
window.starmapViewChanged = scheduleHashUpdate;

window.addEventListener("hashchange", function () {
    loadStateFromHash();
});