# Contigo · Juego de realidad mixta para Alzheimer y cuidadores

Simulación interactiva (React + Three.js + WebXR) de un brazalete asistencial.
- **Paciente (3D / VR / MR):** camina por el barrio en primera persona, con gafas VR o en pantalla.
- **Cuidador:** panel de monitoreo y apoyo en tiempo real.

## Desarrollo

Se necesita Node.js 22 (o una versión compatible con Vite 7).

```bash
npm ci
npm run dev
```

## Compilar y previsualizar

```bash
npm run build    # genera el sitio estático completo en dist/
npm run preview  # sirve la compilación localmente
```

Para probar la misma ruta que usa este repositorio en GitHub Pages (macOS/Linux):

```bash
PAGES_BASE_PATH=/Asistente-de-cuidadores-y-pacientes-con-Alzheimer- npm run build
PAGES_BASE_PATH=/Asistente-de-cuidadores-y-pacientes-con-Alzheimer- npm run preview
```

Abre la dirección indicada por Vite, incluida la ruta del repositorio. En PowerShell, define primero `$env:PAGES_BASE_PATH` con ese mismo valor y luego ejecuta los dos comandos de npm. Para volver a una compilación en la raíz, elimina esa variable y vuelve a compilar.

Para comprobar los tipos y la compilación, ejecuta `npm run typecheck` y después `npm test`. Las pruebas necesitan que `npm run build` se haya ejecutado primero y que `PAGES_BASE_PATH` tenga el mismo valor usado durante esa compilación.

## Publicar en GitHub Pages

1. En el repositorio de GitHub, abre **Settings → Pages → Build and deployment** y selecciona **GitHub Actions** como fuente. No uses «Deploy from a branch»: los archivos fuente de Vite necesitan compilarse antes de publicarse.
2. Incorpora estos cambios a la rama `main`. El flujo **Deploy GitHub Pages** se ejecutará automáticamente en cada cambio de `main`. También puedes iniciarlo desde **Actions → Deploy GitHub Pages → Run workflow**, eligiendo `main`.
3. Cuando el flujo termine correctamente, abre [Contigo en GitHub Pages](https://nicoledayana.github.io/Asistente-de-cuidadores-y-pacientes-con-Alzheimer-/). Si cambiaste la configuración después de incorporar los cambios, vuelve a ejecutar el flujo manualmente.

El flujo obtiene la ruta base de la configuración de Pages, instala las dependencias, comprueba los tipos, compila y ejecuta las pruebas antes de publicar todo `dist/`, incluidas las imágenes. Esto también permite usar otra ruta de proyecto o un dominio personalizado sin cambiar el código.

## Gafas VR

WebXR exige HTTPS. GitHub Pages proporciona HTTPS: abre la URL en el navegador de unas gafas compatibles (Quest, Pico…) y pulsa **Entrar en VR** cuando esté disponible.
