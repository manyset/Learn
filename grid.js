import ms from './msLib/ms.js'
await ms.ready();


//  ms.insert(g, 'GridSlot1');  // Just append to div /container.     

//ms.el.button("btnGrid").onclick = ms.call(grid);  // Auto pass event as argument. Can also pass custom args. See menu_simplest.html for example.

ms.id('btnGridLocalPagingLocalJoin').onclick = GridLocalPaging_LocalJoin;
ms.id('btnGridServerPagingLocalJoin').onclick = GridServerPaging_LocalJoin;
ms.id('btnGrid').onclick = grid;

ms.id('btnRead').onclick = ReadGrid;
ms.id('btnWrite').onclick = WriteGird;
ms.el.button('btnWrite').onclick = WriteGird;

let g = null;
//gridDemo();


async function GridLocalPaging_LocalJoin() {
  // Only one server request.
  // JSON contains separated item set, item-country and countries.

  // fetch ALL data sets
  const data = await ms.http.get("Inventory", "/itemsData");

  // fill combo
  const countryCombo = ms.form.combo();
  countryCombo.multiSelect = true;
  countryCombo.data = ms.data(data.countries);

  // fill grid
  const g = ms.form.grid();
  g.pageSize = 10;
  g.hiddenFields = "CID";



  g.data = ms.data(data.items); // plain grid of items
  g.dataJoin(data.itemsCountry, "id=itemId"); // joining items to countries. (id exist in items and itemId in itemsCountry table)

  // attach visual combo of countries to grid
  g.comboFields.add(countryCombo);

  await ms.insert(g, "GridLocalPagingLocalJoin");
}

async function GridServerPaging_LocalJoin() {

  // STEP 1: grid fill
  const g = ms.form.grid();
  // g.pageSize = 10;
  g.data = ms.data("Inventory", "/itemsDataGrid", "items");
  g.dataJoin("itemsCountry", "id=itemId");

  // STEP 2: combo fill
  const countryCombo = ms.form.combo();
  countryCombo.multiSelect = true;
  countryCombo.data = ms.data("Inventory", "/itemsDataGrid", "countries", true);

  // STEP 3: Attach combo to grid.
  g.comboFields.add(countryCombo);

  // STEP 4 : mount
  await ms.insert(g, "GridServerPagingLocalJoin");

}

async function xgrid() {

  g = ms.form.grid();
  g.pageSize = 10;

  g.data = ms.data("Inventory", "/items");
  //g.dataJoin("Inventory", "/itemsCountry", "id=itemId");
  /* // this itemsCountry data set has one to many country ids. Eg. --> {"itemId":"1", "CID":"UK", {"itemId":"1", "CID":"USA"},.. 
  // And this rec set will linked to above g.data and build this --> 
   (2 rec sets must have same key field. above "/items"  has id field and "/itemsCountry" has itemId field) --> .. Date: "13/12/20", CID: ["5", "4"], ...

*/
  await ms.insert(g, 'grid1');
  //await g.refresh();
  return;
}


async function grid() {

  // await ms.form.autoFill(url);

  const container = ms.id("buttonset");

  // Create button
  const button = document.createElement("button");

  // Set button text
  button.textContent = "Click Me";

  // Add click handler
  button.addEventListener("click", () => {
    alert("Button clicked!");
  });

  // Add button into div
  container.appendChild(button);
  //

  g = ms.form.grid();

  g.style = './CSS/msgrid-my1.css';

  /* IF  g.bulkEdit mode enabled, then remove g.editButton (ie - no edit functionality at bulk edit).
    On all other cases, whenever edit button is clicked, bring the last clicked row to the visible area of the grid if that row has been scrolled down and not in showing area. 
   And, in addition to Update Button, enable Cancel and Delete buttons too. If Cancel clicked, you re store the field values.
    g.cancelButton = "Cancel"; will be there, but no user function for this.   
     The statements g.deleteButton = "Delete Row"; And g.deleteFunction = deleteFn; will be set by user. And When return true from that function, you fully remove that current record.
   Noe: Should be able to edit a record even under g.actionPanelTop=true mode (for now, it allows only when false).
   Note : Even when g.multiSelect = true, highlight the current clicked record. For now when tick, that related record is highlighted. - keep that way too.
  */

  g.searchCustomMode = false;  // true means no search & paging from API.
  // g.style = "./CSS/msgrid-my1.css"; // External .CSS Ok..!!!!
  g.title = "Students";
  //g.autoHeight = true;  // NOTE: when true, g.height is ignored ..!
  g.height = 700;
  //g.width = 1300;
  g.multiSelect = true;  // Apple (and more ▼) 
  g.bulkEdit = false;

  // system buttons. Style is taken from GlobalConfig
  g.systemButtonsTop = false; // can shift to left bar OR Top bar

  g.editButton = "Edit Row";

  g.updateButton = "Update Row";
  g.updateFunction = updateFn;
  g.cancelButton = "Cancel";

  g.deleteButton = 'Delete';
  g.deleteFunction = deleteFn
  // End system Buttons

  // custom buttons can keep at the search/top bar of the grid
  g.customButtonsOnTopBar = [

    {
      text: 'Custom Button 1',
      click: testFn
    },
    {
      text: 'Custom Button 2',
      click: testFn
    },
    {
      text: 'Print nwofj3 4fj ZZ',
      click: testFn
    },

    {
      text: 'Details webv ZZ',
      click: detailsFn
    },
    {
      text: 'Details webv ZZ',
      click: detailsFn
    },
    {
      text: 'Details webv ZZ',
      click: detailsFn
    },
    {
      text: 'Details webv ZZ',
      click: detailsFn
    }
  ];

  // custom buttons can keep at the title bar of the grid
  g.customButtonsOnTitleBar = [
    {
      text: 'Title Action 1 jkebdebdkwbekdbwekdbwklebdkwbed iejbdkjwebdkjwbekdb kwed',
      click: detailsFn
    },
    {
      text: 'Title Action 1 jkebdebdkwbekdbwekdbwklebdkwbed iejbdkjwebdkjwbekdb kwed',
      click: detailsFn
    },
    {
      text: 'Title Action 1 jkebdebdkwbekdbwekdbwklebdkwbed iejbdkjwebdkjwbekdb kwed',
      click: detailsFn
    },
    {
      text: 'Title Action 1 jkebdebdkwbekdbwekdbwklebdkwbed iejbdkjwebdkjwbekdb kwed',
      click: detailsFn
    },
    {
      text: 'Title Action 1 jkebdebdkwbekdbwekdbwklebdkwbed iejbdkjwebdkjwbekdb kwed',
      click: detailsFn
    },
    {
      text: 'Title Action 1 jkebdebdkwbekdbwekdbwklebdkwbed iejbdkjwebdkjwbekdb kwed',
      click: detailsFn
    },
    {
      text: 'Title Action 1 jkebdebdkwbekdbwekdbwklebdkwbed iejbdkjwebdkjwbekdb kwed',
      click: detailsFn
    },
    {
      text: 'Title Action 2',
      click: detailsFn
    },
    {
      text: 'Title Action 3',
      click: detailsFn
    }
  ];

  // Also, the custom buttons can keep at Right area of the grid
  g.customButtonsRight = [
    {
      text: 'Custom Right button 1',
      click: testFn
    },

    {
      text: 'Custom Right Button 2',
      click: detailsFn
    }
  ];
  //

  g.searchFields = "Name, SKU";
  g.phonetic = true;
  g.sortFields = "Name, Quantity";
  g.hiddenFields = "ID, CID"; // after select, hidden CID and "Country" fields are auto updated.

  // * GIVE a light weight Highlight for selected record even under Multi Select Mode.

  //let row = g.selectedRows()[0];
  //let x= g.value(row,"Age");
  //g.setValue(row,"Age",23);

  // Array Format data sending Risk:
  // This [1,"car", 200] way has risk if order of data items changed at the backend.
  // g.fields = ["Id", "Name", "price"];
  // g.data = [[1,"car", 200], [2,"van", 300], [3,"bus", 400]];
  g.fields = [
    { field: "Name", label: "Item Name.." },
    { field: "Quantity", label: "QTY.." },
    { field: "Date", label: "Imported on.." },
    { field: "SKU", label: "SKU.." },
    { field: "CID", label: "CID.." },
    { field: "Country", label: "From Country" },

  ];

  g.editFields = {
    Name: "text(30)",
    Weight: "decimal(10.5-80.5)",
    Age: "int(20-80)",
    Date: "date(23/02/18-23/04/26) optional"
  };

  // backend need to send a json for country list separately containing name of country and country ID like this; 
  // grid data does not have to send name of country but send country ID (ie- keyField).  Multiple IDs are supported.
  // .. ,CID: ["1","2"], ..

  /*
  let response;
  try {
    response = await fetch("http://localhost:5000/api/inventory/items");

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const users = await response.json();
    console.log(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
  }
  ////
*/

  const items_countries = await ms.http.get("Inventory", "/itemsData");

  let listCountry = ms.form.combo();
  listCountry.style = "./CSS/mscombo22.css"; // If not set then get from GlobalConfig..
  listCountry.multiSelect = true;
  listCountry.data = ms.data(items_countries.countries);

  /*   listCountry.data = [
      { CID: 1, Country: "Japan.." },
      { CID: "UK", Country: "UK.." },
      { CID: "US", Country: "USA.." },
      { CID: 2, Country: "Lanka.." },
      { CID: "3", Country: "India.." },
      { CID: "6", Country: "France.." },
      { CID: "7", Country: "Jamica.." },
      { CID: 8, Country: "Jarda.." },
      { CID: 9, Country: "Usbek.." },
      { CID: 10, Country: "kotte.." },
      { CID: 11, Country: "colomb.." },
      { CID: 12, Country: "Indunesia.." },
      { CID: 13, Country: "afgan.." },
      { CID: 14, Country: "nigeria.." }
    ]; */

  g.comboFields.add(listCountry); // This combo will auto add to CID field location of the data grid.
  // CID contains only selected ID/s.    

  // ANOTHER COMBO..

  /*   let listSx = ms.form.combo();
    // listSx.style = "./CSS/mscombo22.css"; // If not set then get from GlobalConfig..
    listSx.multiSelect = true;
    listSx.data = [{ SXID: "M", Sx: "Male" }, { SXID: "F", Sx: "Female" }];
    g.comboFields.add(listSx); */


  // OR--> g.comboFields = [listCountry, listSx];

  // g.comboFields = [
  //  { keyField: "CID", list: listCountry },
  //  { keyField: "SXID", list: listSx }
  //];

  /*    let listCountry =
    [{ CID: 1, Country: "JAPAN" },
     { CID: 2, Country: "UK" }];
  
  let listSx = 
    [{ SXID: "M", SEX: "Male" },
     { SXID: "F", SEX: "Female" }]; */

  // g.comboFields = [
  //   { keyField: "CID", list: listCountry },
  //   { keyField: "SXID", list: listSx }
  // ];  


  // c.data = ms.data(data, "id", "name");

  g.pageSize = 10;
  g.data = ms.data(items_countries.items);
  g.dataJoin(items_countries.itemsCountry, "id=itemId"); // items has 'id'  and itemsCountry has 'itemId'

  // g.data = [{ id: 1, name: "abc item", sku: "Sku1", quantity: 14, date: "2026-04-24", CID: [1, 2, 3] }, { "id": 5, "name": "break flod", "sku": "kk1", "quantity": 2, "date": "2026-02-02", "CID": ["1", "2"] }, { "id": 6, "name": "caliber delo 500", "sku": "CAl001", "quantity": 23, "date": "2026-03-03", "CID": ["3", "1", "2"] }, { "id": 7, "name": "Ford 123", "sku": "F123", "quantity": 20, "date": "2026-02-02", "CID": ["1", "3", "5"] }];

  /*   g.data = [
      { Id: 1, Name: "Anil", Weight: 40.5, Age: 212221, Total: 0, Date: "13/12/20", CID: ["5", "4"], Country: "UK", SXID: "F", Sx: "Female", IK: "IK001", ItemName: "Item 001" },
      { Id: 2, Name: "John", Weight: 50.6, Age: 22, Total: 0, Date: "13/12/20", CID: "1", Country: "JAPAN", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
      { Id: 3, Name: "smith", Weight: 60.25, Age: 23, Total: 0, Date: "16/12/20", CID: "001", Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
      { Id: 4, Name: "keen", Weight: 70.1, Age: 24, Total: 0, Date: "17/12/20", CID: "001", Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
      { Id: 5, Name: "ravi", Weight: 80.5, Age: 25, Total: 0, Date: "19/12/20", CID: "001", Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
  
      { Id: 6, Name: "Indika", Weight: 40.5, Age: 212221, Total: 0, Date: "13/12/20", CID: ["2", "1"], Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
      { Id: 7, Name: "jone", Weight: 50.6, Age: 22, Total: 0, Date: "13/12/20", CID: "1", Country: "JAPAN", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
      { Id: 8, Name: "silva", Weight: 60.25, Age: 23, Total: 0, Date: "16/12/20", CID: "001", Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
      { Id: 9, Name: "kaman", Weight: 70.1, Age: 24, Total: 0, Date: "17/12/20", CID: "001", Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
      { Id: 10, Name: "chandra", Weight: 80.5, Age: 25, Total: 0, Date: "19/12/20", CID: "001", Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
  
      { Id: 11, Name: "Athul", Weight: 40.5, Age: 212221, Total: 0, Date: "13/12/20", CID: ["2", "1"], Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
      { Id: 12, Name: "rohan", Weight: 50.6, Age: 22, Total: 0, Date: "13/12/20", CID: "1", Country: "JAPAN", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
      { Id: 13, Name: "sena", Weight: 60.25, Age: 23, Total: 0, Date: "16/12/20", CID: "001", Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
      { Id: 14, Name: "kosta", Weight: 70.1, Age: 24, Total: 0, Date: "17/12/20", CID: "001", Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
      { Id: 15, Name: "roy", Weight: 80.5, Age: 25, Total: 0, Date: "19/12/20", CID: "001", Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" },
  
      { Id: 16, Name: "ajith", Weight: 80.5, Age: 25, Total: 0, Date: "19/12/20", CID: "001", Country: "UK", SXID: "M", Sx: "Male", IK: "IK001", ItemName: "Item 001" }
    ]; */


  /*  fetch('https://randomuser.me/api/')
    .then(res => res.json())
    .then(data => console.log(data));  */

  /*   fetch('https://dummyjson.com/users?limit=200')
    .then(res => res.json())
    .then(data => {
      console.table(data.users); // shows like a table
      //console.log(data.users);
    });  */

  // Support both..
  // A Valid JSON to be passed from backend Eg -==> { "Id": 1,  "Name": ["A", "B"], "Weight": 40.5 }
  // JavaScript object literal syntax Eg- --> g.data = [ { Id: 1, 


  g.onRowTick = rowTickFn;
  g.onRowSingleClick = rowSingleClickFn;
  g.onRowDoubleClick = doubleClickFn;
  g.onTextLeave = TextLeaveFn;
  g.onTextFocus = TextFocusFn;

  await ms.insert(g, 'grid1');
  /* 
    // SMALL GRID
    let g3 = ms.form.grid();
    //g3.id = "itemsGrid";
    g3.fields = [
      { field: "Id", label: "ID.." },
      { field: "Name", label: "Name" },
      { field: "Weight", label: "Weight.." }];
  
    g3.data = [{ Id: "abcd", Name: "1200", Weight: "BBC--eeuie" }];
    g3.height = 190;
    ms.insert(g3, 'grid3');
    
    // END OF SMALL GRID */


}


function TextFocusFn() {

  if (g.textFocus === 'Weight') {
    g.setCellColor('Weight', 'green');
  }
}

function TextLeaveFn() {
  if (g.textLeave === 'Age') {
    g.setCellColor('Age', 'red');
    g.focusText('Weight');
  }
}


function updateFn() {
  alert("updated");
  // return { ok: true };  OR
  return true;
}
function deleteFn() {
  alert("delted");
  return true;
}
function selectFn() {
  alert("select");
}
function addFn() {
  alert("add");
}

function rowSingleClickFn() {
  const age = g.getRow('Age');

  console.log(age);
}

function doubleClickFn() {
  alert("double");
  const rec = g.getRow();

  console.log(rec);
  console.log(rec.Customer); // Ok-->  rec['Weight'] but Not --> rec[0] etc..

}
function rowTickFn() {
  alert("row Tick");
  const clickon = g.getRow();
  // const selected = g.getSelectedRecords();
  console.log(clickon);


  //alert("row");
}

function popupFn() {
  alert("popupFn ");
}

function ReadGrid() {
  const selected = g.getTickedRows();
  console.log(selected);

  const all = g.getAllRows();
  console.log(all);
}

function WriteGird() {
  g.data = [
    { Id: 10, Name: "bus", Age: 50 },
    { Id: 11, Name: "bike", Age: 25 }
  ];

  g._data[0][2] = 999;   // row 0, Price column
  g.render();

}

function Save() {

}


function Validate() {

}

function testFn() {

  // g.bulkEdit = true;
  alert("print..");

  const selectedCountryIds = g.getRow("CID");
  console.log(selectedCountryIds);  // Selected values of Combo.

  //ReadGrid();
  // WriteGird();
  //Validate();

  console.log('current row data='); console.log(g.getRow());  // Current row is the selected row (may or may not be a Ticked record).
  console.log('Age at current row=' + g.getRow('Age'));
  console.log('index=' + g.getRowIndex());
  console.log('data at at row index 0= '); console.log(g.getRow(0));
  console.log('Age at row 0= ' + g.getRow(0, 'Age'));
  // console.log('data at current row= '); console.log(g.getRow()); // Check
  console.log(g.getAllRows());
  console.log(g.getTickedRows());
  console.log('row count= ' + g.getRowCount());
  //g.updateRow({...});
  //g.updateRow(index,{...});
  //g.addRow({...});
  //g.insertRow(index,{...});
  //g.removeRow(index);
  //g.removeRow();
  //g.removeTickedRows();
  g.cloneRow();
  //g.cloneRow({...});
  g.focusRow(1);
  g.focusText(3, 'Age');  // focusing on a text box does NOT mean auto focusing on that row too.
  // focusing on a text box does NOT mean auto focusing on that row too.
  // focusing on a text box does NOT mean auto focusing on that row too.
  g.setRowColor('red');  // for current row
  g.setRowColor(4, 'red');
  g.setCellColor(5, 'Age', 'blue');

  g.setTick(true); g.setTick(5, false); g.setTick(6, true);
  console.log(g.isTicked()); console.log(g.isTicked(5)); console.log(g.isTicked(6));
  g.focusText(2, 'Age');

  //ms.el.button.click()
}

function detailsFn() {
  alert("details.." + ' Age at current row=' + g.getRow('Age'));

}



async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}
