import { downloadContentFromMessage, getContentType, jidDecode, proto } from "@whiskeysockets/baileys";
import { ChiakiClient, SerializedMessage } from "../types/types";

const extractQuotedText = (quotedMsg: any, contentType: string): string => {
    return quotedMsg[contentType]?.text ||
        quotedMsg[contentType]?.description ||
        quotedMsg[contentType]?.caption ||
        quotedMsg[contentType]?.hydratedTemplate?.hydratedContentText ||
        quotedMsg[contentType] || '';
};

const extractMessageBody = (message: any, type: string): string => {
    return message?.conversation ||
        message?.[type]?.text ||
        message?.[type]?.caption ||
        (type === 'listResponseMessage' && message?.[type]?.singleSelectReply?.selectedRowId) ||
        (type === 'buttonsResponseMessage' && message?.[type]?.selectedButtonId) ||
        (type === 'templateButtonReplyMessage' && message?.[type]?.selectedId) ||
        '';
};

async function downloadMedia(message: proto.IMessage): Promise<Buffer> {
    let type = Object.keys(message)[0] as keyof proto.IMessage;
    let M: any = message[type];

    if (type === 'buttonsMessage' || type === 'viewOnceMessageV2') {
        if (type === 'viewOnceMessageV2') {
            M = message.viewOnceMessageV2?.message;
            type = Object.keys(M || {})[0] as keyof proto.IMessage;
        } else type = Object.keys(M || {})[1] as keyof proto.IMessage;
        M = M[type];
    }

    const stream = await downloadContentFromMessage(M, type.replace('Message', '') as any);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

const decodeJid = (jid: string) => {
    const { user, server } = jidDecode(jid) || {}
    return user && server ? `${user}@${server}`.trim() : jid
}

export function serialize(M: proto.IWebMessageInfo, client: ChiakiClient): SerializedMessage {
    const emptyResult = {
        id: '',
        from: '',
        sender: '',
        isGroup: false,
        isSelf: false,
        type: '',
        body: '',
        mentions: [],
        quoted: null,
        reply: async () => { },
        download: async () => Buffer.from([]),
        numbers: [],
        urls: [],
        ...M,
    };

    if (!M || !M.key || !M.message) return emptyResult;

    const id = M.key.id ?? '';
    const isSelf = M.key.fromMe ?? false;
    const from = decodeJid(M.key.remoteJid ?? '');
    const isGroup = from.endsWith('@g.us');
    const sender = isGroup
        ? decodeJid(M.key.participant ?? '')
        : isSelf
            ? decodeJid(client.user.id)
            : from;

    const special = (() => {
        let msg = M.message as any;
        if (msg.ephemeralMessage) {
            msg = msg.ephemeralMessage.message;
            if (getContentType(msg) === 'viewOnceMessageV2') {
                msg = msg.viewOnceMessageV2.message;
            }
        } else if (msg.viewOnceMessageV2) {
            msg = msg.viewOnceMessageV2.message;
        }
        return {
            message: msg,
            type: getContentType(msg) ?? '',
        };
    })();

    const rawMessage = special.message;
    const type = special.type;
    const body = extractMessageBody(rawMessage, type);

    let quoted: SerializedMessage['quoted'] = null;
    try {
        const context = rawMessage?.[type]?.contextInfo;
        if (context?.quotedMessage) {
            let quotedMsg = context.quotedMessage;
            let quotedType = 'normal';

            if (quotedMsg.ephemeralMessage) {
                quotedMsg = quotedMsg.ephemeralMessage.message;
                quotedType = 'ephemeral';
            }
            if (quotedMsg.viewOnceMessageV2) {
                quotedMsg = quotedMsg.viewOnceMessageV2.message;
                quotedType = 'view_once';
            }

            const quotedContentType = getContentType(quotedMsg) ?? '';
            const participant = decodeJid(context.participant ?? '');

            quoted = {
                type: quotedType,
                stanzaId: context.stanzaId ?? '',
                participant,
                message: quotedMsg,
                mtype: quotedContentType,
                isSelf: participant === decodeJid(client.user.id),
                text: extractQuotedText(quotedMsg, quotedContentType),
                key: {
                    id: context.stanzaId,
                    fromMe: participant === decodeJid(client.user.id),
                    remoteJid: from
                },
                download: () => downloadMedia(quotedMsg)
            };
        }
    } catch (err) {
        client.log.error('Erro ao processar mensagem citada:', err);
    }

    const mentions: string[] = [];
    if (quoted?.participant) mentions.push(quoted.participant);
    const mentioned = rawMessage?.[type]?.contextInfo?.mentionedJid ?? [];
    mentions.push(...mentioned.filter(Boolean));

    const reply = (text: string, options = {}) =>
        client.sendMessage(from, { text }, { quoted: M, ...options });

    const download = () => downloadMedia(rawMessage);

    const numbers = client.utils.extractNumbers(body);
    const urls = client.utils.extractUrls(body);

    return {
        ...M,
        id,
        from,
        sender,
        isGroup,
        isSelf,
        type,
        body,
        mentions,
        quoted,
        reply,
        download,
        numbers,
        urls
    };
}

