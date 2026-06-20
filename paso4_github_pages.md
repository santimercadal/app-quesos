# Paso 4 — Publicar en GitHub Pages

Al final de estos pasos vas a tener una URL fija tipo:
`https://tu-usuario.github.io/app-quesos/`

---

## 1. Crear una cuenta en GitHub (si no tenés)

Entrá a [github.com](https://github.com) → **Sign up** → seguí los pasos con tu email.  
Si ya tenés cuenta, saltá este paso.

---

## 2. Crear el repositorio

1. Iniciá sesión en [github.com](https://github.com)
2. Hacé clic en el botón **+** (arriba a la derecha) → **New repository**
3. Completá así:
   - **Repository name**: `app-quesos` *(sin espacios, en minúscula)*
   - **Description**: `App de gestión para quesos` *(opcional)*
   - **Visibility**: ✅ **Public** *(necesario para GitHub Pages gratis)*
   - Dejá todo lo demás sin tildar
4. Hacé clic en **Create repository**

---

## 3. Subir los archivos

En la página del repositorio recién creado vas a ver un mensaje que dice *"uploading an existing file"* — hacé clic en ese link.

O también podés ir a: **Add file** → **Upload files**

**Arrastrá o seleccioná estos 5 archivos** de tu carpeta `App Quesos`:

```
index.html
manifest.json
sw.js
icon-192.png
icon-512.png
```

Después de seleccionarlos:
- Abajo donde dice **Commit changes**, dejá el mensaje por defecto
- Hacé clic en **Commit changes**

---

## 4. Activar GitHub Pages

1. En tu repositorio, hacé clic en **Settings** (pestaña arriba)
2. En el menú izquierdo, hacé clic en **Pages**
3. En la sección **Branch**, donde dice *"None"*, elegí **main**
4. Dejá la carpeta en **/ (root)**
5. Hacé clic en **Save**

---

## 5. Obtener tu URL

GitHub tarda 1-2 minutos en publicar. Después vas a ver un cartel verde que dice:

> ✅ **Your site is live at** `https://tu-usuario.github.io/app-quesos/`

Esa es la URL de tu app. Podés abrirla en cualquier celular o computadora.

---

## 6. Instalar en el celular como ícono (PWA)

**En iPhone (Safari):**
1. Abrí la URL en Safari
2. Tocá el botón de compartir (cuadrado con flecha)
3. Tocá **"Agregar a pantalla de inicio"**
4. Ponerle el nombre **"Quesos"** → **Agregar**

**En Android (Chrome):**
1. Abrí la URL en Chrome
2. Tocá el menú (3 puntitos)
3. Tocá **"Agregar a pantalla de inicio"** o **"Instalar app"**

---

## Cómo probarlo

Abrí la URL en el navegador. Deberías ver la pantalla de inicio con el total de ventas de hoy (en $0 porque todavía no hay datos).

Registrá una venta de prueba y verificá que aparezca en la Google Sheet.

---

## Para actualizar la app en el futuro

Si necesitás cambiar algo del código, simplemente:
1. Entrá al repositorio en github.com
2. Hacé clic en el archivo que querés editar
3. Hacé clic en el ícono del lápiz ✏️
4. Editá y hacé clic en **Commit changes**

Los cambios se publican automáticamente en 1-2 minutos.
