export type StdOut = {
    type: 'stdout';
    line: string;
}

export type StdErr = {
    type: 'stderr';
    line: string;
}

export type StdIn = {
    type: 'stdin';
    prompt: string;
    response?: string;
}

export type StdOutGroup = {
    type: 'stdout_group';
    children: StdOut[];
    endTime: number;
    startTime: number;
}

export type StdIO = StdErr | StdIn | StdOutGroup;