///
<reference path="./ms.global.d.ts" />
<ms-public>
  <access>block out</access>
  <store>auth.*, login.*</store>
</ms-public>

<h1>LOGIN 3....</h1>

<br><br><br><br><br><br><br><br><br><br><br>

<div id="d1"></div>
<div id="d2"></div>
<div id="d3">BOARD HERE b</div> <br><br><br>
<div id="d4">Container for Dynamic Div</div> <br><br><br>

<input id="Text1" type="text" value="A-default..." />

<button id="dboard">Normal way. Open Board</button>
<button id="dboard2">2. Normal way. Open Board </button>

<cmbProducts></cmbProducts>

<script type="module">


  /* dboard2.onclick = async function() {
    // alert("Opening Board...");
    let s2= await ms.open('dboard');
  } */

</script>


<script type="module" src="./login.js"></script>


<!-- <script type = 'module'> 

import ms from './msLib/ms.js';
await ms.ready();

  ms.id('dboard').on('click', CallBoard);

   async function CallBoard()
    {
      let s2= await ms.open('dboard');
    }
</script>
 -->

// ms.id('login1').addEventListener('click', CallBoard); // DONT-> document.getElementById('board1');
// document.getElementById('login2').addEventListener('click', CallBoard);
// let s1= await ms.inject('dboard','d2');

// let s1= await ms.inject('board','d2');
// let s2= await ms.inject('TextBox1',"d1");

// NOT WORKING AT LOAD

// await createNewDiv(); // d5 is Dynamically created div with a textbox inside it.

// let b = await ms.inject('board','d1', {append:true});

let x=0;
let u =0;
async function CallBoard()
{
alert("CallBoard ");
createNewDiv(); // d5 is Dynamically created div with a textbox inside it.
let x = await ms.inject('board','d5');
}