const div = document.getElementById("people");

function createListWithHeadingHTML(headingStr, list) {
  const h3 = document.createElement("h3");
  h3.textContent = headingStr;
  const ul = document.createElement("ul");
  for(const item of list) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `/cmdbuild/ui/graph.html?person_id=${item._id}`;
    a.textContent = getPersonName(item);
    li.append(a);
    ul.append(li);
  }
  div.append(h3);
  div.append(ul);
}

async function getAllPersonCards() {
  const peopleAjax = await fetch('/cmdbuild/services/rest/v3/classes/Person/cards');
  const peopleJson = await peopleAjax.json();
  return peopleJson.data;
}

function getPersonCard(peopleJson, person_id) {
  for(const p of peopleJson)
    if(p._id == person_id)
      return p;
}

function getPersonName(personJson) {
  return `${personJson.last_name}, ${personJson.first_name}`;
}

async function getPersonRelations(person_id) {
  const response = await fetch(`/cmdbuild/services/rest/v3/classes/Person/cards/${person_id}/relations`);
  const json = await response.json();
  return json.data;
}

async function getStructuredPersonRelations(peopleJson, relationsJson) {
  const structuredList = {};
  for(const person of relationsJson) {
    const key = (function() {
      return person._type == "ManagerMapping" ? `${person._type} - ${person._direction}` : `${person._type}`;
    })();

    if(!structuredList[key])
      structuredList[key] = [];

    const personRecord = (function() {
      for(const p of peopleJson)
        if(p.Code == person._destinationCode)
          return p;
    })();

    structuredList[key].push(personRecord);
  }

  return structuredList;
}

(async function() {
  const peopleJson = await getAllPersonCards();

  if(Get.person_id) {
    const personJson = getPersonCard(peopleJson, Get.person_id);
    const relationsJson = await getPersonRelations(Get.person_id);
    const structuredRelations = await getStructuredPersonRelations(peopleJson, relationsJson);

    document.getElementById("person").textContent = getPersonName(personJson);
    for(const i in structuredRelations) {
      createListWithHeadingHTML(i, structuredRelations[i]);
    }
  }
  else {
    createListWithHeadingHTML("People", peopleJson);
  }
})();


function init() {
  // Since 2.2 you can also author concise templates with method chaining instead of GraphObject.make
  // For details, see https://gojs.net/latest/intro/buildingObjects.html
  const $ = go.GraphObject.make;  // for conciseness in defining templates in this function

  myDiagram =
    $(go.Diagram, "myDiagramDiv",
      {
        layout: $(DoubleTreeLayout,
          {
            //vertical: true,  // default directions are horizontal
            // choose whether this subtree is growing towards the right or towards the left:
            directionFunction: n => n.data && n.data.dir !== "left"
            // controlling the parameters of each TreeLayout:
            //bottomRightOptions: { nodeSpacing: 0, layerSpacing: 20 },
            //topLeftOptions: { alignment: go.TreeLayout.AlignmentStart },
          })
      });

  // define all of the gradient brushes
  var graygrad = $(go.Brush, "Linear", { 0: "#F5F5F5", 1: "#F1F1F1" });
  var bluegrad = $(go.Brush, "Linear", { 0: "#CDDAF0", 1: "#91ADDD" });
  var yellowgrad = $(go.Brush, "Linear", { 0: "#FEC901", 1: "#FEA200" });
  var lavgrad = $(go.Brush, "Linear", { 0: "#EF9EFA", 1: "#A570AD" });

  myDiagram.nodeTemplate =
    $(go.Node, "Auto",
      { isShadowed: true },
      // define the node's outer shape
      $(go.Shape, "RoundedRectangle",
        { fill: graygrad, stroke: "#D8D8D8" },  // default fill is gray
        new go.Binding("fill", "color")),
      // define the node's text
      $(go.TextBlock,
        { margin: 5, font: "bold 11px Helvetica, bold Arial, sans-serif" },
        new go.Binding("text", "key"))
    );

  myDiagram.linkTemplate =
    $(go.Link,  // the whole link panel
      { selectable: false },
      $(go.Shape));  // the link shape

  // create the model for the double tree; could be eiher TreeModel or GraphLinksModel
  myDiagram.model = new go.TreeModel([
    { key: "Root", color: lavgrad },
    { key: "Left1", parent: "Root", dir: "left", color: bluegrad },
    { key: "leaf1", parent: "Left1" },
    { key: "leaf2", parent: "Left1" },
    { key: "Left2", parent: "Left1", color: bluegrad },
    { key: "leaf3", parent: "Left2" },
    { key: "leaf4", parent: "Left2" },
    { key: "leaf5", parent: "Left1" },
    { key: "Right1", parent: "Root", dir: "right", color: yellowgrad },
    { key: "Right2", parent: "Right1", color: yellowgrad },
    { key: "leaf11", parent: "Right2" },
    { key: "leaf12", parent: "Right2" },
    { key: "leaf13", parent: "Right2" },
    { key: "leaf14", parent: "Right1" },
    { key: "leaf15", parent: "Right1" },
    { key: "Right3", parent: "Root", dir: "right", color: yellowgrad },
    { key: "leaf16", parent: "Right3" },
    { key: "leaf17", parent: "Right3" }
  ]);
}
window.addEventListener('DOMContentLoaded', init);
