
import ms from './msLib/ms.js';
await ms.ready();

/*
 ms.form.input() currently supports these type values:
    text or empty: normal text
    alpha: removes numbers while typing
    email: email input + email validation
    date: native date input
    password: password input
    tel: telephone input
    int
    integer
    number
    decimal: decimal number, default 2 decimals
    currency: decimal number, default 2 decimals, no negative values by default
*/

let c;

// SECTION1 :
let s1 = ms.form.section();
s1.title = "Employee Details";
s1.maxLabelWidth = 360; // max width for left side label set. if any label exceeded this limit, then those are auto shrinked.
s1.rowGap = 8;
s1.buttonGap = 2;
s1.marginLeft = 14;
s1.marginTop = 12;
s1.marginRight = 14;
s1.marginBottom = 12;
s1.messageMode = "field";       // "field" or "panel"
s1.messagePosition = "top-right"; // for panel mode: "top-right" or "bottom-right"
s1.style = {
    background: "#860909",
    border: "1px solid #bbb"
};

ms.insert(s1, "div1", { top: true });
//

// SECTION2:
let s2 = ms.form.section();
s2.title = "DUplicated Employee Details";
ms.insert(s2, "div2");
//

// ADDING FIELDS TO SECTION 1 and 2

// INPUT
let fname = ms.form.input();
fname.id = "fullname"; // TO CALL THIS LATER, USE --> s1.fullname 
fname.label = "FullName.....................AA..............X";
fname.placeholder = "Enter full name..";
fname.type = "alpha";
fname.maxlength = 30;
fname.size = 30;
fname.message = "Numbers are not allowed to enter.";
// fname.style = { backgroundColor: "lightyellow" }; // OR = "./MyInput.css";
s1.insert(fname, { top: false }); // ******


// THIS BLOCK TO DEMO HAVING THE SAME ABOVE ID (id = "fullname) IN 2 SECTIONS...!
let fname2 = ms.form.input();
fname2.id = "fullname"; // TO CALL THIS LATER, USE --> s2.fullname 
fname2.label = "FullName.....................AA..............X";
s2.insert(fname2); // ******
//


// IMAGE
// const sampleImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='180'%3E%3Crect width='300' height='180' fill='%230b84d8'/%3E%3Ctext x='150' y='95' text-anchor='middle' font-size='22' fill='white'%3EProduct%3C/text%3E%3C/svg%3E";
let img = ms.form.image();
img.id = "productImage1";
img.path = 'https://cdn.pixabay.com/animation/2024/09/23/09/24/09-24-37-449_512.gif'; // sampleImage;
img.height = 110;
img.width = 110;
//img.rightWidth = 165;
//img.rightHeight = 285;
img.autoSize = "contain";  // "contain" OR "cover"  OR "fill"
img.Center = true;
img.round = 8;
img.showMode = "right"; // "in" OR "top" OR "right"

img.shadow = true;
img.shadow = "0 4px 12px rgba(0,0,0,.25)"; // OR shadow = true;
img.round = 8;

s1.insert(img);


let img3 = ms.form.image();
img3.id = "productImage3";
// img2.path = 'https://cdn.pixabay.com/animation/2024/09/23/09/24/09-24-37-449_512.gif'; // sampleImage;
img3.path = 'https://static.vecteezy.com/system/resources/thumbnails/012/407/172/small_2x/rainbow-icon-isolated-on-transparent-background-vector.jpg';
img3.height = 110;
img3.width = 110;
//img2.rightWidth = 165;
//img2.rightHeight = 285;
img3.autoSize = "contain"; // "contain" OR "cover"  OR "fill"
img3.Center = true;
img3.shadow = true;
img3.round = 8;
img3.showMode = "right"; // "in" OR "top" OR "right"
img3.shadow = "0 4px 12px rgba(0,0,0,.25)"; // OR shadow = true;
img3.round = 8;
s1.insert(img3);

//
let address = ms.form.input();
address.id = "address";
address.label = "Enter Address";
address.type = "text";
address.size = 18;
s1.insert(address, { top: true });

let age = ms.form.input();
age.id = "age";
age.label = "Age";
age.type = "int";
age.min = 18;
age.max = 80;
age.size = 5;
age.message = "Age must be between 18 and 80.";
s1.insert(age);


// SMALL GRID
let g3 = ms.form.grid();
g3.id = "itemsGrid";
g3.fields = [
    { field: "Id", label: "ID.." },
    { field: "Name", label: "Name" },
    { field: "Weight", label: "Weight.." }];

g3.data = [{ Id: "abcd", Name: "1200", Weight: "BBC--eeuie" }];
g3.height = 190;
s1.insert(g3);

//////////////////////////////////////////////


let salary = ms.form.input();
salary.id = "salary";
salary.label = "Salary";
salary.type = "currency";
salary.decimal = 2;
salary.maxlength = 10;
salary.size = 5;
salary.min = 1000;
salary.max = 2000;
salary.placeholder = "0.00";
salary.value = "1250.50";
salary.message = "Enter a valid salary amount.";
s1.insert(salary);

// IMAGE
// const sampleImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='180'%3E%3Crect width='300' height='180' fill='%230b84d8'/%3E%3Ctext x='150' y='95' text-anchor='middle' font-size='22' fill='white'%3EProduct%3C/text%3E%3C/svg%3E";
let img2 = ms.form.image();
img2.id = "productImage2";
// img2.path = 'https://cdn.pixabay.com/animation/2024/09/23/09/24/09-24-37-449_512.gif'; // sampleImage;
img2.path = 'https://static.vecteezy.com/system/resources/thumbnails/012/407/172/small_2x/rainbow-icon-isolated-on-transparent-background-vector.jpg';
img2.height = 110;
img2.width = 110;
//img2.rightWidth = 165;
//img2.rightHeight = 285;
img2.autoSize = "contain"; // "contain" OR "cover"  OR "fill"
img2.Center = true;
img2.shadow = true;
img2.round = 8;
img2.showMode = "right"; // "in" OR "top" OR "right"
img2.shadow = "0 4px 12px rgba(0,0,0,.25)"; // OR shadow = true;
img2.round = 8;
s1.insert(img2);


// COMBO
c = ms.form.combo();
c.id = "country";
c.label = "Select destination Country";
c.style = "./CSS/mscombo22.css"; // If not set then get from GlobalConfig..
c.multiSelect = false;
c.data = [
    { CID: 1, Country: "Japan.." },
    { CID: "UK", Country: "UK.." },
    { CID: "US", Country: "USA.." },
    { CID: 4, Country: "Lanka.." },
    { CID: "5", Country: "India.." },
    { CID: 14, Country: "nigeria.." }
];
c.value = ['US', 1];
//c.width = 120;
// let x = c;
s1.insert(c);

// BUTTONS
let save = ms.form.button();
//save.id = "save";
save.text = "Save";
save.style = "./CSS/ButtonLocal.css";
save.click = MySave; // save.click = () => alert("Save clicked");
s1.insert(save);

let save2 = ms.form.button();
//save2.id = "save";
save2.text = "Save2";
save2.style = "./CSS/ButtonLocal.css";
save2.click = MySave2; // save.click = () => alert("Save clicked");
s1.insert(save2);


let newButton = ms.form.button();
newButton.id = "newButton";
newButton.text = "New";
// save.style = "./CSS/ButtonLocal.css";
newButton.click = () => alert("New clicked");
s1.insert(newButton);

let deleteButton = ms.form.button();
deleteButton.id = "deleteButton";
deleteButton.text = "Delete";
// save.style = "./CSS/ButtonLocal.css";
deleteButton.click = () => alert("Delete clicked");
s1.insert(deleteButton, { top: true });


let val = s1.fname;

function MySave() {

    ms.el.label("lbl1").innerHTML = "Country: " + c.displayText() + ' -' + c.getText() + c.value + '-' + c.keyField + '-' + c.textField;

    ms.el.label("lbl2").innerHTML = "value of fullname = " + s1.fullname + " AND from section 2= " + s2.fullname;

}

function MySave2() {
    alert("My Save 2");
}
