/* global Viz */
const options = require("../options");
const ast2dot = require("./dot");
const viz_lib = require("viz.js");
const jsdom = require("jsdom");

const { JSDOM } = jsdom;

const viz = typeof viz_lib === "function" ? viz_lib : Viz;

function getBBoxFromCoordinates(pCoords) {
  let coordPairs = pCoords
    .split(/[\smlhvcsqtaz]+/i)
    .filter(pE => pE)
    .map(pE => pE.split(",").map(pEi => parseFloat(pEi)));

  let xCoords = coordPairs.map(pE => pE[0]);
  let yCoords = coordPairs.map(pE => pE[1]);

  return {
    left: Math.min(...xCoords),
    right: Math.max(...xCoords),
    top: Math.min(...yCoords),
    bottom: Math.max(...yCoords)
  };
}

function getClusterParts(pClusterElement) {
  let elements = {
    separatorLine: null,
    outerPath: null,
    clusterType: "default"
  };

  elements.separatorLine = pClusterElement.querySelector(
    "polygon:not([stroke-dasharray])"
  );
  elements.outerPath = pClusterElement.querySelector("path");

  // Check if this may be a parallel cluster state
  if (!elements.outerPath) {
    elements.outerPath = pClusterElement.querySelector(
      "polygon[stroke-dasharray]"
    );
    elements.clusterType = "parallel";
  }

  // Sanity check
  if (!elements.separatorLine || !elements.outerPath) return null;

  return elements;
}

function adjustParallelCluster(pClusterParts) {
  const parent = pClusterParts.outerPath.parentNode;
  let bboxOuter = getBBoxFromCoordinates(
    pClusterParts.outerPath.getAttribute("points")
  );
  let bboxSeparator = getBBoxFromCoordinates(
    pClusterParts.separatorLine.getAttribute("points")
  );

  let lineElement = parent.ownerDocument.createElement("line");

  lineElement.setAttribute("stroke-dasharray", "5,2");
  lineElement.setAttribute(
    "stroke",
    pClusterParts.separatorLine.getAttribute("stroke")
  );
  lineElement.setAttribute("x1", bboxOuter.left);
  lineElement.setAttribute("y1", bboxSeparator.top);
  lineElement.setAttribute("x2", bboxOuter.right);
  lineElement.setAttribute("y2", bboxSeparator.top);

  parent.removeChild(pClusterParts.separatorLine);
  parent.append(lineElement);
}

function adjustDefaultCluster(pClusterParts) {
  let bboxOuter = getBBoxFromCoordinates(
    pClusterParts.outerPath.getAttribute("d")
  );
  let bboxSeparator = getBBoxFromCoordinates(
    pClusterParts.separatorLine.getAttribute("points")
  );

  pClusterParts.separatorLine.setAttribute(
    "points",
    `${bboxOuter.left},${bboxSeparator.top} ${bboxOuter.right},${bboxSeparator.top}`
  );
}

function adjustCluster(pClusterElement) {
  // Get relevant elements of cluster
  let clusterParts = getClusterParts(pClusterElement);

  // Sanity check
  if (!clusterParts) return;

  // Adjust according to type
  switch (clusterParts.clusterType) {
    case "parallel":
      adjustParallelCluster(clusterParts);
      break;
    case "default":
      adjustDefaultCluster(clusterParts);
      break;
    default:
      return;
  }
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
    document.querySelectorAll("svg g.cluster polygon:not([stroke-dasharray])"),
    [pElement => pElement.parentNode]
  );

  // Adjust clusters
  clusters.forEach(pE => adjustCluster(pE));

  return dom.serialize();
};
