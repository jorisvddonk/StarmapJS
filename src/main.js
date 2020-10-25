/* global $, resizeStars, initSVGPan */
import map_sc2 from "./data/map_sc2.js";
import map_p6014 from "./data/map_p6014.js";
import starmap_spheres from "./data/starmap-spheres.js";
import { mindata_mapping, biodata_mapping } from "./data/starmap-colormapping.js";
import { convertPrefix, getStarColor_normal } from "./util.js";

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
}

function displayStarmap(starmapName) {
    showingStarmap = starmapName;
    starmapdata = starmaps[starmapName];
    $(".starmapdata-icon").removeClass("icon-ok");
    $("#starmapdata-" + starmapName).addClass("icon-ok");

    paintPaper_SVG();
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
    let funct = function () { };
    switch (colortype) {
        case 0:
            funct = getStarColor_normal;
            break;
        case 1:
            funct = getColor_minData;
            break;
        case 2:
            funct = getColor_bioData;
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
    svg.text(grp, tx(sphere.x), ty(sphere.y), sphere.name, { "font-size": ts(sphere.size) * 0.5 + "px", "class": "SoI-text SoI-" + sphere.name.replace(" ", "_") + " SoI-" + sphere.name.replace(" ", "_") + "-text" });
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
    $(".circle-Star").each(function (a, b) {
        const star = $(b).data('star');
        if (star != undefined) {
            unhighlightStar(b);
        }
    });
}

function findRainbowWorlds() {
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
}

function findDevices() {
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
}

function findHomeworlds() {
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

function getColor_minData(star, constellation) {
    let rvalue = getMinData(star, constellation);
    return getColor_FromMapping(rvalue, mindata_mapping);
}

function getMinData(star) {
    return parseInt(star["planetsInfo"]["MinValue"]);
}

function getBioData(star) {
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
    let rvalue = getBioData(star, constellation);
    return getColor_FromMapping(rvalue, biodata_mapping);
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

const Legend = {
    data() {
        return {
            mapping: undefined,
            type: undefined
        }
    },
    methods: {
        useLegend(mapping, type) {
            this.mapping = mapping;
            this.type = type;
        }
    }
};
const legend = Vue.createApp(Legend).mount('#legendbody');

function renderMappingLegend(mapping, type) {
    legend.mapping = mapping;
    legend.type = type;
}

const StarTableView = {
    data() {
        return {
            opened: false,
            star: undefined,
            headerText: undefined,
        }
    },
    methods: {
        showStar(star, starName) {
            this.opened = true;
            this.star = star;
            this.headerText = starName;
        },
        close() {
            this.opened = false;
        }
    }
}
const app = Vue.createApp(StarTableView);
app.component('hazard', {
    props: ["hazardType", "hazardValue"],
    computed: {
        hValue: function () {
            return this.hazardValue !== undefined && this.hazardValue !== "" ? this.hazardValue : '-'
        }
    },
    template: `
      <span class="badge" v-bind:class="[
        'badge-planet-hazard-' + hazardType,
        'badge-planet-hazard' + hValue,
        'badge-planet-hazard' + hValue + '-' + hazardType,
        ]">{{hValue}}</span>
    `
});
app.component('device', {
    props: ["device"],
    template: `
      <span class="label">Device: {{device}}</span>
    `
});
app.component('homeworld', {
    props: ["homeworld"],
    template: `
      <span class="label label-info">{{homeworld}} Homeworld</span>
    `
});
const starTableViewInstance = app.mount("#starModal");

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

// "exports" for index.html
window.displayStarmap = displayStarmap;
window.ShowSpheres = ShowSpheres;
window.ShowStarColor = ShowStarColor;
window.findRainbowWorlds = findRainbowWorlds;
window.unhighlightAll = unhighlightAll;
window.findHomeworlds = findHomeworlds;
window.findDevices = findDevices;
window.checkEnter = checkEnter;