import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    AxiosError,
} from "axios";

export interface HttpClient {
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

const handleError = (error: AxiosError): never => {
    if (error.response) {
        const { status, data } = error.response;
        const message = typeof data === "string" 
            ? data 
            : (data as { message?: string })?.message 
            || "Erro inesperado";

        throw new Error(`[${status}] ${message}`);
    }

    throw new Error("Erro de conexão ou resposta inválida");
};

export const createHttpClient = (baseURL: string): HttpClient => {
    const instance: AxiosInstance = axios.create({
        baseURL,
        timeout: 5000,
        headers: { "Content-Type": "application/json" },
    });

    const request = async <T>(fn: () => Promise<AxiosResponse<T>>): Promise<T> => {
        try {
            const res = await fn();
            return res.data;
        } catch (err) {
            handleError(err as AxiosError);
        }
    };

    return {
        get: <T>(url, config) => request(() => instance.get<T>(url, config)),
        post: <T>(url, data, config) => request(() => instance.post<T>(url, data, config)),
        put: <T>(url, data, config) => request(() => instance.put<T>(url, data, config)),
        delete: <T>(url, config) => request(() => instance.delete<T>(url, config)),
    };
};
