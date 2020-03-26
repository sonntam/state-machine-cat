/* global Viz */
const options = require("../options");
const ast2dot = require("./dot");
const viz_lib = require("viz.js");
const jsdom = require("jsdom");

const { JSDOM } = jsdom;

const viz = typeof viz_lib === "function" ? viz_lib : Viz;

function adjustClusters(pClusterElement) {
  let separatorLine = pClusterElement.querySelector("polygon");
  let outerPath = pClusterElement.querySelector("path");

  // Sanity check
  if (!separatorLine || !outerPath) return;

  // Get width (min/max x coordinates) of cluster from the path
  let xCoords = outerPath
    .getAttribute("d")
    .split(/[\smlhvcsqtaz]+/i)
    .filter(pE => pE)
    .map(pE => parseFloat(pE.split(",")[0]));

  let xCoordMin = Math.min(...xCoords);
  let xCoordMax = Math.max(...xCoords);

  // Get y coordinate
  let yCoord = parseFloat(
    separatorLine
      .getAttribute("points")
      .trim()
      .split(" ", 1)[0]
      .split(",")[1]
  );

  // Set new coordinates
  separatorLine.setAttribute(
    "points",
    `${xCoordMin},${yCoord} ${xCoordMax},${yCoord}`
  );
}

module.exports = (pAST, pOptions) => {
  let result = viz(ast2dot(pAST, pOptions), {
    engine: options.getOptionValue(pOptions, "engine")
  });

  // Modify viz.js generated svg elements using jsdom
  const dom = new JSDOM(result);
  const { document } = dom.window;

  // Get all cluster elements with a state description
  let clusters = Reflect.apply(
    Array.prototype.map,
    document.querySelectorAll("svg g.cluster polygon"),
    [pElement => pElement.parentNode]
  );

  // Adjust clusters
  clusters.forEach(pE => adjustClusters(pE));

  return dom.serialize();
};
