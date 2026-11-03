# StarmapJS

This is a fairly well-featured SVG starmap for [The Ur-Quan Masters](http://sc2.sourceforge.net/) and Project 6014.

As this was written a _long_ time ago, the code is rather horrible. Have fun! ;)

The tool is available [here (GitHub Pages; tracks the master branch of this repo)](https://jorisvddonk.github.io/StarmapJS/) as well as [here (raw.githack.com; version that tracks the master branch of this repo)](https://raw.githack.com/jorisvddonk/StarmapJS/master/src/index.html) and [here (mooses.nl; older version)](http://mooses.nl/uqm/wip/js-starmap/).

## How to run locally

Simply clone this repo, then run a webserver locally from within the `src` folder, e.g. via:

```bash
cd src
npx http-server -c-1 -p 8081
```

## Importing a UQM save game

The **Game save** menu can import a vanilla UQM save (`uqmsave.NN`, with the
`UMS` header). Project 6014, UQM-HD and MegaMod saves are rejected because they
use incompatible save formats.

The import reads the game's per-planet scan records and:

- marks a star as **visited** when at least one artifact, mineral deposit or
  biological lifeform was retrieved from any of its planets or moons;
- subtracts the retrieved deposits from the planet and star mineral value,
  mineral volume and bio values, so a fully mined system reports **0**
  minerals and a fully collected planet reports **0** bio units;
- updates the mineral and biological star colour modes immediately.

Use **Game save -> Highlight visited stars** to show the visited systems, and
**Game save -> Clear imported save** to restore the original dataset. Save
data is processed locally in the browser and is not uploaded. Imported values
are not encoded in shareable map links.

## Changelog

## 1.13

Added import for vanilla UQM save games. The **Game save** menu marks systems
where an artifact, mineral or bio was retrieved as visited, and reduces the
per-planet and per-star mineral/bio totals to the amounts still available. Fully
mined systems now report 0. Includes per-deposit value data generated with the
vanilla UQM 0.8 planet generator, plus Node tests for the save parser and
resource arithmetic.

## 1.12

Map views are now shareable through the URL hash: the selected starmap, spheres of influence, star colour mode, active star highlight and pan/zoom position are all encoded. Use "Copy link to this map" in the export menu, or just copy the address bar.

## 1.11

The export menu now also offers an SVG download, and the A4 and US Letter PDF exports are available in both portrait and landscape orientation. PDF headers use in-universe chart titles ("HyperSpace Star Map", "Mineral Survey Chart", "Biological Survey Chart") instead of the app name. Also fixed the true-space legend swatches for short hex colours (red/yellow/cyan).

## 1.10

Added export options for the starmap: a PNG image, and landscape PDFs in A4 or US Letter size. The PDF includes the current starmap, the selected spheres of influence, the star colour mode and a star colour legend.

## 1.09

Project 6014's star colouring (truespace colours, mineral value and bio data) and star highlighting (rainbow worlds, homeworlds and devices) now work with data extracted from the Project 6014 game itself. Per-planet mineral and bio values were regenerated with a new `P6014_STARMAP_DUMP` mode in the game's source, and the colour legends got extra buckets for Project 6014's higher values. Because Project 6014 is set after Star Control 2, the already-acquired Taalo Shield and Shofixti Maidens are not marked as devices on the Project 6014 map; the Black Orb at the Shofixti crash site is.

## 1.08

The Project 6014 starmap now has its own Sphere of Influence selections: the official spoiler-free map (matching Project 6014's downloadable starmap) and an "ultimate spoilers" map showing every sphere of influence in Project 6014's galaxy, including the Lurg, Pkunk and Ilwrath. The data is taken from the Project 6014 game source and its starmap generator configuration.

## 1.07

If no biological hazard data is available for a planet (because there are no biological signs at all), a grey '-' label is now shown, instead of nothing.

### 1.06

?