
import ms from './msLib/ms.js';
await ms.ready();

function login(x) {
  alert("login constructor " + x);
}

// let s2 = await ms.open('dboard', { val: 8 });

//let s1= await ms.inject("a", "d1");
//   let s2= await ms.inject("b", "d2");
// ms.loadState();
// For any fault in above comp, any open(..) show the parent Eg- let s2= await ms.open('dboard');

// let ss=99;


//await ms('a.html');

ms.id('cmbProducts').innerText = "XXXXXXXXXXXXXX This is combo from login.js";


ms.id('dboard').on('click', CallBoard);
// ms.el.button("dboard").onclick = ms.call(CallBoard);
//ms.el.label('').text
async function CallBoard() {

  /*       ms.store.set('auth.session', { logged:true });
  
        // TRANSACTION DEMO
        try{
         
          await ms.store.transaction(async () => {
            ms.store.set('sales.total', 100);
            ms.store.set('sales.status', 'CONFIRMED');
          });
  
        } catch(e) {
          console.error('Transaction failed:', e);
          ms.ErrorClose();
          ms.stop();  // ATtn: NOT working inside catch. Was To send the control to MS errr popup. 
          alert("stoped");
          // return;  // use ms.stop() when outside a function...! 
        }
  
         let sal = ms.store.get('sales.total'); */


  // let s2 = await ms.open('dboard');
  let s2 = await ms.open('dboard', { val: 8 });

  //let s2= await ms.inject("ClassCall", ms.id('d1'));

}


/* import { ms } from './msLib/ms.js';

   let b=document.getElementById('board2');
   b.addEventListener('click', f);

async function f()
{
  alert("from login.js");
 const b = new ms.component('board.html');
 await b.open(true);
}
 */

// alert("1");
// document.addEventListener('click', async e => {
//   if (e.target?.id !== 'board') return;

//   alert("2");
//   const b = new ms.component('board.html');
//   await b.open(true);
// });
