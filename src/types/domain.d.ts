export type Group = {
    id: number;
    whatsappGroupId: string;
    nomeGrupo: string;
    donoGrupoId: string|null;
    descriacaoGrupo: string|null;
    dataCadastro: Date;
    dataInativo: Date;
    msgEntradaAtiva: boolean;
    msgSaidaAtiva: boolean;
    mensagemEntradaId: number|null;
    mensagemSaidaId: number|null;
}

export type User = {
    id: number;
    dataCadastro: Date;
    dataInativo?: Date|null;
    remoteJid: string;
    nome: string;
    tipoUsuario: number;
}

export type GroupUser = {
    id: number;
    dataCadastro: Date;
    dataInativo?: Date|null;
    comandosExecutados: number;
    quantidadeMensagens: number;
    grupo: Group;
    usuario: User;
}

export type Message = {
    id: number;
    dataCadastro: Date;
    dataInativo?: Date|null;
    chaveMensagem: string;
    mensagem: string;
    midia?: string|null;
}

export type GroupUserRequest = {
    remoteJid: string;
    whatsappGroupId: string;
}
