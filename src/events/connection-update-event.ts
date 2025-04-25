import { ConnectionState, DisconnectReason } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import logger from "../logger";
import { ChiakiClient } from "../types/types";
import { loadCommands } from "../commands/commands";


let connectionAttempts = 0;

const isBoom = (err: unknown): err is Boom => {
    return typeof err === 'object' && err !== null && 'isBoom' in err;
};

export async function ConnectionUpdateEvent(
    event: Partial<ConnectionState>,
    client: ChiakiClient,
    startFn: () => Promise<ChiakiClient|void>,
) {
    const { connection, lastDisconnect } = event;

    if (connection === "close") {
        const shouldReconnect =
            isBoom(lastDisconnect?.error) &&
            lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

        if (connectionAttempts >= 5) {
            logger.error("Limite de tentativas excedido. Abortando.");
            return;
        }

        logger.warn(`Conexão encerrada. Reconectando (${connectionAttempts + 1}/5)...`);
        connectionAttempts++;

        if (shouldReconnect) await startFn();
    }

    if (connection === "open") {
        connectionAttempts = 0;
        logger.info("Chiaki Bot! De pé e operante!");
        loadCommands(client);
    }
}
