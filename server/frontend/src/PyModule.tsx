import { useEffect } from "react";
import { useLoaderData, useOutletContext, useLocation } from "react-router-dom";
import { PyProcess } from "./PyProcess";
import { PyProcessUI } from "./PyProcessUI";

export function PyModule() {
    const { runningProcess, runModule } = useOutletContext<{ runningProcess: PyProcess | null, runModule(name: string): void }>();
    const moduleName = useLoaderData();
    const location = useLocation();

    let isRunning = false;

    useEffect(() => {
        if (moduleName && !isRunning) {
            runModule(moduleName as string);
            isRunning = true;
        }
    }, [location]);

    return runningProcess !== null ? <PyProcessUI pyProcess={runningProcess} /> : <></>;
}