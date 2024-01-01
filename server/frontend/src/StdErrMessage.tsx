interface StdErrProps {
    line: string;
}

interface StackTrace {
    type?: string;
    message: string;
    stack_trace: StackFrame[];
}

interface StackFrame {
    filename: string;
    lineno: number;
    name: string;
    line: string;
    end_lineno: number;
    colno: number;
    end_colno: number;
    locals: { [key: string]: any };
}

function valueToJSX(value: any): JSX.Element {
    if (typeof value === 'boolean') {
        return <span>{value ? 'True' : 'False'}</span>;
    } else if (typeof value === 'string') {
        return <span>"{value}"</span>
    } else if (typeof value === 'object') {
        if (value instanceof Array) {
            return <span>{JSON.stringify(value)}</span>
        } else if (value instanceof Object && value.hasOwnProperty('type')) {
            return <div>
                <div><strong>{value.type}</strong> Object (See in Debugger)</div>
            </div>
        }
    }
    return <span>{JSON.stringify(value)}</span>;
}

export function StdErrMessage(props: React.PropsWithChildren<StdErrProps>) {
    try {
        const message = JSON.parse(props.line) as StackTrace;
        console.log(message);

        const lastIndex = message.stack_trace.length - 1;

        const frames = message.stack_trace.map((frame, index) => {
            let className = "collapse bg-base-200 mt-2";
            if (index !== lastIndex) {
                className += " collapse-arrow";
            } else {
                className += " collapse-open";
            }
            return <div className={className} key={index}>
                <input type="checkbox" />
                <div className="collapse-title font-bold text-secondary">
                    {frame.name.replace('<module>', 'Globals')}
                    <span className="font-light text-secondary italic pl-2">{frame.filename} line {frame.lineno}</span>
                </div>
                <div className="collapse-content">
                    <pre>
                        {frame.lineno.toString().padStart(4, " ")} | {frame.line}
                        {" ".repeat(7 + frame.colno) + "^".repeat(frame.end_colno - frame.colno) + "\n"}
                        {index !== lastIndex ? "" : `${message.type}: ${message.message}`}
                    </pre>
                    <table className="table m-0 table-fixed">
                        <thead>
                            <tr>
                                <th className="w-36">Variable</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(frame.locals).map((key, index) => {
                                return <tr key={index}>
                                    <td className="font-mono">{key}</td>
                                    <td className="font-mono">{valueToJSX(frame.locals[key])}</td>
                                </tr>
                            })}
                        </tbody>
                    </table>
                </div>
            </div>;
        });

        if (message.type) {
            return <div className="rounded-box bg-error p-4">
                <h3 className="mt-0 text-error-content font-black">{message.type}: {message.message}</h3>
                <h4 className="text-error-content">Stack</h4>
                {frames}
            </div>;
        } else {
            return <p className="text-error">{props.line}</p>
        }
    } catch (e) {
        return <p className="text-error">{props.line}</p>
    }

}