//
// Contains methods used to call REST endpoints aainst our server
//

import * as $ from "jquery";

export interface IServiceApi {
    LoadSummaryData(): void;
}

export class SummaryData {
    Minimum: number = 0;
    Maximum: number = 0;
    Average: number = 0;
}

export class ServiceApi implements IServiceApi {
    public LoadSummaryData() {
        $.ajax({
            method: "GET",
            url: "/api/overviewSummary"
        }).done((results) => {
            let runningSummary = this.getSequenceSummary(results.RunningInstanceCounts);
            let stoppedSummary = this.getSequenceSummary(results.StoppedInstanceCounts);
            $("#runningInstanceCount").text(results.RunningInstances);
            $("#running-min").text(runningSummary.Minimum);
            $("#running-avg").text(runningSummary.Average.toFixed(2));
            $("#running-max").text(runningSummary.Maximum);
            $("#stoppedInstanceCount").text(results.StoppedInstances);
            $("#stopped-min").text(stoppedSummary.Minimum);
            $("#stopped-avg").text(stoppedSummary.Average.toFixed(2));
            $("#stopped-max").text(stoppedSummary.Maximum);
        });
    }

    private getSequenceSummary(data: number[]): SummaryData
    {
        let s = new SummaryData();
        s.Minimum = Number.MAX_SAFE_INTEGER;
        s.Maximum = Number.MIN_SAFE_INTEGER;
        let sum = 0.0;

        data.map((n) => {
            if (n < s.Minimum) s.Minimum = n;
            if (n > s.Maximum) s.Maximum = n;
            sum += n;
        });

        s.Average = data.length == 0 ? 0.0 : (sum / data.length);
        return s;
    }
}