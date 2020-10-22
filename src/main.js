import map_sc2 from "./data/map_sc2.js";
import map_p6014 from "./data/map_p6014.js";
import starmap_spheres from "./data/starmap-spheres.js";
import { mindata_mapping, biodata_mapping } from "./data/starmap-colormapping.js";

const starmaps = {
    sc2: map_sc2,
    p6014: map_p6014
}; //filled in the various map JS files
var starmapdata;
const spheres = starmap_spheres; // Filled in starmap-spheres.js            
//
//Starmap settings on load:
var showingSpheres = "oldSpheres";
var showingStarmap = "sc2";
var colortype = 0;

//SVG:
var svg;
var svg_paper;
var svg_g_grid;
var svg_g_clines;
var svg_g_stars;
var svg_g_spheres;
var svg_gs_spheres;

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
}

function displayStarmap(starmapName) {
    showingStarmap = starmapName;
    starmapdata = starmaps[starmapName];
    $(".starmapdata-icon").removeClass("icon-ok");
    $("#starmapdata-" + starmapName).addClass("icon-ok");

    paintPaper_SVG();
}

var s_width = 750; //Inner starmap width in px
var s_height = 750; //Inner starmap height in px
var s_pad_x = 25; //Starmap border
var s_pad_y = 25;
var width = s_width + (2 * s_pad_x); //Canvas width
var height = s_height + (2 * s_pad_y); //Canvas height

//Renders a starmap
function paintPaper_SVG() {
    $(svg_paper).empty();
    svg_g_grid = svg.group(svg_paper, "svg_grid");
    svg_g_spheres = svg.group(svg_paper, "svg_spheres");
    svg_gs_spheres = {};
    svg_g_clines = svg.group(svg_paper, "svg_clines");
    svg_g_stars = svg.group(svg_paper, "svg_stars");

    for (const sphereCI in spheres) {
        var grp = svg.group(svg_g_spheres, sphereCI);
        svg_gs_spheres[sphereCI] = grp;
        var sphereCollection = spheres[sphereCI];
        for (const sphereI in sphereCollection) { //Draw all texts first...
            var sphere = sphereCollection[sphereI];
            drawSphereText_SVG(grp, sphere);
        }
        for (const sphereI in sphereCollection) { //..then draw the spheres; this prevents texts from overlaying another Sphere
            var sphere = sphereCollection[sphereI];
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

//Show a Sphere of Influece set
function ShowSpheres(selection) {
    if ((selection == "oldSpheres" || selection == "newSpheres") && showingStarmap == "p6014") {
        alert("These spheres of Influence aren't available for the Project 6014 starmap!");
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
}

function ShowStarColor(selection) {
    if (selection != undefined) {
        colortype = selection;
    }
    var funct = function () { };
    switch (colortype) {
        case 0:
            funct = getColor_norm;
            break;
        case 1:
            funct = getColor_minData;
            break;
        case 2:
            funct = getColor_bioData;
            break;
    }
    $.each($(".circle-Star"), function (b, c) {
        var _star = $(c).data('star');
        var _const = $(c).data('constellation');
        $(c).attr('fill', funct(_star, _const));
    });
    $(".colortype-icon").removeClass("icon-ok");
    $("#colortype-" + colortype).addClass("icon-ok");
    paintLegend();
}

function parseTypeAhead() {
    var typeAheads = [];
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
    var g = svg.group(svg_g_grid);
    //Vertical lines:
    for (var i = 0; i <= 10; i++) {
        const xf = s_pad_x + i * (s_width / 10);
        const yf = s_pad_y;
        const xt = xf;
        const yt = s_pad_y + s_height;
        svg.line(g, xf, yf, xt, yt);
    }
    //Horizontal lines:
    for (var i = 0; i <= 10; i++) {
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
    svg.text(grp, tx(sphere.x), ty(sphere.y), sphere.name, { "font-size": ts(sphere.size) * 0.5 + "px", "class": "SoI-text SoI-" + sphere.name.replace(" ", "_") + " SoI-" + sphere.name.replace(" ", "_") + "-text" });
}

function findStar(text) {
    text = text.toLowerCase();
    if (text != "") {
        $(".circle-Star").each(function (a, b, c) {
            if ($(b).data("starname") != undefined) {
                showT = false;
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
    $(".circle-Star").each(function (a, b, c) {
        var star = $(b).data('star');
        if (star != undefined) {
            unhighlightStar(b);
        }
    });
}

function findRainbowWorlds() {
    $(".circle-Star").each(function (a, b, c) {
        var star = $(b).data('star');
        var fndR = false;
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
}

function findDevices() {
    $(".circle-Star").each(function (a, b, c) {
        var star = $(b).data('star');
        var fndR = false;
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
}

function findHomeworlds() {
    $(".circle-Star").each(function (a, b, c) {
        var star = $(b).data('star');
        var fndR = false;
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
    var star = $(this).data("star");
    var constellation = $(this).data("constellation");

    var table2inner = "";
    var numplanets = 0;
    $.each(star["planets"], function (planetID, planet) {
        numplanets += 1;
        let devicesStr = " ";
        let homeworldsStr = " "
        if (planet["Devices"] != undefined) {
            $.each(planet["Devices"], function (deviceIndex, device) {
                devicesStr += " <span class=\"label\">Device: " + device + "</span>";
            });
        }
        if (planet["Homeworlds"] != undefined) {
            $.each(planet["Homeworlds"], function (homeworldIndex, homeworld) {
                homeworldsStr += " <span class=\"label label-info\">" + homeworld + " Homeworld</span>";
            });
        }
        table2inner += "<tr><td>" + planetID + devicesStr + homeworldsStr + "</td><td>" + planet.Type + "</td><td>" + planet.MinVolume + "</td><td>" + planet.MinValue + "</td><td>" + planet.BioUnits + "</td><td>" + getHazardBadge(planet.Tectonics, "tectonics") + getHazardBadge(planet.Weather, "weather") + getHazardBadge(planet.Thermal, "thermal") + (parseInt(planet.BioUnits) > 0 ? getHazardBadge(planet.BioHazard, "biological") : getHazardBadge("-", "biological")) + "</td></tr>";
    });

    var table_contents = "";
    if (star["planetsInfo"] != undefined) {
        table_contents = "<tbody>" +
            "<tr><th>Bio data</th><td>" + star["planetsInfo"]["BioUnits"] + "</td></tr>" +
            "<tr><th>Mineral data</th><td>" + star["planetsInfo"]["MinValue"] + "</td></tr>" +
            "<tr><th>Number of worlds</th><td>" + numplanets + "</td></tr>" +
            "</tbody>";
    }

    var table = $("<div><table class=\"table table-striped table-bordered table-condensed\">" + table_contents + "</table>"
        + "</div>");
    var table2 = $("<div><table class=\"table table-striped table-bordered table-condensed\"><thead><tr><th>Planet ID</th><th>Type</th><th>Minerals (volume)</th><th>Minerals (value)</th><th>Bio Data</th><th>Hazards (Tec/Wet/Therm/Bio)</th></tr></thead><tbody>" +
        table2inner +
        "</tbody></table></div>");

    var title = (star.id == "*" ? "" : convertPrefix(star.id) + " ") + constellation.name;
    var content = table.html() + table2.html();
    showModal(title, content);
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
    var sfrom;
    var sto;
    for (const si in constellation["stars"]) {
        if (constellation["stars"][si].id == cline.from) {
            sfrom = constellation["stars"][si];
        }
        if (constellation["stars"][si].id == cline.to) {
            sto = constellation["stars"][si];
        }
    }
    if (sfrom != undefined && sto != undefined) {
        var gfx = svg.line(svg_g_clines, tx(sfrom.x), ty(sfrom.y), tx(sto.x), ty(sto.y), { "class": "line-cline" });
        //                    gfx.attr("stroke", "#000");
        //                    gfx.attr("z-index", "-1");
        //                    gfx.toBack();
    } else {
        console.log("WARNING: constellationLine not drawn (constellation=" + constellation.name + ", from=" + cline.from + ", to=" + cline.to + ")");
    }
}

function convertPrefix(prefix) {
    //Converts a 'prefix' ('A', 'B') to a proper name ("Alpha", "Beta")
    prefix = prefix.toLowerCase();
    //alpha, beta, gamma, delta, epsilon, zeta, eta, theta, iota, kappa, lambda, mu, nu, xi, omicron, pi, rho, sigma, tau, upsilon, phi, chi, psi, omega
    switch (prefix) {
        case "a":
            return "Alpha";
        case "b":
            return "Beta";
        case "c":
            return "Gamma";
        case "d":
            return "Delta";
        case "e":
            return "Epsilon";
        case "f":
            return "Zeta";
        case "g":
            return "Eta";
        case "h":
            return "Theta";
        case "i":
            return "Iota";
        case "j":
            return "Kappa"; //This isn't wrong, no.
        case "k":
            return "Lambda";
        case "l":
            return "Mu";
        case "m":
            return "Nu";
        case "n":
            return "Xi";
        case "o":
            return "Omicron";
        case "p":
            return "Pi";
        case "q":
            return "Rho";
        case "r":
            return "Sigma";
        case "s":
            return "Tau";
        case "t":
            return "Upsilon";
        case "u":
            return "Phi";
        case "*":
            return "Prime";
        default:
            return "UNKNOWN";
    }
}

function getColor_minData(star, constellation) {
    var rvalue = getMinData(star, constellation);
    return getColor_FromMapping(rvalue, mindata_mapping);
}

function getNumBodies(star, constellation) {
    var rvalue = 0;
    for (const s in planetdata) {
        pd = planetdata[s];
        if (pd.Cluster.toUpperCase() == constellation.name.toUpperCase()) {
            if (pd.Star == convertPrefix(star.id)) {
                rvalue += 1;
            }
        }
    }
    return rvalue;
}

function getMinData(star, constellation) {
    return parseInt(star["planetsInfo"]["MinValue"]);
}

function getBioData(star, constellation) {
    return parseInt(star["planetsInfo"]["BioUnits"]);
}

function getColor_FromMapping(value, mapping) {
    value = parseInt(value);
    for (const m in mapping) {
        const cmap = mapping[m];
        if (value >= cmap.min && value <= cmap.max) {
            return cmap.color;
        }
    }
    console.log("Error: VALUE IS " + value + ", no color data mapped in " + mapping);
    return "#BEBEBE";
}

function getColor_bioData(star, constellation) {
    var rvalue = getBioData(star, constellation);
    return getColor_FromMapping(rvalue, biodata_mapping);
}


function getColor_norm(star, constellation) {
    if (star.color.toUpperCase() == "BLUE") {
        return "#1464FF";
    }
    if (star.color.toUpperCase() == "ORANGE") {
        return "#FF6400";
    }
    if (star.color.toUpperCase() == "GREEN") {
        return "#00C800";
    }
    if (star.color.toUpperCase() == "RED") {
        return "#f00";
    }
    if (star.color.toUpperCase() == "WHITE" || star.color.toUpperCase() == "GRAY") {
        return "#C8EBEB";
    }
    if (star.color.toUpperCase() == "YELLOW") {
        return "#ff0";
    }
    if (star.color.toUpperCase() == "CYAN") {
        return "#0ff";
    }
    if (star.color.toUpperCase() == "PURPLE") {
        return "#800080";
    }
    if (star.color.toUpperCase() == "VIOLET") {
        return "#7F00FF";
    }
}

function showModal(title, content) {
    $("#modalHeader").html(title);
    $("#modalBody").html(content);
    $("#myModal").modal('show');
}

function checkEnter(e) {
    return e.which !== 13;
}

function getHazardLevelCSS(level, type) {
    level = parseInt(level);
    return "badge-planet-hazard" + level + (type == undefined ? "" : " badge-planet-hazard-" + type + " badge-planet-hazard" + level + "-" + type);
}

function getHazardBadge(value, type) {
    return "<span class=\"badge " + getHazardLevelCSS(value, type) + "\">" + value + "</span>";
}

function renderMappingLegend(mapping, type) {
    $("#legendbody").children().remove();
    if (mapping != undefined) {
        for (const m in mapping) {
            const cmap = mapping[m];
            $("#legendbody").append($("<tr><td><span class=\"label\" style=\"background-color:" + cmap.color + "; color:#000\">[" + cmap.min + ", " + cmap.max + "]</span>" + (type != undefined ? " " + type : "") + "</td></td></tr>"));
        }
    }
}

function drawStar_SVG(star, constellation) {
    var starname = (star.id == "*" ? "" : convertPrefix(star.id) + " ") + constellation.name;
    var gfx = svg.circle(svg_g_stars, tx(star.x), ty(star.y), (star.size + 1) * 3, { stroke: 'black', "class": "circle-Star" });
    //Circle fill color defined elsewhere (showStarColor function)
    $(gfx).data("star", star);
    $(gfx).data("starname", starname);
    $(gfx).data("constellation", constellation);
    $(gfx).data("starsize", star.size);
    addTooltip_SVG(gfx, starname);
    $(gfx).click(showModalDialogForStar);
}


window.onload = function () {
    checkFailIE();
    $("#myModal").modal();
    $("#myModal").modal('hide');
}

//Check if the user is using a IE which may cause troubles
function checkFailIE() {
    if ($.browser.msie) {
        alert("Attention, interloper! Heed this recorded message!\r\n\r\n" +
            "This message dialog speaks with the voice and authority of the Ur-Quan!\r\n" +
            "Your webbrowser does not meet standard Hierarchy Identification transmissions and is therefore deemed to be..\r\n" +
            "..Internet Explorer!\r\n\r\n" +
            "This is not permissible! Only different browsers (Google Chrome, Firefox) are tolerated!\r\n\r\n" +
            "You are commanded to switch browser immediately and await the arrival of the Ur-Quan!\r\n" +
            "Disobediance WILL be met with strange bugs and lack of functionality.");
    }
}

var timer;
$(document).ready(new function () {
    $('#findstar').live('change', function () {
        $(".circle-Star").qtip('hide');
        findStar_();
    });
});

function findStar_() {
    findStar($("#findstar").val());
}

// "exports" for index.html
window.displayStarmap = displayStarmap;
window.ShowSpheres = ShowSpheres;
window.ShowStarColor = ShowStarColor;
window.findRainbowWorlds = findRainbowWorlds;
window.unhighlightAll = unhighlightAll;
window.findHomeworlds = findHomeworlds;
window.findDevices = findDevices;
