# AsistMedic-Back 🏥

Sistema backend para AsistMedic - Asistente médico con IA

## 📋 Requisitos previos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (versión 16 o superior)
- [PostgreSQL](https://www.postgresql.org/download/) (versión 12 o superior)
- [Git](https://git-scm.com/)
- [pgAdmin4](https://www.pgadmin.org/) (opcional, pero recomendado)

## 🚀 Instalación para colaboradores

### 1. Clonar el repositorio
`git clone https://github.com/LucKaiser-11/Asistente-IA-Back.git`

`cd AsistMedic-Back`

### 2. Instalar dependencias

`npm install`

### 3. Configurar variables de entorno
Copia el archivo de ejemplo y configúralo con tus credenciales:

copy .env.example .env

Edita el archivo `.env` con tus datos de PostgreSQL:

`PORT=3000`

`DB_HOST=localhost`

`DB_PORT=5432`

`DB_USER=postgres`

`DB_PASSWORD=tu_password_aqui`

`DB_NAME=asistmedic`

`DATABASE_URL="postgresql://postgres:tu_password_aqui@localhost:5432/asistmedic?schema=public"`


### 4. Crear la base de datos

Abre pgAdmin4 o usa la terminal:

**Opción A - Con pgAdmin4:**
1. Clic derecho en **Databases** → **Create** → **Database**
2. Nombre: `asistmedic`
3. Owner: `postgres`
4. Save

**Opción B - Con terminal:**

`psql -U postgres
CREATE DATABASE asistmedic;
\q`


### 5. Sincronizar la base de datos con Prisma

`npx prisma db push`

`npx prisma generate`


Este comando crea automáticamente todas las tablas necesarias en tu base de datos.

### 6. Ejecutar el proyecto

**Modo desarrollo:**

`npm run dev`


**Modo producción:**

`npm start`


El servidor estará corriendo en: `http://localhost:3000`

### 7. Ver la base de datos (opcional)

Prisma Studio te permite ver y editar los datos visualmente:

`npx prisma studio`


Se abrirá en: `http://localhost:5555`


## 🛠️ Comandos útiles

### Desarrollo

`npm run dev` # Ejecutar en modo desarrollo con nodemon

`npm start` # Ejecutar en modo producción


### Base de datos (Prisma)

`npx prisma studio` # Abrir interfaz visual de la base de datos

`npx prisma db push` # Sincronizar cambios del schema con la DB

`npx prisma generate` # Regenerar el cliente de Prisma

`npx prisma db pull` # Leer el schema desde la base de datos existente

`npx prisma migrate dev` # Crear nueva migración


### Git

`git pull `# Obtener últimos cambios

`git add .` # Agregar cambios

`git commit -m "mensaje"` # Crear commit

`git push` # Subir cambios


