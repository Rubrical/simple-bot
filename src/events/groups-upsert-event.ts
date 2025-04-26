import { GroupMetadata } from "@whiskeysockets/baileys";
import { ChiakiClient } from "../types/types";
import { GroupsService } from "../services/group-service";
import { UserRequest, UsersService } from "../services/user-service";

export async function GroupsUpsert(data: GroupMetadata[], client: ChiakiClient): Promise<void> {
    for (const group of data) {
        const groupId = group.id;
        const metadata = await client.groupMetadata(groupId);

        client.log.info("---- Entrando em um novo grupo ----");
        client.log.info(JSON.stringify(data));

        await client.sendMessage(groupId, { text: ` ---> *${client.config.name}* <--- \n REALIZANDO CADASTRO EM UM NOVO GRUPO! \n Olá ${group.subject}👋` });

        const newGroup = await GroupsService.createNewGroup({
            donoGrupoId: metadata.owner,
            nomeGrupo: metadata.subject,
            descriacaoGrupo: metadata.desc,
            whatsappGroupId: groupId
        });

        if (newGroup === null) {
            await client.sendMessage(groupId, { text: `⚠️ Um erro inesperado ocorreu!` });
        } else if (newGroup === false) {
            const reactivated = await GroupsService.reactivateGroup(groupId);
            if (!reactivated) await client.sendMessage(groupId, { text: "⚠️ Um erro inesperado ocorreu ao reativar!" });
        }

        await client.sendMessage(groupId, { text: `✅ Cadastro do grupo feito com sucesso `});
        await client.sendMessage(groupId, { text: " ---> Iniciando cadastro dos usuários! <--- "});

        for (const user of metadata.participants) {
            const username = user.name ? user.name : "S/N";
            const userJid = client.utils.validateRemoteJid(user.id);
            const userRequest: UserRequest = {
                remoteJid: userJid.phoneNumber,
                userName: username,
            };
            await UsersService.newUser(userRequest);
            await GroupsService.addUserToGroup({ groupId: groupId, userId: userJid.phoneNumber });
        }

        client.sendMessage(groupId, { text: "✅ Cadastro do grupo completo! Bot pronto para uso!" });
        client.sendMessage(groupId, { text: `➡️ Próximo passo:\n configurar mensagens personalizadas de entrada e saída!\n Utilize o comando ${client.config.prefix}menu para saber mais` });
    }
}
