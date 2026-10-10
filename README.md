# Chatarra Estelar

Un shooter espacial para el celular. Recorrés un cinturón de chatarra, destruís naves enemigas, mejorás tu nave en pleno vuelo y gastás la chatarra en el hangar para llegar cada vez más lejos.

**Jugar:** https://darkhyper93-jpg.github.io/chatarra-estelar/

Funciona en el navegador de cualquier celular o computadora y **se puede instalar como app**. Después de la primera visita también funciona sin internet.

## Instalarlo en el celular

- **Android (Chrome):** abrí el link, tocá el menú ⋮ y elegí **Instalar app** o **Agregar a la pantalla principal**. También aparece un botón «Instalar en el celular» en el menú del juego.
- **iPhone (Safari):** abrí el link, tocá el botón **Compartir** y elegí **Agregar a inicio**.

Queda un ícono como cualquier otra app; se abre en pantalla completa.

## Cómo se juega

- **Moverse:** arrastrá el dedo en cualquier parte de la pantalla. La nave dispara sola.
- **En la compu:** flechas o WASD para moverse, P o Esc para pausar, 1 a 4 para elegir mejoras.

### Durante una partida

- Cada **sector** dura 30 segundos. Cada 5 sectores aparece un **jefe**.
- Los enemigos sueltan **cristales de experiencia**. Al subir de nivel elegís una mejora entre 3 (o 4) cartas.
- Podés llevar hasta **4 armas** y **5 piezas pasivas**. Cada arma sube hasta el nivel 7.
- **Evoluciones:** si un arma llega al nivel 7 y tenés la pasiva justa, aparece la opción de evolucionarla a una versión mucho más fuerte. Los **cofres** (que sueltan los enemigos élite, los convoyes y los jefes) siempre ofrecen la evolución si está disponible.
- Herramientas: **Cambiar** (otras opciones), **Descartar** (borrar una opción para toda la partida) y **Saltar**.
- **Eventos:** convoyes de carga que escapan, cápsulas de suministros, lluvias de meteoritos y emboscadas élite.

### Entre partidas

- **Hangar:** 20 mejoras permanentes en 4 grupos (ataque, defensa, utilidad y táctica) y 7 naves con armas y rasgos distintos. Se pueden devolver las mejoras para probar otra combinación.
- **Logros:** 33 logros que dan chatarra. Dos naves se desbloquean sólo con logros.
- **Desafío diario:** todos juegan el mismo día con la misma nave y los mismos dos modificadores. Ideal para competir con amigos.
- **Modo Jefes:** los 8 jefes seguidos. Se abre al vencer a El Desguace.
- **Códice:** enciclopedia de enemigos, jefes, armas y pasivas que vas descubriendo.
- **Pasar el progreso a otro dispositivo:** en Ajustes hay un código para copiar y pegar.

## Contenido

| | Cantidad |
|---|---|
| Zonas (cada una con su peligro propio) | 8 |
| Jefes, con 2 o 3 fases cada uno | 8 |
| Tipos de enemigos y obstáculos | 20 |
| Armas / evoluciones | 10 / 10 |
| Piezas pasivas | 11 |
| Naves | 7 |
| Mejoras del hangar | 20 |
| Logros | 33 |
| Modos de juego | Campaña, Desafío diario, Modo Jefes |

Después del sector 40 empieza el **ciclo+**: las zonas se repiten, pero mucho más difíciles.

### Evoluciones

| Arma | Pasiva necesaria | Evolución |
|---|---|---|
| Bláster | Gatillo rápido | Tormenta Gatling |
| Escopeta de chatarra | Placas de blindaje | Trituradora |
| Láser de corte | Lente de enfoque | Rayo Solar |
| Misiles buscadores | Calibre | Enjambre de misiles |
| Drones escolta | Imán de carga | Escuadrón |
| Sierras orbitales | Propulsores | Tornado de acero |
| Rayo en cadena | Multiplicador | Tormenta iónica |
| Pulso nova | Escudo deflector | Supernova |
| Minas de proximidad | Expansor de campo | Bombas de racimo |
| Disco bumerán | Trébol cuántico | Anillos de Saturno |

## Cómo está hecho

El juego usa sólo tecnologías del navegador, **sin librerías ni motores**:

- **HTML y CSS** para los menús y el HUD.
- **JavaScript con módulos** (`import` / `export`) para toda la lógica.
- **Canvas 2D** para dibujar: todas las naves, enemigos y jefes son formas geométricas dibujadas con código (no hay imágenes).
- **Web Audio** para los efectos y la música, que también se generan con código.
- **PWA** (manifiesto + *service worker*) para instalarlo y jugar sin internet.
- **localStorage** para guardar el progreso en el dispositivo.

### Estructura

```
index.html            página principal
css/style.css         estilos
js/main.js            arranque, bucle principal, toques y teclado
js/core/              azar con semilla, guardado, sonido, utilidades
js/data/              datos del juego: armas, enemigos, jefes, zonas, naves, logros...
js/game/              simulación: partida, armas, enemigos, jefes, combate, progreso
js/render/            dibujo en el canvas
js/ui/                pantallas: menú, hangar, logros, códice, ajustes, HUD
sw.js                 service worker (funcionar sin internet)
scripts/              servidor local y generador de la lista del service worker
tests/                pruebas automáticas
```

Algunas decisiones importantes:

- **La simulación está separada del dibujo.** Todo `js/game/` funciona sin navegador, así que las pruebas pueden jugar partidas enteras en Node en segundos.
- **Paso de tiempo fijo** (60 veces por segundo): el juego se comporta igual en un celular lento que en uno rápido.
- **Azar con semilla:** con la misma semilla, la partida es idéntica. Así el Desafío diario es el mismo para todos y las pruebas son repetibles.
- **Los datos están separados del comportamiento.** Para agregar un arma, un enemigo o un logro casi siempre alcanza con sumar una entrada en `js/data/`.

## Pruebas

```bash
npm install          # una sola vez
npm test             # lógica del juego y simulaciones (Node)
npm run test:e2e     # pruebas en un navegador con tamaño de celular (Playwright)
```

- **Pruebas de lógica:** guardado, código de progreso, mejoras, evoluciones, hangar, logros, desafío diario.
- **Simulaciones:** un piloto automático juega partidas completas. Se verifica que cada jefe se pueda vencer en un tiempo razonable, que la campaña completa y el Modo Jefes se puedan terminar sin errores, que la partida sea repetible con la misma semilla y que el balance esté en un rango sano.
- **Pruebas en navegador:** se juega como una persona en pantallas de Android y iPhone: moverse, subir de nivel, pausar, morir, comprar en el hangar, recargar la página, ajustes, los 8 jefes, y que funcione sin internet.

Las pruebas corren solas en GitHub cada vez que se sube un cambio (pestaña **Actions**).

## Probarlo en la compu

```bash
npm start            # abre un servidor en http://localhost:8080
```

Si cambiás archivos del juego, actualizá la versión del service worker para que los celulares bajen la nueva:

```bash
node scripts/gen-sw.js
```

## Créditos

- Juego desarrollado con la asistencia de Claude (IA de Anthropic).
- Fuentes: [Bungee](https://github.com/djrrb/Bungee) y [Chakra Petch](https://github.com/cadsondemak/Chakra-Petch), con licencia SIL Open Font License (ver `assets/fonts/`).
