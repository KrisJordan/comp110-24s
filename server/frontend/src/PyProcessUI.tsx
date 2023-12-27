import React, { PropsWithChildren, useCallback, useEffect, useState } from "react";
import { PyProcess, PyProcessState } from "./PyProcess";
import useWebSocket from "./useWebSocket";
import { parseJsonMessage } from "./Message";
import { StdErrMessage } from "./StdErrMessage";
import { StdOutGroupContainer } from "./StdOutGroupContainer";
import { StdIn, StdOutGroup, StdIO } from "./StdIOTypes";

interface PyProcessUIProps {
    pyProcess: PyProcess
}

export function PyProcessUI(props: PropsWithChildren<PyProcessUIProps>) {
    const { lastMessage, readyState, sendJsonMessage } = useWebSocket();
    const [pyProcess, setPyProcess] = useState(props.pyProcess);
    const [stdio, setStdIO] = useState<StdIO[]>([]);
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
                    if (!message.data.is_input_prompt) {
                        setStdIO((prev) => {
                            let time = Date.now();
                            let prevLine = prev[prev.length - 1];

                            if (prevLine?.type === 'stdout_group') {
                                let updatedGroup: StdOutGroup = {
                                    type: 'stdout_group',
                                    children: [...prevLine.children, { type: 'stdout', line: message?.data.data }],
                                    startTime: prevLine.startTime,
                                    endTime: time
                                }
                                return [...(prev.slice(0, -1)), updatedGroup];
                            }

                            return prev.concat({ type: 'stdout_group', children: [{ type: 'stdout', line: message?.data.data }], endTime: time, startTime: time });
                        });
                    } else {
                        setStdIO((prev) => prev.concat({ type: 'stdin', prompt: message?.data.data }))
                    }
                    break;
                case 'STDERR':
                    if (!message.data.is_input_prompt) {
                        setStdIO((prev) => prev.concat({ type: 'stderr', line: message?.data.data }))
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
                case 'stderr':
                    return <StdErrMessage key={idx} line={line.line} />;
                case 'stdout_group':
                    return <StdOutGroupContainer key={idx} group={line} minGroupSize={10} groupAfterRatePerSecond={10} />
            }
        })}
    </div>;
}