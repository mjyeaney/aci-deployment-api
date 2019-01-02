//
// Bindings for direct jQuery calls against the DOM
//

import * as $ from "jquery";
import { IChart, LineChart } from "./charting";

export interface IUiBinding
{
    SetupInitialState(): void;
    SetNavigationChangedCallback(onNavigation: (path: string) => void): void;
    ShowSummaryViewContent(data: any): void;
    ShowInstanceDetailContent(): void;
}

export class UiBinding implements IUiBinding
{
    private readonly lineChartGenerator: IChart;

    constructor (lineChartGenerator: IChart) {
        this.lineChartGenerator = lineChartGenerator;
    }

    public SetupInitialState() {
        // Any nav changes / etc.
        location.hash = "/overview";
    }

    public SetNavigationChangedCallback(onNavigation: (path: string) => void) {
        // This method can be used to wire up any initial event handlers
        $(window).on("hashchange", () => {
            const path = location.hash.replace("#", "");
            onNavigation(path);
            $(".nav li").removeClass("active");
            $(`.nav li[data-action-name="${path}"]`).addClass("active");
        });

        // Let the callback know where we are (in case there was no change event fired)
        onNavigation(location.hash.replace("#", ""));
    }

    public ShowSummaryViewContent(data: any){
        $(".content").hide();
        $("#overviewContent").show();
        $("#runningInstanceChart").html(this.lineChartGenerator.RenderChart(data.RunningInstanceCounts));
        $("#stoppedInstanceChart").html(this.lineChartGenerator.RenderChart(data.StoppedInstanceCounts));

        $("#runningInstanceCount").text(data.RunningInstances);
        $("#running-min").text(data.RunningInstanceSummary.Minimum);
        $("#running-avg").text(data.RunningInstanceSummary.Average.toFixed(2));
        $("#running-max").text(data.RunningInstanceSummary.Maximum);
        
        $("#stoppedInstanceCount").text(data.StoppedInstances);
        $("#stopped-min").text(data.StoppedSummary.stoppedSummary.Minimum);
        $("#stopped-avg").text(data.StoppedSummary.stoppedSummary.Average.toFixed(2));
        $("#stopped-max").text(data.StoppedSummary.stoppedSummary.Maximum);
    }

    public ShowInstanceDetailContent(){
        $(".content").hide();
        $("#instanceDetails").show();
    }
}