import { GroupMetadata } from "@whiskeysockets/baileys";
import { ChiakiClient } from "../types/types";

export function GroupsUpdate(event: Partial<GroupMetadata>[], client: ChiakiClient) {
    client.log.info("---- Atualização de grupos ----");
    client.log.info(JSON.stringify(event));
}
