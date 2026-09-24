# three.js r160, in casa

Serve a DaProdFoto per guardare i modellini 3D di TRELLIS.2 (scheda **3D**).
La suite non chiama niente da fuori, quindi three.js sta qui: e' la stessa
versione dei giochi della sala (Coin Dozer, Claw Machine), r160.

Presi da `three@0.160.0` su npm, senza toccarli, tranne gli `import`: negli
esempi di three puntano a `'three'`, che senza una importmap una pagina non sa
risolvere, e qui puntano al file accanto. Licenza MIT, in `LICENSE`.

- `three.module.js` — `build/three.module.min.js`
- `GLTFLoader.js`, `OrbitControls.js`, `BufferGeometryUtils.js`, `RoomEnvironment.js` — da `examples/jsm/`
