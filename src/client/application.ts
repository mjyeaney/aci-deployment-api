//
// Core application orchestration logic.
//

import { IUiBinding, UiBinding } from "./ui-binding";
import { IServiceApi, ServiceApi } from "./service-api";
import { LineChart } from "./charting";

interface IApplication
{
    Initialize(): void;
    OnNavigationSelected(path: string): void;
}

class Application implements IApplication {
    private ui: IUiBinding;
    private api: IServiceApi;

    private hTimer: NodeJS.Timer | undefined;

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
                this.loadConfigView();
                this.loadSummaryView();
                break;
            case "/deployments":
                this.loadInstanceView();
                break;
        }
    }

    private async loadConfigView(){
        const config = await this.api.LoadConfigurationData();
        this.ui.ShowConfigurationData(config);
    }

    private async loadSummaryView(){
        this.ui.ShowOverviewContent();

        const data = await this.api.LoadSummaryData();
        this.ui.ShowSummaryViewData(data);

        this.clearRefreshTimers();

        this.hTimer = setInterval(async () => {
            const data = await this.api.LoadSummaryData();
            this.ui.ShowSummaryViewData(data);
        }, 1000 * 60);
    }

    private async loadInstanceView(){
        this.clearRefreshTimers();
        this.ui.ShowInstanceDetailContent();

        const data = await this.api.LoadInstancesData();
        this.ui.ShowInstanceDetailData(data);
    }

    private clearRefreshTimers(){
        if (this.hTimer) {
            clearInterval(this.hTimer);
        }
    }
}

// Our singleton application instance
const app = new Application(new UiBinding(new LineChart()), new ServiceApi());
app.Initialize();