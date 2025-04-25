import { api } from './../config/env-config';

const url = "users";


export const UsersService = {
    newUser: async (user: UserRequest) => {},
    newOwner: async () => {},
    incrementMessages: async () => {},
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

