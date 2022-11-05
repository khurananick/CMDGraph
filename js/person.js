const div = document.getElementById("people");

/*
 * Outputs html h3 and ul element.
 * <h3>headingStr</h3>
 * <ul>
 *   <li>{person_record}</li>
 * </ul>
 */
function createListWithHeadingHTML(headingStr, list) {
  const h3 = document.createElement("h3");
  h3.textContent = headingStr;
  const ul = document.createElement("ul");
  for(const item of list) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `/cmdbuild/ui/graph.html?person_id=${item._id}`;
    a.textContent = `${item.last_name}, ${item.first_name}`;
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

(async function() {
  const peopleJson = await getAllPersonCards();

  if(Get.person_id) {
    const response = await fetch(`/cmdbuild/services/rest/v3/classes/Person/cards/${Get.person_id}/relations`);
    const json = await response.json();
    console.log(json);

    const structuredList = {};
    for(const person of json.data) {
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
    for(const i in structuredList) {
      createListWithHeadingHTML(i, structuredList[i]);
    }
  }
  else {
    createListWithHeadingHTML("People", peopleJson);
  }
})();
