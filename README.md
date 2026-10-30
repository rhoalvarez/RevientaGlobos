# GloboRush — juego de globos con cámara

Juego web de reacción: se juega moviendo la mano delante de la cámara. La punta del dedo índice funciona como cursor y revienta globos al pasar por encima.

## Tecnologías
- HTML5 y CSS3: interfaz adaptable.
- JavaScript ES Modules: lógica del juego.
- Canvas 2D: animación de globos, partículas y cursor.
- MediaPipe Tasks Vision (Hand Landmarker): detección de los puntos de la mano en tiempo real en el navegador.
- `getUserMedia`: acceso a la cámara.
- `localStorage`: ranking local de puntajes.

La detección de mano se procesa en el dispositivo/navegador. Se necesita conexión a internet para cargar la biblioteca y el modelo de MediaPipe desde sus CDN oficiales.

## Cómo ejecutar (Windows)
La cámara normalmente no funciona abriendo `index.html` directamente como `file://`. Ejecutalo en `localhost`:

### Opción A — Visual Studio Code
1. Descomprimí el ZIP.
2. Abrí la carpeta `GloboRush_Camara` en Visual Studio Code.
3. Si tenés la extensión **Live Server**, hacé clic derecho en `index.html` → **Open with Live Server**.
4. Aceptá el permiso de cámara.

### Opción B — Python instalado
Abrí una terminal dentro de la carpeta y ejecutá:
```bash
python -m http.server 8000
```
Después abrí `http://localhost:8000`.

### Opción C — Node.js instalado
En una terminal dentro de la carpeta:
```bash
npx serve .
```
Abrí la dirección local que indique la terminal.

## Cómo jugar
1. Escribí el nombre y elegí 30, 45 o 60 segundos.
2. Tocá **Activar cámara y jugar** y permití la cámara.
3. Colocá la mano dentro del encuadre. El cursor luminoso muestra dónde está la punta del índice.
4. Pasá el cursor sobre los globos: cada globo de color suma 100 puntos.
5. Evitá los globos negros/rojos con calavera: restan 150 puntos.
6. Al terminar, el puntaje queda guardado en el ranking del navegador.
7. Para una competencia por turnos, usá “Jugar con el siguiente jugador” en la pantalla de resultados.

## Consejos para que detecte bien
- Poné la cámara a la altura del pecho/cara y mostrale la mano completa.
- Usá buena iluminación y un fondo no demasiado cargado.
- Alejá la mano un poco de la cámara para que entre en el encuadre.
- Cerrá otras aplicaciones que estén usando la cámara.
- Si la detección no arranca con GPU, revisá la consola del navegador: algunos equipos o drivers pueden no admitir ese delegado.

## Importante
Es un prototipo funcional de navegador; el rendimiento real depende de la cámara, el navegador, la iluminación y el equipo. La primera carga necesita internet para obtener el modelo. El modo de dos jugadores es por turnos (un jugador termina y luego juega el otro), usando la misma cámara.

\n## Si el botón no responde\n- Reemplazá la carpeta anterior por esta versión corregida y volvé a abrir `index.html` con Live Server.\n- Asegurate de tener Internet, porque MediaPipe se carga desde una CDN.\n- Recargá con `Ctrl + F5`. Si el navegador pregunta por la cámara, elegí **Permitir**.\n- Esta versión intenta usar GPU y, si no está disponible, cambia automáticamente a CPU.\n- Si aparece un aviso de error, copiá el texto exacto para diagnosticarlo.\n

## Si aparece “No se pudo descargar MediaPipe o su modelo”
Esta versión prueba automáticamente jsDelivr y unpkg para la biblioteca y prueba el modelo oficial de Google con un espejo alternativo en GitHub. Si falla también, la conexión, proxy o antivirus puede bloquear esos dominios. Abrí la consola del navegador (F12 → Console) para ver el detalle. La primera carga requiere Internet.
