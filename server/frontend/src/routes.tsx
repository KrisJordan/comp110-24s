import App from "./App";

import { LoaderFunctionArgs, createBrowserRouter } from "react-router-dom";
import { PyModule } from "./PyModule";

function moduleLoader({ params }: any) {
    return params.moduleName;
}

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                path: "run/:moduleName",
                element: <PyModule />,
                loader: moduleLoader
            }
        ]
    }
]);

export default router;