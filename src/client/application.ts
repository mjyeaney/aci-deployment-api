//
// Core application orchestration logic.
//

import { IUiBinding, UiBinding } from "./ui-binding";
import { IServiceApi, ServiceApi } from "./service-api";
import { IChart, LineChart } from "./charting";

interface IApplication
{
    Initialize(): void;
    OnNavigationSelected(path: string): void;
}

class Application implements IApplication {
    private ui: IUiBinding;
    private api: IServiceApi;
    private lineChart: IChart;

    constructor(ui: IUiBinding, api: IServiceApi, lineChart: IChart) {
        this.ui = ui;
        this.api = api;
        this.lineChart = lineChart;
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

        // // Setup timers to reload data
        // setInterval(() => {
        //     this.api.LoadSummaryData();
        // }, 60 * 1000);

        // setup charts
        this.ui.RenderRunningInstanceChart(this.lineChart.RenderChart([]));
        this.ui.RenderStoppedInstanceChart(this.lineChart.RenderChart([]));
    }

    private loadInstanceView(){
        this.ui.ShowInstanceDetailContent();
    }
}

// Our singleton application instance
const app = new Application(new UiBinding(), new ServiceApi(), new LineChart());
app.Initialize();