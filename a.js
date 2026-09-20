import ms from './msLib/ms.js';
await ms.ready();


 function onLoad(args = {}) 
 { alert(" 11 onLoad at A.  args.customerId = " + args.customerId); }

function onShow() {
    alert('onShow...');
}

function onClose() {
    alert('onClose...');
}
async function onBeforeHide() {
    const r = await ms.dialog({
        message: "Unsaved changes. Leave?",
        buttons: ["Stay", "Leave"]
    });

    return r === "Leave";
}

function onFocus() {
    alert('onFocus...');
}
function onLostFocus() {
    alert('onLostFocus...');
}


// ms.el.button('barchart').onclick = barchart;

//await new Promise(r => setTimeout(r,1000));
console.log("component loaded");


//  ms.onLoad = LoadingFn; // GPT says complicated..
/* 
  function onLoad({ customerId = 0, supplierId = 0 } = {}) {
    alert('Customer..: ' + customerId + ', Supplier: ' + supplierId);
  } */

// function onLoad(args = {}) {
//   const val = args.val ?? 0;
//   alert('onload / OR Constructor of a.html called PARAMS :' + val);
// }
////////////////////////////////////////////////////////

export async function barchart() {
    let bar = await ms.inject('3dBarChart1.html', 'for3dbar');
    bar.updateBarChart(ms.id('bardata').value);

}

var x = 100;
var tid;
// y=900;

// @public
async function BackTo() {
    const o = await ms.open('login.html');
}

// @public
async function btnPrint() {
    alert("btnPrint " + x);
    clearInterval(tid); return;

    const o = await ms.open('b.html').in("DivForB");

    // alert(document.getElementById('Text1').value);
    // ms.save();
    // alert("saved");

    // locate our instance and park (engine provides ms.listInstances to debug)
    // const list = ms.listInstances();
    // console.log('instances', list);
}

// @public
function SetVal(x) {
    //  __ms_root.querySelector("#Text1").value=x;
    ms.id('Text1').value = x;

}

// @public
export async function TEst(x) {

    ms.id('Text1').value = x + ' passed..';
}

let cnt = 0;
async function TimerA() {
    /*    const box = document.getElementById("boxA");
      // BAD: global timer
      window.setInterval(()=>{
        box.innerHTML = cnt++; // "A: " + new Date().toLocaleTimeString();
      }, 500); */

    /*   const el = document.getElementById("boxA");
      let cnt=0;
      // GLOBAL timer (non-per-cloned in MS71)
      window.setInterval(() => {
        // UI mutation
        el.value = cnt++
      }, 500); */

    // ms.ready(()=>{
    // window.addEventListener("click",()=>console.log("click"));
    //});

    x = x + 1;
    //const el = document.getElementById("counter");
    // GLOBAL timer (non-per-cloned in MS71)
    //tid = window.setInterval(() => {
    // UI mutation
    //  el.textContent = Number(el.textContent) + 1;
    //}, 500);

    alert("before");
    //ms.ready(()=>{
    // alert("ready");
    // window.addEventListener("click", handleClick);
    //});


}

function handleClick() {
    alert("Window clicked!");
}
