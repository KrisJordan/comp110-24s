export enum PyProcessState {
    STARTING = 0,
    RUNNING = 1,
    EXITED = 2
}

export interface PyProcess {
    state: PyProcessState;
    module: string;
    path: string;
    requestId: number;
    pid?: number;
}