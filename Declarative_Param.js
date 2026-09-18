
import ms from './msLib/ms.js';
await ms.ready();

// Ok--> const com_a = await ms.com('com_a');

// calls public test() in COM a.html
await ms.com('coMa').tEST('The func test of A called from parent');


// Append b into same COM container which already has comp a.
let b = await ms.inject('b', 'comA', { append: true }); // Was NOT OK; existing component was vanished...!
b.SAYHello(' from DeclarativeParent'); // OK


// Normal inject into my-tag
let r1 = await ms.inject('TextBox1', { "customerId": 101, "supplierId": 202 }, 'my-tag', { append: true, top: true });
let r2 = await ms.inject('TextBox1', { "customerId": 102, "supplierId": 203 }, 'my-tag', { append: true, top: true });

// OK-->  let divDeclarativeChild = await ms.inject('DeclarativeChild', 'divDeclarativeChild');

// await ms.com('chart1').setCategories(['X-Grapes', 'Pineapples', 'Mangoes']);

ms.el.button('btn1').onclick = (async () => {
    ms.com('chart1').setCategories(['XY--Grapes', 'Pineapples', 'Mangoes']);
});


