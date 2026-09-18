import ms from './msLib/ms.js';
await ms.ready();


const [ref1, a2] = await ms.injectMany(
  ['UiEmit1', 'UiEmit1', { append: true }],
  ['grid3d', 'ms-area3', { append: true }]
);

const [b1, b2] = await ms.injectMany(
  ['a', 'area1'],
  ['b', 'ms-area4', { append: true }]
);


//let ref1 = await ms.inject('UiEmit1','UiEmit1');
let ref2 = await ms.inject('UiEmit2', 'UiEmit2');
await ms.ui.listen(ref1, trigger1);
await ms.ui.listen(ref2, trigger2);


ms.id('prod').innerText = " PRODUCT HERE LABEL CHANGED";

ms.id('btnEmitBack').onclick = (e) => EmitBackToMenu(e);
let eb = 0;

// ms.ui.throttle(trigger1, 70);
// ms.ui.throttle(trigger2, 70);
// ms.ui.debounce(trigger1, 1000)
//await ms.ui.listenOnce(ref1, trigger1);

// ms.id('debounce').onclick = () =>  ms.ui.debounce(trigger1, 1000);


//ms.id('debounce').onclick = () => SecondInject();

async function SecondInject() {
  let ref1 = await ms.inject('UiEmit1', 'UiEmit1');
  await ms.ui.listen(ref1, trigger1);
}

async function trigger1(e, data) {

  if (e.type === 'click') {
    ms.id('prod').innerText = data;
    alert("DO NOT PUT ANOTHER EMIT INSIDE A TRIGGER");
    // DO NOT DO THIS HERE ==> ms.ui.emit(e, eb++);

  }

  //
  if (e.type === 'mousemove') {
    ms.id('mouse').innerText = 'X=' + e.clientX + ' Y=' + e.clientY;

    await ms.inject('TextBox1', 'area1', { append: true });

  }

}

function trigger2(e, data) {

  // ERROR: After Emit OR Listen ID prod is missing.

  if (e.type === 'click') {
    ms.id('prod').innerText = data;
    console.log(data);

  }

  //
  if (e.type === 'mousemove') {
    ms.id('mouse').innerText = 'X=' + e.clientX + ' Y=' + e.clientY;

  }
}


async function EmitBackToMenu(e) {
  alert("emit 2");
  ms.ui.emit(e, eb++);

  // OR say==> let data = {product: ms.id("myDropdown").selectedOptions[0].text};
}


