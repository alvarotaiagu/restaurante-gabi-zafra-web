/* ═══════════════════════════════════════════════════════════════════════════
   Restaurante Gabi · «Soportal»
   Se entra por un arco (la cortina), el hero es la arcada anclada: al bajar,
   la copa del sello se llena, la luz de la plaza gira por el suelo y el lema
   del sello deja paso a la nota de Google. Después, cada capítulo es un arco.

   Banderas separadas a propósito:
     gsapReady  → hay motor de animación (GSAP + ScrollTrigger cargados)
     movimiento → además el usuario NO ha pedido reducir el movimiento
   Con movimiento reducido el CONTENIDO sigue cambiando (el sello pasa del
   lema a la nota, los contadores dan su cifra); lo que se apaga es el viaje.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esTactil = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var gsapReady = !!(window.gsap && window.ScrollTrigger);
  var movimiento = gsapReady && !reduce;
  var gsap = window.gsap;

  if (gsapReady) gsap.registerPlugin(window.ScrollTrigger);
  if (movimiento) html.classList.add('con-movimiento');

  function alturaCabecera() {
    return parseFloat(getComputedStyle(html).getPropertyValue('--cab')) || 76;
  }

  function cuandoVisible(nodos, umbral, alEntrar) {
    if (!('IntersectionObserver' in window)) { nodos.forEach(alEntrar); return; }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        alEntrar(en.target);
      });
    }, { threshold: umbral });
    nodos.forEach(function (n) { obs.observe(n); });
  }

  /* ───────────────────────── Lenis ───────────────────────── */
  var lenis = null;
  if (movimiento && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function irA(destino) {
    var desfase = -alturaCabecera() + 1;
    if (lenis) { lenis.scrollTo(destino, { offset: desfase, duration: 1.6 }); return; }
    var el = typeof destino === 'string' ? document.querySelector(destino) : destino;
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset + desfase);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || !document.querySelector(id)) return;
    e.preventDefault();
    cerrarMenu();
    irA(id);
  });

  /* ───────────────────── titulares partidos ───────────────────── */
  function partir(el) {
    var modo = el.dataset.revelar;
    var palabras = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.textContent = '';
    var piezas = [];

    palabras.forEach(function (palabra, i) {
      var caja = document.createElement('span');
      caja.className = 'palabra';
      caja.setAttribute('aria-hidden', 'true');
      if (modo === 'letras') {
        palabra.split('').forEach(function (c) {
          var s = document.createElement('span');
          s.className = 'letra';
          s.textContent = c;
          caja.appendChild(s);
          piezas.push(s);
        });
      } else {
        var s = document.createElement('span');
        s.className = 'palabra-int';
        s.textContent = palabra;
        caja.appendChild(s);
        piezas.push(s);
      }
      el.appendChild(caja);
      if (i < palabras.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return piezas;
  }

  function revelar(el, piezas) {
    gsap.to(piezas, {
      y: 0,
      duration: 1.1,
      ease: 'expo.out',
      stagger: el.dataset.revelar === 'letras' ? 0.022 : 0.07
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-revelar]'), function (el) {
    var piezas = partir(el);
    if (!movimiento) return;
    if (el.closest('.hero')) {
      /* el titular del hero espera a que se abra el arco de la cortina */
      document.addEventListener('cortina-retirada', function () { revelar(el, piezas); }, { once: true });
      return;
    }
    /* una sola vez: IntersectionObserver, nunca ScrollTrigger once:true
       (no dispara si el elemento ya está en pantalla al crearse) */
    cuandoVisible([el], 0.3, function () { revelar(el, piezas); });
  });

  /* ───────────────── cortina: el sello se dibuja y se entra por el arco ───────────────── */
  (function cortina() {
    var cort = document.getElementById('cortina');
    if (!cort) return;
    var muro = document.getElementById('cortina-muro');
    var relleno = document.getElementById('cortina-relleno');
    var filo = document.getElementById('cortina-filo');
    var sello = cort.querySelector('.cortina__sello');
    var trazas = Array.prototype.slice.call(cort.querySelectorAll('.sello__traza'));
    var letras = Array.prototype.slice.call(cort.querySelectorAll('.sello__letra'));
    var firma = cort.querySelector('.sello__firma');
    var abajo = cort.querySelector('.sello__abajo');
    var pie = cort.querySelector('.cortina__pie');
    var hecho = false;

    function retirar() {
      if (hecho) return;
      hecho = true;
      cort.classList.add('fuera');
      document.body.style.removeProperty('overflow');
      if (lenis) lenis.start();
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      document.dispatchEvent(new CustomEvent('cortina-retirada'));
    }

    if (!movimiento) {
      /* sin GSAP o con movimiento reducido se retira igual: nunca tapa la página */
      setTimeout(retirar, reduce ? 300 : 120);
      return;
    }

    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();

    var w = 0, h = 0;
    var arco = { p: 0 };

    function medir() {
      w = window.innerWidth; h = window.innerHeight;
      muro.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      pintar();
    }

    function hueco(abierto) {
      var tope = Math.max(w, h / 0.55) * 1.18;
      var ancho = tope * arco.p;
      var r = ancho / 2, cx = w / 2, base = h + 2;
      var recto = ancho * 0.55;
      var ys = (h - recto).toFixed(1);
      var d = 'M' + (cx - r).toFixed(1) + ' ' + base + 'V' + ys +
        'A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + (cx + r).toFixed(1) + ' ' + ys +
        'V' + base;
      return abierto ? d : d + 'Z';
    }

    function pintar() {
      relleno.setAttribute('d', 'M0 0H' + w + 'V' + h + 'H0Z' + (arco.p > 0 ? hueco(false) : ''));
      filo.setAttribute('d', arco.p > 0 ? hueco(true) : '');
    }

    medir();
    window.addEventListener('resize', medir);

    trazas.forEach(function (t) {
      var l = 600;
      try { l = Math.ceil(t.getTotalLength()) + 2; } catch (e) {}
      gsap.set(t, { strokeDasharray: l, strokeDashoffset: l });
    });

    var tl = gsap.timeline({ onComplete: retirar });
    tl.to(trazas.slice(0, 2), { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut', stagger: 0.1 }, 0)
      .to(trazas.slice(2, 4), { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', stagger: 0.12 }, 0.25)
      .to(trazas.slice(4), { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut', stagger: 0.09 }, 0.4)
      .to(letras, { opacity: 1, duration: 0.4, ease: 'power1.out', stagger: 0.035 }, 0.55)
      .to(firma, { clipPath: 'inset(0 0% 0 0)', duration: 0.75, ease: 'power2.out' }, 0.9)
      .to([abajo, pie], { opacity: 1, duration: 0.5, ease: 'power1.out' }, 1.1)
      /* el sello se aparta y el muro se abre por un arco desde el suelo */
      .to(sello, { scale: 0.82, opacity: 0, duration: 0.6, ease: 'power3.in' }, 1.85)
      .to(pie, { opacity: 0, duration: 0.3 }, 1.85)
      .to(arco, { p: 1, duration: 1.35, ease: 'expo.inOut', onUpdate: pintar }, 1.9)
      .to(filo, { opacity: 0, duration: 0.4, ease: 'power1.in' }, 2.95);

    /* red de seguridad: pase lo que pase, a los 6,5 s la cortina se va */
    setTimeout(retirar, 6500);
  })();

  /* ───────────────── hero: la arcada anclada ───────────────── */
  (function hero() {
    var seccion = document.getElementById('inicio');
    var sello = document.getElementById('sello-hero');
    if (!seccion || !sello) return;

    var vino = sello.querySelector('.sello__vino');
    var lugar = sello.querySelector('.sello__abajo--lugar');
    var nota = sello.querySelector('.sello__abajo--nota');
    var trazosLugar = lugar ? Array.prototype.slice.call(lugar.children) : [];
    var trazosNota = nota ? Array.prototype.slice.call(nota.children) : [];

    if (!movimiento) {
      /* sin viaje, pero el sello sigue cambiando del lema a la nota al bajar */
      var mostrandoNota = false;
      var cambiar = function () {
        var fuera = seccion.getBoundingClientRect().bottom < window.innerHeight * 0.7;
        if (fuera === mostrandoNota) return;
        mostrandoNota = fuera;
        if (lugar) lugar.style.opacity = fuera ? '0' : '1';
        if (nota) nota.style.opacity = fuera ? '1' : '0';
      };
      window.addEventListener('scroll', cambiar, { passive: true });
      cambiar();
      return;
    }

    var q = function (s) { return seccion.querySelector(s); };
    var muro = q('.hero__muro');
    var fondo = q('.hero__fondo');
    var terraza = q('.hero__terraza');
    var luz = q('.hero__luz');
    var caja = q('.hero__sello');
    var contenido = q('.hero__contenido');
    var desliza = q('.hero__desliza');
    var arquivoltas = Array.prototype.slice.call(seccion.querySelectorAll('.hero__arquivoltas path'));

    gsap.set(vino, { attr: { y: 160 } });
    gsap.set(nota, { opacity: 1 });
    gsap.set(trazosNota, { opacity: 0 });
    gsap.set(luz, { skewX: -26, svgOrigin: '720 720' });

    /* entrada tras la cortina: las arquivoltas se trazan y el sello cae en su sitio */
    arquivoltas.forEach(function (p) {
      var l = Math.ceil(p.getTotalLength()) + 2;
      gsap.set(p, { strokeDasharray: l, strokeDashoffset: l });
    });
    /* la entrada anima escala y opacidad del disco y el giro del sello de dentro;
       el scroll anima giro y altura del disco: nunca la misma propiedad */
    gsap.set(caja, { scale: 0.7, opacity: 0 });
    gsap.set(sello, { rotation: 55, transformOrigin: '50% 50%' });
    gsap.set([contenido.querySelector('.rotulo'), contenido.querySelector('.hero__entrada'), contenido.querySelector('.hero__acciones'), contenido.querySelector('.hero__nota')], { opacity: 0, y: 24 });

    document.addEventListener('cortina-retirada', function () {
      gsap.to(arquivoltas, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.12 });
      gsap.to(caja, { scale: 1, opacity: 1, duration: 1.3, ease: 'expo.out', delay: 0.25 });
      gsap.to(sello, { rotation: 0, duration: 1.6, ease: 'expo.out', delay: 0.25 });
      gsap.to([contenido.querySelector('.rotulo'), contenido.querySelector('.hero__entrada'), contenido.querySelector('.hero__acciones'), contenido.querySelector('.hero__nota')], {
        opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.45
      });
    }, { once: true });

    var tl = gsap.timeline({ defaults: { ease: 'none' } });
    tl.to(vino, { attr: { y: 112 }, duration: 0.55, ease: 'power1.inOut' }, 0)
      .to(muro, { scale: 1.16, svgOrigin: '720 780', duration: 1 }, 0)
      .to(fondo, { y: -28, duration: 1 }, 0)
      .to(terraza, { y: -12, duration: 1 }, 0)
      .to(luz, { skewX: 16, opacity: 0.5, duration: 1 }, 0)
      .to(caja, { rotation: -9, y: 26, duration: 1 }, 0)
      .to(desliza, { opacity: 0, duration: 0.12 }, 0)
      .to(trazosLugar, { opacity: 0, duration: 0.08, stagger: 0.006 }, 0.5)
      .to(trazosNota, { opacity: 1, duration: 0.08, stagger: 0.006 }, 0.58)
      .to(contenido, { y: -36, duration: 0.4 }, 0.6);

    window.ScrollTrigger.create({
      trigger: seccion,
      start: 'top top',
      end: '+=140%',
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      animation: tl
    });
  })();

  /* ───────────────── cinta infinita ───────────────── */
  (function cinta() {
    var pista = document.getElementById('cinta-pista');
    if (!pista) return;
    var grupo = pista.firstElementChild;
    var copias = Math.ceil((window.innerWidth * 2) / Math.max(1, grupo.offsetWidth)) + 1;
    for (var i = 0; i < copias; i++) {
      var c = grupo.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      pista.appendChild(c);
    }
    if (!movimiento) return;

    var x = 0, base = 0.6, extra = 0;
    if (lenis) lenis.on('scroll', function (e) { extra = Math.min(Math.abs(e.velocity || 0) * 0.35, 8); });
    /* rAF propio: ningún tween de GSAP toca esta propiedad, el += no pisa nada */
    (function paso() {
      if (!html.classList.contains('densidad-sobria')) {
        var ancho = grupo.offsetWidth;
        x -= base + extra;
        extra *= 0.92;
        if (ancho && x <= -ancho) x += ancho;
        pista.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      }
      requestAnimationFrame(paso);
    })();
  })();

  /* ───────────────── separadores: el arco se traza al pasar ───────────────── */
  (function separadores() {
    var lineas = Array.prototype.slice.call(document.querySelectorAll('.arco-sep__linea'));
    if (!movimiento) return;
    lineas.forEach(function (p) {
      var l = Math.ceil(p.getTotalLength()) + 2;
      gsap.set(p, { strokeDasharray: l, strokeDashoffset: l });
      gsap.to(p, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: { trigger: p.closest('.arco-sep'), start: 'top 92%', end: 'top 35%', scrub: 0.8 }
      });
    });
  })();

  /* ───────────────── ventanas en arco: se abren y la foto deriva ───────────────── */
  (function ventanas() {
    var todas = Array.prototype.slice.call(document.querySelectorAll('.ventana'));
    if (!todas.length) return;
    cuandoVisible(todas, 0.2, function (v) {
      var i = Array.prototype.indexOf.call(v.parentNode.parentNode.children, v.parentNode);
      var retardo = v.classList.contains('ventana--galeria') ? Math.max(i, 0) * 110 : 0;
      setTimeout(function () { v.classList.add('visible'); }, retardo);
    });
    if (!movimiento) return;
    todas.forEach(function (v) {
      var img = v.querySelector('img');
      if (!img) return;
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: v, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  })();

  /* ───────────────── carta: los arcos se apilan ───────────────── */
  (function pila() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.pila__item'));
    var lista = document.getElementById('pila');
    if (!items.length || !lista) return;
    var disparos = [];

    /* Todas miden lo que la más alta: es la condición para que la pila no se
       deshaga (ver estilos.css). Se mide el contenido real, no la pantalla,
       así que las tarjetas no son más altas de lo que necesitan. */
    function igualar() {
      var tarjetas = items.map(function (it) { return it.querySelector('.tarjeta'); });
      lista.style.removeProperty('--alto-tarjeta');
      if (getComputedStyle(items[0]).position !== 'sticky') return;
      tarjetas.forEach(function (t) { t.style.height = 'auto'; });
      var alto = Math.max.apply(null, tarjetas.map(function (t) { return t.offsetHeight; }));   /* offsetHeight ignora el scale */
      tarjetas.forEach(function (t) { t.style.removeProperty('height'); });
      lista.style.setProperty('--alto-tarjeta', alto + 'px');
    }

    function montar() {
      igualar();
      if (!movimiento) return;
      disparos.forEach(function (d) { d.kill(); });
      disparos = [];
      items.forEach(function (it) {
        var t = it.querySelector('.tarjeta');
        gsap.set(t, { clearProps: 'transform' });
        t.style.removeProperty('--oscuro');
      });
      if (getComputedStyle(items[0]).position !== 'sticky') return;

      var tope = alturaCabecera() + window.innerHeight * 0.03;
      items.forEach(function (it, i) {
        var siguiente = items[i + 1];
        if (!siguiente) return;
        var tarjeta = it.querySelector('.tarjeta');
        var tw = gsap.fromTo(tarjeta, { scale: 1, '--oscuro': 0 }, { scale: 0.92, '--oscuro': 0.26, ease: 'none', paused: true });
        disparos.push(window.ScrollTrigger.create({
          trigger: siguiente,
          start: 'top bottom',
          end: 'top ' + Math.round(tope) + 'px',          /* acaba justo cuando la siguiente se posa */
          scrub: true,
          animation: tw
        }));
      });
    }

    montar();
    var temporizador;
    window.addEventListener('resize', function () {
      clearTimeout(temporizador);
      temporizador = setTimeout(function () { montar(); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, 220);
    });
    document.addEventListener('densidad-cambiada', function () {
      setTimeout(function () { montar(); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, 60);
    });
    /* Fraunces cambia la altura de los textos al llegar: volver a medir */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { montar(); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); });
  })();

  /* ───────────────── contadores ───────────────── */
  (function contadores() {
    var nodos = Array.prototype.slice.call(document.querySelectorAll('[data-contador]'));
    function formatear(n, el) {
      var dec = parseInt(el.dataset.decimales || '0', 10);
      var texto = dec ? n.toFixed(dec).replace('.', ',') : Math.round(n).toString();
      if (n >= 10000) texto = texto.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return texto;
    }
    if (movimiento) nodos.forEach(function (el) { el.textContent = formatear(0, el); });
    cuandoVisible(nodos, 0.5, function (el) {
      var fin = parseFloat(el.dataset.contador);
      /* con movimiento reducido el dato aparece igual: se pone, no se anima */
      if (!movimiento) { el.textContent = formatear(fin, el); return; }
      var estado = { v: 0 };
      gsap.to(estado, {
        v: fin, duration: 1.8, ease: 'power2.out',
        onUpdate: function () { el.textContent = formatear(estado.v, el); },
        onComplete: function () { el.textContent = formatear(fin, el); }
      });
    });
  })();

  /* ───────────────── bloques que entran al verse ───────────────── */
  cuandoVisible(Array.prototype.slice.call(document.querySelectorAll('.temas, .encargos')), 0.35, function (n) { n.classList.add('visible'); });
  cuandoVisible(Array.prototype.slice.call(document.querySelectorAll('.cita')), 0.25, function (n) { n.classList.add('visible'); });

  /* ───────────────── botones magnéticos ───────────────── */
  (function imanes() {
    if (!movimiento || esTactil) return;
    Array.prototype.forEach.call(document.querySelectorAll('.iman'), function (el) {
      var aX = gsap.quickTo(el, 'x', { duration: 0.55, ease: 'power3.out' });
      var aY = gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var c = el.getBoundingClientRect();
        aX((e.clientX - (c.left + c.width / 2)) * 0.3);
        aY((e.clientY - (c.top + c.height / 2)) * 0.4);
      });
      el.addEventListener('pointerleave', function () { aX(0); aY(0); });
    });
  })();

  /* ───────────────── cursor propio ───────────────── */
  (function cursor() {
    if (!movimiento || esTactil) return;
    /* aro que persigue con retraso + punto pegado al puntero */
    var c = document.createElement('div');
    var p = document.createElement('div');
    c.className = 'cursor';
    p.className = 'cursor-punto';
    [c, p].forEach(function (n) { n.setAttribute('aria-hidden', 'true'); document.body.appendChild(n); });

    var aX = gsap.quickTo(c, 'x', { duration: 0.28, ease: 'power3.out' });
    var aY = gsap.quickTo(c, 'y', { duration: 0.28, ease: 'power3.out' });

    function mostrar(si) {
      c.classList.toggle('cursor--vivo', si);
      p.classList.toggle('cursor--vivo', si);
    }

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!c.classList.contains('cursor--vivo')) {
        gsap.set(c, { x: e.clientX, y: e.clientY });
        html.classList.add('con-cursor');        /* el del sistema se oculta solo cuando el propio ya se ve */
        mostrar(true);
      }
      gsap.set(p, { x: e.clientX, y: e.clientY });
      aX(e.clientX); aY(e.clientY);
    });
    document.documentElement.addEventListener('mouseleave', function () { mostrar(false); });
    document.documentElement.addEventListener('mouseenter', function () { if (html.classList.contains('con-cursor')) mostrar(true); });
    document.addEventListener('pointerover', function (e) {
      var sobre = !!e.target.closest('a, button, .ventana, .ambiente');
      c.classList.toggle('cursor--activo', sobre);
      p.classList.toggle('cursor-punto--activo', sobre);
    });
  })();

  /* ───────────────── cabecera ───────────────── */
  var cabecera = document.getElementById('cabecera');
  var boton = document.getElementById('hamburguesa');

  (function cabeceraFija() {
    var cinta = document.querySelector('.cinta');
    if (!cabecera || !cinta) return;
    function actualizar() {
      cabecera.classList.toggle('cabecera--fija', cinta.getBoundingClientRect().top <= alturaCabecera() + 1);
    }
    window.addEventListener('scroll', actualizar, { passive: true });
    window.addEventListener('resize', actualizar);
    actualizar();
  })();

  function cerrarMenu() {
    if (!cabecera || !boton || !cabecera.classList.contains('menu-abierto')) return;
    cabecera.classList.remove('menu-abierto');
    boton.setAttribute('aria-expanded', 'false');
    boton.querySelector('.visualmente-oculto').textContent = 'Abrir menú';
    if (lenis) lenis.start();
  }

  if (boton) {
    boton.addEventListener('click', function () {
      var abierto = cabecera.classList.toggle('menu-abierto');
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      boton.querySelector('.visualmente-oculto').textContent = abierto ? 'Cerrar menú' : 'Abrir menú';
      if (lenis) { if (abierto) lenis.stop(); else lenis.start(); }
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });

  /* ───────────────── mapa solo bajo clic ───────────────── */
  (function mapa() {
    var btn = document.getElementById('mapa-boton');
    var caja = document.getElementById('mapa-consentimiento');
    if (!btn || !caja) return;
    btn.addEventListener('click', function () {
      var marco = document.createElement('iframe');
      marco.src = 'https://www.google.com/maps?q=' +
        encodeURIComponent('Restaurante Gabi, Plaza de España 0, 06300 Zafra, Badajoz') + '&output=embed';
      marco.loading = 'lazy';
      marco.title = 'Mapa: Restaurante Gabi en la Plaza de España de Zafra';
      marco.referrerPolicy = 'no-referrer-when-downgrade';
      caja.parentNode.replaceChild(marco, caja);
    });
  })();

  /* ───────────────── aviso de cookies ───────────────── */
  (function cookies() {
    var caja = document.getElementById('cookies');
    var ok = document.getElementById('cookies-aceptar');
    if (!caja || !ok) return;
    var guardado = null;
    try { guardado = localStorage.getItem('gabi-cookies'); } catch (e) {}
    if (guardado !== 'ok') {
      caja.hidden = false;
      document.body.classList.add('cookies-visibles');
    }
    ok.addEventListener('click', function () {
      caja.hidden = true;                     /* el CSS pone display solo si NO hay [hidden] */
      document.body.classList.remove('cookies-visibles');
      try { localStorage.setItem('gabi-cookies', 'ok'); } catch (e) {}
    });
  })();

  var anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();

  /* las medidas cambian cuando llega Fraunces: recalcular anclajes */
  if (gsapReady && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { window.ScrollTrigger.refresh(); });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     [MANDO DE MAQUETA] — SOLO REVISIÓN INTERNA. NO PUBLICAR.
     Borrar este bloque entero, el bloque CSS marcado igual en estilos.css,
     el <div class="mando"> del HTML y el script bloqueante del <head>.
     ═══════════════════════════════════════════════════════════════════════ */
  (function mandoMaqueta() {
    var mando = document.getElementById('mando');
    if (!mando) return;
    mando.hidden = false;                       /* sin JS no haría nada: lo enseña el JS */
    var botones = Array.prototype.slice.call(mando.querySelectorAll('[data-densidad]'));

    function aplicar(d) {
      html.classList.remove('densidad-soportal', 'densidad-sobria');
      html.classList.add('densidad-' + d);
      botones.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.densidad === d ? 'true' : 'false'); });
      try { localStorage.setItem('gabi-densidad', d); } catch (e) {}
      document.dispatchEvent(new CustomEvent('densidad-cambiada', { detail: d }));
      if (window.ScrollTrigger) setTimeout(function () { window.ScrollTrigger.refresh(); }, 80);
    }

    var actual = html.classList.contains('densidad-sobria') ? 'sobria' : 'soportal';
    botones.forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.densidad === actual ? 'true' : 'false');
      b.addEventListener('click', function () { aplicar(b.dataset.densidad); });
    });
  })();
  /* ═══════════ fin del bloque [MANDO DE MAQUETA] ═══════════ */

})();
