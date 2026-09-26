/* Verificación de la maqueta Restaurante Gabi.
   Levanta un servidor estático, abre el sitio con Playwright y comprueba las
   trampas conocidas: cortina que no se retira, consola sucia, 404, cookies,
   menú móvil, mapa bajo clic, las dos densidades, desbordamiento lateral y
   que el sello cambie del lema a la nota también con movimiento reducido.

   node scripts/verificar.mjs            (todo)
   node scripts/verificar.mjs --capturas (además guarda screenshots/)
*/
import { chromium } from 'file:///C:/Users/alvar/Desktop/WEBS%20NEGOCIOS/alvarotaiagu.github.io/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const conCapturas = process.argv.includes('--capturas');
if (conCapturas) fs.mkdirSync(path.join(raiz, 'screenshots'), { recursive: true });
const foto = n => path.join(raiz, 'screenshots', n);
const tipos = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json'
};

const servidor = http.createServer((req, res) => {
  const limpia = decodeURIComponent(req.url.split('?')[0]);
  const destino = path.join(raiz, limpia === '/' ? 'index.html' : limpia);
  if (!destino.startsWith(raiz)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(raiz, '404.html')));
    return;
  }
  res.writeHead(200, { 'content-type': tipos[path.extname(destino)] || 'application/octet-stream' });
  res.end(fs.readFileSync(destino));
});

const fallos = [];
const notas = [];
function comprobar(ok, mensaje) { (ok ? notas : fallos).push((ok ? 'OK   ' : 'FALLA') + ' · ' + mensaje); }

async function rueda(page, vueltas, paso = 700, espera = 240) {
  for (let i = 0; i < vueltas; i++) {             // window.scrollTo no dispara ScrollTrigger con Lenis
    await page.mouse.wheel(0, paso);
    await page.waitForTimeout(espera);
  }
  await page.waitForTimeout(1800);
}

async function hasta(page, selector, margen = 0) {
  /* baja con la rueda hasta que el elemento asoma por arriba */
  for (let i = 0; i < 80; i++) {
    const top = await page.evaluate(s => document.querySelector(s).getBoundingClientRect().top, selector);
    if (top <= 90 + margen && top > -40) break;
    const paso = top > 0 ? Math.min(700, Math.max(120, top - 60)) : Math.max(-700, top - 80);
    await page.mouse.wheel(0, paso);
    await page.waitForTimeout(160);
  }
  await page.waitForTimeout(1800);
}

async function nuevaPagina(navegador, opciones = {}) {
  const contexto = await navegador.newContext({
    viewport: opciones.viewport || { width: 1440, height: 900 },
    reducedMotion: opciones.reducedMotion || 'no-preference',
    deviceScaleFactor: 1
  });
  const page = await contexto.newPage();
  const errores = [];
  const caidas = [];
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  page.on('requestfailed', r => caidas.push(r.url() + ' → ' + (r.failure()?.errorText || '')));
  page.on('response', r => { if (r.status() >= 400) caidas.push(r.status() + ' ' + r.url()); });
  return { contexto, page, errores, caidas };
}

const selloEstado = page => page.evaluate(() => {
  const s = document.getElementById('sello-hero');
  const op = g => {
    const hijos = [...s.querySelectorAll(g + ' path')];
    const grupo = parseFloat(getComputedStyle(s.querySelector(g)).opacity);
    return grupo * hijos.reduce((a, p) => a + parseFloat(getComputedStyle(p).opacity), 0) / hijos.length;
  };
  return { lugar: op('.sello__abajo--lugar'), nota: op('.sello__abajo--nota'), vinoY: parseFloat(s.querySelector('.sello__vino').getAttribute('y')) };
});

const base = 'http://127.0.0.1:4191';
await new Promise(r => servidor.listen(4191, '127.0.0.1', r));
const navegador = await chromium.launch();

try {
  /* ───── 1. escritorio, pasada normal ───── */
  {
    const { contexto, page, errores, caidas } = await nuevaPagina(navegador);
    await page.goto(base + '/index.html', { waitUntil: 'networkidle' });

    /* fotogramas intermedios: la única forma de ver que el arco se abre */
    await page.waitForTimeout(600);
    if (conCapturas) await page.screenshot({ path: foto('00a-cortina-sello.png') });
    let arcoVisto = false;
    for (let i = 0; i < 40 && !arcoVisto; i++) {
      const filo = await page.evaluate(() => {
        const c = document.getElementById('cortina');
        return getComputedStyle(c).display !== 'none' && document.getElementById('cortina-filo').getAttribute('d').length > 10;
      });
      if (filo) {
        await page.waitForTimeout(350);
        if (conCapturas) await page.screenshot({ path: foto('00b-cortina-arco.png') });
        arcoVisto = true;
      } else await page.waitForTimeout(100);
    }
    comprobar(arcoVisto, 'la cortina se ve abrirse en arco antes de irse');

    await page.waitForTimeout(3000);
    const cortinaFinal = await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display);
    comprobar(cortinaFinal === 'none', 'la cortina acaba en display:none (pasada normal) → ' + cortinaFinal);
    const desborda = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    comprobar(desborda <= 1, 'sin desbordamiento horizontal en escritorio (' + desborda + 'px)');
    if (conCapturas) await page.screenshot({ path: foto('01-hero.png') });

    /* cursor propio: sustituye al del sistema y se rellena de forma visible sobre lo pulsable */
    await page.mouse.move(700, 300);
    await page.mouse.move(720, 320, { steps: 4 });
    await page.waitForTimeout(400);
    const cursorLibre = await page.evaluate(() => ({
      sistema: getComputedStyle(document.body).cursor,
      aro: getComputedStyle(document.querySelector('.cursor')).opacity,
      punto: getComputedStyle(document.querySelector('.cursor-punto')).opacity
    }));
    comprobar(cursorLibre.sistema === 'none' && cursorLibre.aro === '1' && cursorLibre.punto === '1',
      'cursor propio visible (aro + punto) y el del sistema oculto → ' + JSON.stringify(cursorLibre));
    const boton = await page.locator('.hero__acciones .boton').boundingBox();
    await page.mouse.move(boton.x + boton.width / 2, boton.y + boton.height / 2, { steps: 6 });
    await page.waitForTimeout(600);
    const cursorBoton = await page.evaluate(() => {
      const e = getComputedStyle(document.querySelector('.cursor'));
      return { fondo: e.backgroundColor, ancho: e.width, sistema: getComputedStyle(document.querySelector('.hero__acciones .boton')).cursor };
    });
    comprobar(/rgba\(200, 146, 72, 0\.38\)/.test(cursorBoton.fondo) && cursorBoton.ancho === '64px' && cursorBoton.sistema === 'none',
      'sobre un botón el aro crece y se rellena, sin cursor del sistema → ' + JSON.stringify(cursorBoton));
    if (conCapturas) await page.screenshot({ path: foto('01b-cursor-boton.png'), clip: { x: boton.x - 60, y: boton.y - 60, width: boton.width + 120, height: boton.height + 120 } });
    await page.mouse.move(720, 200, { steps: 4 });
    await page.waitForTimeout(500);
    if (conCapturas) await page.screenshot({ path: foto('01c-cursor-libre.png'), clip: { x: 640, y: 120, width: 160, height: 160 } });

    const antes = await selloEstado(page);
    comprobar(antes.vinoY >= 150 && antes.lugar > 0.9 && antes.nota < 0.1, 'al entrar: copa vacía y el sello dice el lugar → ' + JSON.stringify(antes));

    await rueda(page, 3, 600);
    if (conCapturas) await page.screenshot({ path: foto('02-hero-a-medias.png') });
    await rueda(page, 3, 600);
    const despues = await selloEstado(page);
    comprobar(despues.vinoY <= 116, 'al bajar por el hero la copa se llena → y=' + despues.vinoY);
    comprobar(despues.nota > 0.9 && despues.lugar < 0.1, 'el sello pasa del lema a la nota de Google → ' + JSON.stringify(despues));
    if (conCapturas) await page.screenshot({ path: foto('03-hero-final.png') });

    await hasta(page, '#casa');
    if (conCapturas) await page.screenshot({ path: foto('04-casa.png') });
    await rueda(page, 2, 600);
    if (conCapturas) await page.screenshot({ path: foto('05-casa-cuerpo.png') });

    await hasta(page, '#carta');
    if (conCapturas) await page.screenshot({ path: foto('06-carta.png') });
    await hasta(page, '#carta-entrantes', 40);
    await rueda(page, 1, 300);
    if (conCapturas) await page.screenshot({ path: foto('07-carta-entrantes.png') });
    await hasta(page, '#carta-pescados', 40);
    await rueda(page, 1, 300);
    if (conCapturas) await page.screenshot({ path: foto('08-carta-pescados.png') });
    const apilada = await page.evaluate(() => {
      const t = document.querySelector('#carta-entrantes .tarjeta');
      return { transform: getComputedStyle(t).transform, oscuro: getComputedStyle(t).getPropertyValue('--oscuro') };
    });
    comprobar(apilada.transform !== 'none', 'la tarjeta de debajo se hunde al apilarse → ' + apilada.transform);
    await hasta(page, '#carta-brasa', 40);
    await rueda(page, 1, 300);
    if (conCapturas) await page.screenshot({ path: foto('09-carta-brasa.png') });
    await hasta(page, '#carta-encargo', 40);
    await rueda(page, 1, 300);
    if (conCapturas) await page.screenshot({ path: foto('10-carta-encargo.png') });

    /* la pila, medida: alturas iguales, contenido que cabe, y nadie se suelta
       antes de que la última se pose (el fallo clásico de la última tarjeta) */
    const alturas = await page.evaluate(() => [...document.querySelectorAll('.pila__item .tarjeta')].map(t => ({ alto: t.offsetHeight, cabe: t.scrollHeight <= t.clientHeight + 1 })));
    comprobar(new Set(alturas.map(a => a.alto)).size === 1 && alturas.every(a => a.cabe), 'pila: las cinco tarjetas miden lo mismo y su contenido cabe → ' + JSON.stringify(alturas));
    await hasta(page, '#pase');
    await rueda(page, 1, 400);
    if (conCapturas) await page.screenshot({ path: foto('11-pase.png') });
    const ventanas = await page.$$eval('.ventana--galeria', ns => ns.filter(n => n.classList.contains('visible')).length);
    comprobar(ventanas === 5, 'las cinco ventanas de la galería se abren (' + ventanas + '/5)');

    await hasta(page, '#resenas');
    if (conCapturas) await page.screenshot({ path: foto('12-resenas.png') });
    await rueda(page, 3, 600);
    if (conCapturas) await page.screenshot({ path: foto('13-resenas-citas.png') });

    await hasta(page, '#encargos');
    if (conCapturas) await page.screenshot({ path: foto('14-encargos.png') });
    await hasta(page, '#donde');
    if (conCapturas) await page.screenshot({ path: foto('15-donde.png') });
    await rueda(page, 4, 700);
    if (conCapturas) await page.screenshot({ path: foto('16-pie.png') });

    const cifras = await page.$$eval('[data-contador]', ns => ns.map(n => n.textContent.trim()));
    comprobar(cifras.filter(c => c === '4,4').length === 2 && cifras.filter(c => c === '933').length === 2 && cifras.includes('31'),
      'contadores con su valor final → ' + cifras.join(' / '));

    /* el 31 de «platos en carta» y la tabla de la sobria salen de la carta, no de memoria */
    const cuenta = await page.evaluate(() => ({
      platos: document.querySelectorAll('.pila .plato').length,
      cifra: Number(document.getElementById('cifra-platos').dataset.contador),
      tabla: [...document.querySelectorAll('.carta__cifras tbody td:nth-child(2)')].reduce((a, td) => a + Number(td.textContent), 0),
      porCapitulo: [...document.querySelectorAll('.pila__item')].map(li => li.querySelectorAll('.plato').length).join(','),
      tablaCapitulo: [...document.querySelectorAll('.carta__cifras tbody td:nth-child(2)')].map(td => td.textContent).join(',')
    }));
    comprobar(cuenta.platos === cuenta.cifra && cuenta.cifra === cuenta.tabla && cuenta.porCapitulo === cuenta.tablaCapitulo,
      'platos contados en la carta = cifra = tabla (' + JSON.stringify(cuenta) + ')');

    const cookiesVisible = await page.evaluate(() => {
      const c = document.getElementById('cookies');
      return { oculto: c.hidden, display: getComputedStyle(c).display };
    });
    comprobar(!cookiesVisible.oculto && cookiesVisible.display === 'flex', 'el aviso de cookies se ve al entrar');
    await page.click('#cookies-aceptar');
    await page.waitForTimeout(300);
    const cookiesCerrado = await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display);
    comprobar(cookiesCerrado === 'none', 'el botón de cookies lo cierra de verdad → ' + cookiesCerrado);

    const iframesAntes = await page.$$eval('iframe', n => n.length);
    await page.click('#mapa-boton');
    await page.waitForTimeout(700);
    const iframesDespues = await page.$$eval('iframe', n => n.length);
    comprobar(iframesAntes === 0 && iframesDespues === 1, 'el iframe del mapa no existe hasta el clic (' + iframesAntes + ' → ' + iframesDespues + ')');

    comprobar(errores.length === 0, 'consola sin errores' + (errores.length ? ' → ' + errores.join(' | ') : ''));
    const caidasReales = caidas.filter(c => !/favicon\.ico|google\.com\/maps|gstatic|googleapis\.com\/maps|maps\.google/.test(c));
    comprobar(caidasReales.length === 0, 'sin peticiones caídas' + (caidasReales.length ? ' → ' + caidasReales.join(' | ') : ''));
    await contexto.close();
  }

  /* ───── 1b. la pila de la carta, en una página limpia y bajando desde arriba ─────
     El fallo clásico está en la ÚLTIMA tarjeta: las de atrás se sueltan antes de
     que se pose (se separa el montón) o la anterior asoma por debajo. */
  {
    const { contexto, page } = await nuevaPagina(navegador);
    await contexto.addInitScript(() => { try { localStorage.setItem('gabi-cookies', 'ok'); } catch (e) {} });
    await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4600);
    await page.mouse.move(720, 450);
    await hasta(page, '#carta-brasa', 300);
    const tope = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.pila__item')).top));
    let ultimo = null, sueltaAntes = null, asomaDebajo = null, seSeparan = null, ultimaPosada = false;
    for (let i = 0; i < 45; i++) {
      await page.mouse.wheel(0, 90);
      await page.waitForTimeout(170);
      const m = await page.evaluate(() => [...document.querySelectorAll('.pila__item')].map(li => { const r = li.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; }));
      ultimo = m;
      const ultima = m[m.length - 1];
      const anteriores = m.slice(0, -1);
      if (!ultimaPosada && ultima[0] > tope + 2 && ultima[0] < 900 && anteriores.some(a => a[0] < tope - 2)) sueltaAntes = sueltaAntes || { paso: i, m };
      if (Math.abs(ultima[0] - tope) <= 2) {
        ultimaPosada = true;
        if (anteriores.some(a => a[1] > ultima[1] + 1)) asomaDebajo = asomaDebajo || { paso: i, m };
      }
      /* una vez posada la última, salen como un bloque: nadie se separa */
      if (ultimaPosada && anteriores.some(a => Math.abs(a[0] - ultima[0]) > 2)) seSeparan = seSeparan || { paso: i, m };
    }
    const sinLlegar = ultimaPosada ? '' : ' (la última no llegó a posarse: ' + JSON.stringify(ultimo) + ')';
    comprobar(ultimaPosada && !sueltaAntes, 'pila: ninguna tarjeta se suelta antes de que se pose la última' + (sueltaAntes ? ' → ' + JSON.stringify(sueltaAntes) : '') + sinLlegar);
    comprobar(ultimaPosada && !asomaDebajo, 'pila: la última tapa entera a la anterior (nada asoma por debajo)' + (asomaDebajo ? ' → ' + JSON.stringify(asomaDebajo) : '') + sinLlegar);
    comprobar(ultimaPosada && !seSeparan, 'pila: al acabarse, las cinco salen juntas como un bloque' + (seSeparan ? ' → ' + JSON.stringify(seSeparan) : '') + sinLlegar);
    await contexto.close();
  }

  /* ───── 2. las dos densidades ───── */
  {
    const { contexto, page } = await nuevaPagina(navegador);
    await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4600);
    await page.click('#cookies-aceptar');
    await page.waitForTimeout(300);
    comprobar(await page.evaluate(() => !document.getElementById('mando').hidden), 'el mando de maqueta aparece (lo enseña el JS)');

    await page.click('[data-densidad="sobria"]');
    await page.waitForTimeout(900);
    const sobria = await page.evaluate(() => ({
      clase: document.documentElement.className,
      sep: getComputedStyle(document.querySelector('.arco-sep svg')).display,
      tabla: getComputedStyle(document.querySelector('.carta__cifras')).display,
      pila: getComputedStyle(document.querySelector('.pila__item')).position,
      fotoTarjeta: getComputedStyle(document.querySelector('.ventana--tarjeta')).display,
      radio: getComputedStyle(document.querySelector('.ventana__marco')).borderTopLeftRadius,
      desborda: document.documentElement.scrollWidth - window.innerWidth,
      pulsado: document.querySelector('[data-densidad="sobria"]').getAttribute('aria-pressed')
    }));
    comprobar(sobria.clase.includes('densidad-sobria'), 'la clase de densidad cambia en <html>');
    comprobar(sobria.sep === 'none' && sobria.radio === '18px', 'sobria: los arcos decorativos se retiran (separadores y ventanas) → ' + sobria.sep + ' / ' + sobria.radio);
    comprobar(sobria.tabla === 'table', 'sobria: entra la carta en cifras, que la Soportal no tiene → ' + sobria.tabla);
    comprobar(sobria.pila === 'static' && sobria.fotoTarjeta === 'none', 'sobria: la carta deja de apilarse y se ven los cinco capítulos');
    comprobar(sobria.desborda <= 1, 'sobria: sin desbordamiento nuevo (' + sobria.desborda + 'px)');
    comprobar(sobria.pulsado === 'true', 'aria-pressed correcto tras pulsar');
    if (conCapturas) {
      await hasta(page, '#carta');
      await page.screenshot({ path: foto('20-sobria-carta.png') });
      await rueda(page, 3, 700);
      await page.screenshot({ path: foto('21-sobria-carta-2.png') });
    }

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    comprobar((await page.evaluate(() => document.documentElement.className)).includes('densidad-sobria'), 'la densidad elegida se aplica sin parpadeo al recargar');
    await page.waitForTimeout(4400);
    await page.click('[data-densidad="soportal"]');
    await page.waitForTimeout(700);
    const vuelta = await page.evaluate(() => ({
      clase: document.documentElement.className,
      sep: getComputedStyle(document.querySelector('.arco-sep svg')).display
    }));
    comprobar(vuelta.clase.includes('densidad-soportal') && vuelta.sep !== 'none', 'se puede volver a la densidad Soportal');
    await contexto.close();
  }

  /* ───── 3. móvil ───── */
  {
    const { contexto, page, errores } = await nuevaPagina(navegador, { viewport: { width: 390, height: 844 } });
    await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4600);
    const ancho = await page.evaluate(() => ({ innerWidth: window.innerWidth, scroll: document.documentElement.scrollWidth }));
    comprobar(ancho.innerWidth === 390 && ancho.scroll - ancho.innerWidth <= 1, 'móvil: el viewport no se ensancha (' + JSON.stringify(ancho) + ')');
    if (conCapturas) await page.screenshot({ path: foto('30-movil-hero.png') });

    const apartado = await page.evaluate(() => {
      const e = getComputedStyle(document.getElementById('mando'));
      return e.visibility === 'hidden' || e.opacity === '0';
    });
    comprobar(apartado, 'móvil: el mando se aparta mientras el aviso de cookies está en pantalla');
    await page.click('#cookies-aceptar');
    await page.waitForTimeout(600);
    comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('mando')).visibility !== 'hidden'), 'móvil: el mando vuelve al cerrar el aviso de cookies');

    await page.click('#hamburguesa');
    await page.waitForTimeout(800);
    comprobar(await page.evaluate(() => document.getElementById('hamburguesa').getAttribute('aria-expanded')) === 'true', 'móvil: el menú abre');
    if (conCapturas) await page.screenshot({ path: foto('31-movil-menu.png') });
    await page.click('#hamburguesa', { timeout: 4000 });
    await page.waitForTimeout(800);
    comprobar(await page.evaluate(() => document.getElementById('hamburguesa').getAttribute('aria-expanded')) === 'false', 'móvil: el mismo botón cierra el menú');

    /* con la cabecera fija (backdrop-filter) el panel del menú no puede asomar */
    await rueda(page, 10, 700);
    const panel = await page.evaluate(() => {
      const n = document.getElementById('menu').getBoundingClientRect();
      return { fija: document.getElementById('cabecera').classList.contains('cabecera--fija'), bottom: Math.round(n.bottom), alto: Math.round(n.height) };
    });
    comprobar(panel.fija && panel.bottom <= 1 && panel.alto >= 800, 'móvil: con la cabecera fija el menú cerrado queda entero fuera de pantalla → ' + JSON.stringify(panel));
    await page.click('#hamburguesa');
    await page.waitForTimeout(900);
    const panelAbierto = await page.evaluate(() => Math.round(document.getElementById('menu').getBoundingClientRect().height));
    comprobar(panelAbierto >= 800, 'móvil: con la cabecera fija el menú abierto ocupa toda la pantalla (' + panelAbierto + 'px)');
    if (conCapturas) await page.screenshot({ path: foto('31b-movil-menu-fija.png') });
    await page.click('#hamburguesa');
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);

    /* la galería desliza dentro de sí misma, sin ensanchar la página */
    const galeria = await page.evaluate(() => {
      const g = document.querySelector('.galeria');
      return { propio: g.scrollWidth > g.clientWidth + 10, pagina: document.documentElement.scrollWidth - window.innerWidth };
    });
    comprobar(galeria.propio && galeria.pagina <= 1, 'móvil: la galería se desliza en horizontal sin desbordar la página');

    if (conCapturas) {
      await rueda(page, 6, 600);
      await page.screenshot({ path: foto('32-movil-hero-lleno.png') });
      await hasta(page, '#casa');
      await page.screenshot({ path: foto('33-movil-casa.png') });
      await hasta(page, '#carta');
      await page.screenshot({ path: foto('34-movil-carta.png') });
      await hasta(page, '#carta-pescados', 20);
      await page.screenshot({ path: foto('35-movil-pescados.png') });
      await hasta(page, '#pase');
      await page.screenshot({ path: foto('36-movil-pase.png') });
      await hasta(page, '#resenas');
      await page.screenshot({ path: foto('37-movil-resenas.png') });
      await hasta(page, '#encargos');
      await page.screenshot({ path: foto('38-movil-encargos.png') });
      await hasta(page, '#donde');
      await page.screenshot({ path: foto('39-movil-donde.png') });
    }
    comprobar(errores.length === 0, 'móvil: consola sin errores' + (errores.length ? ' → ' + errores.join(' | ') : ''));
    await contexto.close();
  }

  /* ───── 3b. móviles bajos: el texto del hero no pisa el sello ───── */
  for (const vp of [{ width: 375, height: 667 }, { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }]) {
    const { contexto, page } = await nuevaPagina(navegador, { viewport: vp });
    await contexto.addInitScript(() => { try { localStorage.setItem('gabi-cookies', 'ok'); } catch (e) {} });
    await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5200);
    const r = await page.evaluate(() => {
      const caja = e => e.getBoundingClientRect();
      const s = caja(document.querySelector('.hero__sello'));
      const c = caja(document.querySelector('.hero__contenido'));
      const h = caja(document.getElementById('inicio'));
      return { selloAbajo: Math.round(s.bottom), textoArriba: Math.round(c.top), textoAbajo: Math.round(c.bottom), heroAbajo: Math.round(h.bottom) };
    });
    comprobar(r.textoArriba >= r.selloAbajo + 8 && r.textoAbajo <= r.heroAbajo, 'hero ' + vp.width + '×' + vp.height + ': el texto no pisa el sello ni se sale → ' + JSON.stringify(r));
    if (conCapturas) await page.screenshot({ path: foto('3b-hero-' + vp.width + 'x' + vp.height + '.png') });
    await contexto.close();
  }

  /* ───── 4. sin GSAP (CDN caído) ───── */
  {
    const { contexto, page, errores } = await nuevaPagina(navegador);
    await page.route('**/cdn.jsdelivr.net/**', r => r.abort());
    await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    const estado = await page.evaluate(() => ({
      cortina: getComputedStyle(document.getElementById('cortina')).display,
      conMovimiento: document.documentElement.classList.contains('con-movimiento'),
      titulo: document.querySelector('.hero__titulo').getBoundingClientRect().height,
      vino: document.querySelector('#sello-hero .sello__vino').getAttribute('y')
    }));
    comprobar(estado.cortina === 'none', 'sin GSAP: la cortina se retira igual → ' + estado.cortina);
    comprobar(!estado.conMovimiento, 'sin GSAP: no se activa con-movimiento (nada queda a medio revelar)');
    comprobar(estado.vino === '118', 'sin GSAP: la copa del sello se ve llena');
    const apagados = await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3, p, img')].filter(n => {
      const e = getComputedStyle(n);
      return parseFloat(e.opacity) < 0.15 && n.getBoundingClientRect().height > 0;
    }).map(n => n.className || n.tagName));
    comprobar(apagados.length === 0, 'sin GSAP: ningún texto ni foto queda apagado' + (apagados.length ? ' → ' + apagados.join(',') : ''));
    if (conCapturas) await page.screenshot({ path: foto('40-sin-gsap.png') });
    const propios = errores.filter(e => !/Failed to load resource|ERR_FAILED/.test(e));
    comprobar(propios.length === 0, 'sin GSAP: consola sin errores propios' + (propios.length ? ' → ' + propios.join(' | ') : ''));
    await contexto.close();
  }

  /* ───── 5. movimiento reducido ───── */
  {
    const { contexto, page, errores } = await nuevaPagina(navegador, { reducedMotion: 'reduce' });
    await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display) === 'none', 'movimiento reducido: la cortina se retira');
    const alEntrar = await selloEstado(page);
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.8));
    await page.waitForTimeout(500);
    const alBajar = await selloEstado(page);
    comprobar(alEntrar.lugar > 0.9 && alBajar.nota > 0.9 && alBajar.lugar < 0.1,
      'movimiento reducido: el sello sigue cambiando del lema a la nota → ' + JSON.stringify([alEntrar, alBajar]));
    await page.evaluate(() => document.getElementById('casa').scrollIntoView({ block: 'end' }));
    await page.waitForTimeout(900);
    const cifras = await page.$$eval('.cifras [data-contador]', ns => ns.map(n => n.textContent.trim()));
    comprobar(cifras.join('/') === '4,4/933/31', 'movimiento reducido: los contadores muestran el dato → ' + cifras.join('/'));
    if (conCapturas) await page.screenshot({ path: foto('41-movimiento-reducido.png') });
    comprobar(errores.length === 0, 'movimiento reducido: consola sin errores' + (errores.length ? ' → ' + errores.join(' | ') : ''));
    await contexto.close();
  }

  /* ───── 6. 404 ───── */
  {
    const { contexto, page } = await nuevaPagina(navegador);
    const resp = await page.goto(base + '/no-existe.html', { waitUntil: 'domcontentloaded' });
    const titulo = await page.textContent('h1').catch(() => '');
    comprobar(resp.status() === 404 && /arco/i.test(titulo || ''), '404 propio con el lenguaje del sitio → "' + titulo + '"');
    if (conCapturas) await page.screenshot({ path: foto('50-404.png') });
    await contexto.close();
  }
} finally {
  await navegador.close();
  servidor.close();
}

console.log('\n' + notas.join('\n'));
if (fallos.length) {
  console.log('\n──────── FALLOS ────────\n' + fallos.join('\n'));
  process.exitCode = 1;
} else {
  console.log('\nTodo en orden: ' + notas.length + ' comprobaciones.');
}
