# Restaurante Gabi · Zafra

Web de **Restaurante Gabi**, restaurante real en la Plaza de España de Zafra (Badajoz), abierto en 2007.

> **Estado: maqueta de presentación. Todavía no se puede publicar como web del cliente.**
> Todas las páginas llevan `noindex, nofollow`. Hay un mando de revisión interno que se borra antes de entregar, y varios datos marcados como `[PENDIENTE]`.

## Concepto: «Soportal»

Zafra se recorre bajo arcos, y la página también:

- **Cortina**: el sello se dibuja trazo a trazo (anillos, plato y copa), aparecen las letras, se escribe la firma y el muro se abre en un **arco que crece desde el suelo**. Por ese arco se entra al hero.
- **Hero anclado**: una arcada de cinco arcos con la plaza al sol al fondo. Al bajar, **la copa del sello se llena**, la luz que entra por los arcos gira por el suelo, el muro se acerca y el arco inferior del sello cambia de «ZAFRA · DESDE 2007» a «4,4 ★ · 933 RESEÑAS». Es el mismo sello trabajando dos veces.
- **La carta**: cinco capítulos con forma de arco rebajado y su dovela ámbar. Se apilan al bajar (el de abajo se hunde y oscurece).
- **Del pase**: cinco ventanas en arco, una por foto real, que se abren desde abajo con la foto derivando dentro.
- Separadores en arco que se trazan al pasar, cinta con velocidad ligada al scroll, botones magnéticos, cursor propio, titulares partidos por letras y por palabras, contadores y barras de temas de reseñas.

Paleta sacada del sello: crema `#FBF7EC`, marino `#1E2A44`, terracota `#B5562A` y ámbar `#C89248`. Tipografías: Fraunces para los títulos e Inter para el texto.

## Fuentes y fecha de cada dato (consultado el 26-09-2026)

| Dato | Fuente |
|---|---|
| Dirección, teléfono 659 52 93 31, 4,4 ★ con 933 reseñas, «Terraza · Comedor privado · Buenos cócteles», cierre a las 0:00 | Ficha de Google Maps (capturas que envió el cliente) |
| Temas de las reseñas: raciones 50 · bacalao 37 · terraza 27 · brasa 25 | Chips de la misma ficha de Google |
| Las cinco reseñas citadas | Google, texto literal hasta donde Google lo muestra sin «Más» |
| Carta completa con precios | Texto pegado por el cliente (carta publicada) |
| «Since 2007», #COMEYBEBEQUELAVIDAESBREVE, teléfono de encargos 638 568 328 y «Se hacen pedidos por encargo, para recoger o para comer allí» | Biografía de su Instagram `@restaurantegabi_zafra` |
| Fotos (bacalao dorado, carrilleras, chuletón, ensalada de rulo de cabra, gambones a la brasa) | Publicaciones de su Instagram, oct. 2021 – ene. 2023. Enlazadas desde la galería |

Tratamiento de las fotos: recorte 3:4, balance de grises parcial, grado cálido común, luminancia igualada y desenfoque del fondo alrededor del plato, para que parezcan de la misma sesión. Se descartó la del pulpo porque el mantel impreso enseña precios antiguos.

## Datos pendientes de confirmar con el cliente

- [ ] **Dos teléfonos**: 659 52 93 31 (Google) y 638 568 328 (Instagram). La web presenta el primero para reservas y el segundo para encargos. Confirmar.
- [ ] **Horario completo y día de descanso**. Solo se sabe que un día cerraba a las 0:00.
- [ ] Precio de **Anchoas del Cantábrico** y **Ossobuco de cordero** (la carta no los trae).
- [ ] Vigencia de los precios de la carta.
- [ ] **Si el local está bajo soportales.** El concepto usa los arcos de Zafra como imagen y el titular dice «Bajo los arcos»; ningún texto afirma que el restaurante tenga soportales, pero conviene que el cliente lo vea.
- [ ] Razón social, NIF y correo para el aviso legal y la privacidad.
- [ ] Permiso para usar las fotos de su Instagram y para citar las reseñas con nombre. Algunos platos de las fotos (carrilleras, ensalada de rulo de cabra) no están en la carta actual; la galería lo advierte.
- [ ] **Sello**: redibujado a partir del logo original (copa, plato, «RESTAURANTE» en arco y la firma «gabi»). La firma está compuesta en Caveat, no calcada; validar con el cliente. Versión suelta en `assets/logo-gabi.svg`.

## Estructura

```
index.html          una sola página: cortina, hero, cinta, casa, carta, pase, reseñas, encargos, dónde
404.html            «Este arco no lleva a ninguna parte»
aviso-legal.html    borrador con pendientes
privacidad.html     borrador; lista lo que se guarda en localStorage
css/estilos.css
js/main.js          GSAP 3.12.5 + ScrollTrigger + Lenis 1.1.13, desde jsDelivr (cdnjs ya no sirve Lenis)
assets/             sello, favicon, imagen OG y fotos en dos tamaños
scripts/            servir.mjs, verificar.mjs, comprobar-borrado.mjs
```

## Revisar en local

```
node scripts/servir.mjs              # http://127.0.0.1:4190
node scripts/verificar.mjs           # 43 comprobaciones con Playwright
node scripts/verificar.mjs --capturas
```

`verificar.mjs` prueba: cortina que se abre y acaba en `display:none` (normal, sin GSAP y con movimiento reducido), copa que se llena y sello que cambia al bajar, pila de la carta, ventanas abiertas, contadores, que el recuento de platos (31) coincida entre la carta, la cifra y la tabla de la sobria, cookies, mapa solo bajo clic, las dos densidades, móvil sin desbordamiento, menú móvil con la cabecera fija y 404.

## Quitar el mando de maqueta antes de entregar

El mando de abajo a la izquierda cambia en vivo entre dos densidades:

- **Soportal**: el arco en todas partes (separadores, ventanas, tarjetas, ambientes, marco del mapa, arco de encargos).
- **Sobria**: el arco solo donde significa algo (la arcada del hero y el sello). Las tarjetas dejan de apilarse y se ven los cinco capítulos a la vez, y a cambio entra **la carta en cifras** (platos y horquilla de precios por capítulo), que la Soportal no tiene.

Para borrarlo:

1. `index.html`: el `<script>` bloqueante del `<head>` marcado `[MANDO DE MAQUETA]`, el `<div class="mando">` del final y la `<table class="carta__cifras">`. Quitar `densidad-soportal` de la clase del `<html>`. Si el cliente elige la sobria, antes de borrar pasar sus reglas a CSS normal.
2. `css/estilos.css`: todo lo que hay entre `[MANDO DE MAQUETA]` y `fin del bloque [MANDO DE MAQUETA]`.
3. `js/main.js`: la función `mandoMaqueta()` entre los mismos comentarios y las dos escuchas de `densidad-cambiada`.
4. `privacidad.html`: la fila `gabi-densidad`.
5. `node scripts/comprobar-borrado.mjs`: falla si queda algún rastro.

## Antes de publicar como web del cliente

- [ ] Resolver los pendientes de arriba.
- [ ] Borrar el mando y pasar `comprobar-borrado.mjs`.
- [ ] Quitar el `noindex` de las cuatro páginas.
