import { BanService } from "../services/ban-service";
import { GroupsService } from "../services/group-service";
import { MessageService } from "../services/messages-service";
import { UsersService } from "../services/user-service";
import { ChiakiClient, GroupParticipantsEventUpdateType } from "../types/types";

export async function GroupParticipantsEvent(
    event: GroupParticipantsEventUpdateType,
    client: ChiakiClient
) {
    client.log.info("----- Evento: Atualização de participantes de grupo ------ ");
    client.log.info(JSON.stringify(event));

    const botFullId = client.user.id;
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

    const messageStatus = await GroupsService.verifyMessageStatus(event.id);
    const groupMetadata = await client.groupMetadata(event.id);
    let text: string|null = null;
    let wasUserBanned = false;

    if (event.action === "add") {
        for (const participant of event.participants) {
            const parsedJid = client.utils.validateRemoteJid(participant).phoneNumber;
            const ban = await BanService.findOne({ groupRemoteJid: event.id, userRemoteJid: parsedJid });
            const user = await UsersService.getUser(parsedJid);
            const message = await MessageService.getMessage("welcome-message", groupMetadata.subject);

            if (ban) {
                client.log.info(`Usuário ${parsedJid} banido anteriormente. Removendo do grupo...`);
                wasUserBanned = true;
                try {
                    await client.groupParticipantsUpdate(event.id, [participant], "remove");
                } catch (err) {
                    client.log.error(`Erro ao remover usuário ${participant}:`, err);
                }
                return;
            }

            if (user === null) {
                await UsersService.newUser({
                    remoteJid: parsedJid,
                    userName: "S/N",
                });
                await GroupsService.addUserToGroup({
                    groupId: event.id,
                    userId: parsedJid,
                });
            } else if (user !== false && user) {
                await GroupsService.reactivateUserFromGroup({
                    userId: parsedJid,
                    groupId: event.id,
                });
            }

            if (typeof messageStatus === "string") return;

            if (messageStatus.isWelcomeMessageActive) {
                if (message === null) {
                    text = `Seja muito bem-vindo(a) ao nosso grupo! => *${groupMetadata.subject}* -\n\n💈 *Descrição do Grupo:*\n${groupMetadata.desc || 'Sem descrição disponível.'}\n\nSiga as regras e se divirta!\n\n*‣ ${event.participants.map(jid => `@${jid.split('@')[0]}`).join(' ')}*`;
                } else {
                    text = message.mensagem + `\n@${parsedJid}`;
                }
            }
        }
    } else if (event.action === "remove") {
        for (const participant of event.participants) {
            if (wasUserBanned) return;

            const parsedJid = client.utils.validateRemoteJid(participant).phoneNumber;
            const res = await GroupsService.inactivateUserFromGroup({ groupId: event.id, userId: parsedJid });
            const message = await MessageService.getMessage("goodbye-message", groupMetadata.subject);

            if (res)
                client.log.warn(`Usuário ${parsedJid} não desativado`);

            if (typeof messageStatus !== "string" && messageStatus.isGoodByeMessageActive) {
                if (message === null) {
                    text = `Adeus *${event.participants.map(jid => `@${jid.split('@')[0]}`).join(', ')}* 👋🏻, sentiremos sua falta`;
                } else {
                    text = message.mensagem;
                }
            }
        }
    } else if (event.action === "promote") {
        for (const participant of event.participants) {
            const parsedJid = client.utils.validateRemoteJid(participant).phoneNumber;
            const user = await UsersService.getUser(parsedJid);

            if (user !== null && typeof user !== "boolean") {
                const res = await UsersService.updateUser({
                    remoteJid: user.remoteJid,
                    name: user.nome,
                    roleEnum: 2,
                });
            }
        }
    } else if (event.action === "demote") {
        for (const participant of event.participants) {
            const parsedJid = client.utils.validateRemoteJid(participant).phoneNumber;
            const user = await UsersService.getUser(parsedJid);

            if (user !== null && typeof user !== "boolean") {
                const res = await UsersService.updateUser({
                    remoteJid: user.remoteJid,
                    name: user.nome,
                    roleEnum: 3,
                });
            }
        }
    }

    if (text) {
        await client.sendMessage(event.id, {
            text,
            mentions: event.participants
        });
    }
}
