import makeWASocket, { useMultiFileAuthState, DisconnectReason, getContentType } from '@whiskeysockets/baileys';
import P from 'pino';
import logger from './logger';
import http from 'http';
import * as utils from './utils/utils';
import { ChiakiClient, ChiakiConfig, IChiakiCommand } from './types/types';
import { ConnectionUpdateEvent } from './events/connection-update-event';
import { GroupParticipantsEvent } from './events/group-participants-event';
import { MessageUpsertEvent } from './events/messages-upsert-event';
import { GroupsUpsert } from './events/groups-upsert-event';
import { GroupsUpdate } from './events/groups-update-event';
import { AdvertenceService } from './services/advertence-service';
import { Server as SocketServer } from 'socket.io';

function getConfig(): ChiakiConfig {
    return {
        name: 'ChiakiBot',
        prefix: process.env.PREFIX || '/',
    }
}


const server = http.createServer();
const io = new SocketServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


const start = async (): Promise<ChiakiClient | void> => {
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const client = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        qrTimeout: 20 * 1000,
    }) as ChiakiClient;

    client.utils = utils;
    client.config = getConfig();
    client.cmd = new Map();
    client.log = logger;

    const isInstalled = client.utils.verifyIfFFMPEGisInstalled();
    if (!isInstalled) {
        logger.warn('O FFMPEG não está instalado, instále-o!');
        return;
    }

    client.ev.on('creds.update', saveCreds);
    client.ev.on('connection.update', async (event) => {
        const { qr } = event;
        if (qr) {
            client.log.info("QR Code gerado, enviando para painel web");
            io.emit("qr", qr);
        }
        await ConnectionUpdateEvent(event, client, start)
    });
    client.ev.on('messages.upsert', async (messages) => await MessageUpsertEvent(messages, client));
    client.ev.on("groups.upsert", async (event) => await GroupsUpsert(event, client));
    client.ev.on("groups.update", async (event) => await GroupsUpdate(event, client));
    client.ev.on('group-participants.update', async (event) => await GroupParticipantsEvent(event, client));

    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    setInterval(AdvertenceService.cleanAll, sevenDays);

    return client;
};

io.on("connection", (socket) => {
    logger.info('Cliente conectado ao Socket.io');

    socket.on('disconnect', () => {
        logger.info('Cliente desconectado do Socket.io');
    });
});
server.listen(3001, () => {
    logger.info(`Servidor WebSocket rodando na porta 3001!`);
});

start().catch(err => logger.error(err));
