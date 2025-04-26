import { BanService } from "../services/ban-service";
import { GroupsService } from "../services/group-service";
import { MessageService } from "../services/messages-service";
import { ChiakiClient, GroupParticipantsEventUpdateType } from "../types/types";

export async function GroupParticipantsEvent(
    event: GroupParticipantsEventUpdateType,
    client: ChiakiClient
) {
    client.log.info("----- Evento: Atualização de participantes de grupo ------ ");
    client.log.info(JSON.stringify(event));

    const botFullId = client.user?.id || "";
    const botJid = botFullId.includes(":")
        ? botFullId.replace(/:\d+/, "")
        : botFullId;

    const wasRemoved =
        event.action === "remove" &&
        event.participants.some(participant => participant.split(":")[0] === botJid);

    if (wasRemoved) {
        client.log.info(`Bot foi removido do grupo de id ${event.id}`);
        GroupsService.inactivateGroup(event.id) ?? client.log.warn(`Grupo "${event.id}" não desativado`);
        return;
    }

    if (event.action === "add") {
        for (const participant of event.participants) {
            const ban = await BanService.findOne({ groupRemoteJid: event.id, userRemoteJid: participant });
            if (ban) {
                client.log.info(`Usuário ${participant} banido anteriormente. Removendo do grupo...`);
                try {
                    await client.groupParticipantsUpdate(event.id, [participant], "remove");
                } catch (err) {
                    client.log.error(`Erro ao remover usuário ${participant}:`, err);
                }
            }
        }
    }

    const messageStatus = await GroupsService.verifyMessageStatus(event.id);
    const groupMetadata = await client.groupMetadata(event.id);
    let text: string|null = null;

    if (typeof messageStatus !== "string") {
        if (event.action === "add" && messageStatus.isWelcomeMessageActive) {
            const message = await MessageService.getMessage("welcome-message", groupMetadata.subject);
            text = message?.mensagem || `Seja muito bem-vindo(a) ao nosso grupo! => *${groupMetadata.subject}* -\n\n💈 *Descrição do Grupo:*\n${groupMetadata.desc || 'Sem descrição disponível.'}\n\nSiga as regras e se divirta!\n\n*‣ ${event.participants.map(jid => `@${jid.split('@')[0]}`).join(' ')}*`;
        } else if (event.action === "remove" && messageStatus.isGoodByeMessageActive) {
            const message = await MessageService.getMessage("goodbye-message", groupMetadata.subject);
            text = message?.mensagem || `Adeus *${event.participants.map(jid => `@${jid.split('@')[0]}`).join(', ')}* 👋🏻, sentiremos sua falta`;
        }
    }

    if (text) {
        await client.sendMessage(event.id, {
            text,
            mentions: event.participants
        });
    }
}
