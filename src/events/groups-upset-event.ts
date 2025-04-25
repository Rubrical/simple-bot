import { GroupMetadata } from "@whiskeysockets/baileys";
import { ChiakiClient } from "../types/types";

export async function GroupsUpsert(data: GroupMetadata[], client: ChiakiClient): Promise<void> {
    client.log.info("---- Entrando em um novo grupo ----");
    client.log.info(JSON.stringify(data));
}
