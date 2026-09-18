/// <reference path="./ms.d.ts" />
import ms from './msLib/ms.js';

export async function initLogin() {
    await ms.ready();

    // IntelliSense works perfectly here
    ms.inject('LoginForm', '#app');
    ms.store.set('user.loggedIn', false);

    return ms;
}