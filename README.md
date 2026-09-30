# Chatbot Foundry Certificador

Aplicación web sencilla para consultar a un asistente de certificación. El navegador muestra el chat y un servidor Node.js envía las consultas a un agente de Microsoft Foundry. La conversación conserva el contexto entre mensajes.

- [Revisa este PDF Tutorial](tutorial-copilot-foundry-appservice-windows-node.pdf)

## ¿Qué hace?

1. Abre una interfaz de chat en el navegador.
2. Envía cada mensaje al servidor, no directamente a Microsoft Foundry.
3. El servidor valida el mensaje y consulta al agente configurado.
4. Devuelve la respuesta y conserva el identificador de conversación para los siguientes turnos.

La aplicación rechaza mensajes vacíos o de más de 2000 caracteres. Si Foundry no está configurado o no responde, muestra un mensaje genérico y no expone credenciales ni detalles internos.

## Requisitos

- Windows 11 y PowerShell.
- Node.js 24 LTS y npm.
- Visual Studio Code para trabajar con los agentes de GitHub Copilot.
- Acceso a un proyecto de Microsoft Foundry y a un agente para poder usar el chat.
- Azure CLI solo si necesitas iniciar sesión localmente con `az login`.

## Archivos principales

- `server.js`: servidor Express, archivos web y rutas `/api/chat` y `/health`.
- `public/`: interfaz del chat, estilos y comportamiento del navegador.
- `scripts/create-agent.js`: comprueba si existe el agente de Foundry y, si falta, puede crearlo.
- `.env.example`: plantilla de variables de entorno. El archivo `.env` local no se incluye en Git.
- `.github/copilot-instructions.md`: reglas que Copilot debe seguir al trabajar en este proyecto.
- `.github/agents/`: agentes personalizados de Copilot para planificar, implementar y desplegar.

## Preparar el proyecto

1. Abre la carpeta del proyecto en Visual Studio Code.
2. Abre una terminal de PowerShell desde **Terminal > Nueva terminal**.
3. Confirma las versiones instaladas:

   ```powershell
   node --version
   npm --version
   ```

   Node.js debe ser la versión 24 o posterior.

4. Instala las dependencias:

   ```powershell
   npm install
   ```

5. Crea tu archivo local de configuración a partir del ejemplo:

   ```powershell
   Copy-Item .env.example .env
   ```

6. Abre `.env` y configura estas variables:

   ```dotenv
   FOUNDRY_PROJECT_ENDPOINT=https://<endpoint-de-tu-proyecto>
   FOUNDRY_AGENT_NAME=<nombre-de-tu-agente>
   ```

   Obtén el endpoint en la información de conexión del proyecto de Foundry y usa el nombre exacto del agente. No compartas ni subas `.env` al repositorio. No agregues claves o tokens: el proyecto usa `DefaultAzureCredential` para autenticarse.

7. Inicia sesión en Azure desde PowerShell si todavía no lo hiciste:

   ```powershell
   az login
   ```

   La cuenta debe tener permisos para usar el proyecto/agente de Foundry. Si la autenticación falla, confirma que iniciaste sesión con la cuenta correcta y que tiene el rol de acceso necesario.

## Ejecutar en local

1. Desde la carpeta del proyecto, inicia el modo de desarrollo:

   ```powershell
   npm run dev
   ```

   El servidor usa el puerto `3000` de forma predeterminada y se reinicia al detectar cambios en `server.js`.

2. Abre [http://localhost:3000](http://localhost:3000) en el navegador.
3. Escribe una pregunta sobre certificación y presiona **Enviar**. Presiona Enter para enviar o Shift+Enter para añadir una línea.
4. Para detener el servidor, vuelve a la terminal y presiona Ctrl+C.

Comprueba que el servidor está activo con otra terminal de PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

La respuesta esperada es `status: ok`.

## Agente de Microsoft Foundry

El agente de Foundry es el asistente que contesta dentro del chat. Se configura con `FOUNDRY_PROJECT_ENDPOINT` y `FOUNDRY_AGENT_NAME` en `.env`. El backend se encarga de la comunicación y el navegador no recibe credenciales de Azure.

El script `create-agent` puede crear el agente si no existe. Primero añade también estas variables a `.env`:

```dotenv
FOUNDRY_MODEL_DEPLOYMENT=<nombre-del-despliegue-del-modelo>
FOUNDRY_AGENT_INSTRUCTIONS=<instrucciones-para-el-agente>
```

Después ejecuta:

```powershell
npm run create-agent
```

El comando no modifica un agente que ya exista. Si debe crear uno nuevo, necesita un despliegue de modelo válido y las instrucciones del asistente. Revisa en Foundry que el modelo esté disponible y que tu cuenta tenga permisos.

## Agentes de GitHub Copilot en este repositorio

Estos agentes ayudan a desarrollar y operar el proyecto desde Copilot Chat. **No son el asistente de certificación** que atiende a los visitantes del sitio; ese es el agente de Foundry explicado arriba.

Para usarlos:

1. Abre el proyecto en Visual Studio Code e inicia sesión en GitHub Copilot.
2. Abre Copilot Chat.
3. En el selector de agente/modo del chat, elige el agente que quieras usar. Los agentes personalizados del proyecto están en `.github/agents/`.
4. Describe la tarea con contexto y revisa el resultado antes de aceptar cambios o ejecutar comandos.

Agentes disponibles:

- **Arquitecto**: inspecciona el proyecto y propone un plan. No edita archivos ni ejecuta comandos. Úsalo primero si quieres acordar el alcance de un cambio.
- **Constructor**: implementa paso a paso un plan aprobado, con cambios mínimos y validaciones. Puedes pedirlo después de revisar el plan del Arquitecto.
- **Desplegador**: guía el despliegue a Azure App Service en Linux con Node 24 e identidad administrada. Pide confirmación antes de crear, borrar o reemplazar recursos.

El Constructor tiene una opción para pasar al Desplegador cuando la aplicación ya funciona localmente. Copilot también recibe las reglas generales de `.github/copilot-instructions.md` y las instrucciones específicas aplicables al código que modifica.

## Rutas disponibles

- `GET /`: muestra la aplicación web.
- `GET /health`: indica si el servidor está activo.
- `POST /api/chat`: recibe un mensaje y devuelve la respuesta y el identificador de conversación.

## Solución de problemas

- **La página abre, pero el chat no responde**: revisa `FOUNDRY_PROJECT_ENDPOINT`, `FOUNDRY_AGENT_NAME`, tu inicio de sesión de Azure y los permisos de Foundry.
- **El servidor indica que escucha en otro puerto**: abre ese puerto en el navegador. Azure define `PORT` automáticamente; localmente se usa `3000` si no se especifica.
- **El mensaje no se acepta**: debe contener entre 1 y 2000 caracteres.
- **`npm run create-agent` no crea el agente**: confirma las cuatro variables indicadas en la sección del agente, el acceso al proyecto y que el nombre del despliegue del modelo sea correcto.
- **Copilot no muestra los agentes personalizados**: abre la carpeta raíz del repositorio en VS Code, verifica que GitHub Copilot esté disponible y que los archivos `.agent.md` estén en `.github/agents/`. El selector puede aparecer con un nombre distinto según la versión de VS Code.

## Ejecución en Azure

El proyecto está preparado para ejecutarse en Azure App Service (Linux, Node 24 LTS). En Azure, configura `FOUNDRY_PROJECT_ENDPOINT` y `FOUNDRY_AGENT_NAME` como ajustes de la aplicación y habilita una identidad administrada con los permisos necesarios en Foundry. No configures claves de acceso en archivos del proyecto. El script de inicio de producción es `npm start`.