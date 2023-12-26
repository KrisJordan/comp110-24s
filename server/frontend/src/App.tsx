import { useEffect, useState, useCallback } from 'react'
import useWebSocket, { ReadyState } from './useWebSocket';
import NamespaceTree from './NamespaceTree';
import { Message } from './Message';
import { Module } from './NamespaceTree';
import { PyProcess, PyProcessState } from './PyProcess';
import { PyProcessUI } from './PyProcessUI';

import './App.css';

function App() {
    const [messageHistory, setMessageHistory] = useState<string[]>([]);
    const [runningProcess, setRunningProcess] = useState<PyProcess | null>(null);
    const [requestId, setRequestId] = useState<number>(0);
    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket();

    useEffect(() => {
        if (lastJsonMessage && Object.keys(lastJsonMessage).length !== 0) {
            let message = lastJsonMessage as Message;
            setMessageHistory(prev => prev.concat(message.type));
        }
    }, [lastJsonMessage, setMessageHistory]);

    const connectionStatus = {
        [ReadyState.CONNECTING]: 'Connecting',
        [ReadyState.OPEN]: 'Open',
        [ReadyState.CLOSING]: 'Closing',
        [ReadyState.CLOSED]: 'Closed',
        [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
    }[readyState];

    const runModule = useCallback((module: Module) => {
        let moduleStr = module.full_path.replace(/^\.\//, '').replace(/\//g, '.').replace('.py', '');
        sendJsonMessage({ "type": "RUN", "data": { "module": moduleStr, "request_id": requestId } });
        setRequestId(prev => prev + 1);
        setRunningProcess({
            module: moduleStr,
            requestId: requestId,
            state: PyProcessState.STARTING
        });
    }, [requestId]);

    let selectedUI = runningProcess ? <PyProcessUI pyProcess={runningProcess} key={runningProcess.requestId} groupingEnabled={true} minGroupSize={10} msgGroupTimeSeparationInMS={1000} /> : null;

    return <>
        <div className="navbar bg-neutral text-neutral-content rounded-box">
            <div className="text-xl flex-1 ml-2">{runningProcess ? runningProcess.module : 'Select a Module'}</div>
        </div>
        <div className="flex">
            <div className="flex-none">
                <NamespaceTree selectModule={runModule} />
            </div>
            <div className="flex-1 ml-4 mt-4">
                {selectedUI}
            </div>
        </div>
        <ul className="hidden">
            {messageHistory.map((message, idx) => (
                <li key={idx}>{message}</li>
            ))}
        </ul>
    </>;
}

export default App;
