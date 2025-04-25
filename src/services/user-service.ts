import logger from '../logger';
import { api } from './../config/env-config';

const url = "users";
const routes = {
    newUser: `${url}/new`,
    incrementMessages: `${url}/update-message-quantity`,
    incrementCommands: `${url}/update-command-quantity`,
    getUser: `${url}/get-user`,
    newAdmin: `${url}/admin`,
    updateUser: `${url}/update-user`,
}


export const UsersService = {
    newUser: async (user: UserRequest) => {
        return await api.post(routes.newUser, user)
            .then((createdUser) => {
                logger.info(`Novo usuário criado: ${JSON.stringify(createdUser)}`);
                return true;
            }).catch((err) => {
                logger.warn(err.message);
                return false;
            });
    },
    incrementMessages: async () => {},
    incrementCommands: async () => {},
    userInfo: async () => {},
    newAdmin: async () => {},
    updateUser: async () => {},
};

export type UserRequest = {
    remoteJid: string;
    userName: string;
}

export type NewUserResponse = {}

export type User = {
    id: number;
    dataCadastro: Date;
    dataInativo?: Date|null;
    remoteJid: string;
    nome: string;
    tipoUsuario: number;
}
