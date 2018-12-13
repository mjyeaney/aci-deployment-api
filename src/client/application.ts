import * as $ from "jquery";

class DataSummary
{
    Minimum: number = 0;
    Maximum: number = 0;
    Average: number = 0;
}

class Application {
    public Initialize() {
        // Load initial summary data
        this.loadOverviewData();

        // Setup timers to reload data
        setInterval(() => {
            this.loadOverviewData();
        }, 60 * 1000);
    }

    private loadOverviewData(): void {
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

    private getSequenceSummary(data: number[]): DataSummary
    {
        let s = new DataSummary();
        s.Minimum = Number.MAX_VALUE;
        s.Maximum = Number.MIN_VALUE;
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

// Our singleton application instance
const app = new Application();
$(() => {
    app.Initialize();
});