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

    const runAgain = () => {
        sendJsonMessage({ type: "RUN", data: { module: props.pyProcess.module, request_id: props.pyProcess.requestId } });
        setStdIO([]);
    };

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
                case 'INSPECT':
                    console.log(message);
                    break;
                case 'file_modified':
                    let module = message.data.path.replace(/^\.\//, '').replace(/\//g, '.').replace('.py', '');
                    console.log(module, props.pyProcess);
                    if (module === props.pyProcess.module) {
                        if (pyProcess.state !== PyProcessState.EXITED && pyProcess.pid) {
                            sendJsonMessage({ type: "KILL", data: { pid: pyProcess.pid } })
                        }
                        runAgain()
                    }
                case 'EXIT':
                    if (message.data.pid === pyProcess.pid) {
                        setPyProcess(prev => {
                            prev.state = PyProcessState.EXITED;
                            return prev;
                        });
                        sendJsonMessage({ type: "INSPECT", data: { path: props.pyProcess.path } });
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
    let statusBadgeClass: string = "badge ";
    switch (pyProcess.state) {
        case PyProcessState.STARTING:
            status = 'Starting...';
            statusBadgeClass += 'badge-secondary';
            break;
        case PyProcessState.RUNNING:
            status = 'Running';
            statusBadgeClass += 'badge-primary';
            break;
        case PyProcessState.EXITED:
            status = 'Completed';
            statusBadgeClass += 'badge-neutral badge-outline';
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

    let runAgainButton: React.ReactElement | undefined;
    if (status === 'Completed') {
        runAgainButton = <button onClick={runAgain} className="btn btn-primary ml-6">Run Again</button>;
    }

    return <div role="tablist" className="tabs tabs-lifted tabs-lg">
        <input type="radio" name="module_tabs" role="tab" className="tab" aria-label="Run" defaultChecked={true} />
        <div role="tabpanel" className="tab-content prose prose-lg border-base-300 rounded-box p-6">
            <div>
                <div className={statusBadgeClass}>{status}</div>
                {runAgainButton}
            </div>
            <div className="divider"></div>
            {stdio.map((line, idx) => {
                switch (line.type) {
                    case 'stdin':
                        if (line.response === undefined) {
                            return <p key={idx}>{line.prompt}<br />
                                <input onChange={handleStdInChange} onKeyUp={(e) => { if (e.key === 'Enter') { handleStdInSend(idx, line); } }} value={stdinValue} autoFocus={true} type="text" className="input input-bordered bg-info w-full max-w-xs"></input>
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
        </div>

        <input type="radio" name="module_tabs" role="tab" className="tab" aria-label="Tinker" />
        <div role="tabpanel" className="tab-content prose prose-lg border-base-300 rounded-box p-6">
            <p>Inspect</p>
        </div>

        <input type="radio" name="module_tabs" role="tab" className="tab" aria-label="Test" />
        <div role="tabpanel" className="tab-content prose prose-lg border-base-300 rounded-box p-6">
            <p>Test</p>
        </div>
    </div>;
}