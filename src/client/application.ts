//
// Core application orchestration logic.
//

import { IUiBinding, UiBinding } from "./ui-binding";
import { IServiceApi, ServiceApi } from "./service-api";

interface IApplication
{
    Initialize(): void;
    OnNavigationSelected(path: string): void;
}

class Application implements IApplication {
    private ui: IUiBinding;
    private api: IServiceApi;

    constructor(ui: IUiBinding, api: IServiceApi) {
        this.ui = ui;
        this.api = api;
    }

    public Initialize() {
        this.ui.SetupInitialState();
        this.ui.SetNavigationChangedCallback((path: string) => {
            this.OnNavigationSelected(path);
        });
    }

    public OnNavigationSelected(path: string) {
        console.log(`Item selected: ${path}`);
        switch (path){
            case "/overview":
                this.loadSummaryView();
                break;
            case "/instances":
                this.loadInstanceView();
                break;
        }
    }

    private loadSummaryView(){
        this.ui.ShowSummaryViewContent();
        this.api.LoadSummaryData();

        // Setup timers to reload data
        setInterval(() => {
            this.api.LoadSummaryData();
        }, 60 * 1000);

        // TEST:
        this.ui.RenderTestChart();
    }

    private loadInstanceView(){
        this.ui.ShowInstanceDetailContent();
    }
}

// Our singleton application instance
const app = new Application(new UiBinding(), new ServiceApi());
app.Initialize();