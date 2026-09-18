
import ms from './ms.js';
await ms.ready();


export function setStatus() {
    //const el = ms.id("status-panel");
    const el = document.getElementById("status-panel");
    el.textContent = "Changed";
}