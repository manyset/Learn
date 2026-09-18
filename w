[1mdiff --git a/_NOTE.rtf b/_NOTE.rtf[m
[1mindex cc6ec2e..d32c5d9 100644[m
[1m--- a/_NOTE.rtf[m
[1m+++ b/_NOTE.rtf[m
[36m@@ -71,23 +71,23 @@[m [mms.inject - Now, there are no old ms.injectRemote or ms.append or ms.appendRemot[m
   let b = ms.inject('B', ms.id('DivA'));  \par[m
   let c = ms.inject('C', b.DivB], \{append:true, top:false\}); <<== * create a new instance and append to div and show it with all others according to given top/botton. (default is \{top:false\}).\line\par[m
 \b Format-5 \b0\par[m
[31m- \b ms.injectMany(..) :\b0\par[m
[32m+[m[32m \b ms.injectMany(..) :   \b0\i <<-- Use this when there are many comps to load \b instantly\b0 ..!\i0\par[m[41m[m
 Eg-\par[m
 const [sale, stock] = await ms.injectMany(\par[m
   ['./abc/DailySale', 'demo1', \{append:true\}],\par[m
   ['./xyz/DailySale', 'demo2']\par[m
 );\par[m
 sale.MyFun();\b\par[m
[31m-  Note: \b0 Instead of above injectMany, u can use several  await = ms.inject(..); but slow, because it runs one command after one.\par[m
[32m+[m[32m  Note: \b0 Instead of above injectMany, u can use several  await = ms.inject(..); but \b slow\b0 , because it runs \b one command after one\b0 .\par[m[41m[m
 \par[m
[31m-\b Preload(,,,)  &  preloadQueue(,,,,) :\b0\par[m
[32m+[m[32m\b Preload( , , , )  &  preloadQueue( , , , , , , , , , ,) :\b0\par[m[41m[m
  *  let ref = await ms.preload('A', 'B', 'C', ..); // loads \b parallel & quick burst\b0 . No Order. Suited for 2-6 comps \par[m
 ms.preloadQueue(, , , , , , , , ,); // load \b sequentially\b0 ; Slow but suited for a large number of comps.    \par[m
[31m-Note: \b Images \b0 also preloaded at ALL methods.  - CHECK ACTUAL BEHAVIOUR\par[m
[32m+[m[32mNote: \b Images \b0 also preloaded at ALL methods.  - \b CHECK \b0 ACTUAL BEHAVIOUR\par[m[41m[m
 \par[m
[31m-Attn:\line At comp1:  issued==> ms.preload(a,b,c,d);  // all are large files.\line And user wants to quickly move to comp2.\line Will the system block user for a momemt and what will happen to above loading process ?\line Ok. No Issue.\line\line At comp1: --> ms.preloadQueue(a,b,c,d)  and user jumps to another screen and issue -->\par[m
[31m-ms.inject(d, 'div1'); \line * What happen if this d has not yet finished and being loaded at previous preload command ?  No Issue;  d is taken from ms.preloadQueue(a,b,c,d)  \par[m
[31m- * what happen if preload has still not started loading ? \line       No issue;  d is taken from ms.inject(d, 'div1') \line ------------\par[m
[32m+[m[32mAttn:\line\b At comp1\b0 :  issued==> ms.preload(a,b,c,d);  // all are large files.\line And user wants to quickly move to \b comp2\b0 .\line Will the system block user for a momemt and what will happen to above loading process ?\line Ok. No Issue user can smoothly move to comp2.\line\line At comp1: --> ms.preloadQueue(a,b,c,d)  and user jumps to another screen and issue -->\par[m[41m[m
[32m+[m[32mms.inject(d, 'div1'); \line * What happen if this d has not yet finished and being loaded at previous preload command ?\line       - No Issue;  d is taken from ms.preloadQueue(a,b,c,d)  \par[m[41m[m
[32m+[m[32m * what happen if preload has still not started loading ? \line       - No issue;  d is taken from ms.inject(d, 'div1') \line ------------\par[m[41m[m
 \par[m
 * Any component is possible to directly run from VSCode without any harness and run All commands.\par[m
 * Browser debug also enabled. (The word debugger is not required in code).\par[m
[36m@@ -110,8 +110,12 @@[m [mExpected Component FORMAT: (index.html also a component)\par[m
 </ms-public>\par[m
 \par[m
 \ul\b * Full Component Structure....\par[m
[31m-\ulnone\b0 <!-- HTML File -->\par[m
[31m-  <h1>THIS IS CompA</h1>\par[m
[32m+[m[32m\ulnone\b0 <!-- At HTML File -->\par[m[41m[m
[32m+[m[32m<ms-public> \par[m[41m[m
[32m+[m[32m      .....  \par[m[41m[m
[32m+[m[32m</ms-public>\par[m[41m[m
[32m+[m[32m \par[m[41m[m
[32m+[m[32m <h1>THIS IS CompA TEMPLATE</h1>\par[m[41m[m
   <div id="D