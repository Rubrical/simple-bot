import { ChiakiClient, GroupParticipantsEventUpdateType } from "../types";

export async function GroupParticipantsEvent(
    event: GroupParticipantsEventUpdateType,
    client: ChiakiClient
) {
    client.log.info("----- participantes evento ------ ");
    client.log.info(JSON.stringify(event));

    const groupMetadata = await client.groupMetadata(event.id);

    const text = event.action === 'add'
        ? ` Seja muito bem-vindo(a) ao nosso grupo! => *${groupMetadata.subject}* -\n\n💈 *Descrição do Grupo:*\n${groupMetadata.desc || 'Sem descrição disponível.'}\n\nSiga as regras e se divirta!\n\n*‣ ${event.participants.map((jid) => `@${jid.split('@')[0]}`).join(' ')}*`
        : event.action === 'remove'
            ? `Adeus *${event.participants.map((jid) => `@${jid.split('@')[0]}`).join(', ')}* 👋🏻, sentiremos sua falta`
            : event.action === 'demote'
                ? `Usuário *@${event.participants[0].split('@')[0]}* foi rebaixado de cargo.`
                : `Digam olá ao novo ADM! *@${event.participants[0].split('@')[0]}*`;

    await client.sendMessage(event.id, {
        text,
        mentions: event.participants
    });
}
