const div = document.getElementById("people");

function init(nodeDataArray, linkDataArray) {
  // Since 2.2 you can also author concise templates with method chaining instead of GraphObject.make
  // For details, see https://gojs.net/latest/intro/buildingObjects.html
  const $ = go.GraphObject.make;  // for conciseness in defining templates

  myDiagram =
    $(go.Diagram, "myDiagramDiv",  // must name or refer to the DIV HTML element
      {
        initialAutoScale: go.Diagram.Uniform,  // an initial automatic zoom-to-fit
        contentAlignment: go.Spot.Center,  // align document to the center of the viewport
        layout:
          $(go.ForceDirectedLayout,  // automatically spread nodes apart
            { maxIterations: 200, defaultSpringLength: 30, defaultElectricalCharge: 100 })
      });

  myDiagram.addDiagramListener("ObjectSingleClicked",
    function(e) {
      if(Number(e.subject.cc))
        document.location = `/cmdbuild/ui/CMDGraph/index.html?person_id=${e.subject.cc}`;
    });

  // define each Node's appearance
  myDiagram.nodeTemplate =
    $(go.Node, "Vertical",
      $(go.TextBlock,
        { margin: new go.Margin(3, 0, 0, 0),
          maxSize: new go.Size(100, 30),
          isMultiline: false,
          font: "bold 10pt sans-serif" },
        new go.Binding("text", "key")),
      $(go.Picture,
        { maxSize: new go.Size(50, 50) },
        new go.Binding("source", "img")),
      $(go.TextBlock,
        { margin: new go.Margin(3, 0, 0, 0),
          maxSize: new go.Size(100, 30),
          isMultiline: false },
        new go.Binding("text", "id"))
    );

  // replace the default Link template in the linkTemplateMap
  myDiagram.linkTemplate =
    $(go.Link,  // the whole link panel
      $(go.Shape,  // the link shape
        { stroke: "black" }),
      $(go.Shape,  // the arrowhead
        { toArrow: "standard", stroke: null }),
      $(go.Panel, "Auto",
        $(go.Shape,  // the label background, which becomes transparent around the edges
          {
            fill: $(go.Brush, "Radial", { 0: "rgb(240, 240, 240)", 0.3: "rgb(240, 240, 240)", 1: "rgba(240, 240, 240, 0)" }),
            stroke: null
          }),
        $(go.TextBlock,  // the label text
          {
            textAlign: "center",
            font: "10pt helvetica, arial, sans-serif",
            stroke: "#555555",
            margin: 4
          },
          new go.Binding("text", "text"))
      )
    );
  myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
}

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

function mappingDisplayName(mapName) {
  if(mapName == "ManagerMapping - inverse")
    return "Direct Report"
  if(mapName == "ManagerMapping - direct")
    return "Manager"
  if(mapName == "AEtoSEMapping")
    return "AE/SE"
  if(mapName == "TeamMateMapping")
    return "Team Member"

  return mapName;
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

    personRecord.relationType = key;
    structuredList[key].push(personRecord);
  }

  delete structuredList['PodMemberMapping'];
  return structuredList;
}

function createGoJsFormattedData(root, parent, structuredRelations) {
  function getDirection(relationType) {
    if(relationType == 'TeamMateMapping') return 'left';
    if(relationType == 'ManagerMapping - inverse') return 'left';
    return 'right';
  }

  const arr = [];

  if(root)
    arr.push({
      key: getPersonName(root),
      id: root._id
    });

  for(const relations of Object.values(structuredRelations)) {
    for(const relation of relations) {
      arr.push({
        key: getPersonName(relation),
        id: relation._id,
        parent: getPersonName(parent),
        dir: getDirection(relation.relationType)
      });
    }
  }
  return arr;
}

let nodeDataObj = {};
let nodeDataArray = [];
function updateNodeData(personJson, structuredRelations) {
  nodeDataObj[personJson.Code] = {
    key: personJson.Code,
    text: getPersonName(personJson),
    id: personJson._id
  };

  for(const relations of Object.values(structuredRelations)) {
    for(const relationPersonJson of relations) {
      nodeDataObj[relationPersonJson.Code] = {
        key: relationPersonJson.Code,
        text: getPersonName(relationPersonJson),
        id: relationPersonJson._id
      };
    }
  }

  nodeDataArray = Object.values(nodeDataObj);
}

let linkDataArray = [];
function updateLinkData(personJson, structuredRelations) {
  function findExistingMapping(relation) {
    for (const link of linkDataArray) {
      if((link.to == personJson.Code && link.from == relation.Code) || (link.to ==  relation.Code && link.from == personJson.Code))
        return true;
    }
  }

  for(const relations of Object.values(structuredRelations)) {
    for(const relation of relations) {
      linkDataArray.push({
        from: personJson.Code, to: relation.Code, text: mappingDisplayName(relation.relationType)
      })
    }
  }
}

(async function() {
  const peopleJson = await getAllPersonCards();

  if(Get.person_id) {
    const personJson = getPersonCard(peopleJson, Get.person_id);
    const relationsJson = await getPersonRelations(Get.person_id);
    const structuredRelations = await getStructuredPersonRelations(peopleJson, relationsJson);
    updateNodeData(personJson, structuredRelations);
    updateLinkData(personJson, structuredRelations);

    for(const relations of Object.values(structuredRelations)) {
      for(const relationPersonJson of relations) {
        const relationPersonRelationsJson = await getPersonRelations(relationPersonJson._id);
        const relationPersonStructuredRelations = await getStructuredPersonRelations(peopleJson, relationPersonRelationsJson);
        updateNodeData(relationPersonJson, relationPersonStructuredRelations);
        updateLinkData(relationPersonJson, relationPersonStructuredRelations);
      }
    }

    console.log(nodeDataArray);
    console.log(linkDataArray);

    init(nodeDataArray, linkDataArray)
  }
  else {
    createListWithHeadingHTML("People", peopleJson);
  }
})();
/*
 for(const relationPersonJson of relations) {
-        const relationPersonRelationsJson = await getPersonRelations(relationPersonJson._id);
-        const relationPersonStructuredRelations = await getStructuredPersonRelations(peopleJson, relationPersonRelationsJson);
-        goJsData = goJsData.concat(createGoJsFormattedData(null, relationPersonJson, relationPersonStructuredRelations));
       var nodeDataArray = [
        { key: 1, text: "Concept Maps" },
        { key: 2, text: "Organized Knowledge" },
        { key: 3, text: "Context Dependent" },
        { key: 4, text: "Concepts" },
        { key: 5, text: "Propositions" },
        { key: 6, text: "Associated Feelings or Affect" },
        { key: 7, text: "Perceived Regularities" },
        { key: 8, text: "Labeled" },
        { key: 9, text: "Hierarchically Structured" },
        { key: 10, text: "Effective Teaching" },
        { key: 11, text: "Crosslinks" },
        { key: 12, text: "Effective Learning" },
        { key: 13, text: "Events (Happenings)" },
        { key: 14, text: "Objects (Things)" },
        { key: 15, text: "Symbols" },
        { key: 16, text: "Words" },
        { key: 17, text: "Creativity" },
        { key: 18, text: "Interrelationships" },
        { key: 19, text: "Infants" },
        { key: 20, text: "Different Map Segments" }
      ];
      var linkDataArray = [
        { from: 1, to: 2, text: "represent" },
        { from: 2, to: 3, text: "is" },
        { from: 2, to: 4, text: "is" },
        { from: 2, to: 5, text: "is" },
        { from: 2, to: 6, text: "includes" },
        { from: 2, to: 10, text: "necessary\nfor" },
        { from: 2, to: 12, text: "necessary\nfor" },
        { from: 4, to: 5, text: "combine\nto form" },
        { from: 4, to: 6, text: "include" },
        { from: 4, to: 7, text: "are" },
        { from: 4, to: 8, text: "are" },
        { from: 4, to: 9, text: "are" },
        { from: 5, to: 9, text: "are" },
        { from: 5, to: 11, text: "may be" },
        { from: 7, to: 13, text: "in" },
        { from: 7, to: 14, text: "in" },
        { from: 7, to: 19, text: "begin\nwith" },
        { from: 8, to: 15, text: "with" },
        { from: 8, to: 16, text: "with" },
        { from: 9, to: 17, text: "aids" },
        { from: 11, to: 18, text: "show" },
        { from: 12, to: 19, text: "begins\nwith" },
        { from: 17, to: 18, text: "needed\nto see" },
        { from: 18, to: 20, text: "between" }
      ];
 */

