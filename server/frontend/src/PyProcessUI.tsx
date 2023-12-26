import React, { PropsWithChildren, useCallback, useEffect, useState } from "react";
import { PyProcess, PyProcessState } from "./PyProcess";
import useWebSocket from "./useWebSocket";
import { useDebounce } from "@uidotdev/usehooks";
import { parseJsonMessage } from "./Message";
import { StdErrMessage } from "./StdErrMessage";

interface PyProcessUIProps {
    pyProcess: PyProcess,
    groupingEnabled: boolean,
    minGroupSize: number,
    msgGroupTimeSeparationInMS: number,
}

type StdOut = {
    type: 'stdout';
    line: string;
    timestamp: number;
}

type StdErr = {
    type: 'stderr';
    line: string;
}

type StdIn = {
    type: 'stdin';
    prompt: string;
    response?: string;
}

type StdOutGroup = {
    type: 'group';
    children: (StdOut & Timestamped)[];
}

type Timestamped = {
    timestamp: number;
}

type StdIO = (StdOut | StdErr | StdIn | StdOutGroup) & Timestamped;


export function PyProcessUI(props: PropsWithChildren<PyProcessUIProps>) {
    const { lastMessage, readyState, sendJsonMessage } = useWebSocket();
    const [pyProcess, setPyProcess] = useState(props.pyProcess);
    const [stdio, setStdIO] = useState<StdIO[]>([]);
    const debouncedStdIO = useDebounce(stdio, 500);
    const [stdinValue, setStdinValue] = useState<string>("");

    useEffect(() => {
        let message = parseJsonMessage(lastMessage);
        if (message) {
            switch (message.type) {
                case 'RUNNING':
                    if (message.data.request_id === pyProcess.requestId) {
                        setPyProcess(prev => {
                            prev.pid = message?.data.pid;
                            prev.state = PyProcessState.RUNNING;
                            return prev;
                        });
                    }
                    break;
                case 'STDOUT':
                    let time = Date.now();
                    if (!message.data.is_input_prompt) {
                        setStdIO((prev) => prev.concat({ type: 'stdout', line: message?.data.data, timestamp: time }))
                    } else {
                        setStdIO((prev) => prev.concat({ type: 'stdin', prompt: message?.data.data, timestamp: time }))
                    }
                    break;
                case 'STDERR':
                    if (!message.data.is_input_prompt) {
                        setStdIO((prev) => prev.concat({ type: 'stderr', line: message?.data.data, timestamp: Date.now() }))
                    }
                    break;
                case 'EXIT':
                    if (message.data.pid === pyProcess.pid) {
                        setPyProcess(prev => {
                            prev.state = PyProcessState.EXITED;
                            return prev;
                        })
                    }
                    break;
            }
        }
    }, [lastMessage, pyProcess]);

    useEffect(() => {
        // This is clean-up only...
        return () => {
            if (pyProcess.state !== PyProcessState.EXITED && pyProcess.pid) {
                sendJsonMessage({ type: "KILL", data: { pid: pyProcess.pid } })
            }
        };
    }, [pyProcess])

    let status: string;
    switch (pyProcess.state) {
        case PyProcessState.STARTING:
            status = 'Starting...';
            break;
        case PyProcessState.RUNNING:
            status = 'Running';
            break;
        case PyProcessState.EXITED:
            status = 'Completed';
            break;
    }

    const handleStdInChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setStdinValue(event.target.value);
    };

    const handleStdInSend = useCallback((lineIndex: number, stdinLine: StdIn) => {
        let message = { "type": "STDIN", "data": { "data": stdinValue, "pid": pyProcess.pid } };
        sendJsonMessage(message);
        setStdIO((prev) => {
            let line = stdio[lineIndex];
            if (line === stdinLine) {
                let copy = [...prev];
                let spliced = copy.splice(lineIndex, 1)[0];
                if (spliced.type === 'stdin') {
                    spliced.response = stdinValue;
                    setStdinValue('');
                    let rv = copy.concat(spliced);
                    return rv;
                } else {
                    throw new Error("Expected stdin... found: " + spliced.type);
                }
            } else {
                throw new Error("Expected line === stdinLine");
            }
        });
    }, [stdinValue]);

    useEffect(() => {
        if (!props.groupingEnabled) return;

        let group = [];
        let existingGroup: StdIO | null = null;
        for (let i = debouncedStdIO.length - 1; i > 0; i--) {
            let line = debouncedStdIO[i];
            let prevLine = debouncedStdIO[i - 1];

            let exitLoop = false;
            switch (line.type) {
                case 'stdout':
                    if (line.timestamp - prevLine.timestamp > props.msgGroupTimeSeparationInMS) {
                        exitLoop = true;
                        break;
                    }
                    group.unshift(line);
                    break;
                case 'group':
                    exitLoop = true;
                    if (line.timestamp - prevLine.timestamp > props.msgGroupTimeSeparationInMS) {
                        break;
                    }
                    existingGroup = line;
                    break;
                default:
                    exitLoop = true;
                    break;
            }
            if (exitLoop) break;
        }

        if (group.length === 0) {
            return;
        }

        if (existingGroup !== null) {
            existingGroup.children.push(...group);
            existingGroup.timestamp = group.pop()?.timestamp as number;

            // setStdIO((oldStdio) => {
            //     if (oldStdio[oldStdio.length - 1].timestamp < ) {
            //         return debouncedStdIO.slice(0, 0 - group.length);
            //     } else {
            //         return oldStdio;
            //     }
            // });
        } else if (group.length >= props.minGroupSize) {
            setStdIO([...debouncedStdIO.slice(0, 0 - group.length),
            {
                type: 'group',
                children: [...group],
                timestamp: group.pop()?.timestamp as number
            }
            ]);
        }
    }, [debouncedStdIO]);

    return <div className="prose">
        <h3>{status}</h3>
        {stdio.map((line, idx) => {
            switch (line.type) {
                case 'stdin':
                    if (line.response === undefined) {
                        return <p key={idx}>{line.prompt}<br />
                            <input onChange={handleStdInChange} onKeyUp={(e) => { if (e.key === 'Enter') { handleStdInSend(idx, line); } }} value={stdinValue} autoFocus={true} type="text" className="input input-bordered w-full max-w-xs"></input>
                            <button onClick={() => handleStdInSend(idx, line)} className="btn btn-primary ml-4">Send</button>
                        </p>
                    } else {
                        return <p key={idx}>{line.prompt}<br />
                            <input autoFocus={true} type="text" className="input input-bordered w-full max-w-xs" value={line.response} disabled={true}></input>
                        </p>
                    }
                case 'stdout':
                    return <p key={idx}>{line.line}</p>
                case 'stderr':
                    return <StdErrMessage key={idx} line={line.line} />;
                case 'group':
                    return <div key={idx}>
                        <p>{line.children[0].line}</p>
                        <details>
                            <summary>
                                [{line.children.length - 1}] more lines collapsed
                            </summary>
                            <div>
                                {
                                    line.children.slice(1).map((line, subIdx) => {
                                        return <p key={`${idx}-${subIdx}`}>{line.line}</p>
                                    })
                                }
                            </div>
                        </details>
                    </div>
            }
        })}
    </div>;
}