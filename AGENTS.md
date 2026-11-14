# Contexto para Codex

## Proyecto y objetivo del equipo

Este proyecto se llama JEZERO. El usuario quiere que varios compañeros lo mejoren usando Codex, Codex o Antigravity, cada uno desde su propia computadora y cuenta de GitHub.

- Repositorio compartido: https://github.com/TheBox-coder/Guia-de-supervivencia-NASA.git
- Copia usada en esta conversación: `C:\Users\bayar\Downloads\JEZERO\Marte`.
- Existe otra copia en `C:\Users\bayar\Downloads\JEZERO\Guia-de-supervivencia-NASA`; en la última comprobación estaba atrasada. No mezclar ambas carpetas ni reemplazar una con la otra.
- Rama compartida: `main`.
- Render publica la aplicación. El usuario confirmó que el último cambio subido apareció en la web. No se inspeccionó directamente la configuración del panel de Render.

## Estado al entregar este contexto

- Último commit local comprobado: `41088d4`, `Add Golden Orbit color palette to settings`.
- `main` y la referencia local `origin/main` estaban alineadas y no había cambios pendientes antes de crear este archivo. Comprueba el estado actual: esta información puede quedar desactualizada.
- Se añadió la paleta **Órbita Dorada / Golden Orbit** en Opciones, con fondos azul noche y acentos dorados.
- Archivos del cambio: `index.html`, `modules/theme.js`, `modules/i18n.js`.
- Se reutilizó el sistema de temas existente, incluidas selección persistente y traducción al inglés.
- Pasaron las 64 pruebas existentes y una comprobación de selección, variables CSS, traducción y persistencia del tema.
- El usuario confirmó que el cambio se publicó correctamente.
- Conserva esta paleta y las demás mejoras existentes al hacer tareas nuevas, salvo que el usuario solicite cambiarlas.

## Entorno comprobado

- Git 2.56, Node.js 26.13 y npm 11.20 instalados.
- El proyecto requiere Node.js >=20 y no declara dependencias npm de producción.
- Comandos: `npm start` para ejecutar y `npm test` para las pruebas. Lee también README y package.json por si cambian.
- El servidor local respondió correctamente en `/api/health`.
- Codex y Codex están instalados; nombre y correo de Git están configurados.
- Una simulación de push a GitHub terminó correctamente después de que el usuario se autenticó. Comprueba la autenticación cuando la necesites.
- Se revocó un token que estaba incrustado en el remoto local y se retiró de esa URL. No recuperes ni reutilices ese token. No muestres credenciales ni las guardes en el proyecto o en chats.

## Flujo habitual de colaboración

1. Lee las instrucciones aplicables y revisa `git status`, la rama y el remoto antes de editar. No muestres credenciales.
2. Conserva cualquier trabajo local pendiente. No descartes, borres ni sobrescribas cambios para sincronizar.
3. Con el árbol limpio, actualiza `main` mediante `git pull --ff-only origin main`. Si hay commits locales, divergencia o cambios pendientes, analiza la situación antes de proceder.
4. Trabaja en `main` por preferencia explícita del usuario; si una mejora ya está en otra rama, intégrala conservando los cambios del equipo.
5. Implementa el cambio mínimo completo, revisa el código conectado y ejecuta las comprobaciones apropiadas.
6. Si el equipo integra nuevos cambios mientras trabajas, incorpora `origin/main` a tu rama conservando el trabajo. Consulta los conflictos cuyo resultado funcional no sea claro.
7. Revisa el diff y agrega únicamente los archivos pertinentes. No subas secretos, `.env` ni `node_modules`.
8. Al terminar las correcciones solicitadas y verificar las pruebas pertinentes, haz commit y push directamente a `main`. El usuario autorizó este flujo de forma persistente el 14 de noviembre de 2026: «amigo siempre subilo a main».
9. Antes del push, consulta el estado remoto e integra los cambios del equipo sin sobrescribirlos. Si hay conflictos de intención, consúltalos.
10. No uses force push, `reset --hard` ni operaciones destructivas para resolver problemas.

La autorización actual del usuario permite publicar las mejoras solicitadas directamente en `main`, incluida su publicación automática en Render si está configurada. No requiere pedir de nuevo permiso para cada push; conserva las comprobaciones y evita operaciones destructivas.

## Explicación acordada con el usuario

- Las IAs pueden modificar el código, pero editar archivos locales no los sube automáticamente a GitHub.
- Un commit guarda una versión local; un push la sube. Un pull request propone integrarla a `main`.
- Los cambios no llegan automáticamente a las computadoras de los compañeros: cada uno debe actualizar su copia.
- Git normalmente combina las mejoras. Editar las mismas líneas puede producir conflictos; hay que resolverlos preservando las partes necesarias de ambos cambios.
- La publicación en Render y la actualización de las copias locales son procesos separados.
- Los compañeros no necesitan acceso al panel de Render para aportar código mediante GitHub.

## Tutorial para el equipo

Se preparó un PDF local con requisitos, instalación, instrucciones para la IA y sincronización:
`C:\Users\bayar\Downloads\JEZERO\output\pdf\Guia-equipo-IA-GitHub-Render.pdf`.

## Al iniciar una nueva tarea

Lee este contexto, comprueba el estado real del repositorio y espera o atiende la tarea concreta del usuario. Este archivo es contexto y reglas de colaboración, no una orden para modificar o publicar código por sí solo.
