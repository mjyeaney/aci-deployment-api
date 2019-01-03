//
// Bindings for direct jQuery calls against the DOM
//

import * as $ from "jquery";
import { IChart, LineChart } from "./charting";
import { OverviewDetails } from "../common-types";

export interface IUiBinding
{
    SetupInitialState(): void;
    SetNavigationChangedCallback(onNavigation: (path: string) => void): void;
    ShowSummaryViewContent(data: OverviewDetails): void;
    ShowInstanceDetailContent(): void;
}

export class UiBinding implements IUiBinding
{
    private readonly lineChartGenerator: IChart;

    constructor (lineChartGenerator: IChart) {
        this.lineChartGenerator = lineChartGenerator;
    }

    public SetupInitialState() {
        // Don't override current location if one is specified
        if (location.hash === "") {
            location.hash = "/overview";
        }
    }

    public SetNavigationChangedCallback(onNavigation: (path: string) => void) {
        const updateUiForPath = () => {
            const path = location.hash.replace("#", "");
            $(".nav li").removeClass("active");
            $(`.nav li[data-action-name="${path}"]`).addClass("active");
            onNavigation(path);
        };

        // This method can be used to wire up any initial event handlers
        $(window).on("hashchange", updateUiForPath);

        // Fire on initial run incase there is no hash-change event (i.e., bookmark)
        updateUiForPath();
    }

    public ShowSummaryViewContent(data: OverviewDetails){
        $(".content").hide();
        $("#overviewContent").show();
        $("#runningInstanceChart").html(this.lineChartGenerator.Render(data.RunningInstanceCounts));
        $("#stoppedInstanceChart").html(this.lineChartGenerator.Render(data.StoppedInstanceCounts));

        $("#runningInstanceCount").text(data.RunningInstances);
        $("#running-min").text(data.RunningSummary.Minimum);
        $("#running-avg").text(data.RunningSummary.Average.toFixed(2));
        $("#running-max").text(data.RunningSummary.Maximum);
        
        $("#stoppedInstanceCount").text(data.StoppedInstances);
        $("#stopped-min").text(data.StoppedSummary.Minimum);
        $("#stopped-avg").text(data.StoppedSummary.Average.toFixed(2));
        $("#stopped-max").text(data.StoppedSummary.Maximum);
    }

    public ShowInstanceDetailContent(){
        $(".content").hide();
        $("#instanceDetails").show();
    }
}