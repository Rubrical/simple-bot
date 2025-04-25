import { ChiakiClient, IChiakiCommand } from "../types/types";
import deleteMessage from "./delete";
import help from "./help";
import mentionAll from "./mention-all";
import menu from "./menu";
import remove from "./remove";
import stickerCommand from "./sticker";

const commands: Array<IChiakiCommand> = [
    help,
    menu,
    remove,
    mentionAll,
    deleteMessage,
    stickerCommand,
];

export const loadCommands = (client: ChiakiClient): ChiakiClient => {
    commands.forEach((x) => {
        client.cmd.set(x.command.name, x);
        client.log.info(`Comando ${x.command.name} carregado com sucesso`);
    });
    return client;
}
