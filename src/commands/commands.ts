import { ChiakiClient, IChiakiCommand } from "../types/types";
import addAdvertence from "./add-adv";
import atAdeus from "./at-adeus";
import atBv from "./at-bv";
import banUser from "./ban";
import deleteMessage from "./delete";
import editAdeus from "./edit-adeus";
import editBv from "./edit-bv";
import help from "./help";
import mentionAll from "./mention-all";
import menu from "./menu";
import msgStatus from "./msg-status";
import rank from "./rank";
import removeAdvertence from "./rem-adv";
import remove from "./remove";
import stickerCommand from "./sticker";
import unbanUser from "./unban";

const commands: Array<IChiakiCommand> = [
    help,
    menu,
    remove,
    mentionAll,
    deleteMessage,
    stickerCommand,
    addAdvertence,
    removeAdvertence,
    atBv,
    atAdeus,
    editBv,
    editAdeus,
    banUser,
    unbanUser,
    rank,
    msgStatus,
];

export const loadCommands = (client: ChiakiClient): ChiakiClient => {
    commands.forEach((x) => {
        client.cmd.set(x.command.name, x);
        client.log.info(`Comando ${x.command.name} carregado com sucesso`);
    });
    return client;
}
