const div = document.getElementById("people");

function initGoJs(data) {
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

  myDiagram.linkTemplate =
    $(go.Link,  // the whole link panel
      { selectable: false },
      $(go.Shape));  // the link shape

  myDiagram.addDiagramListener("ObjectSingleClicked",
    function(e) {
      if(Number(e.subject.cc))
        document.location = `/cmdbuild/ui/CMDGraph/index.html?person_id=${e.subject.cc}`;
    });

  // create the model for the double tree; could be eiher TreeModel or GraphLinksModel
  myDiagram.model = new go.TreeModel(data);
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

(async function() {
  const peopleJson = await getAllPersonCards();

  if(Get.person_id) {
    const personJson = getPersonCard(peopleJson, Get.person_id);
    const relationsJson = await getPersonRelations(Get.person_id);
    const structuredRelations = await getStructuredPersonRelations(peopleJson, relationsJson);

    let goJsData = createGoJsFormattedData(personJson, personJson, structuredRelations);

    for(const relations of Object.values(structuredRelations)) {
      for(const relationPersonJson of relations) {
        const relationPersonRelationsJson = await getPersonRelations(relationPersonJson._id);
        const relationPersonStructuredRelations = await getStructuredPersonRelations(peopleJson, relationPersonRelationsJson);
        goJsData = goJsData.concat(createGoJsFormattedData(null, relationPersonJson, relationPersonStructuredRelations));
      }
    }

    console.log(goJsData);

    initGoJs(goJsData);

    /*
    //document.getElementById("person").textContent = getPersonName(personJson);
    for(const i in structuredRelations) {
      createListWithHeadingHTML(i, structuredRelations[i]);
    }
    */
  }
  else {
    createListWithHeadingHTML("People", peopleJson);
  }
})();


/*
[
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
]
 */
