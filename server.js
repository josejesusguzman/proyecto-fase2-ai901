import path from "node:path";
import express from "express";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

/*

SDK: Software Development Kit 
AIProjectClient: Para todo tipo de agente o servicio de Microsoft Foundry
  - Este usa el endpoint del proyecto
AzureOpenAIClient: Para el modelo GPT de Microsoft Foundry
  - Este usa el endpoint del agente

*/

const app = express();
const port = Number(process.env.PORT) || 3000;
const agentName = process.env.FOUNDRY_AGENT_NAME;
const projectEndpoint = process.env.FOUNDRY_PROJECT_ENDPOINT;
const publicDirectory = path.join(import.meta.dirname, "public");
const foundryConfigured = Boolean(agentName && projectEndpoint);

let openAIClient;

function logFoundryFailure(error) {
  const message = error instanceof Error ? error.message : "Unknown Foundry error.";
  const safeMessage = message
    .replaceAll(projectEndpoint ?? "", "[project endpoint]")
    .replaceAll(agentName ?? "", "[agent name]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[token redacted]")
    .slice(0, 500);

  console.error("Foundry request failed", {
    name: error?.name,
    code: error?.code,
    statusCode: error?.statusCode ?? error?.status,
    message: safeMessage,
  });
}

if (foundryConfigured) {
  const projectClient = new AIProjectClient(
    projectEndpoint,
    new DefaultAzureCredential(),
  );
  openAIClient = projectClient.getOpenAIClient();
}

app.use(express.json({ limit: "16kb" }));
app.use(express.static(publicDirectory));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/chat", async (request, response) => {
  const message = typeof request.body?.message === "string"
    ? request.body.message.trim()
    : "";

  if (!message || message.length > 2000) {
    response.status(422).json({ error: "El mensaje debe tener entre 1 y 2000 caracteres." });
    return;
  }

  const suppliedConversationId = request.body?.conversation_id;
  if (suppliedConversationId != null && typeof suppliedConversationId !== "string") {
    response.status(422).json({ error: "El identificador de conversación no es válido." });
    return;
  }

  if (!openAIClient) {
    response.status(502).json({ error: "No fue posible procesar la solicitud de chat." });
    return;
  }

  try {
    const conversationId = suppliedConversationId?.trim()
      || (await openAIClient.conversations.create()).id;
    const result = await openAIClient.responses.create(
      {
        conversation: conversationId,
        input: message,
      },
      {
        body: {
          agent_reference: { name: agentName, type: "agent_reference" },
        },
      },
    );

    response.json({
      reply: result.output_text,
      conversation_id: conversationId,
    });
  } catch (error) {
    logFoundryFailure(error);
    response.status(502).json({ error: "No fue posible procesar la solicitud de chat." });
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ error: "El cuerpo de la solicitud no contiene JSON válido." });
    return;
  }

  response.status(500).json({ error: "Ocurrió un error interno." });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}.`);
});