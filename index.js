import ms from './msLib/ms.js';
// Do if needed. ==> await ms.ready();
await ms.ready();

ms.id('btnLogin').onclick = CallLogin;
await CallLogin();

async function CallLogin() {
   // eeee;
   await ms.open('login');
}
